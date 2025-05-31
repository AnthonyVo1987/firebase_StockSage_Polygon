
'use client';

import React, { useState, useRef, useEffect, useActionState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { handleChatSubmit } from '@/actions/chat-server-action';
import type { ChatState, ChatMessage } from '@/ai/schemas/chat-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SendHorizonal, ChevronsUpDown, Loader2, Copy, Download, AlertTriangle, Zap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; 

interface ChatbotProps {
  stockJson?: string;
  analysis?: AnalyzeStockDataOutput; 
  cumulativeStats: { totalCost: number; totalInputTokens: number; totalOutputTokens: number; requestCount: number; };
  updateCumulativeStats: (report: UsageReport) => void;
}

interface ExamplePrompt {
  id: string;
  label: string;
  promptText: string;
}

const examplePrompts: ExamplePrompt[] = [
  { id: 'ex_stock_takeaways', label: "Stock Trader's Key Takeaways (Uses Provided Data)", promptText: "Based on all the provided stock JSON data and the AI analysis summary, what are the key takeaways specifically for a stock trader looking at this information? Focus on price action, support/resistance if identifiable, volume implications (if data available), and short-term outlook." },
  { id: 'ex_options_takeaways', label: "Options Trader's Key Takeaways (Uses Provided Data)", promptText: "Given the provided stock JSON data and AI analysis summary, what are the key considerations for an options trader? Discuss potential volatility implications, upcoming catalysts if known, and how the current trend might influence options strategies (e.g., bullish, bearish, neutral plays)." },
  { id: 'ex_additional_analysis', label: "Additional Holistic Analysis (5 Points)", promptText: "Please provide 5 additional holistic key takeaways based on all the provided stock data and analysis. You can decide which areas to focus on for these additional points to give a broader perspective." },
];

function SubmitChatButtonInternal() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" variant="ghost" disabled={pending} className="text-primary hover:text-primary/80">
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
      <span className="sr-only">Send message</span>
    </Button>
  );
}

