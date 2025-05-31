
'use server';

import { analyzeStockData } from '@/ai/flows/analyze-stock-data';
import { fetchStockData } from '@/ai/flows/fetch-stock-data';
import { fetchStockDataFromPolygon } from '@/services/polygon-service';
import type { AnalyzeStockDataInput, AnalyzeStockDataOutput, SingleTakeaway } from '@/ai/schemas/stock-analysis-schemas';
import type { FetchStockDataInput, FetchStockDataFlowOutput, StockDataJson } from '@/ai/schemas/stock-fetch-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { z } from 'zod';

const INPUT_PRICE_PER_MILLION_TOKENS = 0.15;
const OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS = 0.60; // For fetchStockDataFlow
const OUTPUT_PRICE_THINKING_PER_MILLION_TOKENS = 3.50;    // For analyzeStockDataFlow

const ALLOWED_DATA_SOURCES = ["polygon-api", "ai-gemini-2.5-flash-preview-05-20"] as const;

const ActionInputSchema = z.object({
  ticker: z.string()
    .min(1, { message: "Ticker symbol cannot be empty." })
    .max(10, { message: "Ticker symbol is too long (max 10 chars)." })
    .regex(/^[a-zA-Z0-9.-]+$/, { message: "Ticker can only contain letters, numbers, dots, and hyphens."}),
  dataSource: z.enum(ALLOWED_DATA_SOURCES, {
    errorMap: () => ({ message: "Invalid data source selected." })
  }),
  analysisMode: z.enum(['live', 'mock'], {
    errorMap: () => ({ message: "Invalid analysis mode specified."})
  }),
});


