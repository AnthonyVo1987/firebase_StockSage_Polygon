
'use server';
/**
 * @fileOverview An AI agent for fetching or generating stock quote and technical analysis data.
 *
 * - fetchStockData - A function that handles fetching/generating stock data as JSON.
 */

import {ai} from '@/ai/genkit';
import {
  FetchStockDataInputSchema,
  type FetchStockDataInput,
  FetchStockDataOutputSchema, // AI's direct output
  FetchStockDataFlowOutputSchema, // Flow's output including usage
  type FetchStockDataFlowOutput // Flow's output type
} from '@/ai/schemas/stock-fetch-schemas';

console.log('[FLOW:FetchStockData] Initializing FetchStockData Flow...');


export async function fetchStockData(input: FetchStockDataInput): Promise<FetchStockDataFlowOutput> {
  console.log('[FLOW:FetchStockData:Wrapper] Entered fetchStockData wrapper. Input:', input);
  const result = await fetchStockDataFlow(input);
  console.log('[FLOW:FetchStockData:Wrapper] Exiting fetchStockData wrapper. Stock JSON length:', result.data?.stockJson?.length, 'Usage:', result.usage);
  return result;
}

const fetchStockDataPromptDefinition = ai.definePrompt({
  name: 'fetchStockDataPrompt',
  input: {schema: FetchStockDataInputSchema},
  output: {schema: FetchStockDataOutputSchema}, // AI model output schema
  prompt: `
{{#if forceMock}}
You MUST generate realistic mock data for the given ticker '{{{ticker}}}'. Do NOT attempt to find or use live data. The data must be purely fictional but plausible.
{{else}}
You are a financial data service. Given a stock ticker: {{{ticker}}}, you MUST use the Google Search tool provided to retrieve the LATEST, REAL-TIME stock quote data and provide it as a JSON object. It is crucial that you use the search tool to get current information for your response.
If, after using Google Search, real-time data is genuinely unavailable for '{{{ticker}}}', you MAY generate realistic mock data. If you generate mock data, you must clearly state within the JSON itself (e.g., in a ticker or description field if allowed by the schema, otherwise imply through plausible but generic data) that the data is mocked.
{{/if}}

The JSON object must conform to the following structure:
{
  "stockQuote": {
    "ticker": "string (the input ticker, uppercased)",
    "price": "number (current price or previous day's close, prefer 2 decimal places)",
    "change": "number (price change from open or previous day's open to close, prefer 2 decimal places)",
    "percent_change": "string (e.g., '1.23%')",
    "day_low": "number (lowest price of the day or previous day, prefer 2 decimal places)",
    "day_high": "number (highest price of the day or previous day, prefer 2 decimal places)",
    "timestamp": "string (Current ISO date string, e.g., '2023-10-27T10:00:00.000Z')"
  },
  "technicalAnalysis": {
    "rsi": { "7": "number|null", "10": "number|null", "14": "number|null" },
    "ema": { "5": "number|null", "10": "number|null", "20": "number|null", "50": "number|null", "200": "number|null" },
    "sma": { "5": "number|null", "10": "number|null", "20": "number|null", "50": "number|null", "200": "number|null" },
    "macd": { "value": "number|null", "signal": "number|null", "histogram": "number|null" }
  }
}

For all numerical fields (price, change, day_low, day_high, and TA indicators), please try to provide values with up to 2 decimal places where appropriate.
If generating data (mock or otherwise), ensure all fields are populated appropriately according to their types (number, string, or null where allowed). For technical indicators, provide plausible mock values if generating.
The output should be ONLY the JSON string content, without any surrounding text, comments, or markdown code fences.

Example for ticker "MOCK" (if generating mock data):
{
  "stockQuote": {
    "ticker": "MOCK",
    "price": 150.75,
    "change": 1.25,
    "percent_change": "0.83%",
    "day_low": 149.50,
    "day_high": 151.00,
    "timestamp": "${new Date().toISOString()}"
  },
  "technicalAnalysis": {
    "rsi": { "7": 65.21, "10": 60.15, "14": 58.33 },
    "ema": { "5": 150.50, "10": 149.80, "20": 148.50, "50": 145.20, "200": 130.00 },
    "sma": { "5": 150.30, "10": 149.60, "20": 148.30, "50": 145.00, "200": 129.50 },
    "macd": { "value": 0.85, "signal": 0.70, "histogram": 0.15 }
  }
}
Ensure your output for {{{ticker}}} is valid JSON.
`,
});
console.log('[FLOW:FetchStockData] fetchStockDataPromptDefinition defined.');

const fetchStockDataFlow = ai.defineFlow(
  {
    name: 'fetchStockDataFlow',
    inputSchema: FetchStockDataInputSchema,
    outputSchema: FetchStockDataFlowOutputSchema, // Flow output schema including usage
  },
  async (input): Promise<FetchStockDataFlowOutput> => {
    console.log('[FLOW:FetchStockData:Internal] Entered fetchStockDataFlow (Genkit flow). Input:', input);
    let response;
    if (input.forceMock) {
      console.log('[FLOW:FetchStockData:Internal] Force mock is true. Using default model for mock data generation.');
      response = await fetchStockDataPromptDefinition(input);
    } else {
      console.log('[FLOW:FetchStockData:Internal] Force mock is false. Using Gemini 2.5 Flash with Google Search grounding for live data.');
      response = await fetchStockDataPromptDefinition(input, {
        model: 'googleai/gemini-2.5-flash-preview-05-20',
        toolConfig: {
          googleSearchRetrieval: { mode: 'FORCE' } // Changed from "auto" to "FORCE" to ensure tool use
        }
      });
    }
    console.log('[FLOW:FetchStockData:Internal:AIResponse] AI (prompt) response received. Output stockJson sample (first 100 chars):', response.output?.stockJson?.substring(0,100) + "...", 'Usage:', response.usage);


    if (!response.output || typeof response.output.stockJson !== 'string' || response.output.stockJson.trim() === "") {
      console.error('[FLOW:FetchStockData:Internal:Error] AI did not return valid stock JSON data string. Raw output:', response.output);
      throw new Error('AI did not return a valid stock JSON data string.');
    }
    try {
      JSON.parse(response.output.stockJson);
      console.log('[FLOW:FetchStockData:Internal:JSONValid] Generated stockJson successfully parsed as JSON.');
    } catch (e: any) {
      console.error("[FLOW:FetchStockData:Internal:JSONError] Generated stockJson is NOT valid JSON:", response.output.stockJson, "Error:", e.message);
      throw new Error(`AI returned an invalid JSON string for stock data: ${e.message}`);
    }
    
    const successResult = {
      data: response.output,
      usage: response.usage
    };
    console.log('[FLOW:FetchStockData:Internal:Success] Returning successful stock data. JSON length:', successResult.data.stockJson.length);
    return successResult;
  }
);
console.log('[FLOW:FetchStockData] fetchStockDataFlow (Genkit flow) defined.');
console.log('[FLOW:FetchStockData] FetchStockData Flow Initialized.');
