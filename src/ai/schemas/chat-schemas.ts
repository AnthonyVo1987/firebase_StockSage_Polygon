
/**
 * @fileOverview Zod schemas and TypeScript types for the AI chatbot.
 */
import { z } from 'genkit';
import type { UsageReport } from '@/ai/schemas/common-schemas';

export const ChatInputSchema = z.object({
  userPrompt: z.string().min(1, "Prompt cannot be empty.").describe('The user\'s message or question to the chatbot.'),
  stockJson: z.string().optional().describe('Current stock and technical analysis data in JSON format (if available).'),
  analysisSummary: z.string().optional().describe('A summary of the current AI stock analysis (price action, trend, volatility, momentum, patterns).'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
        text: z.string().optional(),
        toolCall: z.any().optional(), // Simplified for history
        toolResponse: z.any().optional(), // Simplified for history
    }))
  })).optional().describe('The history of the conversation so far.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

// AI's direct output within the flow
export const ChatOutputSchema = z.object({
  response: z.string().describe('The AI chatbot\'s textual response to the user.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Flow's output including usage and the AI's response
export const ChatFlowOutputSchema = z.object({
  aiResponse: ChatOutputSchema,
  usage: z.object({ // This matches the structure Genkit provides
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
});
export type ChatFlowOutput = z.infer<typeof ChatFlowOutputSchema>;

// Server action state for the chat
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  usageReport?: UsageReport; // For AI messages
  isError?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  error?: string;
  latestAiUsageReport?: UsageReport; // From the most recent AI call
  timestamp?: number;
}
