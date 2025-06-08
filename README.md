
# **Product Requirements Document & Detailed Design: StockSage v1.2.14**

*   **Document Version:** 1.2.14
*   **Based on Commit:** [COMMIT_HASH_FOR_V1.2.14]
*   **Date:** 2025-06-08
*   **Author:** Firebase Studio (AI)
*   **Status:** Current PRD - Single Source of Truth

---
**PRD Management Note:** This `README.md` file serves as the sole, canonical Product Requirements Document (PRD) for StockSage. All sections are intended to be complete and self-contained. When updating this PRD for new versions, ensure all relevant details are included directly within this document, without referencing previous PRD versions or external documents for brevity.
---

## **1. Introduction**

StockSage is an AI-powered web application designed to provide users with stock data analysis and insights. It allows users to input a stock ticker, select an API data source (currently Polygon.io), retrieve relevant market data, and receive AI-generated key takeaways. The fetched data includes market status, a quote snapshot, standard technical analysis indicators, AI-calculated Pivot Points, and a near-the-money options chain snapshot for the current week's Friday expiration. For v1.2.14, the options chain feature has been significantly enhanced to fetch up to 10 strike prices above and 10 below the current stock price (sorted descendingly) with a streamlined and more concise data structure for individual option contracts. All data (user-friendly presentations and raw JSON) is displayed on the main analysis page. Users can opt for a standard analysis or an "AI Full Stock Analysis" which automatically triggers a detailed chat-based analysis. Additionally, users can interact with an AI chatbot for more detailed analysis or general financial queries. The application emphasizes a user-friendly interface, clear presentation of data, API-driven data integrity, and the integration of generative AI for deeper understanding. A prominent disclaimer regarding the informational nature of AI responses is displayed. This document details the state of the application as of v1.2.14.

## **2. Goals**

*   **Provide Accessible Stock Analysis:** Enable users to quickly fetch and view stock market status, quote data, standard technical indicators, AI-calculated TA, and a relevant options chain snapshot (up to +/-10 strikes from current price, sorted descendingly, with streamlined contract data) from API data sources, presented in user-friendly formats and raw JSON directly on the main page.
*   **Enhance Data Readability:** Offer clear and structured views of market status, stock snapshot, standard TAs, AI-calculated TAs, and options chain data alongside raw JSON data (with streamlined options contracts).
*   **Deliver AI-Powered Insights:** Offer AI-generated analysis (key takeaways and optional detailed chat analysis) based on fetched API data (sourced from raw JSON) to help users understand stock data.
*   **Facilitate Interactive Exploration:** Allow users to engage in a contextual chat with an AI assistant regarding stock data and financial topics.
*   **Ensure Data Integrity (Contextual & API-Driven):** Prioritize fetching market status from API sources to provide a temporal context for all data. All stock data is sourced from APIs, with raw JSON readily available for AI and debugging.
*   **Offer User-Friendly Interface:** Present information clearly using modern UI components, light/dark theme support, and appropriate content area sizing.
*   **Maintain User Awareness:** Clearly communicate that AI-generated content is for informational purposes and not financial advice.
*   **Enable Comprehensive Debugging:** Provide extensive client-side logging, a powerful debug console, and easy access to raw JSON data for all fetched categories.
*   **Establish a Stable Foundation:** Maintain a reliable v1.2.14 platform for future enhancements.

## **3. Target Audience**

*   **Retail Investors:** Individuals looking for tools to supplement their stock research and gain quick insights, including a broader view of near-the-money options data.
*   **Financial Enthusiasts & Learners:** Users interested in understanding stock data, technical analysis, near-the-money options chains (up to +/-10 strikes), and AI applications in finance.
*   **Traders (Novice to Intermediate):** Individuals seeking a quick overview of a stock's recent performance, indicators, and a relevant set of near-the-money options, with options for deeper AI-driven analysis.
*   **Developers & AI Assistants:** Technical users who need to understand, debug, and extend the application's functionality.

## **4. User Stories (Reflecting v1.2.14 Functionality)**

