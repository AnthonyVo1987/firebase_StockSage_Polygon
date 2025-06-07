
# **Product Requirements Document & Detailed Design: StockSage v1.2.12**

*   **Document Version:** 1.2.12
*   **Based on Commit:** [NEW_COMMIT_HASH_FOR_V1.2.12] <!-- To be filled with actual commit hash -->
*   **Date:** 2025-06-06 <!-- Updated Date -->
*   **Author:** Firebase Studio (AI)
*   **Status:** Current PRD - Single Source of Truth

---
**PRD Management Note:** This `README.md` file serves as the sole, canonical Product Requirements Document (PRD) for StockSage. All sections are intended to be complete and self-contained. When updating this PRD for new versions, ensure all relevant details are included directly within this document, without referencing previous PRD versions or external documents for brevity.
---

## **1. Introduction**

StockSage is an AI-powered web application designed to provide users with stock data analysis and insights. It allows users to input a stock ticker, select an API data source (currently Polygon.io), retrieve relevant market data (including market status, quote snapshot, and technical analysis indicators including AI-calculated Pivot Points), and receive AI-generated key takeaways. Users can opt for a standard analysis or an "AI Full Stock Analysis" which automatically triggers a detailed chat-based analysis covering multiple perspectives. Additionally, users can interact with an AI chatbot for more detailed analysis or general financial queries related to the provided stock context or broader market topics. The application emphasizes a user-friendly interface, clear presentation of data (with consistent numerical formatting), API-driven data integrity, and the integration of generative AI for deeper understanding. A prominent disclaimer regarding the informational nature of AI responses is displayed in the UI. This document details the state of the application as of v1.2.12.

## **2. Goals**

*   **Provide Accessible Stock Analysis:** Enable users to quickly fetch and view stock market status, quote data, and key technical indicators (including AI-calculated ones) from API data sources, with improved form submission (Enter key).
*   **Deliver AI-Powered Insights:** Offer AI-generated analysis (key takeaways and optional detailed chat analysis) based on fetched API data to help users understand stock data, with enhanced formatting for clarity (two decimal places, dollar prefixes).
*   **Facilitate Interactive Exploration:** Allow users to engage in a contextual chat with an AI assistant regarding stock data and financial topics, with improved robustness and completeness of comprehensive chat responses.
*   **Ensure Data Integrity (Contextual & API-Driven):** Prioritize fetching market status from API sources to provide a temporal context for all subsequent data and analysis. All stock data is sourced from APIs.
*   **Offer User-Friendly Interface:** Present information clearly using modern UI components and design principles, including light/dark theme support, appropriate content area sizing, and clear versioning. Numerical data presentation is standardized.
*   **Maintain User Awareness:** Clearly communicate that AI-generated content is for informational purposes and not financial advice via UI disclaimers.
*   **Enable Comprehensive Debugging:** Provide extensive client-side logging and a powerful debug console to facilitate rapid troubleshooting and development.
*   **Establish a Stable Foundation:** Maintain a reliable v1.2.12 platform for future enhancements.

## **3. Target Audience**

*   **Retail Investors:** Individuals looking for tools to supplement their stock research and gain quick insights.
*   **Financial Enthusiasts & Learners:** Users interested in understanding stock data, technical analysis, and AI applications in finance.
*   **Traders (Novice to Intermediate):** Individuals seeking a quick overview of a stock's recent performance and potential short-term indicators, with options for deeper AI-driven analysis.
*   **Developers & AI Assistants:** Technical users who need to understand, debug, and extend the application's functionality.

## **4. User Stories (Reflecting v1.2.12 Functionality)**

