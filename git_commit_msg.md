
[v1.2.6] [Feature] Enhanced Client-Side Debug Logging for Server Actions

Details:
This commit introduces enhanced client-side debug logging to provide better visibility into the request and response cycles of server actions. The goal is to aid in debugging client-server interactions directly from the browser's debug console, mimicking the style and informational content of server-side library logs where applicable for these interaction points.

Key Changes:

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

Benefits:
*   **Improved Debuggability:** Provides developers with a clear trace of data being sent to server actions and the corresponding data/state being returned to the client.
*   **Faster Iteration:** Reduces the need to solely rely on server-side logs for understanding client-server communication flow, allowing for quicker identification of issues related to data passing or state updates.
*   **Consistent Logging Style:** Uses standardized `[CLIENT_REQUEST]` and `[CLIENT_RESPONSE]` prefixes for easy identification in the `DebugConsole`.

These logs are captured by the existing `DebugConsole` component, making them readily accessible during development.

File Manifest:

Modified Files:
*   `src/contexts/stock-analysis-context.tsx`
*   `src/components/stock-analysis-page.tsx`
*   `src/components/chatbot.tsx`
*   `git_commit_msg.md` (Updated with this commit message)
