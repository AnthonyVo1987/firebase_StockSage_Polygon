[v1.2.1] [Refactor] Phase 2: Task 1. Implement Data Source Abstraction Layer

Details:
This commit completes Phase 2, Task 1, introducing a data source abstraction layer to decouple the application's core logic from specific data provider implementations (Polygon.io API, AI-generated mock data, AI-powered search). This refactor enhances modularity, testability, and makes it easier to add or modify data sources in the future.

Key Changes:
*   **New Service Structure:**
    *   Created a central service `src/services/data-sources/index.ts` (`fetchStockDataFromSource`) to route data requests to the appropriate adapter.
    *   Defined an `IDataSourceAdapter` interface and common types in `src/services/data-sources/types.ts`.
    *   Moved `ALLOWED_DATA_SOURCE_IDS` and related types to `types.ts` to resolve "use server" boundary issues.
*   **Adapter Implementations:**
    *   **PolygonAdapter** (`src/services/data-sources/adapters/polygon-adapter.ts`): Migrated logic from the old `polygon-service.ts`. Includes fetching market status, previous day's close, and TA indicators.
    *   **MockAdapter** (`src/services/data-sources/adapters/mock-adapter.ts`): Generates mock stock data using the `fetchStockData` Genkit flow with `forceMock: true`.
    *   **AISearchAdapter** (`src/services/data-sources/adapters/ai-search-adapter.ts`): Fetches stock data using the `fetchStockData` Genkit flow with Google Search grounding.
    *   Removed `'use server';` directives from adapter class files as they are not directly invoked from client components or actions.
*   **Server Action Update:**
    *   `src/actions/analyze-stock-server-action.ts` refactored to use the new `fetchStockDataFromSource` service and handle the standardized `AdapterOutput`.
*   **Genkit Flow Enhancement:**
    *   Updated `src/ai/flows/fetch-stock-data.ts` and its associated schema `src/ai/schemas/stock-fetch-schemas.ts` to make `marketStatus` a mandatory part of the AI-generated `StockDataJson`. This ensures data consistency across all sources.
*   **Cleanup:**
    *   The old `src/services/polygon-service.ts` has been emptied and is intended for deletion.
*   **Local Development:**
    *   Updated `.env` file to include placeholders for `GOOGLE_API_KEY` and `POLYGON_API_KEY`.

File Manifest:

Added Files:
*   src/services/data-sources/types.ts
*   src/services/data-sources/adapters/polygon-adapter.ts
*   src/services/data-sources/adapters/mock-adapter.ts
*   src/services/data-sources/adapters/ai-search-adapter.ts
*   src/services/data-sources/index.ts

Modified Files:
*   src/actions/analyze-stock-server-action.ts
*   src/ai/schemas/stock-fetch-schemas.ts
*   src/ai/flows/fetch-stock-data.ts
*   .env

Deleted Files (or Emptied for Deletion):
*   src/services/polygon-service.ts (Content was emptied, file should be manually deleted if not automatically removed by tooling.)