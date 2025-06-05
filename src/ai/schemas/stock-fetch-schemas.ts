
/**
 * @fileOverview Zod schemas and TypeScript types for fetching stock data,
 * including quote and technical analysis indicators.
 * Schemas related to the AI-driven fetchStockData flow have been removed.
 */
import { z } from 'genkit';

export const DISABLED_BY_CONFIG_TEXT = "disabled_by_config";

// Schema for market status
export const MarketStatusDataSchema = z.object({
  market: z.enum(["extended-hours", "regular", "closed", "unknown"]).describe("Overall market status (e.g., 'regular', 'closed', 'unknown')."),
  serverTime: z.string().describe("The current server time in Pacific Time (hh:mm:ss AM/PM format)."),
  exchanges: z.object({
    nyse: z.string().optional().describe("Status of the NYSE exchange."),
    nasdaq: z.string().optional().describe("Status of the NASDAQ exchange."),
    otc: z.string().optional().describe("Status of the OTC exchange."),
  }).optional().describe("Status of major exchanges."),
  currencies: z.object({
    fx: z.string().optional().describe("Status of the FX market."),
    crypto: z.string().optional().describe("Status of the Crypto market."),
  }).optional().describe("Status of currency markets."),
}).describe("Current market status information.");
export type MarketStatusData = z.infer<typeof MarketStatusDataSchema>;


// Schema for Ticker Snapshot Data
export const StockSnapshotDataSchema = z.object({
  ticker: z.string().describe("The stock ticker symbol."),
  todaysChangePerc: z.number().nullable().describe("Today's percentage change."),
  todaysChange: z.number().nullable().describe("Today's absolute change."),
  updated: z.string().describe("Timestamp of the last snapshot update (Pacific Time, hh:mm:ss AM/PM format)."),
  day: z.object({
    o: z.number().nullable().describe("Current day's open price."),
    h: z.number().nullable().describe("Current day's high price."),
    l: z.number().nullable().describe("Current day's low price."),
    c: z.number().nullable().describe("Current day's close price (or last price if market is open)."),
    v: z.number().nullable().describe("Current day's volume."),
    vw: z.number().nullable().describe("Current day's Volume Weighted Average Price.")
  }).nullable().describe("Current trading day's aggregate data."),
  min: z.object({
    o: z.number().nullable().describe("Last minute's open price."),
    h: z.number().nullable().describe("Last minute's high price."),
    l: z.number().nullable().describe("Last minute's low price."),
    c: z.number().nullable().describe("Last minute's close price."),
    v: z.number().nullable().describe("Last minute's volume."),
    vw: z.number().nullable().describe("Last minute's Volume Weighted Average Price.")
  }).nullable().describe("Last minute's aggregate data."),
  prevDay: z.object({
    o: z.number().nullable().describe("Previous trading day's open price from snapshot."),
    h: z.number().nullable().describe("Previous trading day's high price from snapshot."),
    l: z.number().nullable().describe("Previous trading day's low price from snapshot."),
    c: z.number().nullable().describe("Previous trading day's close price from snapshot."),
    v: z.number().nullable().describe("Previous trading day's volume from snapshot."),
    vw: z.number().nullable().describe("Previous trading day's VWAP from snapshot.")
  }).nullable().describe("Previous trading day's data from snapshot.")
}).describe("Current day snapshot data for the stock, including intraday OHLCV, VWAP, and previous day's aggregates.");
export type StockSnapshotData = z.infer<typeof StockSnapshotDataSchema>;


// Helper type for indicator values that can be number, null, or "disabled_by_config"
export const IndicatorValueSchema = z.union([z.number(), z.literal(DISABLED_BY_CONFIG_TEXT)]).nullable();
export type IndicatorValue = z.infer<typeof IndicatorValueSchema>;


// Schema for Technical Analysis indicators
export const TechnicalAnalysisDataSchema = z.object({
  rsi: z.object({
    '7': IndicatorValueSchema.describe("7-period Relative Strength Index"),
    '10': IndicatorValueSchema.describe("10-period Relative Strength Index"),
    '14': IndicatorValueSchema.describe("14-period Relative Strength Index"),
  }).optional().describe("Relative Strength Index (RSI) values for different periods."),
  ema: z.object({
    '5': IndicatorValueSchema.describe("5-period Exponential Moving Average"),
    '10': IndicatorValueSchema.describe("10-period Exponential Moving Average"),
    '20': IndicatorValueSchema.describe("20-period Exponential Moving Average"),
    '50': IndicatorValueSchema.describe("50-period Exponential Moving Average"),
    '200': IndicatorValueSchema.describe("200-period Exponential Moving Average"),
  }).optional().describe("Exponential Moving Average (EMA) values for different periods."),
  sma: z.object({
    '5': IndicatorValueSchema.describe("5-period Simple Moving Average"),
    '10': IndicatorValueSchema.describe("10-period Simple Moving Average"),
    '20': IndicatorValueSchema.describe("20-period Simple Moving Average"),
    '50': IndicatorValueSchema.describe("50-period Simple Moving Average"),
    '200': IndicatorValueSchema.describe("200-period Simple Moving Average"),
  }).optional().describe("Simple Moving Average (SMA) values for different periods."),
  macd: z.object({
    value: IndicatorValueSchema.describe("MACD line value"),
    signal: IndicatorValueSchema.describe("Signal line value"),
    histogram: IndicatorValueSchema.describe("MACD histogram value (MACD - Signal)"),
  }).optional().describe("Moving Average Convergence Divergence (MACD) values."),
  vwap: z.object({ 
    day: IndicatorValueSchema.describe("VWAP from current day's snapshot data (stockSnapshot.day.vw)"),
    minute: IndicatorValueSchema.describe("VWAP from last minute's snapshot data (stockSnapshot.min.vw)")
  }).optional().describe("Volume Weighted Average Price data from snapshot.")
}).describe("Technical Analysis indicators.");
export type TechnicalAnalysisData = z.infer<typeof TechnicalAnalysisDataSchema>;


// Main schema for the combined stock data
export const StockDataJsonSchema = z.object({
  marketStatus: MarketStatusDataSchema.describe("Current overall market status. This field is MANDATORY."),
  stockSnapshot: StockSnapshotDataSchema.optional().describe("Current day snapshot data, including previous day's aggregates. This field is primary for current and previous day OHLCV."),
  technicalAnalysis: TechnicalAnalysisDataSchema.optional(),
}).describe("Combined market status, current snapshot (including previous day data), and technical analysis data.");
export type StockDataJson = z.infer<typeof StockDataJsonSchema>;
