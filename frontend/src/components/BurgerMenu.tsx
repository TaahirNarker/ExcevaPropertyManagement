'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from './ThemeProvider';

type MenuItem = {
  title: string;
  href: string;
};

type StageItem = {
  title: string;
  subItems: MenuItem[];
};

type MenuSection = {
  title: string;
  subItems: (MenuItem | StageItem)[];
};

const menuItems: MenuSection[] = [
  {
    title: 'Property Analysis',
    subItems: [
      {
        title: 'Stage 1',
        subItems: [
          { title: 'Web Scraper', href: '/stage1/webscraper' },
          { title: 'PDF Parser', href: '/stage1/pdfparser' },
          { title: 'AI Agent', href: '/stage1/aiagent' },
        ],
      },
      {
        title: 'Stage 2',
        subItems: [
          { title: 'Property Analyser', href: '/stage2/propanalysis' },
        ],
      },
      {
        title: 'Stage 3',
        subItems: [
          { title: 'Coming Soon', href: '/stage3' },
        ],
      },
    ],
  },
  {
    title: 'Property Management',
    subItems: [
      { title: 'Dashboard', href: '/property-management' },
      { title: 'Properties & Units', href: '/property-management/properties' },
      { title: 'Tenants & Leases', href: '/property-management/tenants' },
      { title: 'Finance & Invoicing', href: '/property-management/finance' },
      { title: 'Reports & Analytics', href: '/property-management/reports' },
      { title: 'Admin Panel', href: 'http://localhost:8000/admin/' },
    ],
  },
  {
    title: 'Settings',
    subItems: [
      { title: 'Application Settings', href: '/stage3/settings' },
    ],
  },
];

const hasSubItems = (item: MenuItem | StageItem): item is StageItem => {
  return 'subItems' in item && Array.isArray(item.subItems);
};

export default function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    console.log("Menu toggled:", !isOpen); // Debug log
  };

  return (
    <div className="relative" style={{ zIndex: 99999 }}>
      <button
        onClick={toggleMenu}
        className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6 text-white" />
        ) : (
          <Bars3Icon className="h-6 w-6 text-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`fixed inset-0 ${isDark ? 'bg-black' : 'bg-gray-600'}`}
              style={{ zIndex: 99990 }}
              onClick={toggleMenu}
            />
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`fixed left-0 top-16 mt-2 w-64 rounded-lg shadow-xl border overflow-hidden ${
                isDark 
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
              style={{ zIndex: 99999 }}
            >
              <div className="p-4 space-y-4">
                {menuItems.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="space-y-2">
                    <button
                      onClick={() => setActiveSection(activeSection === sectionIndex ? null : sectionIndex)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                        isDark
                          ? 'bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800'
                      }`}
                    >
                      {section.title}
                    </button>
                    <AnimatePresence>
                      {activeSection === sectionIndex && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="pl-4 space-y-2"
                        >
                          {section.subItems.map((item, itemIndex) => (
                            <div key={itemIndex} className="space-y-2">
                              {hasSubItems(item) ? (
                                // Stage with sub-items (for Property Analysis stages)
                                <>
                                  <button
                                    onClick={() => setActiveStage(activeStage === itemIndex ? null : itemIndex)}
                                    className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm ${
                                      isDark
                                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    {item.title}
                                  </button>
                                  <AnimatePresence>
                                    {activeStage === itemIndex && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="pl-4 space-y-2"
                                      >
                                        {item.subItems.map((subItem, subIndex) => (
                                          <a
                                            key={subIndex}
                                            href={subItem.href}
                                            className={`block px-4 py-2 rounded-lg transition-all duration-300 text-sm ${
                                              isDark
                                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white'
                                                : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                            }`}
                                          >
                                            {subItem.title}
                                          </a>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              ) : (
                                // Direct link (for Settings and Property Management)
                                <a
                                  href={item.href}
                                  target={item.href.startsWith('http') ? '_blank' : '_self'}
                                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                  className={`block px-4 py-2 rounded-lg transition-all duration-300 text-sm ${
                                    isDark
                                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  {item.title}
                                </a>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 