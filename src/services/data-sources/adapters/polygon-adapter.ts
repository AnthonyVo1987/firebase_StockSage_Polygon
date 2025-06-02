
/**
 * @fileOverview Adapter for fetching stock data from Polygon.io API.
 * Fetches:
 * 1. Current Market Status (as the first call).
 * 2. Previous day's close data (OHLCV).
 * 3. Technical Indicators: RSI, EMA, SMA, MACD.
 * Includes a debug configuration to selectively fetch indicators and format numbers to 2 decimal places.
 * Indicators not fetched due to config will be marked as "disabled_by_config".
 * API calls are made sequentially with a configurable delay.
 */

import {
  restClient,
  type IMarketStatus,
  type IAggsResults,
  type IAggV2,
  type ITSIndicatorResults,
  type IMACDIndicatorResults,
  type IIndicatorValue,
  type IMACDValue,
  type ISnapshot,
} from '@polygon.io/client-js';
import type { IDataSourceAdapter, AdapterOutput, StockDataJson } from '../types';
import type { MarketStatusData, StockQuoteData, TechnicalAnalysisData, IndicatorValue as MappedIndicatorValue, TickerSnapshotData, TickerSnapshotDayData, TickerSnapshotMinData, TickerSnapshotPrevDayData } from '../types'; // Use re-exported types
import { DISABLED_BY_CONFIG_TEXT } from '@/ai/schemas/stock-fetch-schemas';
import { EMPTY_STOCK_DATA_JSON } from '../types';


const API_CALL_DELAY_MS = 100; // Configurable delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_STOCK_QUOTE_NULL_VALUES_ADAPTER: StockQuoteData = {
  ticker: "",
  price: null,
  change: null,
  percent_change: null,
  day_low: null,
  day_high: null,
  timestamp: new Date().toISOString(),
};

const DEFAULT_TA_NULL_VALUES_ADAPTER: TechnicalAnalysisData = {
  rsi: {
    '7': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '10': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '14': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue
  },
  ema: {
    '5': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '10': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '20': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '50': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '200': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue
  },
  sma: {
    '5': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '10': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '20': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '50': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    '200': DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue
  },
  macd: {
    value: DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    signal: DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue,
    histogram: DISABLED_BY_CONFIG_TEXT as MappedIndicatorValue
  },
};

function formatNumber(value: number | null | undefined, precision: number = 2): number | null {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return null;
  }
  return parseFloat(numValue.toFixed(precision));
}

interface IndicatorWindowConfig {
  active: boolean;
  windowsToFetch: number[];
}

interface MACDConfig {
  active: boolean;
}

interface PolygonAdapterFetchConfig {
  marketStatus: { active: boolean };
  previousClose: { active: boolean };
  rsi: IndicatorWindowConfig;
  ema: IndicatorWindowConfig;
  sma: IndicatorWindowConfig;
  macd: MACDConfig;
}

const DEBUG_FETCH_CONFIG: PolygonAdapterFetchConfig = {
  marketStatus: { active: true },
  previousClose: { active: true },
  rsi: { active: true, windowsToFetch: [14] },
  ema: { active: true, windowsToFetch: [20] },
  sma: { active: true, windowsToFetch: [20] },
  macd: { active: true },
};

const PRODUCTION_FETCH_CONFIG: PolygonAdapterFetchConfig = { // Aligned with DEBUG as per previous request
  marketStatus: { active: true },
  previousClose: { active: true },
  rsi: { active: true, windowsToFetch: [14] },
  ema: { active: true, windowsToFetch: [20] },
  sma: { active: true, windowsToFetch: [20] },
  macd: { active: true },
};

const currentFetchConfig: PolygonAdapterFetchConfig = DEBUG_FETCH_CONFIG;

