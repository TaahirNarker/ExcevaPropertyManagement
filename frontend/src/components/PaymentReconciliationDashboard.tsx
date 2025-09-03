'use client';

import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { invoiceApi } from '@/lib/api';

interface UnmatchedPayment {
  id: number;
  type: 'manual' | 'bank';
  date: string;
  amount: number;
  description: string;
  reference?: string;
  bank_name?: string;
  status: 'unmatched' | 'partial' | 'review_required';
  potential_matches?: {
    invoice_id: number;
    invoice_number: string;
    tenant_name: string;
    confidence_score: number;
  }[];
}

interface ReconciliationStats {
  total_payments: number;
  auto_reconciled: number;
  manual_review: number;
  unmatched: number;
  total_amount: number;
  reconciled_amount: number;
  unmatched_amount: number;
}

interface PaymentReconciliationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentReconciliationDashboard: React.FC<PaymentReconciliationDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [unmatchedPayments, setUnmatchedPayments] = useState<UnmatchedPayment[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null);

  // Fetch unmatched payments and stats
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const paymentsResult = await invoiceApi.getUnmatchedPayments();

      // Map backend shape to UI shape
      const mapped: UnmatchedPayment[] = [
        ...(paymentsResult.unmatched_transactions || []).map((t: any) => ({
          id: t.id,
          type: 'bank',
          date: t.transaction_date,
          amount: t.amount,
          description: t.description,
          reference: t.reference_number,
          bank_name: t.bank_account,
          status: 'review_required',
        })),
        ...(paymentsResult.pending_payments || []).map((p: any) => ({
          id: p.id,
          type: 'manual',
          date: p.payment_date,
          amount: p.amount,
          description: `${p.payment_method} payment - ${p.tenant_name}`,
          reference: p.reference_number,
          status: 'unmatched',
        }))
      ];

      setUnmatchedPayments(mapped);

      // Derive simple stats from counts
      const total = mapped.length;
      const manual_review = (paymentsResult.unmatched_transactions || []).length;
      const unmatched = (paymentsResult.pending_payments || []).length;
      setStats({
        total_payments: total,
        auto_reconciled: 0,
        manual_review,
        unmatched,
        total_amount: mapped.reduce((s, x) => s + (x.amount || 0), 0),
        reconciled_amount: 0,
        unmatched_amount: mapped.reduce((s, x) => s + (x.amount || 0), 0),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliation data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleClose = () => {
    setUnmatchedPayments([]);
    setStats(null);
    setError(null);
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSelectedPayment(null);
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'unmatched':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Unmatched'
        };
      case 'partial':
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          label: 'Partial Match'
        };
      case 'review_required':
        return {
          icon: EyeIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          label: 'Review Required'
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          label: status
        };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'manual':
        return {
          icon: PencilIcon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-500/10',
          label: 'Manual'
        };
      case 'bank':
        return {
          icon: DocumentTextIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          label: 'Bank Import'
        };
      default:
        return {
          icon: CurrencyDollarIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-500/10',
          label: type
        };
    }
  };

  const handlePaymentClick = (payment: UnmatchedPayment) => {
    setSelectedPayment(payment);
  };

  const handleAllocatePayment = (payment: UnmatchedPayment) => {
    // This would open the PaymentAllocationModal
    console.log('Allocate payment:', payment);
    alert('Payment allocation modal would open here');
  };

  const filteredPayments = unmatchedPayments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || payment.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Payment Reconciliation Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Review and manage unmatched payments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              title="Filter Options"
            >
              <FunnelIcon className="h-6 w-6 text-muted-foreground" />
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <ArrowPathIcon className={`h-6 w-6 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Description, reference..."
                    className="w-full pl-10 pr-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="unmatched">Unmatched</option>
                  <option value="partial">Partial Match</option>
                  <option value="review_required">Review Required</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="manual">Manual</option>
                  <option value="bank">Bank Import</option>
                </select>
              </div>

              {/* Apply Button */}
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-muted-foreground">Loading reconciliation data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchData}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Summary */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.total_payments}</div>
                    <div className="text-sm text-blue-600">Total Payments</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.auto_reconciled}</div>
                    <div className="text-sm text-green-600">Auto Reconciled</div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.manual_review}</div>
                    <div className="text-sm text-yellow-600">Manual Review</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.unmatched}</div>
                    <div className="text-sm text-red-600">Unmatched</div>
                  </div>
                </div>
              )}

              {/* Unmatched Payments Table */}
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50">
                  <h3 className="text-lg font-medium text-foreground">
                    Unmatched Payments ({filteredPayments.length})
                  </h3>
                </div>
                
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">All Payments Reconciled!</h3>
                    <p className="text-muted-foreground">
                      No unmatched payments found. All payments have been successfully reconciled.
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
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Potential Matches
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredPayments.map((payment) => {
                          const statusInfo = getStatusInfo(payment.status);
                          const typeInfo = getTypeInfo(payment.type);
                          const StatusIcon = statusInfo.icon;
                          const TypeIcon = typeInfo.icon;

                          return (
                            <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                {formatDate(payment.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                                  <TypeIcon className="h-3 w-3" />
                                  {typeInfo.label}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground">
                                <div>
                                  {payment.description}
                                  {payment.reference && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Ref: {payment.reference}
                                    </div>
                                  )}
                                  {payment.bank_name && (
                                    <div className="text-xs text-muted-foreground">
                                      Bank: {payment.bank_name}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusInfo.label}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground">
                                {payment.potential_matches && payment.potential_matches.length > 0 ? (
                                  <div className="space-y-1">
                                    {payment.potential_matches.slice(0, 2).map((match, index) => (
                                      <div key={index} className="text-xs">
                                        <span className="font-medium">{match.invoice_number}</span>
                                        <span className="text-muted-foreground"> - {match.tenant_name}</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                          match.confidence_score > 80 ? 'bg-green-100 text-green-800' :
                                          match.confidence_score > 60 ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {match.confidence_score}%
                                        </span>
                                      </div>
                                    ))}
                                    {payment.potential_matches.length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{payment.potential_matches.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No matches</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handlePaymentClick(payment)}
                                    className="text-blue-600 hover:text-blue-700"
                                    title="View Details"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleAllocatePayment(payment)}
                                    className="text-green-600 hover:text-green-700"
                                    title="Allocate Payment"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
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
          )}
        </div>

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <h3 className="text-lg font-semibold text-foreground">Payment Details</h3>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Date</label>
                      <div className="text-foreground">{formatDate(selectedPayment.date)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Amount</label>
                      <div className="text-foreground font-medium">{formatCurrency(selectedPayment.amount)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Type</label>
                      <div className="text-foreground">{getTypeInfo(selectedPayment.type).label}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Status</label>
                      <div className="text-foreground">{getStatusInfo(selectedPayment.status).label}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Description</label>
                    <div className="text-foreground">{selectedPayment.description}</div>
                  </div>
                  
                  {selectedPayment.reference && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Reference</label>
                      <div className="text-foreground">{selectedPayment.reference}</div>
                    </div>
                  )}
                  
                  {selectedPayment.bank_name && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">Bank</label>
                      <div className="text-foreground">{selectedPayment.bank_name}</div>
                    </div>
                  )}

                  {selectedPayment.potential_matches && selectedPayment.potential_matches.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Potential Matches</label>
                      <div className="space-y-2">
                        {selectedPayment.potential_matches.map((match, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <div className="font-medium text-foreground">{match.invoice_number}</div>
                              <div className="text-sm text-muted-foreground">{match.tenant_name}</div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              match.confidence_score > 80 ? 'bg-green-100 text-green-800' :
                              match.confidence_score > 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {match.confidence_score}% match
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleAllocatePayment(selectedPayment);
                      setSelectedPayment(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Allocate Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReconciliationDashboard;
