
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, ChevronUp, Terminal, Download, ClipboardCopy } from 'lucide-react';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error';
  timestamp: Date;
  content: string[];
}

interface DebugConsoleProps {
  onToggle?: (isOpen: boolean) => void;
}

export default function DebugConsole({ onToggle }: DebugConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);

  const originalConsoleLogRef = useRef<typeof console.log>();
  const originalConsoleWarnRef = useRef<typeof console.warn>();
  const originalConsoleErrorRef = useRef<typeof console.error>();

  useEffect(() => {
    const consoleId = 'debug-console-interceptor';

    originalConsoleLogRef.current = console.log;
    originalConsoleWarnRef.current = console.warn;
    originalConsoleErrorRef.current = console.error;

    const formatArgs = (args: any[]): string[] => {
      return args.map(arg => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      });
    };
    
    if (!(console.log as any)[consoleId]) {
        console.log = (...args: any[]) => {
          setTimeout(() => {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'log', timestamp: new Date(), content: formatArgs(args) }]);
          }, 0);
          originalConsoleLogRef.current?.apply(console, args);
        };
        (console.log as any)[consoleId] = true;
    }

    if (!(console.warn as any)[consoleId]) {
        console.warn = (...args: any[]) => {
          setTimeout(() => {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'warn', timestamp: new Date(), content: formatArgs(args) }]);
          }, 0);
          originalConsoleWarnRef.current?.apply(console, args);
        };
        (console.warn as any)[consoleId] = true;
    }

    if (!(console.error as any)[consoleId]) {
        console.error = (...args: any[]) => {
          setTimeout(() => {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'error', timestamp: new Date(), content: formatArgs(args) }]);
          }, 0);
          originalConsoleErrorRef.current?.apply(console, args);
        };
        (console.error as any)[consoleId] = true;
    }

    return () => {
      if (originalConsoleLogRef.current) console.log = originalConsoleLogRef.current;
      if (originalConsoleWarnRef.current) console.warn = originalConsoleWarnRef.current;
      if (originalConsoleErrorRef.current) console.error = originalConsoleErrorRef.current;
    };
  }, []);

  const toggleConsole = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'warn':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-300';
    }
  };

  const getCurrentTimestampForFile = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const handleDownloadLog = () => {
    if (messages.length === 0) {
      originalConsoleLogRef.current?.call(console, "Debug Console: No messages to export.");
      return;
    }
    const filename = `debug-console-log_${getCurrentTimestampForFile()}.json`;
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    originalConsoleLogRef.current?.call(console, `Debug Console: Log downloaded as ${filename}`);
  };

  const handleCopyLog = async () => {
    if (messages.length === 0) {
      originalConsoleLogRef.current?.call(console, "Debug Console: No messages to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
      originalConsoleLogRef.current?.call(console, "Debug Console: Log copied to clipboard.");
    } catch (err) {
      originalConsoleErrorRef.current?.call(console, 'Debug Console: Failed to copy log to clipboard:', err);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleConsole}
        className="fixed bottom-4 right-4 z-50 bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
        aria-label={isOpen ? "Close debug console" : "Open debug console"}
      >
        <Terminal className="h-4 w-4 mr-2" />
        Debug Console
        {isOpen ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronUp className="h-4 w-4 ml-2" />}
      </Button>
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 h-1/3 z-40 bg-slate-900 text-white border-t border-slate-700 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center p-2 border-b border-slate-700 bg-slate-800">
            <h3 className="font-semibold text-sm flex items-center"><Terminal className="h-4 w-4 mr-2"/>Developer Console</h3>
            <div className="space-x-1">
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleDownloadLog} title="Download Log (JSON)" disabled={messages.length === 0}>
                    <Download className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleCopyLog} title="Copy Log (JSON)" disabled={messages.length === 0}>
                    <ClipboardCopy className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700 hover:text-white px-2 py-1 h-auto" onClick={() => setMessages([])}>Clear</Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={toggleConsole} title="Close Console"><X className="h-4 w-4"/></Button>
            </div>
          </div>
          <ScrollArea className="flex-grow p-2 text-xs font-mono">
            {messages.length === 0 && <p className="text-slate-500">No messages yet.</p>}
            {messages.map((msg) => (
              <div key={msg.id} className={`py-1 border-b border-slate-800 last:border-b-0 ${getMessageColor(msg.type)}`}>
                <span className="text-slate-500 mr-2 select-none">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</span>
                {msg.content.map((c, i) => <pre key={i} className="inline-block whitespace-pre-wrap">{c}</pre>)}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </>
  );
}
