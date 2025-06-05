
# **Product Requirements Document & Detailed Design: StockSage v1.2.11**

*   **Document Version:** 1.2.11
*   **Based on Commit:** #298d8962
*   **Date:** 2025-06-05
*   **Author:** Firebase Studio (AI)
*   **Status:** Baseline for understanding StockSage v1.2.11

## **1. Introduction**

StockSage is an AI-powered web application designed to provide users with stock data analysis and insights. It allows users to input a stock ticker, select an API data source (currently Polygon.io), retrieve relevant market data (including market status, quote snapshot, and technical analysis indicators), and receive AI-generated key takeaways. Users can opt for a standard analysis or an "AI Full Stock Analysis" which automatically triggers a detailed chat-based analysis covering multiple perspectives. Additionally, users can interact with an AI chatbot for more detailed analysis or general financial queries related to the provided stock context or broader market topics. The application emphasizes a user-friendly interface, clear presentation of data, API-driven data integrity, and the integration of generative AI for deeper understanding. A prominent disclaimer regarding the informational nature of AI responses is displayed in the UI. This document details the state of the application as of v1.2.11.

## **2. Goals**

*   **Provide Accessible Stock Analysis:** Enable users to quickly fetch and view stock market status, quote data, and key technical indicators from API data sources.
*   **Deliver AI-Powered Insights:** Offer AI-generated analysis (key takeaways and optional detailed chat analysis) based on fetched API data to help users understand stock data.
*   **Facilitate Interactive Exploration:** Allow users to engage in a contextual chat with an AI assistant regarding stock data and financial topics, based on its general knowledge and provided context.
*   **Ensure Data Integrity (Contextual & API-Driven):** Prioritize fetching market status from API sources to provide a temporal context for all subsequent data and analysis. All stock data is sourced from APIs.
*   **Offer User-Friendly Interface:** Present information clearly using modern UI components and design principles, including light/dark theme support, appropriate content area sizing, and clear versioning.
*   **Maintain User Awareness:** Clearly communicate that AI-generated content is for informational purposes and not financial advice via UI disclaimers.
*   **Enable Comprehensive Debugging:** Provide extensive client-side logging and a powerful debug console to facilitate rapid troubleshooting and development.
*   **Establish a Stable Foundation:** Maintain a reliable v1.2.11 platform for future enhancements.

## **3. Target Audience**

*   **Retail Investors:** Individuals looking for tools to supplement their stock research and gain quick insights.
*   **Financial Enthusiasts & Learners:** Users interested in understanding stock data, technical analysis, and AI applications in finance.
*   **Traders (Novice to Intermediate):** Individuals seeking a quick overview of a stock's recent performance and potential short-term indicators, with options for deeper AI-driven analysis.
*   **Developers & AI Assistants:** Technical users who need to understand, debug, and extend the application's functionality.

## **4. User Stories (Reflecting v1.2.11 Functionality)**

*   **As a user, I want to** enter a stock ticker (or use a default) **so that I can** retrieve its latest available market status, quote, and technical analysis data from an API source.
*   **As a user, I want to** choose between a standard analysis (data + key takeaways) or an "AI Full Stock Analysis" (data + key takeaways + automated detailed chat analysis) **so that I can** control the depth of immediate AI insight.
*   **As a user, I want to** see the current market status (e.g., open, closed, server time) fetched from the API **so that I can** understand the timeliness and context of the presented data.
*   **As a user, I want to** view the fetched stock data (market status, quote snapshot, TA indicators) in a formatted JSON view **so that I can** inspect the raw information.
*   **As a user, I want to** view AI-generated key takeaways (Price Action, Trend, Volatility, Momentum, Patterns) based *only* on the fetched API data, with sentiment highlighting **so that I can** quickly understand its technical posture.
*   **As a user, I want to** see a clear disclaimer in the UI that AI-generated content is not financial advice **so that I am** constantly reminded of the informational nature of the tool.
*   **As a user, I want to** chat with an AI assistant about the analyzed stock or other financial topics **so that I can** ask follow-up questions and get more detailed explanations (without the AI performing external web searches).
*   **As a user, I want to** have an example prompt to request a "Full Detailed Analysis" in the chat **so that I can** easily ask for a comprehensive multi-faceted response.
*   **As a user, I want to** copy or export the *entire* chat conversation **so that I can** save or share the full interaction.
*   **As a user, I want to** see the application version displayed in the UI **so that I know** which version I am using.
*   **As a user, I want to** view the application content comfortably with increased width for analysis and chat areas.
*   (Other user stories from v1.2.9 regarding themes, data export, debug console remain valid).

## **5. Features - v1.2.11**

### **5.1. Stock Analysis Core**
*   **Ticker Input & API Data Source Selection:** (Unchanged from v1.2.9).
*   **Two-Stage Analysis Process with Optional Third Stage:**
    1.  **Data Fetching:** User initiates analysis (standard or full), triggering `fetchStockDataAction`.
    2.  **AI Key Takeaways:** Upon successful data fetch, `performAiAnalysisAction` automatically generates key takeaways.
    3.  **Automated Full Detailed Chat Analysis (Optional):** If user selected "AI Full Stock Analysis," a "Full Detailed Analysis" chat prompt is automatically submitted to the chatbot using the fresh data and key takeaways.
