'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { financeApi, leaseApi, invoiceApi } from '@/lib/api';
import CSVImportModal from '@/components/CSVImportModal';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import ExpenseAnalytics from '@/components/ExpenseAnalytics';
import { expensesApi, Expense } from '@/lib/api';
import ManualPaymentModal from '@/components/ManualPaymentModal';
import PaymentAllocationModal from '@/components/PaymentAllocationModal';
import AdjustmentModal from '@/components/AdjustmentModal';
import InvoiceSelectionModal from '@/components/InvoiceSelectionModal';
import {
  generateFinancialOverviewPDF,
  generateIncomeReportPDF,
  generateExpenseReportPDF,
  generateLandlordStatementPDF,
  generateSupplierReportPDF,
  generateFinancialOverviewXLSX,
  generateIncomeReportXLSX,
  generateExpenseReportXLSX,
  generateLandlordStatementXLSX,
  generateSupplierReportXLSX
} from '@/utils/exportUtils';
import { 
  BanknotesIcon, 
  CreditCardIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  EnvelopeIcon,
  XMarkIcon,
  PhoneIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Comprehensive income exports
import { generateComprehensiveIncomePDF, generateComprehensiveIncomeXLSX } from '@/utils/exportUtils';

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

interface RentalOutstanding {
  id: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  amount_due: number;
  days_overdue: number;
  last_payment_date: string;
  status: 'current' | 'late' | 'overdue' | 'delinquent';
}

interface Payment {
  id: string;
  type: 'rental' | 'deposit' | 'fee' | 'maintenance';
  tenant_name?: string;
  property_name: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  reference?: string;
}

interface LandlordPayment {
  id: string;
  landlord_name: string;
  property_name: string;
  amount_due: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  rent_collected: number;
  management_fee: number;
  expenses: number;
  contact_email?: string;
  contact_phone?: string;
}

interface SupplierPayment {
  id: string;
  supplier_name: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  category: string;
  invoice_number?: string;
  contact_person?: string;
  contact_phone?: string;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  balance: number;
  reference: string;
  reconciled?: boolean;
}

// =============================
// Incomes Tab Data Structures
// =============================
interface IncomeSummary {
  total_monthly_income: number;
  income_growth: number;
  collection_rate: number;
  average_payment_time_days: number;
}

interface IncomeBySourceItem {
  source: 'rent' | 'recurring' | 'late_fee' | 'management_fee' | 'procurement_fee' | 'deposit' | 'bitcoin' | 'manual' | 'other' | string;
  amount: number;
  percentage: number;
}

interface IncomeByPropertyItem {
  property_id?: string | number;
  property_name: string;
  amount: number;
}

interface IncomeByPaymentMethodItem {
  method: string;
  total: number;
  success_rate: number;
  count: number;
}

interface IncomeTrendPoint {
  month: string;
  total: number;
}

export default function MasterFinancePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'incomes' | 'expenses' | 'commissions' | 'transactions'>('overview');
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [rentalOutstanding, setRentalOutstanding] = useState<RentalOutstanding[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [landlordPayments, setLandlordPayments] = useState<LandlordPayment[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  
  // Payment modal state
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [showPaymentAllocationModal, setShowPaymentAllocationModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showInvoiceSelectionModal, setShowInvoiceSelectionModal] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceForAdjustment, setSelectedInvoiceForAdjustment] = useState<any>(null);
  // Expenses state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Income state
  const [incomeSummary, setIncomeSummary] = useState<IncomeSummary | null>(null);
  const [incomeBySource, setIncomeBySource] = useState<IncomeBySourceItem[]>([]);
  const [incomeByProperty, setIncomeByProperty] = useState<IncomeByPropertyItem[]>([]);
  const [incomeByMethod, setIncomeByMethod] = useState<IncomeByPaymentMethodItem[]>([]);
  const [incomeTrend, setIncomeTrend] = useState<IncomeTrendPoint[]>([]);
  
  // Dropdown state management
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (dropdownId: string) => {
    setActiveDropdown(activeDropdown === dropdownId ? null : dropdownId);
  };

  // Derived computations for incomes
  const computeIncomeDerivedData = (summary: FinancialSummary | null) => {
    try {
      if (!summary) return;
      const computed: IncomeSummary = {
        total_monthly_income: Number(summary.monthly_revenue || 0),
        income_growth: 0,
        collection_rate: Number(summary.collection_rate || 0),
        average_payment_time_days: 0,
      };
      setIncomeSummary(computed);
    } catch (e) {
      // ignore
    }
  };

  const computeIncomeBreakdowns = (payments: Payment[], summary: FinancialSummary | null) => {
    try {
      const totalsBySource: Record<string, number> = {};
      let total = 0;
      (payments || []).forEach(p => {
        const key = (p.type || 'other').toString();
        totalsBySource[key] = (totalsBySource[key] || 0) + (Number(p.amount) || 0);
        total += Number(p.amount) || 0;
      });
      const sourceItems = Object.entries(totalsBySource).map(([k, v]) => ({ source: k, amount: v, percentage: total > 0 ? (v / total) * 100 : 0 })) as IncomeBySourceItem[];
      setIncomeBySource(sourceItems.sort((a, b) => b.amount - a.amount));

      const totalsByProperty: Record<string, number> = {};
      (payments || []).forEach(p => {
        const name = p.property_name || 'Unassigned';
        totalsByProperty[name] = (totalsByProperty[name] || 0) + (Number(p.amount) || 0);
      });
      const propertyItems = Object.entries(totalsByProperty).map(([name, amt]) => ({ property_name: name, amount: amt })) as IncomeByPropertyItem[];
      setIncomeByProperty(propertyItems.sort((a, b) => b.amount - a.amount).slice(0, 12));

      const methodTotals: Record<string, { total: number; count: number; success: number }> = {};
      (payments || []).forEach(p => {
        const method = p.payment_method || 'other';
        if (!methodTotals[method]) methodTotals[method] = { total: 0, count: 0, success: 0 };
        methodTotals[method].total += Number(p.amount) || 0;
        methodTotals[method].count += 1;
        if (p.status === 'completed') methodTotals[method].success += 1;
      });
      const methodItems = Object.entries(methodTotals).map(([m, v]) => ({ method: m, total: v.total, count: v.count, success_rate: v.count > 0 ? (v.success / v.count) * 100 : 0 })) as IncomeByPaymentMethodItem[];
      setIncomeByMethod(methodItems.sort((a, b) => b.total - a.total));

      const trendTotals: Record<string, number> = {};
      (payments || []).forEach(p => {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        trendTotals[key] = (trendTotals[key] || 0) + (Number(p.amount) || 0);
      });
      const trendPoints = Object.entries(trendTotals).map(([month, value]) => ({ month, total: value })) as IncomeTrendPoint[];
      trendPoints.sort((a, b) => a.month.localeCompare(b.month));
      setIncomeTrend(trendPoints.slice(-12));
    } catch (e) {
      // ignore
    }
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Refresh financial data
  const refreshFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch financial summary
      const summary = await financeApi.getFinancialSummary();
      setFinancialSummary(summary);
      computeIncomeDerivedData(summary);
      
      // Fetch rental outstanding
      const outstanding = await financeApi.getRentalOutstanding();
      setRentalOutstanding(Array.isArray(outstanding) ? outstanding : []);
      
      // Fetch recent payments
      const payments = await financeApi.getPayments();
      setRecentPayments(Array.isArray(payments) ? payments : []);
      computeIncomeBreakdowns(Array.isArray(payments) ? payments : [], summary);
      
      // Fetch landlord payments
      const landlordPayments = await financeApi.getLandlordPayments();
      setLandlordPayments(Array.isArray(landlordPayments) ? landlordPayments : []);
      
      // Fetch supplier payments
      const supplierPayments = await financeApi.getSupplierPayments();
      setSupplierPayments(Array.isArray(supplierPayments) ? supplierPayments : []);
      
      // Fetch bank transactions
      const transactions = await financeApi.getBankTransactions();
      setBankTransactions(Array.isArray(transactions) ? transactions : []);
      
      // Fetch leases for payment modals
      try {
        const leasesResponse = await leaseApi.getLeases({ page_size: 1000 }); // Fetch up to 1000 leases
        console.log('Leases response:', leasesResponse);
        console.log('Leases results:', leasesResponse.results);
        setLeases(Array.isArray(leasesResponse.results) ? leasesResponse.results : []);
        console.log('Leases set to state:', Array.isArray(leasesResponse.results) ? leasesResponse.results : []);
      } catch (error) {
        console.warn('Failed to fetch leases:', error);
        setLeases([]);
      }
      
      // Fetch invoices for adjustment modal
      try {
        const invoicesData = await invoiceApi.getInvoices();
        // Handle both paginated and non-paginated responses safely
        const extractedInvoices = Array.isArray((invoicesData as any)?.results)
          ? (invoicesData as any).results
          : (Array.isArray(invoicesData) ? (invoicesData as any) : []);
        setInvoices(extractedInvoices);
      } catch (error) {
        console.warn('Failed to fetch invoices:', error);
        setInvoices([]);
      }
      
    } catch (error) {
      console.error('Error fetching financial data:', error);
      setError('Failed to load financial data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adjustment creation
  const handleCreateAdjustment = () => {
    if (invoices.length === 0) {
      setError('No invoices available for adjustment. Please create some invoices first.');
      return;
    }
    setShowInvoiceSelectionModal(true);
  };

  // Handle invoice selection for adjustment
  const handleInvoiceSelectedForAdjustment = (invoice: any) => {
    setSelectedInvoiceForAdjustment(invoice);
    setShowInvoiceSelectionModal(false);
    setShowAdjustmentModal(true);
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
          
          // Fetch rental outstanding
          const outstanding = await financeApi.getRentalOutstanding();
          setRentalOutstanding(Array.isArray(outstanding) ? outstanding : []);
          
          // Fetch recent payments
          const payments = await financeApi.getPayments();
          setRecentPayments(Array.isArray(payments) ? payments : []);
          
          // Fetch landlord payments
          const landlordPayments = await financeApi.getLandlordPayments();
          setLandlordPayments(Array.isArray(landlordPayments) ? landlordPayments : []);
          
          // Fetch supplier payments
          const supplierPayments = await financeApi.getSupplierPayments();
          setSupplierPayments(Array.isArray(supplierPayments) ? supplierPayments : []);
          
          // Fetch bank transactions
          const transactions = await financeApi.getBankTransactions();
          setBankTransactions(Array.isArray(transactions) ? transactions : []);

          // Prefetch leases so payment modal has data on first open
          try {
            const leasesResponse = await leaseApi.getLeases({ page_size: 1000 });
            setLeases(Array.isArray(leasesResponse.results) ? leasesResponse.results : []);
          } catch (prefetchError) {
            console.warn('Failed to prefetch leases during initial load:', prefetchError);
            setLeases([]);
          }
          
          // Prefetch invoices so adjustment modal has data on first open
          try {
            const invoicesData = await invoiceApi.getInvoices();
            const extractedInvoices = Array.isArray((invoicesData as any)?.results)
              ? (invoicesData as any).results
              : (Array.isArray(invoicesData) ? (invoicesData as any) : []);
            setInvoices(extractedInvoices);
          } catch (prefetchError) {
            console.warn('Failed to prefetch invoices during initial load:', prefetchError);
            setInvoices([]);
          }
          
        } catch (error) {
          console.error('Error fetching financial data:', error);
          setError('Failed to load financial data. Please check your connection and try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFinancialData();

    // Add click outside listener for page dropdowns only (not sidebar)
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        const target = event.target as Element;
        // Only close if clicking outside page dropdowns, not sidebar
        if (!target.closest('.page-dropdown-container') && !target.closest('[data-sidebar]')) {
          closeDropdown();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated, activeDropdown]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'current': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
      case 'overdue':
      case 'delinquent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid': return CheckCircleIcon;
      case 'pending': return ClockIcon;
      case 'failed':
      case 'overdue':
      case 'delinquent': return ExclamationTriangleIcon;
      default: return ClockIcon;
    }
  };

  // Export functions
  const handleExportOverviewPDF = () => {
    if (financialSummary) {
      generateFinancialOverviewPDF(financialSummary, rentalOutstanding, recentPayments);
    } else {
      alert('Financial data is not available. Please refresh the page and try again.');
    }
  };

  const handleExportOverviewXLSX = () => {
    if (financialSummary) {
      generateFinancialOverviewXLSX(financialSummary, rentalOutstanding, recentPayments);
    } else {
      alert('Financial data is not available. Please refresh the page and try again.');
    }
  };

  const handleExportIncomePDF = () => {
    generateComprehensiveIncomePDF(
      {
        total_monthly_income: incomeSummary?.total_monthly_income || 0,
        income_growth: incomeSummary?.income_growth || 0,
        collection_rate: incomeSummary?.collection_rate || 0,
        average_payment_time_days: incomeSummary?.average_payment_time_days || 0,
      },
      incomeBySource.map(s => ({ source: s.source, amount: s.amount, percentage: s.percentage })),
      incomeByProperty.map(p => ({ property_name: p.property_name, amount: p.amount })),
      incomeByMethod.map(m => ({ method: m.method, total: m.total, success_rate: m.success_rate, count: m.count })),
      incomeTrend.map(t => ({ month: t.month, total: t.total })),
      recentPayments,
      rentalOutstanding
    );
  };

  const handleExportIncomeXLSX = () => {
    generateComprehensiveIncomeXLSX(
      {
        total_monthly_income: incomeSummary?.total_monthly_income || 0,
        income_growth: incomeSummary?.income_growth || 0,
        collection_rate: incomeSummary?.collection_rate || 0,
        average_payment_time_days: incomeSummary?.average_payment_time_days || 0,
      },
      incomeBySource.map(s => ({ source: s.source, amount: s.amount, percentage: s.percentage })),
      incomeByProperty.map(p => ({ property_name: p.property_name, amount: p.amount })),
      incomeByMethod.map(m => ({ method: m.method, total: m.total, success_rate: m.success_rate, count: m.count })),
      incomeTrend.map(t => ({ month: t.month, total: t.total })),
      recentPayments,
      rentalOutstanding
    );
  };

  const handleExportExpensesPDF = () => {
    generateExpenseReportPDF(recentPayments);
  };

  const handleExportExpensesXLSX = () => {
    generateExpenseReportXLSX(recentPayments);
  };

  const handleExportCommissionsPDF = () => {
    generateLandlordStatementPDF(landlordPayments);
  };

  const handleExportCommissionsXLSX = () => {
    generateLandlordStatementXLSX(landlordPayments);
  };

  const handleExportTransactionsPDF = () => {
    generateSupplierReportPDF(supplierPayments);
  };

  const handleExportTransactionsXLSX = () => {
    generateSupplierReportXLSX(supplierPayments);
  };

  // Modal functions
  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
  };

  // Authentication check
  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Master Finance">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Master Finance">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Master Finance">
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

        {/* Tab Navigation */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="flex space-x-1 p-1">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'incomes', label: 'Incomes', icon: BuildingOfficeIcon },
              { key: 'expenses', label: 'Expenses', icon: CreditCardIcon },
              { key: 'commissions', label: 'Commissions', icon: UserGroupIcon },
              { key: 'transactions', label: 'Transactions', icon: TruckIcon }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-medium text-sm hidden sm:inline">{tab.label}</span>
                <span className="font-medium text-sm sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(financialSummary?.monthly_revenue || 0)}
                    </p>
                    <p className="text-sm text-green-400 flex items-center">
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      +8.2% from last month
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
                    <p className="text-sm font-medium text-muted-foreground">Outstanding Rent</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(financialSummary?.total_outstanding || 0)}
                    </p>
                    <p className="text-sm text-red-400 flex items-center">
                      <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      {rentalOutstanding.length} tenants
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
                    <p className="text-sm text-blue-400">
                      Target: 95%
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
                    <p className="text-sm text-purple-400">
                      Net positive
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Quick Actions</h3>
                <button 
                  onClick={refreshFinancialData}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button 
                  onClick={async () => {
                    // Prefetch leases so search has data immediately
                    try {
                      if (!Array.isArray(leases) || leases.length === 0) {
                        const leasesResponse = await leaseApi.getLeases({ page_size: 1000 });
                        setLeases(Array.isArray(leasesResponse.results) ? leasesResponse.results : []);
                      }
                    } catch (error) {
                      console.warn('Failed to prefetch leases before opening Record Payment modal:', error);
                      setLeases([]);
                    }
                    setShowManualPaymentModal(true);
                  }}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <PlusIcon className="h-8 w-8 text-blue-400 mb-2" />
                  <span className="text-sm text-foreground">Record Payment</span>
                </button>
                <button 
                  onClick={handleCreateAdjustment}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <DocumentTextIcon className="h-8 w-8 text-green-400 mb-2" />
                  <span className="text-sm text-foreground">Create Adjustment</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => toggleDropdown('overview-export')}
                    className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors w-full"
                  >
                    <ArrowDownTrayIcon className="h-8 w-8 text-purple-400 mb-2" />
                    <span className="text-sm text-foreground">Export Report</span>
                  </button>
                  {activeDropdown === 'overview-export' && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50">
                      <button 
                        onClick={() => {
                          handleExportOverviewPDF();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-t-lg"
                      >
                        📄 Export PDF
                      </button>
                      <button 
                        onClick={() => {
                          handleExportOverviewXLSX();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-b-lg"
                      >
                        📊 Export Excel
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setShowCSVImportModal(true)}
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
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Deposits & Payments</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Deposits Held</span>
                    <span className="text-foreground font-medium">
                      {formatCurrency(financialSummary?.deposits_held || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Due to Landlords</span>
                    <span className="text-orange-400 font-medium">
                      {formatCurrency(financialSummary?.payments_due_landlords || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Due to Suppliers</span>
                    <span className="text-red-400 font-medium">
                      {formatCurrency(financialSummary?.payments_due_suppliers || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Monthly P&L Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(financialSummary?.monthly_revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Expenses</span>
                    <span className="text-red-400 font-medium">
                      -{formatCurrency(financialSummary?.monthly_expenses || 0)}
                    </span>
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Net Profit</span>
                      <span className="text-green-400 font-bold text-lg">
                        {formatCurrency(financialSummary?.net_profit || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">Recent Payments</h3>
                  <button 
                    onClick={() => setActiveTab('expenses')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {(recentPayments || []).slice(0, 5).map((payment) => {
                    const StatusIcon = getStatusIcon(payment.status);
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{payment.tenant_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.property_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">Outstanding Rent</h3>
                  <button 
                    onClick={() => setActiveTab('incomes')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {(rentalOutstanding || []).slice(0, 5).map((rental) => (
                    <div key={rental.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{rental.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{rental.property_name} - {rental.unit_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{formatCurrency(rental.amount_due)}</p>
                        <p className="text-xs text-red-400">{rental.days_overdue} days overdue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incomes Tab */}
        {activeTab === 'incomes' && (
          <div className="space-y-6">
            {/* Filters and Export */}
            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Date Start</label>
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Date End</label>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Property</label>
                    <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm">
                      <option value="all">All</option>
                      {incomeByProperty.map((p) => (
                        <option key={p.property_name} value={p.property_name}>{p.property_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Source</label>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm">
                      <option value="all">All</option>
                      {incomeBySource.map((s) => (
                        <option key={s.source} value={s.source}>{s.source}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExportIncomePDF} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Export PDF</button>
                  <button onClick={handleExportIncomeXLSX} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm">Export Excel</button>
                </div>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Total Monthly Income</p>
                    <p className="text-2xl font-bold">{formatCurrency(incomeSummary?.total_monthly_income || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-blue-400" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Income Growth</p>
                    <p className="text-2xl font-bold">{(incomeSummary?.income_growth || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-indigo-400" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Collection Rate</p>
                    <p className="text-2xl font-bold">{(incomeSummary?.collection_rate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-yellow-400" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Avg Payment Time</p>
                    <p className="text-2xl font-bold">{(incomeSummary?.average_payment_time_days || 0).toFixed(1)} days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Income Trend list fallback */}
            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Income Trend (Last 12 months)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {incomeTrend.map(t => (
                  <div key={t.month} className="p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">{t.month}</p>
                    <p className="text-sm font-medium">{formatCurrency(t.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Income by Source</h3>
                <div className="space-y-3">
                  {incomeBySource.map((s) => (
                    <div key={s.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-sm capitalize">{s.source.toString().replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(s.amount)}</p>
                        <p className="text-xs text-muted-foreground">{s.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Top Properties</h3>
                <div className="space-y-3">
                  {incomeByProperty.map((p) => (
                    <div key={p.property_name} className="flex items-center justify-between">
                      <span className="text-sm">{p.property_name}</span>
                      <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Methods and Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  {incomeByMethod.map((m) => (
                    <div key={m.method} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{m.method.replace('_', ' ')}</span>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(m.total)}</p>
                        <p className="text-xs text-muted-foreground">{m.success_rate.toFixed(0)}% success • {m.count} tx</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Recent Income</h3>
                <div className="space-y-3">
                  {recentPayments.filter(p => (propertyFilter==='all' || p.property_name===propertyFilter) && (sourceFilter==='all' || p.type===sourceFilter)).slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{p.tenant_name || p.property_name}</p>
                        <p className="text-xs text-muted-foreground">{p.property_name} • {p.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Outstanding */}
            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Outstanding Income</h3>
                <span className="text-sm text-muted-foreground">{rentalOutstanding.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-4">Tenant</th>
                      <th className="py-2 pr-4">Property</th>
                      <th className="py-2 pr-4">Unit</th>
                      <th className="py-2 pr-4">Amount Due</th>
                      <th className="py-2 pr-4">Days Overdue</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentalOutstanding.map((r) => (
                      <tr key={r.id} className="border-t border-border/60">
                        <td className="py-2 pr-4">{r.tenant_name}</td>
                        <td className="py-2 pr-4">{r.property_name}</td>
                        <td className="py-2 pr-4">{r.unit_number}</td>
                        <td className="py-2 pr-4">{formatCurrency(r.amount_due)}</td>
                        <td className="py-2 pr-4 text-red-400">{r.days_overdue}</td>
                        <td className="py-2 pr-4 capitalize">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== 'overview' && activeTab !== 'incomes' && (
          <div className="space-y-6">
            {activeTab === 'expenses' ? (
              <>
                {/* Actions */}
                <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">Expenses</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Add Expense</button>
                      <div className="relative page-dropdown-container">
                        <button onClick={() => toggleDropdown('expenses-export')} className="px-3 py-2 bg-muted text-foreground border border-border rounded-md text-sm">Export</button>
                        {activeDropdown === 'expenses-export' && (
                          <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
                            <button onClick={() => { handleExportExpensesPDF(); closeDropdown(); }} className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-t-lg">📄 Export PDF</button>
                            <button onClick={() => { handleExportExpensesXLSX(); closeDropdown(); }} className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-b-lg">📊 Export Excel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <ExpenseAnalytics />

                {/* List */}
                <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                  <ExpenseList onEdit={(exp) => { setEditingExpense(exp); setShowExpenseModal(true); }} />
                </div>
              </>
            ) : (
              <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab</h3>
                <p className="text-muted-foreground">This tab content will be implemented based on your requirements.</p>
              </div>
            )}
          </div>
        )}

        {/* Payment Modals */}
        <CSVImportModal
          isOpen={showCSVImportModal}
          onClose={() => setShowCSVImportModal(false)}
          onSuccess={() => {
            setShowCSVImportModal(false);
            refreshFinancialData();
          }}
        />

        <ManualPaymentModal
          isOpen={showManualPaymentModal}
          onClose={() => setShowManualPaymentModal(false)}
          onSuccess={() => {
            setShowManualPaymentModal(false);
            refreshFinancialData();
          }}
          leases={leases}
        />

        <PaymentAllocationModal
          isOpen={showPaymentAllocationModal}
          onClose={() => setShowPaymentAllocationModal(false)}
          onSuccess={() => {
            setShowPaymentAllocationModal(false);
            refreshFinancialData();
          }}
          paymentId={undefined}
          bankTransactionId={undefined}
          paymentType="manual"
          paymentAmount={0}
          invoices={[]}
        />

        <AdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => setShowAdjustmentModal(false)}
          onSuccess={() => {
            setShowAdjustmentModal(false);
            refreshFinancialData();
          }}
          invoice={selectedInvoiceForAdjustment}
        />

        <InvoiceSelectionModal
          isOpen={showInvoiceSelectionModal}
          onClose={() => setShowInvoiceSelectionModal(false)}
          onInvoiceSelect={handleInvoiceSelectedForAdjustment}
          invoices={invoices}
        />

        {/* Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card/90 backdrop-blur-lg border border-border rounded-lg p-6 w-full max-w-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
                <button onClick={() => setShowExpenseModal(false)} className="text-muted-foreground hover:text-foreground">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <ExpenseForm
                expense={editingExpense}
                onClose={() => setShowExpenseModal(false)}
                onSaved={() => { setShowExpenseModal(false); /* refresh list by toggling tab */ setActiveTab('incomes'); setActiveTab('expenses'); }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 