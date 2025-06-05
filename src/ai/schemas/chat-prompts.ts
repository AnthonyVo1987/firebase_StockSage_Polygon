
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
    promptText: "Based on all the provided stock JSON data and the AI analysis summary, what are the key takeaways specifically for a stock trader looking at this information? Focus on price action, support/resistance if identifiable, volume implications (if data available), and short-term outlook." 
  },
  { 
    id: 'ex_options_takeaways', 
    label: "Options Trader's Key Takeaways (Uses Provided Data)", 
    promptText: "Given the provided stock JSON data and AI analysis summary, what are the key considerations for an options trader? Discuss potential volatility implications and how the current trend might influence options strategies (e.g., bullish, bearish, neutral plays)." 
  },
  { 
    id: 'ex_additional_analysis', 
    label: "Additional Holistic Analysis (5 Points)", 
    promptText: "Please provide 5 additional holistic key takeaways based on all the provided stock data and analysis. You can decide which areas to focus on for these additional points to give a broader perspective." 
  },
];
