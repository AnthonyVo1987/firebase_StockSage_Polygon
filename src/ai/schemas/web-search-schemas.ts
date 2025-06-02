/**
 * @fileOverview Zod schemas and TypeScript types for the web search tool.
 */
import { z } from 'genkit';

export const WebSearchInputSchema = z.object({
  query: z.string().describe('The search query.'),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

// Changed from a complex object to a simple string
export const WebSearchOutputSchema = z.string().describe("A formatted string summarizing the web search results, including key findings and relevant links if any. If no specific results, a message indicating that.");
export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;
