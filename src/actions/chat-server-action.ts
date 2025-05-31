
'use server';

import { chatWithBot } from '@/ai/flows/chat-flow';
import type { ChatInput, ChatState, ChatMessage } from '@/ai/schemas/chat-schemas';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { 
  calculateUsageReport,
  GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
  GEMINI_FLASH_OUTPUT_CHAT_PRICE_USD_PER_MILLION_TOKENS
} from '@/ai/utils/cost-calculator';
import { z } from 'zod';

const ActionInputSchema = z.object({
  userPrompt: z.string().min(1, "Prompt cannot be empty."),
  stockJson: z.string().optional(),
  analysisSummary: z.string().optional(), 
  chatHistoryForValidation: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
        text: z.string().optional(),
    }))
  })).optional(),
});

export async function handleChatSubmit(
  prevState: ChatState,
  formData: FormData
): Promise<ChatState> {
  console.log('[ACTION:Chat] Entered handleChatSubmit. PrevState messages count:', prevState.messages?.length);
  const rawUserPrompt = formData.get('userPrompt') as string | null;
  const stockJson = formData.get('stockJson') as string | undefined;
  const analysisSummary = formData.get('analysisSummary') as string | undefined; 
  const rawChatHistory = formData.get('chatHistory') as string | undefined;
  console.log('[ACTION:Chat] Raw FormData:', { rawUserPrompt, stockJsonPresent: !!stockJson, analysisSummaryPresent: !!analysisSummary, chatHistoryPresent: !!rawChatHistory });


  let aiFlowChatHistory: ChatInput['chatHistory'] = [];
  let uiPreviousMessages: ChatMessage[] = [];

  if (rawChatHistory) {
    try {
      const clientChatHistory: ChatMessage[] = JSON.parse(rawChatHistory);
      uiPreviousMessages = clientChatHistory;
      aiFlowChatHistory = clientChatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      console.log('[ACTION:Chat] Parsed chat history. UI messages count:', uiPreviousMessages.length, 'AI flow history count:', aiFlowChatHistory.length);
    } catch (e) {
      console.error("[ACTION:Chat] Error parsing chat history from FormData:", e);
      uiPreviousMessages = prevState.messages || [];
    }
  } else {
    uiPreviousMessages = prevState.messages || [];
    console.log('[ACTION:Chat] No chat history in FormData, using previous state messages. Count:', uiPreviousMessages.length);
  }


  const validatedFields = ActionInputSchema.safeParse({
    userPrompt: rawUserPrompt,
    stockJson: stockJson,
    analysisSummary: analysisSummary, 
    chatHistoryForValidation: aiFlowChatHistory,
  });

  if (!validatedFields.success) {
    console.warn("[ACTION:Chat] Input Validation Error:", validatedFields.error.flatten().fieldErrors);
    const errorId = crypto.randomUUID();
    const errorMessage: ChatMessage = {
      id: errorId,
      sender: 'ai',
      text: `Error: Prompt validation failed. ${validatedFields.error.flatten().fieldErrors.userPrompt?.[0] || 'Invalid input.'}`,
      timestamp: Date.now(),
      isError: true,
    };
    return {
      messages: [...uiPreviousMessages, errorMessage],
      error: "Invalid prompt.",
      latestAiUsageReport: prevState.latestAiUsageReport,
      timestamp: Date.now(),
    };
  }
  console.log('[ACTION:Chat] Input validation successful. User prompt:', validatedFields.data.userPrompt);

  const { userPrompt } = validatedFields.data;

  const newUserMessageForState: ChatMessage = {
    id: crypto.randomUUID(),
    sender: 'user',
    text: userPrompt,
    timestamp: Date.now(),
  };

  const messagesForUiBeforeAi = [...uiPreviousMessages, newUserMessageForState];

  try {
    const chatInput: ChatInput = {
      userPrompt: userPrompt,
      stockJson: validatedFields.data.stockJson,
      analysisSummary: validatedFields.data.analysisSummary, 
      chatHistory: aiFlowChatHistory,
    };
    console.log('[ACTION:Chat] Calling chatWithBot with input:', chatInput);

    const flowResult = await chatWithBot(chatInput);
    console.log('[ACTION:Chat] chatWithBot flow result:', flowResult);
    
    const aiUsageReport = calculateUsageReport(
      'chatFlow',
      flowResult.usage,
      GEMINI_FLASH_INPUT_PRICE_USD_PER_MILLION_TOKENS,
      GEMINI_FLASH_OUTPUT_CHAT_PRICE_USD_PER_MILLION_TOKENS
    );

    const aiResponseMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'ai',
      text: flowResult.aiResponse.response,
      timestamp: Date.now(),
      usageReport: aiUsageReport,
    };

    const finalState = {
      messages: [...messagesForUiBeforeAi, aiResponseMessage],
      latestAiUsageReport: aiUsageReport,
      timestamp: Date.now(),
    };
    console.log('[ACTION:Chat] Returning successful state. Total messages:', finalState.messages.length);
    return finalState;

  } catch (e) {
    console.error("[ACTION:Chat] Error in handleChatSubmit calling chatFlow:", e);
    const errorMessageContent = e instanceof Error ? e.message : "An unexpected error occurred with the AI.";
    const errorId = crypto.randomUUID();
    const aiErrorMessage: ChatMessage = {
      id: errorId,
      sender: 'ai',
      text: `Sorry, I encountered an error: ${errorMessageContent}`,
      timestamp: Date.now(),
      isError: true,
    };
    const errorState = {
      messages: [...messagesForUiBeforeAi, aiErrorMessage],
      error: `Failed to get response from AI. ${errorMessageContent}`,
      latestAiUsageReport: prevState.latestAiUsageReport,
      timestamp: Date.now(),
    };
    console.error("[ACTION:Chat] Returning error state due to exception. Total messages:", errorState.messages.length);
    return errorState;
  }
}