*   **As a user, I want to** enter a stock ticker (or use a default) **so that I can** retrieve its latest available market status, quote, and technical analysis data (including AI-calculated TA) from an API source.
*   **As a user, I want to** submit the analysis form by pressing the Enter key in the stock ticker input field **so that I don't always have to click the "Analyze Stock" button.**
*   **As a user, I want to** choose between a standard analysis (data + key takeaways) or an "AI Full Stock Analysis" (data + key takeaways + automated detailed chat analysis) **so that I can** control the depth of immediate AI insight.
*   **As a user, I want to** see the current market status (e.g., open, closed, server time) fetched from the API **so that I can** understand the timeliness and context of the presented data.
*   **As a user, I want to** view the fetched stock data (market status, quote snapshot, TA indicators, AI-calculated TA) in a formatted JSON view **so that I can** inspect the raw information.
*   **As a user, I want to** view AI-generated key takeaways (Price Action, Trend, Volatility, Momentum, Patterns) based *only* on the fetched API data (including AI TA), with sentiment highlighting **so that I can** quickly understand its technical posture.
*   **As a user, I want to** see all numerical financial data (prices, changes, AI TA values) presented consistently with a maximum of two decimal places **so that the data is clear and easy to compare.**
*   **As a user, I want to** see all monetary values clearly marked with a dollar sign ($) in AI analyses and chat responses **so that I can easily identify them.**
*   **As a user, I want to** see a clear disclaimer in the UI that AI-generated content is not financial advice **so that I am** constantly reminded of the informational nature of the tool.
*   **As a user, I want to** chat with an AI assistant about the analyzed stock or other financial topics **so that I can** ask follow-up questions and get more detailed explanations (without the AI performing external web searches), with responses being more complete for comprehensive requests.
*   **As a user, I want to** have an example prompt to request a "Full Detailed Analysis" in the chat that requests a manageable amount of information per section **so that I can** easily ask for a comprehensive multi-faceted response.
*   **As a user, I want to** copy or export the *entire* chat conversation **so that I can** save or share the full interaction.
*   **As a user, I want to** see the application version displayed in the UI **so that I know** which version I am using.
*   **As a user, I want to** view the application content comfortably with increased width for analysis and chat areas.
*   **As a user, I want to** be able to toggle between light and dark themes **so that I can** view the application comfortably.
*   **As a user, I want to** be able to download or copy the fetched stock data (full JSON), AI-calculated Technical Analysis (JSON), and AI Key Takeaways in various formats (JSON, Text, CSV) **so that I can** use this information externally or for record-keeping.
*   **As a developer or admin, I want to** access an in-app debug console **so that I can** monitor client-side application logs, filter them by type or category, and export them for troubleshooting and development purposes.

## **5. Features - v1.2.12**

### **5.1. Stock Analysis Core**
*   **Ticker Input & API Data Source Selection:** User inputs ticker and selects API source (Polygon.io).
*   **Form Submission:**
    *   Analysis can be initiated by clicking specific analysis buttons ("Analyze Stock", "AI Full Stock Analysis").
    *   **Enter Key Submission:** Pressing Enter in the ticker input field now submits the form for a 'standard' analysis, preventing a full page refresh.
*   **Two-Stage Analysis Process with Optional Third Stage:**
    1.  **Data Fetching:** User initiates analysis (standard or full), triggering `fetchStockDataAction`. This action now also implicitly triggers the AI-calculated TA after successful Polygon data fetch.
    2.  **AI-Calculated TA:** Upon successful primary data fetch from Polygon, `calculateAiTaAction` automatically calculates indicators like Pivot Points. These values are formatted to a maximum of two decimal places.
    3.  **AI Key Takeaways:** Upon successful AI TA calculation, `performAiAnalysisAction` automatically generates key takeaways. The AI is instructed to use a maximum of two decimal places for numerical values and prefix monetary values with "$".
    4.  **Automated Full Detailed Chat Analysis (Optional):** If user selected "AI Full Stock Analysis," a "Full Detailed Analysis" chat prompt is automatically submitted to the chatbot using the fresh data, AI TA, and key takeaways.
*   **Data Display:**
    *   Fetched stock data (market status, quote snapshot, standard TA indicators) displayed in formatted JSON.
    *   AI-Calculated Technical Indicators (e.g., Pivot Points) displayed in a separate formatted JSON view, with values rounded to two decimal places.
*   **AI Key Takeaways:** Displayed with sentiment highlighting. AI is instructed on numerical formatting (two decimals, $ prefix).
*   **Data Export/Copy:** Functionality to export/copy fetched data, AI TA, and key takeaways in various formats (JSON, Text, CSV).

### **5.2. AI Chatbot**
*   **Contextual Chat (No Web Search):** Chatbot uses provided stock data, AI analysis summary, AI TA data, and chat history for context. No external web searches are performed.
*   **Markdown & Emoji Responses:** AI responses are formatted using Markdown, including emojis.
*   **Example Prompts:**
    *   Includes existing prompts, with the "Full Detailed Analysis (Combined)" prompt refined to request "up to three" key takeaways for stock/options trader sections to improve response completeness.
*   **Monetary Value Formatting:** AI is instructed to prefix monetary values with a dollar sign ($) and use a maximum of two decimal places.
*   **Response Robustness:**
    *   `maxOutputTokens` for the chat prompt is explicitly set to `4096`.
    *   Safety settings adjusted to `BLOCK_ONLY_HIGH` for all harm categories.
    *   Temperature lowered to `0.2` for more focused responses.
    *   System prompt includes an instruction for the AI to ensure completeness when addressing multi-part questions.
*   **Chat History & Full Export/Copy:** Maintains session history. "Copy" and "Export (.md)" buttons process the *entire* current chat conversation.
*   **Increased Chat Area Height:** Scrollable message area is `h-96`.

### **5.3. User Interface & Experience**
*   **Disclaimer in UI:** Financial advice disclaimer ("⚠️ StockSage is for demonstration purposes only...") is prominently displayed at the top of the main application page and in the footer.
*   **Application Version Display:** Version (e.g., "1.2.12") is displayed in the header of the main page.
*   **Increased Content Width:** Main cards for Stock Analysis and Chatbot are `max-w-5xl`.
*   **Responsive Design:** Application adapts to various screen sizes.
*   **ShadCN UI Components:** Utilizes ShadCN components for a modern look and feel.
*   **Light/Dark Theme Support:** User-selectable light and dark themes.
*   **Toasts:** Provides user feedback for actions and errors via toast notifications.
*   **Font:** Uses 'Inter' font for readability.