*   **Data Display & AI Key Takeaways:** (Largely unchanged from v1.2.9, key takeaways UI remains).
*   **Data Export/Copy:** (Unchanged from v1.2.9).

### **5.2. AI Chatbot**
*   **Contextual Chat (No Web Search):** (Unchanged from v1.2.9).
*   **Markdown & Emoji Responses:** (Unchanged from v1.2.9).
*   **Example Prompts:**
    *   Includes existing prompts plus a new "Full Detailed Analysis (Combined)" prompt.
*   **Scope Adherence:** (Unchanged from v1.2.9). The AI system prompt no longer includes the disclaimer about not being financial advice.
*   **Chat History & Full Export/Copy:** Maintains session history. "Copy" and "Export (.md)" buttons now process the *entire* current chat conversation.
*   **Increased Chat Area Height:** Scrollable message area is taller (`h-96`).

### **5.3. User Interface & Experience**
*   **Disclaimer in UI:** Financial advice disclaimer ("⚠️ StockSage is for demonstration purposes only...") is prominently displayed at the top of the main application page and in the footer.
*   **Application Version Display:** Version (e.g., "1.2.11") is displayed in the header of the main page.
*   **Increased Content Width:** Main cards for Stock Analysis and Chatbot are wider (`max-w-5xl`).
*   (Responsive Design, ShadCN, Themes, Toasts, Font remain as in v1.2.9).

### **5.4. Developer Experience & Debugging**
*   (Unchanged from v1.2.9).

## **6. Design & Architecture - v1.2.11**

### **6.1. Tech Stack**
*   (Largely unchanged from v1.2.9. Version numbers in `package.json` may reflect minor updates).

### **6.2. High-Level Overall Diagram (Textual Representation)**
*   (Similar to v1.2.9, with the main difference being the conditional auto-trigger of `handleChatSubmit` from the client after `performAiAnalysisAction` completes, if "AI Full Stock Analysis" was chosen).

### **6.3. Detailed Code & Data Flows**

#### **6.3.1. Stock Analysis (Standard vs. AI Full Stock Analysis)**

1.  **Client Interaction (`StockAnalysisPage.tsx` within `StockAnalysisProvider`):**
    *   User inputs Ticker, selects API Data Source. Clicks "Analyze Stock" OR "AI Full Stock Analysis".
    *   `onClick` handler for the button prepares `FormData`, explicitly setting `analysisType` to `'standard'` or `'fullDetail'`.
    *   `StockAnalysisProvider.submitFetchStockDataForm` is called. This sets `combinedServerState.initiateFullChatAnalysis` and `triggerFullChatAfterAnalysis` based on `analysisType`.
    *   `fetchStockDataAction` is invoked. `analysisStatus` becomes `data_fetching`.

2.  **Server Action (`fetchStockDataAction.ts`):**
    *   Receives `formData` including `analysisType`.
    *   Sets `initiateFullChatAnalysis` in its return state `StockDataFetchState` based on `analysisType`.
    *   (Rest of data fetching logic as in v1.2.9).
    *   Returns `StockDataFetchState`.

3.  **Client Update & AI Key Takeaways Trigger (`StockAnalysisProvider`):**
    *   `useEffect` in `StockAnalysisProvider` processes `stockDataFetchState`.
        *   Sets `triggerFullChatAfterAnalysis` state based on `stockDataFetchState.initiateFullChatAnalysis`.
    *   Another `useEffect` triggers `performAiAnalysisAction` if `analysisStatus: 'data_fetched_analysis_pending'` (as in v1.2.9). `analysisStatus` becomes `analyzing_data`.

4.  **Server Action (`performAiAnalysisAction.ts`):**
    *   (As in v1.2.9, generates key takeaways). Returns `AiAnalysisResultState`.

5.  **Client Update & Potential Auto-Chat Trigger (`StockAnalysisProvider`):**
    *   `useEffect` processes `aiAnalysisResultState`. `analysisStatus` becomes `analysis_complete` or `error_analyzing_data`.
    *   **Crucially, a new `useEffect` in `StockAnalysisProvider` now checks:**
        *   If `triggerFullChatAfterAnalysis` is `true`.
        *   If `combinedServerState.analysisStatus` is `'analysis_complete'` and data is valid.
        *   If `chatFormPending` is `false`.
        *   **If all true:**
            *   Retrieves the "Full Detailed Analysis" prompt text.
            *   Constructs `FormData` for chat (user prompt, stock JSON, analysis summary, chat history).
            *   Calls `submitChatForm` (which invokes `handleChatSubmit` server action).
            *   Resets `triggerFullChatAfterAnalysis` to `false`.
    *   UI re-renders: Stock JSON, AI Key Takeaways update. If auto-chat was triggered, chatbot UI will update.

