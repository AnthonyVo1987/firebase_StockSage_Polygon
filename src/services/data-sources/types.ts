/**
 * @fileOverview Defines common interfaces and types for data source adapters.
 */

import type { StockDataJson as SharedStockDataJson, MarketStatusData as SharedMarketStatusData, StockQuoteDataSchema as SharedStockQuoteData, TechnicalAnalysisDataSchema as SharedTechnicalAnalysisData, IndicatorValue as SharedIndicatorValue } from '@/ai/schemas/stock-fetch-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';

// Allowed data source identifiers, should match the values from the UI select component.
export const ALLOWED_DATA_SOURCE_IDS = ["polygon-api", "ai-gemini-2.5-flash-preview-05-20"] as const;
export type DataSourceId = typeof ALLOWED_DATA_SOURCE_IDS[number];
export type AnalysisMode = 'live' | 'mock';


// Re-exporting existing detailed types for clarity within this module if needed,
// or they can be directly imported from @/ai/schemas/stock-fetch-schemas.
export type { StockDataJson, MarketStatusData, SharedStockQuoteData as StockQuoteData, SharedTechnicalAnalysisData as TechnicalAnalysisData, SharedIndicatorValue as IndicatorValue };


/**
 * A default empty/error state for StockDataJson.
 * Ensures conformance with StockDataJsonSchema, especially the now-mandatory marketStatus.
 */
export const EMPTY_STOCK_DATA_JSON: StockDataJson = {
  marketStatus: { 
    market: "unknown", // Default to unknown or closed
    serverTime: new Date(0).toISOString(), // Epoch time as a placeholder for "unknown"
    exchanges: {
        nyse: "unknown",
        nasdaq: "unknown",
        otc: "unknown"
    },
    currencies: {
        fx: "unknown",
        crypto: "unknown"
    }
  },
  stockQuote: undefined,
  technicalAnalysis: undefined,
};


/**
 * Represents the output from a data source adapter's getFullStockData method.
 */
export interface AdapterOutput {
  stockDataJson: StockDataJson;
  usageReport?: UsageReport; // Optional: only for AI-based adapters
  error?: string;
}

/**
 * Interface for all data source adapters.
 * Each adapter is responsible for fetching the complete stock data
 * (market status, quote, and technical analysis) according to its specific source.
 */
export interface IDataSourceAdapter {
  /**
   * Fetches comprehensive stock data including market status, quote, and technical analysis.
   * @param ticker The stock ticker symbol.
   * @returns A Promise resolving to an AdapterOutput object.
   *          The stockDataJson should conform to the StockDataJson schema.
   *          It MUST always include marketStatus.
   */
  getFullStockData(ticker: string): Promise<AdapterOutput>;
}