### **5.4. Developer Experience & Debugging**
*   **Client-Side Logging:** Extensive logging implemented using `console.log`, `console.warn`, `console.error` with specific prefixes (e.g., `[CLIENT:Component]`, `[CONTEXT_REQUEST]`) to trace application flow and state changes.
*   **Debug Console:**
    *   An in-app, toggleable console displays all client-side logs.
    *   Features include: search, filtering by log type/category (e.g., Server Actions, Context Updates, UI Renders), clear log, export log (JSON, TXT, CSV), copy log.
    *   Console messages show timestamp, type (log, warn, error), and content.
    *   Docked at the bottom of the screen, does not overlap main content when open (main content area padding adjusts).

## **6. Design & Architecture - v1.2.12**

### **6.1. Tech Stack**
*   **Frontend:** Next.js (v15.3.3) with React (v18.3.1), TypeScript.
*   **UI Components:** ShadCN UI, Lucide React icons.
*   **Styling:** Tailwind CSS (v3.4.1).
*   **AI Integration:** Genkit (v1.8.0) with Google AI (Gemini 2.5 Flash Preview 05-20).
*   **State Management:** React Context API (`StockAnalysisProvider`) combined with `useActionState` for server action states.
*   **Data Fetching (API Client):** Polygon.io client-js (`@polygon.io/client-js` v7.3.2) for market data.
*   **Deployment:** Firebase App Hosting.
*   **Build Tooling:** Next.js CLI with Turbopack.
*   **Linting/Formatting:** ESLint, Prettier (implied by Next.js standards).
*   **Environment Variables:** Managed via `.env` for local and `apphosting.yaml` (referencing Secret Manager) for deployed environments.

### **6.2. High-Level Overall Diagram (Textual Representation)**

```
+-------------------------+      +-------------------------+      +-----------------------+
| Client (Next.js/React)  |----->| Next.js Server Actions  |<---->| Genkit AI Flows       |
| (StockAnalysisPage.tsx, |      | (analyze-stock-server,  |      | (analyze-stock-data,  |
|  Chatbot.tsx,           |      |  perform-ai-analysis,   |      |  calculate-ai-ta,     |
|  StockAnalysisProvider) |      |  calculate-ai-ta,       |      |  chat-flow)           |
+-------------------------+      |  chat-server-action)    |      +-----------------------+
           |                     +-------------------------+                |
           |                                   |                            | (Calls Gemini API)
           |                                   |                            |
           v                                   v                            v
+-------------------------+      +-------------------------+      +-----------------------+
| UI Components (ShadCN)  |      | Data Services           |<---->| External APIs         |
| (Input, Button, Card..) |      | (PolygonAdapter)        |      | (Polygon.io,         |
+-------------------------+      +-------------------------+      |  Google AI Platform)  |
                                                                  +-----------------------+
```

*   **Client:** Handles user input, displays data and AI insights, manages local UI state and triggers server actions via `StockAnalysisProvider`.
*   **Next.js Server Actions:** Encapsulate server-side logic for fetching data from APIs (`fetchStockDataAction`), invoking AI calculations (`calculateAiTaAction`), performing AI analysis (`performAiAnalysisAction`), and handling chat interactions (`handleChatSubmit`).
*   **Genkit AI Flows:** Contain the core AI logic, defining prompts and interacting with the Google AI models (Gemini) for stock analysis, TA calculation, and chat responses.
*   **Data Services:** Abstract the interaction with external data providers (e.g., `PolygonAdapter` for Polygon.io).
*   **External APIs:** Polygon.io for stock market data, Google AI Platform for generative AI capabilities.

### **6.3. Detailed Code & Data Flows**

#### **6.3.1. Stock Analysis Workflow (Standard vs. AI Full Stock Analysis)**

1.  **Client Interaction (`StockAnalysisPage.tsx` within `StockAnalysisProvider`):**
    *   User inputs Ticker, selects API Data Source.
    *   User clicks "Analyze Stock" OR "AI Full Stock Analysis" button, OR presses Enter in the Ticker input field (defaults to "standard" analysis).
    *   `onClick` handler for buttons or `onSubmit` handler for the form prepares `FormData`, explicitly setting `analysisType` to `'standard'` or `'fullDetail'`.
    *   `StockAnalysisProvider.submitFetchStockDataForm` is called. This sets `combinedServerState.initiateFullChatAnalysis` and `triggerFullChatAfterAnalysis` based on `analysisType`.
    *   `fetchStockDataAction` is invoked. `analysisStatus` becomes `data_fetching`.

