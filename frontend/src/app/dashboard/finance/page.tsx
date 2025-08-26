'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { financeApi } from '@/lib/api';

import { 
  BanknotesIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  XMarkIcon,
  PlusIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

// Type definitions
interface FinancialSummary {
  total_rental_income: number;
  total_outstanding: number;
  collection_rate: number;
  deposits_held: number;
  payments_due_landlords: number;
  payments_due_suppliers: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_profit: number;
  cash_flow: number;
}

export default function FinancePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh financial data
  const refreshFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch financial summary
      const summary = await financeApi.getFinancialSummary();
      setFinancialSummary(summary);
      
    } catch (error) {
      console.error('Error refreshing financial data:', error);
      alert('Failed to refresh financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (isAuthenticated) {
        try {
          setLoading(true);
          
          // Fetch financial summary
          const summary = await financeApi.getFinancialSummary();
          setFinancialSummary(summary);
          
        } catch (error) {
          console.error('Error fetching financial data:', error);
          setError('Failed to load financial data. Please check your connection and try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFinancialData();
  }, [isAuthenticated]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  // Authentication check
  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Finance Overview">
      <div className="p-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Finance Overview Dashboard */}
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Finance Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Welcome to your financial management dashboard
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Master Finance</p>
                    <p className="text-xs text-muted-foreground">Comprehensive financial management</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Cog6ToothIcon className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Administration</p>
                    <p className="text-xs text-muted-foreground">System controls and settings</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CurrencyDollarIcon className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Quick Access</p>
                    <p className="text-xs text-muted-foreground">Use the sidebar dropdown</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary?.total_rental_income || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary?.total_outstanding || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {financialSummary?.collection_rate || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-8 w-8 text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Cash Flow</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary?.cash_flow || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button 
                onClick={() => router.push('/dashboard/finance/master')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <PlusIcon className="h-8 w-8 text-blue-400 mb-2" />
                <span className="text-sm text-foreground">Record Payment</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/finance/master')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <DocumentTextIcon className="h-8 w-8 text-green-400 mb-2" />
                <span className="text-sm text-foreground">Create Adjustment</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/finance/master')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <ArrowUpTrayIcon className="h-8 w-8 text-orange-400 mb-2" />
                <span className="text-sm text-foreground">Import Transactions</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/tenants')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <DocumentTextIcon className="h-8 w-8 text-indigo-400 mb-2" />
                <span className="text-sm text-foreground">View Statements</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/finance/master')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <ChartBarIcon className="h-8 w-8 text-purple-400 mb-2" />
                <span className="text-sm text-foreground">Master Finance</span>
              </button>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Master Finance</h3>
              <p className="text-muted-foreground mb-4">
                Access comprehensive financial management tools including detailed reports, 
                income tracking, expense management, and transaction history.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Financial Overview & Analytics</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>Income & Revenue Tracking</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <BanknotesIcon className="h-4 w-4" />
                  <span>Expense Management</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>Transaction History</span>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Administration</h3>
              <p className="text-muted-foreground mb-4">
                Manage system settings, user permissions, audit logs, and administrative 
                controls for the financial management system.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>User Management</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span>System Settings</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>Audit Logs</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>Security Controls</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 