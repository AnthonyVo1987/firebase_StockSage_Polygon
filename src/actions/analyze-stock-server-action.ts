
'use server';

import { analyzeStockData } from '@/ai/flows/analyze-stock-data';
import { fetchStockDataFromSource } from '@/services/data-sources';
import type { DataSourceId, AnalysisMode } from '@/services/data-sources/types'; // Added AnalysisMode
import { ALLOWED_DATA_SOURCE_IDS } from '@/services/data-sources/types'; // Moved from data-sources/index.ts
import type { AdapterOutput } from '@/services/data-sources/types';
import type { AnalyzeStockDataInput, AnalyzeStockDataOutput, SingleTakeaway } from '@/ai/schemas/stock-analysis-schemas';
import type { StockDataJson } from '@/ai/schemas/stock-fetch-schemas'; // Keep for parsing type
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { z } from 'zod';

const INPUT_PRICE_PER_MILLION_TOKENS = 0.15;
// Output prices are now mostly handled within adapters for AI-based data fetching,
// but keep one for the analysis step.
const OUTPUT_PRICE_THINKING_PER_MILLION_TOKENS = 3.50; // For analyzeStockDataFlow


const ActionInputSchema = z.object({
  ticker: z.string()
    .min(1, { message: "Ticker symbol cannot be empty." })
    .max(10, { message: "Ticker symbol is too long (max 10 chars)." })
    .regex(/^[a-zA-Z0-9.-]+$/, { message: "Ticker can only contain letters, numbers, dots, and hyphens."}),
  dataSource: z.enum(ALLOWED_DATA_SOURCE_IDS, {
    errorMap: () => ({ message: "Invalid data source selected." })
  }),
  analysisMode: z.enum(['live', 'mock'], {
    errorMap: () => ({ message: "Invalid analysis mode specified."})
  }),
});

export interface StockAnalysisState {
  stockJson?: string; 
  analysis?: AnalyzeStockDataOutput;
  error?: string;
  fieldErrors?: {
    ticker?: string[] | undefined;
    dataSource?: string[] | undefined;
    analysisMode?: string[] | undefined;
  };
  timestamp?: number;
  fetchUsageReport?: UsageReport; // This will now come from the AdapterOutput
  analysisUsageReport?: UsageReport;
}

// This specific calculation is now only for the analysisUsageReport.
// fetchUsageReport will be directly taken from the adapter if it's an AI adapter.
function calculateAnalysisUsageReport(
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
): UsageReport | undefined {
  if (!usage) return undefined;

  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;

  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_THINKING_PER_MILLION_TOKENS;
  const totalCost = inputCost + outputCost;

  return {
    flowName: 'analyzeStockDataFlow', // Explicitly for analysis
    inputTokens,
    outputTokens,
    contextWindow: inputTokens + outputTokens,
    cost: parseFloat(totalCost.toFixed(6)),
  };
}

