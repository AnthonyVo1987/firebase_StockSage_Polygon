
'use server';

import { analyzeStockData } from '@/ai/flows/analyze-stock-data';
import { fetchStockDataFromSource } from '@/services/data-sources';
import type { DataSourceId, AnalysisMode } from '@/services/data-sources/types';
import { ALLOWED_DATA_SOURCE_IDS } from '@/services/data-sources/types';
import type { AdapterOutput } from '@/services/data-sources/types';
import type { AnalyzeStockDataInput, AnalyzeStockDataOutput, SingleTakeaway } from '@/ai/schemas/stock-analysis-schemas';
import type { StockDataJson } from '@/ai/schemas/stock-fetch-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { 
  calculateUsageReport,
  GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
  GEMINI_FLASH_OUTPUT_ANALYZE_PRICE_USD_PER_MILLION_TOKENS
} from '@/ai/utils/cost-calculator';
import { z } from 'zod';

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
  fetchUsageReport?: UsageReport;
  analysisUsageReport?: UsageReport;
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
      dataSource as DataSourceId,
      analysisMode as AnalysisMode
    );

    fetchUsageReport = adapterOutput.usageReport; 

    if (adapterOutput.error || !adapterOutput.stockDataJson) {
      console.error(`[ACTION:AnalyzeStock] Error from fetchStockDataFromSource: ${adapterOutput.error}`);
      return {
        error: adapterOutput.error || `Failed to retrieve or generate stock data (Source: ${dataSource}, Mode: ${analysisMode}).`,
        timestamp: Date.now(),
        fetchUsageReport, 
      };
    }

    stockDataJsonForAnalysis = adapterOutput.stockDataJson;
    
    if (dataSource === 'polygon-api' && analysisMode === 'live' && !stockDataJsonForAnalysis.marketStatus) {
        const errorMsg = `Critical: Live Polygon data for ${ticker} is missing marketStatus. Analysis aborted.`;
        console.error(`[ACTION:AnalyzeStock] ${errorMsg}`);
        return { error: errorMsg, timestamp: Date.now(), fetchUsageReport };
    }
    if (!stockDataJsonForAnalysis.marketStatus) { 
        const errorMsg = `Data for ${ticker} from ${dataSource} is missing critical marketStatus. Analysis cannot proceed reliably.`;
        console.warn(`[ACTION:AnalyzeStock] ${errorMsg}`);
        return { error: errorMsg, timestamp: Date.now(), fetchUsageReport };
    }

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

    analysisUsageReport = calculateUsageReport(
      'analyzeStockDataFlow',
      analysisFlowResult.usage,
      GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
      GEMINI_FLASH_OUTPUT_ANALYZE_PRICE_USD_PER_MILLION_TOKENS
    );

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
