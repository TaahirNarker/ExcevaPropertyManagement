/**
 * Theme Toggle Component
 * Beautiful toggle switch for light/dark mode
 */

'use client';

import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = true }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLabel && (
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {theme === 'dark' ? 'Dark' : 'Light'} Mode
        </span>
      )}
      
      <button
        onClick={toggleTheme}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        style={{
          backgroundColor: theme === 'dark' ? '#3b82f6' : '#d1d5db'
        }}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
            theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        
        {/* Icons */}
        <SunIcon 
          className={`absolute left-1 h-3 w-3 transition-colors ${
            theme === 'light' ? 'text-yellow-500' : 'text-gray-400'
          }`}
        />
        <MoonIcon 
          className={`absolute right-1 h-3 w-3 transition-colors ${
            theme === 'dark' ? 'text-blue-200' : 'text-gray-400'
          }`}
        />
      </button>
    </div>
  );
} 