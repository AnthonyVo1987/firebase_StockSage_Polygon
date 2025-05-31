
[v1.2.5] [Refactor] Phase 2 Tasks: Data Abstraction, Context State, Export & Prompts

Details:
This commit completes a significant refactoring phase (Phase 2, Tasks 3, 4, and 5) aimed at improving the application's modularity, state management, and code organization.
Firebase commit #b9b57573

Key Changes:

**1. Task 3: Data Source Abstraction Layer**
    *   Introduced a data source abstraction layer (`src/services/data-sources/`) to decouple core logic from specific data provider implementations (Polygon.io, AI-generated mock, AI-powered search).
    *   Defined an `IDataSourceAdapter` interface and common types in `src/services/data-sources/types.ts`.
    *   Implemented adapters for Polygon (`polygon-adapter.ts`), AI-driven mock data (`mock-adapter.ts`), and AI-driven search-based data (`ai-search-adapter.ts`).
    *   Refactored `analyze-stock-server-action.ts` to use the new `fetchStockDataFromSource` service.
    *   Enhanced the `fetch-stock-data.ts` Genkit flow and its schema (`stock-fetch-schemas.ts`) to ensure `marketStatus` is a mandatory part of `StockDataJson` for consistency.
    *   The old `polygon-service.ts` has been emptied and is now obsolete.

**2. Task 4: UI State Management - Introduce React Context**
    *   Implemented a React Context (`src/contexts/stock-analysis-context.tsx`) to manage global UI state related to stock analysis and chatbot interactions.
    *   The context uses `useActionState` for server actions (`handleAnalyzeStock`, `handleChatSubmit`), centralizing state updates and pending flags.
    *   It also manages cumulative AI usage statistics.
    *   Refactored `stock-analysis-page.tsx` and `chatbot.tsx` to consume state and actions from this new context, eliminating prop drilling and improving component decoupling.
    *   Improved initial page load behavior to prevent premature display of "pending" messages in the AI Key Takeaways section.

**3. Task 5: Refactor Data Export Logic & Centralize Chatbot Prompts**
    *   **Task 5.1: Extract Data Export Logic & Utilities**
        *   Created `src/lib/export-utils.ts` to house all core utility functions for data formatting (JSON, Text, CSV), file downloading, clipboard copying, and helper functions (e.g., timestamp generation, CSV field escaping).
        *   Introduced a reusable `DataExportControls` component (`src/components/data-export-controls.tsx`) to render standardized export/copy buttons, utilizing the new utilities.
        *   Refactored `stock-analysis-page.tsx` to use the `DataExportControls` component, significantly cleaning up the page component by removing repetitive export logic.
    *   **Task 5.2: Centralize Chatbot Example Prompts**
        *   Created `src/ai/schemas/chat-prompts.ts` to define and store the `ExamplePrompt` interface and the `examplePrompts` array.
        *   Refactored `chatbot.tsx` to import and use these centralized prompts, removing the internal definition.
        *   Updated the chat response download functionality in `chatbot.tsx` to save files as `.md` (Markdown) with the correct MIME type.

Benefits:
*   Enhanced modularity and maintainability across data fetching, state management, and UI components.
*   Improved code organization and separation of concerns.
*   Easier to add new data sources or AI models in the future.
*   More robust and cleaner UI state handling.

File Manifest:

Added Files:
*   `src/services/data-sources/types.ts`
*   `src/services/data-sources/adapters/polygon-adapter.ts`
*   `src/services/data-sources/adapters/mock-adapter.ts`
*   `src/services/data-sources/adapters/ai-search-adapter.ts`
*   `src/services/data-sources/index.ts`
*   `src/contexts/stock-analysis-context.tsx`
*   `src/lib/export-utils.ts`
*   `src/components/data-export-controls.tsx`
*   `src/ai/schemas/chat-prompts.ts`

Modified Files:
*   `src/actions/analyze-stock-server-action.ts`
*   `src/ai/schemas/stock-fetch-schemas.ts`
*   `src/ai/flows/fetch-stock-data.ts`
*   `src/components/stock-analysis-page.tsx`
*   `src/components/chatbot.tsx`

Deleted Files (or Emptied for Deletion):
*   `src/services/polygon-service.ts` (Content was emptied; file should be removed from version control if not already.)