2.  **Server Action (`fetchStockDataAction.ts`):**
    *   Receives `formData` including `analysisType`.
    *   Sets `initiateFullChatAnalysis` in its return state `StockDataFetchState` based on `analysisType`.
    *   Calls `fetchStockDataFromSource` (which routes to `PolygonAdapter`).
    *   `PolygonAdapter` fetches market status, then ticker snapshot (including prevDay), then standard TAs (RSI, EMA, SMA, MACD) from Polygon.io.
    *   Returns `StockDataFetchState` with `stockJson` (containing all fetched data) and `analysisStatus: 'data_fetched_ai_ta_pending'`.

3.  **Client Update & AI TA Calculation Trigger (`StockAnalysisProvider`):**
    *   `useEffect` in `StockAnalysisProvider` processes `stockDataFetchState`.
        *   Sets `triggerFullChatAfterAnalysis` state based on `stockDataFetchState.initiateFullChatAnalysis`.
        *   Updates `combinedServerState` with fetched data, status becomes `'data_fetched_ai_ta_pending'`.
    *   **Another `useEffect` triggers `calculateAiTaAction` if `analysisStatus: 'data_fetched_ai_ta_pending'` and `stockJson` is valid.** `analysisStatus` becomes `calculating_ai_ta`.

4.  **Server Action (`calculateAiTaAction.ts`):**
    *   Receives `stockJsonString` and `ticker`.
    *   Calls `calculateAiTaIndicators` Genkit flow.
    *   Returns `AiCalculatedTaState` with AI-calculated TA (e.g., Pivot Points) as JSON and object, formatted to two decimal places. Status becomes `'ai_ta_calculated_key_takeaways_pending'` upon success.

5.  **Client Update & AI Key Takeaways Trigger (`StockAnalysisProvider`):**
    *   `useEffect` processes `aiCalculatedTaState`.
    *   Updates `combinedServerState` with AI TA data and status.
    *   **Another `useEffect` triggers `performAiAnalysisAction` if `analysisStatus: 'ai_ta_calculated_key_takeaways_pending'` and all required data (stock JSON, AI TA JSON) is valid.** `analysisStatus` becomes `analyzing_data`.

6.  **Server Action (`performAiAnalysisAction.ts`):**
    *   Receives `stockJsonString`, `ticker`, and `aiCalculatedTaJsonString`.
    *   Calls `analyzeStockData` Genkit flow.
    *   Returns `AiAnalysisResultState` with AI-generated key takeaways. AI is instructed on numerical formatting (two decimals, $ prefix).

7.  **Client Update & Potential Auto-Chat Trigger (`StockAnalysisProvider`):**
    *   `useEffect` processes `aiAnalysisResultState`. `analysisStatus` becomes `analysis_complete` or `error_analyzing_data`.
    *   **A new `useEffect` in `StockAnalysisProvider` now checks:**
        *   If `triggerFullChatAfterAnalysis` is `true`.
        *   If `combinedServerState.analysisStatus` is `'analysis_complete'` and data is valid.
        *   If `chatFormPending` is `false`.
        *   **If all true:**
            *   Retrieves the "Full Detailed Analysis" prompt text.
            *   Constructs `FormData` for chat (user prompt, stock JSON, AI analysis summary including AI TA, AI TA JSON, chat history).
            *   Calls `submitChatForm` (which invokes `handleChatSubmit` server action).
            *   Resets `triggerFullChatAfterAnalysis` to `false`.
    *   UI re-renders: Stock JSON, AI TA JSON, AI Key Takeaways update. If auto-chat was triggered, chatbot UI will update.

#### **6.3.2. Chatbot Interaction (`handleChatSubmit` Server Action)**
*   Receives `userPrompt`, optional `stockJson`, optional `analysisSummary` (which includes key takeaways and AI TA summary), optional `aiCalculatedTaJson` (raw AI TA), and `chatHistory`.
*   Calls `chatWithBot` Genkit flow.
*   Returns `ChatState` with AI's Markdown response and usage report.

#### **6.3.3. Genkit `calculateAiTaIndicators` Flow (`src/ai/flows/calculate-ai-ta-flow.ts`)**
*   **Input:** `AiCalculatedTaInput` (Polygon stock JSON string, ticker).
*   **Prompt (`calculateAiTaPrompt`):** Instructs the AI to act as a data processor, extract previous day's HLC from `stockSnapshot.prevDay` in the input JSON, and calculate Classic Daily Pivot Points (PP, S1-S3, R1-R3) using standard formulas.
*   **Output:** `AiCalculatedTaFlowOutput` containing `calculatedTa` (with `pivotLevels` object, all values are numbers).
*   **Post-processing:** Values in `pivotLevels` are formatted to a maximum of two decimal places using `formatToTwoDecimalsOrNull` from `src/lib/number-utils.ts` before returning.

