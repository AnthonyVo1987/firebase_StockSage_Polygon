
'use server';

/**
 * @fileOverview A stock data analysis AI agent for generating key takeaways.
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
  console.log('[FLOW:AnalyzeStockData] Entered analyzeStockData wrapper. Input stockData length:', input.stockData.length, 'AI TA JSON present:', !!input.aiCalculatedTaJson);
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
- 'stockSnapshot': Contains current day's intraday data ('day' object with OHLCV, VWAP; 'min' object with last minute data, 'updated' timestamp in PT format) AND previous day's aggregate data ('stockSnapshot.prevDay' object with OHLCV, VWAP). 'stockSnapshot.todaysChangePerc', 'stockSnapshot.todaysChange' are key fields.
- 'technicalAnalysis': Standard TA indicators (RSI, EMA, SMA, MACD) and VWAP (from 'technicalAnalysis.vwap.day' and 'technicalAnalysis.vwap.minute').

{{#if aiCalculatedTaJson}}
You have also been provided with AI-Calculated Technical Indicators in the following JSON:
\`\`\`json
{{{aiCalculatedTaJson}}}
\`\`\`
You MUST incorporate any relevant insights from these AI-Calculated TAs (such as Pivot Points, Support/Resistance levels, or any other calculated metrics therein) into your analysis for the five key takeaways, especially where they inform Price Action, Trend, and Patterns.
{{/if}}

Your primary context for current day analysis is 'stockSnapshot.day', 'stockSnapshot.min', 'stockSnapshot.todaysChangePerc', and 'stockSnapshot.updated' timestamp (Pacific Time).
For previous day's context, use 'stockSnapshot.prevDay.c' (previous day's close).

Based on this comprehensive data (including any AI-Calculated TAs), you MUST provide concise, single-bullet-point takeaways for each of the following five areas.
For EACH takeaway, you MUST also determine its overall sentiment: "bullish", "bearish", or "neutral".
When discussing numerical values, please present them with a maximum of two decimal places where appropriate.
**IMPORTANT FORMATTING**: When discussing monetary values (e.g., stock prices, OHLC values, VWAP, 'stockSnapshot.todaysChange'), always precede them with a dollar sign (e.g., $123.45, -$2.50). For percentages, use the '%' sign (e.g., 5.25%).

**VERY IMPORTANT INSTRUCTION**:
ABSOLUTELY DO NOT use any of the five takeaway slots to discuss:
    - Generic implications of the market being open or closed.
    - General advice about after-hours trading.
    - Generic warnings to monitor news after market close or that price may change in extended hours.
    - Upcoming catalysts or external news/events UNLESS direct evidence or data for such events is present within the provided JSON 'stockSnapshot', 'technicalAnalysis', or 'aiCalculatedTaJson' sections.
The user is fully aware of the market's current status.
Your five takeaways MUST focus exclusively on specific, actionable insights derived DIRECTLY from the provided numerical data. Avoid vague statements.

1.  **Stock Price Action**: Analyze the current day's data from 'stockSnapshot.day' (price using 'day.c' or 'min.c', 'todaysChange', 'todaysChangePerc', 'day.o,h,l,c', 'day.vw'). Compare with 'stockSnapshot.prevDay.c'. {{#if aiCalculatedTaJson}}Comment on how the current price relates to any relevant AI-calculated levels (like Pivots or other metrics) from the AI Calculated TA.{{/if}} Determine sentiment.
2.  **Trend**: Analyze relevant Technical Analysis Indicators ('technicalAnalysis.ema', '.sma', '.macd') and VWAP (from 'technicalAnalysis.vwap.day'). {{#if aiCalculatedTaJson}}Consider how price action relative to any AI-calculated levels (like Pivots or other metrics) supports or contradicts the trend.{{/if}} Determine sentiment.
3.  **Volatility**: Analyze the price range from 'stockSnapshot.day.h' and 'stockSnapshot.day.l'. Determine sentiment.
4.  **Momentum**: Analyze relevant Technical Analysis Indicators ('technicalAnalysis.rsi', '.macd.histogram') to assess momentum. Relate to 'stockSnapshot.todaysChangePerc'. Determine sentiment.
5.  **Patterns**: Briefly note if any obvious chart patterns are suggested by MAs, VWAP, or current price action. {{#if aiCalculatedTaJson}}Note if price is respecting or breaking key AI-calculated levels (like Support/Resistance or other metrics) from the AI Calculated TA.{{/if}} If none are apparent, state "No clear patterns observed from provided data." Determine sentiment.

Stock Data (JSON String with marketStatus, stockSnapshot (containing day, min, prevDay), and technicalAnalysis sections. Timestamps 'marketStatus.serverTime' and 'stockSnapshot.updated' are in Pacific Time hh:mm:ss AM/PM format.):
\`\`\`json
{{{stockData}}}
\`\`\`

**Important Note on Data Availability:**
- If you encounter "${DISABLED_BY_CONFIG_TEXT}" for any TA indicator, acknowledge this.
- If an indicator value is 'null', data was requested but unavailable; analyze based on available data.
- If 'marketStatus', 'stockSnapshot', or critical fields within them are missing, acknowledge this.

Provide your analysis in the structured format defined by the output schema.
Focus on actionable or insightful points based directly on the data. Ensure your analysis reflects the provided 'marketStatus.serverTime' and 'stockSnapshot.updated' times (which are Pacific Time).

Example Output Structure (Ensure your output matches this structure exactly, including '$' for monetary values and '%' for percentages):
{
  "stockPriceAction": { "text": "- At [stockSnapshot.updated PT], price is $[day.c or min.c] ([todaysChangePerc]% change, $[todaysChange]). Day VWAP: $[day.vw]. Prev close: $[prevDay.c]. {{#if aiCalculatedTaJson}}(Price relative to relevant AI TA levels like $[level_value]).{{/if}}", "sentiment": "[bullish/bearish/neutral]" },
  "trend": { "text": "- Trend appears [bullish/bearish/sideways] based on MAs (e.g., EMA20 at $[EMA20_value]), MACD, day's VWAP at $[day_vwap_value]. {{#if aiCalculatedTaJson}}(Consider AI TA levels like Pivot at $[PP_value]).{{/if}}", "sentiment": "[bullish/bearish/neutral]" },
  "volatility": { "text": "- Volatility appears [high/moderate/low] based on day's range ($[day.l] - $[day.h]).", "sentiment": "[bullish/bearish/neutral]" },
  "momentum": { "text": "- Momentum is [strong/waning/neutral] (RSI [RSI value], MACD histogram [value]), with today's change at [todaysChangePerc]%.", "sentiment": "[bullish/bearish/neutral]" },
  "patterns": { "text": "- [Observation on MAs, VWAP, price action relative to $[price_level], {{#if aiCalculatedTaJson}}or relevant AI TA levels like Support at $[S1_value]{{/if}}, or 'No clear patterns observed'].", "sentiment": "[bullish/bearish/neutral]" }
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
    console.log('[FLOW:AnalyzeStockData:Internal] Entered analyzeStockDataFlow. Input stockData (first 200 chars):', input.stockData.substring(0,200) + "...", "AI TA JSON present:", !!input.aiCalculatedTaJson);
    
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

