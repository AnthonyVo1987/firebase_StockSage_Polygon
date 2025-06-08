
/**
 * @fileOverview Adapter for fetching stock data from Polygon.io API.
 * Fetches:
 * 1. Current Market Status.
 * 2. Ticker Snapshot data (current day's OHLCV, VWAP, changes, and previous day's aggregates).
 * 3. Technical Indicators: RSI, EMA, SMA, MACD.
 * 4. Options Chain Snapshot: For the current week's Friday expiration (inclusive), for up to 10 strikes above and 10 strikes below current price.
 */

import {
  restClient,
  type IMarketStatus,
  type ITSIndicatorResults,
  type IMACDIndicatorResults,
  type IIndicatorValue,
  type IMACDValue,
  type ITickerSnapshot,
  // type IOptionsContracts, // No longer needed for discovery
  // type IOptionsContract as PolygonOptionContractReference, // No longer needed for discovery
  type IOptionsSnapshotChain, // Result from options.snapshotOptionChain
  type IOptionsSnapshotContract as PolygonOptionContractSnapshot, // Individual item in IOptionsSnapshotChain.results
} from '@polygon.io/client-js';
import type {
  IDataSourceAdapter,
  AdapterOutput,
  StockDataJson,
  OptionsChainData,
  OptionContractDetails,
  StrikeWithOptions
} from '../types';
import type { MarketStatusData, StockSnapshotData, TechnicalAnalysisData } from '../types';
import { EMPTY_STOCK_DATA_JSON } from '../types';
import { formatTimestampToPacificTime, calculateNextFridayExpiration } from '@/lib/date-utils';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  private async _fetchSnapshotData(ticker: string): Promise<StockSnapshotData | null> {
    if (!this.rest) return null;
    const upperTicker = ticker.toUpperCase();
    console.log(`[ADAPTER:Polygon:Snapshot:Attempt] Fetching stock snapshot for ${upperTicker}.`);
    try {
        const snapshotResult: ITickerSnapshot = await this.rest.stocks.snapshotTicker(upperTicker);
        if (snapshotResult?.status === "OK" && snapshotResult.ticker) {
            const t = snapshotResult.ticker;
            const updatedTimestampPT = t.updated ? formatTimestampToPacificTime(t.updated) : formatTimestampToPacificTime(new Date(0).toISOString());

            return {
                ticker: t.ticker.toUpperCase(), // Ensure ticker is uppercase
                todaysChangePerc: formatNumber(t.todaysChangePerc),
                todaysChange: formatNumber(t.todaysChange),
                updated: updatedTimestampPT,
                day: t.day ? {
                    o: formatNumber(t.day.o), h: formatNumber(t.day.h), l: formatNumber(t.day.l), c: formatNumber(t.day.c),
                    v: t.day.v ? Number(t.day.v) : null, vw: formatNumber(t.day.vw)
                } : { o: null, h: null, l: null, c: null, v: null, vw: null },
                min: t.min ? {
                    o: formatNumber(t.min.o), h: formatNumber(t.min.h), l: formatNumber(t.min.l), c: formatNumber(t.min.c),
                    v: t.min.v ? Number(t.min.v) : null, vw: formatNumber(t.min.vw)
                } : { o: null, h: null, l: null, c: null, v: null, vw: null },
                prevDay: t.prevDay ? {
                    o: formatNumber(t.prevDay.o), h: formatNumber(t.prevDay.h), l: formatNumber(t.prevDay.l), c: formatNumber(t.prevDay.c),
                    v: t.prevDay.v ? Number(t.prevDay.v) : null, vw: formatNumber(t.prevDay.vw)
                } : { o: null, h: null, l: null, c: null, v: null, vw: null }
            };
        }
        console.warn(`[ADAPTER:Polygon:Snapshot:Warn] No stock snapshot data found for ${upperTicker}. Response:`, snapshotResult);
        return null;
    } catch (error: any) {
        console.error(`[ADAPTER:Polygon:Snapshot:Error] Error fetching stock snapshot for ${upperTicker}:`, error.message);
        return null;
    }
  }

  private mapPolygonOptionSnapshotToContractDetails(optionSnapshot?: PolygonOptionContractSnapshot): OptionContractDetails | undefined {
    if (!optionSnapshot || !optionSnapshot.details) {
        return undefined;
    }
    const details = optionSnapshot.details;
    return {
      // ticker: details.ticker!, // REMOVED
      contract_type: details.contract_type! as 'call' | 'put',
      // exercise_style: details.exercise_style! as 'american' | 'european' | 'bermudan', // REMOVED
      // expiration_date: details.expiration_date!, // REMOVED
      strike_price: details.strike_price!, // KEPT
      day: optionSnapshot.day ? {
        close: formatNumber(optionSnapshot.day.close),
        high: formatNumber(optionSnapshot.day.high),
        low: formatNumber(optionSnapshot.day.low),
        open: formatNumber(optionSnapshot.day.open),
        volume: optionSnapshot.day.volume ? Number(optionSnapshot.day.volume) : undefined,
        vwap: formatNumber(optionSnapshot.day.vwap)
      } : {},
      details: { 
        // break_even_price: formatNumber(optionSnapshot.break_even_price), // REMOVED (was top-level anyway)
        implied_volatility: formatNumber(optionSnapshot.implied_volatility, 4), 
        open_interest: optionSnapshot.open_interest ? Number(optionSnapshot.open_interest) : undefined,
        delta: formatNumber(optionSnapshot.greeks?.delta, 4),
        gamma: formatNumber(optionSnapshot.greeks?.gamma, 4),
        theta: formatNumber(optionSnapshot.greeks?.theta, 4),
        vega: formatNumber(optionSnapshot.greeks?.vega, 4),
      },
      // last_quote: optionSnapshot.last_quote ? { // REMOVED
      //   ask: formatNumber(optionSnapshot.last_quote.ask),
      //   ask_size: optionSnapshot.last_quote.ask_size ? Number(optionSnapshot.last_quote.ask_size) : undefined,
      //   bid: formatNumber(optionSnapshot.last_quote.bid),
      //   bid_size: optionSnapshot.last_quote.bid_size ? Number(optionSnapshot.last_quote.bid_size) : undefined,
      //   midpoint: formatNumber(optionSnapshot.last_quote.midpoint),
      //   last_updated: optionSnapshot.last_quote.last_updated ? formatTimestampToPacificTime(optionSnapshot.last_quote.last_updated) : undefined,
      // } : {},
      // underlying_asset: optionSnapshot.underlying_asset ? { // REMOVED
      //   price: formatNumber(optionSnapshot.underlying_asset.price), 
      //   ticker: optionSnapshot.underlying_asset.ticker,
      // } : {}
    };
  }

  private async _fetchAndProcessOptionsChain(
    underlyingTicker: string,
    currentStockPrice: number
  ): Promise<OptionsChainData | null> {
    if (!this.rest) return null;
    const upperTicker = underlyingTicker.toUpperCase();
    const targetExpirationDate = calculateNextFridayExpiration();
    const apiLimitPerType = 50; // Fetch up to 50 calls and 50 puts to have a good selection pool
    const strikePriceWindow = 15; // Fetch strikes within +/- $15 (or other value) of current price

    const lowerBoundStrike = Math.max(1, Math.floor(currentStockPrice - strikePriceWindow));
    const upperBoundStrike = Math.ceil(currentStockPrice + strikePriceWindow);

    console.log(`[ADAPTER:Polygon:Options:Attempt] Fetching options chain for ${upperTicker}, target expiration: ${targetExpirationDate}, current stock price: ${currentStockPrice}, strike window: [${lowerBoundStrike}-${upperBoundStrike}]`);

    let fetchedCallContracts: PolygonOptionContractSnapshot[] = [];
    let fetchedPutContracts: PolygonOptionContractSnapshot[] = [];

    try {
      console.log(`[ADAPTER:Polygon:Options:FetchCalls] Fetching CALLS for ${upperTicker}, Exp: ${targetExpirationDate}, StrikeRange: [${lowerBoundStrike}-${upperBoundStrike}]`);
      const callsResponse: IOptionsSnapshotChain = await this.rest.options.snapshotOptionChain(upperTicker, {
        "strike_price.gte": lowerBoundStrike.toString(),
        "strike_price.lte": upperBoundStrike.toString(),
        expiration_date: targetExpirationDate,
        contract_type: "call",
        limit: apiLimitPerType,
        sort: "strike_price",
        order: "desc" // Request descending order from API
      });
      fetchedCallContracts = callsResponse.results || [];
      console.log(`[ADAPTER:Polygon:Options:FetchCalls] Received ${fetchedCallContracts.length} CALL contracts for ${upperTicker}.`);
    } catch (e: any) {
      console.error(`[ADAPTER:Polygon:Options:FetchCalls:Error] Error fetching CALLS for ${upperTicker}: ${e.message}`);
    }

    await delay(50); // Brief pause before next API call

    try {
      console.log(`[ADAPTER:Polygon:Options:FetchPuts] Fetching PUTS for ${upperTicker}, Exp: ${targetExpirationDate}, StrikeRange: [${lowerBoundStrike}-${upperBoundStrike}]`);
      const putsResponse: IOptionsSnapshotChain = await this.rest.options.snapshotOptionChain(upperTicker, {
        "strike_price.gte": lowerBoundStrike.toString(),
        "strike_price.lte": upperBoundStrike.toString(),
        expiration_date: targetExpirationDate,
        contract_type: "put",
        limit: apiLimitPerType,
        sort: "strike_price",
        order: "desc" // Request descending order from API
      });
      fetchedPutContracts = putsResponse.results || [];
      console.log(`[ADAPTER:Polygon:Options:FetchPuts] Received ${fetchedPutContracts.length} PUT contracts for ${upperTicker}.`);
    } catch (e: any) {
      console.error(`[ADAPTER:Polygon:Options:FetchPuts:Error] Error fetching PUTS for ${upperTicker}: ${e.message}`);
    }
    
    const allFetchedStrikesMap = new Map<number, { call?: PolygonOptionContractSnapshot, put?: PolygonOptionContractSnapshot }>();
    
    fetchedCallContracts.forEach(c => {
        if (c.details?.strike_price) {
            if (!allFetchedStrikesMap.has(c.details.strike_price)) allFetchedStrikesMap.set(c.details.strike_price, {});
            allFetchedStrikesMap.get(c.details.strike_price)!.call = c;
        }
    });
    fetchedPutContracts.forEach(c => {
        if (c.details?.strike_price) {
            if (!allFetchedStrikesMap.has(c.details.strike_price)) allFetchedStrikesMap.set(c.details.strike_price, {});
            allFetchedStrikesMap.get(c.details.strike_price)!.put = c;
        }
    });

    const uniqueStrikesFromFetched = Array.from(allFetchedStrikesMap.keys()).sort((a, b) => a - b); // Sort ascending for easier selection logic
    console.log(`[ADAPTER:Polygon:Options:Filter] ${uniqueStrikesFromFetched.length} unique strikes derived from GTE/LTE fetch: ${uniqueStrikesFromFetched.slice(0, 25).join(', ')}...`);

    if (uniqueStrikesFromFetched.length === 0) {
        const msg = `No option contracts found for ${upperTicker} (Exp: ${targetExpirationDate}) within strike window ${lowerBoundStrike}-${upperBoundStrike}.`;
        console.warn(`[ADAPTER:Polygon:Options:NoData] ${msg}`);
        return {
            underlying_ticker: upperTicker,
            target_expiration_date: targetExpirationDate,
            selected_strikes_data: [],
            fetched_at: formatTimestampToPacificTime(Date.now()),
            message: msg,
        };
    }
    
    let strikesToProcess: number[] = [];
    const strikesBelowCurrent = uniqueStrikesFromFetched.filter(s => s < currentStockPrice).sort((a,b) => b - a); // Descending, closest first
    const strikesAboveCurrent = uniqueStrikesFromFetched.filter(s => s > currentStockPrice).sort((a,b) => a - b); // Ascending, closest first
    const strikeAtCurrentPrice = uniqueStrikesFromFetched.find(s => s === currentStockPrice);

    if (strikeAtCurrentPrice !== undefined) {
        strikesToProcess.push(strikeAtCurrentPrice);
    }
    strikesToProcess.push(...strikesBelowCurrent.slice(0, 10));
    strikesToProcess.push(...strikesAboveCurrent.slice(0, 10));
    
    const finalSelectedUniqueStrikes = Array.from(new Set(strikesToProcess)).sort((a,b) => a - b); // Sort ascending for processing
    
    console.log(`[ADAPTER:Polygon:Options:Filter] Selected ${finalSelectedUniqueStrikes.length} final unique strikes for detailed assembly (sorted asc for processing): ${finalSelectedUniqueStrikes.join(', ')}`);
    
    if (finalSelectedUniqueStrikes.length === 0) {
       const msg = `Could not select any relevant strikes near current price ${currentStockPrice} from the fetched contracts for ${upperTicker} (Exp: ${targetExpirationDate}).`;
       console.warn(`[ADAPTER:Polygon:Options:Filter] ${msg}`);
        return {
            underlying_ticker: upperTicker,
            target_expiration_date: targetExpirationDate,
            selected_strikes_data: [],
            fetched_at: formatTimestampToPacificTime(Date.now()),
            message: msg
        };
    }
    
    const resultStrikesData: StrikeWithOptions[] = [];
    for (const strikeVal of finalSelectedUniqueStrikes) { // Iterate through strikes sorted ascending
        const strikeEntry = allFetchedStrikesMap.get(strikeVal);
        if (strikeEntry) {
            const strikeDataToAdd: StrikeWithOptions = { strike_price: strikeVal };
            if (strikeEntry.call) {
                strikeDataToAdd.call = this.mapPolygonOptionSnapshotToContractDetails(strikeEntry.call);
            }
            if (strikeEntry.put) {
                strikeDataToAdd.put = this.mapPolygonOptionSnapshotToContractDetails(strikeEntry.put);
            }
            if (strikeDataToAdd.call || strikeDataToAdd.put) {
                resultStrikesData.push(strikeDataToAdd);
            }
        }
    }
    
    // Ensure the final selected_strikes_data is sorted in descending order by strike_price
    resultStrikesData.sort((a, b) => b.strike_price - a.strike_price);

    console.log(`[ADAPTER:Polygon:Options:Result] Assembled data for ${resultStrikesData.length} strikes for ${upperTicker} (Exp: ${targetExpirationDate}), sorted descending.`);
    return {
      underlying_ticker: upperTicker,
      target_expiration_date: targetExpirationDate,
      selected_strikes_data: resultStrikesData,
      fetched_at: formatTimestampToPacificTime(Date.now()),
      message: resultStrikesData.length > 0 ? undefined : `No snapshot data assembled for selected strikes (Exp: ${targetExpirationDate}).`
    };
  }


  async getFullStockData(
    ticker: string
  ): Promise<AdapterOutput> {
    const apiCallDelay = 50; 
    const upperTicker = ticker.toUpperCase();
    console.log(`[ADAPTER:Polygon] getFullStockData for ticker: ${upperTicker}`);

    if (!this.rest) {
      const errorMsg = "Polygon API key is not configured. Adapter cannot function.";
      console.error(`[ADAPTER:Polygon] ${errorMsg}`);
      const snapshotWithError = { ...EMPTY_STOCK_DATA_JSON.stockSnapshot, ticker: upperTicker } as StockSnapshotData; 
      return { stockDataJson: { ...EMPTY_STOCK_DATA_JSON, stockSnapshot: snapshotWithError }, error: errorMsg };
    }

    const finalOutputData: StockDataJson = {
      marketStatus: undefined,
      stockSnapshot: undefined,
      technicalAnalysis: createInitialTaData(),
      optionsChain: undefined,
    };

    try {
      finalOutputData.marketStatus = await fetchMarketStatusFromPolygonAPI(this.rest);
      await delay(apiCallDelay);
    } catch (error: any) {
      console.error(`[ADAPTER:Polygon] CRITICAL: Failed to fetch market status. Error: ${error.message}`);
      const snapshotWithError = { ...EMPTY_STOCK_DATA_JSON.stockSnapshot, ticker: upperTicker } as StockSnapshotData; 
      return { stockDataJson: { ...finalOutputData, marketStatus: undefined, stockSnapshot: snapshotWithError }, error: `Failed to fetch critical market status for ${upperTicker}: ${error.message}` };
    }

    finalOutputData.stockSnapshot = await this._fetchSnapshotData(upperTicker);
    if (!finalOutputData.stockSnapshot) {
        const noSnapshotError = `Failed to fetch stock snapshot for ${upperTicker}. Cannot proceed with options or full TA.`;
        console.error(`[ADAPTER:Polygon] ${noSnapshotError}`);
        const snapshotWithError = { ...EMPTY_STOCK_DATA_JSON.stockSnapshot, ticker: upperTicker } as StockSnapshotData; 
        return { stockDataJson: {...finalOutputData, stockSnapshot: snapshotWithError }, error: noSnapshotError };
    }
    finalOutputData.stockSnapshot.ticker = finalOutputData.stockSnapshot.ticker.toUpperCase();


    if (finalOutputData.stockSnapshot?.day?.vw !== undefined && finalOutputData.technicalAnalysis?.vwap) {
        finalOutputData.technicalAnalysis.vwap.day = finalOutputData.stockSnapshot.day.vw;
    }
    if (finalOutputData.stockSnapshot?.min?.vw !== undefined && finalOutputData.technicalAnalysis?.vwap) {
        finalOutputData.technicalAnalysis.vwap.minute = finalOutputData.stockSnapshot.min.vw;
    }
    await delay(apiCallDelay);

    const currentPriceForOptions = finalOutputData.stockSnapshot?.day?.c;
    if (currentPriceForOptions !== null && currentPriceForOptions !== undefined) {
      finalOutputData.optionsChain = await this._fetchAndProcessOptionsChain(upperTicker, currentPriceForOptions);
    } else {
      const msg = `Skipped options chain fetch for ${upperTicker} as current stock price (stockSnapshot.day.c) is unavailable.`;
      console.warn(`[ADAPTER:Polygon] ${msg}`);
      finalOutputData.optionsChain = {
        underlying_ticker: upperTicker,
        target_expiration_date: calculateNextFridayExpiration(),
        selected_strikes_data: [],
        fetched_at: formatTimestampToPacificTime(Date.now()),
        message: msg
      };
    }


    const baseTaParams = { timespan: 'day' as const, adjusted: "true", series_type: 'close' as const, order: 'desc' as const, limit: 500 };

    for (const w of AVAILABLE_TA_WINDOWS_CONFIG.rsiWindows) {
      const val = await fetchIndicatorValueFromPolygonAPI('rsi', this.rest.stocks.rsi.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
      if (finalOutputData.technicalAnalysis?.rsi) {
        (finalOutputData.technicalAnalysis.rsi as any)[w.toString()] = val as number | null;
      }
      await delay(apiCallDelay);
    }
    for (const w of AVAILABLE_TA_WINDOWS_CONFIG.emaWindows) {
      const val = await fetchIndicatorValueFromPolygonAPI('ema', this.rest.stocks.ema.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
       if (finalOutputData.technicalAnalysis?.ema) {
        (finalOutputData.technicalAnalysis.ema as any)[w.toString()] = val as number | null;
      }
      await delay(apiCallDelay);
    }
    for (const w of AVAILABLE_TA_WINDOWS_CONFIG.smaWindows) {
      const val = await fetchIndicatorValueFromPolygonAPI('sma', this.rest.stocks.sma.bind(this.rest.stocks), upperTicker, { ...baseTaParams, window: w });
      if (finalOutputData.technicalAnalysis?.sma) {
        (finalOutputData.technicalAnalysis.sma as any)[w.toString()] = val as number | null;
      }
      await delay(apiCallDelay);
    }

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

    console.log(`[ADAPTER:Polygon] Finished fetching all data for ${upperTicker}. Options chain (message/count): ${finalOutputData.optionsChain?.message || (finalOutputData.optionsChain?.selected_strikes_data?.length ? finalOutputData.optionsChain?.selected_strikes_data?.length + ' strike sets processed' : 'No options data/strikes processed')}`);
    return { stockDataJson: finalOutputData };
  }
}
