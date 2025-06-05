
/**
 * @fileOverview Adapter for fetching stock data from Polygon.io API.
 * Fetches:
 * 1. Current Market Status.
 * 2. Ticker Snapshot data (current day's OHLCV, VWAP, changes, and previous day's aggregates).
 * 3. Technical Indicators: RSI, EMA, SMA, MACD. For v1.2.9, all available indicators are fetched by default.
 * VWAP from snapshot is also mapped to technicalAnalysis.
 */

import {
  restClient,
  type IMarketStatus,
  type ITSIndicatorResults,
  type IMACDIndicatorResults,
  type IIndicatorValue,
  type IMACDValue,
  type ITickerSnapshot,
} from '@polygon.io/client-js';
import type { IDataSourceAdapter, AdapterOutput, StockDataJson } from '../types'; // GranularTaConfigType removed
import type { MarketStatusData, StockSnapshotData, TechnicalAnalysisData, IndicatorValue as MappedIndicatorValue } from '../types';
import { DISABLED_BY_CONFIG_TEXT } from '@/ai/schemas/stock-fetch-schemas'; // Still used if an indicator is truly not configurable/available
import { EMPTY_STOCK_DATA_JSON } from '../types'; // DEFAULT_GRANULAR_TA_CONFIG removed
import { formatTimestampToPacificTime } from '@/lib/date-utils';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_STOCK_SNAPSHOT_NULL_VALUES_ADAPTER: StockSnapshotData = {
    ticker: "",
    todaysChangePerc: null,
    todaysChange: null,
    updated: formatTimestampToPacificTime(new Date(0).toISOString()),
    day: { o: null, h: null, l: null, c: null, v: null, vw: null },
    min: { o: null, h: null, l: null, c: null, v: null, vw: null },
    prevDay: { o: null, h: null, l: null, c: null, v: null, vw: null }
};

// For v1.2.9, this structure defines what TAs are attempted. All values will be numbers or null.
const createInitialTaData = (): TechnicalAnalysisData => ({
  rsi: { '7': null, '10': null, '14': null },
  ema: { '5': null, '10': null, '20': null, '50': null, '200': null },
  sma: { '5': null, '10': null, '20': null, '50': null, '200': null },
  macd: { value: null, signal: null, histogram: null },
  vwap: { day: null, minute: null }
});


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

