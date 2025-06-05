
/**
 * @fileOverview Centralized utility for calculating AI API usage costs.
 */

import type { UsageReport } from '@/ai/schemas/common-schemas';

// Pricing for Google Gemini Flash model (USD per 1 million tokens)
// Input prices are generally consistent across use cases for a given model.
export const GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS = 0.15;

// Output prices can vary based on the complexity or type of generation.
// Used by fetchStockDataFlow (via AI adapters) for generating/fetching structured data.
export const GEMINI_FLASH_OUTPUT_DATA_FETCH_PRICE_USD_PER_MILLION_TOKENS = 0.60;
// Used by analyzeStockDataFlow for more complex analytical text generation.
export const GEMINI_FLASH_OUTPUT_ANALYZE_PRICE_USD_PER_MILLION_TOKENS = 3.50;
// Used by chatFlow for conversational responses.
export const GEMINI_FLASH_OUTPUT_CHAT_PRICE_USD_PER_MILLION_TOKENS = 3.50;


/**
 * Calculates the usage report including cost for an AI flow.
 * @param flowName The name of the AI flow.
 * @param usage Object containing input and output token counts.
 * @param inputPricePerMillionTokens The cost per million input tokens.
 * @param outputPricePerMillionTokens The cost per million output tokens.
 * @returns A UsageReport object, or undefined if usage data is not provided.
 */
export function calculateUsageReport(
  flowName: string,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
  inputPricePerMillionTokens: number,
  outputPricePerMillionTokens: number
): UsageReport | undefined {
  if (!usage) return undefined;

  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;

  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillionTokens;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillionTokens;
  const totalCost = inputCost + outputCost;

  return {
    flowName,
    inputTokens,
    outputTokens,
    contextWindow: inputTokens + outputTokens,
    cost: parseFloat(totalCost.toFixed(6)), // Ensure 6 decimal places for currency
  };
}
