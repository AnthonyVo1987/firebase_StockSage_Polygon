[v1.2.11] [Feat & UI] Enhanced Chat, New Analysis Flow, UI/UX Improvements

Details:
Version 1.2.11 introduces several key enhancements focused on user experience, AI interaction, and providing more comprehensive analysis options. This includes relocating the financial disclaimer from AI prompts to the main UI, enabling full chat history export/copy, increasing the main content area size, displaying the app version, and adding a new "AI Full Stock Analysis" workflow that combines data fetching, key takeaway generation, and an automatic detailed chat analysis into a more streamlined process.

---

## Key Changes & Enhancements for v1.2.11:

### 1. Disclaimer Management & AI Prompt Refinement:
    *   **Disclaimer Relocated to UI:** The financial advice disclaimer ("⚠️ StockSage is for demonstration purposes only...") has been removed from AI system prompts (specifically in `chat-flow.ts`).
    *   This disclaimer is now prominently displayed at the top of the main application page (`src/app/page.tsx`) and reiterated in the footer. This allows the AI to provide more direct financial insights while ensuring users are consistently reminded of the informational nature of the content.
    *   The application version (1.2.11) is now displayed in the header of `src/app/page.tsx`.

### 2. Enhanced Chatbot Functionality:
    *   **Full Chat History Export/Copy:** The "Copy" and "Export (.md)" buttons in the Chatbot UI (`src/components/chatbot.tsx`) now process the *entire* current chat conversation, rather than just the latest AI message. A helper function `formatChatHistoryForExport` was implemented for this. Button labels and titles have been updated to reflect this change.
    *   **New "Full Detailed Analysis" Chat Prompt Button:** An example prompt button for "Full Detailed Analysis (Combined)" has been added (`src/ai/schemas/chat-prompts.ts`). This prompt instructs the AI to provide a single, comprehensive response covering stock trader takeaways, options trader considerations, and additional holistic points.

### 3. New "AI Full Stock Analysis" Workflow:
    *   **New Button in UI:** A new button, "AI Full Stock Analysis," has been added to `src/components/stock-analysis-page.tsx`.
    *   **Sequential Operation:**
        1.  Clicking this button triggers the standard stock data fetch (`fetchStockDataAction`) and the AI key takeaways generation (`performAiAnalysisAction`).
        2.  `fetchStockDataAction` (`src/actions/analyze-stock-server-action.ts`) now includes an `initiateFullChatAnalysis` flag in its state, set based on which analysis button (`analysisType` in `FormData`) was clicked.
        3.  If the initial data fetch and key takeaway generation are successful, `StockAnalysisProvider` (`src/contexts/stock-analysis-context.tsx`) detects the `initiateFullChatAnalysis` flag (managed as `triggerFullChatAfterAnalysis` in context state) and automatically triggers the "Full Detailed Analysis" chat prompt using the freshly analyzed data and key takeaways.
    *   This provides a one-click option for users to get a deeper, multi-faceted AI analysis after the initial data presentation.
    *   Button click handling in `stock-analysis-page.tsx` was refactored to use explicit `onClick` handlers for each analysis button, ensuring the `analysisType` ('standard' or 'fullDetail') is correctly set in `FormData`.
    *   The `StockAnalysisProvider` now manages a `formRef` to allow child components (like the analysis buttons) to correctly construct `FormData` from the main form.

### 4. UI Sizing and Layout Adjustments:
    *   **Increased Width:** The main content cards for both the Stock Analysis section (`src/components/stock-analysis-page.tsx`) and the AI Chat Assistant (`src/components/chatbot.tsx`) have been widened from `max-w-4xl` to `max-w-5xl` for better use of space.
    *   **Increased Chat Height:** The scrollable message area within the AI Chat Assistant (`src/components/chatbot.tsx`) has been made taller, changing from `h-72` to `h-96`.

---

## File Manifest for v1.2.11:

### Modified Files (7):
*   `src/actions/analyze-stock-server-action.ts`
*   `src/ai/flows/chat-flow.ts`
*   `src/ai/schemas/chat-prompts.ts`
*   `src/app/page.tsx`
*   `src/components/chatbot.tsx`
*   `src/components/stock-analysis-page.tsx`
*   `src/contexts/stock-analysis-context.tsx`
*   `git_commit_msg.md` (This file)
*   `README.md`
*   `docs/[1.2.9]_PRD_Destailed_Design_StockSage.md`


