/**
 * Dashboard Layout Component
 * Provides persistent sidebar navigation and layout for all dashboard pages
 */

'use client';

import { useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  BuildingOfficeIcon, 
  HomeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  PresentationChartLineIcon,
  FolderIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  FaceSmileIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import FluidBackground from '@/components/FluidBackground';
import ThemeToggle from '@/components/ThemeToggle';

// Navigation items
const navigationItems = [
  { name: 'Home', icon: HomeIcon, href: '/dashboard', current: false },
  { name: 'Finance', icon: CurrencyDollarIcon, href: '/dashboard/finance', current: false },
  { name: 'Properties', icon: BuildingOfficeIcon, href: '/dashboard/properties', current: false },
  { name: 'Leases', icon: ClipboardDocumentListIcon, href: '/dashboard/leases', current: false },
  { name: 'Tenants', icon: UserGroupIcon, href: '/dashboard/tenants', current: false },
  { name: 'Debt Management', icon: ExclamationTriangleIcon, href: '/dashboard/debt-management', current: false },
  { name: 'CRM', icon: UserIcon, href: '/dashboard/crm', current: false },
  { name: 'Landlord', icon: BuildingOffice2Icon, href: '/dashboard/landlord', current: false },
  { name: 'Maintenance', icon: WrenchScrewdriverIcon, href: '/dashboard/maintenance', current: false },
  { name: 'Inspections', icon: ClipboardDocumentCheckIcon, href: '/dashboard/inspections', current: false },
  { name: 'Suppliers', icon: TruckIcon, href: '/dashboard/suppliers', current: false },
  { name: 'Reports', icon: PresentationChartLineIcon, href: '/dashboard/reports', current: false },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Update navigation items with current state
  const currentNavigationItems = navigationItems.map(item => ({
    ...item,
    current: pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  }));

  // Handle navigation
  const handleNavigation = (href: string) => {
    router.push(href);
  };

  // Handle settings navigation
  const handleSettingsClick = () => {
    router.push('/dashboard/settings');
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100'
    }`}>
      {/* Background */}
      <FluidBackground />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} ${
        theme === 'dark' 
          ? 'bg-white/10 backdrop-blur-lg border-r border-white/20' 
          : 'bg-white/80 backdrop-blur-lg border-r border-gray-200 shadow-lg'
      } transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`flex items-center justify-between h-16 px-4 border-b ${
            theme === 'dark' ? 'border-white/20' : 'border-gray-200'
          }`}>
            {!sidebarCollapsed && (
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>RentPilot</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-white/10' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {sidebarCollapsed ? (
                <Bars3Icon className={`h-5 w-5 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-700'
                }`} />
              ) : (
                <XMarkIcon className={`h-5 w-5 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-700'
                }`} />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-2 py-4 space-y-2">
            {currentNavigationItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.current
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="ml-3">{item.name}</span>
                )}
              </button>
            ))}
          </nav>

          {/* User Info with Logout Button */}
          <div className={`px-2 py-4 border-t ${
            theme === 'dark' ? 'border-white/20' : 'border-gray-200'
          }`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-3'}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-4 w-4 text-white" />
              </div>
              {!sidebarCollapsed && (
                <button
                  onClick={handleSettingsClick}
                  className="ml-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                  title="Click to open Settings"
                >
                  <p className={`text-sm font-medium truncate ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>{user?.full_name}</p>
                  <p className={`text-xs truncate ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>{user?.email}</p>
                </button>
              )}
              {/* Circular Logout Button */}
              <button
                onClick={logout}
                className={`ml-2 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors ${
                  sidebarCollapsed ? 'ml-0' : ''
                }`}
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 ease-in-out`}>
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="relative z-10 min-h-screen">
          {/* Header */}
          {title && (
            <div className={`border-b backdrop-blur-lg ${
              theme === 'dark' 
                ? 'border-white/20 bg-white/5' 
                : 'border-gray-200 bg-white/60'
            }`}>
              <div className="px-4 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className={`text-3xl font-bold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>{title}</h1>
                    {subtitle && (
                      <p className={`text-lg ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>{subtitle}</p>
                    )}
                  </div>
                  <ThemeToggle showLabel={false} />
                </div>
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 