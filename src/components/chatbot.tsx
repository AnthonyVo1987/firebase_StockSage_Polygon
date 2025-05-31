
'use client';

import React, { useState, useRef, useEffect, startTransition } from 'react';
import type { ChatMessage } from '@/ai/schemas/chat-schemas';
import { examplePrompts } from '@/ai/schemas/chat-prompts'; // Import centralized prompts
import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SendHorizonal, ChevronsUpDown, Loader2, Copy, Download, AlertTriangle, Zap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; 
import { useStockAnalysisContext } from '@/contexts/stock-analysis-context';
import { downloadFile, copyToClipboardUtil, getCurrentTimestampForFile, formatJsonForExport } from '@/lib/export-utils';


function SubmitChatButtonInternal() {
  const { chatFormPending } = useStockAnalysisContext();
  return (
    <Button type="submit" size="icon" variant="ghost" disabled={chatFormPending} className="text-primary hover:text-primary/80">
      {chatFormPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
      <span className="sr-only">Send message</span>
    </Button>
  );
}

export default function Chatbot() {
  const {
    stockAnalysisServerState,
    chatServerState,
    submitChatForm,
    chatFormPending,
    updateCumulativeStats,
  } = useStockAnalysisContext();

  const [inputValue, setInputValue] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const latestChatStateTimestamp = useRef<number | undefined>();

  useEffect(() => {
    console.log(`[CLIENT:Chatbot] Chatbot component mounted/context updated.`);
  }, []); 

  useEffect(() => {
    if (chatServerState?.timestamp && chatServerState.timestamp !== (latestChatStateTimestamp.current ?? 0) ) {
      latestChatStateTimestamp.current = chatServerState.timestamp;
      console.log('[CLIENT:Chatbot] New chatServerState received from context:', JSON.stringify(chatServerState, null, 2));

      const latestAiMessage = chatServerState.messages.filter(m => m.sender === 'ai' && !m.isError).pop();
      if (latestAiMessage?.usageReport) {
          updateCumulativeStats(latestAiMessage.usageReport);
          toast({ title: "AI Responded", description: `Chatbot provided a response. Cost: $${latestAiMessage.usageReport.cost.toFixed(6)}` });
      }

      if (chatServerState.error) {
        const errorAlreadyInMessages = chatServerState.messages.some(m => m.isError && m.text.includes(chatServerState.error!));
        if (!errorAlreadyInMessages) {
            toast({ variant: "destructive", title: "Chatbot Error", description: chatServerState.error });
        }
      }
      // Clear input only if the submission was successful (no error in chatServerState and an AI message was added)
      if (!chatServerState.error && latestAiMessage) {
        setInputValue(''); 
      }
    }
  }, [chatServerState, updateCumulativeStats, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [chatServerState?.messages]);

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

  const doSubmitFormData = (formData: FormData) => {
    if (stockAnalysisServerState?.stockJson) {
        formData.set('stockJson', stockAnalysisServerState.stockJson);
    }
    
    const analysisSummary = constructAnalysisSummary(stockAnalysisServerState?.analysis);
    if (analysisSummary) {
        formData.set('analysisSummary', analysisSummary);
    }
    
    const currentMessages = chatServerState?.messages || [];
    formData.set('chatHistory', JSON.stringify(currentMessages));
        
    startTransition(() => {
      submitChatForm(formData);
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputValue.trim() || chatFormPending) {
        return;
    }
    const formData = new FormData(event.currentTarget);
    // inputValue is already set on formData by the Textarea's name prop
    doSubmitFormData(formData);
  };

  const handleExamplePromptClick = (promptText: string) => {
    setInputValue(promptText); 
    const formData = new FormData(); // Create new FormData for example prompts
    formData.set('userPrompt', promptText);
    doSubmitFormData(formData);
  };

  const handleDownloadChatResponse = (contentToDownload: string | object) => {
    const ticker = stockAnalysisServerState?.stockJson ? (JSON.parse(stockAnalysisServerState.stockJson)?.stockQuote?.ticker || 'AI_CHAT') : 'AI_CHAT';
    const timestamp = getCurrentTimestampForFile();
    const filename = `ai-chat-response_${ticker}_${timestamp}.md`; // Changed to .md for markdown content
    const dataString = typeof contentToDownload === 'string' ? contentToDownload : formatJsonForExport(contentToDownload);
    downloadFile(dataString, filename, 'text/markdown;charset=utf-8;');
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const handleCopyChatResponse = async (contentToCopy: string | object) => {
    const textToCopy = typeof contentToCopy === 'string' ? contentToCopy : formatJsonForExport(contentToCopy);
    await copyToClipboardUtil(textToCopy, toast, 'AI Chat Response');
  };


  const messagesToDisplay = chatServerState?.messages || [];
  const latestAiMessageForControls = messagesToDisplay.filter(m => m.sender === 'ai' && !m.isError).pop();
  const stockJsonAvailable = !!stockAnalysisServerState?.stockJson;
  
  const analysisAvailable = !!stockAnalysisServerState?.analysis && 
    !Object.values(stockAnalysisServerState.analysis).some(takeaway => 
      takeaway.text.includes("pending") || takeaway.text.includes("could not be generated")
    );

  const examplePromptsDisabled = chatFormPending || (!stockJsonAvailable && !analysisAvailable);


  console.log('[CLIENT:Chatbot] Render. Input value:', inputValue, 'Is expanded:', isInputExpanded, 'Messages count:', messagesToDisplay.length, 'Form pending:', chatFormPending, 'StockJSON available:', stockJsonAvailable, 'Analysis available:', analysisAvailable);

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
                    msg.text.split('\n').map((line, i, arr) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </React.Fragment>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
             {chatFormPending && (
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
              if (e.key === 'Enter' && !e.shiftKey && !chatFormPending) {
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
                disabled={examplePromptsDisabled}
                title={examplePromptsDisabled ? "Analyze a stock first to use context-based prompts" : ep.label}
                className="text-xs"
              >
                <Zap className="h-3 w-3 mr-1.5" />
                {ep.label.split('(')[0].trim()} 
              </Button>
            ))}
        </div>
        {(!stockJsonAvailable || !analysisAvailable) && <p className="text-xs text-muted-foreground mt-1">Tip: Analyze a stock first to enable prompt examples that use context.</p>}
      </CardFooter>
       {latestAiMessageForControls && (
        <div className="p-4 pt-0 border-t mt-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Latest AI Response:</span>
            <Button variant="outline" size="sm" onClick={() => handleCopyChatResponse(latestAiMessageForControls.text)} title="Copy AI Response">
                <Copy className="h-3 w-3 mr-1.5" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownloadChatResponse(latestAiMessageForControls.text)} title="Download AI Response as Markdown (.md)">
                <Download className="h-3 w-3 mr-1.5" /> Export (.md)
            </Button>
        </div>
      )}
    </Card>
  );
}

