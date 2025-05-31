
/**
 * @fileOverview Central service for fetching stock data from various configured sources.
 * This service acts as a router to the appropriate data source adapter.
 */
'use server';

import type { AdapterOutput, DataSourceId, AnalysisMode } from './types'; // Updated import
import { PolygonAdapter } from './adapters/polygon-adapter';
import { MockAdapter } from './adapters/mock-adapter';
import { AISearchAdapter } from './adapters/ai-search-adapter';
import { EMPTY_STOCK_DATA_JSON } from './types';


// Store instances of adapters to reuse them
const adapters = {
  polygon: new PolygonAdapter(),
  mock: new MockAdapter(),
  aiSearch: new AISearchAdapter(),
};

/**
 * Fetches stock data (market status, quote, TA) from the specified data source and mode.
 *
 * @param ticker The stock ticker symbol.
 * @param dataSourceId The identifier for the data source (e.g., "polygon-api", "ai-gemini...").
 * @param mode The analysis mode ("live" or "mock").
 * @returns A Promise resolving to an AdapterOutput object.
 */
export async function fetchStockDataFromSource(
  ticker: string,
  dataSourceId: DataSourceId,
  mode: AnalysisMode
): Promise<AdapterOutput> {
  console.log(`[SERVICE:DataSourceRouter] Request received. Ticker: ${ticker}, SourceID: ${dataSourceId}, Mode: ${mode}`);

  try {
    if (mode === 'mock') {
      console.log(`[SERVICE:DataSourceRouter] Mode is 'mock'. Routing to MockAdapter.`);
      return await adapters.mock.getFullStockData(ticker);
    }

    // Live mode routing
    switch (dataSourceId) {
      case 'polygon-api':
        console.log(`[SERVICE:DataSourceRouter] Mode is 'live', SourceID is 'polygon-api'. Routing to PolygonAdapter.`);
        return await adapters.polygon.getFullStockData(ticker);
      case 'ai-gemini-2.5-flash-preview-05-20':
        console.log(`[SERVICE:DataSourceRouter] Mode is 'live', SourceID is 'ai-gemini...'. Routing to AISearchAdapter.`);
        return await adapters.aiSearch.getFullStockData(ticker);
      default:
        // This case should ideally not be reached if dataSourceId is strictly typed and validated upstream.
        const unknownSourceErrorMsg = `Invalid or unsupported data source ID: ${dataSourceId}`;
        console.error(`[SERVICE:DataSourceRouter] ${unknownSourceErrorMsg}`);
        return {
          stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
          error: unknownSourceErrorMsg,
        };
    }
  } catch (e: any) {
    const criticalErrorMsg = `Critical error in data source router for ${ticker} (${dataSourceId}/${mode}): ${e.message || 'Unknown error'}`;
    console.error(`[SERVICE:DataSourceRouter] ${criticalErrorMsg}`, e);
    return {
      stockDataJson: { ...EMPTY_STOCK_DATA_JSON }, // Return an error structure
      error: criticalErrorMsg,
    };
  }
}
