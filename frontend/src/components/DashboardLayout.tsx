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
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import FluidBackground from '@/components/FluidBackground';

// Navigation items
const navigationItems = [
  { name: 'Home', icon: HomeIcon, href: '/dashboard', current: false },
  { name: 'Finance', icon: CurrencyDollarIcon, href: '/dashboard/finance', current: false },
  { name: 'Properties', icon: BuildingOfficeIcon, href: '/dashboard/properties', current: false },
  { name: 'Leases', icon: ClipboardDocumentListIcon, href: '/dashboard/leases', current: false },
  { name: 'Tenants', icon: UserGroupIcon, href: '/dashboard/tenants', current: false },
  { name: 'Landlord', icon: BuildingOffice2Icon, href: '/dashboard/landlord', current: false },
  { name: 'Maintenance', icon: WrenchScrewdriverIcon, href: '/dashboard/maintenance', current: false },
  { name: 'Suppliers', icon: TruckIcon, href: '/dashboard/suppliers', current: false },
  { name: 'Reports', icon: PresentationChartLineIcon, href: '/dashboard/reports', current: false },
  { name: 'Settings', icon: Cog6ToothIcon, href: '/dashboard/settings', current: false },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
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

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background */}
      <FluidBackground />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white/10 backdrop-blur-lg border-r border-white/20 transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/20">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-white">Navigation</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {sidebarCollapsed ? (
                <Bars3Icon className="h-5 w-5 text-white" />
              ) : (
                <XMarkIcon className="h-5 w-5 text-white" />
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
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
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

          {/* User Info */}
          <div className="px-2 py-4 border-t border-white/20">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-3'}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-4 w-4 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-300 truncate">{user?.email}</p>
                </div>
              )}
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
            <div className="border-b border-white/20 bg-white/5 backdrop-blur-lg">
              <div className="px-4 py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
                    {subtitle && (
                      <p className="text-gray-300 text-lg">{subtitle}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white font-semibold">{user?.full_name}</p>
                      <p className="text-gray-300 text-sm">{user?.email}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
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