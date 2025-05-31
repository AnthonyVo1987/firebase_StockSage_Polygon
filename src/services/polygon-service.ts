
'use server';

/**
 * @fileOverview Service for fetching stock data from Polygon.io API using the official client library.
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
  type ITSIndicatorResults, // For RSI, EMA, SMA
  type IMACDIndicatorResults, // For MACD
  type IIndicatorValue,
  type IMACDValue,
} from '@polygon.io/client-js';
import type { StockDataJson, MarketStatusData, StockQuoteDataSchema as MappedStockQuoteSchema, TechnicalAnalysisDataSchema as MappedTASchema, IndicatorValue } from '@/ai/schemas/stock-fetch-schemas';
import { DISABLED_BY_CONFIG_TEXT } from '@/ai/schemas/stock-fetch-schemas';

console.log('[SERVICE:Polygon] Initializing Polygon Service...');

const API_CALL_DELAY_MS = 100; // Configurable delay between API calls

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_STOCK_QUOTE_NULL_VALUES: MappedStockQuoteSchema = {
  ticker: "",
  price: null,
  change: null,
  percent_change: null,
  day_low: null,
  day_high: null,
  timestamp: new Date().toISOString(),
};

const DEFAULT_TA_NULL_VALUES: MappedTASchema = {
  rsi: { 
    '7': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '10': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '14': DISABLED_BY_CONFIG_TEXT as IndicatorValue 
  },
  ema: { 
    '5': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '10': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '20': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '50': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '200': DISABLED_BY_CONFIG_TEXT as IndicatorValue 
  },
  sma: { 
    '5': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '10': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '20': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '50': DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    '200': DISABLED_BY_CONFIG_TEXT as IndicatorValue 
  },
  macd: { 
    value: DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    signal: DISABLED_BY_CONFIG_TEXT as IndicatorValue, 
    histogram: DISABLED_BY_CONFIG_TEXT as IndicatorValue 
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

interface PolygonServiceFetchConfig {
  marketStatus: { active: boolean };
  previousClose: { active: boolean };
  rsi: IndicatorWindowConfig;
  ema: IndicatorWindowConfig;
  sma: IndicatorWindowConfig;
  macd: MACDConfig;
}

const DEBUG_FETCH_CONFIG: PolygonServiceFetchConfig = {
  marketStatus: { active: true },
  previousClose: { active: true },
  rsi: { active: true, windowsToFetch: [14] }, 
  ema: { active: true, windowsToFetch: [20] },  
  sma: { active: true, windowsToFetch: [20] },  
  macd: { active: true },                      
};

const PRODUCTION_FETCH_CONFIG: PolygonServiceFetchConfig = {
  marketStatus: { active: true },
  previousClose: { active: true },
  rsi: { active: true, windowsToFetch: [14] }, // Synced with DEBUG_FETCH_CONFIG
  ema: { active: true, windowsToFetch: [20] },  // Synced with DEBUG_FETCH_CONFIG
  sma: { active: true, windowsToFetch: [20] },  // Synced with DEBUG_FETCH_CONFIG
  macd: { active: true },                      // Synced with DEBUG_FETCH_CONFIG
};

const currentFetchConfig: PolygonServiceFetchConfig = DEBUG_FETCH_CONFIG;
console.log('[SERVICE:Polygon:CurrentConfig] Current fetch config is DEBUG_FETCH_CONFIG.');


async function fetchMarketStatus(rest: ReturnType<typeof restClient>): Promise<MarketStatusData> {
  console.log(`[SERVICE:Polygon:MarketStatus:Attempt] Fetching current market status.`);
  try {
    const marketStatusResult: IMarketStatus = await rest.reference.marketStatus();
    console.log(`[SERVICE:Polygon:MarketStatus:RawResult] Market Status:`, marketStatusResult);
    
    if (!marketStatusResult || !marketStatusResult.market || !marketStatusResult.serverTime) {
        console.error(`[SERVICE:Polygon:MarketStatus:Error] Market status API returned invalid data.`, marketStatusResult);
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
    console.error(`[SERVICE:Polygon:MarketStatus:Error] Error fetching market status from Polygon.io:`, error.message || error);
    throw new Error(`Failed to fetch market status: ${error.message || 'Unknown error'}`);
  }
}


async function fetchIndicatorValue(
  indicatorFnName: 'rsi' | 'ema' | 'sma' | 'macd',
  indicatorFn: (ticker: string, query?: any) => Promise<ITSIndicatorResults | IMACDIndicatorResults>,
  ticker: string,
  query: any
): Promise<number | { value: number | null; signal: number | null; histogram: number | null } | null> {
  console.log(`[SERVICE:Polygon:TA:Attempt] Fetching ${indicatorFnName.toUpperCase()} for ${ticker}. Window: ${query?.window || 'N/A'}.`);
  try {
    const result = await indicatorFn(ticker, query);

    if (result.results?.values && result.results.values.length > 0) {
      const latestValue = result.results.values[0];

      if (latestValue === undefined || latestValue === null) {
        console.warn(`[SERVICE:Polygon:TA:Warn] Latest TA value from ${indicatorFnName.toUpperCase()} (Window: ${query?.window || 'N/A'}) is null/undefined for ${ticker}. Returning null.`);
        return null;
      }

      if (indicatorFnName === 'macd') {
        const macdData = latestValue as IMACDValue;
        const parsedMacd = {
          value: formatNumber(macdData.value),
          signal: formatNumber(macdData.signal),
          histogram: formatNumber(macdData.histogram),
        };
        return parsedMacd;
      } else {
        const singleValueData = latestValue as IIndicatorValue;
        const parsedValue = formatNumber(singleValueData.value);
        return parsedValue;
      }
    }
    console.warn(`[SERVICE:Polygon:TA:Warn] No TA values array or empty values array for ${ticker} from ${indicatorFnName.toUpperCase()} (Window: ${query?.window || 'N/A'}). Returning null.`);
    return null;
  } catch (error: any) {
    console.error(`[SERVICE:Polygon:TA:Error] Error fetching TA indicator ${indicatorFnName.toUpperCase()} for ${ticker} (Window: ${query?.window || 'N/A'}). Error:`, error.message);
    return null;
  }
}


export async function fetchStockDataFromPolygon(ticker: string): Promise<string> {
  console.log(`[SERVICE:Polygon:Main] Initiating fetchStockDataFromPolygon for ticker: ${ticker} using config:`, JSON.stringify(currentFetchConfig));
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.error("[SERVICE:Polygon:Main:Fatal] Polygon API key is MISSING.");
    throw new Error("Polygon API key is not configured. Please set it in your environment variables.");
  }
  const rest = restClient(apiKey);
  const upperTicker = ticker.toUpperCase();

  const finalOutputData: StockDataJson = {
    marketStatus: undefined,
    stockQuote: undefined,
    technicalAnalysis: JSON.parse(JSON.stringify(DEFAULT_TA_NULL_VALUES)), 
  };
  
  if (currentFetchConfig.marketStatus.active) {
    try {
      finalOutputData.marketStatus = await fetchMarketStatus(rest);
      console.log(`[SERVICE:Polygon:Main:MarketStatusSuccess] Successfully fetched Market Status.`);
      await delay(API_CALL_DELAY_MS);
    } catch (error: any) {
      console.error(`[SERVICE:Polygon:Main:MarketStatusFatal] CRITICAL: Failed to fetch market status. Aborting further Polygon calls. Error: ${error.message}`);
      throw error; 
    }
  } else {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck] Skipping Market Status fetch as per config.`);
  }

  if (currentFetchConfig.previousClose.active) {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck] Fetching Previous Day Close for ${upperTicker}.`);
    try {
      const prevCloseApiResponse: IAggsResults = await rest.stocks.previousClose(upperTicker, { adjusted: true });
      if (prevCloseApiResponse && prevCloseApiResponse.results && prevCloseApiResponse.results.length > 0) {
        const prevCloseData = prevCloseApiResponse.results[0];
        const stockQuote: MappedStockQuoteSchema = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES, ticker: upperTicker };
        stockQuote.timestamp = prevCloseData.t ? new Date(prevCloseData.t).toISOString() : new Date().toISOString();
        stockQuote.price = formatNumber(prevCloseData.c);
        stockQuote.day_low = formatNumber(prevCloseData.l);
        stockQuote.day_high = formatNumber(prevCloseData.h);
        if (prevCloseData.o !== undefined && prevCloseData.c !== undefined && prevCloseData.o !== null && prevCloseData.c !== null && prevCloseData.o !== 0) {
          const changeValue = prevCloseData.c - prevCloseData.o;
          stockQuote.change = formatNumber(changeValue);
          stockQuote.percent_change = formatNumber((changeValue / prevCloseData.o) * 100) + '%';
        }
        finalOutputData.stockQuote = stockQuote;
        console.log(`[SERVICE:Polygon:Main:PrevCloseSuccess] Successfully fetched and mapped Previous Day Close for ${upperTicker}.`);
      } else {
        console.warn(`[SERVICE:Polygon:Main:PrevCloseWarn] Polygon Previous Day Close for ${upperTicker} returned no results. StockQuote will be default.`);
        finalOutputData.stockQuote = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES, ticker: upperTicker, timestamp: new Date().toISOString() };
      }
    } catch (error: any) {
      console.error(`[SERVICE:Polygon:Main:PrevCloseError] Error fetching Previous Day Close for ${upperTicker}:`, error.message || error);
      finalOutputData.stockQuote = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES, ticker: upperTicker, timestamp: new Date().toISOString() }; 
    }
    await delay(API_CALL_DELAY_MS);
  } else {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck] Skipping Previous Day Close fetch for ${upperTicker}.`);
    finalOutputData.stockQuote = { ...DEFAULT_STOCK_QUOTE_NULL_VALUES, ticker: upperTicker, timestamp: new Date().toISOString() };
  }

  const baseTaParams = { timespan: 'day' as const, adjusted: "true", series_type: 'close' as const, order: 'desc' as const, limit: 50 };
  let hasAnyTASuccess = false;

  if (currentFetchConfig.rsi.active && finalOutputData.technicalAnalysis?.rsi) {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:RSI] RSI active for ${upperTicker}.`);
    for (const w of currentFetchConfig.rsi.windowsToFetch) {
      const queryParams = { ...baseTaParams, window: w };
      const val = await fetchIndicatorValue('rsi', rest.stocks.rsi.bind(rest.stocks), upperTicker, queryParams);
      if (val !== null) {
         (finalOutputData.technicalAnalysis.rsi as any)[w] = val as number | null; 
         hasAnyTASuccess = val !== null ? true : hasAnyTASuccess;
      } else {
         (finalOutputData.technicalAnalysis.rsi as any)[w] = null;
      }
      await delay(API_CALL_DELAY_MS);
    }
  } else {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:RSI] RSI inactive or TA object missing. Values remain "${DISABLED_BY_CONFIG_TEXT}".`);
  }

  if (currentFetchConfig.ema.active && finalOutputData.technicalAnalysis?.ema) {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:EMA] EMA active for ${upperTicker}.`);
    for (const w of currentFetchConfig.ema.windowsToFetch) {
      const queryParams = { ...baseTaParams, window: w };
      const val = await fetchIndicatorValue('ema', rest.stocks.ema.bind(rest.stocks), upperTicker, queryParams);
       if (val !== null) {
        (finalOutputData.technicalAnalysis.ema as any)[w] = val as number | null;
        hasAnyTASuccess = val !== null ? true : hasAnyTASuccess;
      } else {
        (finalOutputData.technicalAnalysis.ema as any)[w] = null;
      }
      await delay(API_CALL_DELAY_MS);
    }
  } else {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:EMA] EMA inactive or TA object missing. Values remain "${DISABLED_BY_CONFIG_TEXT}".`);
  }
  
  if (currentFetchConfig.sma.active && finalOutputData.technicalAnalysis?.sma) {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:SMA] SMA active for ${upperTicker}.`);
    for (const w of currentFetchConfig.sma.windowsToFetch) {
      const queryParams = { ...baseTaParams, window: w };
      const val = await fetchIndicatorValue('sma', rest.stocks.sma.bind(rest.stocks), upperTicker, queryParams);
      if (val !== null) {
        (finalOutputData.technicalAnalysis.sma as any)[w] = val as number | null;
        hasAnyTASuccess = val !== null ? true : hasAnyTASuccess;
      } else {
        (finalOutputData.technicalAnalysis.sma as any)[w] = null;
      }
      await delay(API_CALL_DELAY_MS);
    }
  } else {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:SMA] SMA inactive or TA object missing. Values remain "${DISABLED_BY_CONFIG_TEXT}".`);
  }
  
  if (currentFetchConfig.macd.active && finalOutputData.technicalAnalysis?.macd) {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:MACD] MACD active for ${upperTicker}.`);
    const macdApiParams = { ...baseTaParams, short_window: "12", long_window: "26", signal_window: "9" };
    const val = await fetchIndicatorValue('macd', rest.stocks.macd.bind(rest.stocks), upperTicker, macdApiParams);
    if (val !== null) { 
      const macdValue = val as { value: number | null; signal: number | null; histogram: number | null };
      finalOutputData.technicalAnalysis.macd.value = macdValue.value;
      finalOutputData.technicalAnalysis.macd.signal = macdValue.signal;
      finalOutputData.technicalAnalysis.macd.histogram = macdValue.histogram;
      hasAnyTASuccess = true; 
    } else { 
      finalOutputData.technicalAnalysis.macd.value = null;
      finalOutputData.technicalAnalysis.macd.signal = null;
      finalOutputData.technicalAnalysis.macd.histogram = null;
    }
  } else {
    console.log(`[SERVICE:Polygon:Main:ConfigCheck:MACD] MACD inactive or TA object missing. Values remain "${DISABLED_BY_CONFIG_TEXT}".`);
  }

  if (!currentFetchConfig.previousClose.active && !currentFetchConfig.rsi.active && !currentFetchConfig.ema.active && !currentFetchConfig.sma.active && !currentFetchConfig.macd.active) {
    console.warn(`[SERVICE:Polygon:Main:NoDataFetched] No data (quote or TA) was configured to be actively fetched for ${upperTicker}, beyond market status.`);
  } else if (!finalOutputData.stockQuote?.price && !hasAnyTASuccess) {
     console.warn(`[SERVICE:Polygon:Main:PartialData] Successfully fetched market status, but failed to retrieve any stock quote or TA data from Polygon.io for ${upperTicker} despite being configured.`);
  }

  console.log(`[SERVICE:Polygon:Main:Summary] Finished fetching and processing data for ${upperTicker}. MarketStatus: ${!!finalOutputData.marketStatus}, StockQuote: ${!!finalOutputData.stockQuote?.price}, AnyTA: ${hasAnyTASuccess}`);
  console.log(`[SERVICE:Polygon:Main:FinalData] Final combined data for ${upperTicker}:`, JSON.stringify(finalOutputData).substring(0, 500) + "...");
  
  return JSON.stringify(finalOutputData, null, 2);
}

console.log('[SERVICE:Polygon] Polygon Service initialized.');

