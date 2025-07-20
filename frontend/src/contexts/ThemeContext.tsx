/**
 * Theme Context - Manages light/dark mode state across the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Theme types
type Theme = 'light' | 'dark';

// Theme context interface
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  console.log('🎨 ThemeProvider initializing');
  const [theme, setThemeState] = useState<Theme>('dark'); // Default to dark mode
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    console.log('🎨 ThemeProvider useEffect - initialization');
    const savedTheme = localStorage.getItem('theme') as Theme;
    console.log('🎨 Saved theme from localStorage:', savedTheme);
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      console.log('🎨 Using saved theme:', savedTheme);
      setThemeState(savedTheme);
    } else {
      // Check system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      console.log('🎨 Using system theme:', systemTheme);
      setThemeState(systemTheme);
    }
    setMounted(true);
  }, []);

  // Update theme in localStorage and apply to document
  const setTheme = (newTheme: Theme) => {
    console.log('🎨 Setting theme to:', newTheme);
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  // Toggle between light and dark themes
  const toggleTheme = () => {
    console.log('🎨 Toggling theme from:', theme);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Apply theme to document when theme changes
  useEffect(() => {
    console.log('🎨 Theme effect - mounted:', mounted, 'theme:', theme);
    if (mounted) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme, mounted]);

  // Prevent hydration mismatch
  if (!mounted) {
    console.log('🎨 ThemeProvider not yet mounted, returning fallback');
    return <div className="dark">{children}</div>;
  }

  console.log('🎨 ThemeProvider rendering with theme:', theme);
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme context
export function useTheme() {
  console.log('🎨 useTheme hook called');
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.error('🎨 Theme context is undefined! Component tree:', 
      React.Children.toArray(React.createElement('div').props.children)
        .map(child => (child as any)?.type?.name || 'Unknown')
        .join(' -> ')
    );
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 