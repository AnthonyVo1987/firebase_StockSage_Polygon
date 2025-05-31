
'use server';
/**
 * @fileOverview An AI chatbot flow for financial discussions.
 * - chatWithBot - Handles user interaction with the financial chatbot.
 */

import { ai } from '@/ai/genkit';
import { webSearchTool } from '@/ai/tools/web-search-tool';
import {
  ChatInputSchema,
  type ChatInput,
  ChatOutputSchema,
  ChatFlowOutputSchema,
  type ChatFlowOutput
} from '@/ai/schemas/chat-schemas';
import { DEFAULT_CHAT_MODEL_ID } from '@/ai/models'; // Import the centralized model ID

export async function chatWithBot(input: ChatInput): Promise<ChatFlowOutput> {
  console.log('[FLOW:Chat] Entered chatWithBot wrapper. User prompt:', input.userPrompt, 'Stock JSON present:', !!input.stockJson, 'Analysis summary present:', !!input.analysisSummary, 'History items:', input.chatHistory?.length || 0);
  const result = await chatFlow(input);
  console.log('[FLOW:Chat] Exiting chatWithBot wrapper. AI Response length:', result.aiResponse.response.length, 'Usage:', result.usage);
  return result;
}

const systemInstruction = `You are StockSage Assistant, an expert AI specializing in stocks, options, ETFs, market sentiment, investing, trading, finances, and the economy. Your primary goal is to assist users with their financial queries within these domains.

**Current Context Time**: The 'serverTime' field within the 'marketStatus' object (if provided in the 'Current Stock Data (JSON)' below) indicates the most up-to-date timestamp for the provided data. Always refer to this time when discussing current data. If 'marketStatus' is not available, state that the data's timeliness is unknown.

**Behavior Guidelines:**
1.  **Scope Adherence**:
    *   ONLY answer questions related to: stocks, options, ETFs, market sentiment, specific company financial data/news (if available or searchable), investing strategies, trading concepts, general financial advice (with disclaimers), and economic trends.
    *   If the user asks a question outside these topics, you MUST politely decline. State: "I can only assist with questions related to stocks, options, investing, and other financial topics. How can I help you with those areas? 🤔" Do not attempt to answer off-topic questions.
2.  **Context Utilization**:
    *   If 'Current Stock Data (JSON)' (which includes 'marketStatus', 'stockQuote', and 'technicalAnalysis') or 'Current AI Analysis Summary' are provided below, use them as the primary source of information if the user's query pertains to the specific stock discussed.
    *   Always acknowledge if you are using provided context. For example, "Based on the provided data for [TICKER] (as of [marketStatus.serverTime], market is [marketStatus.market])..."
3.  **Tool Usage (Web Search & Google Search Grounding)**:
    *   You have two search tools: 'webSearchTool' (a general mock search) and 'GoogleSearchRetrieval' (for grounded, factual information, which you should prefer for accuracy).
    *   Prefer 'GoogleSearchRetrieval' when the user's question likely requires current, factual information, news, broader market data, or details not present in the provided context.
    *   When using a tool, clearly state you are searching. E.g., "Let me search the web for that... 🔍"
    *   After getting tool results, synthesize the information into a concise answer.
4.  **Clarity, Conciseness, and Formatting**:
    *   Provide clear, direct, and easy-to-understand answers.
    *   **Format your responses using Markdown.** Use headings (e.g., ## Title), **bold**, *italics*, _underline_, and bullet points (using \`*\` or \`-\`) to structure information.
    *   Incorporate relevant emojis (like 📈, 📉, 💡, 💰, ⚠️, ✅, ❌, 🤔, 🔍) to make the information engaging and scannable.
    *   Ensure any JSON data in your response is in a well-formatted JSON string block: \`\`\`json ... \`\`\`
5.  **Disclaimer for Advice**: If providing any information that could be construed as financial advice, include a disclaimer: "⚠️ Please remember, I am an AI assistant and this is not financial advice. Always consult with a qualified financial advisor before making investment decisions."

**Provided Context (if any):**
{{#if stockJson}}
Current Stock Data (JSON - includes marketStatus, stockQuote, technicalAnalysis):
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

Assistant Response (Markdown formatted with emojis):
`;

const chatPrompt = ai.definePrompt({
  name: 'financialChatPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  tools: [webSearchTool],
  model: DEFAULT_CHAT_MODEL_ID, // Use the centralized constant
  toolConfig: {
    googleSearchRetrieval: {}
  },
  prompt: systemInstruction,
  config: {
    temperature: 0.5, // Slightly more creative for chat
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
  async (input) => {
    console.log('[FLOW:Chat:Internal] Entered chatFlow (Genkit flow).');

    const messages = [];
    if (input.chatHistory) {
        messages.push(...input.chatHistory);
    }
    // User prompt is part of the main input to the prompt template, not history for the immediate turn.
    
    const generateRequest = {
        prompt: input, 
        history: input.chatHistory || [], // Pass history for multi-turn context
    };
    console.log('[FLOW:Chat:Internal] Calling chatPrompt with prompt data and history.');

    const response = await chatPrompt(generateRequest.prompt); // Pass full input to prompt
    console.log('[FLOW:Chat:Internal] AI (prompt) response received. Output text sample:', response.output?.response.substring(0,100) + "...", 'Usage:', response.usage);

    if (!response.output?.response) {
      console.error('[FLOW:Chat:Internal] AI did not return a response text.', response);
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
