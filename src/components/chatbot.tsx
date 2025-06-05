
'use client';

import React, { useState, useRef, useEffect, startTransition } from 'react';
import type { ChatMessage } from '@/ai/schemas/chat-schemas';
import { examplePrompts } from '@/ai/schemas/chat-prompts'; 
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
import { formatTimestampToPacificTime } from '@/lib/date-utils';


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
    combinedServerState, 
    aiAnalysisResultState, 
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
      
      console.log(
        '[CLIENT_RESPONSE] Action: handleChatSubmit, Received State:',
        {
          messagesCount: chatServerState.messages.length,
          error: chatServerState.error,
          latestAiUsageReportPresent: !!chatServerState.latestAiUsageReport,
          timestamp: chatServerState.timestamp,
        }
      );
      
      const latestAiMessage = chatServerState.messages.filter(m => m.sender === 'ai' && !m.isError).pop();
      if (latestAiMessage?.usageReport) {
          updateCumulativeStats(latestAiMessage.usageReport, 'chat');
          toast({ title: "AI Responded", description: `Chatbot provided a response. Cost: $${latestAiMessage.usageReport.cost.toFixed(6)}` });
      }

      if (chatServerState.error) {
        const errorAlreadyInMessages = chatServerState.messages.some(m => m.isError && m.text.includes(chatServerState.error!));
        if (!errorAlreadyInMessages) {
            toast({ variant: "destructive", title: "Chatbot Error", description: chatServerState.error });
        }
      }
      
      const shouldClearInput = !chatServerState.error && !!latestAiMessage;
      console.log(`[CLIENT:Chatbot:UIEffect] Processing chatServerState update. Error: ${chatServerState.error}. Latest AI message ID (if any): ${latestAiMessage?.id}. Input will be cleared: ${shouldClearInput}`);
      if (shouldClearInput) {
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

  const constructAnalysisSummary = (currentAnalysis?: AnalyzeStockDataOutput, currentTicker?: string): string | undefined => {
    if (!currentAnalysis || !currentTicker || aiAnalysisResultState.tickerAnalyzed !== currentTicker || combinedServerState.analysisStatus !== 'analysis_complete') {
        console.log(`[CLIENT:Chatbot:ContextPrep] constructAnalysisSummary called. Analysis for ${currentTicker} not ready or stale. Analysis Status: ${combinedServerState.analysisStatus}, Analyzed Ticker: ${aiAnalysisResultState.tickerAnalyzed}`);
        return undefined;
    }
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
    const result = summaryParts.length > 0 ? summaryParts.join('\n') : undefined;
    console.log(`[CLIENT:Chatbot:ContextPrep] constructAnalysisSummary called for ${currentTicker}. Summary (first 100 chars): "${result ? result.substring(0, 100) + '...' : 'undefined'}"`);
    return result;
  };

  const doSubmitFormData = (formData: FormData) => {
    if (combinedServerState?.stockJson && combinedServerState.tickerUsed) {
        try {
            const parsedJson = JSON.parse(combinedServerState.stockJson);
            if (parsedJson.stockSnapshot?.ticker === combinedServerState.tickerUsed) {
                formData.set('stockJson', combinedServerState.stockJson);
            } else {
                console.warn(`[CLIENT:Chatbot:ContextPrep] Stock JSON ticker (${parsedJson.stockSnapshot?.ticker}) does not match context ticker (${combinedServerState.tickerUsed}). Not sending stockJson.`);
            }
        } catch (e) {
            console.error("[CLIENT:Chatbot:ContextPrep] Error parsing stockJson for chat context:", e);
        }
    }
    
    const analysisSummary = constructAnalysisSummary(combinedServerState?.analysis, combinedServerState?.tickerUsed);
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
    
    console.log('[CLIENT:Chatbot] Chat form submission triggered for user input.');
    doSubmitFormData(formData);
  };

  const handleExamplePromptClick = (promptText: string) => {
    setInputValue(promptText); 
    const formData = new FormData(); 
    formData.set('userPrompt', promptText);
    console.log('[CLIENT:Chatbot] Chat form submission triggered for example prompt:', promptText);
    doSubmitFormData(formData);
  };

  const handleDownloadChatResponse = (contentToDownload: string | object) => {
    const ticker = combinedServerState?.tickerUsed || 'AI_CHAT';
    const timestamp = getCurrentTimestampForFile();
    const filename = `ai-chat-response_${ticker}_${timestamp}.md`; 
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
  
  let stockJsonCurrentlyAvailable = false;
  if (combinedServerState?.stockJson && combinedServerState.tickerUsed) {
      try {
          const parsed = JSON.parse(combinedServerState.stockJson);
          if (parsed.stockSnapshot?.ticker === combinedServerState.tickerUsed) {
              stockJsonCurrentlyAvailable = true;
          }
      } catch (e) { /* ignore parsing error for this check */ }
  }

  const analysisCurrentlyAvailable = 
    combinedServerState.analysisStatus === 'analysis_complete' &&
    !!combinedServerState.analysis &&
    aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed &&
    !Object.values(combinedServerState.analysis).some(takeaway =>
        takeaway.text.includes("pending") || takeaway.text.includes("could not be generated")
    );

  const examplePromptsDisabled = chatFormPending || !stockJsonCurrentlyAvailable || !analysisCurrentlyAvailable;

  console.log(`[CLIENT:Chatbot] Render. Input: "${inputValue}", ChatPending: ${chatFormPending}, ContextTicker: "${combinedServerState.tickerUsed}", StockJSONAvail: ${stockJsonCurrentlyAvailable}, AnalysisAvail: ${analysisCurrentlyAvailable}, PromptsDisabled: ${examplePromptsDisabled}, AnalysisStatus: ${combinedServerState.analysisStatus}, AnalysisResultTicker: ${aiAnalysisResultState.tickerAnalyzed}`);

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
                  {formatTimestampToPacificTime(msg.timestamp)}
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
        {(!stockJsonCurrentlyAvailable || !analysisCurrentlyAvailable) && <p className="text-xs text-muted-foreground mt-1">Tip: Analyze a stock first to enable prompt examples that use context.</p>}
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
