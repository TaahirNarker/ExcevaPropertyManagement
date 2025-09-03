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
import { tenantApi, invoiceApi, leaseApi, financeApi, Tenant, Lease } from '../lib/api';
import PaymentAllocationModal from './PaymentAllocationModal';

interface UnderpaymentAlertItem {
  id: number;
  tenant: number;
  tenant_name: string;
  invoice: number;
  invoice_number: string;
  expected_amount: number;
  actual_amount: number;
  shortfall_amount: number;
  alert_message: string;
  status: string;
  created_at: string;
}

interface ProblematicTenantsCardProps {
  onViewTenant?: (tenantId: number) => void;
}

const ProblematicTenantsCard: React.FC<ProblematicTenantsCardProps> = ({ onViewTenant }) => {
  const [alerts, setAlerts] = useState<UnderpaymentAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isAllocationOpen, setIsAllocationOpen] = useState(false);
  const [allocationInvoices, setAllocationInvoices] = useState<Array<{
    id: number; invoice_number: string; due_date: string; total_amount: number; balance_due: number; status: string;
    title?: string; tenant_name?: string; property_name?: string;
  }>>([]);
  const [allocationPaymentType, setAllocationPaymentType] = useState<'manual' | 'bank'>('bank');
  const [allocationPaymentAmount, setAllocationPaymentAmount] = useState(0);
  const [allocationPaymentId, setAllocationPaymentId] = useState<number | undefined>(undefined);
  const [allocationBankTxnId, setAllocationBankTxnId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoiceApi.getUnderpaymentAlerts();
      if (result.success) {
        setAlerts(result.alerts || []);
      } else {
        setAlerts([]);
      }

    } catch (err) {
      console.error('Error fetching underpayment alerts:', err);
      setError('Failed to load underpayment alerts');
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

  // Open allocation modal for a specific alert
  const openAllocationForAlert = async (alert: UnderpaymentAlertItem) => {
    try {
      // Find active lease for tenant
      const leasesResp = await leaseApi.getLeases({ tenant: alert.tenant, status: 'active', page_size: 100 });
      const activeLease = (leasesResp.results || []).find((l: any) => l.status === 'active');
      if (!activeLease) {
        setError('No active lease found for tenant');
        return;
      }

      const leaseId = Number(activeLease.id);
      const financials = await financeApi.getLeaseFinancials(leaseId);

      // Build invoices list from invoice_history (which contains balance_due)
      const invoices = (financials.invoice_history || [])
        .filter((inv: any) => inv.balance_due && inv.balance_due > 0)
        .map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          total_amount: inv.total_amount,
          balance_due: inv.balance_due,
          status: inv.status,
          title: inv.title,
          tenant_name: financials?.lease_info ? undefined : undefined,
          property_name: undefined,
        }));

      setAllocationInvoices(invoices);
      setAllocationPaymentAmount(alert.actual_amount);
      // Use bank vs manual based on presence of IDs
      if ((alert as any).bank_transaction) {
        setAllocationPaymentType('bank');
        setAllocationBankTxnId((alert as any).bank_transaction);
        setAllocationPaymentId(undefined);
      } else if ((alert as any).payment) {
        setAllocationPaymentType('manual');
        setAllocationPaymentId((alert as any).payment);
        setAllocationBankTxnId(undefined);
      } else {
        // Fallback to bank type without id
        setAllocationPaymentType('bank');
        setAllocationPaymentId(undefined);
        setAllocationBankTxnId(undefined);
      }

      setIsAllocationOpen(true);
    } catch (e) {
      console.error('Failed to prepare allocation modal', e);
      setError('Failed to prepare allocation');
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
            <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {alerts.length === 0 
                ? 'No underpayment alerts' 
                : `${alerts.length} underpayment alert${alerts.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-8 w-8 text-red-500" />
            <EyeIcon className={`h-4 w-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Mini Chart Preview */}
        {alerts.length > 0 && (
          <div className="mt-4 h-16 flex items-end space-x-1">
            {alerts.slice(0, 8).map((a) => (
              <div
                key={a.id}
                className="flex-1 bg-red-400 dark:bg-red-500 rounded-t opacity-60 hover:opacity-100 transition-opacity"
                style={{
                  height: `70%`,
                  minHeight: '8px'
                }}
                title={`${a.tenant_name}: shortfall R${a.shortfall_amount.toFixed(2)}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detailed View */}
      {showDetails && alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 dark:border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Underpayment Alerts</h3>
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
                {alerts.map((a) => (
                  <div key={tenant.tenant.id} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t cursor-pointer hover:from-red-600 hover:to-red-500 transition-colors"
                      style={{ height: `60%`, minHeight: '20px' }}
                      onClick={() => openAllocationForAlert(a)}
                      title={`${a.tenant_name}: shortfall R${a.shortfall_amount.toFixed(2)}`}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate w-full text-center">
                      R{a.shortfall_amount.toFixed(0)}
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
              {alerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                  onClick={() => openAllocationForAlert(a)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {a.tenant_name}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                        <span>Invoice #{a.invoice_number}</span>
                        <span>Shortfall: R{a.shortfall_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      a.shortfall_amount >= 1 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                    }`}>
                      {a.shortfall_amount >= 1 ? 'Active' : 'Info'}
                    </div>
                  </div>
                </div>
              ))}
              
              {alerts.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => window.location.href = '/property-management/tenants'}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    View {alerts.length - 5} more alerts
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <div className="p-6 text-center border-t border-gray-200 dark:border-gray-700">
          <div className="text-green-500 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No active underpayment alerts
          </p>
        </div>
      )}

      {/* Allocation Modal */}
      <PaymentAllocationModal
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
        onSuccess={() => {
          setIsAllocationOpen(false);
          fetchAlerts();
        }}
        paymentId={allocationPaymentId}
        bankTransactionId={allocationBankTxnId}
        paymentType={allocationPaymentType}
        paymentAmount={allocationPaymentAmount}
        invoices={allocationInvoices}
      />
    </div>
  );
};

export default ProblematicTenantsCard; 