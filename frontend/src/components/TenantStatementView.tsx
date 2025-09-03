'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  DocumentTextIcon, 
  CalendarDaysIcon, 
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { invoiceApi } from '@/lib/api';

interface TenantStatementItem {
  id: number;
  date: string;
  type: 'invoice' | 'payment' | 'adjustment';
  description: string;
  invoice_number?: string;
  amount: number;
  balance: number;
  status: string;
  notes?: string;
}

interface TenantStatement {
  tenant_id: number;
  tenant_name: string;
  tenant_code: string;
  property_name: string;
  unit_number: string;
  statement_period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    opening_balance: number;
    total_invoiced: number;
    total_payments: number;
    total_adjustments: number;
    closing_balance: number;
  };
  items: TenantStatementItem[];
}

interface TenantStatementViewProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: number | null;
  tenantName?: string;
}

const TenantStatementView: React.FC<TenantStatementViewProps> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName
}) => {
  const [statement, setStatement] = useState<TenantStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['invoice', 'payment', 'adjustment']);

  // Fetch tenant statement
  const fetchStatement = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await invoiceApi.getTenantStatement(
        tenantId,
        dateRange.start_date,
        dateRange.end_date
      );

      if (!res.success) throw new Error(res.error || 'Failed to load statement');

      // Map backend response shape to TenantStatement UI model
      const mapped: TenantStatement = {
        tenant_id: res.tenant.id,
        tenant_name: res.tenant.name,
        tenant_code: String(res.tenant.id),
        property_name: res.lease?.unit || 'N/A',
        unit_number: res.lease?.unit || 'N/A',
        statement_period: {
          start_date: String(res.statement_period.start_date),
          end_date: String(res.statement_period.end_date),
        },
        summary: {
          opening_balance: Number(res.summary.opening_balance || 0),
          total_invoiced: Number(res.summary.total_charges || 0),
          total_payments: Number(res.summary.total_payments || 0),
          total_adjustments: Number(res.summary.total_adjustments || 0),
          closing_balance: Number(res.summary.closing_balance || 0),
        },
        items: (res.transactions || []).map((t: any, idx: number) => ({
          id: idx + 1,
          date: String(t.date),
          type: t.type,
          description: t.description,
          invoice_number: t.reference,
          amount: Number(t.charges || 0) - Number(t.payments || 0) + Number(t.adjustments || 0),
          balance: Number(t.balance || 0),
          status: t.type === 'invoice' ? 'sent' : 'completed',
        })),
      };

      setStatement(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenant statement');
    } finally {
      setIsLoading(false);
    }
  };

  // Load statement on open
  useEffect(() => {
    if (isOpen && tenantId) {
      fetchStatement();
    }
  }, [isOpen, tenantId]);

  const handleClose = () => {
    setStatement(null);
    setError(null);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getItemTypeInfo = (type: string) => {
    switch (type) {
      case 'invoice':
        return {
          icon: DocumentTextIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          label: 'Invoice'
        };
      case 'payment':
        return {
          icon: CurrencyDollarIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
          label: 'Payment'
        };
      case 'adjustment':
        return {
          icon: InformationCircleIcon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-500/10',
          label: 'Adjustment'
        };
      default:
        return {
          icon: DocumentTextIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-500/10',
          label: 'Item'
        };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20'
        };
      case 'pending':
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20'
        };
      case 'overdue':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20'
        };
      default:
        return {
          icon: InformationCircleIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20'
        };
    }
  };

  const handleExportStatement = async () => {
    if (!statement) return;
    
    try {
      // This would typically generate a PDF or Excel export
      console.log('Exporting statement for tenant:', statement.tenant_name);
      alert('Export functionality would be implemented here');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Tenant Statement</h2>
            <p className="text-muted-foreground mt-1">
              {tenantName || statement?.tenant_name || 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              title="Filter Options"
            >
              <EyeIcon className="h-6 w-6 text-muted-foreground" />
            </button>
            {statement && (
              <button
                onClick={handleExportStatement}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                title="Export Statement"
              >
                <ArrowDownTrayIcon className="h-6 w-6 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-6 border-b border-border/50 bg-muted/20">
            <h3 className="text-lg font-medium text-foreground mb-4">Filter Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Types</label>
                <div className="space-y-2">
                  {['invoice', 'payment', 'adjustment'].map(type => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleTypeFilter(type)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-foreground capitalize">{type}s</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={fetchStatement}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-muted-foreground">Loading statement...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Statement</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchStatement}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : statement ? (
            <div className="space-y-6">
              {/* Statement Header */}
              <div className="bg-muted/30 border border-border/50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-3">Tenant Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {statement.tenant_name}</div>
                      <div><strong>Code:</strong> {statement.tenant_code}</div>
                      <div><strong>Property:</strong> {statement.property_name}</div>
                      <div><strong>Unit:</strong> {statement.unit_number}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-3">Statement Period</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>From:</strong> {formatDate(statement.statement_period.start_date)}</div>
                      <div><strong>To:</strong> {formatDate(statement.statement_period.end_date)}</div>
                      <div><strong>Generated:</strong> {formatDate(new Date().toISOString())}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(statement.summary.opening_balance)}
                  </div>
                  <div className="text-sm text-blue-600">Opening Balance</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(statement.summary.total_invoiced)}
                  </div>
                  <div className="text-sm text-orange-600">Total Invoiced</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(statement.summary.total_payments)}
                  </div>
                  <div className="text-sm text-green-600">Total Payments</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(statement.summary.total_adjustments)}
                  </div>
                  <div className="text-sm text-purple-600">Adjustments</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${statement.summary.closing_balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                    {formatCurrency(statement.summary.closing_balance)}
                  </div>
                  <div className="text-sm text-indigo-600">Closing Balance</div>
                </div>
              </div>

              {/* Statement Items */}
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50">
                  <h3 className="text-lg font-medium text-foreground">Transaction History</h3>
                </div>
                
                {statement.items.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Transactions</h3>
                    <p className="text-muted-foreground">
                      No transactions found for the selected period and filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Balance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {statement.items.map((item) => {
                          const typeInfo = getItemTypeInfo(item.type);
                          const statusInfo = getStatusInfo(item.status);
                          const TypeIcon = typeInfo.icon;
                          const StatusIcon = statusInfo.icon;

                          return (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                {formatDate(item.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                                  <TypeIcon className="h-3 w-3" />
                                  {typeInfo.label}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground">
                                <div>
                                  {item.description}
                                  {item.invoice_number && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Invoice: {item.invoice_number}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={`${item.type === 'payment' ? 'text-green-600' : item.amount < 0 ? 'text-red-600' : 'text-foreground'}`}>
                                  {item.type === 'payment' && '+'}
                                  {formatCurrency(Math.abs(item.amount))}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={`${item.balance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                                  {formatCurrency(item.balance)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {item.status}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TenantStatementView;
