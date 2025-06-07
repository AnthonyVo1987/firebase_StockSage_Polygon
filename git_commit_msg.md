[v1.2.12] [Fix & Feat] Form Submission, Data Formatting, Chat AI Robustness & PRD Consolidation

Details:
Version 1.2.12 addresses a bug with form submission via the Enter key, standardizes numerical data formatting (two decimal places and dollar prefix for prices), and implements several improvements to enhance the robustness and completeness of AI-generated chat responses, particularly for the "Full Detailed Analysis" feature. This version also consolidates the PRD into README.md as the single source of truth.

---

## Key Changes & Enhancements for v1.2.12:

### 1. Bug Fixes:
    *   **Enter Key Form Submission (`src/components/stock-analysis-page.tsx`):**
        *   Resolved an issue where pressing Enter in the stock ticker input field would cause a full page refresh instead of initiating the analysis.
        *   Implemented an `onSubmit` handler for the main analysis form. This handler now correctly captures form data, defaults `analysisType` to 'standard' for Enter key submissions, and invokes the `submitFetchStockDataForm` action from the context.

### 2. Data Formatting Improvements:
    *   **Two Decimal Point Precision for Numerical Data:**
        *   **New Utility (`src/lib/number-utils.ts`):** Created `formatToTwoDecimalsOrNull` to consistently format numbers to a maximum of two decimal places, returning `null` for invalid inputs.
        *   **AI Calculated TA (`src/ai/flows/calculate-ai-ta-flow.ts`):** Applied the new formatting utility to all Pivot Point and Support/Resistance level calculations before they are stored and displayed.
        *   **AI Key Takeaways Prompt (`src/ai/flows/analyze-stock-data.ts`):** Updated the prompt to instruct the AI to use a maximum of two decimal places for numerical values in its textual takeaways.
    *   **Dollar Sign ($) Prefix for Monetary Values:**
        *   **AI Key Takeaways Prompt (`src/ai/flows/analyze-stock-data.ts`):** Enhanced the prompt to instruct the AI to always precede monetary values (e.g., stock prices, OHLC, VWAP, changes) with a dollar sign. Example output in the prompt was also updated.
        *   **AI Chatbot Prompt (`src/ai/flows/chat-flow.ts`):** Added a similar instruction to the chatbot's system prompt and behavior guidelines to ensure monetary values in chat responses are prefixed with "$".

### 3. AI Chatbot Robustness (Full Detailed Analysis):
    *   **Model Parameters (`src/ai/flows/chat-flow.ts`):**
        *   Adjusted `safetySettings` for the `financialChatPrompt` to `BLOCK_ONLY_HIGH` for all harm categories to reduce potential for overly cautious truncation.
        *   Lowered `temperature` for the `financialChatPrompt` from `0.5` to `0.2` to encourage more focused and complete outputs.
        *   (Note: `maxOutputTokens` was already at `4096`, confirmed sufficient).
    *   **Prompt Refinement (`src/ai/schemas/chat-prompts.ts`):**
        *   Modified the "Full Detailed Analysis (Combined)" example prompt to request "up to three" key takeaways for stock trader and options trader sections.
        *   Standalone example prompts for stock/options takeaways were also updated to "up to three" for consistency.
    *   **Completeness Instruction (`src/ai/flows/chat-flow.ts`):** Added an explicit guideline to the chat system prompt for the AI to ensure it addresses all parts of multi-part user questions.

### 4. Documentation & PRD Management:
    *   **PRD Consolidation (`README.md`):**
        *   The `README.md` file has been updated to serve as the sole, canonical Product Requirements Document (PRD) for StockSage v1.2.12.
        *   A "PRD Management Note" has been added to the `README.md` outlining the policy that it is the single source of truth and must be self-contained.
        *   Section 4 (User Stories) and Section 6.9 (Known Development Challenges) were expanded to ensure full detail and remove external dependencies (like `docs/pain_points.md`).
        *   The internal changelog within `README.md` has been updated to reflect these changes and the PRD consolidation.
    *   **Application Version Update (`src/app/page.tsx`):**
        *   The displayed application version in the UI has been updated to "1.2.12".
    *   **Obsolete Documentation (Effective Removal):**
        *   Older PRD files in the `docs/` directory (`docs/PRD_Detailed_Design_StockSage.md`, `docs/PRD_StockSage_v1.0.0.md`, `docs/[1.2.9]_PRD_Destailed_Design_StockSage.md`) and `docs/pain_points.md` have had their content cleared as they are now superseded by `README.md`.

---

## File Manifest for v1.2.12 (Changes from v1.2.11):

### Added Files (2):
*   `src/lib/number-utils.ts`
*   `src/ai/flows/calculate-ai-ta-flow.ts`

### Modified Files (7):
*   `src/components/stock-analysis-page.tsx`
*   `src/ai/flows/analyze-stock-data.ts`
*   `src/ai/flows/chat-flow.ts`
*   `src/ai/schemas/chat-prompts.ts`
*   `src/app/page.tsx`
*   `README.md`
*   `git_commit_msg.md` (This file)

### Effectively Removed/Emptied Files (Content superseded by README.md):
*   `docs/PRD_Detailed_Design_StockSage.md`
*   `docs/PRD_StockSage_v1.0.0.md`
*   `docs/[1.2.9]_PRD_Destailed_Design_StockSage.md`
*   `docs/pain_points.md`

---
**Previous Version (v1.2.11 - Commit #298d8962) Message (for reference):**
[v1.2.11] [Feat & UI] Enhanced Chat, New Analysis Flow, UI/UX Improvements
Details:
Version 1.2.11 introduces several key enhancements focused on user experience, AI interaction, and providing more comprehensive analysis options. This includes relocating the financial disclaimer from AI prompts to the main UI, enabling full chat history export/copy, increasing the main content area size, displaying the app version, and adding a new "AI Full Stock Analysis" workflow that combines data fetching, key takeaway generation, and an automatic detailed chat analysis into a more streamlined process.
(Rest of v1.2.11 message omitted for brevity)
