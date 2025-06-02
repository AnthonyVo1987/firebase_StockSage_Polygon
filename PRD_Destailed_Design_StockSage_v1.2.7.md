
# **Product Requirements Document & Detailed Design: StockSage v1.2.7**

*   **Document Version:** 1.2.7
*   **Based on Commit:** #602e09a8
*   **Date:** 2024-07-31 <!-- Assuming current date; AI to use actual date -->
*   **Author:** Firebase Studio (AI)
*   **Status:** Baseline for understanding StockSage v1.2.7

## **1. Introduction**

StockSage is an AI-powered web application designed to provide users with stock data analysis and insights. It allows users to input a stock ticker, select a data source (Polygon.io API or AI-driven search/generation), retrieve relevant market data (including market status, quote, and technical analysis indicators), and receive AI-generated key takeaways. Additionally, users can interact with an AI chatbot for more detailed analysis or general financial queries related to the provided stock context or broader market topics. The application emphasizes a user-friendly interface, clear presentation of data, robust client-side debugging capabilities, and the integration of generative AI for deeper understanding. This document details the state of the application as of v1.2.7.

## **2. Goals**

*   **Provide Accessible Stock Analysis:** Enable users to quickly fetch and view stock market status, quote data, and key technical indicators from multiple sources.
*   **Deliver AI-Powered Insights:** Offer AI-generated analysis and takeaways to help users understand stock data.
*   **Facilitate Interactive Exploration:** Allow users to engage in a contextual chat with an AI assistant regarding stock data and financial topics.
*   **Ensure Data Integrity (Contextual):** Prioritize fetching market status (especially from Polygon.io) to provide a temporal context for all subsequent data and analysis.
*   **Offer User-Friendly Interface:** Present information clearly using modern UI components and design principles, including light/dark theme support.
*   **Enable Comprehensive Debugging:** Provide extensive client-side logging and a powerful debug console to facilitate rapid troubleshooting and development.
*   **Establish a Stable Foundation:** Maintain a reliable v1.2.7 platform for future enhancements and feature additions.

## **3. Target Audience**

*   **Retail Investors:** Individuals looking for tools to supplement their stock research and gain quick insights.
*   **Financial Enthusiasts & Learners:** Users interested in understanding stock data, technical analysis, and AI applications in finance.
*   **Traders (Novice to Intermediate):** Individuals seeking a quick overview of a stock's recent performance and potential short-term indicators.
*   **Developers & AI Assistants:** Technical users who need to understand, debug, and extend the application's functionality.

## **4. User Stories (Reflecting v1.2.7 Functionality)**

*   **As a user, I want to** enter a stock ticker (or use a default) **so that I can** retrieve its latest available market status, quote, and technical analysis data.
*   **As a user, I want to** select the data source (Polygon.io API or an AI model) **so that I can** choose the origin of the stock information.
*   **As a user, I want to** choose between "Live Data" or "Mock Data" analysis modes **so that I can** either attempt to get recent information or use AI-generated examples.
*   **As a user, I want to** see the current market status (e.g., open, closed, server time) **so that I can** understand the timeliness and context of the presented data.
*   **As a user, I want to** view the fetched/generated stock data (market status, quote, TA indicators) in a formatted JSON view **so that I can** inspect the raw information.
*   **As a user, I want to** view AI-generated key takeaways (Price Action, Trend, Volatility, Momentum, Patterns) with sentiment highlighting **so that I can** quickly understand its technical posture.
*   **As a user, I want to** chat with an AI assistant about the analyzed stock or other financial topics **so that I can** ask follow-up questions and get more detailed explanations.
*   **As a user, I want to** see example prompts for the chatbot **so that I can** quickly understand how to interact with it effectively.
*   **As a user, I want to** receive chat responses formatted with Markdown and emojis **so that they are** easy to read and engaging.
*   **As a user, I want to** toggle between light and dark themes **so that I can** view the application comfortably.
*   **As a user, I want to** download or copy the displayed stock JSON data, AI analysis, or combined page data in various formats (JSON, TXT, CSV) **so that I can** use it externally.
*   **As a developer/admin, I want to** access a client-side debug console **so that I can** monitor detailed application logs (including requests, responses, UI state, context changes, util calls), filter these logs by keyword and category, and export/copy them in various formats for efficient diagnosis.

## **5. Features - v1.2.7**

