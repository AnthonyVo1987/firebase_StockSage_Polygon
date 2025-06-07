
/**
 * @fileOverview Defines the structure and content for chatbot example prompts.
 */

export interface ExamplePrompt {
  id: string;
  label: string;
  promptText: string;
}

export const examplePrompts: ExamplePrompt[] = [
  { 
    id: 'ex_stock_takeaways', 
    label: "Stock Trader's Key Takeaways (Uses Provided Data)", 
    promptText: "Based on all the provided stock JSON data and the AI analysis summary, what are up to three key takeaways specifically for a stock trader looking at this information? Focus on price action, support/resistance if identifiable, volume implications (if data available), and short-term outlook. Please provide them as distinct points if multiple." 
  },
  { 
    id: 'ex_options_takeaways', 
    label: "Options Trader's Key Takeaways (Uses Provided Data)", 
    promptText: "Given the provided stock JSON data and AI analysis summary, what are up to three key considerations for an options trader? Discuss potential volatility implications and how the current trend might influence options strategies (e.g., bullish, bearish, neutral plays). Please provide them as distinct points if multiple." 
  },
  { 
    id: 'ex_additional_analysis', 
    label: "Additional Holistic Analysis (3 Points)", 
    promptText: "Please provide three additional holistic key takeaways based on all the provided stock data and analysis. You can decide which areas to focus on for these additional points to give a broader perspective." 
  },
  {
    id: 'ex_full_detailed_analysis',
    label: 'Full Detailed Analysis (Combined)',
    promptText: `Based on all the provided stock JSON data and the AI analysis summary, please provide a comprehensive "Full Detailed Analysis". This single response should include:
1. Up to three key takeaways specifically for a stock trader (focus on price action, support/resistance if identifiable, volume implications, and short-term outlook). Please provide them as distinct points if multiple.
2. Up to three key considerations for an options trader (discuss potential volatility implications and how the current trend might influence options strategies like bullish, bearish, or neutral plays). Please provide them as distinct points if multiple.
3. Three additional holistic key takeaways to give a broader perspective on the stock's situation.
Ensure your entire response is well-structured and easy to read.`
  },
];

