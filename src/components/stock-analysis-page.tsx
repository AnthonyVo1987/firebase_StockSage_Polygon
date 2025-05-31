
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { handleAnalyzeStock, type StockAnalysisState } from '@/actions/analyze-stock-server-action';
import type { UsageReport } from '@/ai/schemas/common-schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, FileJson2, Brain, ListChecks, Download, ClipboardCopy, Database, TestTube2, Sparkles, BarChart3, TrendingUp, Zap, Shuffle, Search, FileText, Sheet } from 'lucide-react';
import DebugConsole from '@/components/debug-console';
import Chatbot from '@/components/chatbot';
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeStockDataOutput, TakeawaySentiment } from '@/ai/schemas/stock-analysis-schemas';


function AnalyzeLiveDataButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="analysisMode" value="live" disabled={pending} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Analyze Stock (Live Data)
    </Button>
  );
}

function AnalyzeMockDataButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="analysisMode" value="mock" disabled={pending} className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
      Analyze Stock (Mock Data)
    </Button>
  );
}

interface CumulativeStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalContextWindow: number;
  totalCost: number;
  requestCount: number;
}

const DATA_SOURCES = [
  { value: "polygon-api", label: "Polygon.io API (Market Status, Prev. Day + TA)" },
  { value: "ai-gemini-2.5-flash-preview-05-20", label: "[AI] Google Gemini 2.5 Flash Preview 05-20" }
];

const initialAnalysisState: AnalyzeStockDataOutput = {
    stockPriceAction: { text: "AI analysis for price action pending.", sentiment: "neutral" },
    trend: { text: "AI analysis for trend pending.", sentiment: "neutral" },
    volatility: { text: "AI analysis for volatility pending.", sentiment: "neutral" },
    momentum: { text: "AI analysis for momentum pending.", sentiment: "neutral" },
    patterns: { text: "AI analysis for patterns pending.", sentiment: "neutral" }
};


