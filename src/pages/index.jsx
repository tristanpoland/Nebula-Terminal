'use client';

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  memo,
  Suspense,
  lazy
} from 'react';
import { Plus, X, Command, Minimize2, Maximize2 } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import Terminal from './Terminal';
import CommandPalette from './CommandPalette';

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center h-full p-4 bg-red-900/20 text-white">
    <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
    <pre className="text-sm mb-4 p-2 bg-black/40 rounded">{error.message}</pre>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
    >
      Try again
    </button>
  </div>
);

// Memoized Tab Button Component
const TabButton = memo(({ 
  tab, 
  isActive, 
  onSelect, 
  onRemove, 
  showClose 
}) => (
  <button
    onClick={onSelect}
    className={`flex items-center min-w-40 px-4 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-black/90 text-white border-b-2 border-blue-500'
        : 'text-neutral-400 hover:bg-neutral-950/90'
    }`}
  >
    <span className="truncate">{tab.title}</span>
    {showClose && (
      <X
        size={14}
        onClick={onRemove}
        className="ml-2 opacity-60 hover:opacity-100"
      />
    )}
  </button>
));

TabButton.displayName = 'TabButton';

// Main Component
export default function TabbedTerminal() {
  const [tabs, setTabs] = useState(() => [{
    id: 1,
    title: 'Terminal 1',
    createdAt: Date.now()
  }]);
  const [activeTab, setActiveTab] = useState(1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [tauriWindow, setTauriWindow] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const tabsContainerRef = useRef(null);

  // Initialize Tauri window
  useEffect(() => {
    let mounted = true;
    
    const initTauri = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const { appWindow } = await import('@tauri-apps/api/window');
        if (mounted) {
          setTauriWindow(appWindow);
          
          // Set initial maximized state
          const maximized = await appWindow.isMaximized();
          setIsMaximized(maximized);
          
          // Listen for maximize/unmaximize events
          const unlistenMaximize = await appWindow.onResized(() => {
            appWindow.isMaximized().then(setIsMaximized);
          });
          
          return () => {
            unlistenMaximize();
          };
        }
      } catch (error) {
        console.error('Failed to initialize Tauri window:', error);
      }
    };

    initTauri();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Window control handlers
  const handleMinimize = useCallback(async () => {
    if (!tauriWindow) return;
    
    try {
      await tauriWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, [tauriWindow]);

  const handleMaximize = useCallback(async () => {
    if (!tauriWindow) return;
    
    try {
      const isCurrentlyMaximized = await tauriWindow.isMaximized();
      if (isCurrentlyMaximized) {
        await tauriWindow.unmaximize();
      } else {
        await tauriWindow.maximize();
      }
      setIsMaximized(!isCurrentlyMaximized);
    } catch (error) {
      console.error('Failed to maximize/unmaximize window:', error);
    }
  }, [tauriWindow]);

  // Tab management
  const addNewTab = useCallback(() => {
    setTabs(currentTabs => {
      const newId = Math.max(...currentTabs.map(t => t.id)) + 1;
      const newTab = { 
        id: newId, 
        title: `Terminal ${newId}`,
        createdAt: Date.now()
      };
      return [...currentTabs, newTab];
    });
    setActiveTab(prev => {
      const newId = Math.max(...tabs.map(t => t.id)) + 1;
      return newId;
    });
  }, [tabs]);

  const removeTab = useCallback((tabId, e) => {
    e.stopPropagation();
    setTabs(currentTabs => {
      if (currentTabs.length <= 1) return currentTabs;
      
      const newTabs = currentTabs.filter(t => t.id !== tabId);
      if (activeTab === tabId) {
        // Find the nearest tab to activate
        const removedIndex = currentTabs.findIndex(t => t.id === tabId);
        const newActiveTab = newTabs[
          removedIndex === newTabs.length ? removedIndex - 1 : removedIndex
        ];
        setActiveTab(newActiveTab.id);
      }
      return newTabs;
    });
  }, [activeTab]);

  // Command palette configuration
  const commands = [
    {
      id: 'new-tab',
      title: 'New Tab',
      description: 'Open a new terminal tab',
      icon: <Plus size={16} />,
      shortcut: ['Ctrl', 'T'],
      action: addNewTab
    },
    {
      id: 'close-tab',
      title: 'Close Tab',
      description: 'Close current terminal tab',
      icon: <X size={16} />,
      shortcut: ['Ctrl', 'W'],
      action: (e) => tabs.length > 1 && removeTab(activeTab, e || new Event('click'))
    },
    {
      id: 'maximize',
      title: isMaximized ? 'Restore Window' : 'Maximize Window',
      description: 'Toggle window maximize state',
      icon: <Maximize2 size={16} />,
      shortcut: ['Alt', 'Enter'],
      action: handleMaximize
    },
    {
      id: 'minimize',
      title: 'Minimize Window',
      description: 'Minimize window',
      icon: <Minimize2 size={16} />,
      shortcut: ['Alt', 'M'],
      action: handleMinimize
    }
  ];

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key === ' ' || e.ctrlKey && e.key === 'k' || e.ctrlKey && e.key === '/') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    } else if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      addNewTab();
    } else if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (tabs.length > 1) {
        removeTab(activeTab, new Event('click'));
      }
    } else if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      handleMaximize();
    } else if (e.altKey && e.key === 'm') {
      e.preventDefault();
      handleMinimize();
    }
  }, [tabs.length, activeTab, addNewTab, removeTab, handleMaximize, handleMinimize]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state when the error boundary is reset
        setTabs([{ id: 1, title: 'Terminal 1', createdAt: Date.now() }]);
        setActiveTab(1);
      }}
    >
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteCommand={(command) => {
          command.action();
          setIsCommandPaletteOpen(false);
        }}
        commands={commands}
      />
      <div className="fixed inset-0 flex flex-col bg-black/90 text-white overflow-hidden h-screen pb-5 rounded-md backdrop-blur-md border border-neutral-600/50">
        <div 
          className="flex items-center bg-neutral-950/90 border-b border-neutral-800" 
          data-tauri-drag-region
        >
          <div 
            ref={tabsContainerRef}
            className="flex-1 flex overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-700" 
            data-tauri-drag-region
          >
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onSelect={() => setActiveTab(tab.id)}
                onRemove={(e) => removeTab(tab.id, e)}
                showClose={tabs.length > 1}
              />
            ))}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-950/90 transition-colors"
              title="Open Command Palette (Ctrl+K)"
            >
              <Command size={16} />
            </button>
            <button
              onClick={addNewTab}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-950/90 transition-colors"
              title="New Tab (Ctrl+T)"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${
                activeTab === tab.id ? 'block' : 'hidden'
              }`}
              aria-hidden={activeTab !== tab.id}
            >
              <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => {
                  // Reset just this terminal's state
                  const newTabs = tabs.filter(t => t.id !== tab.id);
                  if (newTabs.length === 0) {
                    newTabs.push({ id: tab.id, title: `Terminal ${tab.id}`, createdAt: Date.now() });
                  }
                  setTabs(newTabs);
                  if (activeTab === tab.id) {
                    setActiveTab(newTabs[0].id);
                  }
                }}
              >
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                }>
                  <Terminal key={`terminal-${tab.id}`} />
                </Suspense>
              </ErrorBoundary>
            </div>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}