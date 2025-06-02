/**
 * @fileOverview Zod schemas and TypeScript types for fetching stock data,
 * including quote and technical analysis indicators.
 */
import { z } from 'genkit';

export const DISABLED_BY_CONFIG_TEXT = "disabled_by_config";

// Schema for market status
export const MarketStatusDataSchema = z.object({
  market: z.enum(["extended-hours", "regular", "closed", "unknown"]).describe("Overall market status (e.g., 'regular', 'closed', 'unknown')."),
  serverTime: z.string().datetime().describe("The current server time in ISO format."),
  exchanges: z.object({
    nyse: z.string().optional().describe("Status of the NYSE exchange."),
    nasdaq: z.string().optional().describe("Status of the NASDAQ exchange."),
    otc: z.string().optional().describe("Status of the OTC exchange."),
  }).optional().describe("Status of major exchanges."), // Optional for AI simplicity if some exchanges are unknown
  currencies: z.object({
    fx: z.string().optional().describe("Status of the FX market."),
    crypto: z.string().optional().describe("Status of the Crypto market."),
  }).optional().describe("Status of currency markets."),
}).describe("Current market status information.");
export type MarketStatusData = z.infer<typeof MarketStatusDataSchema>;


// Schema for the basic stock quote part
export const StockQuoteDataSchema = z.object({
  ticker: z.string().describe("The input ticker, uppercased"),
  price: z.number().nullable().describe("Current stock price (or previous day's close)"),
  change: z.number().nullable().describe("Price change from open (or previous day's open to close)"),
  percent_change: z.string().nullable().describe("Percentage change, e.g., '1.23%'"),
  day_low: z.number().nullable().describe("Lowest price of the day (or previous day)"),
  day_high: z.number().nullable().describe("Highest price of the day (or previous day)"),
  timestamp: z.string().datetime().describe("ISO date string of when the data was fetched/generated")
}).describe("Essential stock quote data.");

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
}).describe("Technical Analysis indicators.");
export type TechnicalAnalysisData = z.infer<typeof TechnicalAnalysisDataSchema>;

// Schema for Ticker Snapshot Day Data
export const TickerSnapshotDayDataSchema = z.object({
  o: z.number().nullable().describe("Open price for the day"),
  h: z.number().nullable().describe("Highest price for the day"),
  l: z.number().nullable().describe("Lowest price for the day"),
  c: z.number().nullable().describe("Close price for the day"),
  v: z.number().nullable().describe("Trading volume for the day"),
  vw: z.number().nullable().describe("Volume Weighted Average Price for the day"),
}).describe("Current trading day's aggregate data.");
export type TickerSnapshotDayData = z.infer<typeof TickerSnapshotDayDataSchema>;

// Schema for Ticker Snapshot Min Data
export const TickerSnapshotMinDataSchema = z.object({
  av: z.number().nullable().describe("Accumulated volume for the minute aggregate"),
  t: z.number().nullable().describe("Timestamp of the minute aggregate"),
  n: z.number().nullable().describe("Number of trades in the minute aggregate"),
  o: z.number().nullable().describe("Open price for the minute aggregate"),
  h: z.number().nullable().describe("Highest price for the minute aggregate"),
  l: z.number().nullable().describe("Lowest price for the minute aggregate"),
  c: z.number().nullable().describe("Close price for the minute aggregate"),
  v: z.number().nullable().describe("Trading volume for the minute aggregate"),
  vw: z.number().nullable().describe("Volume Weighted Average Price for the minute aggregate"),
}).describe("Last minute's aggregate data.");
export type TickerSnapshotMinData = z.infer<typeof TickerSnapshotMinDataSchema>;

// Schema for Ticker Snapshot Previous Day Data
export const TickerSnapshotPrevDayDataSchema = z.object({
  o: z.number().nullable().describe("Open price for the previous day"),
  h: z.number().nullable().describe("Highest price for the previous day"),
  l: z.number().nullable().describe("Lowest price for the previous day"),
  c: z.number().nullable().describe("Close price for the previous day"),
  v: z.number().nullable().describe("Trading volume for the previous day"),
  vw: z.number().nullable().describe("Volume Weighted Average Price for the previous day"),
}).describe("Previous trading day's aggregate data.");
export type TickerSnapshotPrevDayData = z.infer<typeof TickerSnapshotPrevDayDataSchema>;

// Schema for Ticker Snapshot Data
export const TickerSnapshotDataSchema = z.object({
  ticker: z.string().describe("Ticker symbol for the snapshot"),
  todaysChangePerc: z.number().nullable().describe("Today's percentage change"),
  todaysChange: z.number().nullable().describe("Today's price change"),
  updated: z.number().nullable().describe("Timestamp of the last update (Unix ms or ns)"),
  day: TickerSnapshotDayDataSchema.nullable().describe("Current trading day's aggregate data"),
  min: TickerSnapshotMinDataSchema.nullable().describe("Last minute's aggregate data"),
  prevDay: TickerSnapshotPrevDayDataSchema.nullable().describe("Previous trading day's aggregate data"),
}).describe("Ticker snapshot data including current day, minute, and previous day aggregates.");
export type TickerSnapshotData = z.infer<typeof TickerSnapshotDataSchema>;

// Main schema for the combined stock data (market status + quote + TA)
export const StockDataJsonSchema = z.object({
  marketStatus: MarketStatusDataSchema.describe("Current overall market status. This field is MANDATORY."), // No longer optional
  stockQuote: StockQuoteDataSchema.optional(), // Optional because market status might fail before we get this, or AI might not find it
  technicalAnalysis: TechnicalAnalysisDataSchema.optional(), // TA might not always be available or fetched
  tickerSnapshot: TickerSnapshotDataSchema.optional().describe("Ticker snapshot data including current day, minute, and previous day aggregates."),
}).describe("Combined market status, stock quote, technical analysis data, and ticker snapshot data.");
export type StockDataJson = z.infer<typeof StockDataJsonSchema>;


export const FetchStockDataInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol, e.g., AAPL.'),
  forceMock: z.boolean().optional().describe('If true, forces the AI to generate mock data instead of attempting to fetch live data.'),
});
export type FetchStockDataInput = z.infer<typeof FetchStockDataInputSchema>;

// The output from the AI model (just the JSON string conforming to StockDataJsonSchema)
export const FetchStockDataOutputSchema = z.object({
  stockJson: z.string().describe('A JSON string containing the combined market status, stock quote, and technical analysis data, conforming to the defined StockDataJsonSchema structure. The "marketStatus" field is MANDATORY within this JSON string.'),
});
export type FetchStockDataOutput = z.infer<typeof FetchStockDataOutputSchema>;

// Schema for the full output of the fetchStockDataFlow, including usage
export const FetchStockDataFlowOutputSchema = z.object({
  data: FetchStockDataOutputSchema.optional(), // Optional because flow might fail
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
  error: z.string().optional(), // Add error field for flow failures
});
export type FetchStockDataFlowOutput = z.infer<typeof FetchStockDataFlowOutputSchema>;