#### **6.3.4. Genkit `analyzeStockData` Flow (`src/ai/flows/analyze-stock-data.ts`)**
*   **Input:** `AnalyzeStockDataInput` (full stock JSON string, AI-calculated TA JSON string).
*   **Prompt (`analyzeStockDataPrompt`):** Instructs the AI to act as an expert financial analyst.
    *   Analyze provided stock data (market status, snapshot, standard TAs) and AI-calculated TA JSON.
    *   Provide concise, single-bullet-point takeaways for Price Action, Trend, Volatility, Momentum, and Patterns, with sentiment ("bullish", "bearish", "neutral").
    *   **Formatting Instruction:** Use a maximum of two decimal places for numerical values and prefix monetary values (prices, OHLC, VWAP, changes) with a dollar sign ($).
    *   Instructed to avoid generic statements about market status or unconfirmed news.
*   **Output:** `AnalyzeStockDataFlowOutput` containing `analysis` (the five takeaways with text and sentiment) and `usage`.

#### **6.3.5. Genkit `chatFlow` Flow (`src/ai/flows/chat-flow.ts`)**
*   **Input:** `ChatInput` (user prompt, optional stock JSON, optional AI analysis summary, optional raw AI TA JSON, optional chat history).
*   **System Prompt (`financialChatPrompt`):**
    *   Defines AI persona (StockSage Assistant, financial expert).
    *   Specifies scope (stocks, options, ETFs, etc.), declining out-of-scope questions.
    *   Prioritizes provided context (stock JSON, analysis summary, AI TA JSON) over general knowledge for contextual questions.
    *   **Formatting Instruction:** Use Markdown, emojis, format JSON blocks. Precede monetary values with "$" and use a maximum of two decimal places.
    *   **Completeness Instruction:** Ensure all parts of multi-part user questions are addressed.
    *   No web search tools are configured.
*   **Model Configuration:**
    *   `model: DEFAULT_CHAT_MODEL_ID` (Gemini 2.5 Flash Preview 05-20).
    *   `temperature: 0.2` (for more focused responses).
    *   `maxOutputTokens: 4096`.
    *   `safetySettings`: Threshold set to `BLOCK_ONLY_HIGH` for all harm categories.
*   **Output:** `ChatFlowOutput` containing the AI's Markdown `response` and `usage`.

### **6.4. Key Component Breakdown**
*   **`StockAnalysisPage` (`src/components/stock-analysis-page.tsx`):**
    *   Includes "Analyze Stock" and "AI Full Stock Analysis" buttons.
    *   Button click handlers explicitly set `analysisType` in `FormData`.
    *   **New `onSubmit` handler for the main form** captures form data, defaults `analysisType` to 'standard' for Enter key submissions, and invokes `submitFetchStockDataForm`.
    *   Displays fetched stock data, AI-calculated TA, and AI key takeaways.
    *   Uses `KeyMetricsDisplay` to show snapshot highlights.
    *   Main card width `max-w-5xl`.
*   **`Chatbot` (`src/components/chatbot.tsx`):**
    *   Manages chat UI, input, and message display.
    *   Sends user prompts and context (stock JSON, analysis summary, AI TA JSON, history) to `handleChatSubmit` server action.
    *   Example prompts refined for "Full Detailed Analysis" to request "up to three" items per section.
    *   Main card width `max-w-5xl`, scrollable message area `h-96`.
    *   Full chat history export/copy.
*   **`StockAnalysisProvider` (`src/contexts/stock-analysis-context.tsx`):**
    *   Manages overall state orchestration for the multi-step analysis process (`fetchStockDataAction` -> `calculateAiTaAction` -> `performAiAnalysisAction`).
    *   Manages `stockDataFetchState`, `aiCalculatedTaState`, `aiAnalysisResultState`, `chatServerState`, and `combinedServerState`.
    *   Manages `triggerFullChatAfterAnalysis` state for the "AI Full Stock Analysis" workflow.
    *   Includes `useEffect` hooks to chain the server actions based on status updates.
    *   Handles the auto-trigger of "Full Detailed Analysis" chat if conditions are met.
    *   Manages `formRef` for form data access.
    *   Aggregates `cumulativeStats` for token usage and cost.
*   **`src/app/page.tsx`:**
    *   Displays financial advice disclaimer (top & footer).
    *   Displays application version (e.g., "1.2.12").
*   **`src/ai/schemas/chat-prompts.ts`:**
    *   Defines example prompts, including the refined "Full Detailed Analysis (Combined)" prompt asking for "up to three" items per section.
*   **`DataExportControls` (`src/components/data-export-controls.tsx`):**
    *   Provides UI buttons for exporting various data sections (Stock JSON, AI TA, Key Takeaways, All Page Data) in JSON, Text, and CSV formats.
    *   Uses utility functions from `src/lib/export-utils.ts` for formatting and download/copy.