### Added Files:
*   None

### Removed Files:
*   None

---
**Previous Version (v1.2.9 - Commit #f61149e6) Message (for reference):**
[v1.2.9] [Refactor & Feat] API-Only Data, No Chat Tools, Two-Stage Analysis & Stability
Details:
This consolidated commit for v1.2.9 marks a significant evolution of StockSage, streamlining its core functionalities and enhancing stability. Key changes include: a refactor to a two-stage stock analysis process (data fetch then AI analysis), the complete removal of all mock data functionality, the consolidation of data sources to be strictly API-based (initially Polygon.io, with UI flexibility for future API providers), and the removal of all web search tools from the AI chatbot. These changes simplify the codebase, improve perceived performance, ensure AI insights are data-driven, and resolve critical bugs, including the "Unsupported GeminiPart type" error in the chatbot.
The application now exclusively uses API data sources, starting with Polygon.io, for fetching market status, ticker snapshots (including previous day's data), and a predefined set of Technical Analysis (TA) indicators. This change ensures that all analysis and insights are grounded in verifiable, externally sourced data.
The AI chatbot's capabilities have been refined to operate solely on its general knowledge and any context provided by the user (such as the current stock data displayed on the page). All tools that enabled external web searches or data fetching (e.g., `webSearchTool`, Google Search via `toolConfig`) have been removed from the `chat-flow.ts`. This simplifies the chatbot's operation and makes its responses more predictable based on the given inputs.
A significant architectural change is the implementation of a two-stage stock analysis process managed by the `StockAnalysisProvider` and client-side `useEffect` hooks:
1.  `fetchStockDataAction`: User initiates analysis, data is fetched from the selected API (e.g., Polygon) via server action.
2.  `performAiAnalysisAction`: Upon successful data fetch from the API, the client automatically triggers a second server action to perform AI analysis (key takeaways) based *only* on the fetched JSON data.
This two-stage process improves UI responsiveness by displaying fetched data quickly, followed by AI-generated insights. It also clearly separates data acquisition from AI interpretation.
Client-side logging, theme management, and data export functionalities remain robust. The Debug Console continues to provide detailed tracing for easier troubleshooting. The `genkitPluginNextjs()` has been kept removed from `src/ai/genkit.ts` for stability, a lesson learned from previous attempts to resolve `async_hooks` issues with Turbopack. The `next.config.ts` is also kept minimal, without webpack fallbacks for `async_hooks`.
These changes contribute to a more stable, reliable, and data-centric version of StockSage, laying a solid foundation for future enhancements.

File Manifest for v1.2.9:
Modified:
- src/actions/analyze-stock-server-action.ts
- src/actions/chat-server-action.ts
- src/actions/perform-ai-analysis-action.ts
- src/ai/flows/analyze-stock-data.ts
- src/ai/flows/chat-flow.ts
- src/ai/genkit.ts
- src/ai/schemas/chat-prompts.ts
- src/ai/schemas/chat-schemas.ts
- src/ai/schemas/stock-analysis-schemas.ts
- src/ai/schemas/stock-fetch-schemas.ts
- src/components/chatbot.tsx
- src/components/stock-analysis-page.tsx
- src/contexts/stock-analysis-context.tsx
- src/services/data-sources/adapters/polygon-adapter.ts
- src/services/data-sources/index.ts
- src/services/data-sources/types.ts
- next.config.ts
- README.md (updated PRD section)
- docs/[1.2.9]_PRD_Destailed_Design_StockSage.md (new)
- docs/pain_points.md (new)
Removed:
- src/ai/flows/fetch-stock-data.ts (AI-driven data fetching removed)
- src/ai/schemas/web-search-schemas.ts
- src/ai/tools/web-search-tool.ts
- src/services/data-sources/adapters/ai-search-adapter.ts
- src/services/data-sources/adapters/mock-adapter.ts
Added:
- src/ai/dev.ts (updated to reflect removed flows/tools)
(Note: `package.json` and `components.json` might have minor updates due to shadcn/genkit versions but are structurally aligned with v1.2.7.)
```

    