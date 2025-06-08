
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
import {
  calculateAiTaAction, // New action
  type AiCalculatedTaState, // New state type
} from '@/actions/calculate-ai-ta-action';
import type { ChatState as ServerChatState, ChatMessage as ServerChatMessage } from '@/ai/schemas/chat-schemas';
import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
import type { AiCalculatedTaOutput } from '@/ai/schemas/ai-calculated-ta-schemas'; // New
import { examplePrompts } from '@/ai/schemas/chat-prompts';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import type { DataSourceId } from '@/services/data-sources/types';

// Updated AnalysisStatus to include new steps
export type AnalysisStatus = 
  | 'idle' 
  | 'data_fetching' 
  | 'data_fetched_ai_ta_pending' // New: After Polygon data, before AI TA calc
  | 'calculating_ai_ta'          // New: AI TA calculation in progress
  | 'ai_ta_calculated_key_takeaways_pending' // New: After AI TA, before Key Takeaways
  | 'analyzing_data'             // Now specifically for Key Takeaways analysis
  | 'analysis_complete' 
  | 'error_fetching_data' 
  | 'error_calculating_ai_ta'    // New
  | 'error_analyzing_data';      // Now specifically for Key Takeaways analysis error

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

// New initial state for AI Calculated TA
export const initialAiCalculatedTaState: AiCalculatedTaState = {
  calculatedTaJson: undefined,
  calculatedTaObject: undefined,
  calculatedTaUsageReport: undefined,
  error: undefined,
  fieldErrors: undefined,
  timestamp: undefined,
  tickerAnalyzed: undefined,
};

export interface CombinedStockAnalysisState {
  stockJson?: string;
  analysis?: AnalyzeStockDataOutput; // Key Takeaways
  calculatedAiTaJson?: string;      // New: AI Calculated TA JSON
  calculatedAiTaObject?: AiCalculatedTaOutput; // New: AI Calculated TA Object
  error?: string;
  fieldErrors?: StockDataFetchState['fieldErrors'] | AiCalculatedTaState['fieldErrors']; // Can be from either action
  timestamp?: number;
  fetchUsageReport?: UsageReport;
  aiCalculatedTaUsageReport?: UsageReport; // New
  analysisUsageReport?: UsageReport; // For Key Takeaways
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
  calculatedAiTaJson: undefined,
  calculatedAiTaObject: undefined,
  error: undefined,
  fieldErrors: undefined,
  timestamp: undefined,
  fetchUsageReport: undefined,
  aiCalculatedTaUsageReport: undefined,
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

const constructAnalysisSummaryForChat = (currentAnalysis?: AnalyzeStockDataOutput, aiCalculatedTa?: AiCalculatedTaOutput): string | undefined => {
  let summaryParts: string[] = [];
  if (currentAnalysis) {
    const { stockPriceAction, trend, volatility, momentum, patterns } = currentAnalysis;
    if (stockPriceAction?.text && !stockPriceAction.text.includes("pending")) summaryParts.push(`Price Action (${stockPriceAction.sentiment}): ${stockPriceAction.text}`);
    if (trend?.text && !trend.text.includes("pending")) summaryParts.push(`Trend (${trend.sentiment}): ${trend.text}`);
    if (volatility?.text && !volatility.text.includes("pending")) summaryParts.push(`Volatility (${volatility.sentiment}): ${volatility.text}`);
    if (momentum?.text && !momentum.text.includes("pending")) summaryParts.push(`Momentum (${momentum.sentiment}): ${momentum.text}`);
    if (patterns?.text && !patterns.text.includes("pending")) summaryParts.push(`Patterns (${patterns.sentiment}): ${patterns.text}`);
  }
  if (aiCalculatedTa?.pivotLevels) {
    summaryParts.push("AI Calculated Pivot Points:");
    summaryParts.push(`  PP: ${aiCalculatedTa.pivotLevels.PP.toFixed(2)}`);
    summaryParts.push(`  S1: ${aiCalculatedTa.pivotLevels.S1.toFixed(2)}, S2: ${aiCalculatedTa.pivotLevels.S2.toFixed(2)}, S3: ${aiCalculatedTa.pivotLevels.S3.toFixed(2)}`);
    summaryParts.push(`  R1: ${aiCalculatedTa.pivotLevels.R1.toFixed(2)}, R2: ${aiCalculatedTa.pivotLevels.R2.toFixed(2)}, R3: ${aiCalculatedTa.pivotLevels.R3.toFixed(2)}`);
  }
  return summaryParts.length > 0 ? summaryParts.join('\\n') : undefined;
};


interface StockAnalysisContextType {
  stockDataFetchState: StockDataFetchState;
  aiCalculatedTaState: AiCalculatedTaState; // New
  aiAnalysisResultState: AiAnalysisResultState;

