
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
import type { UsageReport } from '@/ai/schemas/common-schemas';
import type { DataSourceId } from '@/services/data-sources/types'; // GranularTaConfigType removed
// DEFAULT_GRANULAR_TA_CONFIG removed

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
  // selectedIndicatorsConfigUsed and apiCallDelayUsed removed
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
  // selectedIndicatorsConfigUsed and apiCallDelayUsed removed
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
  // selectedIndicatorsConfigUsed and apiCallDelayUsed removed
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
    console.log(`[CONTEXT:Effect:Fetch] stockDataFetchState changed. New timestamp: ${stockDataFetchState?.timestamp}, Last processed: ${lastProcessedFetchTimestamp.current}, Current context ticker: ${combinedServerState.tickerUsed}, FetchState ticker: ${stockDataFetchState?.tickerUsed}`);

    if (!stockDataFetchState?.timestamp || stockDataFetchState.timestamp === lastProcessedFetchTimestamp.current) {
      if(stockDataFetchState?.timestamp && stockDataFetchState.timestamp === lastProcessedFetchTimestamp.current) {
        console.log(`[CONTEXT:Effect:Fetch] Skipping processing: Timestamp ${stockDataFetchState.timestamp} already processed.`);
      } else if (!stockDataFetchState?.timestamp) {
        console.log(`[CONTEXT:Effect:Fetch] Skipping processing: stockDataFetchState.timestamp is undefined.`);
      }
      return;
    }

    if (stockDataFetchState.tickerUsed !== combinedServerState.tickerUsed) {
      console.warn(`[CONTEXT:Effect:Fetch] Stale stockDataFetchState for "${stockDataFetchState.tickerUsed}" ignored. Current operation is for "${combinedServerState.tickerUsed}". Fetch timestamp: ${stockDataFetchState.timestamp}`);
      return;
    }

    console.log(`[CONTEXT:Effect:Fetch] Processing stockDataFetchState for ticker "${stockDataFetchState.tickerUsed}". Status: ${stockDataFetchState.analysisStatus}`);
    lastProcessedFetchTimestamp.current = stockDataFetchState.timestamp;

    setCombinedServerState(prev => {
      if (stockDataFetchState.tickerUsed !== prev.tickerUsed) {
        console.warn(`[CONTEXT:Effect:Fetch:SetState] Stale stockDataFetchState for "${stockDataFetchState.tickerUsed}" IGNORED during setCombinedServerState. Prev ticker was "${prev.tickerUsed}". This shouldn't happen if outer checks are correct.`);
        return prev;
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
        // selectedIndicatorsConfigUsed and apiCallDelayUsed removed
      };
    });

  }, [stockDataFetchState, combinedServerState.tickerUsed, updateCumulativeStats]);


  useEffect(() => {
    console.log(`[CONTEXT:Effect:Analysis] aiAnalysisResultState changed. New timestamp: ${aiAnalysisResultState?.timestamp}, Last processed: ${lastProcessedAnalysisTimestamp.current}, Current context ticker: ${combinedServerState.tickerUsed}, AnalysisState ticker: ${aiAnalysisResultState?.tickerAnalyzed}`);

    if (!aiAnalysisResultState?.timestamp || aiAnalysisResultState.timestamp === lastProcessedAnalysisTimestamp.current) {
       if(aiAnalysisResultState?.timestamp && aiAnalysisResultState.timestamp === lastProcessedAnalysisTimestamp.current) {
        console.log(`[CONTEXT:Effect:Analysis] Skipping processing: Timestamp ${aiAnalysisResultState.timestamp} already processed.`);
      } else if (!aiAnalysisResultState?.timestamp) {
        console.log(`[CONTEXT:Effect:Analysis] Skipping processing: aiAnalysisResultState.timestamp is undefined.`);
      }
      return;
    }

    if (aiAnalysisResultState.tickerAnalyzed !== combinedServerState.tickerUsed) {
        console.warn(`[CONTEXT:Effect:Analysis] Stale AI analysis result for "${aiAnalysisResultState.tickerAnalyzed}" ignored. Current operation is for "${combinedServerState.tickerUsed}". Analysis timestamp: ${aiAnalysisResultState.timestamp}`);
        return;
    }
    console.log(`[CONTEXT:Effect:Analysis] Processing aiAnalysisResultState for ticker "${aiAnalysisResultState.tickerAnalyzed}". Error: ${aiAnalysisResultState.error}`);
    lastProcessedAnalysisTimestamp.current = aiAnalysisResultState.timestamp;

    setCombinedServerState(prev => {
      if (aiAnalysisResultState.tickerAnalyzed !== prev.tickerUsed) {
        console.warn(`[CONTEXT:Effect:Analysis:SetState] Stale aiAnalysisResultState for "${aiAnalysisResultState.tickerAnalyzed}" IGNORED. Prev ticker was "${prev.tickerUsed}".`);
        return prev;
      }
      return {
        ...prev,
        analysis: aiAnalysisResultState.analysis || initialCombinedStockAnalysisState.analysis,
        analysisUsageReport: aiAnalysisResultState.analysisUsageReport,
        error: aiAnalysisResultState.error || (prev.analysisStatus === 'error_fetching_data' ? prev.error : undefined),
        analysisStatus: aiAnalysisResultState.error ? 'error_analyzing_data' : 'analysis_complete',
        timestamp: aiAnalysisResultState.timestamp,
      };
    });

    if (aiAnalysisResultState.analysisUsageReport && aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed && !aiAnalysisResultState.error) {
        updateCumulativeStats(aiAnalysisResultState.analysisUsageReport, 'analysis');
    }
  }, [aiAnalysisResultState, combinedServerState.tickerUsed, updateCumulativeStats]);


  const submitFetchStockDataForm = useCallback((formData: FormData) => {
    const ticker = formData.get('ticker') as string | null;
    const dataSource = formData.get('dataSource') as string | null;
    const processingTicker = ticker?.trim().toUpperCase() || "NVDA";
    // selectedIndicatorsConfigString and apiCallDelayString removed

    // parsedTaConfig removed
    // parsedApiCallDelay removed

    console.log(
      `[CONTEXT_REQUEST] Action: fetchStockDataAction FOR TICKER: "${processingTicker}"`,
      { dataSource } // Only dataSource logged now
    );

    setCombinedServerState({
        ...initialCombinedStockAnalysisState,
        tickerUsed: processingTicker,
        dataSourceUsed: dataSource as DataSourceId,
        analysisStatus: 'data_fetching',
        timestamp: Date.now(),
        // selectedIndicatorsConfigUsed and apiCallDelayUsed removed
    });

    lastProcessedFetchTimestamp.current = undefined;
    lastProcessedAnalysisTimestamp.current = undefined;

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
      console.warn(`[CONTEXT_REQUEST:AIAnalysis] Aborting AI analysis call: Form data ticker "${tickerToAnalyze}" does not match current context ticker "${combinedServerState.tickerUsed}".`);
      setCombinedServerState(prev => ({
        ...prev,
        error: `Analysis for ${tickerToAnalyze} aborted as context changed to ${prev.tickerUsed}. Please re-analyze ${prev.tickerUsed}.`,
        analysisStatus: 'error_analyzing_data',
      }));
      return;
    }

    setCombinedServerState(prev => ({
      ...prev,
      analysisStatus: 'analyzing_data',
      error: undefined,
      analysisUsageReport: undefined,
      analysis: initialCombinedStockAnalysisState.analysis,
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
