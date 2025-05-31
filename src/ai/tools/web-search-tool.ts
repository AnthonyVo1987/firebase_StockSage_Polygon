
/**
 * @fileOverview A mock web search tool for the AI chatbot.
 */

import { ai } from '@/ai/genkit';
import { 
  WebSearchInputSchema, 
  type WebSearchInput, 
  WebSearchOutputSchema, 
  type WebSearchOutput 
} from '@/ai/schemas/web-search-schemas'; // Updated import

export const webSearchTool = ai.defineTool(
  {
    name: 'webSearchTool',
    description: 'Performs a web search for topics related to stocks, options, ETFs, market sentiments, investing, trading, finances, or the economy. Use this to find current information, news, or general knowledge on these topics. Be specific with your query.',
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
  },
  async (input: WebSearchInput): Promise<WebSearchOutput> => {
    console.log(`Mock Web Search Tool: Received query - "${input.query}"`);
    // Simulate a web search with mock data
    // This is a very basic mock. In a real scenario, this would call a search API.
    if (input.query.toLowerCase().includes('nvda price target')) {
      return {
        results: [
          {
            title: 'Analysts Bullish on NVDA: New Price Targets Emerge',
            link: 'https://mocknews.example.com/nvda-price-target',
            snippet: 'Several analysts have recently updated their price targets for NVIDIA (NVDA), citing strong AI demand and upcoming product cycles. Average target now sits around $130.'
          },
          {
            title: 'NVIDIA (NVDA) Stock Forecast & Predictions - TipRanks',
            link: 'https://mocktipranks.example.com/nvda-forecast',
            snippet: 'Based on 38 Wall Street analysts offering 12-month price targets for NVIDIA in the last 3 months. The average price target is $125.50 with a high forecast of $150.00 and a low forecast of $90.00.'
          }
        ],
        summary: 'Recent analyst updates suggest a positive outlook for NVDA, with price targets generally ranging from $90 to $150, averaging around $125-$130.'
      };
    }
    if (input.query.toLowerCase().includes('market sentiment today')) {
        return {
            results: [
                {
                    title: 'Market Wrap: Stocks Mixed Amid Inflation Jitters - MockFinance',
                    link: 'https://mockfinance.example.com/market-wrap',
                    snippet: 'US stock markets showed mixed performance today as investors digested new inflation data. Tech stocks saw some pressure while energy shares gained. Overall sentiment is cautious.'
                }
            ],
            summary: 'Today\'s market sentiment appears cautious and mixed, influenced by recent inflation data.'
        }
    }
     if (input.query.toLowerCase().includes('what are call options')) {
        return {
            results: [
                {
                    title: 'Call Option Explained: Definition, How It Works, Examples - Investopedia Mock',
                    link: 'https://mockinvestopedia.example.com/call-option',
                    snippet: 'A call option is a contract that gives the buyer the right, but not the obligation, to buy a stock, bond, commodity, or other asset or instrument at a specified price within a specific time period.'
                }
            ],
            summary: 'A call option provides the right to buy an asset at a set price by a certain date.'
        }
    }

    // Generic fallback for other queries within scope
    const relatedKeywords = ["stock", "option", "etf", "market", "invest", "trading", "finance", "economic", "company", "sec"];
    if (relatedKeywords.some(kw => input.query.toLowerCase().includes(kw))) {
        return {
            results: [
                {
                    title: `Mock Search Result for "${input.query}"`,
                    link: `https://mocksearch.example.com/search?q=${encodeURIComponent(input.query)}`,
                    snippet: `This is a simulated search result for your query about ${input.query}. In a real application, this would contain relevant information from the web.`
                }
            ],
            summary: `Mock search results for "${input.query}" indicate it's a topic that can be explored further.`
        };
    }

    // If the query is too generic or seems out of mock scope
    return {
      results: [],
      summary: `No specific mock results found for "${input.query}". Try a more specific financial query.`
    };
  }
);
