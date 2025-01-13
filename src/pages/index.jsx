import React, { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import Terminal from './Terminal';

const TERMINAL_TYPES = [
  { type: 'bash', title: 'Bash Terminal' },
  { type: 'powershell', title: 'PowerShell' },
  { type: 'cmd', title: 'Command Prompt' }
];

export default function TabbedTerminal() {
  const [tabs, setTabs] = useState([
    { id: 1, title: 'Bash Terminal', type: 'bash' }
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const addNewTab = (terminalType) => {
    const newId = Math.max(...tabs.map(t => t.id)) + 1;
    const terminalInfo = TERMINAL_TYPES.find(t => t.type === terminalType);
    if (!terminalInfo) return;
    
    const newTab = {
      id: newId,
      title: terminalInfo.title,
      type: terminalType
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
    setShowNewTabMenu(false);
  };

  const removeTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length > 1) {
      const newTabs = tabs.filter(t => t.id !== tabId);
      setTabs(newTabs);
      if (activeTab === tabId) {
        setActiveTab(newTabs[0].id);
      }
    }
  };

  // Window control handlers
  const handleMinimize = () => console.log('Minimize');
  const handleMaximize = () => setIsMaximized(prev => !prev);
  const handleClose = () => console.log('Close');

  return (
  <div className={`flex flex-col h-screen bg-black/90 backdrop-blur-xl text-white ${isMaximized ? '' : 'rounded-lg'} overflow-hidden`}>
  {/* Titlebar */}
      <div className="flex items-center justify-between h-8 select-none" data-tauri-drag-region>
        <div className="flex items-center px-4">
          <span className="text-sm">Nebula</span>
        </div>
        <div className="flex">
          <button
            onClick={handleMinimize}
            className="px-4 h-8 hover:bg-neutral-800 text-neutral-400 hover:text-white focus:outline-none"
          >
            ─
          </button>
          <button
            onClick={handleMaximize}
            className="px-4 h-8 hover:bg-neutral-800 text-neutral-400 hover:text-white focus:outline-none"
          >
            □
          </button>
          <button
            onClick={handleClose}
            className="px-4 h-8 hover:bg-red-500 text-neutral-400 hover:text-white focus:outline-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center bg-neutral-950 border-b border-neutral-800">
        <div className="flex-1 flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center min-w-40 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-black text-white border-b-2 border-blue-500'
                  : 'text-neutral-400 hover:bg-neutral-950'
              }`}
            >
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <X
                  size={14}
                  onClick={(e) => removeTab(tab.id, e)}
                  className="ml-2 opacity-60 hover:opacity-100"
                />
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNewTabMenu(!showNewTabMenu)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-950 transition-colors flex items-center gap-1"
          >
            <Plus size={20} />
            <ChevronDown size={14} />
          </button>
          
          {/* New Tab Type Menu */}
          {showNewTabMenu && (
            <div className="absolute right-0 top-full mt-1 bg-neutral-950 rounded shadow-lg py-1 z-10">
              {TERMINAL_TYPES.map(terminal => (
                <button
                  key={terminal.type}
                  onClick={() => addNewTab(terminal.type)}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                >
                  {terminal.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="relative flex-1">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`absolute inset-0 transition-opacity ${
              activeTab === tab.id ? 'opacity-100' : 'opacity-0  pointer-events-none bg-transparent'
            }`}
          >
            <Terminal
              initialMessage={`Welcome to ${tab.title}\nType 'help' for available commands.`}
              prompt={tab.type === 'powershell' ? 'PS>' : tab.type === 'cmd' ? 'C:\\>' : '$'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}