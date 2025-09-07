"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  DocumentTextIcon,
  BanknotesIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  PlusIcon,
  MinusIcon,
  EyeIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CogIcon,
  BoltIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ReceiptRefundIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  ClockIcon as ClockIconSolid,
} from "@heroicons/react/24/outline";
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { leaseAPI } from '@/lib/lease-api';
import { authService } from '@/lib/auth';
import { financeApi, invoiceApi } from '@/lib/api';
import ManualPaymentModal from '@/components/ManualPaymentModal';
import CSVImportModal from '@/components/CSVImportModal';

// Enhanced Lease interface
interface Lease {
  id: number;
  property: {
    id: string;
    property_code: string;
    name: string;
    address: string;
  };
  tenant: {
    id: number;
    tenant_code: string;
    name: string;
    email: string;
  };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  terms: string;
  created_at: string;
  updated_at: string;
  attachments_count: number;
}

// Financial data interfaces
interface LeaseFinancials {
  lease_info: {
    id: number;
    monthly_rent: number;
    deposit_amount: number;
    rental_frequency: string;
    rent_due_day: number;
    late_fee_type: string;
    late_fee_percentage: number;
    late_fee_amount: number;
    grace_period_days: number;
    management_fee: number;
    procurement_fee: number;
  };
  financial_summary: {
    total_invoiced: number;
    total_paid: number;
    total_outstanding: number;
    collection_rate: number;
    tenant_credit_balance: number;
    overdue_invoices_count: number;
    total_overdue_amount: number;
  };
  invoice_history: InvoiceData[];
  payment_summary: PaymentSummary[];
  recurring_charges: RecurringCharge[];
  rent_escalations: RentEscalation[];
  recent_payments: RecentPayment[];
}

interface InvoiceData {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  billing_period_start: string;
  billing_period_end: string;
  is_overdue: boolean;
  days_overdue: number;
  line_items: LineItem[];
  payments: Payment[];
  adjustments: Adjustment[];
}

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Payment {
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
}

interface Adjustment {
  type: string;
  amount: number;
  reason: string;
  effective_date: string;
}

interface PaymentSummary {
  month: string;               // 'YYYY-MM'
  total_payments: number;
  payment_count: number;
  payments: {
    id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string;
    invoice_number: string;
  }[];
}

interface RecurringCharge {
  id: number;
  description: string;
  category: string;
  amount: number;
}

interface RentEscalation {
  id: number;
  previous_rent: number;
  new_rent: number;
  escalation_percentage: number;
  escalation_amount: number;
  effective_date: string;
  reason: string;
}

interface RecentPayment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  invoice_number: string;
}

