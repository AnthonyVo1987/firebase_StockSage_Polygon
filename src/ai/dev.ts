
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-stock-data.ts';
import '@/ai/flows/fetch-stock-data.ts';
import '@/ai/flows/chat-flow.ts'; // Added new chat flow
import '@/ai/tools/web-search-tool.ts'; // Added new web search tool

