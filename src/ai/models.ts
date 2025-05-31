
/**
 * @fileOverview Centralized AI model identifiers for Genkit.
 */

// Base Model IDs - directly mapping to Genkit provider model strings
export const GEMINI_2_5_FLASH_PREVIEW_05_20 = 'googleai/gemini-2.5-flash-preview-05-20';
// Add other base model IDs here if needed, e.g., for different providers or versions

// Semantic Model Aliases - map to specific base model IDs
// These are used by the application and can be easily changed here to update models globally.
export const DEFAULT_CHAT_MODEL_ID = GEMINI_2_5_FLASH_PREVIEW_05_20;
export const DEFAULT_DATA_FETCH_MODEL_ID = GEMINI_2_5_FLASH_PREVIEW_05_20;
export const DEFAULT_ANALYSIS_MODEL_ID = GEMINI_2_5_FLASH_PREVIEW_05_20; // Used as default in genkit.ts

// You can also define more specific model aliases if different tasks require different models:
// export const ADVANCED_REASONING_MODEL_ID = 'some-other-model-string';
// export const IMAGE_GENERATION_MODEL_ID = 'googleai/gemini-2.0-flash-exp'; // Example for image gen
