'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('dark');
  
  // On mount, load theme from localStorage or use system preference
  useEffect(() => {
    // First try to get from localStorage
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setTheme(parsedSettings.darkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Error loading theme setting:', error);
      }
    }
  }, []);
  
  // Update data-theme attribute on document when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);
  
  // Toggle between dark and light themes
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Update localStorage
    try {
      const savedSettings = localStorage.getItem('app-settings');
      let settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.darkMode = newTheme === 'dark';
      localStorage.setItem('app-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving theme setting:', error);
    }
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
} 