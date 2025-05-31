
# **Product Requirements Document: StockSage v1.0.0**

*   **Document Version:** 1.0
*   **Date:** 2024-07-30 <!-- User to update -->
*   **Author:** Firebase Studio (AI) & AnthonyVo1987
*   **Status:** Baseline for v1.0.0 Release

## **1. Introduction**

StockSage is an AI-powered web application designed to provide users with stock data analysis and insights. It allows users to input a stock ticker, retrieve relevant market data (including quote and technical analysis indicators), and receive AI-generated key takeaways. Additionally, users can interact with an AI chatbot for more detailed analysis or general financial queries related to the provided stock context or broader market topics. The application emphasizes a user-friendly interface, clear presentation of data, and the integration of generative AI for deeper understanding.

## **2. Goals**

*   **Provide Accessible Stock Analysis:** Enable users to quickly fetch and view stock quote data and key technical indicators.
*   **Deliver AI-Powered Insights:** Offer AI-generated analysis and takeaways to help users understand stock data.
*   **Facilitate Interactive Exploration:** Allow users to engage in a contextual chat with an AI assistant regarding stock data and financial topics.
*   **Ensure Data Integrity (Contextual):** Prioritize fetching market status to provide a temporal context for all subsequent data and analysis.
*   **Offer User-Friendly Interface:** Present information clearly using modern UI components and design principles.
*   **Establish a Stable Foundation:** Create a reliable v1.0.0 platform for future enhancements and feature additions.

## **3. Target Audience**

*   **Retail Investors:** Individuals looking for tools to supplement their stock research and gain quick insights.
*   **Financial Enthusiasts & Learners:** Users interested in understanding stock data, technical analysis, and AI applications in finance.
*   **Traders (Novice to Intermediate):** Individuals seeking a quick overview of a stock's recent performance and potential short-term indicators.

## **4. User Stories**

*   **As a user, I want to** enter a stock ticker **so that I can** retrieve its latest available quote and technical analysis data.
*   **As a user, I want to** see the current market status (e.g., open, closed, server time) **so that I can** understand the timeliness and context of the presented data.
*   **As a user, I want to** view AI-generated key takeaways about a stock's price action, trend, volatility, momentum, and patterns **so that I can** quickly understand its technical posture.
*   **As a user, I want to** see the sentiment (bullish, bearish, neutral) for each AI takeaway label highlighted with distinct colors **so that I can** easily grasp the AI's assessment.
*   **As a user, I want to** chat with an AI assistant about the analyzed stock or other financial topics **so that I can** ask follow-up questions and get more detailed explanations.
*   **As a user, I want to** receive chat responses formatted with Markdown and emojis **so that they are** easy to read and engaging.
*   **As a user, I want to** have example prompts for the chatbot **so that I can** quickly understand how to interact with it effectively.
*   **As a user, I want to** be able to choose between fetching "live" (best-effort real-time/recent) data or "mock" (AI-generated) data **so that I can** understand the system's capabilities or use it for demonstration.
*   **As a user, I want to** be able to toggle between light and dark themes **so that I can** view the application comfortably.
*   **As a user, I want to** be able to download or copy the displayed stock JSON data and AI analysis **so that I can** use it externally.
*   **As a developer/admin, I want to** access a debug console **so that I can** monitor application logs and diagnose issues.

## **5. Features - v1.0.0**

### **5.1. Stock Analysis Core**
*   **Ticker Input:** Users can input a stock ticker symbol. Defaults to "NVDA" if left blank.
*   **Data Source Selection:**
    *   Polygon.io API: Fetches market status, previous day's close, and selected Technical Analysis (TA) indicators.
    *   Google Gemini 2.5 Flash Preview (AI): AI generates stock quote and TA data, with an option for Google Search grounding for live data.
*   **Analysis Mode:**
    *   **Live Data:** Attempts to fetch the most recent data from the selected source (Polygon API or AI with search).
    *   **Mock Data:** Generates plausible mock data (either via AI or predefined structures if the primary source is Polygon.io but mock mode is selected).
*   **Data Display:**
    *   Presents fetched/generated stock data (market status, quote, TA indicators) in a formatted JSON view.
*   **AI Key Takeaways:**
    *   Displays AI-generated analysis for:
        1.  Stock Price Action
        2.  Trend
        3.  Volatility
        4.  Momentum
        5.  Patterns
    *   Each takeaway label is color-coded based on AI-determined sentiment:
        *   Bullish: Green
        *   Bearish: Red
        *   Neutral: Default text color
*   **Data Export/Copy:** Buttons to download or copy:
    *   Stock Data (JSON, Text, CSV)
    *   AI Key Takeaways (JSON, Text, CSV)
    *   All Page Data (Combined report in JSON, Text, CSV)

