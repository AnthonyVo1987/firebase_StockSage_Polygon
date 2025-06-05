
/**
 * @fileOverview Central service for fetching stock data from various configured sources.
 * This service acts as a router to the appropriate data source adapter.
 */
'use server';

import type { AdapterOutput, DataSourceId } from './types'; // GranularTaConfigType removed
import { PolygonAdapter } from './adapters/polygon-adapter';
import { EMPTY_STOCK_DATA_JSON } from './types';


// Store instances of adapters to reuse them
const adapters = {
  polygon: new PolygonAdapter(),
};

/**
 * Fetches stock data (market status, quote, TA) from the specified data source.
 * For v1.2.9, TA indicators and API delay are not configurable through this function.
 *
 * @param ticker The stock ticker symbol.
 * @param dataSourceId The identifier for the data source (e.g., "polygon-api").
 * @returns A Promise resolving to an AdapterOutput object.
 */
export async function fetchStockDataFromSource(
  ticker: string,
  dataSourceId: DataSourceId
  // selectedIndicatorsConfig and apiCallDelay removed for v1.2.9
): Promise<AdapterOutput> {
  console.log(`[SERVICE:DataSourceRouter] Request received. Ticker: ${ticker}, SourceID: ${dataSourceId}`);

  try {
    switch (dataSourceId) {
      case 'polygon-api':
        console.log(`[SERVICE:DataSourceRouter] SourceID is 'polygon-api'. Routing to PolygonAdapter.`);
        return await adapters.polygon.getFullStockData(ticker); // No TA config or API delay passed
      default:
        const unknownSourceErrorMsg = `Invalid or unsupported API data source ID: ${dataSourceId}`;
        console.error(`[SERVICE:DataSourceRouter] ${unknownSourceErrorMsg}`);
        return {
          stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
          error: unknownSourceErrorMsg,
        };
    }
  } catch (e: any) {
    const criticalErrorMsg = `Critical error in data source router for ${ticker} (${dataSourceId}): ${e.message || 'Unknown error'}`;
    console.error(`[SERVICE:DataSourceRouter] ${criticalErrorMsg}`, e);
    return {
      stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
      error: criticalErrorMsg,
    };
  }
}
