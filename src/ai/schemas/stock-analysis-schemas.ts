
/**
 * @fileOverview Zod schemas and TypeScript types for stock data analysis.
 */
import { z } from 'genkit';
import { StockDataJsonSchema } from './stock-fetch-schemas'; // Import the main data schema

const TakeawaySentimentSchema = z.enum(["bullish", "bearish", "neutral"]);
export type TakeawaySentiment = z.infer<typeof TakeawaySentimentSchema>;

const SingleTakeawaySchema = z.object({
  text: z.string().describe("The textual content of the takeaway."),
  sentiment: TakeawaySentimentSchema.describe("The sentiment of the takeaway (bullish, bearish, or neutral).")
});
export type SingleTakeaway = z.infer<typeof SingleTakeawaySchema>;

export const AnalyzeStockDataInputSchema = z.object({
  stockData: z
    .string()
    .describe('The combined stock quote and technical analysis data in JSON format. This JSON string should conform to the StockDataJsonSchema structure.'),
});
export type AnalyzeStockDataInput = z.infer<typeof AnalyzeStockDataInputSchema>;

export const AnalyzeStockDataOutputSchema = z.object({
  stockPriceAction: SingleTakeawaySchema.describe("AI analysis of stock quote data and price action, including its sentiment."),
  trend: SingleTakeawaySchema.describe("AI analysis of Technical Analysis Indicators Data for trend, including its sentiment."),
  volatility: SingleTakeawaySchema.describe("AI analysis of Technical Analysis Indicators Data for volatility, including its sentiment."),
  momentum: SingleTakeawaySchema.describe("AI analysis of Technical Analysis Indicators Data for momentum, including its sentiment."),
  patterns: SingleTakeawaySchema.describe("AI analysis of Technical Analysis Indicators Data for patterns, including its sentiment.")
}).describe("Structured AI key takeaways from the stock and technical analysis data, with sentiment for each.");
export type AnalyzeStockDataOutput = z.infer<typeof AnalyzeStockDataOutputSchema>;

// Schema for the full output of the analyzeStockDataFlow, including usage
export const AnalyzeStockDataFlowOutputSchema = z.object({
  analysis: AnalyzeStockDataOutputSchema,
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
});
export type AnalyzeStockDataFlowOutput = z.infer<typeof AnalyzeStockDataFlowOutputSchema>;

