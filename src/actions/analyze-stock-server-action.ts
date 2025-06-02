
'use server';

import { fetchStockDataFromSource } from '@/services/data-sources';
import type { DataSourceId, AnalysisMode } from '@/services/data-sources/types';
import { ALLOWED_DATA_SOURCE_IDS } from '@/services/data-sources/types';
import type { AdapterOutput } from '@/services/data-sources/types';
// AnalyzeStockDataOutput and UsageReport are not directly used in this action's return type anymore.
// import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
// import type { UsageReport } from '@/ai/schemas/common-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas'; // Still needed for fetchUsageReport
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

// This status is now more granular to reflect the two-stage process.
// 'data_fetching' and 'analyzing_data' are transient states set by the client before calling actions.
export type AnalysisStatus = 'idle' | 'data_fetching' | 'data_fetched_analysis_pending' | 'analyzing_data' | 'analysis_complete' | 'error_fetching_data' | 'error_analyzing_data';

// Type definition for the state THIS action (fetchStockDataAction) returns.
// It no longer includes 'analysis' or 'analysisUsageReport'.
export interface StockDataFetchState {
  stockJson?: string;
  error?: string;
  fieldErrors?: {
    ticker?: string[] | undefined;
    dataSource?: string[] | undefined;
    analysisMode?: string[] | undefined;
  };
  timestamp?: number; // Timestamp of this data fetch result
  fetchUsageReport?: UsageReport;
  analysisStatus: AnalysisStatus; // Critical: 'data_fetched_analysis_pending' or 'error_fetching_data' or 'data_fetching'
  tickerUsed?: string;
  dataSourceUsed?: DataSourceId;
  analysisModeUsed?: AnalysisMode;
}


