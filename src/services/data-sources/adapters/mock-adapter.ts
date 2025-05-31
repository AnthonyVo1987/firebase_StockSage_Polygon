/**
 * @fileOverview Adapter for generating mock stock data, potentially using an AI.
 */

import type { IDataSourceAdapter, AdapterOutput, StockDataJson } from '../types';
import { fetchStockData, type FetchStockDataInput } from '@/ai/flows/fetch-stock-data';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { EMPTY_STOCK_DATA_JSON } from '../types';

const INPUT_PRICE_PER_MILLION_TOKENS = 0.15; 
const OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS = 0.60;


function calculateAiUsageReport(
  flowName: string,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
): UsageReport | undefined {
  if (!usage) return undefined;

  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;

  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_NON_THINKING_PER_MILLION_TOKENS;
  const totalCost = inputCost + outputCost;

  return {
    flowName,
    inputTokens,
    outputTokens,
    contextWindow: inputTokens + outputTokens,
    cost: parseFloat(totalCost.toFixed(6)),
  };
}


export class MockAdapter implements IDataSourceAdapter {
  constructor() {
    console.log('[ADAPTER:Mock] MockAdapter instantiated.');
  }

  async getFullStockData(ticker: string): Promise<AdapterOutput> {
    console.log(`[ADAPTER:Mock] getFullStockData called for ticker: ${ticker}. Generating mock data via AI.`);
    
    const fetchInput: FetchStockDataInput = { ticker, forceMock: true };
    try {
      const flowResult = await fetchStockData(fetchInput);
      const usageReport = calculateAiUsageReport('fetchStockDataFlow (MockAdapter)', flowResult.usage);

      if (flowResult.error || !flowResult.data?.stockJson) {
        const errorMsg = flowResult.error || 'AI could not generate mock stock data.';
        console.error(`[ADAPTER:Mock] Error: ${errorMsg}`);
        return {
          stockDataJson: { ...EMPTY_STOCK_DATA_JSON }, // EMPTY_STOCK_DATA_JSON now includes a default marketStatus
          error: errorMsg,
          usageReport,
        };
      }

      let parsedStockData: StockDataJson;
      try {
        parsedStockData = JSON.parse(flowResult.data.stockJson);
        // The fetchStockData flow now includes a check for marketStatus presence after parsing.
        // If it's missing, the flow itself would have thrown an error.
      } catch (e: any) {
        const errorMsg = `MockAdapter: AI returned invalid JSON or JSON missing critical fields: ${e.message}`;
        console.error(`[ADAPTER:Mock] ${errorMsg}`, flowResult.data.stockJson);
        return {
          stockDataJson: { ...EMPTY_STOCK_DATA_JSON },
          error: errorMsg,
          usageReport,
        };
      }
      
      // No longer need to explicitly check for parsedStockData.marketStatus here,
      // as the flow is now responsible for ensuring its presence or failing.

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