### **5.1. Stock Analysis Core**
*   **Ticker Input:** Users can input a stock ticker symbol. Defaults to "NVDA" if left blank by the user in the UI; the server action `handleAnalyzeStock` also defaults to "NVDA" if the ticker input is empty. Input validation is performed.
*   **Data Source Selection:** Dropdown to select:
    *   Polygon.io API: Fetches market status, previous day's close, and selected Technical Analysis (TA) indicators (RSI-14, EMA-20, SMA-20, MACD as per `PolygonAdapter` config).
    *   AI (Google Gemini 2.5 Flash Preview 05-20): AI generates/searches for stock quote and TA data, including market status.
*   **Analysis Mode Selection:** Buttons to trigger analysis:
    *   **Live Data:** Attempts to fetch the most recent data from the selected source. For AI source, this involves Google Search grounding. For Polygon, it uses its live/recent data endpoints.
    *   **Mock Data:** Instructs the AI (if AI source is selected) or a mock adapter to generate plausible mock data (quote + TA + market status). If Polygon is the source but mock mode is selected, it routes to the `MockAdapter`.
*   **Data Display:**
    *   Presents fetched/generated stock data (marketStatus, stockQuote, technicalAnalysis) in a formatted, read-only JSON `Textarea`.
*   **AI Key Takeaways:**
    *   Displays AI-generated analysis for: Stock Price Action, Trend, Volatility, Momentum, Patterns.
    *   Each takeaway label is color-coded based on AI-determined sentiment (bullish: green, bearish: red, neutral: default text color).
*   **Data Export/Copy:** Buttons to download or copy:
    *   Stock Data (JSON, Text, CSV)
    *   AI Key Takeaways (JSON, Text, CSV)
    *   All Page Data (Combined report including inputs, data, analysis, usage in JSON, Text, CSV)

