
import StockAnalysisPage from '@/components/stock-analysis-page';
import { TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2 justify-center">
          <TrendingUp className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-primary">
            StockSage
          </h1>
        </div>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Enter a stock ticker to view its (mock) data and get AI-powered insights. You can also chat with our AI assistant below for more detailed analysis or general financial queries.
        </p>
      </header>
      <StockAnalysisPage />
      <footer className="text-center py-8 mt-auto">
        <p className="text-sm text-muted-foreground">
          StockSage &copy; {new Date().getFullYear()}. For demonstration purposes only. Stock data and search results are mocked.
          AI responses are for informational purposes and not financial advice.
        </p>
      </footer>
    </div>
  );
}