async function fetchMarketStatusFromPolygonAPI(rest: ReturnType<typeof restClient>): Promise<MarketStatusData> {
  console.log(`[ADAPTER:Polygon:MarketStatus:Attempt] Fetching current market status.`);
  try {
    const marketStatusResult: IMarketStatus = await rest.reference.marketStatus();
    if (!marketStatusResult || !marketStatusResult.market || !marketStatusResult.serverTime) {
        console.error(`[ADAPTER:Polygon:MarketStatus:Error] Market status API returned invalid data.`, marketStatusResult);
        throw new Error('Market status API returned invalid or incomplete data.');
    }
    return {
      market: marketStatusResult.market as MarketStatusData['market'],
      serverTime: marketStatusResult.serverTime,
      exchanges: {
        nyse: marketStatusResult.exchanges?.nyse,
        nasdaq: marketStatusResult.exchanges?.nasdaq,
        otc: marketStatusResult.exchanges?.otc,
      },
      currencies: marketStatusResult.currencies ? {
        fx: marketStatusResult.currencies.fx,
        crypto: marketStatusResult.currencies.crypto,
      } : undefined,
    };
  } catch (error: any) {
    let detail = 'Unknown error';
    if (error instanceof Error && error.message) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    } else if (error && typeof error === 'object') {
        if ('statusText' in error && 'status' in error) { // Check for properties common in HTTP client errors
            detail = `API request failed with status: ${error.statusText || 'N/A'} (Code: ${error.status || 'N/A'})`;
        } else if ('type' in error && error.type === 'AbortError') { // Handle AbortError specifically
            detail = 'The request to Polygon API timed out or was aborted.';
        } else {
            // Fallback to stringifying the error if it's an object but not a standard Error instance or known structure
            try {
                const errorString = JSON.stringify(error);
                // Avoid overly generic stringified objects like "{}"
                detail = errorString === '{}' ? 'Undescribed object error' : errorString;
            } catch {
                // If stringify fails, just keep 'Unknown error'
            }
        }
    }
    console.error(`[ADAPTER:Polygon:MarketStatus:Error] Error fetching market status. Detail: ${detail}. Full error object:`, error);
    throw new Error(`Failed to fetch market status: ${detail}`);
  }
}

async function fetchIndicatorValueFromPolygonAPI(
  indicatorFnName: 'rsi' | 'ema' | 'sma' | 'macd',
  indicatorFn: (ticker: string, query?: any) => Promise<ITSIndicatorResults | IMACDIndicatorResults>,
  ticker: string,
  query: any
): Promise<number | { value: number | null; signal: number | null; histogram: number | null } | null> {
  console.log(`[ADAPTER:Polygon:TA:Attempt] Fetching ${indicatorFnName.toUpperCase()} for ${ticker}. Window: ${query?.window || 'N/A'}.`);
  try {
    const result = await indicatorFn(ticker, query);
    if (result.results?.values && result.results.values.length > 0) {
      const latestValue = result.results.values[0];
      if (latestValue === undefined || latestValue === null) return null;
      if (indicatorFnName === 'macd') {
        const macdData = latestValue as IMACDValue;
        return {
          value: formatNumber(macdData.value),
          signal: formatNumber(macdData.signal),
          histogram: formatNumber(macdData.histogram),
        };
      } else {
        return formatNumber((latestValue as IIndicatorValue).value);
      }
    }
    return null;
  } catch (error: any) {
    console.error(`[ADAPTER:Polygon:TA:Error] Error fetching ${indicatorFnName.toUpperCase()} for ${ticker}:`, error.message);
    return null;
  }
}

export class PolygonAdapter implements IDataSourceAdapter {
  private rest: ReturnType<typeof restClient> | null = null;

  constructor() {
    console.log('[ADAPTER:Polygon] PolygonAdapter instantiated.');
    const apiKey = process.env.POLYGON_API_KEY;
    if (apiKey) {
      this.rest = restClient(apiKey);
    } else {
      console.error("[ADAPTER:Polygon:Fatal] Polygon API key is MISSING at instantiation.");
    }
  }

