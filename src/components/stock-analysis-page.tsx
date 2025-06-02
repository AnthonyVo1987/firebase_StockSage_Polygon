
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, FileJson2, Brain, Database, TestTube2, Sparkles, BarChart3, TrendingUp, Zap, Shuffle, Search, Info, Clock } from 'lucide-react';
import DebugConsole from '@/components/debug-console';
import Chatbot from '@/components/chatbot';
import { useToast } from "@/hooks/use-toast";
import type { TakeawaySentiment, AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
import type { StockSnapshotData, DataSourceId, AnalysisMode } from '@/services/data-sources/types';
import { StockAnalysisProvider, useStockAnalysisContext, initialCombinedStockAnalysisState } from '@/contexts/stock-analysis-context';
import DataExportControls from '@/components/data-export-controls';
import type { CombinedStockAnalysisState, AnalysisStatus } from '@/contexts/stock-analysis-context';


function FetchLiveDataButton() {
  const { fetchStockDataPending, combinedServerState } = useStockAnalysisContext();
  const isLoading = fetchStockDataPending || combinedServerState.analysisStatus === 'data_fetching' || combinedServerState.analysisStatus === 'analyzing_data';
  return (
    <Button type="submit" name="analysisMode" value="live" disabled={isLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Analyze Stock (Live Data)
    </Button>
  );
}

function FetchMockDataButton() {
  const { fetchStockDataPending, combinedServerState } = useStockAnalysisContext();
  const isLoading = fetchStockDataPending || combinedServerState.analysisStatus === 'data_fetching' || combinedServerState.analysisStatus === 'analyzing_data';
  return (
    <Button type="submit" name="analysisMode" value="mock" disabled={isLoading} className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground">
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
      Analyze Stock (Mock Data)
    </Button>
  );
}

const DATA_SOURCES = [
  { value: "polygon-api", label: "Polygon.io API (Market Status, Snapshot + TA)" },
  { value: "ai-gemini-2.5-flash-preview-05-20", label: "[AI] Google Gemini 2.5 Flash Preview 05-20" }
];

function getSentimentClass(sentiment?: TakeawaySentiment): string {
    if (!sentiment) return 'text-foreground/70';
    switch (sentiment) {
      case 'bullish': return 'text-green-600 dark:text-green-400 font-semibold';
      case 'bearish': return 'text-red-600 dark:text-red-400 font-semibold';
      case 'neutral':
      default:
        return 'text-foreground/80 font-semibold';
    }
}

function KeyMetricsDisplay({ snapshotData, analysisStatus, requestedTicker }: { snapshotData?: StockSnapshotData, analysisStatus: AnalysisStatus, requestedTicker?: string }) {
  console.log(`[CLIENT:KeyMetricsDisplay] Render. Status: ${analysisStatus}, Requested Ticker: ${requestedTicker}, Snapshot Ticker: ${snapshotData?.ticker}`);
  if (!snapshotData || snapshotData.ticker !== requestedTicker || analysisStatus === 'idle' || analysisStatus === 'data_fetching') {
    if (analysisStatus === 'data_fetching' && requestedTicker) {
       return <p className="text-sm text-muted-foreground text-center my-4">Fetching key metrics for {requestedTicker}...</p>;
    }
    return null;
  }
  if (!snapshotData.day || snapshotData.day.c === undefined || snapshotData.todaysChangePerc === undefined) {
    // This case handles when snapshotData is present but 'day' is missing, which shouldn't happen with current logic if snapshot is valid.
    // Or if data is fetched and analysis is pending, show loading.
    if (analysisStatus === 'data_fetched_analysis_pending' || analysisStatus === 'analyzing_data') {
        return <p className="text-sm text-muted-foreground text-center my-4">Loading key metrics for {requestedTicker}...</p>;
    }
    console.warn(`[CLIENT:KeyMetricsDisplay] Snapshot data for ${requestedTicker} is present but missing 'day.c' or 'todaysChangePerc'.`);
    return null; 
  }

  const currentPrice = snapshotData.day.c;
  const changePercent = snapshotData.todaysChangePerc;

  let changeColorClass = 'text-foreground';
  if (changePercent !== null && changePercent !== undefined) {
    if (changePercent > 0) changeColorClass = 'text-green-600 dark:text-green-400';
    else if (changePercent < 0) changeColorClass = 'text-red-600 dark:text-red-400';
  }

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-headline flex items-center">
          <Info className="h-5 w-5 mr-2 text-primary"/>
          Key Metrics Snapshot for {snapshotData.ticker}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Ticker</Label>
          <p className="text-xl font-bold text-primary">{snapshotData.ticker}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Current Price</Label>
          <p className="text-xl font-bold">
            {currentPrice !== null && currentPrice !== undefined ? `$${currentPrice.toFixed(2)}` : 'N/A'}
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Day's Change</Label>
          <p className={`text-xl font-bold ${changeColorClass}`}>
            {changePercent !== null && changePercent !== undefined ? `${changePercent.toFixed(2)}%` : 'N/A'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StockAnalysisPageContent() {
  const {
    combinedServerState,
    submitFetchStockDataForm,
    submitPerformAiAnalysisForm,
    performAiAnalysisPending, // from useActionState for performAiAnalysisAction
    fetchStockDataPending, // from useActionState for fetchStockDataAction
    cumulativeStats,
    stockDataFetchState, 
    aiAnalysisResultState,
    updateCumulativeStats, // Make sure this is available from context
  } = useStockAnalysisContext();
  
  const formRef = useRef<HTMLFormElement>(null);
  const tickerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isConsoleDocked, setIsConsoleDocked] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>(DATA_SOURCES[0].value);
  
  const lastToastForFetchErrorTimestampRef = useRef<number | undefined>();
  const lastToastForAnalysisErrorTimestampRef = useRef<number | undefined>();
  const lastToastForAnalysisSuccessTimestampRef = useRef<number | undefined>();


  // Effect to trigger AI analysis after data is fetched
  useEffect(() => {
    const currentContextTicker = combinedServerState.tickerUsed;
    console.log(`[CLIENT:StockPageContent:Effect:TriggerAI] Check. ContextTicker: ${currentContextTicker}, CombinedStatus: ${combinedServerState.analysisStatus}, stockJson: ${!!combinedServerState.stockJson}, performAiAnalysisPending: ${performAiAnalysisPending}`);
    console.log(`[CLIENT:StockPageContent:Effect:TriggerAI] Detailed: stockDataFetchState.tickerUsed: ${stockDataFetchState?.tickerUsed}, stockDataFetchState.analysisStatus: ${stockDataFetchState?.analysisStatus}`);
    
    if (
      combinedServerState.analysisStatus === 'data_fetched_analysis_pending' &&
      combinedServerState.stockJson &&
      currentContextTicker && // Ensure current context ticker is set
      stockDataFetchState?.tickerUsed === currentContextTicker && // Make sure the fetched data is for the current context ticker
      !performAiAnalysisPending 
    ) {
      console.log(`[CLIENT:StockPageContent:Effect:TriggerAI] Conditions MET for ticker "${currentContextTicker}". Triggering AI analysis.`);
      const analysisFormData = new FormData();
      analysisFormData.append('stockJsonString', combinedServerState.stockJson);
      analysisFormData.append('ticker', currentContextTicker); 
      submitPerformAiAnalysisForm(analysisFormData);
    } else {
      let skipReason = "[CLIENT:StockPageContent:Effect:TriggerAI] SKIPPED AI trigger because: ";
      if (combinedServerState.analysisStatus !== 'data_fetched_analysis_pending') skipReason += `CombinedStatus is "${combinedServerState.analysisStatus}". `;
      if (!combinedServerState.stockJson) skipReason += `No stockJson in combinedState. `;
      if (!currentContextTicker) skipReason += `No currentContextTicker. `;
      if (stockDataFetchState?.tickerUsed !== currentContextTicker) skipReason += `Mismatch: FetchStateTicker "${stockDataFetchState?.tickerUsed}" vs ContextTicker "${currentContextTicker}". `;
      if (performAiAnalysisPending) skipReason += `performAiAnalysisPending is true. `;
      if (skipReason !== "[CLIENT:StockPageContent:Effect:TriggerAI] SKIPPED AI trigger because: ") console.log(skipReason);
    }
  }, [
    combinedServerState.analysisStatus,
    combinedServerState.stockJson,
    combinedServerState.tickerUsed,
    stockDataFetchState, // Use the whole object to react to its changes, including timestamp and tickerUsed
    performAiAnalysisPending,
    submitPerformAiAnalysisForm,
  ]);


  // Effect for handling toasts based on combined state changes
  useEffect(() => {
    console.log(`[CLIENT:StockPageContent:Effect:Toasts] Check. Status: ${combinedServerState.analysisStatus}, Error: ${combinedServerState.error}, Ticker: ${combinedServerState.tickerUsed}, FetchTS: ${stockDataFetchState?.timestamp}, AnalysisTS: ${aiAnalysisResultState?.timestamp}`);
    
    const currentActionTimestamp = combinedServerState.timestamp; // This is the timestamp from combinedServerState

    // Fetch error toast
    if (
      combinedServerState.analysisStatus === 'error_fetching_data' &&
      combinedServerState.error &&
      combinedServerState.tickerUsed && // Error is for the current ticker
      currentActionTimestamp && currentActionTimestamp !== lastToastForFetchErrorTimestampRef.current
    ) {
        console.error('[CLIENT:StockPageContent:ErrorState] Displaying Data Fetch Error:', combinedServerState.error);
        toast({ variant: "destructive", title: `Data Fetch Error for ${combinedServerState.tickerUsed}`, description: combinedServerState.error });
        lastToastForFetchErrorTimestampRef.current = currentActionTimestamp;
    }
    // Analysis error toast
    else if (
      combinedServerState.analysisStatus === 'error_analyzing_data' &&
      combinedServerState.error &&
      combinedServerState.tickerUsed && // Error is for the current ticker
      aiAnalysisResultState?.timestamp && // Ensure analysis state has a timestamp
      aiAnalysisResultState.timestamp === currentActionTimestamp && // Ensure this error is from the latest analysis attempt
      currentActionTimestamp !== lastToastForAnalysisErrorTimestampRef.current
    ) {
        console.error('[CLIENT:StockPageContent:ErrorState] Displaying AI Analysis Error:', combinedServerState.error);
        toast({ variant: "destructive", title: `AI Analysis Error for ${combinedServerState.tickerUsed}`, description: combinedServerState.error });
        lastToastForAnalysisErrorTimestampRef.current = currentActionTimestamp;
    }
    // Analysis complete toast
    else if (
        combinedServerState.analysisStatus === 'analysis_complete' &&
        combinedServerState.analysis &&
        combinedServerState.tickerUsed &&
        aiAnalysisResultState?.timestamp && // Ensure analysis state is valid and has a timestamp
        aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed && // Make sure analysis is for current ticker
        aiAnalysisResultState.timestamp !== lastToastForAnalysisSuccessTimestampRef.current &&
        !Object.values(combinedServerState.analysis).some(takeaway => takeaway.text.includes("pending"))
    ) {
        console.log(`[CLIENT:StockPageContent:Effect:Toasts] AI Analysis Complete for "${combinedServerState.tickerUsed}". Toasting. Analysis Timestamp from aiAnalysisResultState: ${aiAnalysisResultState.timestamp}`);
        toast({ title: `AI Analysis Complete for ${combinedServerState.tickerUsed}`, description: "AI takeaways have been generated." });
        lastToastForAnalysisSuccessTimestampRef.current = aiAnalysisResultState.timestamp;
    }

    // Field errors (typically from fetch validation)
    if (combinedServerState.fieldErrors && combinedServerState.analysisStatus === 'error_fetching_data' && currentActionTimestamp) {
        const firstErrorField = Object.keys(combinedServerState.fieldErrors)[0] as keyof typeof combinedServerState.fieldErrors;
        if (firstErrorField && combinedServerState.fieldErrors[firstErrorField] && currentActionTimestamp !== lastToastForFetchErrorTimestampRef.current ) {
            toast({ variant: "destructive", title: `${firstErrorField.charAt(0).toUpperCase() + firstErrorField.slice(1)} Error`, description: combinedServerState.fieldErrors[firstErrorField]!.join(', ') });
            lastToastForFetchErrorTimestampRef.current = currentActionTimestamp;
        }
    }
  }, [combinedServerState, stockDataFetchState, aiAnalysisResultState, toast]); // Depend on all relevant state slices


  const parsedSnapshotData = useMemo(() => {
    if (combinedServerState.stockJson && combinedServerState.tickerUsed) {
      try {
        const fullJson = JSON.parse(combinedServerState.stockJson);
        // Ensure the snapshot data is for the currently active ticker in combinedServerState
        if (fullJson?.stockSnapshot?.ticker === combinedServerState.tickerUsed) {
          console.log(`[CLIENT:StockPageContent:Memo:Snapshot] Parsed stockJson for snapshot of "${combinedServerState.tickerUsed}".`);
          return fullJson.stockSnapshot as StockSnapshotData;
        }
        console.warn(`[CLIENT:StockPageContent:Memo:Snapshot] Mismatch! Snapshot ticker "${fullJson?.stockSnapshot?.ticker}" vs current context ticker "${combinedServerState.tickerUsed}". Not using stale snapshot.`);
        return undefined;
      } catch (e) {
        console.error(`[CLIENT:StockPageContent:Memo:Snapshot] Error parsing stockJson for snapshot data of "${combinedServerState.tickerUsed}":`, e);
        return undefined;
      }
    }
    return undefined;
  }, [combinedServerState.stockJson, combinedServerState.tickerUsed]);

  const getTickerSymbolForFilename = (): string => {
    return combinedServerState.tickerUsed || tickerInputRef.current?.value.trim().toUpperCase() || 'STOCK_SAGE';
  };
  
  const prepareAllPageData = () => {
    let stockJsonParsed;
    try {
        // Ensure stockJson is for the current ticker before parsing/including
        stockJsonParsed = (combinedServerState.stockJson && parsedSnapshotData?.ticker === combinedServerState.tickerUsed) 
                            ? JSON.parse(combinedServerState.stockJson) 
                            : undefined;
    } catch (e) {
        stockJsonParsed = combinedServerState.stockJson; 
    }
    const dataToExport = {
        inputs: {
          requestedTicker: combinedServerState.tickerUsed,
          dataSource: combinedServerState.dataSourceUsed,
          analysisMode: combinedServerState.analysisModeUsed,
        },
        results: {
          fetchTimestamp: (stockDataFetchState?.timestamp && stockDataFetchState.tickerUsed === combinedServerState.tickerUsed)
              ? new Date(stockDataFetchState.timestamp).toISOString() 
              : undefined,
          analysisTimestamp: (aiAnalysisResultState?.timestamp && aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed)
              ? new Date(aiAnalysisResultState.timestamp).toISOString() 
              : undefined,
          stockAndTAData: stockJsonParsed, 
          aiAnalysis: (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed) 
              ? combinedServerState.analysis 
              : initialCombinedStockAnalysisState.analysis, 
        },
        usageReports: {
          fetchUsageReport: (stockDataFetchState?.fetchUsageReport && stockDataFetchState.tickerUsed === combinedServerState.tickerUsed)
            ? stockDataFetchState.fetchUsageReport
            : undefined,
          analysisUsageReport: (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed) 
              ? combinedServerState.analysisUsageReport 
              : undefined,
        },
        sessionCumulativeStats: cumulativeStats,
        exportedAt: new Date().toISOString(),
    };
    return dataToExport;
  };

  let displayStockJson = "Enter ticker and click analyze.";
  const isDataFetching = combinedServerState.analysisStatus === 'data_fetching' || fetchStockDataPending;
  // Analysis is loading if its specific action is pending OR if data is fetched and we're about to trigger analysis.
  const isAnalysisLoading = combinedServerState.analysisStatus === 'analyzing_data' || performAiAnalysisPending || combinedServerState.analysisStatus === 'data_fetched_analysis_pending';
  
  if (isDataFetching) {
    displayStockJson = `Fetching data for ${combinedServerState.tickerUsed || 'ticker'}...`;
  } else if (combinedServerState.stockJson && parsedSnapshotData?.ticker === combinedServerState.tickerUsed) {
    try {
      const parsed = JSON.parse(combinedServerState.stockJson);
      displayStockJson = JSON.stringify(parsed, null, 2);
    } catch (e) {
      displayStockJson = combinedServerState.stockJson; 
    }
  } else if (combinedServerState.error && combinedServerState.analysisStatus === 'error_fetching_data' && !combinedServerState.fieldErrors) {
    displayStockJson = `Error fetching data for "${combinedServerState.tickerUsed || 'ticker'}": ${combinedServerState.error}`;
  } else if (combinedServerState.fieldErrors) {
    displayStockJson = `Invalid input. Please correct the errors above and try again.`;
  } else if (combinedServerState.tickerUsed && combinedServerState.analysisStatus !== 'idle' && !combinedServerState.stockJson) {
    // This case might occur if a new ticker request cleared old JSON but new fetch hasn't completed/failed yet.
    displayStockJson = `Awaiting data for ${combinedServerState.tickerUsed}...`;
  }


  const mainContentPaddingClass = isConsoleDocked ? 'pb-[calc(5rem+33.33vh+1rem)]' : 'pb-20';
  
  const currentAnalysisToDisplay = (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed)
    ? combinedServerState.analysis
    : initialCombinedStockAnalysisState.analysis;

  const showStockJsonCard = combinedServerState.analysisStatus !== 'idle' && !combinedServerState.fieldErrors;
  const showAiTakeawaysCard = combinedServerState.analysisStatus !== 'idle' && !combinedServerState.fieldErrors && combinedServerState.analysisStatus !== 'error_fetching_data';
  
  const hasValidAnalysisForUIDisplay = combinedServerState.analysisStatus === 'analysis_complete' &&
    !!currentAnalysisToDisplay &&
    combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed && // Ensure analysis is for current ticker
    !Object.values(currentAnalysisToDisplay).some(val => val.text.includes("pending"));

  console.log(`[CLIENT:StockPageContent] Final Render. Ticker: ${combinedServerState.tickerUsed}, CombinedStatus: ${combinedServerState.analysisStatus}, ShowJSON: ${showStockJsonCard}, ShowAI: ${showAiTakeawaysCard}, ValidUIDisplayAnalysis: ${hasValidAnalysisForUIDisplay}, isDataFetching: ${isDataFetching}, isAnalysisLoading: ${isAnalysisLoading}`);

  return (
    <>
      <main className={`flex-grow ${mainContentPaddingClass}`}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Stock Ticker Analysis</CardTitle>
            <CardDescription>Enter a stock ticker (default: NVDA) and select a data source. Fetched data appears first, AI insights follow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form 
                onSubmit={(e) => {
                    e.preventDefault();
                    if (formRef.current) {
                        const formData = new FormData(formRef.current);
                        const clickedButton = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
                        if (clickedButton && clickedButton.name === "analysisMode") {
                            formData.set("analysisMode", clickedButton.value);
                        } else {
                            const liveButton = formRef.current.querySelector('button[name="analysisMode"][value="live"]');
                            if (liveButton) formData.set("analysisMode", "live");
                            else formData.set("analysisMode", "mock"); 
                        }
                        console.log('[CLIENT:StockPageContent] Stock analysis form submission initiated.');
                        submitFetchStockDataForm(formData);
                    }
                }}
              ref={formRef} 
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticker" className="text-base">Stock Ticker Symbol</Label>
                  <Input
                    id="ticker"
                    name="ticker"
                    ref={tickerInputRef}
                    placeholder="e.g., AAPL, MSFT"
                    className="mt-1 text-base"
                    aria-describedby="ticker-error"
                    defaultValue="NVDA" 
                  />
                  {combinedServerState.fieldErrors?.ticker && (
                    <p id="ticker-error" className="text-sm text-destructive mt-1">
                      {combinedServerState.fieldErrors.ticker.join(', ')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dataSource" className="text-base flex items-center">
                    <Database className="h-4 w-4 mr-2 text-primary" /> Data Source
                  </Label>
                  <Select name="dataSource" value={selectedDataSource} onValueChange={setSelectedDataSource} >
                    <SelectTrigger id="dataSourceTrigger" className="mt-1 text-base" aria-describedby="dataSource-error">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_SOURCES.map(ds => (
                        <SelectItem key={ds.value} value={ds.value}>
                          {ds.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   {combinedServerState.fieldErrors?.dataSource && (
                    <p id="dataSource-error" className="text-sm text-destructive mt-1">
                        {combinedServerState.fieldErrors.dataSource.join(', ')}
                    </p>
                  )}
                  {combinedServerState.fieldErrors?.analysisMode && (
                    <p id="analysisMode-error" className="text-sm text-destructive mt-1">
                        {combinedServerState.fieldErrors.analysisMode.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <FetchLiveDataButton />
                <FetchMockDataButton />
              </div>
            </form>

            {combinedServerState.tickerUsed && (
               <KeyMetricsDisplay 
                snapshotData={parsedSnapshotData} 
                analysisStatus={combinedServerState.analysisStatus}
                requestedTicker={combinedServerState.tickerUsed}
              />
            )}

            <div className="mt-6 space-y-2">
                <h3 className="text-lg font-semibold text-foreground/80">All Page Data Tools:</h3>
                 <DataExportControls
                    data={prepareAllPageData()}
                    baseFilename="all-page-data"
                    titleForTextAndCsv="All Page Data"
                    isAvailable={!!combinedServerState.stockJson || !!combinedServerState.error || !!combinedServerState.analysis} 
                    getTickerSymbolForFilename={getTickerSymbolForFilename}
                    dataTypeHintForCsv="allPageData"
                  />
            </div>
            
            {combinedServerState.analysisStatus === 'error_fetching_data' && combinedServerState.error && !combinedServerState.fieldErrors && combinedServerState.tickerUsed === stockDataFetchState?.tickerUsed && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">Data Fetching Error for {combinedServerState.tickerUsed}</p>
                  <p className="text-sm">{combinedServerState.error}</p>
                </div>
              </div>
            )}
             {combinedServerState.analysisStatus === 'error_analyzing_data' && combinedServerState.error && !combinedServerState.fieldErrors && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">AI Analysis Error for {combinedServerState.tickerUsed}</p>
                  <p className="text-sm">{combinedServerState.error}</p>
                </div>
              </div>
            )}

            {showStockJsonCard && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2 text-xl font-headline">
                        <FileJson2 className="h-6 w-6 text-primary" />
                        Stock & Market Data (JSON)
                        {combinedServerState.tickerUsed && ` for ${combinedServerState.tickerUsed}`}
                      </CardTitle>
                        {isDataFetching && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                    </div>
                    <CardDescription>
                      Data from {DATA_SOURCES.find(ds => ds.value === combinedServerState.dataSourceUsed)?.label || 'selected source'}.
                      {(isAnalysisLoading && !isDataFetching) && " AI analysis in progress..."}
                    </CardDescription>
                      <DataExportControls
                        data={(parsedSnapshotData?.ticker === combinedServerState.tickerUsed && combinedServerState.stockJson) ? combinedServerState.stockJson : "{}"}
                        baseFilename="stock-market-data"
                        titleForTextAndCsv={`Stock & Market Data for ${combinedServerState.tickerUsed || 'N/A'}`}
                        isAvailable={!!combinedServerState.stockJson && parsedSnapshotData?.ticker === combinedServerState.tickerUsed && !isDataFetching}
                        getTickerSymbolForFilename={getTickerSymbolForFilename}
                        dataTypeHintForCsv="stockJson"
                      />
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      readOnly
                      value={displayStockJson}
                      className="h-96 text-sm font-mono bg-muted/30 border-muted/50"
                      aria-label="Stock data JSON"
                    />
                  </CardContent>
                </Card>

                {showAiTakeawaysCard && (
                  <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                                <Brain className="h-6 w-6 text-accent" />
                                AI Key Takeaways
                                {combinedServerState.tickerUsed && ` for ${combinedServerState.tickerUsed}`}
                            </CardTitle>
                            {isAnalysisLoading && <Loader2 className="h-5 w-5 text-accent animate-spin" />}
                        </div>
                      <CardDescription>Analysis based on the stock snapshot and technical indicators, with sentiment coloring.</CardDescription>
                        <DataExportControls
                          data={currentAnalysisToDisplay}
                          baseFilename="ai-analysis"
                          titleForTextAndCsv={`AI Key Takeaways for ${combinedServerState.tickerUsed || 'N/A'}`}
                          isAvailable={hasValidAnalysisForUIDisplay && !isAnalysisLoading}
                          getTickerSymbolForFilename={getTickerSymbolForFilename}
                          dataTypeHintForCsv="analysis"
                        />
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {isAnalysisLoading && (
                        <div className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2 animate-pulse"/> AI analysis is currently in progress for {combinedServerState.tickerUsed || "the requested stock"}...
                        </div>
                      )}
                      {hasValidAnalysisForUIDisplay && currentAnalysisToDisplay && (
                        <>
                          <div className="flex items-start">
                              <BarChart3 className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysisToDisplay.stockPriceAction.sentiment)}>Price Action:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.stockPriceAction.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <TrendingUp className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysisToDisplay.trend.sentiment)}>Trend:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.trend.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <Zap className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysisToDisplay.volatility.sentiment)}>Volatility:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.volatility.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <Shuffle className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysisToDisplay.momentum.sentiment)}>Momentum:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.momentum.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <Search className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/> 
                              <div><strong className={getSentimentClass(currentAnalysisToDisplay.patterns.sentiment)}>Patterns:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.patterns.text}</span></div>
                          </div>
                        </>
                      )}
                      {!isAnalysisLoading && !hasValidAnalysisForUIDisplay && combinedServerState.analysisStatus === 'error_analyzing_data' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed && (
                        <p className="text-sm text-destructive">AI analysis could not be completed due to an error for {combinedServerState.tickerUsed}. Please check the console for details.</p>
                      )}
                      {!isAnalysisLoading && !hasValidAnalysisForUIDisplay && 
                        (combinedServerState.analysisStatus === 'data_fetched_analysis_pending' || (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed !== aiAnalysisResultState?.tickerAnalyzed)) && (
                        <p className="text-sm text-muted-foreground">AI analysis is pending or some takeaways could not be generated yet for {combinedServerState.tickerUsed}.</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Chatbot />
      </main>
      <DebugConsole onToggle={(isOpen) => {
          setIsConsoleDocked(isOpen);
      }} />
    </>
  );
}

export default function StockAnalysisPage() {
  return (
    <StockAnalysisProvider>
      <StockAnalysisPageContent />
    </StockAnalysisProvider>
  );
}
    