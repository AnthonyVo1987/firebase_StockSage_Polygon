
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'dark', // Default to dark as requested
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'stocksage-ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    let themeToSet = defaultTheme;
    let storedTheme: Theme | null = null;
    if (typeof window !== 'undefined') {
      try {
        storedTheme = localStorage.getItem(storageKey) as Theme | null;
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
          themeToSet = storedTheme;
        }
      } catch (e) {
        console.error('[ThemeProvider] Error reading theme from localStorage', e);
        // Fallback to defaultTheme if localStorage is inaccessible or value is invalid
      }
    }
    console.log(`[ThemeProvider] Initial theme determination. Stored: "${storedTheme}", Default: "${defaultTheme}", Final initial: ${themeToSet}`);
    return themeToSet;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      try {
        localStorage.setItem(storageKey, theme);
        console.log(`[ThemeProvider] Applied theme to root: "${theme}". localStorage updated.`);
      } catch (e) {
        console.error('[ThemeProvider] Error saving theme to localStorage', e);
      }
    }
  }, [theme, storageKey]);

  const setTheme = (newTheme: Theme) => {
    console.log(`[ThemeProvider] setTheme called. New theme: "${newTheme}"`);
    setThemeState(newTheme);
  };

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