export interface StockAnalysisState {
  stockJson?: string; // Will now include marketStatus
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

function calculateUsageReport(
  flowName: string,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
  outputPriceTier: number
): UsageReport | undefined {
  if (!usage) return undefined;

  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;

  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * outputPriceTier;
  const totalCost = inputCost + outputCost;

  return {
    flowName,
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
  const dataSource = formData.get('dataSource') as string | null;
  const analysisMode = formData.get('analysisMode') as 'live' | 'mock' | null;

  const validatedFields = ActionInputSchema.safeParse({
    ticker: tickerToUse,
    dataSource: dataSource,
    analysisMode: analysisMode,
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

  const { ticker, dataSource: validatedDataSource, analysisMode: validatedAnalysisMode } = validatedFields.data;
  let fetchUsageReport: UsageReport | undefined;
  let analysisUsageReport: UsageReport | undefined;
  let stockJsonData: string;

  try {
    if (validatedDataSource === "ai-gemini-2.5-flash-preview-05-20") {
      console.log(`[ACTION:AnalyzeStock] Using AI data source. Mock: ${validatedAnalysisMode === 'mock'}`);
      const fetchInput: FetchStockDataInput = { ticker, forceMock: validatedAnalysisMode === 'mock' };
      const fetchFlowResult: FetchStockDataFlowOutput = await fetchStockData(fetchInput);
      console.log('[ACTION:AnalyzeStock] AI fetchStockData flow result:', fetchFlowResult);
      
      if (fetchFlowResult.error || !fetchFlowResult.data?.stockJson) {
        console.error(`[ACTION:AnalyzeStock] AI could not retrieve/generate stock data. Error: ${fetchFlowResult.error}`);
        return {
          error: fetchFlowResult.error || `AI could not retrieve or generate stock data (mode: ${validatedAnalysisMode}).`,
          timestamp: Date.now(),
          fetchUsageReport: calculateUsageReport('fetchStockDataFlow', fetchFlowResult.usage, OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS),
        };
      }
      stockJsonData = fetchFlowResult.data.stockJson;
      fetchUsageReport = calculateUsageReport('fetchStockDataFlow', fetchFlowResult.usage, OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS);
    }
    else if (validatedDataSource === "polygon-api") {
      if (validatedAnalysisMode === 'mock') {
         console.log("[ACTION:AnalyzeStock] Polygon.io selected, but mode is 'mock'. Generating mock data via AI.");
         const fetchInput: FetchStockDataInput = { ticker, forceMock: true };
         const fetchFlowResult: FetchStockDataFlowOutput = await fetchStockData(fetchInput);
         console.log('[ACTION:AnalyzeStock] AI fetchStockData (mock for Polygon) flow result:', fetchFlowResult);
         
         if (fetchFlowResult.error || !fetchFlowResult.data?.stockJson) {
           console.error(`[ACTION:AnalyzeStock] AI could not generate mock stock data for Polygon. Error: ${fetchFlowResult.error}`);
           return {
             error: fetchFlowResult.error || `AI could not generate mock stock data for Polygon source (mode: ${validatedAnalysisMode}).`,
             timestamp: Date.now(),
             fetchUsageReport: calculateUsageReport('fetchStockDataFlow (mock for Polygon)', fetchFlowResult.usage, OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS),
           };
         }
         stockJsonData = fetchFlowResult.data.stockJson;
         fetchUsageReport = calculateUsageReport('fetchStockDataFlow (mock for Polygon)', fetchFlowResult.usage, OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS);
      } else {
         console.log(`[ACTION:AnalyzeStock] Fetching live data from Polygon.io for ${ticker}`);
         try {
            stockJsonData = await fetchStockDataFromPolygon(ticker); // This now includes market status first
            console.log(`[ACTION:AnalyzeStock] Successfully fetched data from Polygon.io for ${ticker}.`);
         } catch (polygonError: any) {
            console.error(`[ACTION:AnalyzeStock] Error fetching from Polygon.io for ${ticker}:`, polygonError);
            // Check if it's a market status failure specifically
            if (polygonError.message && polygonError.message.toLowerCase().includes("market status")) {
                 return {
                    error: `Failed to fetch critical market status from Polygon.io for ${ticker}: ${polygonError.message}. Analysis aborted.`,
                    timestamp: Date.now(),
                };
            }
            return {
                error: `Failed to fetch data from Polygon.io for ${ticker}: ${polygonError.message || 'Unknown error'}. Analysis aborted.`,
                timestamp: Date.now(),
            };
         }
      }
    }
    else {
      console.error("[ACTION:AnalyzeStock] Invalid data source specified:", validatedDataSource);
      return { error: "Invalid or unsupported data source specified.", timestamp: Date.now() };
    }

    console.log(`[ACTION:AnalyzeStock] Received stockJsonData (first 200 chars): ${stockJsonData.substring(0,200)}...`);
    let parsedStockData: StockDataJson;
    try {
      parsedStockData = JSON.parse(stockJsonData);
      console.log("[ACTION:AnalyzeStock] stockJsonData successfully parsed as JSON.");
      if (validatedDataSource === "polygon-api" && validatedAnalysisMode === 'live' && !parsedStockData.marketStatus) {
        console.warn("[ACTION:AnalyzeStock] Live Polygon data is missing marketStatus. This is unexpected.");
      }
    } catch (e) {
      console.error("[ACTION:AnalyzeStock] Received stockJson is NOT valid JSON:", stockJsonData, e);
      return { error: 'The data source returned invalid JSON. Please try again.', timestamp: Date.now(), fetchUsageReport };
    }

    console.log("[ACTION:AnalyzeStock] Proceeding to AI analysis.");
    const analysisInput: AnalyzeStockDataInput = { stockData: stockJsonData }; 
    const analysisFlowResult = await analyzeStockData(analysisInput); 
    console.log('[ACTION:AnalyzeStock] AI analyzeStockData flow result:', analysisFlowResult);

    analysisUsageReport = calculateUsageReport('analyzeStockDataFlow', analysisFlowResult.usage, OUTPUT_PRICE_THINKING_PER_MILLION_TOKENS);

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
        stockJson: stockJsonData,
        timestamp: Date.now(),
        fetchUsageReport,
        analysisUsageReport,
      };
    }
    
    const finalState = {
      stockJson: stockJsonData,
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
     if (e.message && (e.message.toLowerCase().includes("market status") || e.message.toLowerCase().includes("polygon"))) {
        displayError = e.message; 
    } else if (e.message) {
        displayError += ` ${e.message}`;
    } else {
        displayError += " An unexpected error occurred.";
    }
    return { error: displayError, timestamp: Date.now(), fetchUsageReport, analysisUsageReport };
  }
}

