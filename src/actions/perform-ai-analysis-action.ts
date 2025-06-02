
'use server';

import { analyzeStockData } from '@/ai/flows/analyze-stock-data';
import type { AnalyzeStockDataInput, AnalyzeStockDataOutput, SingleTakeaway, AnalyzeStockDataFlowOutput } from '@/ai/schemas/stock-analysis-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import {
  calculateUsageReport,
  GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
  GEMINI_FLASH_OUTPUT_ANALYZE_PRICE_USD_PER_MILLION_TOKENS
} from '@/ai/utils/cost-calculator';
import { z } from 'zod';

const AiAnalysisInputSchema = z.object({
  stockJsonString: z.string().min(1, { message: "Stock JSON string cannot be empty for analysis." }),
  ticker: z.string().min(1, { message: "Ticker being analyzed must be provided."}), // Make ticker mandatory
});

export interface AiAnalysisResultState {
  analysis?: AnalyzeStockDataOutput;
  analysisUsageReport?: UsageReport;
  error?: string;
  timestamp?: number;
  tickerAnalyzed?: string; // Ticker this specific analysis result pertains to
}


export async function performAiAnalysisAction(
  prevState: AiAnalysisResultState,
  formData: FormData
): Promise<AiAnalysisResultState> {
  const stockJsonString = formData.get('stockJsonString') as string | null;
  const ticker = formData.get('ticker') as string | null;

  console.log(`[ACTION:PerformAiAnalysisAction] Analyzing for ticker: "${ticker || 'N/A'}". StockJsonString (length): ${stockJsonString?.length || 0}`);

  const currentActionInitialState: AiAnalysisResultState = {
    analysis: undefined,
    analysisUsageReport: undefined,
    error: undefined,
    timestamp: Date.now(),
    tickerAnalyzed: ticker || undefined,
  };

  const validatedFields = AiAnalysisInputSchema.safeParse({
    stockJsonString: stockJsonString,
    ticker: ticker,
  });

  if (!validatedFields.success || !validatedFields.data.stockJsonString || !validatedFields.data.ticker) {
    const errorMsg = `Invalid input for AI analysis: Stock JSON string or ticker is missing/invalid for "${ticker || 'unknown ticker'}".`;
    console.warn(`[ACTION:PerformAiAnalysisAction] ${errorMsg}`, validatedFields.error?.flatten().fieldErrors);
    return {
      ...currentActionInitialState,
      error: errorMsg,
      tickerAnalyzed: ticker || undefined, // Still record which ticker it attempted
    };
  }
  // Use validated ticker from here
  const validatedTicker = validatedFields.data.ticker;
  console.log(`[ACTION:PerformAiAnalysisAction] Input validation successful for ticker: "${validatedTicker}". stockJsonString length: ${validatedFields.data.stockJsonString.length}`);

  let analysisUsageReport: UsageReport | undefined;

  try {
    const analysisInput: AnalyzeStockDataInput = { stockData: validatedFields.data.stockJsonString };
    console.log(`[ACTION:PerformAiAnalysisAction] Calling analyzeStockData flow for "${validatedTicker}".`);
    const analysisFlowResult: AnalyzeStockDataFlowOutput = await analyzeStockData(analysisInput);
    console.log(`[ACTION:PerformAiAnalysisAction] AI analyzeStockData flow result for "${validatedTicker}": Analysis text (first 50 of priceAction): ${analysisFlowResult.analysis?.stockPriceAction.text.substring(0,50)}...`);

    analysisUsageReport = calculateUsageReport(
      `analyzeStockDataFlow (Ticker: ${validatedTicker})`,
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
      const errorMsg = `AI analysis for "${validatedTicker}" did not return all required takeaways with valid text/sentiment.`;
      console.error("[ACTION:PerformAiAnalysisAction] " + errorMsg + " Output:", analysisFlowResult.analysis);
      return {
        ...currentActionInitialState,
        tickerAnalyzed: validatedTicker,
        error: errorMsg,
        analysisUsageReport,
      };
    }

    const finalState: AiAnalysisResultState = {
      analysis: analysisFlowResult.analysis,
      analysisUsageReport,
      timestamp: Date.now(), // Fresh timestamp for this successful analysis
      tickerAnalyzed: validatedTicker,
      error: undefined,
    };
    console.log(`[ACTION:PerformAiAnalysisAction] For "${validatedTicker}", returning successful analysis state.`);
    return finalState;

  } catch (e: any) {
    console.error(`[ACTION:PerformAiAnalysisAction] Unexpected error for "${validatedTicker}":`, e);
    let displayError = `Failed to perform AI analysis for "${validatedTicker}".`;
    if (e.message) {
        displayError += ` ${e.message}`;
    } else {
        displayError += " An unexpected error occurred during AI analysis.";
    }
    return {
      ...currentActionInitialState,
      tickerAnalyzed: validatedTicker,
      error: displayError,
      analysisUsageReport,
    };
  }
}