### **6.5. AI Integration (Genkit)**
*   **Initialization (`src/ai/genkit.ts`):** Configures Genkit with `googleAI` plugin. `genkitPluginNextjs` remains removed.
*   **Models (`src/ai/models.ts`):** Centralizes model ID (GEMINI_2_5_FLASH_PREVIEW_05_20).
*   **Flows:**
    *   **`calculateAiTaIndicators` (`src/ai/flows/calculate-ai-ta-flow.ts`):** New flow. Takes Polygon stock JSON, uses AI to calculate Pivot Points and S/R levels based on `prevDay` data. Output values are formatted to two decimal places.
    *   **`analyzeStockData` (`src/ai/flows/analyze-stock-data.ts`):** Takes stock data JSON and AI-calculated TA JSON. AI generates five key takeaways with sentiment. Prompt updated to instruct AI on numerical formatting (two decimals, $ prefix).
    *   **`chatWithBot` (`src/ai/flows/chat-flow.ts`):** Handles chat. System prompt updated with dollar prefix instruction for monetary values and completeness guideline. Model configuration includes `temperature: 0.2`, `maxOutputTokens: 4096`, and `safetySettings` at `BLOCK_ONLY_HIGH`.
*   **Schemas:** Zod schemas define inputs/outputs for flows and server actions.
    *   `ai-calculated-ta-schemas.ts`: Defines schemas for AI TA calculation.
    *   `stock-analysis-schemas.ts`: Updated `AnalyzeStockDataInputSchema` to include `aiCalculatedTaJson`.
    *   `chat-schemas.ts`: `ChatInputSchema` includes `aiCalculatedTaJson`.
    *   `chat-prompts.ts`: Example prompts refined.
*   **Cost Calculation (`src/ai/utils/cost-calculator.ts`):** Utility to calculate estimated costs based on token usage. Updated for v1.2.12 to reflect the cost of the analysis model for AI TA.

### **6.6. Data Services Layer (`src/services/`)**
*   **`data-sources/index.ts`:** Routes data requests to the appropriate adapter. For v1.2.12, only `PolygonAdapter` is used.
*   **`data-sources/adapters/polygon-adapter.ts`:**
    *   Fetches market status, ticker snapshot (including prevDay data), and standard technical indicators (RSI, EMA, SMA, MACD) from Polygon.io.
    *   Numerical data is formatted to a maximum of two decimal places using its internal `formatNumber` utility.
    *   All available standard TAs are fetched by default.
*   **`data-sources/types.ts`:** Defines common types for data sources.
*   **NEW `src/lib/number-utils.ts`:**
    *   Contains `formatToTwoDecimalsOrNull` utility function.
    *   Used by `calculateAiTaAction` and `calculate-ai-ta-flow.ts` to ensure AI-calculated TA values are formatted to two decimal places.
*   **`src/lib/export-utils.ts`:** Contains helper functions for formatting data for export (JSON, Text, CSV) and for handling downloads and clipboard copying.
*   **`src/lib/date-utils.ts`:** Contains `formatTimestampToPacificTime`.

### **6.7. Styling Approach**
*   **Tailwind CSS:** Primary styling mechanism using utility classes.
*   **ShadCN Theme:** Custom theme defined in `src/app/globals.css` using CSS HSL variables for background, foreground, primary, accent colors, etc., supporting light and dark modes.
*   **`tailwind.config.ts`:** Configures Tailwind, including custom fonts ('Inter'), color palette mapping to CSS variables, and the typography plugin for Markdown rendering.

### **6.8. Environment Variables**
*   **`POLYGON_API_KEY`:** API key for Polygon.io.
*   **`GOOGLE_API_KEY`:** API key for Google AI services (Genkit/Gemini).
*   Managed locally via `.env` and in deployed environment via `apphosting.yaml` (referencing Google Secret Manager).

### **6.9. Known Development Challenges & High-Risk Indicators (Pain Points for AI Assistants)**

This section details significant challenges encountered during development, particularly those that led to application instability or build failures. **AI Coding Assistants MUST review these points before scoping or implementing new features or complex refactors.**

*   **Summary of Key Issues (Derived from past `async_hooks` and Turbopack challenges):**
    *   **`async_hooks` Module Resolution:** A persistent "Module not found: Can't resolve 'async_hooks'" error occurred, originating from `@opentelemetry/sdk-trace-node` (a dependency of Genkit). This Node.js-specific module caused build failures when Next.js (especially with Turbopack) attempted to bundle code for non-server environments (browser, Edge).
    *   **Turbopack Sensitivity:** The `async_hooks` issue was particularly problematic with the Turbopack bundler. Standard Webpack fallbacks in `next.config.ts` and Genkit plugin adjustments (`genkitPluginNextjs`) did not reliably resolve the error. Removing `genkitPluginNextjs` and simplifying `next.config.ts` (removing the webpack fallback for `async_hooks`) was part of stabilizing to v1.2.9, indicating these elements were problematic with Turbopack.
    *   **Genkit & OpenTelemetry Dependencies:** Integrating Genkit, which uses OpenTelemetry, can introduce Node.js-specific dependencies that require careful handling by the Next.js bundler, especially in edge or client contexts.
    *   **Application Instability Due to Critical Errors:** The `async_hooks` error was critical, effectively blocking development. The inability to quickly resolve this with standard Next.js/Webpack solutions led to significant lost time.

