
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { DEFAULT_ANALYSIS_MODEL_ID } from './models'; // Import the centralized model ID

export const ai = genkit({
  plugins: [googleAI()],
  model: DEFAULT_ANALYSIS_MODEL_ID, // Use the centralized constant for the default model
});
