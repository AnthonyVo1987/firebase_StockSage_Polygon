
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
  type SingleTakeaway 
} from '@/ai/schemas/stock-analysis-schemas';
import { DISABLED_BY_CONFIG_TEXT } from '@/ai/schemas/stock-fetch-schemas';
import { formatTimestampToPacificTime } from '@/lib/date-utils';


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

You will analyze the provided stock data, which is a JSON string. This JSON contains:
- 'marketStatus': Current market conditions. 'marketStatus.serverTime' (in Pacific Time hh:mm:ss AM/PM format) indicates the current server time.
- 'stockSnapshot': Contains current day's intraday data ('day' object with OHLCV, VWAP; 'min' object with last minute data, 'updated' timestamp in PT format) AND previous day's aggregate data ('stockSnapshot.prevDay' object with OHLCV, VWAP). 'stockSnapshot.todaysChangePerc', 'stockSnapshot.todaysChange' are also key fields.
- 'technicalAnalysis': Standard TA indicators (RSI, EMA, SMA, MACD) and VWAP (from 'technicalAnalysis.vwap.day' and 'technicalAnalysis.vwap.minute').

Your primary context for current day analysis is 'stockSnapshot.day', 'stockSnapshot.min', 'stockSnapshot.todaysChangePerc', and 'stockSnapshot.updated' timestamp (Pacific Time).
For previous day's context, use 'stockSnapshot.prevDay.c' (previous day's close).

Based on this comprehensive data, you MUST provide concise, single-bullet-point takeaways for each of the following five areas.
For EACH takeaway, you MUST also determine its overall sentiment: "bullish", "bearish", or "neutral".

**VERY IMPORTANT INSTRUCTION**:
ABSOLUTELY DO NOT use any of the five takeaway slots to discuss:
    - Generic implications of the market being open or closed.
    - General advice about after-hours trading.
    - Generic warnings to monitor news after market close or that price may change in extended hours.
    - Upcoming catalysts or external news/events UNLESS direct evidence or data for such events is present within the provided JSON 'stockSnapshot' or 'technicalAnalysis' sections.
The user is fully aware of the market's current status via the 'marketStatus.serverTime' and 'stockSnapshot.updated' fields.
Your five takeaways MUST focus exclusively on specific, actionable insights derived DIRECTLY from the provided numerical data (prices, volumes, indicator values, VWAP values, % changes, price ranges). Avoid vague statements.

1.  **Stock Price Action**: Analyze the current day's data from 'stockSnapshot.day' (price using 'day.c' or 'min.c' if appropriate, 'todaysChange', 'todaysChangePerc', 'day.o,h,l,c', and 'day.vw'). Compare with 'stockSnapshot.prevDay.c' (previous day's close) for context. Determine sentiment.
2.  **Trend**: Analyze relevant Technical Analysis Indicators ('technicalAnalysis.ema', '.sma', '.macd') and VWAP (from 'technicalAnalysis.vwap.day', which is 'stockSnapshot.day.vw') to determine the current trend (e.g., bullish, bearish, sideways), considering 'stockSnapshot.prevDay' data for broader context if needed. Determine sentiment.
3.  **Volatility**: Analyze the price range from 'stockSnapshot.day.h' and 'stockSnapshot.day.l', or relationship between short/long term MAs if applicable, to comment on current volatility. Compare with 'stockSnapshot.prevDay' ranges if useful. Determine sentiment.
4.  **Momentum**: Analyze relevant Technical Analysis Indicators ('technicalAnalysis.rsi', '.macd.histogram') from the 'technicalAnalysis' section to assess momentum. Relate to 'stockSnapshot.todaysChangePerc'. Determine sentiment.
5.  **Patterns**: Briefly note if any obvious chart patterns are suggested by the MAs, VWAP ('technicalAnalysis.vwap.day'), or current price action in 'stockSnapshot' (e.g., "Price testing day's VWAP" or "MAs converging"). Compare with 'stockSnapshot.prevDay' data if useful. If none are apparent, state "No clear patterns observed from provided data." Determine sentiment.

Stock Data (JSON String with marketStatus, stockSnapshot (containing day, min, prevDay), and technicalAnalysis sections. Timestamps 'marketStatus.serverTime' and 'stockSnapshot.updated' are in Pacific Time hh:mm:ss AM/PM format.):
\`\`\`json
{{{stockData}}}
\`\`\`

**Important Note on Data Availability:**
- If you encounter "${DISABLED_BY_CONFIG_TEXT}" for any TA indicator, acknowledge this (e.g., "Trend analysis limited as MACD was disabled.").
- If an indicator value is 'null', data was requested but unavailable; analyze based on available data and note the missing 'null' point if crucial.
- If 'marketStatus', 'stockSnapshot', 'stockSnapshot.day', or 'stockSnapshot.prevDay', or critical fields within them (like 'day.c', 'day.vw', 'prevDay.c') are missing or incomplete, acknowledge this and indicate that analysis might be limited.
- Focus on 'stockSnapshot.day' and 'stockSnapshot.min' for current day activity and 'stockSnapshot.prevDay' for direct comparison to previous day's official closing state.

Provide your analysis in the structured format defined by the output schema. Each field should be an object containing 'text' (a single, concise bullet point string) and 'sentiment' ("bullish", "bearish", or "neutral").
Focus on actionable or insightful points based directly on the data. Ensure your analysis reflects the provided 'marketStatus.serverTime' and 'stockSnapshot.updated' times (which are Pacific Time).

Example Output Structure (Ensure your output matches this structure exactly):
{
  "stockPriceAction": { "text": "- At [stockSnapshot.updated PT], price is [stockSnapshot.day.c or min.c] showing a [todaysChangePerc] change. Day's VWAP is [stockSnapshot.day.vw]. Previous close was [stockSnapshot.prevDay.c].", "sentiment": "[bullish/bearish/neutral]" },
  "trend": { "text": "- Trend appears [bullish/bearish/sideways] based on MAs, MACD, and day's VWAP ([technicalAnalysis.vwap.day]).", "sentiment": "[bullish/bearish/neutral]" },
  "volatility": { "text": "- Volatility appears [high/moderate/low] based on day's range ([stockSnapshot.day.l] - [stockSnapshot.day.h]).", "sentiment": "[bullish/bearish/neutral]" },
  "momentum": { "text": "- Momentum is [strong/waning/neutral] (RSI [RSI value], MACD histogram [value]), with today's change at [stockSnapshot.todaysChangePerc].", "sentiment": "[bullish/bearish/neutral]" },
  "patterns": { "text": "- [Observation on MAs, VWAP, price action, or 'No clear patterns observed'].", "sentiment": "[bullish/bearish/neutral]" }
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

