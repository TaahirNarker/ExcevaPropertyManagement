/**
 * Dashboard Page - Property Management System
 * Main dashboard showing comprehensive property portfolio management
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon, 
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  PresentationChartLineIcon,
  FolderIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { useAuth, withAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';

// Mock data - in production, this would come from your API
const mockDashboardData = {
  portfolioValue: 2400000,
  occupancyRate: 92,
  activeTenants: 28,
  monthlyIncome: 45000,
  properties: 12,
  activeLeases: 24,
  totalValue: 2400000
};

function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(mockDashboardData);
  const [isLoading, setIsLoading] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('ZAR', 'R');
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <DashboardLayout
      title="Property Management System"
      subtitle="Complete property portfolio management solution for landlords, property managers, and real estate professionals"
    >
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Portfolio Value</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(dashboardData.portfolioValue)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Occupancy Rate</p>
                <p className="text-3xl font-bold text-white">{formatPercentage(dashboardData.occupancyRate)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Active Tenants</p>
                <p className="text-3xl font-bold text-white">{formatNumber(dashboardData.activeTenants)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Monthly Income</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(dashboardData.monthlyIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Properties</h3>
                  <p className="text-gray-300 text-sm">Manage your property portfolio</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatNumber(dashboardData.properties)}</p>
                <p className="text-gray-300 text-sm">Properties</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">Manage your property portfolio and individual units</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Leases</h3>
                  <p className="text-gray-300 text-sm">Manage tenant lease agreements</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatNumber(dashboardData.activeLeases)}</p>
                <p className="text-gray-300 text-sm">Active Leases</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">Track lease renewals, terms, and tenant agreements</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Tenants</h3>
                  <p className="text-gray-300 text-sm">Manage tenant relationships</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatNumber(dashboardData.activeTenants)}</p>
                <p className="text-gray-300 text-sm">Active Tenants</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">Manage tenant profiles, communications, and history</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Finance</h3>
                  <p className="text-gray-300 text-sm">Track payments and expenses</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.monthlyIncome)}</p>
                <p className="text-gray-300 text-sm">Monthly Income</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">Monitor rent collection, expenses, and financial performance</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Maintenance</h3>
                  <p className="text-gray-300 text-sm">Track property maintenance</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">4</p>
                <p className="text-gray-300 text-sm">Active Requests</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">Manage maintenance requests and property upkeep</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <PresentationChartLineIcon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Reports</h3>
                  <p className="text-gray-300 text-sm">Generate business insights</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatPercentage(dashboardData.occupancyRate)}</p>
                <p className="text-gray-300 text-sm">Performance</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">View detailed analytics and performance reports</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center space-x-3 transition-colors">
              <PlusIcon className="h-5 w-5" />
              <span>Add Property</span>
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center space-x-3 transition-colors">
              <UserGroupIcon className="h-5 w-5" />
              <span>Add Tenant</span>
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center space-x-3 transition-colors">
              <ClipboardDocumentListIcon className="h-5 w-5" />
              <span>Create Lease</span>
            </button>
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg flex items-center space-x-3 transition-colors">
              <DocumentTextIcon className="h-5 w-5" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage); 