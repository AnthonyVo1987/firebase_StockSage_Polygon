
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, ChevronUp, Terminal, Download, ClipboardCopy, FileText, Sheet, Search, Filter as FilterIcon, XCircle, SlidersHorizontal } from 'lucide-react';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error';
  timestamp: Date;
  content: string[];
}

interface DebugConsoleProps {
  onToggle?: (isOpen: boolean) => void;
}

const CATEGORIES = {
  SERVER_ACTION_COMM: "Server Actions (Req/Res)",
  CONTEXT_UPDATE: "Context Updates",
  UI_RENDER_STATE: "UI Render States",
  CLIENT_INTERACTION: "Client Interactions",
  UTIL_INTERNAL: "Util Internals",
  LOG_INFO: "Severity: Info",
  LOG_WARN: "Severity: Warn",
  LOG_ERROR: "Severity: Error",
  OTHER_STANDARD: "Other Standard Logs",
} as const;
type CategoryKey = keyof typeof CATEGORIES;

const initialActiveCategories = Object.keys(CATEGORIES).reduce((acc, key) => {
  acc[key as CategoryKey] = true;
  return acc;
}, {} as Record<CategoryKey, boolean>);


const escapeCsvField = (field: any): string => {
  const stringField = String(field === null || field === undefined ? '' : field);
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

export default function DebugConsole({ onToggle }: DebugConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategories, setActiveCategories] = useState<Record<CategoryKey, boolean>>(initialActiveCategories);
  const [showFilterControls, setShowFilterControls] = useState(false);

  const originalConsoleLogRef = useRef<typeof console.log>();
  const originalConsoleWarnRef = useRef<typeof console.warn>();
  const originalConsoleErrorRef = useRef<typeof console.error>();

  useEffect(() => {
    const consoleId = 'debug-console-interceptor';
    originalConsoleLogRef.current = console.log;
    originalConsoleWarnRef.current = console.warn;
    originalConsoleErrorRef.current = console.error;

    const formatArgs = (args: any[]): string[] => args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2));
    
    if (!(console.log as any)[consoleId]) {
      console.log = (...args: any[]) => {
        setTimeout(() => setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'log', timestamp: new Date(), content: formatArgs(args) }]), 0);
        originalConsoleLogRef.current?.apply(console, args);
      };
      (console.log as any)[consoleId] = true;
    }
    if (!(console.warn as any)[consoleId]) {
      console.warn = (...args: any[]) => {
        setTimeout(() => setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'warn', timestamp: new Date(), content: formatArgs(args) }]), 0);
        originalConsoleWarnRef.current?.apply(console, args);
      };
      (console.warn as any)[consoleId] = true;
    }
    if (!(console.error as any)[consoleId]) {
      console.error = (...args: any[]) => {
        setTimeout(() => setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'error', timestamp: new Date(), content: formatArgs(args) }]), 0);
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
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const firstContent = (msg.content[0] || "").trim();
      const combinedContent = msg.content.join(' ').toLowerCase();

      if (searchTerm && !combinedContent.includes(searchTerm.toLowerCase())) {
        return false;
      }

      const severityOk = (msg.type === 'log' && activeCategories.LOG_INFO) ||
                         (msg.type === 'warn' && activeCategories.LOG_WARN) ||
                         (msg.type === 'error' && activeCategories.LOG_ERROR);
      if (!severityOk) return false;

      const isServerAction = /^\[CLIENT_(REQUEST|RESPONSE)\]/.test(firstContent);
      const isContextUpdate = /^\[CONTEXT\]/.test(firstContent);
      const isUiRender = /^\[CLIENT:(StockPageContent|Chatbot)\] Render/.test(firstContent);
      const isClientInteraction = (/^\[CLIENT:(StockPageContent|Chatbot)\].* (triggered|clicked|submission)/.test(firstContent) || /^\[DataExportControls\]/.test(firstContent));
      const isUtilInternal = /^\[(ExportUtils|ThemeProvider|DebugConsole:Internal)\]/.test(firstContent);
      const isCustomPrefixed = isServerAction || isContextUpdate || isUiRender || isClientInteraction || isUtilInternal;

      if (activeCategories.SERVER_ACTION_COMM && isServerAction) return true;
      if (activeCategories.CONTEXT_UPDATE && isContextUpdate) return true;
      if (activeCategories.UI_RENDER_STATE && isUiRender) return true;
      if (activeCategories.CLIENT_INTERACTION && isClientInteraction) return true;
      if (activeCategories.UTIL_INTERNAL && isUtilInternal) return true;
      if (activeCategories.OTHER_STANDARD && !isCustomPrefixed) return true;
      
      // If all thematic categories are true, and severity passed, show it
      const allThematicTrue = activeCategories.SERVER_ACTION_COMM && activeCategories.CONTEXT_UPDATE && activeCategories.UI_RENDER_STATE && activeCategories.CLIENT_INTERACTION && activeCategories.UTIL_INTERNAL && activeCategories.OTHER_STANDARD;
      if(allThematicTrue) return true;


      // If no specific thematic category matched and not all thematic are true, it fails thematic check
      return false;
    });
  }, [messages, searchTerm, activeCategories]);

  const getCurrentTimestampForFile = () => new Date().toISOString().replace(/[:.]/g, '-');

  const downloadContent = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    originalConsoleLogRef.current?.call(console, `[DebugConsole:Internal] Log downloaded as ${filename}`);
  };

  const copyContent = async (content: string, type: string) => {
    if (filteredMessages.length === 0) {
      originalConsoleLogRef.current?.call(console, `[DebugConsole:Internal] No messages to copy as ${type}.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      originalConsoleLogRef.current?.call(console, `[DebugConsole:Internal] Log copied to clipboard as ${type}.`);
    } catch (err) {
      originalConsoleErrorRef.current?.call(console, `[DebugConsole:Internal] Failed to copy log as ${type}:`, err);
    }
  };

  const handleDownloadLogJson = () => {
    if (filteredMessages.length === 0) {
      originalConsoleLogRef.current?.call(console, "[DebugConsole:Internal] No messages to export as JSON."); return;
    }
    downloadContent(JSON.stringify(filteredMessages, null, 2), `debug-log_${getCurrentTimestampForFile()}.json`, 'application/json');
  };
  const handleCopyLogJson = () => copyContent(JSON.stringify(filteredMessages, null, 2), 'JSON');

  const convertMessagesToTxt = (msgs: ConsoleMessage[]): string => msgs.map(msg => `${msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })} - ${msg.type.toUpperCase()} - ${msg.content.map((c, i) => i === 0 ? c : `                  ${c}`).join('\n')}`).join('\n\n');
  const handleDownloadLogTxt = () => {
    if (filteredMessages.length === 0) {
      originalConsoleLogRef.current?.call(console, "[DebugConsole:Internal] No messages to export as TXT."); return;
    }
    downloadContent(convertMessagesToTxt(filteredMessages), `debug-log_${getCurrentTimestampForFile()}.txt`, 'text/plain;charset=utf-8;');
  };
  const handleCopyLogTxt = () => copyContent(convertMessagesToTxt(filteredMessages), 'TXT');

  const convertMessagesToCsv = (msgs: ConsoleMessage[]): string => {
    const header = "ID,Timestamp (ISO),Type,Content\n";
    const rows = msgs.map(msg => `${escapeCsvField(msg.id)},${escapeCsvField(msg.timestamp.toISOString())},${escapeCsvField(msg.type)},${escapeCsvField(msg.content.join(' | '))}`);
    return header + rows.join('\n');
  };
  const handleDownloadLogCsv = () => {
     if (filteredMessages.length === 0) {
      originalConsoleLogRef.current?.call(console, "[DebugConsole:Internal] No messages to export as CSV."); return;
    }
    downloadContent(convertMessagesToCsv(filteredMessages), `debug-log_${getCurrentTimestampForFile()}.csv`, 'text/csv;charset=utf-8;');
  };
  const handleCopyLogCsv = () => copyContent(convertMessagesToCsv(filteredMessages), 'CSV');

  const handleCategoryToggle = (categoryKey: CategoryKey) => {
    setActiveCategories(prev => ({ ...prev, [categoryKey]: !prev[categoryKey] }));
  };
  
  const clearAllFilters = () => {
    setSearchTerm('');
    setActiveCategories(initialActiveCategories);
    originalConsoleLogRef.current?.call(console, `[DebugConsole:Internal] All filters cleared.`);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={toggleConsole} className="fixed bottom-4 right-4 z-50 bg-slate-800 hover:bg-slate-700 text-white border-slate-600" aria-label={isOpen ? "Close debug console" : "Open debug console"}>
        <Terminal className="h-4 w-4 mr-2" /> Debug Console {isOpen ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronUp className="h-4 w-4 ml-2" />}
      </Button>
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 h-2/5 z-40 bg-slate-900 text-white border-t border-slate-700 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center p-2 border-b border-slate-700 bg-slate-800 flex-wrap gap-2">
            <h3 className="font-semibold text-sm flex items-center"><Terminal className="h-4 w-4 mr-2"/>Developer Console ({filteredMessages.length}/{messages.length} showing)</h3>
            <div className="flex items-center gap-1 flex-wrap">
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={() => setShowFilterControls(s => !s)} title="Toggle Filters">
                    <SlidersHorizontal className="h-4 w-4"/>
                </Button>
                 <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={clearAllFilters} title="Clear All Filters">
                    <XCircle className="h-4 w-4"/>
                </Button>
                <span className="text-slate-500 text-xs mx-1">|</span>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleDownloadLogJson} title="Download Log (JSON)" disabled={filteredMessages.length === 0}><Download className="h-4 w-4"/><span className="sr-only">JSON</span></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleCopyLogJson} title="Copy Log (JSON)" disabled={filteredMessages.length === 0}><ClipboardCopy className="h-4 w-4"/><span className="sr-only">JSON</span></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleDownloadLogTxt} title="Download Log (TXT)" disabled={filteredMessages.length === 0}><FileText className="h-4 w-4"/><span className="sr-only">TXT</span></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleCopyLogTxt} title="Copy Log (TXT)" disabled={filteredMessages.length === 0}><ClipboardCopy className="h-4 w-4"/><span className="sr-only">TXT</span></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleDownloadLogCsv} title="Download Log (CSV)" disabled={filteredMessages.length === 0}><Sheet className="h-4 w-4"/><span className="sr-only">CSV</span></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={handleCopyLogCsv} title="Copy Log (CSV)" disabled={filteredMessages.length === 0}><ClipboardCopy className="h-4 w-4"/><span className="sr-only">CSV</span></Button>
                <span className="text-slate-500 text-xs mx-1">|</span>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700 hover:text-white px-2 py-1 h-auto" onClick={() => setMessages([])}>Clear Log</Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white h-7 w-7" onClick={toggleConsole} title="Close Console"><X className="h-4 w-4"/></Button>
            </div>
          </div>

          {showFilterControls && (
            <div className="p-2 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-slate-700 border-slate-600 placeholder-slate-500 text-white focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
                {(Object.keys(CATEGORIES) as CategoryKey[]).map(key => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${key}`}
                      checked={activeCategories[key]}
                      onCheckedChange={() => handleCategoryToggle(key)}
                      className="border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor={`filter-${key}`} className="text-xs text-slate-300 font-normal cursor-pointer select-none">
                      {CATEGORIES[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="flex-grow p-2 text-xs font-mono">
            {filteredMessages.length === 0 && <p className="text-slate-500 italic text-center py-4">{messages.length > 0 ? 'No messages match current filters.' : 'No messages yet.'}</p>}
            {filteredMessages.map((msg) => (
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

