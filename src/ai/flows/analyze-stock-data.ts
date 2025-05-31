
'use server';

/**
 * @fileOverview A stock data analysis AI agent.
 *
 * - analyzeStockData - A function that handles the stock data analysis process.
 */

import {ai} from '@/ai/genkit';
import {
  AnalyzeStockDataInputSchema,
  type AnalyzeStockDataInput,
  AnalyzeStockDataOutputSchema, 
  AnalyzeStockDataFlowOutputSchema, 
  type AnalyzeStockDataFlowOutput,
  type SingleTakeaway // Import for default error values
} from '@/ai/schemas/stock-analysis-schemas';
import { DISABLED_BY_CONFIG_TEXT } from '@/ai/schemas/stock-fetch-schemas';


export async function analyzeStockData(input: AnalyzeStockDataInput): Promise<AnalyzeStockDataFlowOutput> {
  console.log('[FLOW:AnalyzeStockData] Entered analyzeStockData wrapper. Input stockData length:', input.stockData.length);
  const result = await analyzeStockDataFlow(input);
  console.log('[FLOW:AnalyzeStockData] Exiting analyzeStockData wrapper. Result:', result);
  return result;
}

const prompt = ai.definePrompt({
  name: 'analyzeStockDataPrompt',
  input: {schema: AnalyzeStockDataInputSchema},
  output: {schema: AnalyzeStockDataOutputSchema},
  prompt: `You are an expert financial analyst specializing in technical analysis.

You will analyze the provided stock data, which is a JSON string containing 'marketStatus', 'stockQuote', and 'technicalAnalysis' sections.
Your primary context is the 'marketStatus' section, especially its 'serverTime' and 'market' (e.g., "regular", "closed") fields. Use this to frame your analysis.

Based on this comprehensive data, you MUST provide concise, single-bullet-point takeaways for each of the following five areas.
For EACH takeaway, you MUST also determine its overall sentiment: "bullish", "bearish", or "neutral".

1.  **Stock Price Action**: Analyze the 'stockQuote' section (price, change, day high/low) in the context of the 'marketStatus'. Determine sentiment.
2.  **Trend**: Analyze relevant Technical Analysis Indicators (EMAs, SMAs, MACD) from the 'technicalAnalysis' section to determine the current trend (e.g., bullish, bearish, sideways), considering the market status. Determine sentiment.
3.  **Volatility**: Analyze relevant indicators (e.g., price range from quote, or relationship between short/long term MAs if applicable) to comment on current volatility. Determine sentiment.
4.  **Momentum**: Analyze relevant Technical Analysis Indicators (RSI, MACD histogram) from the 'technicalAnalysis' section to assess momentum. Determine sentiment.
5.  **Patterns**: Briefly note if any obvious chart patterns are suggested by the MAs or price action (e.g., "MAs converging suggesting potential crossover" or "Price testing short-term MA"). If none are apparent, state "No clear patterns observed from provided data." Determine sentiment.

Stock Data (JSON String with marketStatus, stockQuote and technicalAnalysis sections):
\`\`\`json
{{{stockData}}}
\`\`\`

**Important Note on Data Availability:**
If you encounter the string "${DISABLED_BY_CONFIG_TEXT}" for any technical indicator value, it means that specific data point was intentionally not requested for this analysis.
You MUST acknowledge this in your analysis for the relevant takeaway's text. For example, if MACD values are "${DISABLED_BY_CONFIG_TEXT}", state for Trend text: "Trend analysis is limited as MACD data was disabled."
If an indicator value is 'null', it means data was requested but not available from the source; analyze based on available data and note the missing 'null' point if crucial.
If 'marketStatus' or 'stockQuote' are missing or incomplete, acknowledge this and indicate that analysis might be limited.

Provide your analysis in the structured format defined by the output schema. Each field should be an object containing 'text' (a single, concise bullet point string) and 'sentiment' ("bullish", "bearish", or "neutral").
Focus on actionable or insightful points. Ensure your analysis reflects the provided 'marketStatus.serverTime' and current market condition (open/closed).

Example Output Structure (Ensure your output matches this structure exactly):
{
  "stockPriceAction": { "text": "- As of [marketStatus.serverTime] (market [marketStatus.market]), price shows [movement] with [details from quote].", "sentiment": "[bullish/bearish/neutral]" },
  "trend": { "text": "- Trend appears [bullish/bearish/sideways] based on [MA/MACD observations, noting if any were '${DISABLED_BY_CONFIG_TEXT}' or if data is limited by market status].", "sentiment": "[bullish/bearish/neutral]" },
  "volatility": { "text": "- Volatility appears [high/moderate/low] based on [price range/MA spread, noting if MAs were '${DISABLED_BY_CONFIG_TEXT}'].", "sentiment": "[bullish/bearish/neutral]" },
  "momentum": { "text": "- Momentum is [strong/waning/neutral] as indicated by RSI [RSI value] and MACD [MACD details, noting if '${DISABLED_BY_CONFIG_TEXT}'].", "sentiment": "[bullish/bearish/neutral]" },
  "patterns": { "text": "- [Observation on MAs, price action, or 'No clear patterns observed', noting if MAs were '${DISABLED_BY_CONFIG_TEXT}'].", "sentiment": "[bullish/bearish/neutral]" }
}
`,
});

const analyzeStockDataFlow = ai.defineFlow(
  {
    name: 'analyzeStockDataFlow',
    inputSchema: AnalyzeStockDataInputSchema,
    outputSchema: AnalyzeStockDataFlowOutputSchema, 
  },
  async (input): Promise<AnalyzeStockDataFlowOutput> => {
    console.log('[FLOW:AnalyzeStockData:Internal] Entered analyzeStockDataFlow. Input stockData (first 200 chars):', input.stockData.substring(0,200) + "...");
    
    const response = await prompt(input); 
    console.log('[FLOW:AnalyzeStockData:Internal] AI (prompt) response received. Output:', response.output, 'Usage:', response.usage);

    const isValidTakeaway = (takeaway: any): takeaway is SingleTakeaway => {
      return takeaway && typeof takeaway.text === 'string' && 
             (takeaway.sentiment === 'bullish' || takeaway.sentiment === 'bearish' || takeaway.sentiment === 'neutral');
    };

    if (!response.output ||
        !isValidTakeaway(response.output.stockPriceAction) ||
        !isValidTakeaway(response.output.trend) ||
        !isValidTakeaway(response.output.volatility) ||
        !isValidTakeaway(response.output.momentum) ||
        !isValidTakeaway(response.output.patterns)) {
      console.warn('[FLOW:AnalyzeStockData:Internal] AI did not return valid structured takeaways with sentiment. Raw output:', response.output);
      const errorAnalysis = {
        analysis: {
          stockPriceAction: { text: "AI analysis for price action could not be generated due to invalid response structure.", sentiment: "neutral" as const },
          trend: { text: "AI analysis for trend could not be generated due to invalid response structure.", sentiment: "neutral" as const },
          volatility: { text: "AI analysis for volatility could not be generated due to invalid response structure.", sentiment: "neutral" as const },
          momentum: { text: "AI analysis for momentum could not be generated due to invalid response structure.", sentiment: "neutral" as const },
          patterns: { text: "AI analysis for patterns could not be generated due to invalid response structure.", sentiment: "neutral" as const }
        },
        usage: response.usage
      };
      return errorAnalysis;
    }
    const successAnalysis = {
      analysis: response.output,
      usage: response.usage
    };
    return successAnalysis;
  }
);