*   **As a user, I want to** view fetched stock data (market status, quote snapshot, TA indicators, AI-calculated TA, options chain) and raw JSON data for each on a single page **so that I can** easily understand and inspect the information.
*   **As a user, I want to** enter a stock ticker (or use a default) **so that I can** retrieve its latest available market status, quote, technical analysis data (including AI-calculated TA), and an options chain snapshot for the current week's Friday expiration (up to 10 strikes above and 10 strikes below the current price, sorted descendingly, with streamlined contract details) from an API source.
*   **As a user, I want to** submit the analysis form by pressing the Enter key in the stock ticker input field **so that I don't always have to click the "Analyze Stock" button.**
*   **As a user, I want to** choose between a standard analysis (data + key takeaways) or an "AI Full Stock Analysis" (data + key takeaways + automated detailed chat analysis) **so that I can** control the depth of immediate AI insight.
*   **As a user, I want to** see the current market status (e.g., open, closed, server time) fetched from the API presented clearly **so that I can** understand the timeliness and context of the data.
*   **As a user, I want to** view AI-generated key takeaways (Price Action, Trend, Volatility, Momentum, Patterns) based *only* on the fetched API data (including AI TA and potentially options data context if available), with sentiment highlighting **so that I can** quickly understand its technical posture.
*   **As a user, I want to** see all numerical financial data (prices, changes, AI TA values, option prices) presented consistently with a maximum of two decimal places (or more for specific items like IV) and dollar signs for monetary values in the user-friendly views.
*   **As a user, I want to** see a clear disclaimer in the UI that AI-generated content is not financial advice.
*   **As a user, I want to** chat with an AI assistant about the analyzed stock, its options, or other financial topics **so that I can** ask follow-up questions and get more detailed explanations.
*   **As a user, I want to** have an example prompt to request a "Full Detailed Analysis" in the chat.
*   **As a user, I want to** copy or export the *entire* chat conversation.
*   **As a user, I want to** see the application version displayed in the UI.
*   **As a user, I want to** view the application content comfortably with increased width for analysis and chat areas.
*   **As a user, I want to** be able to toggle between light and dark themes.
*   **As a user, I want to** be able to download or copy the fetched stock data (full JSON), AI-calculated Technical Analysis (JSON), AI Key Takeaways (JSON), and Options Chain data (JSON) in various formats (JSON, Text, CSV) **so that I can** use this information externally or for record-keeping.
*   **As a developer or admin, I want to** access an in-app debug console.

## **5. Features - v1.2.14**

### **5.1. Stock Analysis Core**
*   **Ticker Input & API Data Source Selection:** User inputs ticker and selects API source (Polygon.io).
*   **Form Submission:** Via buttons or Enter key in ticker input.
*   **Multi-Stage Analysis Process:**
    1.  Data Fetching (`fetchStockDataAction`):
        *   Market Status.
        *   Stock Snapshot (current & previous day).
        *   Standard Technical Indicators.
        *   **ENHANCED: Options Chain Snapshot**
            *   Dynamically determines current week's Friday expiration.
            *   Fetches a window of options contracts from Polygon.io using `strike_price.gte` and `strike_price.lte` around the current stock price.
            *   Programmatically selects up to **10 strike prices above** and up to **10 strike prices below** the current stock price (including the current price if available as a strike).
            *   Retrieves both calls and puts for these selected strikes.
            *   The final `selected_strikes_data` is sorted in **descending order** by strike price.
            *   Individual `OptionContractDetails` have a **streamlined data structure**, removing redundant fields (e.g., individual contract `ticker`, `exercise_style`, `expiration_date`, `last_quote`, nested `underlying_asset`).
    2.  AI-Calculated TA (`calculateAiTaAction`).
    3.  AI Key Takeaways (`performAiAnalysisAction`).
    4.  Automated Full Detailed Chat Analysis (Optional).
*   **Data Display (`src/components/stock-analysis-page.tsx`):**
    *   `KeyMetricsDisplay.tsx`: Shows top-level snapshot highlights.
    *   AI Key Takeaways: User-friendly display with sentiment highlighting.
    *   Raw Stock & Market Data JSON: `Textarea` displaying combined data (excluding options).
    *   Raw AI Calculated TA JSON: `Textarea` displaying `combinedServerState.calculatedAiTaJson`.
    *   **ENHANCED: Raw Options Chain JSON:** `Textarea` displaying the streamlined `combinedServerState.stockJson.optionsChain`, sorted descendingly by strike price.
*   **Data Export/Copy:** Functionality to export/copy fetched stock data, options chain data (now streamlined), AI TA, and key takeaways.

### **5.2. AI Chatbot**
*   Contextual chat using raw JSON data (including streamlined options if available), AI analysis summary, and AI TA.
*   Markdown & emoji responses, example prompts, monetary value formatting.
*   Robustness settings.
*   Full chat history export/copy.

### **5.3. User Interface & Experience**
*   Disclaimer in UI, application version display, increased content width, responsive design, ShadCN components, light/dark theme, toasts, 'Inter' font.
*   Numerical data formatted appropriately.

### **5.4. Developer Experience & Debugging**
*   Client-side logging, Debug Console.
*   Raw JSON data readily available for all fetched data categories.

## **6. Design & Architecture - v1.2.14**

