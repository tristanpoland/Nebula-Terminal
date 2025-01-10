// TerminalInner.jsx
import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

let XTerm, FitAddon;
if (typeof window !== 'undefined') {
  XTerm = require('xterm').Terminal;
  FitAddon = require('xterm-addon-fit').FitAddon;
  require('xterm/css/xterm.css');
}

export default function TerminalInner() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    // Initialize xterm.js
    xtermRef.current = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      },
      cols: 80,  // Set initial dimensions
      rows: 24,
      dimensions: {
        width: 80,
        height: 24
      }
    });

    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);

    // Open terminal in the container
    xtermRef.current.open(terminalRef.current);
    
    // Do an initial fit
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const { rows, cols } = xtermRef.current;
        invoke('resize_pty', { rows, cols }).catch(console.error);
      }
    }, 100);

    // Initialize PTY
    invoke('create_pty').catch(console.error);

    // Listen for PTY output
    const unsubscribe = listen('pty-output', (event) => {
      if (xtermRef.current) {
        xtermRef.current.write(event.payload);
      }
    });

    // Handle input
    xtermRef.current.onData(data => {
      invoke('write_to_pty', { input: data }).catch(console.error);
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { rows, cols } = xtermRef.current;
        invoke('resize_pty', { rows, cols }).catch(console.error);
      }
    });

    resizeObserver.observe(terminalRef.current);

    // Cleanup
    return () => {
      unsubscribe.then(fn => fn());
      resizeObserver.disconnect();
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="h-full w-full">
      <div ref={terminalRef} className="h-full" style={{ padding: '12px' }} />
    </div>
  );
}