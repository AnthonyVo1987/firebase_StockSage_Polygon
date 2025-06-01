
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useActionState } from 'react';
import { handleAnalyzeStock, type StockAnalysisState } from '@/actions/analyze-stock-server-action';
import { handleChatSubmit, type ChatState } from '@/actions/chat-server-action';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';

// Initial state for analysis
const initialStockAnalysisServerState: StockAnalysisState = {
  stockJson: undefined,
  analysis: {
    stockPriceAction: { text: "AI analysis for price action pending.", sentiment: "neutral" },
    trend: { text: "AI analysis for trend pending.", sentiment: "neutral" },
    volatility: { text: "AI analysis for volatility pending.", sentiment: "neutral" },
    momentum: { text: "AI analysis for momentum pending.", sentiment: "neutral" },
    patterns: { text: "AI analysis for patterns pending.", sentiment: "neutral" }
  } as AnalyzeStockDataOutput,
  error: undefined,
  fieldErrors: undefined,
  timestamp: Date.now(),
  fetchUsageReport: undefined,
  analysisUsageReport: undefined,
};

// Initial state for chat
const initialChatServerState: ChatState = {
  messages: [],
  error: undefined,
  latestAiUsageReport: undefined,
  timestamp: Date.now()
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

interface StockAnalysisContextType {
  stockAnalysisServerState: StockAnalysisState;
  submitStockAnalysisForm: (formData: FormData) => void;
  stockAnalysisFormPending: boolean;
  chatServerState: ChatState;
  submitChatForm: (formData: FormData) => void;
  chatFormPending: boolean;
  cumulativeStats: CumulativeStats;
  updateCumulativeStats: (report: UsageReport) => void;
  clearChatHistory: () => void;
}

const StockAnalysisContext = createContext<StockAnalysisContextType | undefined>(undefined);

export function StockAnalysisProvider({ children }: { children: ReactNode }) {
  const [
    stockAnalysisServerState,
    submitStockAnalysisFormAction,
    stockAnalysisFormPending
  ] = useActionState(handleAnalyzeStock, initialStockAnalysisServerState);

  const [
    chatServerStateInternal,
    submitChatFormAction,
    chatFormPending
  ] = useActionState(handleChatSubmit, initialChatServerState);
  
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats>(initialCumulativeStats);

  const updateCumulativeStats = useCallback((report: UsageReport) => {
    console.log('[CONTEXT] Updating cumulative stats with report:', report);
    setCumulativeStats(prev => ({
      totalInputTokens: prev.totalInputTokens + (report.inputTokens || 0),
      totalOutputTokens: prev.totalOutputTokens + (report.outputTokens || 0),
      totalContextWindow: prev.totalContextWindow + ((report.inputTokens || 0) + (report.outputTokens || 0)),
      totalCost: parseFloat((prev.totalCost + (report.cost || 0)).toFixed(6)),
      requestCount: prev.requestCount + 1,
    }));
  }, []);

  const clearChatHistory = () => {
    console.log('[CONTEXT] clearChatHistory called - conceptual placeholder for now.');
  };

  const submitStockAnalysisForm = (formData: FormData) => {
    const ticker = formData.get('ticker') as string | null;
    const dataSource = formData.get('dataSource') as string | null;
    const analysisMode = formData.get('analysisMode') as string | null; // This one is from the button's value
    
    console.log(
      '[CLIENT_REQUEST] Action: handleAnalyzeStock, Payload:', 
      { 
        ticker: ticker?.trim() || "NVDA", 
        dataSource, 
        analysisMode 
      }
    );
    submitStockAnalysisFormAction(formData);
  };

  const submitChatForm = (formData: FormData) => {
    const userPrompt = formData.get('userPrompt') as string | null;
    const stockJsonPresent = !!formData.get('stockJson');
    const analysisSummaryPresent = !!formData.get('analysisSummary');
    const chatHistoryPresent = !!formData.get('chatHistory');

    console.log(
      '[CLIENT_REQUEST] Action: handleChatSubmit, Payload:',
      {
        userPrompt,
        stockJsonPresent,
        analysisSummaryPresent,
        chatHistoryPresent,
      }
    );
    submitChatFormAction(formData);
  };

  const contextValue: StockAnalysisContextType = {
    stockAnalysisServerState: stockAnalysisServerState || initialStockAnalysisServerState,
    submitStockAnalysisForm,
    stockAnalysisFormPending,
    chatServerState: chatServerStateInternal || initialChatServerState,
    submitChatForm,
    chatFormPending,
    cumulativeStats,
    updateCumulativeStats,
    clearChatHistory,
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