### **6.1. Tech Stack**
*   (No changes from v1.2.12)

### **6.2. High-Level Overall Diagram (Textual Representation)**
*   (Largely same as v1.2.12, but `Data Services (PolygonAdapter)` now has a more sophisticated interaction for options data with Polygon.io API, involving windowed fetching and client-side selection.)

### **6.3. Detailed Code & Data Flows**
*   **Stock Analysis Workflow:**
    1.  User interaction on `StockAnalysisPage.tsx` triggers server actions.
    2.  `fetchStockDataAction`:
        *   `PolygonAdapter.getFullStockData` is called.
        *   Inside `PolygonAdapter._fetchAndProcessOptionsChain`:
            *   Fetches Market Status.
            *   Fetches Stock Snapshot.
            *   **NEW/ENHANCED:**
                *   Uses current stock price from snapshot to calculate target Friday expiration date.
                *   Fetches a window of options contracts (calls and puts separately) from Polygon.io using `rest.options.snapshotOptionChain` with `strike_price.gte` and `strike_price.lte` parameters relative to the current stock price.
                *   From the fetched window, programmatically selects up to 10 strikes above and 10 strikes below the current price.
                *   Assembles data for these selected strikes, ensuring the `OptionContractDetails` are streamlined (redundant fields removed).
                *   The final `selected_strikes_data` array within the `optionsChain` object is sorted in **descending order** by strike price.
            *   Fetches Standard Technical Indicators.
        *   All data (including the expanded and streamlined options) is combined into `stockJson` string.
    3.  Server actions (`calculateAiTaAction`, `performAiAnalysisAction`) and Genkit flows execute, populating `combinedServerState`.
    4.  **Client-Side Presentation (`StockAnalysisPage.tsx`):**
        *   `KeyMetricsDisplay` reads from `combinedServerState.stockJson.stockSnapshot`.
        *   AI Key Takeaways are rendered from `combinedServerState.analysis`.
        *   Raw Stock & Market Data `Textarea` displays `combinedServerState.stockJson` (stringified, excluding options for this specific textarea).
        *   Raw AI Calculated TA `Textarea` displays `combinedServerState.calculatedAiTaJson` (stringified).
        *   **ENHANCED: Raw Options Chain `Textarea`** displays the streamlined `combinedServerState.stockJson.optionsChain` (stringified), sorted descendingly by strike.
    *   **Data Export Controls:** Source data from `combinedServerState.stockJson` (which includes streamlined options), `combinedServerState.calculatedAiTaObject`, `combinedServerState.analysis`.

### **6.4. Key Component Breakdown**
*   **`StockAnalysisPage` (`src/components/stock-analysis-page.tsx`):**
    *   Hosts displays and `Textarea` components for all data categories, including the new streamlined options chain JSON.
*   **`StockAnalysisProvider` (`src/contexts/stock-analysis-context.tsx`):** Manages and provides `combinedServerState`.
*   **`Chatbot` (`src/components/chatbot.tsx`):** Uses `combinedServerState.stockJson` (which now can include streamlined options data for context), `combinedServerState.analysis`, and `combinedServerState.calculatedAiTaJson`.
*   `DataExportControls` (`src/components/data-export-controls.tsx`): Now handles streamlined options chain data export.

### **6.5. AI Integration (Genkit)**
*   AI flows consume raw JSON data from `combinedServerState`. Prompts are generally robust to the streamlined options data as they primarily focus on higher-level summaries or specific data points from the stock snapshot and TA.

### **6.6. Data Services Layer (`src/services/`)**
*   **`polygon-adapter.ts`:** Major changes to `_fetchAndProcessOptionsChain` method to implement:
        *   Fetching a window of options contracts using `strike_price.gte` and `strike_price.lte`.
        *   Client-side logic to select up to 10 strikes above and 10 below the current price from the fetched window.
        *   Ensuring the final `selected_strikes_data` is sorted in descending order by strike price.
        *   Streamlining of `OptionContractDetails` via the `mapPolygonOptionSnapshotToContractDetails` method to remove redundant fields.
*   **`date-utils.ts`:** Added `calculateNextFridayExpiration` function (no change from initial 1.2.14 plan).
*   **`types.ts`:** Updated `OptionContractDetails` to reflect the streamlined data structure (fields removed). `StockDataJson` extended to include `optionsChain`.

### **6.7. Styling Approach**
*   (No changes from v1.2.12)

### **6.8. Environment Variables**
*   (No changes from v1.2.12)

### **6.9. Known Development Challenges, High-Risk Indicators & Mandatory Procedures**
    (Content from v1.2.12 remains critically important)
