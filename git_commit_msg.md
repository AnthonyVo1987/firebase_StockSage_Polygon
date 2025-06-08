[v1.2.14] [Feature] Options Chain Enhancements (+/-10 Strikes, Sort, Streamline) building on v1.2.12 Stability

Details:
Version 1.2.14 significantly advances the application by introducing a robust options chain analysis feature. This builds upon the stability and fixes established in v1.2.12, providing users with a broader and more targeted range of options data, presented in a clear, sorted order, and with a more concise data structure.

---

## Context: Transition from v1.2.12

Version 1.2.12 focused on stabilizing the application with key improvements:
*   **Bug Fixes:** Notably, the Enter key form submission was fixed.
*   **Data Formatting Consistency:** Ensured numerical data (prices, changes) displayed with two decimal places and appropriate dollar signs.
*   **AI Chat Enhancements:** The "Full Detailed Analysis" prompt was refined, and AI model parameters were adjusted for better completeness.
*   **UI Consistency:** Reverted UI elements to a more stable state (pre-v1.2.13 attempts).
*   **Documentation & Process:** The PRD was consolidated into `README.md`, and stricter procedures for handling high-risk development changes (including Full Environment Re-Initialization) were documented.

Version 1.2.14 leverages this stable v1.2.12 baseline to deliver the new, comprehensive Options Chain Snapshot feature.

---

## Key Changes & Enhancements for v1.2.14 (Delta from v1.2.12):

### 1. Major Feature - Options Chain Snapshot Enhancements:
    *   **Dynamic Expiration Date Calculation:** The system now uses `src/lib/date-utils.ts` to determine the target expiration date as the current week's Friday (inclusive).
    *   **Advanced Data Fetching (Polygon.io):**
        *   Based on the current stock price, fetches options chain data from Polygon.io for the dynamically determined Friday expiration.
        *   Utilizes `rest.options.snapshotOptionChain` with `strike_price.gte` and `strike_price.lte` parameters for efficient windowed API queries around the current stock price.
    *   **Expanded & Targeted Strike Filtering:**
        *   Programmatically selects up to **10 strike prices above** and up to **10 strike prices below** the current stock price (including the current price itself if it's an available strike) from the fetched window.
        *   Retrieves and processes both calls and puts for these selected strikes.
    *   **Output Order Guarantee:** The `selected_strikes_data` array within the `optionsChain` object is now consistently sorted in **descending order** by strike price.
    *   **Streamlined Data Structure (`OptionContractDetails`):**
        *   Significantly reduced data verbosity by removing redundant or less critical fields. Removed fields include:
            *   Individual option contract `ticker` (e.g., "O:NVDA250613C00035000").
            *   `exercise_style`.
            *   Individual contract `expiration_date` (already at the top level of `optionsChain`).
            *   `last_quote` object.
            *   `underlying_asset` object within each contract.
    *   **Data Integration:** The fetched, filtered, and streamlined options chain data is now part of the main `stockJson` object under an `optionsChain` key.
    *   **UI Display:**
        *   The options chain raw JSON (now more concise and sorted descendingly by strike) is displayed in a dedicated `Textarea` on the main analysis page (`src/components/stock-analysis-page.tsx`).
    *   **Export Functionality:**
        *   Data export controls (`DataExportControls` component) for the options chain data are fully functional, exporting the new streamlined and sorted structure in JSON, Text, and CSV formats.

### 2. Technical Enhancements & Supporting Changes:
    *   **`src/services/data-sources/adapters/polygon-adapter.ts`:**
        *   Heavily refactored `_fetchAndProcessOptionsChain` method to implement the new API call strategy, +/-10 strike selection logic, and descending sort for `selected_strikes_data`.
        *   Updated `mapPolygonOptionSnapshotToContractDetails` method to align with the streamlined data structure.
    *   **`src/services/data-sources/types.ts`:**
        *   `OptionContractDetails` type definition updated to reflect the removed fields.
        *   `StockDataJson` type extended to include the new `optionsChain?: OptionsChainData;` field.
    *   **`src/lib/date-utils.ts`:**
        *   Includes the `calculateNextFridayExpiration` function, crucial for determining the target options expiration date.
    *   **`src/components/stock-analysis-page.tsx`:**
        *   Modified to display the new options chain JSON in its dedicated `Textarea`.
        *   Configured `DataExportControls` for the options chain data, passing the correct data and filename/title parameters.
        *   Updated to correctly parse and make `optionsChain` data available from `combinedServerState.stockJson`.
    *   **`src/contexts/stock-analysis-context.tsx`:**
        *   The `StockDataFetchState` and `CombinedStockAnalysisState` now implicitly handle `optionsChain` as part of `stockJson`.
        *   Ensures options data is available for UI display and export.
    *   **`src/app/page.tsx`:**
        *   Application version updated to "1.2.14".
        *   Restored to include the main `StockAnalysisPage` component, `ThemeProvider`, and other UI elements.
    *   **`src/app/layout.tsx`:**
        *   Restored to include Inter font and proper HTML structure.
    *   **Configuration Files (`package.json`, `package-lock.json`, `next.config.ts` etc.):**
        *   Reverted to known good v1.2.12 baseline configurations to ensure Firebase App Hosting compatibility and stable dependencies (Next.js 14.2.3, Genkit 1.1.0). This resolved previous build and deployment issues.

### 3. Documentation:
    *   `README.md` (PRD): Updated to fully reflect the v1.2.14 feature set, including the +/-10 strike count, API fetching strategy, descending sort, and streamlined data structure.
    *   `git_commit_msg.md` (This file): Comprehensively updated to capture all final implementation details of v1.2.14 and the delta from v1.2.12.
    *   `reinit.md`: Created and refined to provide accurate full environment re-initialization steps for local development.

---

## File Manifest for v1.2.14 (Reflecting Final Changes):

### Core Feature Modified/Added Files:
*   `src/services/data-sources/adapters/polygon-adapter.ts` (Primary logic for options chain enhancements)
*   `src/services/data-sources/types.ts` (Updated data types for options and stock JSON)
*   `src/lib/date-utils.ts` (Used for options expiration calculation)
*   `src/components/stock-analysis-page.tsx` (UI for displaying and exporting options data)
*   `src/contexts/stock-analysis-context.tsx` (Manages state including options data)

### Application Structure & Configuration:
*   `src/app/page.tsx` (App version updated to 1.2.14, main UI structure restored)
*   `src/app/layout.tsx` (Root layout restored)
*   `package.json` (Reflects stable v1.2.12 dependencies - Next.js 14.2.3, Genkit 1.1.0)
*   `package-lock.json` (Corresponds to the stable `package.json`)
*   `next.config.ts` (Reflects stable v1.2.12 Next.js configuration, includes `output: 'standalone'`)

### Documentation:
*   `README.md` (PRD fully updated for v1.2.14)
*   `git_commit_msg.md` (This file - comprehensive commit message)
*   `reinit.md` (New file detailing local re-initialization procedure)

---
This version significantly enhances the options data available for analysis by including a wider range of near-the-money weekly options (up to 10 strikes above and 10 below current price), sorted descendingly, and presented in a more concise data format. The fetching mechanism has also been optimized. These enhancements are built upon the stable dependency and configuration baseline established by reverting key configuration files to their v1.2.12 state.
```