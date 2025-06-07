
'use server';
/**
 * @fileOverview A Genkit flow to calculate technical indicators like Pivot Points
 * and Support/Resistance levels using AI based on provided stock data.
 *
 * - calculateAiTaIndicators - A function that handles the AI TA calculation process.
 * - AiCalculatedTaInput - The input type for the calculateAiTaIndicators function.
 * - AiCalculatedTaFlowOutput - The return type for the calculateAiTaIndicators function.
 */

import { ai } from '@/ai/genkit';
import {
  AiCalculatedTaInputSchema,
  type AiCalculatedTaInput,
  AiCalculatedTaOutputSchema,
  AiCalculatedTaFlowOutputSchema,
  type AiCalculatedTaFlowOutput,
  type PivotLevels,
} from '@/ai/schemas/ai-calculated-ta-schemas';
import { DEFAULT_ANALYSIS_MODEL_ID } from '@/ai/models';
import { formatToTwoDecimalsOrNull } from '@/lib/number-utils';

export async function calculateAiTaIndicators(input: AiCalculatedTaInput): Promise<AiCalculatedTaFlowOutput> {
  console.log(`[FLOW:CalculateAiTa] Entered calculateAiTaIndicators for ticker: ${input.ticker}. Polygon JSON length: ${input.polygonStockJsonString.length}`);
  const result = await calculateAiTaFlow(input);
  console.log(`[FLOW:CalculateAiTa] Exiting calculateAiTaIndicators for ticker: ${input.ticker}. Result (PP): ${result.calculatedTa?.pivotLevels?.PP}`);
  return result;
}

const calculateAiTaPrompt = ai.definePrompt({
  name: 'calculateAiTaPrompt',
  model: DEFAULT_ANALYSIS_MODEL_ID,
  input: { schema: AiCalculatedTaInputSchema },
  output: { schema: AiCalculatedTaOutputSchema },
  prompt: `You are a financial data processor. Your task is to extract specific data points from the provided JSON and perform calculations to determine Classic Daily Pivot Points and their corresponding Support and Resistance levels (S1, S2, S3, R1, R2, R3).

You MUST use the High (H), Low (L), and Close (C) values from the 'stockSnapshot.prevDay' object within the provided 'polygonStockJsonString'.

Follow these calculation formulas precisely:
1.  Pivot Point (PP) = (prevDay.h + prevDay.l + prevDay.c) / 3
2.  Resistance 1 (R1) = (2 * PP) - prevDay.l
3.  Support 1 (S1) = (2 * PP) - prevDay.h
4.  Resistance 2 (R2) = PP + (prevDay.h - prevDay.l)
5.  Support 2 (S2) = PP - (prevDay.h - prevDay.l)
6.  Resistance 3 (R3) = prevDay.h + 2 * (PP - prevDay.l)
7.  Support 3 (S3) = prevDay.l - 2 * (prevDay.h - PP)

Ensure all calculated values are numbers. If any of the required input values (prevDay.h, prevDay.l, prevDay.c) are missing or not valid numbers in the provided JSON, you MUST output an error structure or indicate calculation failure clearly within the 'pivotLevels' object as specified by the output schema (e.g. by returning zero for all values and logging an issue, though the schema expects numbers). For this task, assume valid numeric inputs will be present.

Polygon Stock Data (JSON String - extract 'stockSnapshot.prevDay.h', 'stockSnapshot.prevDay.l', 'stockSnapshot.prevDay.c'):
\`\`\`json
{{{polygonStockJsonString}}}
\`\`\`

Ticker: {{{ticker}}}

Output the results strictly in the following JSON format, ensuring all fields are populated with numerical values:
{
  "pivotLevels": {
    "PP": <calculated_PP_value>,
    "S1": <calculated_S1_value>,
    "S2": <calculated_S2_value>,
    "S3": <calculated_S3_value>,
    "R1": <calculated_R1_value>,
    "R2": <calculated_R2_value>,
    "R3": <calculated_R3_value>
  }
}
Do not include any other text or explanations outside this JSON structure.
`,
  config: {
    temperature: 0.1,
  },
});

const calculateAiTaFlow = ai.defineFlow(
  {
    name: 'calculateAiTaFlow',
    inputSchema: AiCalculatedTaInputSchema,
    outputSchema: AiCalculatedTaFlowOutputSchema,
  },
  async (input: AiCalculatedTaInput): Promise<AiCalculatedTaFlowOutput> => {
    console.log(`[FLOW:CalculateAiTa:Internal] Entered calculateAiTaFlow for ${input.ticker}. Input polygonStockJsonString (first 200 chars): ${input.polygonStockJsonString.substring(0, 200)}...`);

    const response = await calculateAiTaPrompt(input);
    console.log(`[FLOW:CalculateAiTa:Internal] AI (prompt) response received for ${input.ticker}. Output:`, response.output, 'Usage:', response.usage);

    if (!response.output?.pivotLevels || typeof response.output.pivotLevels.PP !== 'number') {
      console.error(`[FLOW:CalculateAiTa:Internal:Error] AI did not return valid pivot levels for ${input.ticker}. Raw output:`, response.output);
      throw new Error('AI failed to return valid pivot levels for ticker ' + input.ticker + '. Check AI logs.');
    }
    
    // Format pivot levels to two decimal places
    const formattedPivotLevels: PivotLevels = {
        PP: formatToTwoDecimalsOrNull(response.output.pivotLevels.PP)!, // Non-null assertion as schema expects number
        S1: formatToTwoDecimalsOrNull(response.output.pivotLevels.S1)!,
        S2: formatToTwoDecimalsOrNull(response.output.pivotLevels.S2)!,
        S3: formatToTwoDecimalsOrNull(response.output.pivotLevels.S3)!,
        R1: formatToTwoDecimalsOrNull(response.output.pivotLevels.R1)!,
        R2: formatToTwoDecimalsOrNull(response.output.pivotLevels.R2)!,
        R3: formatToTwoDecimalsOrNull(response.output.pivotLevels.R3)!,
    };
    
    const successResult: AiCalculatedTaFlowOutput = {
      calculatedTa: { pivotLevels: formattedPivotLevels },
      usage: response.usage,
    };
    return successResult;
  }
);
