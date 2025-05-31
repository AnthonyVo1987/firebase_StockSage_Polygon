
'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, FileJson2, Brain, Database, TestTube2, Sparkles, BarChart3, TrendingUp, Zap, Shuffle, Search } from 'lucide-react';
import DebugConsole from '@/components/debug-console';
import Chatbot from '@/components/chatbot';
import { useToast } from "@/hooks/use-toast";
import type { TakeawaySentiment } from '@/ai/schemas/stock-analysis-schemas';
import { StockAnalysisProvider, useStockAnalysisContext } from '@/contexts/stock-analysis-context';
import DataExportControls from '@/components/data-export-controls';

function AnalyzeLiveDataButton() {
  const { stockAnalysisFormPending } = useStockAnalysisContext();
  return (
    <Button type="submit" name="analysisMode" value="live" disabled={stockAnalysisFormPending} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
      {stockAnalysisFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Analyze Stock (Live Data)
    </Button>
  );
}

function AnalyzeMockDataButton() {
  const { stockAnalysisFormPending } = useStockAnalysisContext();
  return (
    <Button type="submit" name="analysisMode" value="mock" disabled={stockAnalysisFormPending} className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground">
      {stockAnalysisFormPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
      Analyze Stock (Mock Data)
    </Button>
  );
}

const DATA_SOURCES = [
  { value: "polygon-api", label: "Polygon.io API (Market Status, Prev. Day + TA)" },
  { value: "ai-gemini-2.5-flash-preview-05-20", label: "[AI] Google Gemini 2.5 Flash Preview 05-20" }
];

function StockAnalysisPageContent() {
  const {
    stockAnalysisServerState,
    submitStockAnalysisForm,
    cumulativeStats,
    updateCumulativeStats
  } = useStockAnalysisContext();
  
  const formRef = useRef<HTMLFormElement>(null);
  const tickerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isConsoleDocked, setIsConsoleDocked] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>(DATA_SOURCES[0].value);
  
  const [analysisAttemptMade, setAnalysisAttemptMade] = useState(false);
  const latestStateTimestamp = useRef<number | undefined>();

  useEffect(() => {
    console.log('[CLIENT:StockPageContent] useEffect for stockAnalysisServerState. Timestamp:', stockAnalysisServerState?.timestamp, 'Latest processed:', latestStateTimestamp.current, 'Current `analysisAttemptMade`:', analysisAttemptMade);

    if (stockAnalysisServerState?.timestamp && stockAnalysisServerState.timestamp !== latestStateTimestamp.current) {
      latestStateTimestamp.current = stockAnalysisServerState.timestamp;

      const isErrorState = !!(stockAnalysisServerState.error && !stockAnalysisServerState.fieldErrors);
      const hasData = !!stockAnalysisServerState.stockJson;
      const hasUsageReports = !!stockAnalysisServerState.fetchUsageReport || !!stockAnalysisServerState.analysisUsageReport;
      const hasFieldErrors = !!stockAnalysisServerState.fieldErrors;

      if (isErrorState || hasData || hasUsageReports || hasFieldErrors) {
        // Any of these conditions mean an analysis attempt was made and processed by the server.
        console.log('[CLIENT:StockPageContent] Actual analysis response/error received. Setting analysisAttemptMade to true.');
        setAnalysisAttemptMade(true);
      }
      // IMPORTANT: No 'else' branch that sets analysisAttemptMade to false here,
      // because we want it to persist true once an attempt is made, until a new form submission.

      const logAndAccumulate = (report: UsageReport | undefined, reportName: string) => {
        if (report) {
          console.log(`[CLIENT:StockPageContent] AI Call Success (${reportName}): ${report.flowName}`, {
            'Input Tokens': report.inputTokens,
            'Output Tokens': report.outputTokens,
            'Context Window': report.contextWindow,
            'Est. Cost': `$${report.cost.toFixed(6)}`,
          });
          updateCumulativeStats(report);
        }
      };

      logAndAccumulate(stockAnalysisServerState.fetchUsageReport, 'Fetch Data');
      logAndAccumulate(stockAnalysisServerState.analysisUsageReport, 'Analysis Data');

      if (stockAnalysisServerState.error && !stockAnalysisServerState.fieldErrors) {
        console.error('[CLIENT:StockPageContent] Analysis Error (from server state):', stockAnalysisServerState.error);
        toast({ variant: "destructive", title: "Analysis Error", description: stockAnalysisServerState.error });
      }
      if (stockAnalysisServerState.fieldErrors?.ticker) {
        toast({ variant: "destructive", title: "Ticker Error", description: stockAnalysisServerState.fieldErrors.ticker.join(', ') });
      }
      if (stockAnalysisServerState.fieldErrors?.dataSource) {
        toast({ variant: "destructive", title: "Data Source Error", description: stockAnalysisServerState.fieldErrors.dataSource.join(', ') });
      }
      if (stockAnalysisServerState.fieldErrors?.analysisMode) {
        toast({ variant: "destructive", title: "Analysis Mode Error", description: stockAnalysisServerState.fieldErrors.analysisMode.join(', ') });
      }

      if (!stockAnalysisServerState.error && !stockAnalysisServerState.fieldErrors && stockAnalysisServerState.stockJson && stockAnalysisServerState.analysis) {
        if (!Object.values(stockAnalysisServerState.analysis).some(takeaway => takeaway.text.includes("could not be generated") || takeaway.text.includes("pending"))) {
            toast({ title: "Analysis Complete", description: "Stock data and AI takeaways updated." });
        }
      }
    }
  }, [stockAnalysisServerState, toast, updateCumulativeStats]);


  useEffect(() => {
    if (cumulativeStats.requestCount > 0) {
      console.log('[CLIENT:StockPageContent] Cumulative AI Stats (Session Total):', {
        'Total Requests': cumulativeStats.requestCount,
        'Total Input Tokens': cumulativeStats.totalInputTokens,
        'Total Output Tokens': cumulativeStats.totalOutputTokens,
        'Total Context Window Used': cumulativeStats.totalContextWindow,
        'Total Est. Cost': `$${cumulativeStats.totalCost.toFixed(6)}`,
      });
    }
  }, [cumulativeStats]);

  const getSentimentClass = (sentiment?: TakeawaySentiment): string => {
    if (!sentiment) return 'text-foreground';
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600 dark:text-green-400';
      case 'bearish':
        return 'text-red-600 dark:text-red-400';
      case 'neutral':
      default:
        return 'text-foreground'; 
    }
  };

  const getTickerSymbolForFilename = (): string => {
    const currentTickerValue = tickerInputRef.current?.value.trim().toUpperCase();
    if (currentTickerValue && currentTickerValue.length > 0) return currentTickerValue;
    if (stockAnalysisServerState?.stockJson) {
        try {
            const parsedJson = JSON.parse(stockAnalysisServerState.stockJson);
            if (parsedJson.stockQuote?.ticker) return parsedJson.stockQuote.ticker;
        } catch (e) {
             console.warn("[CLIENT:StockPageContent] Error parsing stockJson for filename ticker, using default.", e);
        }
    }
    return 'NVDA';
  };
  
  const prepareAllPageData = () => {
    let stockJsonParsed;
    try {
        stockJsonParsed = stockAnalysisServerState?.stockJson ? JSON.parse(stockAnalysisServerState.stockJson) : undefined;
    } catch (e) {
        stockJsonParsed = stockAnalysisServerState?.stockJson; 
    }
    const dataToExport = {
        ticker: getTickerSymbolForFilename(),
        dataSource: selectedDataSource,
        analysisTimestamp: stockAnalysisServerState?.timestamp ? new Date(stockAnalysisServerState.timestamp).toISOString() : undefined,
        stockAndTAData: stockJsonParsed, 
        aiAnalysis: stockAnalysisServerState?.analysis, 
        fetchUsageReport: stockAnalysisServerState?.fetchUsageReport,
        analysisUsageReport: stockAnalysisServerState?.analysisUsageReport,
        cumulativeStats: cumulativeStats,
        exportedAt: new Date().toISOString(),
    };
    return dataToExport;
  };

  let displayStockJson = '';
  if (stockAnalysisServerState?.stockJson) {
    try {
      displayStockJson = JSON.stringify(JSON.parse(stockAnalysisServerState.stockJson), null, 2);
    } catch (e) {
      displayStockJson = stockAnalysisServerState.stockJson; 
    }
  }

  const mainContentPaddingClass = isConsoleDocked ? 'pb-[calc(5rem+33.33vh+1rem)]' : 'pb-20';
  const currentAnalysis = stockAnalysisServerState?.analysis;
  const hasValidAnalysis = !!currentAnalysis && 
    !Object.values(currentAnalysis).some(val => val.text.includes("pending") || val.text.includes("could not be generated"));
  
  console.log('[CLIENT:StockPageContent] Render. hasValidAnalysis:', hasValidAnalysis, 'Current Analysis:', currentAnalysis, 'Analysis Attempt Made:', analysisAttemptMade);

  return (
    <>
      <main className={`flex-grow ${mainContentPaddingClass}`}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Stock Ticker Analysis</CardTitle>
            <CardDescription>Enter a stock ticker (default: NVDA) and select a data source to get data (including TA indicators) and AI insights. Choose 'Live Data' for AI's best attempt at current info or 'Mock Data' for purely AI-generated examples.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={(formData) => {
                // When a new analysis starts, we can consider the "attempt" made,
                // but the useEffect will more accurately set it based on server response.
                // For now, we don't set analysisAttemptMade to false here to avoid flicker if the state updates fast.
                console.log('[CLIENT:StockPageContent] Form submitted.');
                submitStockAnalysisForm(formData);
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
                    placeholder="e.g., AAPL, MSFT (default: NVDA)"
                    className="mt-1 text-base"
                    aria-describedby="ticker-error"
                  />
                  {stockAnalysisServerState?.fieldErrors?.ticker && (
                    <p id="ticker-error" className="text-sm text-destructive mt-1">
                      {stockAnalysisServerState.fieldErrors.ticker.join(', ')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dataSource" className="text-base flex items-center">
                    <Database className="h-4 w-4 mr-2 text-primary" /> Data Source
                  </Label>
                  <Select name="dataSourceSelect" value={selectedDataSource} onValueChange={(value) => {
                      setSelectedDataSource(value);
                  }}>
                    <SelectTrigger id="dataSource" className="mt-1 text-base" aria-describedby="dataSource-error">
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
                   {stockAnalysisServerState?.fieldErrors?.dataSource && (
                    <p id="dataSource-error" className="text-sm text-destructive mt-1">
                        {stockAnalysisServerState.fieldErrors.dataSource.join(', ')}
                    </p>
                  )}
                  <input type="hidden" name="dataSource" value={selectedDataSource} />
                  {stockAnalysisServerState?.fieldErrors?.analysisMode && (
                    <p id="analysisMode-error" className="text-sm text-destructive mt-1">
                        {stockAnalysisServerState.fieldErrors.analysisMode.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <AnalyzeLiveDataButton />
                <AnalyzeMockDataButton />
              </div>
            </form>

            <div className="mt-6 space-y-2">
                <h3 className="text-lg font-semibold text-foreground/80">All Page Data Tools:</h3>
                 <DataExportControls
                    data={prepareAllPageData()}
                    baseFilename="all-page-data"
                    titleForTextAndCsv="All Page Data"
                    isAvailable={analysisAttemptMade && (!!stockAnalysisServerState?.stockJson || !!stockAnalysisServerState?.error)}
                    getTickerSymbolForFilename={getTickerSymbolForFilename}
                    dataTypeHintForCsv="allPageData"
                  />
            </div>

            {analysisAttemptMade && stockAnalysisServerState?.error && !stockAnalysisServerState?.fieldErrors && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">Analysis Error</p>
                  <p className="text-sm">{stockAnalysisServerState.error}</p>
                </div>
              </div>
            )}

            {analysisAttemptMade && !stockAnalysisServerState?.error && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {stockAnalysisServerState?.stockJson && (
                  <Card className="shadow-md">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-xl font-headline">
                          <FileJson2 className="h-6 w-6 text-primary" />
                          Stock Data (Quote & TA)
                        </CardTitle>
                      </div>
                      <CardDescription>Data from {DATA_SOURCES.find(ds => ds.value === selectedDataSource)?.label || 'selected source'}, includes market status, previous day quote and technical indicators.</CardDescription>
                       <DataExportControls
                          data={stockAnalysisServerState.stockJson}
                          baseFilename="stock-data"
                          titleForTextAndCsv="Stock Data (Quote & TA)"
                          isAvailable={!!stockAnalysisServerState.stockJson}
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
                )}

                {currentAnalysis && ( 
                  <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                                <Brain className="h-6 w-6 text-accent" />
                                AI Key Takeaways
                            </CardTitle>
                        </div>
                      <CardDescription>Analysis based on the stock quote and technical indicators, with sentiment coloring.</CardDescription>
                       <DataExportControls
                          data={currentAnalysis}
                          baseFilename="ai-analysis"
                          titleForTextAndCsv="AI Key Takeaways"
                          isAvailable={hasValidAnalysis}
                          getTickerSymbolForFilename={getTickerSymbolForFilename}
                          dataTypeHintForCsv="analysis"
                        />
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {hasValidAnalysis ? (
                        <>
                          <div className="flex items-start">
                              <BarChart3 className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysis.stockPriceAction.sentiment)}>Price Action:</strong> <span className="text-foreground/90">{currentAnalysis.stockPriceAction.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <TrendingUp className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysis.trend.sentiment)}>Trend:</strong> <span className="text-foreground/90">{currentAnalysis.trend.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <Zap className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysis.volatility.sentiment)}>Volatility:</strong> <span className="text-foreground/90">{currentAnalysis.volatility.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <Shuffle className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/>
                              <div><strong className={getSentimentClass(currentAnalysis.momentum.sentiment)}>Momentum:</strong> <span className="text-foreground/90">{currentAnalysis.momentum.text}</span></div>
                          </div>
                          <div className="flex items-start">
                              <Search className="h-5 w-5 mr-2 mt-0.5 text-primary shrink-0"/> 
                              <div><strong className={getSentimentClass(currentAnalysis.patterns.sentiment)}>Patterns:</strong> <span className="text-foreground/90">{currentAnalysis.patterns.text}</span></div>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground">AI analysis is pending or some specific takeaways could not be generated. Please check the console for details if this persists.</p>
                          {currentAnalysis && Object.entries(currentAnalysis).map(([key, value]) => (
                              (value.text.includes("pending") || value.text.includes("could not be generated")) && 
                              <p key={key} className="text-sm text-destructive/80 mt-1">Note: {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim()} analysis: {value.text}</p>
                          ))}
                        </>
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
