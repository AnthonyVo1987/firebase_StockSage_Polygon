
/**
 * @fileOverview Adapter for generating mock stock data, potentially using an AI.
 */

import type { IDataSourceAdapter, AdapterOutput, StockDataJson } from '../types';
import { fetchStockData, type FetchStockDataInput } from '@/ai/flows/fetch-stock-data';
import { EMPTY_STOCK_DATA_JSON } from '../types';
import { 
  calculateUsageReport,
  GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
  GEMINI_FLASH_OUTPUT_DATA_FETCH_PRICE_USD_PER_MILLION_TOKENS
} from '@/ai/utils/cost-calculator';


export class MockAdapter implements IDataSourceAdapter {
  constructor() {
    console.log('[ADAPTER:Mock] MockAdapter instantiated.');
  }

  async getFullStockData(ticker: string): Promise<AdapterOutput> {
    console.log(`[ADAPTER:Mock] getFullStockData called for ticker: ${ticker}. Generating mock data via AI.`);
    
    const fetchInput: FetchStockDataInput = { ticker, forceMock: true };
    try {
      const flowResult = await fetchStockData(fetchInput);
      const usageReport = calculateUsageReport(
        'fetchStockDataFlow (MockAdapter)',
        flowResult.usage,
        GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
        GEMINI_FLASH_OUTPUT_DATA_FETCH_PRICE_USD_PER_MILLION_TOKENS
      );

      if (flowResult.error || !flowResult.data?.stockJson) {
        const errorMsg = flowResult.error || 'AI could not generate mock stock data.';
        console.error(`[ADAPTER:Mock] Error: ${errorMsg}`);
        return {
          stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
          error: errorMsg,
          usageReport,
        };
      }

      let parsedStockData: StockDataJson;
      try {
        parsedStockData = JSON.parse(flowResult.data.stockJson);
      } catch (e: any) {
        const errorMsg = `MockAdapter: AI returned invalid JSON or JSON missing critical fields: ${e.message}`;
        console.error(`[ADAPTER:Mock] ${errorMsg}`, flowResult.data.stockJson);
        return {
          stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
          error: errorMsg,
          usageReport,
        };
      }
      
      return {
        stockDataJson: parsedStockData,
        usageReport,
      };
    } catch (e: any) {
      const errorMsg = `MockAdapter: Unexpected error calling fetchStockData flow: ${e.message}`;
      console.error(`[ADAPTER:Mock] ${errorMsg}`, e);
      return {
        stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
        error: errorMsg,
      };
    }
  }
}
