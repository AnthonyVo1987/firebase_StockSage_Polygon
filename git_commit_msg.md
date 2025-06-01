
[v1.2.7] [Feature] Comprehensive Client-Side Debug Logging Enhancements

Details:
This commit combines two significant enhancements to the client-side debugging capabilities of the application.
The primary goal is to provide extensive and well-structured log messages in the browser's debug console, enabling developers (and AI assistants) to diagnose issues more effectively by analyzing client-side activity and state.

---

## Task 1.2.6: Enhanced Client-Side Debug Logging for Server Actions (Request/Response)

This task focused on introducing standardized debug logs for client-server interactions involving Next.js Server Actions. The aim was to gain clear visibility into the data payloads being sent to server actions and the state/data being returned.

**Key Changes (Task 1.2.6):**

1.  **Client Request Logging:**
    *   **`src/contexts/stock-analysis-context.tsx`**:
        *   Added `console.log` statements with a `[CLIENT_REQUEST]` prefix within the `submitStockAnalysisForm` and `submitChatForm` wrapper functions.
        *   These logs capture the name of the server action being called and a structured summary of the payload (e.g., ticker, data source for stock analysis; user prompt, context presence for chat) before the action is invoked.

2.  **Client Response Logging:**
    *   **`src/components/stock-analysis-page.tsx`**:
        *   Enhanced the `useEffect` hook that processes `stockAnalysisServerState`.
        *   Added a `console.log` statement with a `[CLIENT_RESPONSE]` prefix to summarize the state received from the `handleAnalyzeStock` server action (e.g., presence of stock JSON, analysis, errors, usage reports, timestamp).
    *   **`src/components/chatbot.tsx`**:
        *   Enhanced the `useEffect` hook that processes `chatServerState`.
        *   Added a `console.log` statement with a `[CLIENT_RESPONSE]` prefix to summarize the state received from the `handleChatSubmit` server action (e.g., message count, presence of AI usage reports, errors, timestamp).

**Benefits (Task 1.2.6):**
*   **Improved Debuggability:** Provides a clear trace of data being sent to server actions and the corresponding data/state being returned to the client.
*   **Faster Iteration:** Reduces reliance on server-side logs for understanding client-server communication flow.
*   **Consistent Logging Style:** Uses standardized `[CLIENT_REQUEST]` and `[CLIENT_RESPONSE]` prefixes.

---

## Task 1.2.7: Comprehensive Additional Client-Side Debug Logging

Building upon Task 1.2.6, this task expanded client-side logging to cover more areas of the application, aiming for a high degree of diagnosability from the debug console alone.

**Key Changes (Task 1.2.7):**

1.  **Data Export Utilities (`src/lib/export-utils.ts`):**
    *   Added `console.log` statements with `[ExportUtils:...]` prefixes to:
        *   `formatJsonForExport`: Logs input type and output length.
        *   `convertToTextForExport`: Logs title, input type, and output length.
        *   `convertToCsvForExport`: Logs title, data type hint, input type, and output length.
        *   `downloadFile`: Logs filename, MIME type, and content length.
        *   `copyToClipboardUtil`: Logs attempt, success, and failure states with content type and length.

2.  **Data Export Controls (`src/components/data-export-controls.tsx`):**
    *   Added `console.log` statements with `[DataExportControls]` prefix to `handleDownload` and `handleCopyToClipboard` to log button clicks, format, and data availability.

3.  **Stock Analysis Page (`src/components/stock-analysis-page.tsx`):**
    *   Added `console.log` statements with `[CLIENT:StockPageContent:DisplayJSON]` prefix to trace the parsing of `stockJson` for display (attempt, success, error).
    *   Enhanced error logging in the `useEffect` for `stockAnalysisServerState` to log the full server state object when a server error (not field error) occurs, prefixed with `[CLIENT:StockPageContent:ErrorState]`.

4.  **Chatbot Component (`src/components/chatbot.tsx`):**
    *   Added `console.log` statement with `[CLIENT:Chatbot:ContextPrep]` prefix to `constructAnalysisSummary` to log its execution and the summary generated.
    *   Added `console.log` statement with `[CLIENT:Chatbot:UIEffect]` prefix to the `useEffect` for `chatServerState` to log details about UI updates (e.g., input clearing) post-response.

5.  **Theme Provider (`src/components/theme-provider.tsx`):**
    *   Added `console.log` statements with `[ThemeProvider]` prefix to:
        *   Log initial theme determination (stored, default, final).
        *   Log when the theme is applied to the root element and localStorage is updated.
        *   Log when `setTheme` is called with the new theme.

**Benefits (Task 1.2.7):**
*   **Holistic Debug View:** Provides end-to-end tracing for critical user flows like data export, theme changes, and internal UI logic.
*   **Granular State Insight:** Offers more detailed information about data transformations, state at specific points, and decision-making within components and utilities.
*   **Enhanced AI Diagnosability:** The increased log density and specificity significantly improve the ability for an AI assistant (or developer) to diagnose issues by analyzing the debug console output.

---

Combined File Manifest:

Modified Files:
*   `src/contexts/stock-analysis-context.tsx`
*   `src/components/stock-analysis-page.tsx`
*   `src/components/chatbot.tsx`
*   `src/lib/export-utils.ts`
*   `src/components/data-export-controls.tsx`
*   `src/components/theme-provider.tsx`
*   `git_commit_msg.md` (Updated with this commit message)