  submitFetchStockDataForm: (formData: FormData) => void;
  fetchStockDataPending: boolean;

  submitCalculateAiTaForm: (formData: FormData) => void; // New
  calculateAiTaPending: boolean; // New

  submitPerformAiAnalysisForm: (formData: FormData) => void;
  performAiAnalysisPending: boolean;

  combinedServerState: CombinedStockAnalysisState;
  cumulativeStats: CumulativeStats;
  updateCumulativeStats: (report: UsageReport, flowType: 'fetch' | 'ai_ta_calc' | 'analysis' | 'chat') => void; // Added flow types

  chatServerState: ContextChatState;
  submitChatForm: (formData: FormData) => void;
  chatFormPending: boolean;
  clearChatHistoryContext: () => void;
  formRef: React.RefObject<HTMLFormElement> | null;
  setFormRef: (ref: React.RefObject<HTMLFormElement> | null) => void;
}

const StockAnalysisContext = createContext<StockAnalysisContextType | undefined>(undefined);

export function StockAnalysisProvider({ children }: { children: ReactNode }) {
  const [
    stockDataFetchState,
    submitFetchStockDataActionInternal,
    fetchStockDataPending
  ] = useActionState(fetchStockDataAction, initialStockDataFetchState);

  const [
    aiCalculatedTaState, // New state hook for AI TA calculation
    submitCalculateAiTaActionInternal,
    calculateAiTaPending
  ] = useActionState(calculateAiTaAction, initialAiCalculatedTaState);

  const [
    aiAnalysisResultState, // For Key Takeaways
    submitPerformAiAnalysisActionInternal,
    performAiAnalysisPending
  ] = useActionState(performAiAnalysisAction, initialAiAnalysisResultState);

  const [combinedServerState, setCombinedServerState] = useState<CombinedStockAnalysisState>(initialCombinedStockAnalysisState);
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats>(initialCumulativeStats);
  
  const [triggerFullChatAfterAnalysis, setTriggerFullChatAfterAnalysis] = useState(false);
  const [formRef, setFormRefState] = useState<React.RefObject<HTMLFormElement> | null>(null);

  const lastProcessedFetchTimestamp = useRef<number | undefined>();
  const lastProcessedAiTaCalcTimestamp = useRef<number | undefined>(); // New
  const lastProcessedAnalysisTimestamp = useRef<number | undefined>(); // For Key Takeaways
  const lastChatAiMessageIdProcessedForToast = useRef<string | undefined>();

  const updateCumulativeStats = useCallback((report: UsageReport, flowType: 'fetch' | 'ai_ta_calc' | 'analysis' | 'chat') => {
    console.log(`[CONTEXT] Updating cumulative stats with report from ${flowType} for ${report.flowName}:`, report);
    setCumulativeStats(prev => ({
      totalInputTokens: prev.totalInputTokens + (report.inputTokens || 0),
      totalOutputTokens: prev.totalOutputTokens + (report.outputTokens || 0),
      totalContextWindow: prev.totalContextWindow + ((report.inputTokens || 0) + (report.outputTokens || 0)),
      totalCost: parseFloat((prev.totalCost + (report.cost || 0)).toFixed(6)),
      requestCount: prev.requestCount + 1,
    }));
  }, []);

  // Effect 1: Process result of fetchStockDataAction
  useEffect(() => {
    console.log(`[CONTEXT:Effect:Fetch] stockDataFetchState changed. New timestamp: ${stockDataFetchState?.timestamp}, Last processed: ${lastProcessedFetchTimestamp.current}, Current context ticker: ${combinedServerState.tickerUsed}, FetchState ticker: ${stockDataFetchState?.tickerUsed}, InitiateFullChat: ${stockDataFetchState?.initiateFullChatAnalysis}`);

    if (!stockDataFetchState?.timestamp || stockDataFetchState.timestamp === lastProcessedFetchTimestamp.current) {
      // Avoid re-processing if timestamp hasn't changed or is undefined
      return;
    }
    if (stockDataFetchState.tickerUsed !== combinedServerState.tickerUsed && combinedServerState.analysisStatus !== 'idle' && combinedServerState.analysisStatus !== 'data_fetching') {
        console.warn(`[CONTEXT:Effect:Fetch] Discarding stockDataFetchState update due to ticker mismatch and context not in initial state.`);
        return;
    }
    
    lastProcessedFetchTimestamp.current = stockDataFetchState.timestamp;
    console.log(`[CONTEXT:Effect:Fetch] Processing stockDataFetchState for "${stockDataFetchState.tickerUsed}". Status: ${stockDataFetchState.analysisStatus}`);

    if (stockDataFetchState.initiateFullChatAnalysis && stockDataFetchState.analysisStatus !== 'error_fetching_data') {
        setTriggerFullChatAfterAnalysis(true);
    } else if (stockDataFetchState.analysisStatus === 'data_fetching' && !stockDataFetchState.initiateFullChatAnalysis) {
        setTriggerFullChatAfterAnalysis(false);
    }

    setCombinedServerState(prev => ({
        ...prev,
        stockJson: stockDataFetchState.stockJson,
        analysis: stockDataFetchState.error || !stockDataFetchState.stockJson ? initialCombinedStockAnalysisState.analysis : prev.analysis,
        calculatedAiTaJson: stockDataFetchState.error || !stockDataFetchState.stockJson ? undefined : prev.calculatedAiTaJson,
        calculatedAiTaObject: stockDataFetchState.error || !stockDataFetchState.stockJson ? undefined : prev.calculatedAiTaObject,
        error: stockDataFetchState.error,
        fieldErrors: stockDataFetchState.fieldErrors,
        timestamp: stockDataFetchState.timestamp,
        fetchUsageReport: stockDataFetchState.fetchUsageReport,
        analysisUsageReport: stockDataFetchState.error || !stockDataFetchState.stockJson ? undefined : prev.analysisUsageReport,
        aiCalculatedTaUsageReport: stockDataFetchState.error || !stockDataFetchState.stockJson ? undefined : prev.aiCalculatedTaUsageReport,
        analysisStatus: stockDataFetchState.error ? 'error_fetching_data' : 'data_fetched_ai_ta_pending', // Next step is AI TA calc
        dataSourceUsed: stockDataFetchState.dataSourceUsed,
        initiateFullChatAnalysis: stockDataFetchState.initiateFullChatAnalysis, 
      }));
    
    if (stockDataFetchState.fetchUsageReport) {
        updateCumulativeStats(stockDataFetchState.fetchUsageReport, 'fetch');
    }

    // If data fetch was successful, trigger AI TA calculation
    if (stockDataFetchState.analysisStatus === 'data_fetched_analysis_pending' && stockDataFetchState.stockJson && stockDataFetchState.tickerUsed) {
        console.log(`[CONTEXT:Effect:Fetch] Data fetch complete for "${stockDataFetchState.tickerUsed}". Triggering AI TA calculation.`);
        const aiTaFormData = new FormData();
        aiTaFormData.append('polygonStockJsonString', stockDataFetchState.stockJson);
        aiTaFormData.append('ticker', stockDataFetchState.tickerUsed);
        submitCalculateAiTaForm(aiTaFormData); // New dispatcher call
    }

  }, [stockDataFetchState, combinedServerState.tickerUsed, combinedServerState.analysisStatus, updateCumulativeStats]);


  // Effect 2: Process result of calculateAiTaAction (New)
  useEffect(() => {
    console.log(`[CONTEXT:Effect:AiTaCalc] aiCalculatedTaState changed. New timestamp: ${aiCalculatedTaState?.timestamp}, Last processed: ${lastProcessedAiTaCalcTimestamp.current}, Context ticker: ${combinedServerState.tickerUsed}, AiTaCalc ticker: ${aiCalculatedTaState?.tickerAnalyzed}`);

    if (!aiCalculatedTaState?.timestamp || aiCalculatedTaState.timestamp === lastProcessedAiTaCalcTimestamp.current) {
      return;
    }
    if (aiCalculatedTaState.tickerAnalyzed !== combinedServerState.tickerUsed) {
      console.warn(`[CONTEXT:Effect:AiTaCalc] Discarding aiCalculatedTaState update due to ticker mismatch.`);
      return;
    }

    lastProcessedAiTaCalcTimestamp.current = aiCalculatedTaState.timestamp;
    console.log(`[CONTEXT:Effect:AiTaCalc] Processing aiCalculatedTaState for "${aiCalculatedTaState.tickerAnalyzed}". Error: ${aiCalculatedTaState.error}`);

    setCombinedServerState(prev => ({
      ...prev,
      calculatedAiTaJson: aiCalculatedTaState.calculatedTaJson,
      calculatedAiTaObject: aiCalculatedTaState.calculatedTaObject,
      aiCalculatedTaUsageReport: aiCalculatedTaState.calculatedTaUsageReport,
      error: aiCalculatedTaState.error || (prev.analysisStatus === 'error_fetching_data' ? prev.error : undefined), // Preserve fetch error
      fieldErrors: aiCalculatedTaState.fieldErrors || prev.fieldErrors,
      analysisStatus: aiCalculatedTaState.error ? 'error_calculating_ai_ta' : 'ai_ta_calculated_key_takeaways_pending', // Next step is key takeaways
      timestamp: aiCalculatedTaState.timestamp,
    }));

    if (aiCalculatedTaState.calculatedTaUsageReport) {
      updateCumulativeStats(aiCalculatedTaState.calculatedTaUsageReport, 'ai_ta_calc');
    }

    // If AI TA calculation was successful, trigger Key Takeaways analysis
    if (!aiCalculatedTaState.error && combinedServerState.stockJson && combinedServerState.tickerUsed && aiCalculatedTaState.calculatedTaJson) {
      console.log(`[CONTEXT:Effect:AiTaCalc] AI TA calculation complete for "${combinedServerState.tickerUsed}". Triggering Key Takeaways analysis.`);
      const keyTakeawaysFormData = new FormData();
      keyTakeawaysFormData.append('stockJsonString', combinedServerState.stockJson);
      keyTakeawaysFormData.append('ticker', combinedServerState.tickerUsed);
      keyTakeawaysFormData.append('aiCalculatedTaJsonString', aiCalculatedTaState.calculatedTaJson); // Pass new AI TA data
      submitPerformAiAnalysisForm(keyTakeawaysFormData);
    }
  }, [aiCalculatedTaState, combinedServerState.tickerUsed, combinedServerState.stockJson, updateCumulativeStats]);

  // Effect 3: Process result of performAiAnalysisAction (Key Takeaways)
  useEffect(() => {
    console.log(`[CONTEXT:Effect:KeyTakeaways] aiAnalysisResultState changed. New timestamp: ${aiAnalysisResultState?.timestamp}, Last processed: ${lastProcessedAnalysisTimestamp.current}, Context ticker: ${combinedServerState.tickerUsed}, KeyTakeaways ticker: ${aiAnalysisResultState?.tickerAnalyzed}`);

    if (!aiAnalysisResultState?.timestamp || aiAnalysisResultState.timestamp === lastProcessedAnalysisTimestamp.current) {
      return;
    }
    if (aiAnalysisResultState.tickerAnalyzed !== combinedServerState.tickerUsed) {
      console.warn(`[CONTEXT:Effect:KeyTakeaways] Discarding aiAnalysisResultState update due to ticker mismatch.`);
      return;
    }

    lastProcessedAnalysisTimestamp.current = aiAnalysisResultState.timestamp;
    console.log(`[CONTEXT:Effect:KeyTakeaways] Processing aiAnalysisResultState for "${aiAnalysisResultState.tickerAnalyzed}". Error: ${aiAnalysisResultState.error}`);

    setCombinedServerState(prev => ({
      ...prev,
      analysis: aiAnalysisResultState.analysis || initialCombinedStockAnalysisState.analysis,
      analysisUsageReport: aiAnalysisResultState.analysisUsageReport,
      error: aiAnalysisResultState.error || (prev.analysisStatus === 'error_fetching_data' || prev.analysisStatus === 'error_calculating_ai_ta' ? prev.error : undefined), // Preserve earlier errors
      analysisStatus: aiAnalysisResultState.error ? 'error_analyzing_data' : 'analysis_complete',
      timestamp: aiAnalysisResultState.timestamp,
    }));

    if (aiAnalysisResultState.analysisUsageReport) {
        updateCumulativeStats(aiAnalysisResultState.analysisUsageReport, 'analysis');
    }
  }, [aiAnalysisResultState, combinedServerState.tickerUsed, updateCumulativeStats]);


  const submitFetchStockDataForm = useCallback((formData: FormData) => {
    const ticker = formData.get('ticker') as string | null;
    const dataSource = formData.get('dataSource') as string | null;
    const analysisType = formData.get('analysisType') as string | null;
    const processingTicker = ticker?.trim().toUpperCase() || "NVDA";
    const isFullDetail = analysisType === 'fullDetail';

    console.log(`[CONTEXT_REQUEST] Action: fetchStockDataAction FOR TICKER: "${processingTicker}"`, { dataSource, analysisType });
    console.log(`[CONTEXT] submitFetchStockDataForm: analysisType from form is "${analysisType}". Setting triggerFullChatAfterAnalysis to ${isFullDetail}`);
    setTriggerFullChatAfterAnalysis(isFullDetail); 

    setCombinedServerState({
        ...initialCombinedStockAnalysisState,
        tickerUsed: processingTicker,
        dataSourceUsed: dataSource as DataSourceId,
        analysisStatus: 'data_fetching',
        timestamp: Date.now(),
        initiateFullChatAnalysis: isFullDetail,
    });
    lastProcessedFetchTimestamp.current = undefined;
    lastProcessedAiTaCalcTimestamp.current = undefined; // Reset for new sequence
    lastProcessedAnalysisTimestamp.current = undefined;

    startTransition(() => submitFetchStockDataActionInternal(formData));
  }, [submitFetchStockDataActionInternal]);

  // New dispatcher for AI TA Calculation
  const submitCalculateAiTaForm = useCallback((formData: FormData) => {
    const tickerToAnalyze = formData.get('ticker') as string | null;
    console.log(`[CONTEXT_REQUEST] Action: calculateAiTaAction FOR TICKER: "${tickerToAnalyze || 'N/A'}" (Context ticker is "${combinedServerState.tickerUsed}")`);

    if (tickerToAnalyze !== combinedServerState.tickerUsed) {
      console.warn(`[CONTEXT_REQUEST:AiTaCalc] Aborting AI TA calculation: Form data ticker "${tickerToAnalyze}" != context ticker "${combinedServerState.tickerUsed}".`);
      setCombinedServerState(prev => ({ ...prev, error: `AI TA calculation for ${tickerToAnalyze} aborted. Context changed.`, analysisStatus: 'error_calculating_ai_ta' }));
      return;
    }
    setCombinedServerState(prev => ({ ...prev, analysisStatus: 'calculating_ai_ta', error: undefined, aiCalculatedTaUsageReport: undefined, calculatedAiTaJson: undefined, calculatedAiTaObject: undefined, timestamp: Date.now() }));
    startTransition(() => submitCalculateAiTaActionInternal(formData));
  }, [submitCalculateAiTaActionInternal, combinedServerState.tickerUsed]);


  const submitPerformAiAnalysisForm = useCallback((formData: FormData) => {
    const tickerToAnalyze = formData.get('ticker') as string | null;
    console.log(`[CONTEXT_REQUEST] Action: performAiAnalysisAction (Key Takeaways) FOR TICKER: "${tickerToAnalyze || 'N/A'}" (Context ticker is "${combinedServerState.tickerUsed}")`, { stockJsonStringPresent: !!formData.get('stockJsonString'), aiCalculatedTaJsonStringPresent: !!formData.get('aiCalculatedTaJsonString') });

    if (tickerToAnalyze !== combinedServerState.tickerUsed) {
      console.warn(`[CONTEXT_REQUEST:KeyTakeaways] Aborting Key Takeaways analysis: Form data ticker "${tickerToAnalyze}" != context ticker "${combinedServerState.tickerUsed}".`);
      setCombinedServerState(prev => ({ ...prev, error: `Key Takeaways analysis for ${tickerToAnalyze} aborted. Context changed.`, analysisStatus: 'error_analyzing_data' }));
      return;
    }
    setCombinedServerState(prev => ({ ...prev, analysisStatus: 'analyzing_data', error: undefined, analysisUsageReport: undefined, analysis: initialCombinedStockAnalysisState.analysis, timestamp: Date.now() }));
    startTransition(() => submitPerformAiAnalysisActionInternal(formData));
  }, [submitPerformAiAnalysisActionInternal, combinedServerState.tickerUsed]);


  const [chatServerState, submitChatFormAction, chatFormPending] = useActionState(
    async (prevState: ContextChatState, formData: FormData): Promise<ContextChatState> => {
      if (formData.get('_clear_history_signal_')) {
        return { ...initialChatState, timestamp: Date.now() };
      }
      const { handleChatSubmit } = await import('@/actions/chat-server-action');
      const result = await handleChatSubmit(prevState, formData);
      return { messages: result.messages as ContextChatMessage[], error: result.error, latestAiUsageReport: result.latestAiUsageReport, timestamp: result.timestamp || Date.now() };
    },
    initialChatState
  );

  const submitChatForm = useCallback((formData: FormData) => {
     console.log('[CLIENT_REQUEST] Action: handleChatSubmit (via context), Payload:', { userPrompt: formData.get('userPrompt'), stockJsonPresent: !!formData.get('stockJson'), analysisSummaryPresent: !!formData.get('analysisSummary'), chatHistoryPresent: !!formData.get('chatHistory') });
    startTransition(() => submitChatFormAction(formData));
  }, [submitChatFormAction]);

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
        console.error('[CONTEXT:Effect:AutoChat] "Full Detailed Analysis" prompt not found.');
        setTriggerFullChatAfterAnalysis(false);
        return;
      }
      const chatFormData = new FormData();
      chatFormData.append('userPrompt', fullAnalysisPrompt.promptText);
      if (combinedServerState.stockJson) {
        try {
          const parsedJson = JSON.parse(combinedServerState.stockJson);
          if (parsedJson.stockSnapshot?.ticker === combinedServerState.tickerUsed) chatFormData.append('stockJson', combinedServerState.stockJson);
        } catch (e) { console.error("[CONTEXT:Effect:AutoChat] Error parsing stockJson for auto-chat context:", e); }
      }
      // Pass AI Calculated TA JSON to chat context as well
      if (combinedServerState.calculatedAiTaJson) {
        chatFormData.append('aiCalculatedTaJson', combinedServerState.calculatedAiTaJson);
      }
      const analysisSummary = constructAnalysisSummaryForChat(combinedServerState.analysis, combinedServerState.calculatedAiTaObject);
      if (analysisSummary) chatFormData.append('analysisSummary', analysisSummary);
      chatFormData.append('chatHistory', JSON.stringify(chatServerState.messages || []));
      submitChatForm(chatFormData);
      setTriggerFullChatAfterAnalysis(false); 
    } else if (triggerFullChatAfterAnalysis && (combinedServerState.analysisStatus === 'error_fetching_data' || combinedServerState.analysisStatus === 'error_calculating_ai_ta' || combinedServerState.analysisStatus === 'error_analyzing_data')) {
      console.warn(`[CONTEXT:Effect:AutoChat] Full detailed analysis chat aborted for "${combinedServerState.tickerUsed}" due to prior error. Status: ${combinedServerState.analysisStatus}`);
      setTriggerFullChatAfterAnalysis(false); 
    }
  }, [ triggerFullChatAfterAnalysis, combinedServerState, aiAnalysisResultState?.tickerAnalyzed, chatFormPending, chatServerState.messages, submitChatForm ]);

  const clearChatHistoryContext = useCallback(() => {
    const dummyFormData = new FormData();
    dummyFormData.append('_clear_history_signal_', 'true');
    startTransition(() => submitChatFormAction(dummyFormData));
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
    aiCalculatedTaState, // New
    aiAnalysisResultState,
    submitFetchStockDataForm,
    fetchStockDataPending,
    submitCalculateAiTaForm, // New
    calculateAiTaPending, // New
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
