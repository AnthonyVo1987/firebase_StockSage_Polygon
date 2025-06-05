
'use server';
/**
 * @fileOverview An AI chatbot flow for financial discussions.
 * - chatWithBot - Handles user interaction with the financial chatbot.
 * Web search tools have been removed. Chatbot relies on provided context and general knowledge.
 */

import { ai } from '@/ai/genkit';
// webSearchTool import removed
import {
  ChatInputSchema,
  type ChatInput,
  ChatOutputSchema,
  ChatFlowOutputSchema,
  type ChatFlowOutput
} from '@/ai/schemas/chat-schemas';
import { DEFAULT_CHAT_MODEL_ID } from '@/ai/models';

export async function chatWithBot(input: ChatInput): Promise<ChatFlowOutput> {
  console.log('[FLOW:Chat] Entered chatWithBot wrapper. User prompt:', input.userPrompt, 'Stock JSON present:', !!input.stockJson, 'Analysis summary present:', !!input.analysisSummary, 'History items:', input.chatHistory?.length || 0);
  const result = await chatFlow(input);
  console.log('[FLOW:Chat] Exiting chatWithBot wrapper. AI Response length:', result.aiResponse.response.length, 'Usage:', result.usage);
  return result;
}

const systemInstruction = `You are StockSage Assistant, an expert AI specializing in stocks, options, ETFs, market sentiment, investing, trading, finances, and the economy. Your primary goal is to assist users with their financial queries within these domains.

**Current Context Time**:
- The 'marketStatus.serverTime' and 'stockSnapshot.updated' fields (if provided in 'Current Stock Data (JSON)' below) indicate the most up-to-date timestamps and are in Pacific Time (hh:mm:ss AM/PM format).
- Prefer 'stockSnapshot.updated' (PT) for questions about the current trading day's data.
- Do NOT explicitly state if the market is "open" or "closed" unless directly asked or critical for explaining a specific data point. Assume the user is generally aware and focus on the implications of the data itself.

**Behavior Guidelines:**
1.  **Scope Adherence**:
    *   ONLY answer questions related to: stocks, options, ETFs, market sentiment, specific company financial data/news (if available in provided context), investing strategies, trading concepts, general financial advice (with disclaimers), and economic trends.
    *   If the user asks a question outside these topics, you MUST politely decline. State: "I can only assist with questions related to stocks, options, investing, and other financial topics. How can I help you with those areas? 🤔"
2.  **Context Utilization**:
    *   If 'Current Stock Data (JSON)' (which includes 'marketStatus', 'stockSnapshot' (containing 'day', 'min', 'prevDay' objects with timestamps in PT format), and 'technicalAnalysis' including 'vwap') or 'Current AI Analysis Summary' are provided below, use them as the primary source.
    *   'stockSnapshot.day' and 'stockSnapshot.min' provide current day's intraday data (OHLCV, VWAP, changes).
    *   'stockSnapshot.prevDay' provides the previous trading day's aggregate data (OHLCV, VWAP).
    *   'technicalAnalysis.vwap' contains VWAP data derived from the snapshot ('day' and 'minute').
    *   Always acknowledge if you are using provided context. For example, "Based on the provided data for [TICKER] (snapshot updated at [stockSnapshot.updated PT], previous close was [stockSnapshot.prevDay.c])..."
    *   **When your response is based on the 'Current Stock Data (JSON)' or 'Current AI Analysis Summary' provided in the context, your analysis MUST be strictly limited to the information present in that data. Do NOT speculate on or introduce external factors, news, or catalysts not explicitly mentioned in the provided context.**
    *   **Do NOT use web search tools to find information. Rely on your general knowledge or the provided context only.**
3.  **Clarity, Conciseness, and Formatting**:
    *   Provide clear, direct, and easy-to-understand answers.
    *   **Format responses using Markdown.** Use headings, **bold**, *italics*, _underline_, and bullet points.
    *   Incorporate relevant emojis (📈, 📉, 💡, 💰, ⚠️, ✅, ❌, 🤔).
    *   Ensure JSON data in responses is in a well-formatted JSON string block.
4.  **Disclaimer for Advice**: If providing information that could be financial advice, include: "⚠️ Please remember, I am an AI assistant and this is not financial advice. Always consult with a qualified financial advisor."

**Provided Context (if any):**
{{#if stockJson}}
Current Stock Data (JSON - includes marketStatus, stockSnapshot (with day, min, prevDay), and technicalAnalysis with vwap. Timestamps like 'marketStatus.serverTime' and 'stockSnapshot.updated' are in Pacific Time hh:mm:ss AM/PM format.):
\`\`\`json
{{{stockJson}}}
\`\`\`
{{/if}}

{{#if analysisSummary}}
Current AI Analysis Summary:
{{{analysisSummary}}}
{{/if}}

{{#if chatHistory.length}}
Previous Conversation:
{{#each chatHistory}}
{{this.role}}: {{this.parts.0.text}}
{{/each}}
{{/if}}

User's Question: {{{userPrompt}}}

You MUST output your response as a valid JSON object with a single key "response". The value of this "response" key MUST be your complete, Markdown-formatted message.
For example:
{
  "response": "**This is an example response.**\\n\\n*   It uses Markdown.\\n*   It includes emojis like 💡."
}

The output MUST be ONLY the JSON object itself, ensure there are no leading or trailing characters or text outside the JSON structure.
Ensure the JSON is perfectly valid. For example, ensure all strings within the JSON are properly escaped if they contain special characters (like quotes or newlines). The Markdown content for the "response" value should be a single string, potentially with escaped newlines (\\\\n).

JSON Output:
`;

const chatPrompt = ai.definePrompt({
  name: 'financialChatPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  // tools and toolConfig removed
  model: DEFAULT_CHAT_MODEL_ID,
  prompt: systemInstruction,
  config: {
    temperature: 0.5,
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatFlowOutputSchema,
  },
  async (input: ChatInput): Promise<ChatFlowOutput> => {
    console.log('[FLOW:Chat:Internal] Entered chatFlow (Genkit flow). Input keys:', Object.keys(input));
    console.log('[FLOW:Chat:Internal] Calling chatPrompt with the full input object. No tools configured.');

    const response = await chatPrompt(input);
    console.log('[FLOW:Chat:Internal:AIResponse] AI (prompt) response received. Output text sample:', response.output?.response.substring(0,100) + "...", 'Usage:', response.usage);

    if (!response.output?.response) {
      console.error('[FLOW:Chat:Internal:Error] AI did not return a response text.', response);
      return {
        aiResponse: { response: "I'm sorry, I encountered an issue and couldn't process your request. Please try again. 😥" },
        usage: response.usage,
      };
    }
    
    const successResult = {
      aiResponse: response.output,
      usage: response.usage,
    };
    return successResult;
  }
);
