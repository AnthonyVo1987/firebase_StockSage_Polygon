
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useActionState, useEffect, useRef, startTransition } from 'react';
import {
  fetchStockDataAction,
  type StockDataFetchState,
} from '@/actions/analyze-stock-server-action';
import {
  performAiAnalysisAction,
  type AiAnalysisResultState,
} from '@/actions/perform-ai-analysis-action';
import type { ChatState as ServerChatState, ChatMessage as ServerChatMessage } from '@/ai/schemas/chat-schemas';
import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
import { examplePrompts } from '@/ai/schemas/chat-prompts';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import type { DataSourceId } from '@/services/data-sources/types';

export type AnalysisStatus = StockDataFetchState['analysisStatus'];

export const initialStockDataFetchState: StockDataFetchState = {
  stockJson: undefined,
  error: undefined,
  fieldErrors: undefined,
  timestamp: undefined,
  fetchUsageReport: undefined,
  analysisStatus: 'idle',
  tickerUsed: undefined,
  dataSourceUsed: undefined,
  initiateFullChatAnalysis: false,
};

export const initialAiAnalysisResultState: AiAnalysisResultState = {
  analysis: undefined,
  analysisUsageReport: undefined,
  error: undefined,
  timestamp: undefined,
  tickerAnalyzed: undefined,
};

export interface CombinedStockAnalysisState {
  stockJson?: string;
  analysis?: AnalyzeStockDataOutput;
  error?: string;
  fieldErrors?: StockDataFetchState['fieldErrors'];
  timestamp?: number;
  fetchUsageReport?: UsageReport;
  analysisUsageReport?: UsageReport;
  analysisStatus: AnalysisStatus;
  tickerUsed?: string;
  dataSourceUsed?: DataSourceId;
  initiateFullChatAnalysis?: boolean;
}

export const initialCombinedStockAnalysisState: CombinedStockAnalysisState = {
  stockJson: undefined,
  analysis: {
    stockPriceAction: { text: "AI analysis of price action pending.", sentiment: "neutral" },
    trend: { text: "AI analysis of trend pending.", sentiment: "neutral" },
    volatility: { text: "AI analysis of volatility pending.", sentiment: "neutral" },
    momentum: { text: "AI analysis of momentum pending.", sentiment: "neutral" },
    patterns: { text: "AI analysis of patterns pending.", sentiment: "neutral" }
  },
  error: undefined,
  fieldErrors: undefined,
  timestamp: undefined,
  fetchUsageReport: undefined,
  analysisUsageReport: undefined,
  analysisStatus: 'idle',
  tickerUsed: undefined,
  dataSourceUsed: undefined,
  initiateFullChatAnalysis: false,
};

export interface CumulativeStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalContextWindow: number;
  totalCost: number;
  requestCount: number;
}

const initialCumulativeStats: CumulativeStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalContextWindow: 0,
  totalCost: 0,
  requestCount: 0,
};

export interface ContextChatMessage extends ServerChatMessage {}
export interface ContextChatState extends ServerChatState {
    messages: ContextChatMessage[];
}

const initialChatState: ContextChatState = {
    messages: [],
    error: undefined,
    latestAiUsageReport: undefined,
    timestamp: Date.now(),
};

// Helper to construct analysis summary
const constructAnalysisSummaryForChat = (currentAnalysis?: AnalyzeStockDataOutput): string | undefined => {
  if (!currentAnalysis) return undefined;
  const summaryParts: string[] = [];
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
  return summaryParts.length > 0 ? summaryParts.join('\\n') : undefined;
};


interface StockAnalysisContextType {
  stockDataFetchState: StockDataFetchState;
  aiAnalysisResultState: AiAnalysisResultState;

  submitFetchStockDataForm: (formData: FormData) => void;
  fetchStockDataPending: boolean;

  submitPerformAiAnalysisForm: (formData: FormData) => void;
  performAiAnalysisPending: boolean;

