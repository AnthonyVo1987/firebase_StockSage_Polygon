
/**
 * @fileOverview Common Zod schemas and TypeScript types used across the application.
 */

// Currently, this file only contains UsageReport, but can be expanded.
export interface UsageReport {
  flowName: string;
  inputTokens: number;
  outputTokens: number;
  contextWindow: number;
  cost: number;
}
