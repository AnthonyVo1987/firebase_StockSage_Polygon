
import StockAnalysisPage from '@/components/stock-analysis-page';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { Toaster } from "@/components/ui/toaster"; // For toast notifications
import { AlertTriangle, TrendingUp } from 'lucide-react'; // For disclaimer

export default function Home() {
  const appVersion = "1.2.14";
  const disclaimerText = "⚠️ StockSage is for demonstration purposes only. AI responses are for informational purposes and not financial advice. Always consult with a qualified financial advisor.";

  return (
    <ThemeProvider defaultTheme="dark" storageKey="stocksage-ui-theme">
      <div className="min-h-screen bg-background text-foreground flex flex-col font-body selection:bg-primary/20 selection:text-primary">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-screen-2xl items-center">
            <div className="mr-4 flex items-center">
              <TrendingUp className="h-7 w-7 mr-2 text-primary" />
              <span className="font-bold text-xl font-headline">
                StockSage <span className="text-xs text-muted-foreground align-super">v{appVersion}</span>
              </span>
            </div>
            {/* Navbar items can go here if needed in the future */}
          </div>
        </header>
        
        <div className="p-2 text-xs text-center bg-sky-800 text-sky-100">
          {disclaimerText}
        </div>

        <div className="flex-grow container mx-auto px-4 py-8 md:px-6 lg:px-8 max-w-screen-2xl"> {/* Increased max-width */}
          <StockAnalysisPage />
        </div>

        <footer className="p-4 border-t border-border/40 bg-background text-center text-xs text-muted-foreground">
          <p>{disclaimerText}</p>
          <p>&copy; {new Date().getFullYear()} StockSage. All Rights Reserved (Demo Only).</p>
          <p>Application Version: {appVersion}</p>
        </footer>

        <ThemeToggleButton />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