### **5.2. AI Chatbot**
*   **Contextual Chat:** The chatbot utilizes currently displayed stock JSON data (if available and valid) and AI analysis summary (if available and valid) in its responses if relevant to the user's query.
*   **Markdown & Emoji Responses:** AI responses are formatted using `react-markdown` (with `remark-gfm`) and include relevant emojis.
*   **Example Prompts:** Provides users with quick-start prompt buttons defined in `src/ai/schemas/chat-prompts.ts`. These are disabled if necessary stock/analysis context isn't available.
*   **Scope Adherence:** The chatbot is instructed (via system prompt in `chat-flow.ts`) to primarily answer questions related to stocks, options, ETFs, market sentiment, investing, trading, finances, and the economy.
*   **Tool Usage:**
    *   Utilizes a mock `webSearchTool` (defined in `src/ai/tools/web-search-tool.ts`) for general web search simulation.
    *   Leverages Google Search grounding (via Genkit's `googleSearchRetrieval` tool config) for information retrieval when using the Gemini model.
*   **Chat History:** Maintains conversation history for the current session (client-side state managed within `ChatState` and passed to the AI flow).
*   **Export/Copy Chat:** Buttons to copy or export the latest AI response as Markdown.

### **5.3. User Interface & Experience**
*   **Responsive Design:** Built with Next.js (App Router) and Tailwind CSS.
*   **ShadCN UI Components:** Utilizes a consistent set of modern UI components from `src/components/ui/`.
*   **Theme Toggle:** Allows users to switch between light and dark themes (persistent via localStorage, managed by `ThemeProvider` and `ThemeToggleButton`).
*   **Toaster Notifications:** Provides feedback for actions like data fetching, errors, copy/download operations, and AI response costs using `useToast`.
*   **Font:** Uses 'Inter' for body and headlines, loaded via Google Fonts in `RootLayout`.

### **5.4. Developer Experience & Debugging (Key v1.2.7 Enhancements)**
*   **Client-Side Debug Console (`src/components/debug-console.tsx`):**
    *   Captures all `console.log`, `console.warn`, `console.error` calls made in the browser.
    *   Toggleable visibility via a button.
    *   **Keyword Search:** Input field to filter logs by string/keyword.
    *   **Category Filters:** Checkboxes to filter logs by predefined categories (Server Actions, Context Updates, UI Renders, Client Interactions, Util Internals, Severities: Info/Warn/Error, Other Standard Logs).
    *   **Export/Copy:**
        *   Supports JSON, TXT, and CSV formats for both download and copy-to-clipboard.
        *   Operations act on the currently filtered set of log messages.
    *   **Clear Filters:** Button to reset all search and category filters.
    *   **Clear Log:** Button to clear messages from the console display.
*   **Extensive Client-Side Logging (Tasks 1.2.6 & 1.2.7):**
    *   **`[CLIENT_REQUEST]` Logs:** Generated in `StockAnalysisProvider` before server actions (`handleAnalyzeStock`, `handleChatSubmit`) are invoked, detailing the action and payload.
    *   **`[CLIENT_RESPONSE]` Logs:** Generated in `StockAnalysisPage` and `Chatbot` components upon receiving state updates from server actions, summarizing the received data/errors.
    *   **`[CONTEXT]` Logs:** Generated in `StockAnalysisProvider` for critical context updates (e.g., cumulative AI stats).
    *   **`[CLIENT:Component:SubComponent]` Logs:** Provide insights into component render states, specific UI logic execution (e.g., `[CLIENT:StockPageContent:DisplayJSON]`, `[CLIENT:Chatbot:ContextPrep]`, `[CLIENT:Chatbot:UIEffect]`).
    *   **`[ExportUtils]` Logs:** Trace data transformations and file operations within `src/lib/export-utils.ts`.
    *   **`[DataExportControls]` Logs:** Track user interactions with main page export buttons.
    *   **`[ThemeProvider]` Logs:** Detail theme initialization and changes.
    *   **`[DebugConsole:Internal]` Logs:** Logs from the debug console itself for its own operations.

## **6. Design & Architecture - v1.2.7**

### **6.1. Tech Stack**
*   **Framework:** Next.js 15.x (App Router)
*   **Language:** TypeScript
*   **UI Library:** React 18.x
*   **UI Components:** ShadCN UI (customized, available in `src/components/ui/`)
*   **Styling:** Tailwind CSS (configured in `tailwind.config.ts`), CSS variables in `src/app/globals.css` for theming.
*   **State Management (Client):** React Context API (`StockAnalysisProvider`), `useActionState` for server action pending states and results.
*   **Forms:** Native `FormData` with server actions, client-side validation using Zod schemas in server actions.
*   **AI Integration:** Genkit 1.x (configured in `src/ai/genkit.ts`)
    *   **Model Provider:** `@genkit-ai/googleai`
    *   **Models Used:** `googleai/gemini-2.5-flash-preview-05-20` (configurable via `src/ai/models.ts`) for data fetching, analysis, and chat.
*   **External Data Source (Primary):** Polygon.io API (via `@polygon.io/client-js`)
*   **Environment Variables:** Managed via `apphosting.yaml` for deployment, `.env` for local development.
*   **Deployment:** Firebase App Hosting (implied by `apphosting.yaml`).

### **6.2. High-Level Overall Diagram (Textual Representation)**

```
[User Browser (Next.js Client Components: StockAnalysisPage, Chatbot, DebugConsole)]
      |
      |<--- (Form Submissions via React `useActionState` & `startTransition`) --->|
      |                                                                           |
[Next.js Server Actions (e.g., `handleAnalyzeStock`, `handleChatSubmit` in `src/actions/`)]
      |                                      |
      |<--- (Calls to Data Services) ----> [Data Source Router (`src/services/data-sources/index.ts`)]
      |                                      |         |
      |                                      |         |---> [PolygonAdapter (`src/services/data-sources/adapters/polygon-adapter.ts`)] ---> [Polygon.io API]
      |                                      |         |---> [AISearchAdapter (`src/services/data-sources/adapters/ai-search-adapter.ts`)] ---> [fetchStockData Flow]
      |                                      |         |---> [MockAdapter (`src/services/data-sources/adapters/mock-adapter.ts`)] ---> [fetchStockData Flow (forceMock=true)]
      |                                      |
      |<--- (Calls to Genkit Flows) -----> [Genkit AI Flows (`src/ai/flows/`)]
                                                 |
                                                 |<--- (LLM Calls, Tool Usage) ---> [Google AI (Gemini via Genkit GoogleAI Plugin)]
                                                                                            |
                                                                                            |<--- (Google Search for grounding if configured)

```

### **6.3. Detailed Code & Data Flows**

#### **6.3.1. Stock Analysis (`handleAnalyzeStock` Server Action)**

1.  **Client Interaction (`StockAnalysisPage.tsx` within `StockAnalysisProvider`):**
    *   User inputs Ticker (e.g., "NVDA"), selects Data Source (e.g., "polygon-api" via `selectedDataSource` state), and clicks "Analyze Stock (Live/Mock)" button.
    *   The button's `value` attribute determines `analysisMode`.
    *   Form submission via `formRef.current.requestSubmit()` or direct call to `submitStockAnalysisForm(formData)` in `StockAnalysisProvider`.
    *   `StockAnalysisProvider` logs `[CLIENT_REQUEST]` with action name and payload.
    *   `submitStockAnalysisFormAction` (bound via `useActionState`) invokes `handleAnalyzeStock` server action (`src/actions/analyze-stock-server-action.ts`). `stockAnalysisFormPending` becomes true.

2.  **Server Action (`handleAnalyzeStock.ts`):**
    *   Receives `formData`. Default ticker "NVDA" if the 'ticker' field in `formData` is empty or missing.
    *   Validates inputs (ticker, dataSource, analysisMode) using `ActionInputSchema` (Zod). If invalid, returns `StockAnalysisState` with `fieldErrors` or general `error`.
    *   Logs `[ACTION:AnalyzeStock] Input validation...`.
    *   Calls `fetchStockDataFromSource(ticker, dataSource, analysisMode)` from `src/services/data-sources/index.ts`.
    *   `fetchStockDataFromSource` (Router):
        *   Logs `[SERVICE:DataSourceRouter] Request received...`.
        *   If `mode === 'mock'`: Routes to `MockAdapter.getFullStockData(ticker)`.
            *   `MockAdapter` logs `[ADAPTER:Mock] ...Generating mock data via AI.`. Calls `fetchStockData` Genkit flow with `forceMock: true`. (See 6.3.3 for Genkit flow details).
        *   If `dataSourceId === 'polygon-api'`: Routes to `PolygonAdapter.getFullStockData(ticker)`.
            *   `PolygonAdapter` logs `[ADAPTER:Polygon] ...`. Makes sequential API calls to Polygon.io (Market Status, Previous Close, TA Indicators as per `DEBUG_FETCH_CONFIG`). Logs API attempts/errors. Returns structured `StockDataJson`.
        *   If `dataSourceId === 'ai-gemini...'`: Routes to `AISearchAdapter.getFullStockData(ticker)`.
            *   `AISearchAdapter` logs `[ADAPTER:AISearch] ...Fetching live data via AI.`. Calls `fetchStockData` Genkit flow with `forceMock: false`. (See 6.3.3).
        *   The chosen adapter returns an `AdapterOutput` (containing `stockDataJson`, optional `usageReport`, and `error`).
    *   `handleAnalyzeStock` receives `AdapterOutput`.
    *   If `adapterOutput.error` or `!adapterOutput.stockDataJson`, returns error state.
    *   Validates presence of `marketStatus` in `stockDataJsonForAnalysis`. Critical for analysis.
    *   Stringifies `stockDataJsonForAnalysis` for display and AI analysis input.
    *   Calls `analyzeStockData({ stockData: stockJsonStringForDisplay })` Genkit flow (`src/ai/flows/analyze-stock-data.ts`). (See 6.3.4).
    *   `analyzeStockData` returns `AnalyzeStockDataFlowOutput` (analysis + Genkit usage).
    *   Calculates `analysisUsageReport` using `calculateUsageReport`.
    *   Validates the structure and content of the returned analysis takeaways.
    *   Returns final `StockAnalysisState` (with `stockJson`, `analysis`, `fetchUsageReport`, `analysisUsageReport`, `timestamp`, `error`) to the client.

3.  **Client Update (`StockAnalysisPage.tsx` via `StockAnalysisProvider`):**
    *   `useActionState` updates `stockAnalysisServerState`. `stockAnalysisFormPending` becomes false.
    *   `useEffect` in `StockAnalysisPageContent` processes `stockAnalysisServerState`:
        *   Logs `[CLIENT_RESPONSE]` with summarized state.
        *   Sets `analysisAttemptMade` flag.
        *   Updates `cumulativeStats` via `updateCumulativeStats` (which logs `[CONTEXT]`).
        *   Shows toasts for errors or success.
    *   UI re-renders: Stock JSON `Textarea` updates, AI Key Takeaways section updates with new analysis and sentiment colors. `DataExportControls` `isAvailable` prop updates. `Chatbot` receives updated `stockJson` and `analysis` implicitly via context.

#### **6.3.2. Chatbot Interaction (`handleChatSubmit` Server Action)**

1.  **Client Interaction (`Chatbot.tsx` within `StockAnalysisProvider`):**
    *   User types a prompt in `Textarea` or clicks an example prompt button.
    *   Form submission (via `formRef.current.requestSubmit()` or `handleExamplePromptClick`).
    *   `handleExamplePromptClick` or `handleFormSubmit` prepares `FormData`.
    *   `doSubmitFormData` is called:
        *   `stockJson` from `stockAnalysisServerState` is added to `formData`.
        *   `analysisSummary` is constructed by `constructAnalysisSummary` (logs `[CLIENT:Chatbot:ContextPrep]`) and added.
        *   Current `chatServerState.messages` (chat history) is stringified and added.
    *   `submitChatForm(formData)` in `StockAnalysisProvider` is called.
    *   `StockAnalysisProvider` logs `[CLIENT_REQUEST]` with action name and summarized payload.
    *   `submitChatFormAction` (bound via `useActionState`) invokes `handleChatSubmit` server action (`src/actions/chat-server-action.ts`). `chatFormPending` becomes true.

2.  **Server Action (`handleChatSubmit.ts`):**
    *   Receives `formData`. Parses `rawChatHistory`.
    *   Validates `userPrompt` and other inputs using `ActionInputSchema` (Zod). If invalid, returns `ChatState` with an error message.
    *   Creates `newUserMessageForState` for immediate UI update.
    *   Prepares `ChatInput` for the Genkit flow (userPrompt, stockJson, analysisSummary, aiFlowChatHistory).
    *   Calls `chatWithBot(chatInput)` Genkit flow (`src/ai/flows/chat-flow.ts`). (See 6.3.5).
    *   `chatWithBot` returns `ChatFlowOutput` (AI response + Genkit usage).
    *   Calculates `aiUsageReport` using `calculateUsageReport`.
    *   Creates `aiResponseMessage` with AI's text and usage report.
    *   Returns final `ChatState` (with updated `messages` including user & AI, `latestAiUsageReport`, `timestamp`) to the client.

3.  **Client Update (`Chatbot.tsx` via `StockAnalysisProvider`):**
    *   `useActionState` updates `chatServerStateInternal`. `chatFormPending` becomes false.
    *   `useEffect` in `Chatbot` processes `chatServerState`:
        *   Logs `[CLIENT_RESPONSE]` with summarized state.
        *   If AI message received, updates `cumulativeStats` (logs `[CONTEXT]`) and toasts.
        *   Handles errors with toasts.
        *   Logs `[CLIENT:Chatbot:UIEffect]` regarding input clearing.
        *   If successful, `setInputValue('')` clears the textarea.
    *   UI re-renders: ScrollArea appends new user and AI messages (AI response formatted with `ReactMarkdown`). Chat export controls update based on latest AI message.

#### **6.3.3. Genkit `fetchStockData` Flow (`src/ai/flows/fetch-stock-data.ts`)**

*   **Invoked By:** `MockAdapter` (with `forceMock: true`) or `AISearchAdapter` (with `forceMock: false`).
*   **Input:** `FetchStockDataInput` (`ticker`, `forceMock?`).
*   **Core Logic:**
    *   Logs entry `[FLOW:FetchStockData:Wrapper]`.
    *   Uses `fetchStockDataPromptDefinition`.
    *   If `forceMock: true`: AI is instructed by prompt to generate mock data (including `marketStatus`) and NOT use tools.
    *   If `forceMock: false`: AI is instructed by prompt to use Google Search (`googleSearchRetrieval` tool with `mode: 'FORCE'`) to find live data (including `marketStatus`). If search fails, it may generate mock data.
    *   Model used: `DEFAULT_DATA_FETCH_MODEL_ID`.
    *   The prompt (`fetchStockDataPrompt`) defines the expected JSON structure (conforming to `StockDataJsonSchema`, where `marketStatus` is mandatory).
*   **Output:** `FetchStockDataFlowOutput` (containing `data.stockJson` as a string, and `usage`).
*   **Error Handling:** Throws error if AI output is invalid JSON or missing `marketStatus`. This error is caught by the calling adapter.

#### **6.3.4. Genkit `analyzeStockData` Flow (`src/ai/flows/analyze-stock-data.ts`)**

*   **Invoked By:** `handleAnalyzeStock` server action.
*   **Input:** `AnalyzeStockDataInput` (`stockData` as a JSON string).
*   **Core Logic:**
    *   Logs entry `[FLOW:AnalyzeStockData]`.
    *   Uses `analyzeStockDataPrompt`.
    *   The prompt instructs the AI to analyze the `stockData` (JSON with `marketStatus`, `stockQuote`, `technicalAnalysis`) and provide 5 key takeaways (Price Action, Trend, Volatility, Momentum, Patterns), each with a `text` and `sentiment` ("bullish", "bearish", "neutral").
    *   Model used: `DEFAULT_ANALYSIS_MODEL_ID` (from `genkit.ts` default).
    *   Handles cases where indicator values are `"${DISABLED_BY_CONFIG_TEXT}"` or `null`.
*   **Output:** `AnalyzeStockDataFlowOutput` (containing `analysis` object matching `AnalyzeStockDataOutputSchema`, and `usage`).
*   **Error Handling:** If AI output is invalid, returns default error takeaways.

#### **6.3.5. Genkit `chatFlow` Flow (`src/ai/flows/chat-flow.ts`)**

*   **Invoked By:** `handleChatSubmit` server action.
*   **Input:** `ChatInput` (`userPrompt`, `stockJson?`, `analysisSummary?`, `chatHistory?`).
*   **Core Logic:**
    *   Logs entry `[FLOW:Chat]`.
    *   Uses `financialChatPrompt`.
    *   **System Prompt:** Instructs AI on persona (StockSage Assistant), scope (finance, stocks, etc.), context utilization, tool usage, and Markdown/emoji formatting. Crucially, it includes placeholders for `stockJson`, `analysisSummary`, and `chatHistory` to be injected.
    *   **Tools:**
        *   `webSearchTool` (mock search).
        *   `googleSearchRetrieval` (for grounded factual info).
    *   Model used: `DEFAULT_CHAT_MODEL_ID`.
    *   Config: `temperature: 0.5`, specific safety settings.
*   **Output:** `ChatFlowOutput` (containing `aiResponse.response` as a Markdown string, and `usage`).
*   **Error Handling:** If AI returns no response, returns a default error message.

#### **6.3.6. Client-Side Data Export Flow (`src/components/data-export-controls.tsx` -> `src/lib/export-utils.ts`)**

1.  **User Interaction (`DataExportControls.tsx`):**
    *   User clicks a download or copy button (JSON, TXT, CSV).
    *   Component logs `[DataExportControls] ...button clicked...`.
    *   `handleDownload` or `handleCopyToClipboard` is called.
2.  **Data Preparation (`export-utils.ts`):**
    *   `getTickerSymbolForFilename` and `getCurrentTimestampForFile` generate filename parts.
    *   Appropriate formatting function is called based on format:
        *   `formatJsonForExport`: Logs `[ExportUtils:FormatJSON]`.
        *   `convertToTextForExport`: Logs `[ExportUtils:FormatText]`.
        *   `convertToCsvForExport` (uses specific converters like `stockJsonToCsv`, `analysisToCsv`, `allPageDataToCsv` based on `dataTypeHint`): Logs `[ExportUtils:FormatCSV]`.
3.  **Action (`export-utils.ts`):**
    *   `downloadFile`: Logs `[ExportUtils:Download]`. Creates Blob, triggers download.
    *   `copyToClipboardUtil`: Logs `[ExportUtils:Copy]`. Uses `navigator.clipboard.writeText`. Toasts success/failure.

#### **6.3.7. Theme Toggling Flow (`src/components/theme-toggle-button.tsx` -> `src/components/theme-provider.tsx`)**

1.  **User Interaction (`ThemeToggleButton.tsx`):**
    *   User clicks the theme toggle button.
2.  **State Update (`ThemeProvider.tsx`):**
    *   `useTheme()` provides `setTheme` function.
    *   `toggleTheme` in `ThemeToggleButton` calls `setTheme(theme === 'dark' ? 'light' : 'dark')`.
    *   `setTheme` in `ThemeProvider` logs `[ThemeProvider] setTheme called...`.
    *   `theme` state updates, triggering `useEffect`.
3.  **DOM & localStorage Update (`ThemeProvider.tsx`):**
    *   `useEffect` (dependent on `theme`):
        *   Removes old theme class from `document.documentElement`, adds new one.
        *   Updates `localStorage` with the new theme.
        *   Logs `[ThemeProvider] Applied theme to root...`.

### **6.4. Key Component Breakdown**

*   **`StockAnalysisPage` (`src/components/stock-analysis-page.tsx`):**
    *   **Role:** Main page component orchestrating the stock analysis UI. Hosts the ticker input form, data source selection, analysis mode buttons, JSON display area, AI takeaways display, and integrates `Chatbot` and `DebugConsole`.
    *   **Key State/Props:** Manages `selectedDataSource` locally. Consumes `stockAnalysisServerState` and `cumulativeStats` from `StockAnalysisProvider`.
    *   **Interactions:** Handles form submission for stock analysis, triggers data export controls.
*   **`Chatbot` (`src/components/chatbot.tsx`):**
    *   **Role:** Provides the AI chat interface. Manages chat input, displays conversation history, and handles example prompt submissions.
    *   **Key State/Props:** Manages `inputValue` and `isInputExpanded` locally. Consumes `chatServerState`, `stockAnalysisServerState` (for context), and `chatFormPending` from `StockAnalysisProvider`.
    *   **Interactions:** Handles chat message submission, example prompt clicks, and chat export/copy.
*   **`DebugConsole` (`src/components/debug-console.tsx`):**
    *   **Role:** Provides a comprehensive client-side debugging interface.
    *   **Features:** Captures `console.*` calls, displays them. Allows keyword search, category-based filtering (Server Actions, Context, UI, Utils, Severities, etc.), and export/copy of (filtered) logs in JSON, TXT, CSV formats.
    *   **Implementation:** Uses `useEffect` to override global `console` methods. Manages internal state for messages, search term, and active filters.
*   **`StockAnalysisProvider` (`src/contexts/stock-analysis-context.tsx`):**
    *   **Role:** Central context provider for managing state related to stock analysis and chat interactions, including server action states and cumulative AI usage statistics.
    *   **State Managed:** `stockAnalysisServerState` (from `handleAnalyzeStock`), `chatServerState` (from `handleChatSubmit`), `cumulativeStats`. Exposes pending states (`stockAnalysisFormPending`, `chatFormPending`).
    *   **Actions Exposed:** Wrapper functions `submitStockAnalysisForm` and `submitChatForm` (which log `[CLIENT_REQUEST]` before calling the actual server action handlers obtained from `useActionState`), `updateCumulativeStats`, `clearChatHistory` (conceptual).

### **6.5. AI Integration (Genkit)**

*   **Initialization (`src/ai/genkit.ts`):**
    *   A global `ai` object is created using `genkit({ plugins: [googleAI()] })`.
    *   Default model set to `DEFAULT_ANALYSIS_MODEL_ID` from `src/ai/models.ts`.
*   **Flows (`src/ai/flows/`):**
    *   Server-side functions defined with `ai.defineFlow()`, wrapping `ai.definePrompt()`.
    *   Export wrapper functions that invoke the Genkit flows.
    *   Include `'use server';` directive.
    *   Input and output types defined using Zod schemas from `src/ai/schemas/`.
*   **Prompts:**
    *   Defined with `ai.definePrompt()`.
    *   Use Handlebars templating for injecting input data.
    *   Specify input and output Zod schemas.
    *   Can configure `model`, `tools`, `toolConfig`, `temperature`, `safetySettings`.
*   **Schemas (`src/ai/schemas/`):**
    *   `stock-fetch-schemas.ts`: Defines `StockDataJsonSchema` (mandatory `marketStatus`), `FetchStockDataInputSchema`, `FetchStockDataOutputSchema`, etc. Includes `DISABLED_BY_CONFIG_TEXT`.
    *   `stock-analysis-schemas.ts`: Defines `AnalyzeStockDataInputSchema`, `AnalyzeStockDataOutputSchema` (with `SingleTakeawaySchema`), etc.
    *   `chat-schemas.ts`: Defines `ChatInputSchema`, `ChatOutputSchema`, `ChatMessage`, `ChatState`.
    *   `web-search-schemas.ts`: For `webSearchTool`.
    *   `common-schemas.ts`: `UsageReport`.
*   **Tools (`src/ai/tools/web-search-tool.ts`):**
    *   `webSearchTool`: Mock tool defined with `ai.defineTool()`. Simulates web search for financial queries.
    *   Google Search Grounding: Leveraged in AI flows (`fetch-stock-data.ts`, `chat-flow.ts`) via `toolConfig: { googleSearchRetrieval: {} }`.
*   **Model Management (`src/ai/models.ts`):**
    *   Centralizes model ID strings (e.g., `GEMINI_2_5_FLASH_PREVIEW_05_20`).
    *   Defines semantic aliases (`DEFAULT_CHAT_MODEL_ID`, etc.) used throughout the AI flows.
*   **Cost Calculation (`src/ai/utils/cost-calculator.ts`):**
    *   Exports price constants for Gemini Flash (input, output for data fetch, analysis, chat).
    *   `calculateUsageReport` function: Takes Genkit usage, flow name, and prices to produce a `UsageReport` object (used in server actions and adapters).

### **6.6. Data Services Layer (`src/services/`)**

*   **Router (`src/services/data-sources/index.ts`):**
    *   `fetchStockDataFromSource(ticker, dataSourceId, mode)`: Core function that routes data fetching requests to the appropriate adapter based on `dataSourceId` and `mode`.
    *   Instantiates and reuses adapter instances.
*   **Types (`src/services/data-sources/types.ts`):**
    *   `DataSourceId`: Enum-like const for allowed data source identifiers.
    *   `AnalysisMode`: "live" | "mock".
    *   `AdapterOutput`: Interface for adapter return values (`stockDataJson`, `usageReport?`, `error?`).
    *   `IDataSourceAdapter`: Interface defining the `getFullStockData` method.
    *   `EMPTY_STOCK_DATA_JSON`: Constant for a default/error state for `StockDataJson`.
*   **Adapters (`src/services/data-sources/adapters/`):**
    *   **`PolygonAdapter`:**
        *   Uses `@polygon.io/client-js`.
        *   Fetches market status (critical first call), previous day's close, and specific TA indicators (RSI, EMA, SMA, MACD) based on `DEBUG_FETCH_CONFIG`.
        *   Handles `DISABLED_BY_CONFIG_TEXT` for unrequested indicators.
        *   Implements sequential API calls with delays.
        *   Formats numbers and constructs the `StockDataJson` object.
    *   **`AISearchAdapter`:**
        *   Calls `fetchStockData` Genkit flow with `forceMock: false`.
        *   Parses the returned JSON string and calculates usage.
        *   Primarily for "live" AI-driven data fetching.
    *   **`MockAdapter`:**
        *   Calls `fetchStockData` Genkit flow with `forceMock: true`.
        *   Parses the returned JSON string and calculates usage.
        *   Primarily for generating mock data via AI.

### **6.7. Styling Approach**

*   **Tailwind CSS:** Primary styling utility, configured in `tailwind.config.ts`.
*   **ShadCN UI Theme:**
    *   CSS variables defined in `src/app/globals.css` for light and dark themes (background, foreground, primary, accent, card, etc.).
    *   Colors are based on HSL values.
    *   Dark mode is applied by adding the `.dark` class to the `<html>` element.
*   **Fonts:** 'Inter' font family used for body and headlines, configured in `tailwind.config.ts` and imported in `src/app/layout.tsx`.
*   **Prose Styling:** `@tailwindcss/typography` plugin used for Markdown rendering in `Chatbot`, with custom overrides in `tailwind.config.ts` for consistent look and feel.

### **6.8. Environment Variables**

*   **`apphosting.yaml`:** Defines environment variables for Firebase App Hosting deployment.
    *   `POLYGON_API_KEY`: Sourced from Google Secret Manager.
    *   `GOOGLE_API_KEY`: Sourced from Google Secret Manager (primarily for Genkit GoogleAI plugin).
*   **`.env`:** (Not checked into git) Used for local development to set these same variables.
*   **Usage:**
    *   `process.env.POLYGON_API_KEY` used in `PolygonAdapter`.
    *   `process.env.GOOGLE_API_KEY` implicitly used by Genkit GoogleAI plugin if not configured directly in code (Genkit typically picks it up from the environment).

## **7. Success Metrics (Post v1.2.7 - Potential)**

*   **User Engagement:**
    *   Number of stock analyses performed per user session.
    *   Number of chatbot interactions per user session.
*   **Feature Adoption:**
    *   Distribution of data source selection (Polygon vs. AI).
    *   Distribution of analysis mode (Live vs. Mock).
*   **Stability & Performance:**
    *   Rate of successful vs. failed API calls (Polygon, AI).
    *   Client-side error rate (monitorable via improved debug logs if needed).
    *   Page load times and server action response times.
*   **Developer Efficiency:**
    *   Reduced time to diagnose client-side issues due to enhanced logging and debug console.
    *   Frequency of use of debug console filtering/export features.
*   **Qualitative Feedback:** User/developer comments on clarity, usefulness, and accuracy.

## **8. Future Considerations (Beyond v1.2.7)**

*   **Refactor Data Source & AI Model Abstractions:** (As per original PRD).
*   **Additional Data Sources & AI Models:** Expand options.
*   **Advanced Charting:** Integrate interactive charts.
*   **User Accounts & Personalization.**
*   **Real-time Data Streaming.**
*   **Enhanced Error Handling & User Guidance:** More specific user-facing error messages.
*   **Image Generation for Reports (AI).**
*   **MCP Integration:** (Scoped out, remains a future possibility if strategic needs arise).
*   **Refine Debug Console Filters:** Based on usage, the categories and their matching logic might be further refined for optimal dev experience.

## **9. Changelog (PRD Document)**

| Version       | PRD Date   | Author(s)                     | Summary of Changes                                                                                                                                                             | Related App Commit |
| :------------ | :--------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| 1.0           | 2024-07-30 | Firebase Studio (AI) & User | Initial draft of PRD for StockSage v1.0.0 release.                                                                                                                             | N/A                |
| **1.2.7**     | 2024-07-31 | Firebase Studio (AI)          | **New comprehensive PRD.** Updated all sections to reflect current app state v1.2.7. Added "Detailed Design and Architecture" sections tailored for AI assistant consumption. Includes details on client-side logging (Tasks 1.2.6, 1.2.7) and Debug Console enhancements. Explicitly noted default ticker handling in `handleAnalyzeStock` server action description. | #602e09a8          |