  combinedServerState: CombinedStockAnalysisState;
  cumulativeStats: CumulativeStats;
  updateCumulativeStats: (report: UsageReport, flowType: 'analysis' | 'chat') => void;

  chatServerState: ContextChatState;
  submitChatForm: (formData: FormData) => void;
  chatFormPending: boolean;
  clearChatHistoryContext: () => void;
  formRef: React.RefObject<HTMLFormElement> | null; // Add formRef
  setFormRef: (ref: React.RefObject<HTMLFormElement> | null) => void; // Add setter for formRef
}

const StockAnalysisContext = createContext<StockAnalysisContextType | undefined>(undefined);

export function StockAnalysisProvider({ children }: { children: ReactNode }) {
  const [
    stockDataFetchState,
    submitFetchStockDataActionInternal,
    fetchStockDataPending
  ] = useActionState(fetchStockDataAction, initialStockDataFetchState);

  const [
    aiAnalysisResultState,
    submitPerformAiAnalysisActionInternal,
    performAiAnalysisPending
  ] = useActionState(performAiAnalysisAction, initialAiAnalysisResultState);

  const [combinedServerState, setCombinedServerState] = useState<CombinedStockAnalysisState>(initialCombinedStockAnalysisState);
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats>(initialCumulativeStats);
  
  const [triggerFullChatAfterAnalysis, setTriggerFullChatAfterAnalysis] = useState(false);
  const [formRef, setFormRefState] = useState<React.RefObject<HTMLFormElement> | null>(null);


  const lastProcessedFetchTimestamp = useRef<number | undefined>();
  const lastProcessedAnalysisTimestamp = useRef<number | undefined>();
  const lastChatAiMessageIdProcessedForToast = useRef<string | undefined>();


  const updateCumulativeStats = useCallback((report: UsageReport, flowType: 'analysis' | 'chat') => {
    console.log(`[CONTEXT] Updating cumulative stats with report from ${flowType} for ${report.flowName}:`, report);
    setCumulativeStats(prev => ({
      totalInputTokens: prev.totalInputTokens + (report.inputTokens || 0),
      totalOutputTokens: prev.totalOutputTokens + (report.outputTokens || 0),
      totalContextWindow: prev.totalContextWindow + ((report.inputTokens || 0) + (report.outputTokens || 0)),
      totalCost: parseFloat((prev.totalCost + (report.cost || 0)).toFixed(6)),
      requestCount: prev.requestCount + 1,
    }));
  }, []);

  useEffect(() => {
    console.log(`[CONTEXT:Effect:Fetch] stockDataFetchState changed. New timestamp: ${stockDataFetchState?.timestamp}, Last processed: ${lastProcessedFetchTimestamp.current}, Current context ticker: ${combinedServerState.tickerUsed}, FetchState ticker: ${stockDataFetchState?.tickerUsed}, InitiateFullChat: ${stockDataFetchState?.initiateFullChatAnalysis}`);

    if (!stockDataFetchState?.timestamp || stockDataFetchState.timestamp === lastProcessedFetchTimestamp.current) {
      if (stockDataFetchState?.timestamp === lastProcessedFetchTimestamp.current && stockDataFetchState.analysisStatus === 'data_fetching' && !fetchStockDataPending) {
        // This can happen if the same request is processed again by useActionState on re-render but action is not pending
        // Usually safe to ignore if no other state indicates an issue
      } else if (stockDataFetchState?.timestamp) {
        console.log('[CONTEXT:Effect:Fetch] Skipping processing for stockDataFetchState: Timestamp has not changed or is undefined.');
      }
      return;
    }

    if (stockDataFetchState.tickerUsed !== combinedServerState.tickerUsed && combinedServerState.analysisStatus !== 'idle' && combinedServerState.analysisStatus !== 'data_fetching') {
        console.warn(`[CONTEXT:Effect:Fetch] Discarding stockDataFetchState update because its ticker "${stockDataFetchState.tickerUsed}" does not match current context ticker "${combinedServerState.tickerUsed}" and context is not in initial state. This may be a stale response.`);
        return;
    }
    
    console.log(`[CONTEXT:Effect:Fetch] Processing stockDataFetchState for ticker "${stockDataFetchState.tickerUsed}". Status: ${stockDataFetchState.analysisStatus}`);
    lastProcessedFetchTimestamp.current = stockDataFetchState.timestamp;
    
    // Set triggerFullChatAfterAnalysis based on the initiateFullChatAnalysis flag from the action
    // This ensures it's set correctly even if the action returns quickly
    if (stockDataFetchState.initiateFullChatAnalysis && stockDataFetchState.analysisStatus !== 'error_fetching_data') {
        console.log(`[CONTEXT:Effect:Fetch] Setting triggerFullChatAfterAnalysis to TRUE due to initiateFullChatAnalysis flag from fetchStockDataState.`);
        setTriggerFullChatAfterAnalysis(true);
    } else if (stockDataFetchState.analysisStatus === 'data_fetching' && !stockDataFetchState.initiateFullChatAnalysis) {
      // If it's a new 'standard' fetch, ensure trigger is false.
        console.log(`[CONTEXT:Effect:Fetch] Setting triggerFullChatAfterAnalysis to FALSE for new standard fetch.`);
        setTriggerFullChatAfterAnalysis(false);
    }


    setCombinedServerState(prev => {
      // Ensure we are updating for the correct ticker
      if (stockDataFetchState.tickerUsed !== prev.tickerUsed && prev.analysisStatus !== 'idle' && prev.analysisStatus !== 'data_fetching') {
        console.warn(`[CONTEXT:Effect:Fetch:SetCombined] Discarding stockDataFetchState update in setCombinedServerState because its ticker "${stockDataFetchState.tickerUsed}" does not match current prev ticker "${prev.tickerUsed}".`);
        return prev; // Stale update, don't corrupt current state
      }

      return {
        ...prev,
        stockJson: stockDataFetchState.stockJson,
        analysis: stockDataFetchState.error || !stockDataFetchState.stockJson ? initialCombinedStockAnalysisState.analysis : prev.analysis,
        error: stockDataFetchState.error,
        fieldErrors: stockDataFetchState.fieldErrors,
        timestamp: stockDataFetchState.timestamp,
        fetchUsageReport: stockDataFetchState.fetchUsageReport,
        analysisUsageReport: stockDataFetchState.error || !stockDataFetchState.stockJson ? undefined : prev.analysisUsageReport,
        analysisStatus: stockDataFetchState.analysisStatus,
        dataSourceUsed: stockDataFetchState.dataSourceUsed,
        // Persist initiateFullChatAnalysis from the latest fetch action state
        initiateFullChatAnalysis: stockDataFetchState.initiateFullChatAnalysis, 
      };
    });

  }, [stockDataFetchState, combinedServerState.tickerUsed, combinedServerState.analysisStatus, fetchStockDataPending, updateCumulativeStats]);


  useEffect(() => {
    console.log(`[CONTEXT:Effect:Analysis] aiAnalysisResultState changed. New timestamp: ${aiAnalysisResultState?.timestamp}, Last processed: ${lastProcessedAnalysisTimestamp.current}, Current context ticker: ${combinedServerState.tickerUsed}, AnalysisState ticker: ${aiAnalysisResultState?.tickerAnalyzed}`);

    if (!aiAnalysisResultState?.timestamp || aiAnalysisResultState.timestamp === lastProcessedAnalysisTimestamp.current) {
       console.log('[CONTEXT:Effect:Analysis] Skipping processing for aiAnalysisResultState: Timestamp has not changed or is undefined.');
      return;
    }

    if (aiAnalysisResultState.tickerAnalyzed !== combinedServerState.tickerUsed) {
        console.warn(`[CONTEXT:Effect:Analysis] Discarding aiAnalysisResultState update because its ticker "${aiAnalysisResultState.tickerAnalyzed}" does not match current context ticker "${combinedServerState.tickerUsed}". This may be a stale response.`);
        return;
    }
    console.log(`[CONTEXT:Effect:Analysis] Processing aiAnalysisResultState for ticker "${aiAnalysisResultState.tickerAnalyzed}". Error: ${aiAnalysisResultState.error}`);
    lastProcessedAnalysisTimestamp.current = aiAnalysisResultState.timestamp;

    setCombinedServerState(prev => {
      if (aiAnalysisResultState.tickerAnalyzed !== prev.tickerUsed) {
        console.warn(`[CONTEXT:Effect:Analysis:SetCombined] Discarding aiAnalysisResultState update in setCombinedServerState because its ticker "${aiAnalysisResultState.tickerAnalyzed}" does not match current prev ticker "${prev.tickerUsed}".`);
        return prev;
      }
      return {
        ...prev,
        analysis: aiAnalysisResultState.analysis || initialCombinedStockAnalysisState.analysis,
        analysisUsageReport: aiAnalysisResultState.analysisUsageReport,
        error: aiAnalysisResultState.error || (prev.analysisStatus === 'error_fetching_data' ? prev.error : undefined),
        analysisStatus: aiAnalysisResultState.error ? 'error_analyzing_data' : 'analysis_complete',
        timestamp: aiAnalysisResultState.timestamp, // This should be the AI analysis timestamp
      };
    });

    if (aiAnalysisResultState.analysisUsageReport && aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed && !aiAnalysisResultState.error) {
        updateCumulativeStats(aiAnalysisResultState.analysisUsageReport, 'analysis');
    }
  }, [aiAnalysisResultState, combinedServerState.tickerUsed, updateCumulativeStats]);


  const submitFetchStockDataForm = useCallback((formData: FormData) => {
    const ticker = formData.get('ticker') as string | null;
    const dataSource = formData.get('dataSource') as string | null;
    const analysisType = formData.get('analysisType') as string | null; // Will be 'standard' or 'fullDetail'
    const processingTicker = ticker?.trim().toUpperCase() || "NVDA";

    console.log(
      `[CONTEXT_REQUEST] Action: fetchStockDataAction FOR TICKER: "${processingTicker}"`,
      { dataSource, analysisType }
    );
    
    const isFullDetail = analysisType === 'fullDetail';
    console.log(`[CONTEXT] submitFetchStockDataForm: analysisType from form is "${analysisType}". Setting triggerFullChatAfterAnalysis to ${isFullDetail}`);
    setTriggerFullChatAfterAnalysis(isFullDetail); 

    setCombinedServerState({ // Reset state for new request
        ...initialCombinedStockAnalysisState,
        tickerUsed: processingTicker,
        dataSourceUsed: dataSource as DataSourceId,
        analysisStatus: 'data_fetching',
        timestamp: Date.now(),
        initiateFullChatAnalysis: isFullDetail, // Set based on the button clicked
    });

    lastProcessedFetchTimestamp.current = undefined; // Reset for new fetch
    lastProcessedAnalysisTimestamp.current = undefined; // Reset for new analysis sequence

    startTransition(() => {
      submitFetchStockDataActionInternal(formData);
    });
  }, [submitFetchStockDataActionInternal]);


  const submitPerformAiAnalysisForm = useCallback((formData: FormData) => {
    const tickerToAnalyze = formData.get('ticker') as string | null;
    console.log(
        `[CONTEXT_REQUEST] Action: performAiAnalysisAction FOR TICKER: "${tickerToAnalyze || 'N/A'}" (Context ticker is "${combinedServerState.tickerUsed}")`,
        { stockJsonStringPresent: !!formData.get('stockJsonString') }
    );

    if (tickerToAnalyze !== combinedServerState.tickerUsed) {
      console.warn(`[CONTEXT_REQUEST:AIAnalysis] Aborting AI key takeaways analysis call: Form data ticker "${tickerToAnalyze}" does not match current context ticker "${combinedServerState.tickerUsed}".`);
      setCombinedServerState(prev => ({
        ...prev,
        error: `Key takeaways analysis for ${tickerToAnalyze} aborted as context changed to ${prev.tickerUsed}. Please re-analyze ${prev.tickerUsed}.`,
        analysisStatus: 'error_analyzing_data',
      }));
      return;
    }

    setCombinedServerState(prev => ({
      ...prev,
      analysisStatus: 'analyzing_data',
      error: undefined, // Clear previous errors for analysis stage
      analysisUsageReport: undefined, // Clear previous usage
      analysis: initialCombinedStockAnalysisState.analysis, // Reset to pending
      timestamp: Date.now(),
    }));

    startTransition(() => {
      submitPerformAiAnalysisActionInternal(formData);
    });
  }, [submitPerformAiAnalysisActionInternal, combinedServerState.tickerUsed]);


  const [chatServerState, submitChatFormAction, chatFormPending] = useActionState(
    async (prevState: ContextChatState, formData: FormData): Promise<ContextChatState> => {
      if (formData.get('_clear_history_signal_')) {
        console.log("[CONTEXT] Chat history clear signal received by action wrapper.");
        return { ...initialChatState, timestamp: Date.now() };
      }
      const { handleChatSubmit } = await import('@/actions/chat-server-action');
      const result = await handleChatSubmit(prevState, formData);
      return {
        messages: result.messages as ContextChatMessage[],
        error: result.error,
        latestAiUsageReport: result.latestAiUsageReport,
        timestamp: result.timestamp || Date.now(),
      };
    },
    initialChatState
  );

  const submitChatForm = useCallback((formData: FormData) => {
     console.log(
       '[CLIENT_REQUEST] Action: handleChatSubmit (via context), Payload:',
       {
         userPrompt: formData.get('userPrompt'),
         stockJsonPresent: !!formData.get('stockJson'),
         analysisSummaryPresent: !!formData.get('analysisSummary'),
         chatHistoryPresent: !!formData.get('chatHistory'),
       }
     );
    startTransition(() => {
      submitChatFormAction(formData);
    });
  }, [submitChatFormAction]);

  // Effect to trigger full detailed chat analysis
  useEffect(() => {
    const analysisIsCompleteAndValid = combinedServerState.analysisStatus === 'analysis_complete' &&
                                     !!combinedServerState.analysis &&
                                     combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed &&
                                     !Object.values(combinedServerState.analysis).some(takeaway => takeaway.text.includes("pending") || takeaway.text.includes("could not be generated"));
    
    console.log(`[CONTEXT:Effect:AutoChat] Checking conditions. triggerFullChat: ${triggerFullChatAfterAnalysis}, analysisCompleteAndValid: ${analysisIsCompleteAndValid}, chatFormPending: ${chatFormPending}, tickerUsed: ${combinedServerState.tickerUsed}, Current analysisStatus: ${combinedServerState.analysisStatus}`);

    if (triggerFullChatAfterAnalysis && analysisIsCompleteAndValid && !chatFormPending && combinedServerState.tickerUsed) {
      console.log(`[CONTEXT:Effect:AutoChat] Conditions MET for ticker "${combinedServerState.tickerUsed}". Triggering "Full Detailed Analysis" chat.`);

      const fullAnalysisPrompt = examplePrompts.find(p => p.id === 'ex_full_detailed_analysis');
      if (!fullAnalysisPrompt) {
        console.error('[CONTEXT:Effect:AutoChat] "Full Detailed Analysis" prompt not found in examplePrompts.');
        setTriggerFullChatAfterAnalysis(false);
        return;
      }

      const chatFormData = new FormData();
      chatFormData.append('userPrompt', fullAnalysisPrompt.promptText);

      if (combinedServerState.stockJson) {
        try {
          const parsedJson = JSON.parse(combinedServerState.stockJson);
          if (parsedJson.stockSnapshot?.ticker === combinedServerState.tickerUsed) {
            chatFormData.append('stockJson', combinedServerState.stockJson);
          } else {
             console.warn(`[CONTEXT:Effect:AutoChat] Stock JSON ticker (${parsedJson.stockSnapshot?.ticker}) does not match context ticker (${combinedServerState.tickerUsed}). Not sending stockJson for auto-chat.`);
          }
        } catch (e) {
          console.error("[CONTEXT:Effect:AutoChat] Error parsing stockJson for auto-chat context:", e);
        }
      }

      const analysisSummary = constructAnalysisSummaryForChat(combinedServerState.analysis);
      if (analysisSummary) {
        chatFormData.append('analysisSummary', analysisSummary);
      }
      
      chatFormData.append('chatHistory', JSON.stringify(chatServerState.messages || []));
      
      console.log('[CONTEXT:Effect:AutoChat] Submitting "Full Detailed Analysis" chat form automatically.');
      submitChatForm(chatFormData);
      setTriggerFullChatAfterAnalysis(false); 
    } else if (triggerFullChatAfterAnalysis && (combinedServerState.analysisStatus === 'error_fetching_data' || combinedServerState.analysisStatus === 'error_analyzing_data')) {
      console.warn(`[CONTEXT:Effect:AutoChat] Full detailed analysis chat aborted for "${combinedServerState.tickerUsed}" because initial analysis failed. Status: ${combinedServerState.analysisStatus}`);
      setTriggerFullChatAfterAnalysis(false); 
    }

  }, [
    triggerFullChatAfterAnalysis,
    combinedServerState.analysisStatus,
    combinedServerState.analysis,
    combinedServerState.tickerUsed,
    combinedServerState.stockJson,
    aiAnalysisResultState?.tickerAnalyzed,
    chatFormPending,
    chatServerState.messages, 
    submitChatForm,
  ]);


  const clearChatHistoryContext = useCallback(() => {
    console.log('[CONTEXT] clearChatHistoryContext called. Dispatching clear signal via submitChatFormAction.');
    const dummyFormData = new FormData();
    dummyFormData.append('_clear_history_signal_', 'true');
    startTransition(() => {
      submitChatFormAction(dummyFormData);
    });
  }, [submitChatFormAction]);

  useEffect(() => {
    if (chatServerState?.latestAiUsageReport && chatServerState.messages.length > 0) {
        const latestMessage = chatServerState.messages[chatServerState.messages.length -1];
        if (latestMessage.sender === 'ai' && latestMessage.usageReport && latestMessage.id !== lastChatAiMessageIdProcessedForToast.current) {
            updateCumulativeStats(latestMessage.usageReport, 'chat');
            lastChatAiMessageIdProcessedForToast.current = latestMessage.id;
        }
    }
  }, [chatServerState, updateCumulativeStats]);

  const setFormRef = useCallback((ref: React.RefObject<HTMLFormElement> | null) => {
    setFormRefState(ref);
  }, []);


  const contextValue: StockAnalysisContextType = {
    stockDataFetchState,
    aiAnalysisResultState,
    submitFetchStockDataForm,
    fetchStockDataPending,
    submitPerformAiAnalysisForm,
    performAiAnalysisPending,
    combinedServerState,
    cumulativeStats,
    updateCumulativeStats,
    chatServerState,
    submitChatForm,
    chatFormPending,
    clearChatHistoryContext,
    formRef, 
    setFormRef,
  };

  return (
    <StockAnalysisContext.Provider value={contextValue}>
      {children}
    </StockAnalysisContext.Provider>
  );
}

export function useStockAnalysisContext() {
  const context = useContext(StockAnalysisContext);
  if (context === undefined) {
    throw new Error('useStockAnalysisContext must be used within a StockAnalysisProvider');
  }
  return context;
}

declare module '@/ai/schemas/common-schemas' {
  interface UsageReport {
    timestampForCompare?: number;
  }
}

    