export default function Chatbot({ stockJson, analysis, cumulativeStats, updateCumulativeStats }: ChatbotProps) {
  const [inputValue, setInputValue] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const latestChatStateTimestamp = useRef<number | undefined>();

  const initialChatState: ChatState = { messages: [] };
  const [chatState, formAction, formPending] = useActionState(handleChatSubmit, initialChatState);

  useEffect(() => {
    console.log(`[CLIENT:Chatbot] Chatbot component mounted. Initial Stock JSON present: ${!!stockJson}, Initial Analysis present: ${!!analysis}`);
  }, []); 

  useEffect(() => {
    if (chatState?.timestamp && chatState.timestamp !== (latestChatStateTimestamp.current ?? 0) ) {
      latestChatStateTimestamp.current = chatState.timestamp;
      console.log('[CLIENT:Chatbot] New chatState received from server action:', JSON.stringify(chatState, null, 2));

      const latestAiMessage = chatState.messages.filter(m => m.sender === 'ai' && !m.isError).pop();
      if (latestAiMessage?.usageReport) {
          updateCumulativeStats(latestAiMessage.usageReport);
          toast({ title: "AI Responded", description: `Chatbot provided a response. Cost: $${latestAiMessage.usageReport.cost.toFixed(6)}` });
      }

      if (chatState.error) {
        const errorAlreadyInMessages = chatState.messages.some(m => m.isError && m.text.includes(chatState.error!));
        if (!errorAlreadyInMessages) {
            toast({ variant: "destructive", title: "Chatbot Error", description: chatState.error });
        }
      }
      setInputValue(''); 
    }
  }, [chatState, updateCumulativeStats, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [chatState?.messages]);

  const constructAnalysisSummary = (currentAnalysis?: AnalyzeStockDataOutput): string | undefined => {
    if (!currentAnalysis) return undefined;
    let summaryParts: string[] = [];
    const { stockPriceAction, trend, volatility, momentum, patterns } = currentAnalysis;

    if (stockPriceAction && stockPriceAction.text && !stockPriceAction.text.includes("pending") && !stockPriceAction.text.includes("could not be generated")) {
        summaryParts.push(`Price Action (${stockPriceAction.sentiment}): ${stockPriceAction.text}`);
    }
    if (trend && trend.text && !trend.text.includes("pending") && !trend.text.includes("could not be generated")) {
        summaryParts.push(`Trend (${trend.sentiment}): ${trend.text}`);
    }
    if (volatility && volatility.text && !volatility.text.includes("pending") && !volatility.text.includes("could not be generated")) {
        summaryParts.push(`Volatility (${volatility.sentiment}): ${volatility.text}`);
    }
    if (momentum && momentum.text && !momentum.text.includes("pending") && !momentum.text.includes("could not be generated")) {
        summaryParts.push(`Momentum (${momentum.sentiment}): ${momentum.text}`);
    }
    if (patterns && patterns.text && !patterns.text.includes("pending") && !patterns.text.includes("could not be generated")) {
        summaryParts.push(`Patterns (${patterns.sentiment}): ${patterns.text}`);
    }
    return summaryParts.length > 0 ? summaryParts.join('\n') : undefined;
  };

  const submitFormData = (formData: FormData) => {
    if (stockJson) {
        formData.set('stockJson', stockJson);
    }
    
    const analysisSummary = constructAnalysisSummary(analysis);
    if (analysisSummary) {
        formData.set('analysisSummary', analysisSummary);
    }
    
    const currentMessages = chatState?.messages || [];
    formData.set('chatHistory', JSON.stringify(currentMessages));
        
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputValue.trim() || formPending) {
        return;
    }
    const formData = new FormData(event.currentTarget);
    submitFormData(formData);
  };

  const handleExamplePromptClick = (promptText: string) => {
    setInputValue(promptText); 
    const formData = new FormData();
    formData.set('userPrompt', promptText);
    // Ensure other necessary form data is set before submitting
    submitFormData(formData);
  };


   const getCurrentTimestampForFile = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const handleDownloadJson = (contentToDownload: string | object, baseFilename: string) => {
    const timestamp = getCurrentTimestampForFile();
    const filename = `${baseFilename}_${timestamp}.json`;
    const dataString = typeof contentToDownload === 'string' ? contentToDownload : JSON.stringify(contentToDownload, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const handleCopyToClipboard = async (contentToCopy: string | object, contentType: string) => {
    const textToCopy = typeof contentToCopy === 'string' ? contentToCopy : JSON.stringify(contentToCopy, null, 2);
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "Copied to Clipboard", description: `${contentType} copied successfully.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Copy Failed", description: `Could not copy ${contentType} to clipboard.` });
    }
  };

  const messagesToDisplay = chatState?.messages || [];
  const latestAiMessageForControls = messagesToDisplay.filter(m => m.sender === 'ai' && !m.isError).pop();
  console.log('[CLIENT:Chatbot] Render. Input value:', inputValue, 'Is expanded:', isInputExpanded, 'Messages count:', messagesToDisplay.length, 'Form pending:', formPending);

  return (
    <Card className="mt-8 w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-headline text-primary">AI Chat Assistant 💬</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-72 w-full p-4 border-b">
          <div className="space-y-4">
            {messagesToDisplay.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`prose prose-sm dark:prose-invert max-w-[75%] rounded-lg px-3 py-2 shadow break-words ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground'
                      : msg.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.isError && <AlertTriangle className="inline-block h-4 w-4 mr-1 mb-0.5" />}
                  {msg.sender === 'ai' && !msg.isError ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text.split('\n').map((line, i) => <p key={i} className="my-1">{line}</p>)
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
             {formPending && (
                <div className="flex items-start">
                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm shadow bg-muted text-muted-foreground animate-pulse">
                        Thinking... 🤔
                    </div>
                </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 flex-col items-start">
        <form
            ref={formRef}
            onSubmit={handleFormSubmit}
            className="flex w-full items-start gap-2"
        >
          <Textarea
            name="userPrompt"
            placeholder="Ask about stocks, options, or financial topics..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={isInputExpanded ? 4 : 1}
            className="flex-grow resize-none transition-all duration-200 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !formPending) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsInputExpanded(!isInputExpanded)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronsUpDown className="h-5 w-5" />
            <span className="sr-only">{isInputExpanded ? 'Collapse input' : 'Expand input'}</span>
          </Button>
          <SubmitChatButtonInternal />
        </form>
         <div className="mt-3 flex flex-wrap gap-2">
            {examplePrompts.map(ep => (
              <Button
                key={ep.id}
                variant="outline"
                size="sm"
                onClick={() => handleExamplePromptClick(ep.promptText)}
                disabled={formPending || (!stockJson && !analysis)} 
                title={(!stockJson && !analysis) ? "Analyze a stock first to use this prompt" : ep.label}
                className="text-xs"
              >
                <Zap className="h-3 w-3 mr-1.5" />
                {ep.label.split('(')[0].trim()} 
              </Button>
            ))}
        </div>
        {(!stockJson && !analysis) && <p className="text-xs text-muted-foreground mt-1">Tip: Analyze a stock first to enable prompt examples that use context.</p>}
      </CardFooter>
       {latestAiMessageForControls && (
        <div className="p-4 pt-0 border-t mt-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Latest AI Response:</span>
            <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(latestAiMessageForControls.text, 'AI Chat Response')} title="Copy AI Response">
                <Copy className="h-3 w-3 mr-1.5" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownloadJson(latestAiMessageForControls.text, 'ai-chat-response')} title="Download AI Response as Text/Markdown">
                <Download className="h-3 w-3 mr-1.5" /> Export
            </Button>
        </div>
      )}
    </Card>
  );
}

