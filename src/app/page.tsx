
import StockAnalysisPage from '@/components/stock-analysis-page';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export default function Home() {
  const disclaimerText = "⚠️ StockSage is for demonstration purposes only. AI responses are for informational purposes and not financial advice. Always consult with a qualified financial advisor.";
  const appVersion = "1.2.12"; // Updated version to 1.2.12

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col">
      <header className="mb-4 text-center">
        <div className="inline-flex items-center gap-3 mb-1 justify-center">
          <TrendingUp className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-primary">
            StockSage
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground/80 mb-2">
          Version {appVersion}
        </p>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Enter a stock ticker and select an API data source to view market data and AI-powered insights.
          You can also chat with our AI assistant below for more detailed analysis or general financial queries.
        </p>
      </header>
      <div className="my-4 text-center">
        <div 
          className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-md border border-amber-300 dark:border-amber-600 inline-flex items-center gap-2 max-w-3xl mx-auto"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span>{disclaimerText}</span>
        </div>
      </div>
      <StockAnalysisPage />
      <footer className="text-center py-8 mt-auto">
        <p className="text-sm text-muted-foreground">
          {disclaimerText}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          StockSage &copy; {new Date().getFullYear()}.
        </p>
      </footer>
    </div>
  );
}
