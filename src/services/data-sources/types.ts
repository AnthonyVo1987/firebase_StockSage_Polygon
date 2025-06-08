
/**
 * @fileOverview Defines common interfaces and types for data source adapters.
 */

import type { StockDataJson as SharedStockDataJsonBase, MarketStatusData as SharedMarketStatusData, StockSnapshotDataSchema as SharedStockSnapshotData, TechnicalAnalysisDataSchema as SharedTechnicalAnalysisData, IndicatorValue as SharedIndicatorValue } from '@/ai/schemas/stock-fetch-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { formatTimestampToPacificTime } from '@/lib/date-utils';

export const ALLOWED_DATA_SOURCE_IDS = ["polygon-api"] as const;
export type DataSourceId = typeof ALLOWED_DATA_SOURCE_IDS[number];

export type { MarketStatusData, SharedStockSnapshotData as StockSnapshotData, SharedTechnicalAnalysisData as TechnicalAnalysisData, SharedIndicatorValue as IndicatorValue };

// --- Options Chain Types ---
export interface OptionContractDetails {
  // ticker: string; // REMOVED - Redundant, can be derived or often not needed for analysis display
  contract_type: 'call' | 'put';
  // exercise_style: 'american' | 'european' | 'bermudan'; // REMOVED - Generally 'american' for US equities, less critical for display
  // expiration_date: string; // REMOVED - Present in OptionsChainData.target_expiration_date
  strike_price: number; // KEPT - Essential
  day: { // From snapshot
    close?: number;
    high?: number;
    low?: number;
    open?: number;
    volume?: number;
    vwap?: number;
  };
  details?: { // From snapshot details
    // break_even_price?: number; // REMOVED - was mapped from top-level snapshot, not heavily used in UI
    implied_volatility?: number;
    open_interest?: number;
    // Greeks
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
  // last_quote?: { // REMOVED - Often empty, adds verbosity
  //   ask?: number;
  //   ask_size?: number;
  //   bid?: number;
  //   bid_size?: number;
  //   midpoint?: number;
  //   last_updated?: string; 
  // };
  // underlying_asset?: { // REMOVED - Redundant, underlying_ticker is at OptionsChainData level
  //   price?: number; 
  //   ticker?: string;
  //   last_updated?: string; 
  // };
}

export interface StrikeWithOptions {
  strike_price: number;
  call?: OptionContractDetails;
  put?: OptionContractDetails;
}

export interface OptionsChainData {
  underlying_ticker: string;
  target_expiration_date: string; // The YYYY-MM-DD expiration date used for this chain
  selected_strikes_data: StrikeWithOptions[];
  fetched_at: string; // Pacific Time formatted timestamp of when this data was fetched
  message?: string; // Optional message, e.g., "No options found for target strikes/expiration"
}
// --- End Options Chain Types ---


// Extend StockDataJson to include optionsChain
export interface StockDataJson extends SharedStockDataJsonBase {
  optionsChain?: OptionsChainData;
}


export const EMPTY_STOCK_DATA_JSON: StockDataJson = {
  marketStatus: {
    market: "unknown",
    serverTime: formatTimestampToPacificTime(new Date(0).toISOString()),
    exchanges: {
        nyse: "unknown",
        nasdaq: "unknown",
        otc: "unknown"
    },
  },
  stockSnapshot: undefined,
  technicalAnalysis: {
    rsi: { '7': null, '10': null, '14': null },
    ema: { '5': null, '10': null, '20': null, '50': null, '200': null },
    sma: { '5': null, '10': null, '20': null, '50': null, '200': null },
    macd: { value: null, signal: null, histogram: null },
    vwap: { day: null, minute: null }
  },
  optionsChain: undefined, // Initialize new field
};


export interface AdapterOutput {
  stockDataJson: StockDataJson;
  usageReport?: UsageReport;
  error?: string;
}

export interface IDataSourceAdapter {
  getFullStockData(
    ticker: string
  ): Promise<AdapterOutput>;
}