export async function fetchStockDataAction(
  // prevState is the state from the *previous* execution of THIS action.
  prevState: StockDataFetchState,
  formData: FormData
): Promise<StockDataFetchState> {
  const rawTicker = formData.get('ticker') as string | null;
  const tickerToUse = rawTicker?.trim().toUpperCase() || "NVDA"; // Ensure uppercase for consistency
  const dataSourceFromForm = formData.get('dataSource') as string | null;
  const analysisModeFromForm = formData.get('analysisMode') as 'live' | 'mock' | null;

  console.log(`[ACTION:FetchStockDataAction] Processing for ticker: "${tickerToUse}", DataSource: ${dataSourceFromForm}, Mode: ${analysisModeFromForm}. Prev action timestamp: ${prevState?.timestamp}`);

  // This state is specific to the current invocation of fetchStockDataAction
  const currentActionRunState: StockDataFetchState = {
    stockJson: undefined,
    error: undefined,
    fieldErrors: undefined,
    timestamp: Date.now(),
    fetchUsageReport: undefined,
    analysisStatus: 'data_fetching', // Initial status for this run
    tickerUsed: tickerToUse,
    dataSourceUsed: dataSourceFromForm as DataSourceId,
    analysisModeUsed: analysisModeFromForm as AnalysisMode,
  };

  const validatedFields = ActionInputSchema.safeParse({
    ticker: tickerToUse,
    dataSource: dataSourceFromForm,
    analysisMode: analysisModeFromForm,
  });

  if (!validatedFields.success) {
    console.warn(`[ACTION:FetchStockDataAction] Input validation failed for "${tickerToUse}":`, validatedFields.error.flatten().fieldErrors);
    return {
      ...currentActionRunState,
      error: `Invalid input for ${tickerToUse}. Please check ticker, data source, and analysis mode.`,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      analysisStatus: 'error_fetching_data',
    };
  }
  console.log(`[ACTION:FetchStockDataAction] Input validation successful for "${tickerToUse}":`, validatedFields.data);

  const { ticker, dataSource, analysisMode } = validatedFields.data; // 'ticker' here is validated 'tickerToUse'
  let fetchUsageReport: UsageReport | undefined;

  try {
    console.log(`[ACTION:FetchStockDataAction] Calling fetchStockDataFromSource service for "${ticker}", Source: ${dataSource}, Mode: ${analysisMode}`);
    const adapterOutput: AdapterOutput = await fetchStockDataFromSource(
      ticker,
      dataSource as DataSourceId,
      analysisMode as AnalysisMode
    );

    fetchUsageReport = adapterOutput.usageReport;

    if (adapterOutput.error || !adapterOutput.stockDataJson) {
      const errorMsg = adapterOutput.error || `Failed to retrieve/generate stock data for "${ticker}" (Source: ${dataSource}, Mode: ${analysisMode}).`;
      console.error(`[ACTION:FetchStockDataAction] Error from fetchStockDataFromSource for "${ticker}": ${errorMsg}`);
      return {
        ...currentActionRunState,
        tickerUsed: ticker, // ensure tickerUsed is from validated data
        dataSourceUsed: dataSource,
        analysisModeUsed: analysisMode,
        error: errorMsg,
        fetchUsageReport,
        analysisStatus: 'error_fetching_data',
      };
    }

    if (!adapterOutput.stockDataJson.marketStatus) {
        const errorMsg = `Data for "${ticker}" from ${dataSource} is missing critical marketStatus. Analysis cannot proceed.`;
        console.warn(`[ACTION:FetchStockDataAction] ${errorMsg}`);
        return {
            ...currentActionRunState,
            tickerUsed: ticker,
            dataSourceUsed: dataSource,
            analysisModeUsed: analysisMode,
            error: errorMsg,
            fetchUsageReport,
            analysisStatus: 'error_fetching_data',
        };
    }

    let stockJsonStringForDisplay: string;
    try {
        stockJsonStringForDisplay = JSON.stringify(adapterOutput.stockDataJson, null, 2);
         console.log(`[ACTION:FetchStockDataAction] Successfully stringified stockDataJson for "${ticker}". Length: ${stockJsonStringForDisplay.length}`);
    } catch (e: any) {
        const errorMsg = `Internal error processing fetched stock data for "${ticker}": ${e.message}`;
        console.error(`[ACTION:FetchStockDataAction] ${errorMsg}`, adapterOutput.stockDataJson);
        return {
            ...currentActionRunState,
            tickerUsed: ticker,
            dataSourceUsed: dataSource,
            analysisModeUsed: analysisMode,
            error: errorMsg,
            fetchUsageReport,
            analysisStatus: 'error_fetching_data',
        };
    }
    console.log(`[ACTION:FetchStockDataAction] For "${ticker}", received stockDataJson (first 200 chars): ${stockJsonStringForDisplay.substring(0,200)}...`);

    // Successful data fetch, AI analysis is now pending
    const successState: StockDataFetchState = {
      ...currentActionRunState,
      tickerUsed: ticker, // Ensure tickerUsed reflects the successfully fetched ticker
      dataSourceUsed: dataSource,
      analysisModeUsed: analysisMode,
      stockJson: stockJsonStringForDisplay,
      fetchUsageReport,
      analysisStatus: 'data_fetched_analysis_pending',
    };
    console.log(`[ACTION:FetchStockDataAction] For "${ticker}", returning successful data fetch state. AI Analysis pending.`);
    return successState;

  } catch (e: any) {
    console.error(`[ACTION:FetchStockDataAction] Unexpected error in fetchStockDataAction for "${ticker}":`, e);
    let displayError = `Failed to process stock '${ticker}'.`;
    if (e.message) {
        displayError += ` ${e.message}`;
    } else {
        displayError += " An unexpected error occurred during data fetching.";
    }
    return {
        ...currentActionRunState,
        tickerUsed: ticker, // Ensure tickerUsed is set even on unexpected error
        dataSourceUsed: dataSourceFromForm as DataSourceId, // Use initially parsed if validated data not available
        analysisModeUsed: analysisModeFromForm as AnalysisMode,
        error: displayError,
        fetchUsageReport, // May or may not exist
        analysisStatus: 'error_fetching_data',
    };
  }
}
