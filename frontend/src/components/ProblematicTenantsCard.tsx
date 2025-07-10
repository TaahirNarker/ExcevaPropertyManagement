'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  ChartBarIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { tenantApi, invoiceApi, leaseApi, formatCurrency, formatDate, Tenant, Invoice, Lease } from '../lib/api';

interface ProblematicTenant {
  tenant: Tenant;
  monthsBehind: number;
  totalOwed: number;
  lastPayment: string | null;
  lease: Lease | null;
}

interface ProblematicTenantsCardProps {
  onViewTenant?: (tenantId: number) => void;
}

const ProblematicTenantsCard: React.FC<ProblematicTenantsCardProps> = ({ onViewTenant }) => {
  const [problematicTenants, setProblematicTenants] = useState<ProblematicTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProblematicTenants();
  }, []);

  const fetchProblematicTenants = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data
      const [tenants, invoices, leases] = await Promise.all([
        tenantApi.getAll(),
        invoiceApi.getAll(),
        leaseApi.getAll()
      ]);

      const currentDate = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

      const problematic: ProblematicTenant[] = [];

      for (const tenant of tenants) {
        // Get tenant's invoices
        const tenantInvoices = invoices.filter(inv => 
          inv.tenant && inv.tenant.id === tenant.id
        );

        // Calculate overdue invoices
        const overdueInvoices = tenantInvoices.filter(inv => {
          const dueDate = new Date(inv.due_date);
          return dueDate < currentDate && inv.paid_amount < inv.total_amount;
        });

        if (overdueInvoices.length === 0) continue;

        // Calculate months behind based on oldest unpaid invoice
        const oldestOverdue = overdueInvoices.reduce((oldest, current) => 
          new Date(current.due_date) < new Date(oldest.due_date) ? current : oldest
        );

        const monthsBehind = Math.floor(
          (currentDate.getTime() - new Date(oldestOverdue.due_date).getTime()) / 
          (1000 * 60 * 60 * 24 * 30)
        );

        // Only include if more than 3 months behind
        if (monthsBehind >= 3) {
          const totalOwed = overdueInvoices.reduce(
            (sum, inv) => sum + (inv.total_amount - inv.paid_amount), 
            0
          );

          // Find last payment date
          const paidInvoices = tenantInvoices.filter(inv => inv.paid_amount > 0);
          const lastPayment = paidInvoices.length > 0 ? 
            paidInvoices.reduce((latest, current) => 
              new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            ).created_at : null;

          // Find active lease
          const activeLease = leases.find(lease => 
            lease.tenant.id === tenant.id && lease.status === 'active'
          );

          problematic.push({
            tenant,
            monthsBehind,
            totalOwed,
            lastPayment,
            lease: activeLease || null
          });
        }
      }

      // Sort by months behind (most problematic first)
      problematic.sort((a, b) => b.monthsBehind - a.monthsBehind);
      setProblematicTenants(problematic);

    } catch (err) {
      console.error('Error fetching problematic tenants:', err);
      setError('Failed to load problematic tenants data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTenant = (tenantId: number) => {
    if (onViewTenant) {
      onViewTenant(tenantId);
    } else {
      // Default navigation to tenant management
      window.location.href = `/property-management/tenants`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="bg-gray-100 dark:bg-gray-800">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Problematic Tenants</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{problematicTenants.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {problematicTenants.length === 0 
                ? 'All tenants up to date' 
                : `${problematicTenants.length} tenant${problematicTenants.length > 1 ? 's' : ''} 3+ months behind`
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-8 w-8 text-red-500" />
            <EyeIcon className={`h-4 w-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Mini Chart Preview */}
        {problematicTenants.length > 0 && (
          <div className="mt-4 h-16 flex items-end space-x-1">
            {problematicTenants.slice(0, 8).map((tenant, index) => (
              <div
                key={tenant.tenant.id}
                className="flex-1 bg-red-400 dark:bg-red-500 rounded-t opacity-60 hover:opacity-100 transition-opacity"
                style={{
                  height: `${Math.min((tenant.monthsBehind / 12) * 100, 100)}%`,
                  minHeight: '8px'
                }}
                title={`${tenant.tenant.name}: ${tenant.monthsBehind} months behind`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detailed View */}
      {showDetails && problematicTenants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 dark:border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tenants Behind on Rent</h3>
              <button
                onClick={() => window.location.href = '/property-management/tenants'}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                View All Tenants →
              </button>
            </div>

            {/* Chart */}
            <div className="mb-6">
              <div className="flex items-end h-32 space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                {problematicTenants.map((tenant, index) => (
                  <div key={tenant.tenant.id} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t cursor-pointer hover:from-red-600 hover:to-red-500 transition-colors"
                      style={{
                        height: `${Math.min((tenant.monthsBehind / 12) * 100, 90)}%`,
                        minHeight: '20px'
                      }}
                      onClick={() => handleViewTenant(tenant.tenant.id)}
                      title={`${tenant.tenant.name}: ${tenant.monthsBehind} months, ${formatCurrency(tenant.totalOwed)} owed`}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate w-full text-center">
                      {tenant.monthsBehind}m
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Months Behind</span>
              </div>
            </div>

            {/* Tenant List */}
            <div className="space-y-3">
              {problematicTenants.slice(0, 5).map((tenantData) => (
                <div
                  key={tenantData.tenant.id}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                  onClick={() => handleViewTenant(tenantData.tenant.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {tenantData.tenant.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {tenantData.monthsBehind} months behind
                        </span>
                        <span>{formatCurrency(tenantData.totalOwed)} owed</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenantData.monthsBehind >= 6 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                    }`}>
                      {tenantData.monthsBehind >= 6 ? 'Critical' : 'Warning'}
                    </div>
                    {tenantData.lastPayment && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last: {formatDate(tenantData.lastPayment)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {problematicTenants.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => window.location.href = '/property-management/tenants'}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    View {problematicTenants.length - 5} more problematic tenant{problematicTenants.length - 5 > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {problematicTenants.length === 0 && (
        <div className="p-6 text-center border-t border-gray-200 dark:border-gray-700">
          <div className="text-green-500 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All tenants are up to date with their rent payments
          </p>
        </div>
      )}
    </div>
  );
};

export default ProblematicTenantsCard; 