*   **Summary of Key Issues:** `async_hooks` module resolution, Turbopack sensitivity, Genkit & OpenTelemetry dependencies.
*   **High-Risk Indicators:**
    *   The current task (options chain enhancements) is **low risk** for `async_hooks` issues as it's primarily server-side and uses an existing library with refined API calls.
    *   Future changes to `next.config.ts`, Genkit plugins, or introducing new client-side libraries with Node.js dependencies would still be high-risk.
*   **Mandatory Full Environment Re-Initialization Triggers:** Remain the same.
*   **Procedure for Full Environment Re-Initialization:** Remains the same.
*   **Instruction for AI Coding Assistants:** Remain the same.

### **6.10. AI Coding Assistant Collaboration Process**
    (Process remains the same)

## **7. Success Metrics (Post v1.2.14 - Potential)**
*   Successful fetching and display of options chain data for the target Friday expiration, including up to 10 strikes above and 10 below the current price.
*   Accurate strike price selection and descending sort order for `selected_strikes_data`.
*   Correctly streamlined `OptionContractDetails` structure, reducing data verbosity.
*   Correct JSON formatting and export functionality for the streamlined options data.
*   Application stability maintained.

## **8. Future Considerations (Beyond v1.2.14)**
*   Allowing user to select expiration dates or number of strikes for options.
*   Visualizing options data (e.g., simple payoff diagrams).
*   Incorporating options data more directly into AI analysis prompts for richer insights (now that the data is more concise, this is more feasible).

## **9. Changelog (PRD Document - This README.md)**

| Version       | PRD Date                     | Author(s)                     | Summary of Changes                                                                                                                                                                                                                                                                                                                         | Related App Commit |
| :------------ | :--------------------------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| 1.0           | 2024-07-30                   | Firebase Studio (AI) & User | Initial draft of PRD for StockSage v1.0.0 release.                                                                                                                                                                                                                                                                                         | N/A                |
| 1.2.7         | 2024-07-31                   | Firebase Studio (AI)          | Comprehensive PRD for v1.2.7. Added "Detailed Design and Architecture." Included client-side logging and Debug Console.                                                                                                                                                                                                                    | `#602e09a8`          |
| 1.2.9         | 2025-06-05                   | Firebase Studio (AI)          | Updated to reflect v1.2.9 stable release. Key changes: Two-stage stock analysis (API fetch then AI analysis), API-only data sources (Polygon.io), removal of mock data, removal of chatbot web search tools. Updated diagrams and data flows. Added "Known Development Challenges (Pain Points)" (Sec 6.9) and "AI Collaboration Process" (Sec 6.10). | `#f61149e6`          |
| 1.2.11        | 2025-06-05                   | Firebase Studio (AI)          | Updated for v1.2.11 release. Features: Disclaimer relocated from AI prompts to UI (top & footer); app version in UI; full chat history export/copy; increased UI width & chat height; new "Full Detailed Analysis" example chat prompt; new "AI Full Stock Analysis" button/workflow for sequential data fetch, key takeaways, and auto-triggered detailed chat. | `#298d8962`          |
| 1.2.12        | 2025-06-06                   | Firebase Studio (AI)          | **Reverted UI to pre-v1.2.13 state.** Bug Fix: Enter key form submission. Data Formatting: Numerical data (two decimals, $ prefix). AI Chat: Refined "Full Detailed Analysis" prompt; adjusted model parameters & completeness instruction. PRD: Consolidated into README.md as single source of truth; integrated `docs/pain_points.md` into section 6.9. **PRD Process Update:** Sections 6.9 and 6.10 updated to enforce stricter procedures for handling high-risk changes and mandating Full Environment Re-Initialization under specific conditions, including detailing the 8-step procedure directly in Section 6.9. Added placeholder Textarea to UI. | `[COMMIT_HASH_FOR_V1.2.12]` |
| **1.2.14**    | **2025-06-08**               | Firebase Studio (AI)          | **Feature: Options Chain Snapshot Enhancements.** Updated functionality to fetch and display an options chain snapshot from Polygon.io for the current week's Friday expiration. **Key enhancements:** Fetches up to **10 strikes above and 10 strikes below** the current stock price using an efficient windowed API query (`strike_price.gte`/`lte`). Ensures `selected_strikes_data` is sorted in **descending order** by strike price. **Streamlined `OptionContractDetails`** by removing redundant fields (individual contract `ticker`, `exercise_style`, `expiration_date`, `last_quote`, nested `underlying_asset`) for conciseness. Options data is included in the main `stockJson` and displayed in a dedicated JSON textarea with export controls. Updated Polygon adapter and data types. | `[COMMIT_HASH_FOR_V1.2.14]` |

