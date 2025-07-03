'use client';

import { ReactNode } from 'react';
import BurgerMenu from './BurgerMenu';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

interface LayoutProps {
  children: ReactNode;
  isHomePage?: boolean;
}

export default function Layout({ children, isHomePage = false }: LayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen text-white ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'
    }`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b ${
        isDark
          ? 'bg-gray-900/80 border-gray-700'
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="container mx-auto">
          {/* Simple three-part header */}
          <div className="h-16 flex items-center">
            {/* Left: Burger menu and logo */}
            <div className="w-1/4 flex items-center">
              <BurgerMenu />
              <Link href="/" className="ml-4">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Exceva Property
                </h1>
              </Link>
            </div>
            
            {/* Center: JARVIS - big and centered - hidden on homepage */}
            {!isHomePage && (
              <div className="w-2/4 flex justify-center items-center">
                <div className={`px-6 py-2 rounded-md border shadow-lg ${
                  isDark
                    ? 'bg-gray-800/50 border-gray-700'
                    : 'bg-white/50 border-gray-300'
                }`}>
                  <h2 className="text-2xl md:text-3xl font-mono tracking-widest font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center">
                    <span className="mr-3 h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                    J A R V I S
                    <span className="ml-3 h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                  </h2>
                </div>
              </div>
            )}
            
            {/* Empty space when on homepage (for layout balance) */}
            {isHomePage && <div className="w-2/4"></div>}
            
            {/* Right side: empty space for balance */}
            <div className="w-1/4"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`pt-16 ${isHomePage ? '' : ''}`}>
        <div className={`w-full mx-auto ${isHomePage ? '' : 'px-4 sm:px-6 lg:px-8 py-6'}`}>
          {children}
        </div>
      </main>

      {/* Futuristic Background Elements - Only show on non-homepage */}
      {!isHomePage && (
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${
            isDark 
              ? 'from-blue-500/10 via-transparent to-purple-500/10'
              : 'from-blue-300/20 via-transparent to-purple-300/20'
          }`}></div>
          <div className={`absolute inset-0 bg-[url('/grid.svg')] bg-center ${
            isDark
              ? '[mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]'
              : '[mask-image:linear-gradient(180deg,black,rgba(0,0,0,0))]'
          }`}></div>
        </div>
      )}
    </div>
  );
} 