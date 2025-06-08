
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, FileJson2, Brain, Database, Sparkles, BarChart3, TrendingUp, Zap, Search, Info, Clock, Wand2, LayoutGrid, ListTree } from 'lucide-react';
import DebugConsole from '@/components/debug-console';
import Chatbot from '@/components/chatbot';
import { useToast } from "@/hooks/use-toast";
import type { TakeawaySentiment, AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas';
import type { StockSnapshotData, DataSourceId, OptionsChainData } from '@/services/data-sources/types';

import { StockAnalysisProvider, useStockAnalysisContext, initialCombinedStockAnalysisState } from '@/contexts/stock-analysis-context';
import DataExportControls from '@/components/data-export-controls';
import type { CombinedStockAnalysisState, AnalysisStatus } from '@/contexts/stock-analysis-context';


function AnalyzeStockButtonsInternal() {
  const {
    fetchStockDataPending,
    performAiAnalysisPending,
    calculateAiTaPending,
    combinedServerState,
    chatFormPending,
    submitFetchStockDataForm,
    formRef
  } = useStockAnalysisContext();

  const isLoading = fetchStockDataPending || calculateAiTaPending || performAiAnalysisPending || combinedServerState.analysisStatus === 'data_fetching' || combinedServerState.analysisStatus === 'calculating_ai_ta' || combinedServerState.analysisStatus === 'analyzing_data';

  const handleAnalyzeClick = (analysisType: 'standard' | 'fullDetail') => {
    if (formRef?.current) {
      const formData = new FormData(formRef.current);
      formData.set('analysisType', analysisType);
      console.log(`[CLIENT:StockPageContent] Button clicked for analysisType: "${analysisType}". FormData being submitted:`, Object.fromEntries(formData));
      submitFetchStockDataForm(formData);
    } else {
      console.error("[CLIENT:StockPageContent] Form reference is not available for submission.");
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => handleAnalyzeClick('standard')}
        disabled={isLoading || chatFormPending}
        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isLoading && combinedServerState.analysisStatus !== 'analyzing_data' && combinedServerState.analysisStatus !== 'calculating_ai_ta' && !combinedServerState.initiateFullChatAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Analyze Stock
      </Button>
      <Button
        type="button"
        onClick={() => handleAnalyzeClick('fullDetail')}
        disabled={isLoading || chatFormPending}
        className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white"
      >
        {isLoading && combinedServerState.initiateFullChatAnalysis && (combinedServerState.analysisStatus === 'data_fetching' || combinedServerState.analysisStatus === 'calculating_ai_ta' || combinedServerState.analysisStatus === 'analyzing_data') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
        AI Full Stock Analysis
      </Button>
    </>
  );
}

const DATA_SOURCES = [
  { value: "polygon-api", label: "Polygon.io API (Market Status, Snapshot + TA + Options)" },
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
  if (!snapshotData || (requestedTicker && snapshotData.ticker !== requestedTicker.toUpperCase()) || analysisStatus === 'idle' || analysisStatus === 'data_fetching') {
    if (analysisStatus === 'data_fetching' && requestedTicker) {
       return <p className="text-sm text-muted-foreground text-center my-4">Fetching key metrics for {requestedTicker.toUpperCase()}...</p>;
    }
    return null;
  }
  if (!snapshotData.day || snapshotData.day.c === null || snapshotData.day.c === undefined || snapshotData.todaysChangePerc === null || snapshotData.todaysChangePerc === undefined) {
    if (analysisStatus === 'data_fetched_ai_ta_pending' || analysisStatus === 'calculating_ai_ta' || analysisStatus === 'ai_ta_calculated_key_takeaways_pending' || analysisStatus === 'analyzing_data') {
        return <p className="text-sm text-muted-foreground text-center my-4">Loading key metrics for {requestedTicker?.toUpperCase()}...</p>;
    }
    console.warn(`[CLIENT:KeyMetricsDisplay] Snapshot data for ${requestedTicker?.toUpperCase()} is present but missing 'day.c' or 'todaysChangePerc'. Status: ${analysisStatus}`);
     return (
        <Card className="mb-6 shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-headline flex items-center">
                    <Info className="h-5 w-5 mr-2 text-primary"/>
                    Key Metrics Snapshot for {snapshotData.ticker}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Key metrics data is partially available or still loading.</p>
            </CardContent>
        </Card>
    );
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
          Key Metrics Snapshot for {snapshotData.ticker} {/* Ticker from snapshot is already uppercase */}
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
    performAiAnalysisPending,
    fetchStockDataPending,
    calculateAiTaPending,
    cumulativeStats,
    stockDataFetchState,
    aiCalculatedTaState,
    aiAnalysisResultState,
    setFormRef,
    submitFetchStockDataForm,
  } = useStockAnalysisContext();

  const localFormRef = useRef<HTMLFormElement>(null);
  const tickerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isConsoleDocked, setIsConsoleDocked] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>(DATA_SOURCES[0].value);

  const lastToastForFetchErrorTimestampRef = useRef<number | undefined>();
  const lastToastForAiTaCalcErrorTimestampRef = useRef<number | undefined>();
  const lastToastForAnalysisErrorTimestampRef = useRef<number | undefined>();
  const lastToastForAnalysisSuccessTimestampRef = useRef<number | undefined>();


  useEffect(() => {
    if (localFormRef.current) {
      setFormRef(localFormRef);
    }
    return () => {
        setFormRef(null);
    }
  }, [setFormRef]);

  useEffect(() => {
    if (stockDataFetchState?.timestamp && stockDataFetchState.timestamp !== lastToastForFetchErrorTimestampRef.current && stockDataFetchState.tickerUsed === combinedServerState.tickerUsed) {
        if (stockDataFetchState.analysisStatus === 'error_fetching_data' && stockDataFetchState.error) {
            toast({ variant: "destructive", title: `Data Fetch Error for ${stockDataFetchState.tickerUsed}`, description: stockDataFetchState.error });
            lastToastForFetchErrorTimestampRef.current = stockDataFetchState.timestamp;
        } else if (stockDataFetchState.fieldErrors && stockDataFetchState.analysisStatus === 'error_fetching_data') {
            const firstErrorField = Object.keys(stockDataFetchState.fieldErrors)[0] as keyof typeof stockDataFetchState.fieldErrors;
            if (firstErrorField && stockDataFetchState.fieldErrors[firstErrorField]) {
                toast({ variant: "destructive", title: `${firstErrorField.charAt(0).toUpperCase() + firstErrorField.slice(1)} Error`, description: stockDataFetchState.fieldErrors[firstErrorField]!.join(', ') });
                lastToastForFetchErrorTimestampRef.current = stockDataFetchState.timestamp;
            }
        }
    }

    if (aiCalculatedTaState?.timestamp && aiCalculatedTaState.timestamp !== lastToastForAiTaCalcErrorTimestampRef.current && aiCalculatedTaState.tickerAnalyzed === combinedServerState.tickerUsed) {
        if (combinedServerState.analysisStatus === 'error_calculating_ai_ta' && combinedServerState.error) {
             toast({ variant: "destructive", title: `AI TA Calculation Error for ${combinedServerState.tickerUsed}`, description: combinedServerState.error });
            lastToastForAiTaCalcErrorTimestampRef.current = aiCalculatedTaState.timestamp;
        }
    }

    if (aiAnalysisResultState?.timestamp && aiAnalysisResultState.timestamp !== lastToastForAnalysisErrorTimestampRef.current && aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed) {
        if (combinedServerState.analysisStatus === 'error_analyzing_data' && combinedServerState.error) {
            toast({ variant: "destructive", title: `AI Key Takeaways Error for ${combinedServerState.tickerUsed}`, description: combinedServerState.error });
            lastToastForAnalysisErrorTimestampRef.current = aiAnalysisResultState.timestamp;
        }
    }
    if (aiAnalysisResultState?.timestamp && aiAnalysisResultState.timestamp !== lastToastForAnalysisSuccessTimestampRef.current && combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.analysis && combinedServerState.tickerUsed === aiAnalysisResultState.tickerAnalyzed &&
        !Object.values(combinedServerState.analysis).some(takeaway => takeaway.text.includes("pending"))
    ) {
        if (!combinedServerState.initiateFullChatAnalysis) {
            toast({ title: `AI Key Takeaways Complete for ${combinedServerState.tickerUsed}`, description: "AI key takeaways have been generated." });
        }
        lastToastForAnalysisSuccessTimestampRef.current = aiAnalysisResultState.timestamp;
    }

  }, [combinedServerState, stockDataFetchState, aiCalculatedTaState, aiAnalysisResultState, toast]);

  const parsedStockJson = useMemo(() => {
    if (combinedServerState.stockJson && combinedServerState.tickerUsed && stockDataFetchState?.tickerUsed === combinedServerState.tickerUsed) {
      try {
        return JSON.parse(combinedServerState.stockJson);
      } catch (e) {
        console.error("[CLIENT:StockPageContent] Error parsing stockJson for display components:", e);
        return undefined;
      }
    }
    return undefined;
  }, [combinedServerState.stockJson, combinedServerState.tickerUsed, stockDataFetchState?.tickerUsed]);

  const getTickerSymbolForFilename = (): string => {
    // combinedServerState.tickerUsed is already uppercased by the time it's set
    return combinedServerState.tickerUsed || tickerInputRef.current?.value.trim().toUpperCase() || 'STOCK_SAGE';
  };

  const prepareAllPageData = () => {
    const dataToExport = {
        inputs: {
          requestedTicker: combinedServerState.tickerUsed,
          dataSource: combinedServerState.dataSourceUsed,
          analysisTypeInitiated: combinedServerState.initiateFullChatAnalysis ? 'fullDetail' : 'standard',
        },
        results: {
          fetchTimestamp: (stockDataFetchState?.timestamp && stockDataFetchState.tickerUsed === combinedServerState.tickerUsed)
              ? new Date(stockDataFetchState.timestamp).toISOString()
              : undefined,
          aiTaCalculationTimestamp: (aiCalculatedTaState?.timestamp && aiCalculatedTaState.tickerAnalyzed === combinedServerState.tickerUsed)
              ? new Date(aiCalculatedTaState.timestamp).toISOString()
              : undefined,
          keyTakeawaysAnalysisTimestamp: (aiAnalysisResultState?.timestamp && aiAnalysisResultState.tickerAnalyzed === combinedServerState.tickerUsed)
              ? new Date(aiAnalysisResultState.timestamp).toISOString()
              : undefined,
          stockAndTAData: parsedStockJson, 
          aiCalculatedTechnicalIndicators: (combinedServerState.calculatedAiTaObject && combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed)
              ? combinedServerState.calculatedAiTaObject
              : undefined,
          aiKeyTakeaways: (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed)
              ? combinedServerState.analysis
              : initialCombinedStockAnalysisState.analysis,
        },
        usageReports: {
          fetchUsageReport: (stockDataFetchState?.fetchUsageReport && stockDataFetchState.tickerUsed === combinedServerState.tickerUsed)
            ? stockDataFetchState.fetchUsageReport
            : undefined,
          aiCalculatedTaUsageReport: (combinedServerState.aiCalculatedTaUsageReport && combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed)
            ? combinedServerState.aiCalculatedTaUsageReport
            : undefined,
          keyTakeawaysUsageReport: (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed)
              ? combinedServerState.analysisUsageReport
              : undefined,
        },
        sessionCumulativeStats: cumulativeStats,
        exportedAt: new Date().toISOString(),
    };
    return dataToExport;
  };

  let displayStockJsonForTextarea = "Enter ticker and click analyze.";
  const isDataFetching = fetchStockDataPending || combinedServerState.analysisStatus === 'data_fetching';
  const isCalculatingAiTa = calculateAiTaPending || combinedServerState.analysisStatus === 'calculating_ai_ta';
  const isKeyTakeawaysLoading = performAiAnalysisPending || combinedServerState.analysisStatus === 'ai_ta_calculated_key_takeaways_pending' || combinedServerState.analysisStatus === 'analyzing_data';

  if (isDataFetching) {
    displayStockJsonForTextarea = `Fetching data for ${combinedServerState.tickerUsed || 'ticker'}...`;
  } else if (combinedServerState.stockJson && parsedStockJson?.stockSnapshot?.ticker === combinedServerState.tickerUsed) {
    const { optionsChain, ...stockAndTaOnly } = parsedStockJson || {};
    displayStockJsonForTextarea = JSON.stringify(stockAndTaOnly, null, 2);
  } else if (combinedServerState.error && combinedServerState.analysisStatus === 'error_fetching_data' && !combinedServerState.fieldErrors && combinedServerState.tickerUsed === stockDataFetchState?.tickerUsed) {
    displayStockJsonForTextarea = `Error fetching data for "${combinedServerState.tickerUsed || 'ticker'}": ${combinedServerState.error}`;
  } else if (combinedServerState.fieldErrors) {
    displayStockJsonForTextarea = `Invalid input. Please correct the errors above and try again.`;
  } else if (combinedServerState.tickerUsed && combinedServerState.analysisStatus !== 'idle' && !combinedServerState.stockJson) {
    displayStockJsonForTextarea = `Awaiting data for ${combinedServerState.tickerUsed}...`;
  } else if (!combinedServerState.tickerUsed && combinedServerState.analysisStatus === 'idle') {
    displayStockJsonForTextarea = "Enter ticker and click analyze to view raw JSON data.";
  }


  let displayAiCalculatedTaJsonForTextarea = "AI Calculated Technical Indicators will appear here after data is fetched and processed.";
  if (isCalculatingAiTa) {
    displayAiCalculatedTaJsonForTextarea = `Calculating AI Technical Indicators for ${combinedServerState.tickerUsed || 'ticker'}...`;
  } else if (combinedServerState.calculatedAiTaJson && combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed) {
    try {
      const parsed = JSON.parse(combinedServerState.calculatedAiTaJson);
      displayAiCalculatedTaJsonForTextarea = JSON.stringify(parsed, null, 2);
    } catch (e) {
      displayAiCalculatedTaJsonForTextarea = combinedServerState.calculatedAiTaJson;
    }
  } else if (combinedServerState.analysisStatus === 'error_calculating_ai_ta' && combinedServerState.error && combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed) {
    displayAiCalculatedTaJsonForTextarea = `Error calculating AI Technical Indicators for "${combinedServerState.tickerUsed || 'ticker'}": ${combinedServerState.error}`;
  } else if (combinedServerState.analysisStatus === 'data_fetched_ai_ta_pending' && combinedServerState.tickerUsed === stockDataFetchState?.tickerUsed) {
      displayAiCalculatedTaJsonForTextarea = `Waiting to calculate AI Technical Indicators for ${combinedServerState.tickerUsed}...`;
  } else if (combinedServerState.analysisStatus !== 'idle' && combinedServerState.analysisStatus !== 'data_fetching' && !combinedServerState.calculatedAiTaJson && (combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed || combinedServerState.analysisStatus === 'ai_ta_calculated_key_takeaways_pending' || combinedServerState.analysisStatus === 'analyzing_data' || combinedServerState.analysisStatus === 'analysis_complete')) {
     displayAiCalculatedTaJsonForTextarea = `AI Technical Indicators for ${combinedServerState.tickerUsed} are unavailable or calculation did not complete successfully.`;
  } else if (!combinedServerState.tickerUsed && combinedServerState.analysisStatus === 'idle') {
    displayAiCalculatedTaJsonForTextarea = "Enter ticker and click analyze to view AI Calculated TA JSON data.";
  }

  let displayOptionsChainJson = "Options chain data will appear here after stock data is fetched.";
  const optionsChainData: OptionsChainData | undefined = parsedStockJson?.optionsChain;
  const isLoadingOptions = isDataFetching && combinedServerState.tickerUsed && !optionsChainData;

  if (isLoadingOptions) {
      displayOptionsChainJson = `Fetching options chain data for ${combinedServerState.tickerUsed}...`;
  } else if (optionsChainData && combinedServerState.tickerUsed === optionsChainData.underlying_ticker) { // Ensure ticker matches
      if (optionsChainData.message && optionsChainData.selected_strikes_data.length === 0) {
          displayOptionsChainJson = optionsChainData.message;
      } else if (optionsChainData.selected_strikes_data.length > 0) {
          displayOptionsChainJson = JSON.stringify(optionsChainData, null, 2);
      } else {
          displayOptionsChainJson = `No specific options data found for the selected strikes near the current price for ${combinedServerState.tickerUsed} (Expiration: ${optionsChainData.target_expiration_date}).`;
      }
  } else if (combinedServerState.tickerUsed && !isDataFetching && combinedServerState.analysisStatus !== 'idle' && !optionsChainData) {
      displayOptionsChainJson = `Options chain data for ${combinedServerState.tickerUsed} is unavailable or was not fetched.`;
  } else if (!combinedServerState.tickerUsed && combinedServerState.analysisStatus === 'idle') {
      displayOptionsChainJson = "Enter ticker and analyze to view options chain JSON data.";
  }


  const mainContentPaddingClass = isConsoleDocked ? 'pb-[calc(5rem+33.33vh+1rem)]' : 'pb-20';
  const currentAnalysisToDisplay = (combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed)
    ? combinedServerState.analysis
    : initialCombinedStockAnalysisState.analysis;

  const hasValidKeyTakeawaysForUIDisplay = combinedServerState.analysisStatus === 'analysis_complete' &&
    !!currentAnalysisToDisplay &&
    combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed &&
    !Object.values(currentAnalysisToDisplay).some(val => val.text.includes("pending"));

  const isStockDataAvailableForExport = !!combinedServerState.stockJson && parsedStockJson?.stockSnapshot?.ticker === combinedServerState.tickerUsed && !isDataFetching;
  const isAiTaDataAvailableForExport = !!combinedServerState.calculatedAiTaObject && combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed && !isCalculatingAiTa;
  const isKeyTakeawaysAvailableForExport = hasValidKeyTakeawaysForUIDisplay && !isKeyTakeawaysLoading;
  const isOptionsChainAvailableForExport = !!optionsChainData && optionsChainData.selected_strikes_data.length > 0 && combinedServerState.tickerUsed === optionsChainData.underlying_ticker;


  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[CLIENT:StockPageContent] Form submitted via Enter key or explicit submit event.");
    if (localFormRef.current) {
      const formData = new FormData(localFormRef.current);
      const tickerValue = (formData.get('ticker') as string)?.trim().toUpperCase();
      formData.set('ticker', tickerValue || "NVDA"); // Ensure uppercase, fallback if empty
      formData.set('analysisType', 'standard');
      submitFetchStockDataForm(formData);
    } else {
      console.error("[CLIENT:StockPageContent] Form reference is not available for Enter key submission.");
    }
  };

  const stockSnapshotForDisplay: StockSnapshotData | undefined = parsedStockJson?.stockSnapshot;

  return (
    <>
      <main className={`flex-grow ${mainContentPaddingClass}`}>
        <Card className="w-full max-w-5xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Stock Ticker Analysis</CardTitle>
            <CardDescription>
              Enter a stock ticker (default: NVDA) and select an API data source, then analyze.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              ref={localFormRef}
              onSubmit={handleFormSubmit}
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
                    onBlur={(e) => e.target.value = e.target.value.toUpperCase()} // Uppercase on blur
                  />
                  {combinedServerState.fieldErrors?.ticker && (
                    <p id="ticker-error" className="text-sm text-destructive mt-1">
                      {combinedServerState.fieldErrors.ticker.join(', ')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dataSource" className="text-base flex items-center">
                    <Database className="h-4 w-4 mr-2 text-primary" /> Data Source (API)
                  </Label>
                  <Select name="dataSource" value={selectedDataSource} onValueChange={setSelectedDataSource} >
                    <SelectTrigger id="dataSourceTrigger" className="mt-1 text-base" aria-describedby="dataSource-error">
                      <SelectValue placeholder="Select API data source" />
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <AnalyzeStockButtonsInternal />
              </div>
            </form>

            {combinedServerState.analysisStatus === 'error_fetching_data' && combinedServerState.error && !combinedServerState.fieldErrors && combinedServerState.tickerUsed === stockDataFetchState?.tickerUsed && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">Data Fetching Error for {combinedServerState.tickerUsed}</p>
                  <p className="text-sm">{combinedServerState.error}</p>
                </div>
              </div>
            )}
             {combinedServerState.analysisStatus === 'error_calculating_ai_ta' && combinedServerState.error && combinedServerState.tickerUsed === aiCalculatedTaState?.tickerAnalyzed && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">AI TA Calculation Error for {combinedServerState.tickerUsed}</p>
                  <p className="text-sm">{combinedServerState.error}</p>
                </div>
              </div>
            )}
             {combinedServerState.analysisStatus === 'error_analyzing_data' && combinedServerState.error && !combinedServerState.fieldErrors && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">AI Key Takeaways Error for {combinedServerState.tickerUsed}</p>
                  <p className="text-sm">{combinedServerState.error}</p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-6">
                {combinedServerState.tickerUsed && (combinedServerState.analysisStatus !== 'idle' || stockSnapshotForDisplay) && (
                  <KeyMetricsDisplay
                    snapshotData={stockSnapshotForDisplay}
                    analysisStatus={combinedServerState.analysisStatus}
                    requestedTicker={combinedServerState.tickerUsed}
                  />
                )}

                <Card className="shadow-md">
                  <CardHeader>
                      <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2 text-xl font-headline">
                              <Brain className="h-6 w-6 text-accent" />
                              AI Key Takeaways
                              {combinedServerState.tickerUsed && ` for ${combinedServerState.tickerUsed}`}
                          </CardTitle>
                          {isKeyTakeawaysLoading && <Loader2 className="h-5 w-5 text-accent animate-spin" />}
                      </div>
                    <CardDescription>Analysis based on the stock snapshot, technical indicators, and AI-calculated TAs, with sentiment coloring.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {isKeyTakeawaysLoading && !!combinedServerState.tickerUsed && (
                      <div className="flex items-center text-muted-foreground">
                          <Clock className="h-4 w-4 mr-2 animate-pulse"/>
                          {combinedServerState.analysisStatus === 'ai_ta_calculated_key_takeaways_pending'
                              ? `Preparing AI key takeaways analysis for ${combinedServerState.tickerUsed || "the stock"}...`
                              : `AI key takeaways analysis is currently in progress for ${combinedServerState.tickerUsed || "the stock"}...`
                          }
                      </div>
                    )}
                    {hasValidKeyTakeawaysForUIDisplay && currentAnalysisToDisplay && (
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
                            <Search className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                            <div><strong className={getSentimentClass(currentAnalysisToDisplay.patterns.sentiment)}>Patterns:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.patterns.text}</span></div>
                        </div>
                         <div className="flex items-start">
                            <Zap className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                            <div><strong className={getSentimentClass(currentAnalysisToDisplay.momentum.sentiment)}>Momentum:</strong> <span className="text-foreground/90">{currentAnalysisToDisplay.momentum.text}</span></div>
                        </div>
                      </>
                    )}
                    {!isKeyTakeawaysLoading && !hasValidKeyTakeawaysForUIDisplay && combinedServerState.analysisStatus === 'error_analyzing_data' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed && (
                      <p className="text-sm text-destructive flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 shrink-0"/>
                        AI key takeaways analysis could not be completed due to an error for {combinedServerState.tickerUsed}.
                      </p>
                    )}
                     {!isKeyTakeawaysLoading && !hasValidKeyTakeawaysForUIDisplay && combinedServerState.analysisStatus !== 'idle' && !combinedServerState.error && !!combinedServerState.tickerUsed &&
                        !(combinedServerState.analysisStatus === 'analysis_complete' && combinedServerState.tickerUsed === aiAnalysisResultState?.tickerAnalyzed) && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Clock className="h-4 w-4 mr-2 shrink-0"/>
                        AI key takeaways analysis is pending or data is not yet available for {combinedServerState.tickerUsed}.
                      </p>
                    )}
                     {!combinedServerState.tickerUsed && combinedServerState.analysisStatus === 'idle' && (
                         <p className="text-sm text-muted-foreground">Enter a ticker and analyze to view AI Key Takeaways.</p>
                     )}
                  </CardContent>
                </Card>

                <div className="mt-6 space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground/80 flex items-center mb-1"><FileJson2 className="h-5 w-5 mr-2"/>Stock & Market Data Export:</h3>
                        <DataExportControls
                            data={isStockDataAvailableForExport && parsedStockJson ? (({ optionsChain, ...rest }) => rest)(parsedStockJson) : {}}
                            baseFilename="stock-market-data"
                            titleForTextAndCsv={`Stock & Market Data for ${combinedServerState.tickerUsed || 'N/A'}`}
                            isAvailable={isStockDataAvailableForExport}
                            getTickerSymbolForFilename={getTickerSymbolForFilename}
                            dataTypeHintForCsv="stockJson"
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground/80 flex items-center mb-1"><Wand2 className="h-5 w-5 mr-2 text-purple-500"/>AI Calculated TA Export:</h3>
                        <DataExportControls
                            data={isAiTaDataAvailableForExport && combinedServerState.calculatedAiTaObject ? combinedServerState.calculatedAiTaObject : {}}
                            baseFilename="ai-calculated-ta"
                            titleForTextAndCsv={`AI Calculated TA for ${combinedServerState.tickerUsed || 'N/A'}`}
                            isAvailable={isAiTaDataAvailableForExport}
                            getTickerSymbolForFilename={getTickerSymbolForFilename}
                            dataTypeHintForCsv="analysis"
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground/80 flex items-center mb-1"><Brain className="h-5 w-5 mr-2 text-accent"/>AI Key Takeaways Export:</h3>
                        <DataExportControls
                            data={isKeyTakeawaysAvailableForExport && currentAnalysisToDisplay ? currentAnalysisToDisplay : {}}
                            baseFilename="ai-key-takeaways"
                            titleForTextAndCsv={`AI Key Takeaways for ${combinedServerState.tickerUsed || 'N/A'}`}
                            isAvailable={isKeyTakeawaysAvailableForExport}
                            getTickerSymbolForFilename={getTickerSymbolForFilename}
                            dataTypeHintForCsv="analysis"
                        />
                    </div>
                    <Card className="shadow-md">
                        <CardHeader className="py-3 px-4"> {/* Reduced padding */}
                          <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-lg font-headline"> {/* Reduced text size */}
                              <ListTree className="h-5 w-5 text-blue-500" />
                              Options Chain Snapshot Export
                              {optionsChainData?.underlying_ticker && ` for ${optionsChainData.underlying_ticker}`}
                              {optionsChainData?.target_expiration_date && ` (Exp: ${optionsChainData.target_expiration_date})`}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2 pb-3 px-4"> {/* Reduced padding */}
                          <DataExportControls
                            data={optionsChainData || {}}
                            baseFilename="options-chain-snapshot"
                            titleForTextAndCsv={`Options Chain Snapshot for ${getTickerSymbolForFilename()} (Exp: ${optionsChainData?.target_expiration_date || 'N/A'})`}
                            isAvailable={isOptionsChainAvailableForExport}
                            getTickerSymbolForFilename={getTickerSymbolForFilename}
                            dataTypeHintForCsv="analysis" 
                          />
                        </CardContent>
                      </Card>
                     <div>
                        <h3 className="text-lg font-semibold text-foreground/80 flex items-center mb-1"><LayoutGrid className="h-5 w-5 mr-2"/>All Page Data Export:</h3>
                         <DataExportControls
                            data={prepareAllPageData()}
                            baseFilename="all-page-data"
                            titleForTextAndCsv="All Page Data"
                            isAvailable={!!combinedServerState.stockJson || !!combinedServerState.error || !!combinedServerState.analysis || !!combinedServerState.calculatedAiTaJson}
                            getTickerSymbolForFilename={getTickerSymbolForFilename}
                            dataTypeHintForCsv="allPageData"
                          />
                    </div>
                </div>

                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2 text-xl font-headline">
                        <FileJson2 className="h-6 w-6 text-primary" />
                        Raw Stock & Market Data (JSON)
                        {combinedServerState.tickerUsed && ` for ${combinedServerState.tickerUsed}`}
                      </CardTitle>
                        {isDataFetching && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                    </div>
                    <CardDescription>
                      Full JSON data from {DATA_SOURCES.find(ds => ds.value === combinedServerState.dataSourceUsed)?.label || 'selected API source'}. This includes market status, stock snapshot, and technical analysis.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      readOnly
                      value={displayStockJsonForTextarea}
                      className="h-96 text-xs font-mono bg-muted/20 border-muted/40 shadow-inner"
                      aria-label="Stock data JSON (excluding options)"
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2 text-xl font-headline">
                        <Wand2 className="h-6 w-6 text-purple-500" />
                        Raw AI Calculated Technical Indicators (JSON)
                        {combinedServerState.tickerUsed && ` for ${combinedServerState.tickerUsed}`}
                      </CardTitle>
                        {isCalculatingAiTa && <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />}
                    </div>
                    <CardDescription>
                      Full JSON for AI-calculated technical indicators (e.g., Pivot Points). This data is used as input for AI analyses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      readOnly
                      value={displayAiCalculatedTaJsonForTextarea}
                      className="h-60 text-xs font-mono bg-muted/20 border-muted/40 shadow-inner"
                      aria-label="AI Calculated Technical Indicators JSON"
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2 text-xl font-headline">
                        <ListTree className="h-6 w-6 text-blue-500" />
                        Options Chain Snapshot (JSON)
                        {optionsChainData?.underlying_ticker && ` for ${optionsChainData.underlying_ticker}`}
                        {optionsChainData?.target_expiration_date && ` (Exp: ${optionsChainData.target_expiration_date})`}
                      </CardTitle>
                      {isLoadingOptions && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                    </div>
                    <CardDescription>
                      Calls and Puts for strike prices near the current stock price, for the current week's Friday expiration (inclusive).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      readOnly
                      value={displayOptionsChainJson}
                      className="h-80 text-xs font-mono bg-muted/20 border-muted/40 shadow-inner"
                      aria-label="Options Chain Snapshot JSON"
                    />
                    {/* DataExportControls for options chain moved to its own card above */}
                  </CardContent>
                </Card>

            </div>
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