export default function StockAnalysisPage() {
  useEffect(() => {
    console.log('[CLIENT:StockPage] StockAnalysisPage component mounted.');
  }, []);

  const initialState: StockAnalysisState = { analysis: initialAnalysisState }; 
  const [state, formAction] = useActionState(handleAnalyzeStock, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const tickerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isConsoleDocked, setIsConsoleDocked] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>(DATA_SOURCES[0].value);
  const latestStateTimestamp = useRef<number | undefined>();


  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalContextWindow: 0,
    totalCost: 0,
    requestCount: 0,
  });

  const updateCumulativeStatsCallback = useCallback((report: UsageReport) => {
    console.log('[CLIENT:StockPage] Updating cumulative stats with report:', report);
    setCumulativeStats(prev => ({
      totalInputTokens: prev.totalInputTokens + report.inputTokens,
      totalOutputTokens: prev.totalOutputTokens + report.outputTokens,
      totalContextWindow: prev.totalContextWindow + (report.inputTokens + report.outputTokens),
      totalCost: prev.totalCost + report.cost,
      requestCount: prev.requestCount + 1,
    }));
  }, []);


  useEffect(() => {
    console.log('[CLIENT:StockPage] useEffect for state triggered. Current state timestamp:', state?.timestamp, 'Latest processed timestamp:', latestStateTimestamp.current);
    if (state?.timestamp && state.timestamp !== (latestStateTimestamp.current ?? 0)) {
        latestStateTimestamp.current = state.timestamp;
        console.log('[CLIENT:StockPage] New state received from server action:', JSON.stringify(state, null, 2));

        const logAndAccumulate = (report: UsageReport | undefined, reportName: string) => {
          if (report) {
            console.log(`[CLIENT:StockPage] AI Call Success (${reportName}): ${report.flowName}`, {
              'Input Tokens': report.inputTokens,
              'Output Tokens': report.outputTokens,
              'Context Window': report.contextWindow,
              'Est. Cost': `$${report.cost.toFixed(6)}`,
            });
            updateCumulativeStatsCallback(report);
          } else {
            console.log(`[CLIENT:StockPage] No usage report for ${reportName}.`);
          }
        };

        logAndAccumulate(state.fetchUsageReport, 'Fetch Data');
        logAndAccumulate(state.analysisUsageReport, 'Analysis Data');

        if (state.error && !state.fieldErrors) {
             console.error('[CLIENT:StockPage] Analysis Error (from server state):', state.error);
             toast({ variant: "destructive", title: "Analysis Error", description: state.error });
        }
        if (state.fieldErrors?.ticker) {
            const errorMsg = state.fieldErrors.ticker.join(', ');
            console.warn('[CLIENT:StockPage] Validation Error for ticker:', errorMsg);
            toast({ variant: "destructive", title: "Ticker Error", description: errorMsg });
        }
         if (state.fieldErrors?.dataSource) {
            const errorMsg = state.fieldErrors.dataSource.join(', ');
            console.warn('[CLIENT:StockPage] Validation Error for data source:', errorMsg);
            toast({ variant: "destructive", title: "Data Source Error", description: errorMsg });

        }
         if (state.fieldErrors?.analysisMode) {
            const errorMsg = state.fieldErrors.analysisMode.join(', ');
            console.warn('[CLIENT:StockPage] Validation Error for analysis mode:', errorMsg);
             toast({ variant: "destructive", title: "Analysis Mode Error", description: errorMsg });
        }

        if (!state.error && !state.fieldErrors && state.stockJson && state.analysis) {
            toast({ title: "Analysis Complete", description: "Stock data and AI takeaways updated." });
        }
    }

  }, [state, updateCumulativeStatsCallback, toast]);

  useEffect(() => {
    if (cumulativeStats.requestCount > 0) {
      console.log('[CLIENT:StockPage] Cumulative AI Stats (Session Total):', {
        'Total Requests': cumulativeStats.requestCount,
        'Total Input Tokens': cumulativeStats.totalInputTokens,
        'Total Output Tokens': cumulativeStats.totalOutputTokens,
        'Total Context Window Used': cumulativeStats.totalContextWindow,
        'Total Est. Cost': `$${cumulativeStats.totalCost.toFixed(6)}`,
      });
    }
  }, [cumulativeStats]);

  const getSentimentClass = (sentiment?: TakeawaySentiment): string => {
    if (!sentiment) return 'text-foreground'; // Default text color if no sentiment
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

  const getCurrentTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const getTickerSymbolForFilename = () => {
    const currentTickerValue = tickerInputRef.current?.value.trim().toUpperCase();
    if (currentTickerValue) return currentTickerValue;
    if (state?.stockJson) {
        try {
            const parsedJson = JSON.parse(state.stockJson);
            if (parsedJson.stockQuote?.ticker) return parsedJson.stockQuote.ticker;
        } catch (e) {
             console.warn("[CLIENT:StockPage] Error parsing stockJson for filename ticker, using default.", e);
        }
    }
    return 'NVDA'; 
  }

  const formatJsonForDownloadOrCopy = (contentToProcess: string | object): string => {
    let dataString: string;
    if (typeof contentToProcess === 'string') {
        try {
            dataString = JSON.stringify(JSON.parse(contentToProcess), null, 2);
        } catch (e) {
            dataString = contentToProcess;
        }
    } else {
        dataString = JSON.stringify(contentToProcess, null, 2);
    }
    return dataString;
  }

  const handleDownloadJson = (contentToDownload: string | object, baseFilename: string) => {
    console.log(`[CLIENT:StockPage] handleDownloadJson called for: ${baseFilename}`);
    const ticker = getTickerSymbolForFilename();
    const timestamp = getCurrentTimestamp();
    const filename = `${baseFilename}_${ticker}_${timestamp}.json`;
    const dataString = formatJsonForDownloadOrCopy(contentToDownload);

    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const handleCopyToClipboardJson = async (contentToCopy: string | object, contentType: string) => {
    console.log(`[CLIENT:StockPage] handleCopyToClipboardJson called for: ${contentType}`);
    const textToCopy = formatJsonForDownloadOrCopy(contentToCopy);
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "Copied to Clipboard", description: `${contentType} (JSON) copied successfully.` });
    } catch (err) {
      console.error('[CLIENT:StockPage] Failed to copy JSON to clipboard:', err);
      toast({ variant: "destructive", title: "Copy Failed", description: `Could not copy ${contentType} (JSON) to clipboard.` });
    }
  };


  const convertToText = (data: any, title: string): string => {
    let textContent = `${title.toUpperCase()}\n====================================\n`;
    if (title === "AI Key Takeaways" && typeof data === 'object' && data !== null) {
      const analysisData = data as AnalyzeStockDataOutput;
      Object.entries(analysisData).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
        textContent += `${formattedKey} (Sentiment: ${value.sentiment}):\n${value.text}\n\n`;
      });
    } else if (typeof data === 'string') {
      try {
        textContent += JSON.stringify(JSON.parse(data), null, 2);
      } catch (e) {
        textContent += data;
      }
    } else if (typeof data === 'object' && data !== null) {
      textContent += JSON.stringify(data, null, 2);
    } else {
      textContent += String(data);
    }
    return textContent;
  };

  const handleDownloadText = (contentToDownload: any, baseFilename: string, titleForTextFile: string) => {
    console.log(`[CLIENT:StockPage] handleDownloadText called for: ${baseFilename}`);
    const ticker = getTickerSymbolForFilename();
    const timestamp = getCurrentTimestamp();
    const filename = `${baseFilename}_${ticker}_${timestamp}.txt`;
    const textData = convertToText(contentToDownload, titleForTextFile);

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const handleCopyToClipboardText = async (contentToCopy: any, contentType: string, titleForTextFile: string) => {
    console.log(`[CLIENT:StockPage] handleCopyToClipboardText called for: ${contentType}`);
    const textData = convertToText(contentToCopy, titleForTextFile);
    try {
      await navigator.clipboard.writeText(textData);
      toast({ title: "Copied to Clipboard", description: `${contentType} (Text) copied successfully.` });
    } catch (err) {
      console.error('[CLIENT:StockPage] Failed to copy Text to clipboard:', err);
      toast({ variant: "destructive", title: "Copy Failed", description: `Could not copy ${contentType} (Text) to clipboard.` });
    }
  };

  const escapeCsvField = (field: any): string => {
    const stringField = String(field === null || field === undefined ? '' : field);
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const stockJsonToCsv = (jsonString: string): string => {
    try {
      const data = JSON.parse(jsonString);
      let csvRows = ["Category,Property,Value,Period,Signal,Histogram"]; 

      if (data.marketStatus) {
        for (const [key, value] of Object.entries(data.marketStatus)) {
          if (typeof value === 'object' && value !== null) { 
            for (const [subKey, subValue] of Object.entries(value)) {
              csvRows.push(`MarketStatus,${escapeCsvField(key + '.' + subKey)},${escapeCsvField(subValue)},,,,`);
            }
          } else {
            csvRows.push(`MarketStatus,${escapeCsvField(key)},${escapeCsvField(value)},,,,`);
          }
        }
      }

      if (data.stockQuote) {
        for (const [key, value] of Object.entries(data.stockQuote)) {
          csvRows.push(`StockQuote,${escapeCsvField(key)},${escapeCsvField(value)},,,,`);
        }
      }

      if (data.technicalAnalysis) {
        for (const [taKey, taValueObj] of Object.entries(data.technicalAnalysis as Record<string, any>)) {
          if (taValueObj && typeof taValueObj === 'object') {
            if (taKey === 'macd') {
              csvRows.push(`TechnicalAnalysis,${escapeCsvField(taKey)},${escapeCsvField(taValueObj.value)},,${escapeCsvField(taValueObj.signal)},${escapeCsvField(taValueObj.histogram)}`);
            } else { 
              for (const [period, value] of Object.entries(taValueObj)) {
                 csvRows.push(`TechnicalAnalysis,${escapeCsvField(taKey)},${escapeCsvField(value)},${escapeCsvField(period)},,`);
              }
            }
          } else {
             csvRows.push(`TechnicalAnalysis,${escapeCsvField(taKey)},N/A,,,,`);
          }
        }
      }
      return csvRows.join("\n");
    } catch (e) {
      console.error("Error parsing stockJson for CSV:", e);
      return "Error: Could not parse stock JSON for CSV.";
    }
  };

  const analysisToCsv = (analysis: AnalyzeStockDataOutput): string => {
    let csvRows = ["Category,Sentiment,Takeaway"];
    for (const [key, valueObj] of Object.entries(analysis)) {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
      csvRows.push(`${escapeCsvField(formattedKey)},${escapeCsvField(valueObj.sentiment)},${escapeCsvField(valueObj.text)}`);
    }
    return csvRows.join("\n");
  };
  
  const allPageDataToCsv = (data: Record<string, any>): string => {
    let csvRows = ["Property,Value"];
    const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
      return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        const newKey = pre + k;
        if (k === 'analysis' && obj[k] && typeof obj[k] === 'object') { 
            Object.entries(obj[k] as AnalyzeStockDataOutput).forEach(([takeawayKey, takeawayValue]) => {
                acc[`${newKey}.${takeawayKey}.text`] = takeawayValue.text;
                acc[`${newKey}.${takeawayKey}.sentiment`] = takeawayValue.sentiment;
            });
        } else if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]) && Object.keys(obj[k]).length > 0) {
          Object.assign(acc, flattenObject(obj[k], newKey));
        } else if (obj[k] !== undefined) { 
          acc[newKey] = obj[k];
        }
        return acc;
      }, {} as Record<string, any>);
    };

    const flatData = flattenObject(data);
    for (const [key, value] of Object.entries(flatData)) {
      csvRows.push(`${escapeCsvField(key)},${escapeCsvField(value)}`);
    }
    return csvRows.join("\n");
  };


  const convertToCsv = (data: any, title: string): string => {
    console.log(`[CLIENT:StockPage] convertToCsv called for title: ${title}, data type: ${typeof data}`);
    if (title === "Stock Data (Quote & TA)" && typeof data === 'string') {
        return stockJsonToCsv(data);
    } else if (title === "AI Key Takeaways" && typeof data === 'object') {
        return analysisToCsv(data as AnalyzeStockDataOutput);
    } else if (title === "All Page Data" && typeof data === 'object') {
        return allPageDataToCsv(data);
    }
    if (typeof data === 'object') return JSON.stringify(data); 
    return String(data);
  };


  const handleDownloadCsv = (contentToDownload: any, baseFilename: string, titleForCsvFile: string) => {
    console.log(`[CLIENT:StockPage] handleDownloadCsv called for: ${baseFilename}`);
    const ticker = getTickerSymbolForFilename();
    const timestamp = getCurrentTimestamp();
    const filename = `${baseFilename}_${ticker}_${timestamp}.csv`;
    const csvData = convertToCsv(contentToDownload, titleForCsvFile);

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const handleCopyToClipboardCsv = async (contentToCopy: any, contentType: string, titleForCsvFile: string) => {
    console.log(`[CLIENT:StockPage] handleCopyToClipboardCsv called for: ${contentType}`);
    const csvData = convertToCsv(contentToCopy, titleForCsvFile);
    try {
      await navigator.clipboard.writeText(csvData);
      toast({ title: "Copied to Clipboard", description: `${contentType} (CSV) copied successfully.` });
    } catch (err) {
      console.error('[CLIENT:StockPage] Failed to copy CSV to clipboard:', err);
      toast({ variant: "destructive", title: "Copy Failed", description: `Could not copy ${contentType} (CSV) to clipboard.` });
    }
  };


  const prepareAllPageData = () => {
    console.log('[CLIENT:StockPage] prepareAllPageData called.');
    let stockJsonParsed;
    try {
        stockJsonParsed = state?.stockJson ? JSON.parse(state.stockJson) : undefined;
    } catch (e) {
        console.warn("[CLIENT:StockPage] Error parsing stockJson for page data export.", e);
        stockJsonParsed = state?.stockJson; 
    }
    const dataToExport = {
        ticker: getTickerSymbolForFilename(),
        dataSource: selectedDataSource,
        analysisTimestamp: state?.timestamp ? new Date(state.timestamp).toISOString() : undefined,
        stockAndTAData: stockJsonParsed, 
        aiAnalysis: state?.analysis, 
        fetchUsageReport: state?.fetchUsageReport,
        analysisUsageReport: state?.analysisUsageReport,
        cumulativeStats: cumulativeStats,
        exportedAt: new Date().toISOString(),
    };
    console.log('[CLIENT:StockPage] Data prepared for export:', dataToExport);
    return dataToExport;
  };

  let displayStockJson = '';
  if (state?.stockJson) {
    try {
      displayStockJson = JSON.stringify(JSON.parse(state.stockJson), null, 2);
    } catch (e) {
      console.warn("[CLIENT:StockPage] Failed to parse stockJson for pretty printing display, displaying raw string:", state.stockJson, e);
      displayStockJson = state.stockJson; 
    }
  }

  const mainContentPaddingClass = isConsoleDocked ? 'pb-[calc(5rem+33.33vh+1rem)]' : 'pb-20';
  const currentAnalysis = state?.analysis || initialAnalysisState;
  const hasValidAnalysis = state?.analysis && 
    !Object.values(state.analysis).some(val => val.text.includes("pending") || val.text.includes("could not be generated"));

  console.log('[CLIENT:StockPage] Render. hasValidAnalysis:', hasValidAnalysis, 'Current Analysis:', currentAnalysis);


  return (
    <>
      <main className={`flex-grow ${mainContentPaddingClass}`}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Stock Ticker Analysis</CardTitle>
            <CardDescription>Enter a stock ticker (default: NVDA) and select a data source to get data (including TA indicators) and AI insights. Choose 'Live Data' for AI's best attempt at current info or 'Mock Data' for purely AI-generated examples.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={formAction} ref={formRef} className="space-y-4">
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
                  {state?.fieldErrors?.ticker && (
                    <p id="ticker-error" className="text-sm text-destructive mt-1">
                      {state.fieldErrors.ticker.join(', ')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dataSource" className="text-base flex items-center">
                    <Database className="h-4 w-4 mr-2 text-primary" /> Data Source
                  </Label>
                  <Select name="dataSourceSelect" value={selectedDataSource} onValueChange={(value) => {
                      console.log('[CLIENT:StockPage] Data source changed to:', value);
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
                   {state?.fieldErrors?.dataSource && (
                    <p id="dataSource-error" className="text-sm text-destructive mt-1">
                        {state.fieldErrors.dataSource.join(', ')}
                    </p>
                  )}
                  <input type="hidden" name="dataSource" value={selectedDataSource} />
                  {state?.fieldErrors?.analysisMode && (
                    <p id="analysisMode-error" className="text-sm text-destructive mt-1">
                        {state.fieldErrors.analysisMode.join(', ')}
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
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadJson(prepareAllPageData(), 'all-page-data')}
                        disabled={!state?.stockJson && !hasValidAnalysis}
                    >
                        <FileJson2 className="mr-2 h-4 w-4" /> Export JSON
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboardJson(prepareAllPageData(), 'All page data')}
                        disabled={!state?.stockJson && !hasValidAnalysis}
                    >
                        <ClipboardCopy className="mr-2 h-4 w-4" /> Copy JSON
                    </Button>
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadText(prepareAllPageData(), 'all-page-data', 'All Page Data')}
                        disabled={!state?.stockJson && !hasValidAnalysis}
                    >
                        <FileText className="mr-2 h-4 w-4" /> Export Text
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboardText(prepareAllPageData(), 'All page data', 'All Page Data')}
                        disabled={!state?.stockJson && !hasValidAnalysis}
                    >
                        <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Text
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadCsv(prepareAllPageData(), 'all-page-data', 'All Page Data')}
                        disabled={!state?.stockJson && !hasValidAnalysis}
                    >
                        <Sheet className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboardCsv(prepareAllPageData(), 'All page data', 'All Page Data')}
                        disabled={!state?.stockJson && !hasValidAnalysis}
                    >
                        <ClipboardCopy className="mr-2 h-4 w-4" /> Copy CSV
                    </Button>
                </div>
            </div>


            {state?.error && !state?.fieldErrors && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">Analysis Error</p>
                  <p className="text-sm">{state.error}</p>
                </div>
              </div>
            )}

            {(state?.stockJson || hasValidAnalysis) && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {state?.stockJson && (
                  <Card className="shadow-md">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-xl font-headline">
                          <FileJson2 className="h-6 w-6 text-primary" />
                          Stock Data (Quote & TA)
                        </CardTitle>
                      </div>
                      <CardDescription>Data from {DATA_SOURCES.find(ds => ds.value === selectedDataSource)?.label || 'selected source'}, includes market status, previous day quote and technical indicators.</CardDescription>
                      <div className="flex flex-wrap gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadJson(state.stockJson!, 'stock-data')} title="Export JSON">
                            <Download className="h-4 w-4 mr-1" /> JSON
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboardJson(state.stockJson!, 'Stock data')} title="Copy JSON">
                            <ClipboardCopy className="h-4 w-4 mr-1" /> JSON
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadText(state.stockJson!, 'stock-data', 'Stock Data (Quote & TA)')} title="Export Text">
                            <FileText className="h-4 w-4 mr-1" /> Text
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboardText(state.stockJson!, 'Stock data', 'Stock Data (Quote & TA)')} title="Copy Text">
                            <ClipboardCopy className="h-4 w-4 mr-1" /> Text
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadCsv(state.stockJson!, 'stock-data', 'Stock Data (Quote & TA)')} title="Export CSV">
                            <Sheet className="h-4 w-4 mr-1" /> CSV
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboardCsv(state.stockJson!, 'Stock data', 'Stock Data (Quote & TA)')} title="Copy CSV">
                            <ClipboardCopy className="h-4 w-4 mr-1" /> CSV
                          </Button>
                        </div>
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

                {hasValidAnalysis && (
                  <Card className="shadow-md">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                                <Brain className="h-6 w-6 text-accent" />
                                AI Key Takeaways
                            </CardTitle>
                        </div>
                      <CardDescription>Analysis based on the stock quote and technical indicators, with sentiment coloring.</CardDescription>
                       <div className="flex flex-wrap gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadJson(currentAnalysis, 'ai-analysis')} title="Export Analysis (JSON)">
                                    <Download className="h-4 w-4 mr-1" /> JSON
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboardJson(currentAnalysis, 'AI analysis')} title="Copy Analysis (JSON)">
                                    <ClipboardCopy className="h-4 w-4 mr-1" /> JSON
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadText(currentAnalysis, 'ai-analysis', 'AI Key Takeaways')} title="Export Analysis (Text)">
                                    <FileText className="h-4 w-4 mr-1" /> Text
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboardText(currentAnalysis, 'AI analysis', 'AI Key Takeaways')} title="Copy Analysis (Text)">
                                    <ClipboardCopy className="h-4 w-4 mr-1" /> Text
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadCsv(currentAnalysis, 'ai-analysis', 'AI Key Takeaways')} title="Export Analysis (CSV)">
                                    <Sheet className="h-4 w-4 mr-1" /> CSV
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboardCsv(currentAnalysis, 'AI analysis', 'AI Key Takeaways')} title="Copy Analysis (CSV)">
                                    <ClipboardCopy className="h-4 w-4 mr-1" /> CSV
                                </Button>
                            </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
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
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
             {state?.timestamp && !hasValidAnalysis && !state?.error && ( 
              <div className="mt-8 grid gap-6">
                <Card className="shadow-md">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-headline">
                        <ListChecks className="h-6 w-6 text-muted-foreground" />
                        AI Key Takeaways
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <p className="text-muted-foreground">AI analysis is pending or some specific takeaways could not be generated. Please check the console for details if this persists.</p>
                    {state?.analysis && Object.entries(state.analysis).map(([key, value]) => (
                        (value.text.includes("could not be generated") || value.text.includes("pending")) && <p key={key} className="text-sm text-destructive/80 mt-1">Note: {key.charAt(0).toUpperCase() + key.slice(1)} analysis: {value.text}</p>
                    ))}
                    </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        <Chatbot
          stockJson={state?.stockJson}
          analysis={state?.analysis} 
          cumulativeStats={cumulativeStats}
          updateCumulativeStats={updateCumulativeStatsCallback}
        />

      </main>
      <DebugConsole onToggle={(isOpen) => {
          console.log('[CLIENT:StockPage] Debug console toggled. Is open:', isOpen);
          setIsConsoleDocked(isOpen);
      }} />
    </>
  );
}