export async function handleAnalyzeStock(
  prevState: StockAnalysisState | undefined,
  formData: FormData
): Promise<StockAnalysisState> {
  console.log('[ACTION:AnalyzeStock] Entered handleAnalyzeStock.');
  const rawTicker = formData.get('ticker') as string | null;
  const tickerToUse = rawTicker?.trim() || "NVDA";
  const dataSourceFromForm = formData.get('dataSource') as string | null;
  const analysisModeFromForm = formData.get('analysisMode') as 'live' | 'mock' | null;

  const validatedFields = ActionInputSchema.safeParse({
    ticker: tickerToUse,
    dataSource: dataSourceFromForm,
    analysisMode: analysisModeFromForm,
  });

  if (!validatedFields.success) {
    console.warn('[ACTION:AnalyzeStock] Input validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: `Invalid input. Please check ticker, data source, and analysis mode.`,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      timestamp: Date.now(),
    };
  }
  console.log('[ACTION:AnalyzeStock] Input validation successful:', validatedFields.data);

  const { ticker, dataSource, analysisMode } = validatedFields.data;
  let fetchUsageReport: UsageReport | undefined;
  let analysisUsageReport: UsageReport | undefined;
  let stockDataJsonForAnalysis: StockDataJson;
  let stockJsonStringForDisplay: string;

  try {
    console.log(`[ACTION:AnalyzeStock] Calling new fetchStockDataFromSource service for ${ticker}, Source: ${dataSource}, Mode: ${analysisMode}`);
    const adapterOutput: AdapterOutput = await fetchStockDataFromSource(
      ticker,
      dataSource as DataSourceId, // Cast as it's validated
      analysisMode as AnalysisMode // Cast as it's validated
    );

    fetchUsageReport = adapterOutput.usageReport; // Directly from adapter output

    if (adapterOutput.error || !adapterOutput.stockDataJson) {
      console.error(`[ACTION:AnalyzeStock] Error from fetchStockDataFromSource: ${adapterOutput.error}`);
      return {
        error: adapterOutput.error || `Failed to retrieve or generate stock data (Source: ${dataSource}, Mode: ${analysisMode}).`,
        timestamp: Date.now(),
        fetchUsageReport, 
      };
    }

    stockDataJsonForAnalysis = adapterOutput.stockDataJson;
    
    // Ensure critical marketStatus is present if from Polygon live, as it's a prerequisite for analysis.
    // AI adapters also have a TODO to ensure marketStatus is present.
    if (dataSource === 'polygon-api' && analysisMode === 'live' && !stockDataJsonForAnalysis.marketStatus) {
        const errorMsg = `Critical: Live Polygon data for ${ticker} is missing marketStatus. Analysis aborted.`;
        console.error(`[ACTION:AnalyzeStock] ${errorMsg}`);
        return { error: errorMsg, timestamp: Date.now(), fetchUsageReport };
    }
    if (!stockDataJsonForAnalysis.marketStatus) { // General check, especially for AI sources
        const errorMsg = `Data for ${ticker} from ${dataSource} is missing critical marketStatus. Analysis cannot proceed reliably.`;
        console.warn(`[ACTION:AnalyzeStock] ${errorMsg}`);
        // Potentially allow analysis to proceed but with a warning, or return error.
        // For now, let's return an error if marketStatus is missing for any source.
        return { error: errorMsg, timestamp: Date.now(), fetchUsageReport };
    }

    // Stringify for display and for passing to AI analysis flow
    try {
        stockJsonStringForDisplay = JSON.stringify(stockDataJsonForAnalysis, null, 2);
         console.log(`[ACTION:AnalyzeStock] Successfully stringified stockDataJsonForAnalysis. Length: ${stockJsonStringForDisplay.length}`);
    } catch (e: any) {
        console.error("[ACTION:AnalyzeStock] Failed to stringify stockDataJsonForAnalysis:", e.message, stockDataJsonForAnalysis);
        return { error: `Internal error processing stock data: ${e.message}`, timestamp: Date.now(), fetchUsageReport };
    }
    console.log(`[ACTION:AnalyzeStock] Received stockDataJson (first 200 chars of string): ${stockJsonStringForDisplay.substring(0,200)}...`);


    console.log("[ACTION:AnalyzeStock] Proceeding to AI analysis.");
    const analysisInput: AnalyzeStockDataInput = { stockData: stockJsonStringForDisplay }; 
    const analysisFlowResult = await analyzeStockData(analysisInput); 
    console.log('[ACTION:AnalyzeStock] AI analyzeStockData flow result:', analysisFlowResult);

    analysisUsageReport = calculateAnalysisUsageReport(analysisFlowResult.usage);

    const isValidTakeaway = (takeaway: any): takeaway is SingleTakeaway => {
        return takeaway && typeof takeaway.text === 'string' && takeaway.text.trim() !== '' &&
               typeof takeaway.sentiment === 'string' && ['bullish', 'bearish', 'neutral'].includes(takeaway.sentiment);
    };

    if (!analysisFlowResult.analysis || 
        !isValidTakeaway(analysisFlowResult.analysis.stockPriceAction) ||
        !isValidTakeaway(analysisFlowResult.analysis.trend) ||
        !isValidTakeaway(analysisFlowResult.analysis.volatility) ||
        !isValidTakeaway(analysisFlowResult.analysis.momentum) ||
        !isValidTakeaway(analysisFlowResult.analysis.patterns)
    ) {
      console.error("[ACTION:AnalyzeStock] AI analysis did not return all required takeaways with valid text/sentiment. Output:", analysisFlowResult.analysis);
      return {
        error: "AI analysis could not generate all required takeaways or they were empty/invalid. The data might be insufficient or an internal error occurred.",
        stockJson: stockJsonStringForDisplay,
        timestamp: Date.now(),
        fetchUsageReport,
        analysisUsageReport,
      };
    }
    
    const finalState = {
      stockJson: stockJsonStringForDisplay,
      analysis: analysisFlowResult.analysis, 
      timestamp: Date.now(),
      fetchUsageReport,
      analysisUsageReport,
    };
    console.log("[ACTION:AnalyzeStock] Returning successful state:", finalState);
    return finalState;

  } catch (e: any) {
    console.error("[ACTION:AnalyzeStock] Unexpected error in handleAnalyzeStock:", e);
    let displayError = `Failed to process stock '${ticker}'.`;
    if (e.message) {
        displayError += ` ${e.message}`;
    } else {
        displayError += " An unexpected error occurred.";
    }
    return { error: displayError, timestamp: Date.now(), fetchUsageReport, analysisUsageReport };
  }
}
