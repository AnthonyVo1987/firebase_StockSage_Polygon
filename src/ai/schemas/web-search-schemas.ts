
/**
 * @fileOverview Zod schemas and TypeScript types for the web search tool.
 */
import { z } from 'genkit';

export const WebSearchInputSchema = z.object({
  query: z.string().describe('The search query.'),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export const WebSearchOutputSchema = z.object({
  results: z.array(z.object({
    title: z.string().describe('The title of the search result.'),
    link: z.string().url().describe('The URL of the search result.'),
    snippet: z.string().describe('A brief snippet from the search result.'),
  })).describe('An array of search results, or an empty array if no relevant results are found or if the search is too broad for this mock tool.'),
  summary: z.string().optional().describe('A brief summary of the overall search findings, if applicable.'),
});
export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;
