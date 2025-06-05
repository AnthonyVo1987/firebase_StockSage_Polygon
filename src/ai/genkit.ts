
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {genkitPluginNextjs} from '@genkit-ai/next'; // REMOVED for v1.2.9 (to revert async_hooks troubleshooting)
import { DEFAULT_ANALYSIS_MODEL_ID } from './models'; 

export const ai = genkit({
  plugins: [
    // genkitPluginNextjs(), // REMOVED for v1.2.9
    googleAI(),
  ],
  model: DEFAULT_ANALYSIS_MODEL_ID, 
});