### **5.2. AI Chatbot**
*   **Contextual Chat:** The chatbot can utilize the currently displayed stock JSON data and AI analysis summary in its responses if relevant to the user's query.
*   **Markdown & Emoji Responses:** AI responses are formatted using Markdown (bold, italics, lists, etc.) and include relevant emojis for better readability and engagement.
*   **Example Prompts:** Provides users with quick-start prompt buttons:
    *   "Stock Trader's Key Takeaways (Uses Provided Data)"
    *   "Options Trader's Key Takeaways (Uses Provided Data)"
    *   "Additional Holistic Analysis (5 Points)"
*   **Scope Adherence:** The chatbot is instructed to primarily answer questions related to stocks, options, ETFs, market sentiment, investing, trading, finances, and the economy.
*   **Tool Usage:** Utilizes a mock web search tool and Google Search grounding (via Gemini 2.5 Flash) for information retrieval.
*   **Chat History:** Maintains conversation history for the current session.
*   **Export/Copy Chat:** Buttons to copy or export the latest AI response.

### **5.3. User Interface & Experience**
*   **Responsive Design:** Built with Next.js and Tailwind CSS for responsiveness.
*   **ShadCN UI Components:** Utilizes a consistent set of modern UI components.
*   **Theme Toggle:** Allows users to switch between light and dark themes.
*   **Toaster Notifications:** Provides feedback for actions like data fetching, errors, and copy/download operations.
*   **Developer Debug Console:** An on-page console to view application logs (`console.log`, `console.warn`, `console.error`).

### **5.4. Data Fetching & Processing**
*   **Polygon.io Service:**
    *   Fetches market status as a prerequisite.
    *   Fetches previous day's close data.
    *   Fetches Technical Analysis (TA) indicators (RSI-14, EMA-20, SMA-20, MACD) based on current stable configuration.
    *   Implements sequential API calls with a 100ms delay.
*   **Genkit AI Flows:**
    *   `fetchStockDataFlow`: For fetching/generating stock data (quote + TA) via AI.
    *   `analyzeStockDataFlow`: For analyzing the provided stock data and generating key takeaways with sentiment.
    *   `chatFlow`: For handling chatbot interactions.
*   **Server Actions (Next.js):**
    *   `handleAnalyzeStock`: Orchestrates data fetching (from Polygon or AI) and AI analysis.
    *   `handleChatSubmit`: Manages chatbot requests and responses.

## **6. Design & Architecture**

### **6.1. Tech Stack**
*   **Frontend:** Next.js (App Router), React, TypeScript
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **AI Integration:** Genkit (with Google Gemini 2.5 Flash Preview 05-20 model)
*   **Data Source (Primary):** Polygon.io API
*   **Deployment:** Firebase App Hosting (implied)

### **6.2. High-Level Overall Diagram (Textual Representation)**

```
[User Browser] <-> [Next.js Frontend (React Components, UI)]
      |
      |<--- (Client-Side Interactions, Form Submissions) --->|
      |                                                      |
[Next.js Server Actions (e.g., handleAnalyzeStock)] <------> [Genkit AI Flows (e.g., analyzeStockDataFlow)]
      |                                                               |
      |<--- (Data Fetching Requests) ----> [Polygon.io Service]       |<--- (LLM Calls) ---> [Google AI (Gemini)]
                                                 |
                                                 |<--- (API Calls) --> [Polygon.io API]
```

*This can be replaced with a graphical diagram in your version control or documentation system.*

### **6.3. Code & Data Flows (Textual Representation)**

#### **6.3.1. Stock Analysis Data Flow (User Clicks "Analyze Stock")**

1.  **User Interaction (`StockAnalysisPage.tsx`):**
    *   User inputs Ticker, selects Data Source, and clicks "Analyze Stock (Live/Mock)".
    *   Form submission triggers `handleAnalyzeStock` Server Action.

