
'use server';

import { fetchStockDataFromSource } from '@/services/data-sources';
import type { DataSourceId } from '@/services/data-sources/types';
import { ALLOWED_DATA_SOURCE_IDS } from '@/services/data-sources/types';
import type { AdapterOutput } from '@/services/data-sources/types';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { z } from 'zod';

const ActionInputSchema = z.object({
  ticker: z.string()
    .min(1, { message: "Ticker symbol cannot be empty." })
    .max(10, { message: "Ticker symbol is too long (max 10 chars)." })
    .regex(/^[a-zA-Z0-9.-]+$/, { message: "Ticker can only contain letters, numbers, dots, and hyphens."}),
  dataSource: z.enum(ALLOWED_DATA_SOURCE_IDS, {
    errorMap: () => ({ message: "Invalid API data source selected." })
  }),
  analysisType: z.enum(['standard', 'fullDetail']).optional(),
});

export type AnalysisStatus = 'idle' | 'data_fetching' | 'data_fetched_analysis_pending' | 'analyzing_data' | 'analysis_complete' | 'error_fetching_data' | 'error_analyzing_data';

export interface StockDataFetchState {
  stockJson?: string;
  error?: string;
  fieldErrors?: {
    ticker?: string[] | undefined;
    dataSource?: string[] | undefined;
    analysisType?: string[] | undefined;
  };
  timestamp?: number;
  fetchUsageReport?: UsageReport;
  analysisStatus: AnalysisStatus;
  tickerUsed?: string;
  dataSourceUsed?: DataSourceId;
  initiateFullChatAnalysis?: boolean; // New field
}


export async function fetchStockDataAction(
  prevState: StockDataFetchState,
  formData: FormData
): Promise<StockDataFetchState> {
  const rawTicker = formData.get('ticker') as string | null;
  const tickerToUse = rawTicker?.trim().toUpperCase() || "NVDA";
  const dataSourceFromForm = formData.get('dataSource') as string | null;
  const analysisTypeFromForm = formData.get('analysisType') as string | null;

  console.log(`[ACTION:FetchStockDataAction] Processing for ticker: "${tickerToUse}", DataSource: ${dataSourceFromForm}, AnalysisType: ${analysisTypeFromForm}`);

  const currentActionRunState: StockDataFetchState = {
    stockJson: undefined,
    error: undefined,
    fieldErrors: undefined,
    timestamp: Date.now(),
    fetchUsageReport: undefined,
    analysisStatus: 'data_fetching',
    tickerUsed: tickerToUse,
    dataSourceUsed: dataSourceFromForm as DataSourceId,
    initiateFullChatAnalysis: analysisTypeFromForm === 'fullDetail',
  };

  const validatedFields = ActionInputSchema.safeParse({
    ticker: tickerToUse,
    dataSource: dataSourceFromForm,
    analysisType: analysisTypeFromForm || 'standard',
  });

  if (!validatedFields.success) {
    console.warn(`[ACTION:FetchStockDataAction] Input validation failed for "${tickerToUse}":`, validatedFields.error.flatten().fieldErrors);
    return {
      ...currentActionRunState,
      error: `Invalid input for ${tickerToUse}. Please check inputs.`,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      analysisStatus: 'error_fetching_data',
    };
  }
  console.log(`[ACTION:FetchStockDataAction] Input validation successful for "${tickerToUse}":`, validatedFields.data);

  const { ticker, dataSource } = validatedFields.data;
  
  let fetchUsageReport: UsageReport | undefined;

  try {
    console.log(`[ACTION:FetchStockDataAction] Calling fetchStockDataFromSource service for "${ticker}", Source: ${dataSource}`);
    const adapterOutput: AdapterOutput = await fetchStockDataFromSource(
      ticker,
      dataSource as DataSourceId
    );

    fetchUsageReport = adapterOutput.usageReport;

    if (adapterOutput.error || !adapterOutput.stockDataJson) {
      const errorMsg = adapterOutput.error || `Failed to retrieve/generate stock data for "${ticker}" (Source: ${dataSource}).`;
      console.error(`[ACTION:FetchStockDataAction] Error from fetchStockDataFromSource for "${ticker}": ${errorMsg}`);
      return {
        ...currentActionRunState,
        tickerUsed: ticker,
        dataSourceUsed: dataSource,
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
            error: errorMsg,
            fetchUsageReport,
            analysisStatus: 'error_fetching_data',
        };
    }
    console.log(`[ACTION:FetchStockDataAction] For "${ticker}", received stockDataJson (first 200 chars): ${stockJsonStringForDisplay.substring(0,200)}...`);

    const successState: StockDataFetchState = {
      ...currentActionRunState,
      tickerUsed: ticker,
      dataSourceUsed: dataSource,
      stockJson: stockJsonStringForDisplay,
      fetchUsageReport,
      analysisStatus: 'data_fetched_analysis_pending',
    };
    console.log(`[ACTION:FetchStockDataAction] For "${ticker}", returning successful data fetch state. AI Analysis pending. InitiateFullChatAnalysis: ${successState.initiateFullChatAnalysis}`);
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
        tickerUsed: ticker,
        dataSourceUsed: dataSourceFromForm as DataSourceId,
        error: displayError,
        fetchUsageReport,
        analysisStatus: 'error_fetching_data',
    };
  }
}
