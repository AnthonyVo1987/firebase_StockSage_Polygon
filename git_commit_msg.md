[v1.2.9] [Refactor & Fix] Two-Stage Analysis, Enhanced Prompts, and State Stability

Details:
This commit introduces a significant refactoring of the stock analysis process into a two-stage operation (data fetch, then AI analysis), enhances AI prompt directives for more focused responses, and addresses several critical bugs related to state management, UI updates, and AI interaction. The primary goals were to improve user experience by providing faster initial data, ensure AI outputs are strictly data-driven, and stabilize the application's behavior across different user interactions and ticker changes.

---

## Key Changes & Enhancements for v1.2.9:

### 1. Two-Stage Stock Analysis & UI Orchestration:
The core stock analysis functionality has been refactored into two distinct stages: data fetching/generation, followed by AI-driven analysis. This allows users to see raw data more quickly while AI processing occurs.
    *   **Server Actions:** The monolithic analysis action was split. `src/actions/analyze-stock-server-action.ts` was refactored to serve as the `fetchStockDataAction` (for data retrieval), and `src/actions/perform-ai-analysis-action.ts` was newly created for AI insights.
    *   **Context Provider (`StockAnalysisProvider`):** Manages the two-stage flow using separate `useActionState` hooks for each action. It orchestrates the sequence, triggering AI analysis automatically upon successful data fetch. Robust state reset logic ensures data integrity across new ticker requests, and stricter checks prevent stale data from previous requests from interfering.
    *   **UI Updates (`StockAnalysisPage`):** The UI now clearly reflects the two-stage process, displaying fetched data immediately and showing distinct loading states for both data fetching and AI analysis. Error messages and export controls are more granular and state-aware.
    *   _Benefit:_ Improved perceived performance, more granular UI feedback, and more modular code.

### 2. AI Prompt Enhancements & Tool Reliability:
AI prompts have been significantly refined to ensure responses are more focused and strictly data-driven, and tool interactions are more reliable.
    *   **Stock Analysis Prompt (`analyze-stock-data.ts`):** The prompt now explicitly instructs the AI to avoid generic market commentary, advice on after-hours trading, or speculation on external events/catalysts not present in the provided JSON data. Takeaways must be derived exclusively from the numerical data supplied.
    *   **Chatbot Prompt (`chat-flow.ts`):** The chatbot system instruction now mandates that when using provided stock data or AI analysis context, its responses must be strictly limited to that information, preventing speculation on external factors. The internal logic for passing `chatHistory` to the AI was also simplified, resolving potential "Unsupported GeminiPart type" errors during tool use.
    *   **Example Chat Prompts:** The options trader example prompt was updated to remove speculative elements.
    *   **Tool Reliability (`web-search-tool.ts`):** The mock `webSearchTool`'s output schema was simplified to `z.string()`, and the tool now formats its mock results into a single descriptive string. This resolved "Unsupported GeminiPart type" errors by ensuring a more robust output contract.
    *   _Benefit:_ More relevant and data-grounded AI stock takeaways, more reliable chatbot responses, and resolution of specific AI interaction errors.

### 3. Critical Bug Fixes and Stability Improvements:
Several critical bugs related to state management, UI updates, error handling, and component interactions were addressed to enhance overall application stability.
    *   **State Synchronization & Stale Data Handling:** Implemented stricter checks in the `StockAnalysisProvider`'s `useEffect` hooks to ensure that data and analysis results are only merged if their respective tickers match the current operational ticker. More thorough state reset logic was applied for new ticker requests.
    *   **Chatbot Prompt Enabling Logic (`Chatbot.tsx`):** Fixed a bug where example chat prompts would not enable correctly. The `Chatbot` now directly consumes `combinedServerState` and `aiAnalysisResultState` from context, with robust conditions checking for data and analysis availability for the *current* ticker.
    *   **Error Handling & React Transitions:** Resolved "Cannot read properties of undefined (reading 'timestamp')" errors by adding more defensive checks before accessing properties of potentially not-yet-fully-populated state objects. Ensured imperative calls to action dispatchers (from `useActionState`) are wrapped in `React.startTransition` in the `StockAnalysisProvider`, resolving "called outside of a transition" errors and improving UI update smoothness.
    *   **Notification Loop Prevention (`StockAnalysisPage.tsx`):** Implemented `useRef` hooks to track timestamps of the last shown toasts for specific events (e.g., analysis success/error), preventing duplicate notifications for the same event.
    *   _Benefit:_ Significantly increased application stability and predictability, consistent use of correct data context, and elimination of UI hangs, erroneous notification loops, and improperly disabled UI features.

---

## File Manifest:

**Added Files:**
*   `src/actions/perform-ai-analysis-action.ts` (New server action for the AI analysis stage)

**Modified Files:**
*   `src/actions/analyze-stock-server-action.ts` (Refactored to become the new `fetchStockDataAction`)
*   `src/contexts/stock-analysis-context.tsx` (Major refactoring for two-stage state, resets, and stale data handling)
*   `src/components/stock-analysis-page.tsx` (Major updates for two-stage UI orchestration, loading states, error handling, and toast control)
*   `src/components/chatbot.tsx` (Updated context consumption and logic for enabling example prompts)
*   `src/ai/flows/analyze-stock-data.ts` (Prompt enhancements)
*   `src/ai/flows/chat-flow.ts` (Prompt enhancements and history passing simplification)
*   `src/ai/schemas/chat-prompts.ts` (Example prompt text update)
*   `src/ai/schemas/web-search-schemas.ts` (Simplified tool output schema)
*   `src/ai/tools/web-search-tool.ts` (Updated tool implementation to return a string)
*   `git_commit_msg.md` (Updated with this commit message)

**Removed Files:**
*   None (Note: The previous monolithic server action for analysis was effectively replaced by the refactored `src/actions/analyze-stock-server-action.ts` (now `fetchStockDataAction`) and the new `src/actions/perform-ai-analysis-action.ts`.)