2.  **Server Action (`handleAnalyzeStock.ts`):**
    *   Validates input (ticker, data source, mode).
    *   **If Data Source is "polygon-api" AND Mode is "live":**
        *   Calls `fetchStockDataFromPolygon(ticker)` from `polygon-service.ts`.
        *   `polygon-service.ts` makes sequential calls:
            1.  Market Status API.
            2.  Previous Day Close API.
            3.  Technical Indicators APIs (RSI, EMA, SMA, MACD - current debug config).
        *   Returns combined `stockJson` (stringified JSON with marketStatus, stockQuote, technicalAnalysis).
    *   **If Data Source is "ai-gemini..." OR Mode is "mock":**
        *   Calls `fetchStockData({ ticker, forceMock })` Genkit flow (`fetch-stock-data.ts`).
        *   `fetch-stock-data.ts` (Genkit Flow):
            *   Uses `fetchStockDataPromptDefinition`.
            *   If `forceMock` is true, or if live data retrieval via Google Search tool fails, AI generates mock JSON (quote + TA).
            *   If `forceMock` is false, AI attempts to use Google Search tool to find live data and then formats it into the required JSON structure (quote + TA).
            *   **Note for v1.0.0:** The AI-generated data in `fetchStockDataFlow` does *not* explicitly include `marketStatus` in the same way `polygon-service.ts` does. The `timestamp` in `stockQuote` is AI-generated or based on search results.
        *   Returns `stockJson`.
    *   **Error Handling:** If data fetching fails (e.g., market status from Polygon fails, or AI returns invalid data), an error state is returned to the client.
    *   **AI Analysis Call:**
        *   Calls `analyzeStockData({ stockData: stockJson })` Genkit flow (`analyze-stock-data.ts`).
        *   `analyze-stock-data.ts` (Genkit Flow):
            *   Uses `analyzeStockDataPrompt`.
            *   AI analyzes `stockJson` and returns structured takeaways (price action, trend, volatility, momentum, patterns) **with sentiment** for each.
    *   Returns `StockAnalysisState` (including `stockJson`, `analysis`, usage reports, errors) to the client.

3.  **UI Update (`StockAnalysisPage.tsx`):**
    *   `useActionState` updates the component state.
    *   Stock JSON data is displayed.
    *   AI Key Takeaway labels are displayed with sentiment-based colors.
    *   Chatbot component receives updated `stockJson` and `analysis` as props.

*This can be replaced with a graphical data flow diagram.*

#### **6.3.2. Chatbot Interaction Data Flow**

1.  **User Interaction (`Chatbot.tsx`):**
    *   User types a prompt or clicks an example prompt button.
    *   Form submission (with `userPrompt`, current `stockJson`, `analysisSummary`, and `chatHistory`) triggers `handleChatSubmit` Server Action.

2.  **Server Action (`handleChatSubmit.ts`):**
    *   Validates input (`userPrompt`).
    *   Prepares `ChatInput` for the Genkit flow.
    *   Calls `chatWithBot(chatInput)` Genkit flow (`chat-flow.ts`).
    *   `chat-flow.ts` (Genkit Flow):
        *   Uses `financialChatPrompt` with Gemini 2.5 Flash model.
        *   System prompt instructs AI on persona, scope, context utilization (stockJson, analysisSummary, history), tool usage (webSearchTool, GoogleSearchRetrieval), and Markdown formatting.
        *   AI generates a response.
    *   Returns `ChatState` (including updated messages, AI usage report, errors) to the client.

3.  **UI Update (`Chatbot.tsx`):**
    *   `useActionState` updates the component state.
    *   New user message and AI response (formatted with ReactMarkdown) are appended to the chat display.

*This can be replaced with a graphical data flow diagram.*

## **7. Success Metrics (Post v1.0.0 Launch - Potential)**

*   **User Engagement:**
    *   Number of stock analyses performed per user session.
    *   Number of chatbot interactions per user session.
    *   Usage of example chat prompts.
*   **Feature Adoption:**
    *   Distribution of data source selection (Polygon vs. AI).
    *   Distribution of analysis mode (Live vs. Mock).
*   **Stability & Performance:**
    *   Rate of successful vs. failed API calls (Polygon, AI).
    *   Client-side error rate.
    *   Page load times.
*   **Qualitative Feedback:** User comments on clarity, usefulness, and accuracy.

## **8. Future Considerations (Beyond v1.0.0)**

*   **Data Source Abstraction Refactor:** Implement the planned modular architecture for data source adapters.
*   **AI Model Abstraction Refactor:** Implement a system for selecting and routing to different AI models with adapters.
*   **Additional Data Sources:** Integrate more broker APIs or financial data providers.
*   **Expanded AI Models:** Add support for models from OpenAI, Anthropic, etc.
*   **Advanced Charting:** Integrate interactive charts for stock prices and technical indicators.
*   **User Accounts & Personalization:** Allow users to save preferences, favorite stocks, etc.
*   **Real-time Data Streaming:** Explore options for more real-time data updates.
*   **Enhanced Error Handling & User Guidance:** Provide more specific error messages and recovery options.
*   **Image Generation for Reports:** Potentially use AI to generate summary charts or visual elements.

## **9. Changelog (PRD Document)**

| Version | Date                | Author(s)                             | Summary of Changes                                  |
| :------ | :------------------ | :------------------------------------ | :-------------------------------------------------- |
| 1.0     | 2024-07-30 <!-- User to update --> | Firebase Studio (AI) & AnthonyVo1987 | Initial draft of PRD for StockSage v1.0.0 release. |