  async getFullStockData(ticker: string): Promise<AdapterOutput> {
    console.log(`[ADAPTER:Polygon] getFullStockData for ticker: ${ticker}`);
    if (!this.rest) {
      const errorMsg = "Polygon API key is not configured. Adapter cannot function.";
      console.error(`[ADAPTER:Polygon] ${errorMsg}`);
      return { stockDataJson: { ...EMPTY_STOCK_DATA_JSON }, error: errorMsg };
    }

    const upperTicker = ticker.toUpperCase();
    const finalOutputData: StockDataJson = {
      marketStatus: undefined,
      stockQuote: undefined,
      technicalAnalysis: JSON.parse(JSON.stringify(DEFAULT_TA_NULL_VALUES_ADAPTER)) as TechnicalAnalysisData,
      tickerSnapshot: undefined,
    };

    if (currentFetchConfig.marketStatus.active) {
      try {
        finalOutputData.marketStatus = await fetchMarketStatusFromPolygonAPI(this.rest);
        await delay(API_CALL_DELAY_MS);
      } catch (error: any) {
        console.error(`[ADAPTER:Polygon] CRITICAL: Failed to fetch market status. Error: ${error.message}`);
        return { stockDataJson: { ...finalOutputData, marketStatus: undefined }, error: `Failed to fetch critical market status for ${upperTicker}: ${error.message}` };
      }
    }

    // Fetch Ticker Snapshot Data
    console.log(`[ADAPTER:Polygon:Snapshot:Attempt] Fetching snapshot for ${upperTicker}.`);
    try {
      const snapshotResponse = await this.rest.stocks.snapshotTicker(upperTicker);
      if (snapshotResponse && snapshotResponse.ticker) {
        const tickerData = snapshotResponse.ticker;
        const dayData = tickerData.day;
        const minData = tickerData.min;
        const prevDayData = tickerData.prevDay;

        finalOutputData.tickerSnapshot = {
          ticker: tickerData.ticker,
          todaysChangePerc: formatNumber(tickerData.todaysChangePerc),
          todaysChange: formatNumber(tickerData.todaysChange),
          updated: tickerData.updated, // Assuming this is already a number or string
          day: dayData ? {
            o: formatNumber(dayData.o),
            h: formatNumber(dayData.h),
            l: formatNumber(dayData.l),
            c: formatNumber(dayData.c),
            v: formatNumber(dayData.v),
            vw: formatNumber(dayData.vw),
          } : null,
          min: minData ? {
            av: formatNumber(minData.av),
            t: minData.t, // Assuming timestamp, keep as is
            n: minData.n, // Assuming count, keep as is
            o: formatNumber(minData.o),
            h: formatNumber(minData.h),
            l: formatNumber(minData.l),
            c: formatNumber(minData.c),
            v: formatNumber(minData.v),
            vw: formatNumber(minData.vw),
          } : null,
          prevDay: prevDayData ? {
            o: formatNumber(prevDayData.o),
            h: formatNumber(prevDayData.h),
            l: formatNumber(prevDayData.l),
            c: formatNumber(prevDayData.c),
            v: formatNumber(prevDayData.v),
            vw: formatNumber(prevDayData.vw),
          } : null,
        };
        console.log(`[ADAPTER:Polygon:Snapshot:Success] Successfully fetched snapshot for ${upperTicker}.`);
      } else {
        console.log(`[ADAPTER:Polygon:Snapshot:Info] No snapshot data returned for ${upperTicker}.`);
        finalOutputData.tickerSnapshot = undefined;
      }
    } catch (error: any) {
      console.error(`[ADAPTER:Polygon:Snapshot:Error] Error fetching snapshot for ${upperTicker}:`, error.message);
      finalOutputData.tickerSnapshot = undefined;
    }
    await delay(API_CALL_DELAY_MS);

    if (currentFetchConfig.previousClose.active) {
      try {
        const prevCloseApiResponse: IAggsResults = await this.rest.stocks.previousClose(upperTicker, { adjusted: true });
        if (prevCloseApiResponse?.results?.[0]) {
          const prevCloseData = prevCloseApiResponse.results[0];
          const stockQuoteUpdate: StockQuoteData = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES_ADAPTER, ticker: upperTicker };
          stockQuoteUpdate.timestamp = prevCloseData.t ? new Date(prevCloseData.t).toISOString() : new Date().toISOString();
          stockQuoteUpdate.price = formatNumber(prevCloseData.c);
          stockQuoteUpdate.day_low = formatNumber(prevCloseData.l);
          stockQuoteUpdate.day_high = formatNumber(prevCloseData.h);
          if (prevCloseData.o !== undefined && prevCloseData.c !== undefined && prevCloseData.o !== null && prevCloseData.c !== null && prevCloseData.o !== 0) {
            const changeValue = prevCloseData.c - prevCloseData.o;
            stockQuoteUpdate.change = formatNumber(changeValue);
            stockQuoteUpdate.percent_change = formatNumber((changeValue / prevCloseData.o) * 100) + '%';
          }
          finalOutputData.stockQuote = stockQuoteUpdate;
        } else {
           finalOutputData.stockQuote = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES_ADAPTER, ticker: upperTicker, timestamp: new Date().toISOString() };
        }
      } catch (error: any) {
        console.error(`[ADAPTER:Polygon] Error fetching Previous Day Close for ${upperTicker}:`, error.message);
        finalOutputData.stockQuote = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES_ADAPTER, ticker: upperTicker, timestamp: new Date().toISOString() };
      }
      await delay(API_CALL_DELAY_MS);
    } else {
      finalOutputData.stockQuote = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES_ADAPTER, ticker: upperTicker, timestamp: new Date().toISOString() };
    }

    const baseTaParams = { timespan: 'day' as const, adjusted: "true", series_type: 'close' as const, order: 'desc' as const, limit: 50 };

    if (currentFetchConfig.rsi.active && finalOutputData.technicalAnalysis?.rsi) {
      for (const w of currentFetchConfig.rsi.windowsToFetch) {
        const val = await fetchIndicatorValueFromPolygonAPI('rsi', this.rest.stocks.rsi.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
        (finalOutputData.technicalAnalysis.rsi as any)[w] = val as number | null;
        await delay(API_CALL_DELAY_MS);
      }
    }
    if (currentFetchConfig.ema.active && finalOutputData.technicalAnalysis?.ema) {
      for (const w of currentFetchConfig.ema.windowsToFetch) {
        const val = await fetchIndicatorValueFromPolygonAPI('ema', this.rest.stocks.ema.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
        (finalOutputData.technicalAnalysis.ema as any)[w] = val as number | null;
        await delay(API_CALL_DELAY_MS);
      }
    }
    if (currentFetchConfig.sma.active && finalOutputData.technicalAnalysis?.sma) {
      for (const w of currentFetchConfig.sma.windowsToFetch) {
        const val = await fetchIndicatorValueFromPolygonAPI('sma', this.rest.stocks.sma.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
        (finalOutputData.technicalAnalysis.sma as any)[w] = val as number | null;
        await delay(API_CALL_DELAY_MS);
      }
    }
    if (currentFetchConfig.macd.active && finalOutputData.technicalAnalysis?.macd) {
      const val = await fetchIndicatorValueFromPolygonAPI('macd', this.rest.stocks.macd.bind(this.rest.stocks), upperTicker, { ...baseTaParams, short_window: "12", long_window: "26", signal_window: "9" });
      if (val && typeof val === 'object' && val !== null) {
        const macdValue = val as { value: number | null; signal: number | null; histogram: number | null };
        finalOutputData.technicalAnalysis.macd.value = macdValue.value;
        finalOutputData.technicalAnalysis.macd.signal = macdValue.signal;
        finalOutputData.technicalAnalysis.macd.histogram = macdValue.histogram;
      } else {
        finalOutputData.technicalAnalysis.macd.value = null;
        finalOutputData.technicalAnalysis.macd.signal = null;
        finalOutputData.technicalAnalysis.macd.histogram = null;
      }
    }
    
    console.log(`[ADAPTER:Polygon] Finished fetching. Final data for ${upperTicker} (first 300 chars): ${JSON.stringify(finalOutputData).substring(0,300)}...`);
    return { stockDataJson: finalOutputData };
  }
}

    