*   **High-Risk Indicators (Triggers for AI Caution - based on past experiences):**
    1.  **Deep Dependencies on Node.js Internals:** Introducing/updating libraries (esp. for APM, tracing like OpenTelemetry) with non-obvious Node.js module dependencies (e.g., `async_hooks`, `perf_hooks`, `fs` in client/edge contexts).
    2.  **Complex Bundler Configurations (`next.config.ts`):** Requiring Webpack `resolve.fallback`, `alias`, or other advanced bundling configurations, especially for Node.js built-ins. These can be brittle with Turbopack.
    3.  **Use of Turbopack with Node.js-Heavy Dependencies:** If issues arise with module resolution of Node.js built-ins and Turbopack is used, Turbopack itself might be a factor. Consider testing with standard Webpack as a diagnostic.
    4.  **Genkit Plugin Interactions (e.g., `genkitPluginNextjs`):** Adding or modifying Genkit plugins, especially those managing global context, if they interact poorly with the bundler or other parts of the system. (v1.2.9, v1.2.11, and v1.2.12 run without `genkitPluginNextjs`).
    5.  **Persistent Build/Runtime Errors After "Standard" Fixes:** If common fixes (like Webpack fallbacks) don't work, suspect caching (clear `.next`), bundler-specific issues, or subtle dependency conflicts.
    6.  **Necessity of Reverting to Known Good States:** If troubleshooting leads to a state where the application is consistently broken and fixes are elusive, reverting to a last known good commit should be considered.

*   **Instruction for AI Coding Assistants (Based on Past Challenges):**
    *   AI Coding Assistants **MUST** cross-reference any new feature request or significant refactoring against these points.
    *   If a proposed change aligns with one or more high-risk indicators, the AI **MUST** explicitly state this risk to the user as part of the scoping phase (see Section 6.10).
    *   Advise proceeding with caution, small incremental changes, and frequent testing for high-risk changes.
    *   Suggest testing with the standard Webpack bundler if Turbopack is in use and related issues arise.
    *   Remind the user about the possibility of needing to clear the `.next` cache.
    *   Keep solutions simple and well-aligned with official Next.js and Genkit documentation. Avoid overly complex or experimental Webpack configurations unless absolutely necessary and understood.

### **6.10. AI Coding Assistant Collaboration Process**

To ensure clarity, manage risk, and improve development efficiency, the following processes **MUST** be followed by the AI Coding Assistant when handling user requests.

#### **6.10.1. New Feature Implementation & Change Requests**

1.  **Step 1: AI Provides Scope (User Approval Required)**
    *   Upon receiving a request for a new feature or a significant code change, the AI Coding Assistant **MUST NOT** immediately implement the changes.
    *   Instead, the AI **MUST** first provide a detailed scope. This scope should include:
        *   A clear understanding of the user's request.
        *   A proposed plan of action.
        *   A list of all files to be created, modified, or deleted.
        *   A brief description of the changes to be made in each affected file.
        *   An assessment against the "Known Development Challenges & High-Risk Indicators" (Section 6.9). If any risks are identified, they **MUST** be explicitly stated.
        *   Any clarifying questions for the user.
    *   The AI **MUST** wait for explicit user approval before proceeding.

2.  **Step 2: User Review & Approval**
    *   The user will review the scope provided by the AI.
    *   The user may:
        *   **Approve** the scope as is.
        *   **Reject** the scope and ask for a different approach.
        *   Request **modifications** or provide **clarifications** to the scope.
    *   If modifications are requested, the AI **MUST** return to Step 1 to provide an updated scope.

3.  **Step 3: AI Implements Changes**
    *   Only after receiving explicit user approval for the final scope, the AI Coding Assistant **MAY** proceed with implementing the code changes.
    *   Changes **MUST** be provided in the specified XML format for file modifications.

#### **6.10.2. Debugging & Issue Resolution**

1.  **Step 1: AI Provides Failure Analysis (User Review Required)**
    *   When presented with a bug, error, or unexpected behavior, the AI Coding Assistant **MUST NOT** immediately attempt to fix the issue.
    *   Instead, the AI **MUST** first provide a detailed failure analysis. This analysis should include:
        *   Its understanding of the reported problem.
        *   A hypothesis about the root cause(s) of the issue, referencing specific code, logs, or error messages if possible.
        *   An assessment against "Known Development Challenges & High-Risk Indicators" if relevant.
        *   Any diagnostic questions for the user if more information is needed.
    *   The AI **MUST** wait for the user to review this analysis.

2.  **Step 2: User Review & Scoping Request**
    *   The user will review the AI's failure analysis.
    *   The user may:
        *   **Confirm** the AI's understanding or provide corrections.
        *   **Approve** the root cause hypothesis (or an adjusted one).
        *   If the analysis seems plausible, the user will then typically **request the AI to provide a scope for fixing the issue.**

