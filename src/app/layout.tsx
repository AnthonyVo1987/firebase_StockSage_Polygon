
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Import Inter font
import './globals.css';

// Configure Inter font
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Use swap for better perceived performance
  variable: '--font-inter', // Optional: if you want to use it as a CSS variable
});

export const metadata: Metadata = {
  title: 'StockSage v1.2.14 - AI Stock Analysis',
  description: 'AI Powered Stock and Options Analysis v1.2.14',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`} suppressHydrationWarning>
      {/* 
        ThemeProvider, Toaster, ThemeToggleButton are now directly in page.tsx 
        to simplify initial layout and ensure they are within the client boundary 
        if they cause issues during SSR with the broader layout.
        The main body tag here will inherit the font from the html tag.
      */}
      <body>
        {children}
      </body>
    </html>
  );
}