const AVAILABLE_TA_WINDOWS_CONFIG = {
  rsiWindows: [7, 10, 14] as const,
  emaWindows: [5, 10, 20, 50, 200] as const,
  smaWindows: [5, 10, 20, 50, 200] as const,
};

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
      serverTime: formatTimestampToPacificTime(marketStatusResult.serverTime),
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
        if ('statusText' in error && 'status' in error) {
            detail = `API request failed with status: ${error.statusText || 'N/A'} (Code: ${error.status || 'N/A'})`;
        } else if ('type' in error && error.type === 'AbortError') {
            detail = 'The request to Polygon API timed out or was aborted.';
        } else {
            try { const errorString = JSON.stringify(error); detail = errorString === '{}' ? 'Undescribed object error' : errorString; } catch {}
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
  console.log(`[ADAPTER:Polygon:TA:Attempt] Fetching ${indicatorFnName.toUpperCase()} for ${ticker}. Query:`, query);
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
    console.error(`[ADAPTER:Polygon:TA:Error] Error fetching ${indicatorFnName.toUpperCase()} for ${ticker} with query ${JSON.stringify(query)}:`, error.message);
    return null; // Return null on error, as per v1.2.9 expectation for TA values
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

  private async _fetchSnapshotData(ticker: string): Promise<StockSnapshotData | null> {
    if (!this.rest) return null;
    console.log(`[ADAPTER:Polygon:Snapshot:Attempt] Fetching snapshot for ${ticker}.`);
    try {
        const snapshotResult: ITickerSnapshot = await this.rest.stocks.snapshotTicker(ticker);
        if (snapshotResult?.status === "OK" && snapshotResult.ticker) {
            const t = snapshotResult.ticker;
            const updatedTimestampPT = t.updated ? formatTimestampToPacificTime(t.updated) : formatTimestampToPacificTime(new Date(0).toISOString());

            return {
                ticker: t.ticker,
                todaysChangePerc: formatNumber(t.todaysChangePerc),
                todaysChange: formatNumber(t.todaysChange),
                updated: updatedTimestampPT,
                day: t.day ? {
                    o: formatNumber(t.day.o),
                    h: formatNumber(t.day.h),
                    l: formatNumber(t.day.l),
                    c: formatNumber(t.day.c),
                    v: t.day.v ? Number(t.day.v) : null,
                    vw: formatNumber(t.day.vw)
                } : { o: null, h: null, l: null, c: null, v: null, vw: null },
                min: t.min ? {
                    o: formatNumber(t.min.o),
                    h: formatNumber(t.min.h),
                    l: formatNumber(t.min.l),
                    c: formatNumber(t.min.c),
                    v: t.min.v ? Number(t.min.v) : null,
                    vw: formatNumber(t.min.vw)
                } : { o: null, h: null, l: null, c: null, v: null, vw: null },
                prevDay: t.prevDay ? {
                    o: formatNumber(t.prevDay.o),
                    h: formatNumber(t.prevDay.h),
                    l: formatNumber(t.prevDay.l),
                    c: formatNumber(t.prevDay.c),
                    v: t.prevDay.v ? Number(t.prevDay.v) : null,
                    vw: formatNumber(t.prevDay.vw)
                } : { o: null, h: null, l: null, c: null, v: null, vw: null }
            };
        }
        console.warn(`[ADAPTER:Polygon:Snapshot:Warn] No snapshot data found for ${ticker}. Response:`, snapshotResult);
        return null;
    } catch (error: any) {
        console.error(`[ADAPTER:Polygon:Snapshot:Error] Error fetching snapshot for ${ticker}:`, error.message);
        return null;
    }
}

  async getFullStockData(
    ticker: string
    // selectedIndicatorsConfig and apiCallDelay removed for v1.2.9
  ): Promise<AdapterOutput> {
    const apiCallDelay = 100; // Default API call delay for v1.2.9
    console.log(`[ADAPTER:Polygon] getFullStockData for ticker: ${ticker}, Delay: ${apiCallDelay}ms (fixed for v1.2.9)`);
    if (!this.rest) {
      const errorMsg = "Polygon API key is not configured. Adapter cannot function.";
      console.error(`[ADAPTER:Polygon] ${errorMsg}`);
      return { stockDataJson: { ...EMPTY_STOCK_DATA_JSON }, error: errorMsg };
    }

    const upperTicker = ticker.toUpperCase();
    const finalOutputData: StockDataJson = {
      marketStatus: undefined,
      stockSnapshot: undefined,
      technicalAnalysis: createInitialTaData(), // All TAs initialized to null
    };

    try {
      finalOutputData.marketStatus = await fetchMarketStatusFromPolygonAPI(this.rest);
      await delay(apiCallDelay);
    } catch (error: any) {
      console.error(`[ADAPTER:Polygon] CRITICAL: Failed to fetch market status. Error: ${error.message}`);
      return { stockDataJson: { ...finalOutputData, marketStatus: undefined }, error: `Failed to fetch critical market status for ${upperTicker}: ${error.message}` };
    }

    finalOutputData.stockSnapshot = await this._fetchSnapshotData(upperTicker);
    if (finalOutputData.stockSnapshot?.day?.vw !== undefined && finalOutputData.technicalAnalysis?.vwap) {
        finalOutputData.technicalAnalysis.vwap.day = finalOutputData.stockSnapshot.day.vw;
    }
    if (finalOutputData.stockSnapshot?.min?.vw !== undefined && finalOutputData.technicalAnalysis?.vwap) {
        finalOutputData.technicalAnalysis.vwap.minute = finalOutputData.stockSnapshot.min.vw;
    }
    await delay(apiCallDelay);

    const baseTaParams = { timespan: 'day' as const, adjusted: "true", series_type: 'close' as const, order: 'desc' as const, limit: 500 };

    // RSI - Fetch all defined windows
    for (const w of AVAILABLE_TA_WINDOWS_CONFIG.rsiWindows) {
      const val = await fetchIndicatorValueFromPolygonAPI('rsi', this.rest.stocks.rsi.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
      if (finalOutputData.technicalAnalysis?.rsi) {
        (finalOutputData.technicalAnalysis.rsi as any)[w.toString()] = val as number | null;
      }
      await delay(apiCallDelay);
    }

    // EMA - Fetch all defined windows
    for (const w of AVAILABLE_TA_WINDOWS_CONFIG.emaWindows) {
      const val = await fetchIndicatorValueFromPolygonAPI('ema', this.rest.stocks.ema.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
       if (finalOutputData.technicalAnalysis?.ema) {
        (finalOutputData.technicalAnalysis.ema as any)[w.toString()] = val as number | null;
      }
      await delay(apiCallDelay);
    }

    // SMA - Fetch all defined windows
    for (const w of AVAILABLE_TA_WINDOWS_CONFIG.smaWindows) {
      const val = await fetchIndicatorValueFromPolygonAPI('sma', this.rest.stocks.sma.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
      if (finalOutputData.technicalAnalysis?.sma) {
        (finalOutputData.technicalAnalysis.sma as any)[w.toString()] = val as number | null;
      }
      await delay(apiCallDelay);
    }

    // MACD - Always fetch
    const macdVal = await fetchIndicatorValueFromPolygonAPI('macd', this.rest.stocks.macd.bind(this.rest.stocks), upperTicker, { ...baseTaParams, short_window: "12", long_window: "26", signal_window: "9" });
    if (macdVal && typeof macdVal === 'object' && macdVal !== null && finalOutputData.technicalAnalysis?.macd) {
      const macdData = macdVal as { value: number | null; signal: number | null; histogram: number | null };
      finalOutputData.technicalAnalysis.macd.value = macdData.value;
      finalOutputData.technicalAnalysis.macd.signal = macdData.signal;
      finalOutputData.technicalAnalysis.macd.histogram = macdData.histogram;
    } else if (finalOutputData.technicalAnalysis?.macd) {
      finalOutputData.technicalAnalysis.macd.value = null;
      finalOutputData.technicalAnalysis.macd.signal = null;
      finalOutputData.technicalAnalysis.macd.histogram = null;
    }

    console.log(`[ADAPTER:Polygon] Finished fetching. Final data for ${upperTicker} (first 300 chars): ${JSON.stringify(finalOutputData).substring(0,300)}...`);
    return { stockDataJson: finalOutputData };
  }
}
