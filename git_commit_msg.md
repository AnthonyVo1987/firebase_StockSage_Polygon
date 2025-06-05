[v1.2.9] [Refactor & Feat] API-Only Data, No Chat Tools, Two-Stage Analysis & Stability

Details:
This consolidated commit for v1.2.9 marks a significant evolution of StockSage, streamlining its core functionalities and enhancing stability. Key changes include: a refactor to a two-stage stock analysis process (data fetch then AI analysis), the complete removal of all mock data functionality, the consolidation of data sources to be strictly API-based (initially Polygon.io, with UI flexibility for future API providers), and the removal of all web search tools from the AI chatbot. These changes simplify the codebase, improve perceived performance, ensure AI insights are data-driven, and resolve critical bugs, including the "Unsupported GeminiPart type" error in the chatbot.

---

## Key Changes & Enhancements for v1.2.9 (Cumulative):

### 1. Core Architecture: Two-Stage Stock Analysis & API-Only Data Sources:
The application now follows a more robust and simplified data pipeline:
    *   **Two-Stage Analysis Orchestration:**
        *   The stock analysis process is split into two distinct server actions: `fetchStockDataAction` (formerly `analyze-stock-server-action.ts`, now solely for data retrieval) and the new `performAiAnalysisAction` (for AI insights).
        *   `StockAnalysisProvider` manages this two-stage flow, triggering AI analysis automatically upon successful data fetch from an API source. State reset logic is more robust, ensuring data integrity for new ticker requests.
        *   The UI (`StockAnalysisPage`) clearly reflects these two stages with distinct loading indicators.
    *   **API-Only Data Source Consolidation (Task 1.2.11):**
        *   **All non-API data fetching methods (AI Search Adapter using Genkit's `fetchStockData` flow) have been removed.** (Mock data functionality was removed in Task 1.2.10).
        *   The application now exclusively uses API-based data sources for initial stock data retrieval. `Polygon.io` is the current active API provider.
        *   The UI (`StockAnalysisPage`) **retains** the "Data Source" dropdown, and its `DATA_SOURCES` constant is updated to list only available API sources (initially just Polygon.io), allowing for future expansion with other API providers.
        *   Server actions (`fetchStockDataAction`) and the data service router (`src/services/data-sources/index.ts`) now operate with API `dataSourceId`s. `ALLOWED_DATA_SOURCE_IDS` is updated accordingly.
        *   The `AISearchAdapter` and the AI-driven `fetchStockData` Genkit flow have been deleted.

### 2. AI Chatbot: Focused, Tool-Free Operation:
The AI chatbot has been simplified for reliability and focus:
    *   **Web Search Tool Removal (Task 1.2.11):**
        *   The custom `webSearchTool` and the `googleSearchRetrieval` tool have been completely removed from the `chat-flow.ts`.
        *   The chatbot's system prompt has been updated to instruct it to rely *solely* on its general knowledge and any explicitly provided context (stock data/analysis summary), not to attempt web searches.
        *   This change has resolved the persistent "Unsupported GeminiPart type" error previously encountered during chatbot interactions.
    *   **Prompt Enhancements & Contextual Adherence:**
        *   The chatbot system instruction in `chat-flow.ts` mandates that when using provided stock data or AI analysis context, its responses must be strictly limited to that information, preventing speculation on external factors.
        *   Chat history passing to the AI was simplified in `handleChatSubmit` and the `ChatInputSchema` for `chatHistory.parts` was made more robust.

### 3. AI Stock Analysis: Data-Driven Insights:
The AI analysis flow has been refined:
    *   **Stock Analysis Prompt (`analyze-stock-data.ts`):** The prompt now explicitly instructs the AI to avoid generic market commentary, advice on after-hours trading, or speculation on external events not present in the provided JSON data. Takeaways must be derived exclusively from the numerical data supplied.

### 4. Mock Data Functionality Removal (Task 1.2.10):
    *   All UI elements (e.g., "Analyze Stock (Mock Data)" button) and backend logic related to generating or using mock stock data have been entirely removed. This streamlines the user experience and codebase by focusing on real API data.

### 5. Critical Bug Fixes and Stability Improvements:
    *   **State Synchronization & Stale Data Handling:** Implemented stricter checks in `StockAnalysisProvider` to ensure data and analysis results align with the current operational ticker. More thorough state reset logic for new ticker requests.
    *   **Chatbot Prompt Enabling Logic (`Chatbot.tsx`):** Fixed bugs related to enabling example chat prompts, ensuring they activate correctly based on available data and analysis for the current ticker.
    *   **Error Handling & React Transitions:** Added more defensive checks for potentially undefined state properties and ensured server action dispatches are wrapped in `React.startTransition` in `StockAnalysisProvider`, resolving UI hangs and improving smoothness.
    *   **Notification Loop Prevention (`StockAnalysisPage.tsx`):** Implemented `useRef` hooks to track toast timestamps, preventing duplicate notifications.

---

## File Manifest:

### Added Files (1):
*   `src/actions/`
    *   `perform-ai-analysis-action.ts`

### Modified Files (14):
*   `(Project Root)`
    *   `git_commit_msg.md`
*   `src/actions/`
    *   `analyze-stock-server-action.ts`
*   `src/ai/`
    *   `dev.ts`
*   `src/ai/flows/`
    *   `analyze-stock-data.ts`
    *   `chat-flow.ts`
*   `src/ai/schemas/`
    *   `chat-prompts.ts`
    *   `chat-schemas.ts`
    *   `stock-fetch-schemas.ts`
*   `src/app/`
    *   `page.tsx`
*   `src/components/`
    *   `chatbot.tsx`
    *   `stock-analysis-page.tsx`
*   `src/contexts/`
    *   `stock-analysis-context.tsx`
*   `src/services/data-sources/`
    *   `index.ts`
    *   `types.ts`

### Removed Files (5):
*   `src/ai/flows/`
    *   `fetch-stock-data.ts`
*   `src/ai/schemas/`
    *   `web-search-schemas.ts`
*   `src/ai/tools/`
    *   `web-search-tool.ts`
*   `src/services/data-sources/adapters/`
    *   `ai-search-adapter.ts`
    *   `mock-adapter.ts`

---
**Previous Message (for reference, now superseded by the above):**
[v1.2.9] [Refactor & Fix] Two-Stage Analysis, API-Only Data Sources, No Chat Tools, and Stability
... (original content of the previous v1.2.9 commit message) ...