#### **6.3.2. Chatbot Interaction (`handleChatSubmit` Server Action)**
*   (Unchanged from v1.2.9).

#### **6.3.3. Genkit `analyzeStockData` Flow (`src/ai/flows/analyze-stock-data.ts`)**
*   (Unchanged from v1.2.9).

#### **6.3.4. Genkit `chatFlow` Flow (`src/ai/flows/chat-flow.ts`)**
*   **System Prompt:** The explicit disclaimer regarding "not financial advice" has been **REMOVED**. The AI is now allowed to provide more direct financial insights, relying on the UI disclaimer.
*   (Rest of the flow, including no tools, remains as in v1.2.9).

### **6.4. Key Component Breakdown**
*   **`StockAnalysisPage` (`src/components/stock-analysis-page.tsx`):**
    *   Now includes two analysis buttons: "Analyze Stock" and "AI Full Stock Analysis".
    *   Button click handlers explicitly set `analysisType` in `FormData`.
    *   Main card width increased to `max-w-5xl`.
*   **`Chatbot` (`src/components/chatbot.tsx`):**
    *   Main card width increased to `max-w-5xl`.
    *   Scrollable message area height increased to `h-96`.
    *   "Copy" and "Export (.md)" buttons now use a helper (`formatChatHistoryForExport`) to process the entire chat history. Button labels/tooltips updated.
    *   New "Full Detailed Analysis (Combined)" example prompt button added.
*   **`StockAnalysisProvider` (`src/contexts/stock-analysis-context.tsx`):**
    *   Manages new `triggerFullChatAfterAnalysis` state.
    *   `submitFetchStockDataForm` sets this trigger based on `analysisType`.
    *   Includes logic in `useEffect` to initiate the "Full Detailed Analysis" chat if `triggerFullChatAfterAnalysis` is true and other conditions (successful key takeaways) are met.
    *   Manages `formRef` to allow child components (analysis buttons) to construct `FormData` from the main form.
*   **`src/app/page.tsx`:**
    *   Displays the financial advice disclaimer at the top of the page and in the footer.
    *   Displays the application version (e.g., "1.2.11").

### **6.5. AI Integration (Genkit)**
*   **Prompts:**
    *   `financialChatPrompt` (`src/ai/flows/chat-flow.ts`): System instructions updated to remove the self-imposed disclaimer.
*   (Other Genkit setup remains as per v1.2.9).

### **6.6. Data Services Layer (`src/services/`)**
*   (Unchanged from v1.2.9).

### **6.7. Styling Approach**
*   (Unchanged from v1.2.9, aside from Tailwind class changes for sizing).

### **6.8. Environment Variables**
*   (Unchanged from v1.2.9).

### **6.9. Known Development Challenges & High-Risk Indicators (Pain Points for AI Assistants)**
*   (This section remains crucial for future changes. The v1.2.11 changes did not directly interact with these known high-risk areas.)

### **6.10. AI Coding Assistant Collaboration Process**
*   (This process was followed for v1.2.11 development.)

## **7. Success Metrics (Post v1.2.11 - Potential)**
*   User adoption of the "AI Full Stock Analysis" button.
*   User feedback on the clarity and utility of the full chat export.
*   Continued application stability.

## **8. Future Considerations (Beyond v1.2.11)**
*   (Same as v1.2.9).

## **9. Changelog (PRD Document)**

| Version       | PRD Date                     | Author(s)                     | Summary of Changes                                                                                                                                                                                                                                                                                                                         | Related App Commit |
| :------------ | :--------------------------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| 1.0           | 2024-07-30                   | Firebase Studio (AI) & User | Initial draft of PRD for StockSage v1.0.0 release.                                                                                                                                                                                                                                                                                         | N/A                |
| 1.2.7         | 2024-07-31                   | Firebase Studio (AI)          | Comprehensive PRD for v1.2.7. Added "Detailed Design and Architecture." Included client-side logging and Debug Console.                                                                                                                                                                                                                    | #602e09a8          |
| 1.2.9         | 2025-06-05                   | Firebase Studio (AI)          | **Updated to reflect v1.2.9 stable release.** Key changes: Two-stage stock analysis (API fetch then AI analysis), API-only data sources (Polygon.io), removal of mock data, removal of chatbot web search tools. Updated diagrams and data flows. Added "Known Development Challenges (Pain Points)" (Sec 6.9) and "AI Collaboration Process" (Sec 6.10). | #f61149e6          |
| **1.2.11**    | 2025-06-05                   | Firebase Studio (AI)          | **Updated for v1.2.11 release.** Features: Disclaimer relocated from AI prompts to UI (top & footer); app version in UI; full chat history export/copy; increased UI width & chat height; new "Full Detailed Analysis" example chat prompt; new "AI Full Stock Analysis" button/workflow for sequential data fetch, key takeaways, and auto-triggered detailed chat. | #298d8962          |