export default function LeaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<Lease | null>(null);
  const [financials, setFinancials] = useState<LeaseFinancials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'documents' | 'maintenance'>('overview');
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [statement, setStatement] = useState<any | null>(null);
  const [showMonthPayments, setShowMonthPayments] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<PaymentSummary | null>(null);

  useEffect(() => {
    const fetchLeaseDetails = async () => {
      try {
        setLoading(true);
        const data = await leaseAPI.getLease(parseInt(leaseId || '1'));
        setLease(data);
      } catch (error) {
        setError('Failed to fetch lease details');
        console.error('Error fetching lease details:', error);
        toast.error('Failed to load lease details');
      } finally {
        setLoading(false);
      }
    };

    if (leaseId) {
      fetchLeaseDetails();
    }
  }, [leaseId]);

  useEffect(() => {
    if (lease && activeTab === 'financials') {
      fetchLeaseFinancials();
    }
  }, [lease, activeTab]);

  const fetchLeaseFinancials = async () => {
    if (!lease) return;
    setFinancialsLoading(true);
    try {
      const data = await financeApi.getLeaseFinancials(lease.id);
      console.log('Lease financials loaded', { leaseId: lease.id, hasData: !!data });
      setFinancials(data);
    } catch (error: any) {
      console.error('Lease financials error', { leaseId: lease?.id, error });
      const status = error?.response?.status || error?.status || 'unknown';
      toast.error(`Failed to load financial data (${status})`);
      setFinancials(null);
    } finally {
      setFinancialsLoading(false);
    }
  };

  const handleManualPaymentSuccess = async () => {
    setShowManualPayment(false);
    // Always refetch immediately so the top cards reflect the new payment
    await fetchLeaseFinancials();
    toast.success('Payment recorded. Financials updated.');
  };

  const handleCSVSuccess = async () => {
    setShowCSVImport(false);
    // CSV import may allocate multiple payments; refresh summary instantly
    await fetchLeaseFinancials();
    toast.success('CSV processed. Financials updated.');
  };

  const openStatement = async () => {
    if (!lease) return;
    try {
      setShowStatement(true);
      const data = await invoiceApi.getTenantStatement(lease.tenant.id);
      setStatement(data);
    } catch (e: any) {
      toast.error('Failed to load statement');
      setStatement(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('ZAR', 'R');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      case 'terminated': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      case 'sent': return 'bg-blue-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer': return <BanknotesIcon className="h-4 w-4" />;
      case 'credit_card': return <CreditCardIcon className="h-4 w-4" />;
      case 'cash': return <CurrencyDollarIcon className="h-4 w-4" />;
      case 'check': return <DocumentDuplicateIcon className="h-4 w-4" />;
      default: return <BanknotesIcon className="h-4 w-4" />;
    }
  };

  // Invoice actions
  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!lease) return;
    const confirmed = window.confirm('Delete this invoice? This cannot be undone.');
    if (!confirmed) return;

    try {
      await invoiceApi.deleteInvoice(invoiceId);
      toast.success('Invoice deleted');
      await fetchLeaseFinancials();
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to delete invoice';
      toast.error(message);
      console.error('Delete invoice error', err);
    }
  };

  const handleDownloadInvoicePdf = async (invoiceId: number, invoiceNumber?: string) => {
    try {
      const blob = await invoiceApi.generateInvoicePDF(invoiceId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download invoice PDF');
      console.error('Download invoice pdf error', err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Lease Details">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !lease) {
    return (
      <DashboardLayout title="Lease Details">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Lease</h2>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lease) {
    return (
      <DashboardLayout title="Lease Not Found">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Lease not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Lease Details - ${lease.property?.name || 'Unknown Property'}`}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Lease Details</h1>
              <p className="text-muted-foreground">
                {lease.property?.name} • {lease.tenant?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lease.status)}`}>
              {lease.status}
            </span>
            <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/edit`)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Lease
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
          {[
            { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
            { id: 'financials', label: 'Financials', icon: BanknotesIcon },
            { id: 'documents', label: 'Documents', icon: ClipboardDocumentListIcon },
            { id: 'maintenance', label: 'Maintenance', icon: CogIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white/20 text-blue-400"
                  : "text-white/70 hover:text-blue-300"
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Lease Overview</h2>
              
              {/* Property & Tenant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Property Name</label>
                      <p className="text-white font-medium">{lease.property?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Address</label>
                      <p className="text-white font-medium">{lease.property?.address}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Property Code</label>
                      <p className="text-white font-medium">{lease.property?.property_code}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <UserIcon className="h-5 w-5 mr-2" />
                      Tenant Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Tenant Name</label>
                      <p className="text-white font-medium">{lease.tenant?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <p className="text-white font-medium">{lease.tenant?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Tenant Code</label>
                      <p className="text-white font-medium">{lease.tenant?.tenant_code}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lease Terms */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Lease Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm text-muted-foreground">Start Date</label>
                      <p className="text-white font-medium">{formatDate(lease.start_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">End Date</label>
                      <p className="text-white font-medium">{formatDate(lease.end_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <p className="text-white font-medium capitalize">{lease.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <BanknotesIcon className="h-5 w-5 mr-2" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-muted-foreground">Monthly Rent</label>
                      <p className="text-white font-medium text-xl">{formatCurrency(lease.monthly_rent)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Security Deposit</label>
                      <p className="text-white font-medium text-xl">{formatCurrency(lease.deposit_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Financial Management</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowManualPayment(true)}>Record Payment</Button>
                  <Button variant="outline" onClick={() => setShowCSVImport(true)}>Import CSV</Button>
                  <Button variant="outline" onClick={openStatement}>View Statement</Button>
                  <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/invoice/create`)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              </div>

              {financialsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : financials ? (
                <div className="space-y-6">
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/5 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Invoiced</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(financials.financial_summary.total_invoiced)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Paid</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(financials.financial_summary.total_paid)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                          <div>
                            <p className="text-sm text-muted-foreground">Outstanding</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(financials.financial_summary.total_outstanding)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <ArrowTrendingUpIcon className="h-5 w-5 text-yellow-400" />
                          <div>
                            <p className="text-sm text-muted-foreground">Collection Rate</p>
                            <p className="text-xl font-bold text-white">{financials.financial_summary.collection_rate.toFixed(1)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lease Financial Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Lease Financial Terms</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Rent:</span>
                          <span className="text-white font-medium">{formatCurrency(financials.lease_info.monthly_rent)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Security Deposit:</span>
                          <span className="text-white font-medium">{formatCurrency(financials.lease_info.deposit_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rental Frequency:</span>
                          <span className="text-white font-medium">{financials.lease_info.rental_frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rent Due Day:</span>
                          <span className="text-white font-medium">{financials.lease_info.rent_due_day}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Late Fee:</span>
                          <span className="text-white font-medium">
                            {financials.lease_info.late_fee_type === 'percentage' 
                              ? `${financials.lease_info.late_fee_percentage}%` 
                              : formatCurrency(financials.lease_info.late_fee_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Grace Period:</span>
                          <span className="text-white font-medium">{financials.lease_info.grace_period_days} days</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Current Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenant Credit Balance:</span>
                          <span className="text-white font-medium">{formatCurrency(financials.financial_summary.tenant_credit_balance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overdue Invoices:</span>
                          <span className="text-white font-medium">{financials.financial_summary.overdue_invoices_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Overdue Amount:</span>
                          <span className="text-white font-medium">{formatCurrency(financials.financial_summary.total_overdue_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Management Fee:</span>
                          <span className="text-white font-medium">{financials.lease_info.management_fee}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Procurement Fee:</span>
                          <span className="text-white font-medium">{financials.lease_info.procurement_fee}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Invoice History */}
                  <Card className="bg-white/5 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">Invoice History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {financials.invoice_history.length === 0 ? (
                          <div className="text-muted-foreground text-sm">No invoices yet.</div>
                        ) : financials.invoice_history.map((invoice) => (
                          <div key={invoice.id} className="border border-white/10 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-white">{invoice.invoice_number}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(invoice.issue_date)} - {formatDate(invoice.due_date)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getInvoiceStatusColor(invoice.status)}>
                                  {invoice.status}
                                </Badge>
                                {invoice.is_overdue && (
                                  <Badge variant="destructive">
                                    {invoice.days_overdue} days overdue
                                  </Badge>
                                )}
                                {/* Actions */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadInvoicePdf(invoice.id, invoice.invoice_number)}
                                  className="ml-2"
                                  title="Download PDF"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className="ml-1"
                                  title="Delete invoice"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="text-white font-medium">{formatCurrency(invoice.total_amount)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Amount Paid</p>
                                <p className="text-white font-medium">{formatCurrency(invoice.amount_paid)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Balance Due</p>
                                <p className="text-white font-medium">{formatCurrency(invoice.balance_due)}</p>
                              </div>
                            </div>

                            {/* Line Items */}
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-white mb-2">Line Items:</h5>
                              <div className="space-y-1">
                                {invoice.line_items.map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{item.description}</span>
                                    <span className="text-white">{formatCurrency(item.total)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payments */}
                            {invoice.payments.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-sm font-medium text-white mb-2">Payments:</h5>
                                <div className="space-y-1">
                                  {invoice.payments.map((payment, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        {formatDate(payment.payment_date)} - {payment.payment_method}
                                      </span>
                                      <span className="text-white">{formatCurrency(payment.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Adjustments */}
                            {invoice.adjustments.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-white mb-2">Adjustments:</h5>
                                <div className="space-y-1">
                                  {invoice.adjustments.map((adjustment, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        {adjustment.type} - {adjustment.reason}
                                      </span>
                                      <span className={`${adjustment.amount < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {adjustment.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(adjustment.amount))}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Summary and Recent Payments */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Payment Summary by Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {financials.payment_summary.length === 0 ? (
                            <div className="text-muted-foreground text-sm">No payments yet.</div>
                          ) : financials.payment_summary.map((month) => (
                            <button
                              key={month.month}
                              className="w-full flex justify-between items-center text-left hover:bg-white/10 rounded-md p-2 transition-colors"
                              onClick={() => { setSelectedMonth(month); setShowMonthPayments(true); }}
                              title="View payments for this month"
                            >
                              <span className="text-muted-foreground">{formatMonth(month.month)}</span>
                              <div className="text-right">
                                <p className="text-white font-medium">{formatCurrency(month.total_payments)}</p>
                                <p className="text-sm text-muted-foreground">{month.payment_count} payment(s)</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Recent Payments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {financials.recent_payments.length === 0 ? (
                            <div className="text-muted-foreground text-sm">No payments yet.</div>
                          ) : financials.recent_payments.map((payment) => (
                            <div key={payment.id} className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                {getPaymentMethodIcon(payment.payment_method)}
                                <div>
                                  <p className="text-white font-medium">{formatCurrency(payment.amount)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(payment.payment_date)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">{payment.payment_method.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground">{payment.reference_number}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recurring Charges and Rent Escalations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Recurring Charges</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {financials.recurring_charges.map((charge) => (
                            <div key={charge.id} className="flex justify-between items-center">
                              <div>
                                <p className="text-white font-medium">{charge.description}</p>
                                <p className="text-sm text-muted-foreground capitalize">{charge.category}</p>
                              </div>
                              <span className="text-white font-medium">{formatCurrency(charge.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white">Rent Escalation History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {financials.rent_escalations.map((escalation) => (
                            <div key={escalation.id} className="border border-white/10 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-white font-medium">{formatDate(escalation.effective_date)}</span>
                                <span className="text-green-400 font-medium">
                                  +{formatCurrency(escalation.escalation_amount)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">{escalation.reason}</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Previous: {formatCurrency(escalation.previous_rent)}</span>
                                <span className="text-white">New: {formatCurrency(escalation.new_rent)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Failed to load financial data</p>
                  <Button onClick={fetchLeaseFinancials} className="mt-2">
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Documents</h3>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No documents uploaded yet</p>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Maintenance Requests</h3>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              </div>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No maintenance requests</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showManualPayment && (
        <ManualPaymentModal
          isOpen={showManualPayment}
          onClose={() => setShowManualPayment(false)}
          onSuccess={handleManualPaymentSuccess}
          leases={lease ? [lease] : []}
        />
      )}
      {showCSVImport && (
        <CSVImportModal
          isOpen={showCSVImport}
          onClose={() => setShowCSVImport(false)}
          onSuccess={handleCSVSuccess}
        />
      )}

      {/* Statement Modal */}
      {showStatement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card/95 rounded-2xl shadow-2xl border border-border/50 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h3 className="text-xl font-semibold text-foreground">Tenant Statement</h3>
              <button className="p-2" onClick={() => { setShowStatement(false); setStatement(null); }}>Close</button>
            </div>
            <div className="p-6">
              {!statement ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Period: {new Date(statement.statement_period.start_date).toLocaleDateString()} – {new Date(statement.statement_period.end_date).toLocaleDateString()}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2 pr-4">Description</th>
                          <th className="py-2 pr-4">Reference</th>
                          <th className="py-2 pr-4 text-right">Charges</th>
                          <th className="py-2 pr-4 text-right">Payments</th>
                          <th className="py-2 pr-0 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.transactions.map((t: any, idx: number) => (
                          <tr key={idx} className="border-t border-border/50">
                            <td className="py-2 pr-4">{new Date(t.date).toLocaleDateString()}</td>
                            <td className="py-2 pr-4 capitalize">{t.type}</td>
                            <td className="py-2 pr-4">{t.description}</td>
                            <td className="py-2 pr-4">{t.reference}</td>
                            <td className="py-2 pr-4 text-right">{t.charges ? formatCurrency(t.charges) : '-'}</td>
                            <td className="py-2 pr-4 text-right">{t.payments ? formatCurrency(t.payments) : '-'}</td>
                            <td className="py-2 pr-0 text-right">{formatCurrency(t.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Month Payments Modal */}
      {showMonthPayments && selectedMonth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card/95 rounded-2xl shadow-2xl border border-border/50 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h3 className="text-xl font-semibold text-foreground">Payments for {formatMonth(selectedMonth.month)}</h3>
              <button className="p-2" onClick={() => { setShowMonthPayments(false); setSelectedMonth(null); }}>Close</button>
            </div>
            <div className="p-6">
              {(!selectedMonth.payments || selectedMonth.payments.length === 0) ? (
                <div className="text-muted-foreground">No payments found for this month.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Method</th>
                        <th className="py-2 pr-4">Reference</th>
                        <th className="py-2 pr-4">Invoice</th>
                        <th className="py-2 pr-0 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonth.payments.map((p) => (
                        <tr key={p.id} className="border-t border-border/50">
                          <td className="py-2 pr-4">{formatDate(p.payment_date)}</td>
                          <td className="py-2 pr-4 capitalize">{p.payment_method.replace('_', ' ')}</td>
                          <td className="py-2 pr-4">{p.reference_number || '-'}</td>
                          <td className="py-2 pr-4">{p.invoice_number}</td>
                          <td className="py-2 pr-0 text-right">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border/50 text-foreground">
                        <td className="py-2 pr-4" colSpan={4}>Total</td>
                        <td className="py-2 pr-0 text-right">{formatCurrency(selectedMonth.total_payments)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}