3.  **Step 3: AI Provides Fix Scope (User Approval Required)**
    *   Upon request from the user (after failure analysis review), the AI **MUST** provide a detailed scope for the proposed fix. This scope should include:
        *   The specific changes planned to address the identified root cause.
        *   A list of files to be modified.
        *   A brief description of the fix to be applied in each file.
    *   The AI **MUST** wait for explicit user approval of this fix scope.

4.  **Step 4: AI Implements Fix**
    *   Only after receiving explicit user approval for the fix scope, the AI Coding Assistant **MAY** proceed with implementing the code changes for the fix.
    *   Fixes **MUST** be provided in the specified XML format.

## **7. Success Metrics (Post v1.2.12 - Potential)**
*   User adoption of the "AI Full Stock Analysis" button remains consistent or improves.
*   User feedback on the clarity and utility of numerical data formatting (two decimals, dollar signs).
*   Reduction in user-reported issues related to Enter key form submission.
*   Improved completeness of "Full Detailed Analysis" chat responses.
*   Continued application stability.

## **8. Future Considerations (Beyond v1.2.12)**
*   **Revisit `genkitPluginNextjs`:** If Turbopack or Genkit/OpenTelemetry evolves, re-evaluate `genkitPluginNextjs` for potential benefits if `async_hooks` issues are confirmed resolved in the ecosystem.
*   **More API Data Sources:** Expand beyond Polygon.io to offer users more choice or comprehensive data.
*   **Advanced Charting:** Integrate more sophisticated charting libraries for technical analysis visualization.
*   **User Accounts & Preferences:** Allow users to save preferences (default ticker, API source, analysis types, TA configurations).
*   **Real-time Data Streaming:** Explore options for streaming real-time stock data updates (if feasible with chosen APIs and budget).
*   **Portfolio Tracking:** Allow users to track a portfolio of stocks.
*   **Alerts & Notifications:** Implement price or indicator-based alerts.
*   **Granular TA Selection in UI:** Revisit UI controls for users to select specific TA indicators and their parameters, if the underlying API adapter can support it efficiently.
*   **Multi-turn "Full Detailed Analysis":** If single-turn chat responses for very comprehensive analyses remain challenging, explore breaking it into a guided multi-turn conversation.

## **9. Changelog (PRD Document - This README.md)**

| Version       | PRD Date                     | Author(s)                     | Summary of Changes                                                                                                                                                                                                                                                                                                                         | Related App Commit |
| :------------ | :--------------------------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| 1.0           | 2024-07-30                   | Firebase Studio (AI) & User | Initial draft of PRD for StockSage v1.0.0 release.                                                                                                                                                                                                                                                                                         | N/A                |
| 1.2.7         | 2024-07-31                   | Firebase Studio (AI)          | Comprehensive PRD for v1.2.7. Added "Detailed Design and Architecture." Included client-side logging and Debug Console.                                                                                                                                                                                                                    | `#602e09a8`          |
| 1.2.9         | 2025-06-05                   | Firebase Studio (AI)          | Updated to reflect v1.2.9 stable release. Key changes: Two-stage stock analysis (API fetch then AI analysis), API-only data sources (Polygon.io), removal of mock data, removal of chatbot web search tools. Updated diagrams and data flows. Added "Known Development Challenges (Pain Points)" (Sec 6.9) and "AI Collaboration Process" (Sec 6.10). | `#f61149e6`          |
| 1.2.11        | 2025-06-05                   | Firebase Studio (AI)          | Updated for v1.2.11 release. Features: Disclaimer relocated from AI prompts to UI (top & footer); app version in UI; full chat history export/copy; increased UI width & chat height; new "Full Detailed Analysis" example chat prompt; new "AI Full Stock Analysis" button/workflow for sequential data fetch, key takeaways, and auto-triggered detailed chat. | `#298d8962`          |
| **1.2.12**    | **2025-06-06**               | Firebase Studio (AI)          | **Updated for v1.2.12 release.** Bug Fix: Enter key form submission in ticker input now correctly triggers analysis. Data Formatting: Numerical data (incl. AI TA) consistently formatted to two decimal places; monetary values in AI analyses/chat prefixed with "$". AI Chat: Refined "Full Detailed Analysis" prompt for clarity (up to three items per section); adjusted model parameters (`maxOutputTokens`, `safetySettings`, `temperature`) and added completeness instruction to improve response robustness for comprehensive queries. | `[NEW_COMMIT_HASH_FOR_V1.2.12]` |
| **1.2.12**    | **2025-06-06**               | Firebase Studio (AI)          | **PRD Consolidation & Policy Update.** Consolidated PRD into this README.md as the single source of truth. Added PRD Management Note (see top of document) outlining this policy. Ensured all sections are fully detailed. Integrated key learnings from `docs/pain_points.md` into section 6.9 for self-containment. | `[CURRENT_COMMIT_HASH]` |

