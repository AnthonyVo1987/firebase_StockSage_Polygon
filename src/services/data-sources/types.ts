
/**
 * @fileOverview Defines common interfaces and types for data source adapters.
 */

import type { StockDataJson as SharedStockDataJson, MarketStatusData as SharedMarketStatusData, StockSnapshotDataSchema as SharedStockSnapshotData, TechnicalAnalysisDataSchema as SharedTechnicalAnalysisData, IndicatorValue as SharedIndicatorValue } from '@/ai/schemas/stock-fetch-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { DISABLED_BY_CONFIG_TEXT } from '@/ai/schemas/stock-fetch-schemas'; // Kept for consistency if some indicators truly become non-configurable at source
import { formatTimestampToPacificTime } from '@/lib/date-utils';

// Updated: Will only contain API-based sources. Initially just "polygon-api".
export const ALLOWED_DATA_SOURCE_IDS = ["polygon-api"] as const;
export type DataSourceId = typeof ALLOWED_DATA_SOURCE_IDS[number];


export type { StockDataJson, MarketStatusData, SharedStockSnapshotData as StockSnapshotData, SharedTechnicalAnalysisData as TechnicalAnalysisData, SharedIndicatorValue as IndicatorValue };


export const EMPTY_STOCK_DATA_JSON: StockDataJson = {
  marketStatus: {
    market: "unknown",
    serverTime: formatTimestampToPacificTime(new Date(0).toISOString()),
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
  stockSnapshot: undefined,
  // For v1.2.9, TA indicators are fetched by default, so their values would be numbers or null, not DISABLED_BY_CONFIG_TEXT.
  // However, keeping DISABLED_BY_CONFIG_TEXT if an indicator source might truly disable something.
  // For Polygon adapter in v1.2.9, it will attempt to fetch all, resulting in number or null.
  technicalAnalysis: {
    rsi: { '7': null, '10': null, '14': null },
    ema: { '5': null, '10': null, '20': null, '50': null, '200': null },
    sma: { '5': null, '10': null, '20': null, '50': null, '200': null },
    macd: { value: null, signal: null, histogram: null },
    vwap: { day: null, minute: null }
  },
};


export interface AdapterOutput {
  stockDataJson: StockDataJson;
  usageReport?: UsageReport;
  error?: string;
}

// GranularTaConfigType and DEFAULT_GRANULAR_TA_CONFIG removed for v1.2.9

export interface IDataSourceAdapter {
  getFullStockData(
    ticker: string
    // selectedIndicatorsConfig and apiCallDelay removed for v1.2.9
  ): Promise<AdapterOutput>;
}
