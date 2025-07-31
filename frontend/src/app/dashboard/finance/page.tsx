'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { financeApi } from '@/lib/api';
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

export default function FinancePage() {
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
  
  // Dropdown state management
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (dropdownId: string) => {
    setActiveDropdown(activeDropdown === dropdownId ? null : dropdownId);
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
      
    } catch (error) {
      console.error('Error refreshing financial data:', error);
      alert('Failed to refresh financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mock data
  const mockFinancialSummary: FinancialSummary = {
    total_rental_income: 125000,
    total_outstanding: 8500,
    collection_rate: 94.2,
    deposits_held: 45000,
    payments_due_landlords: 89500,
    payments_due_suppliers: 12300,
    monthly_revenue: 125000,
    monthly_expenses: 23500,
    net_profit: 101500,
    cash_flow: 78200
  };

  const mockRentalOutstanding: RentalOutstanding[] = [
    {
      id: '1',
      tenant_name: 'Sarah Johnson',
      property_name: 'Sunrise Apartments',
      unit_number: '2A',
      amount_due: 2500,
      days_overdue: 15,
      last_payment_date: '2023-12-15',
      status: 'overdue'
    },
    {
      id: '2',
      tenant_name: 'Mike Chen',
      property_name: 'Metropolitan Heights',
      unit_number: '5C',
      amount_due: 1800,
      days_overdue: 5,
      last_payment_date: '2024-01-10',
      status: 'late'
    },
    {
      id: '3',
      tenant_name: 'Emily Davis',
      property_name: 'Garden View Complex',
      unit_number: '8A',
      amount_due: 2200,
      days_overdue: 45,
      last_payment_date: '2023-11-30',
      status: 'delinquent'
    },
    {
      id: '4',
      tenant_name: 'Robert Wilson',
      property_name: 'Sunrise Apartments',
      unit_number: '12B',
      amount_due: 2000,
      days_overdue: 3,
      last_payment_date: '2024-01-12',
      status: 'late'
    }
  ];

  const mockRecentPayments: Payment[] = [
    {
      id: '1',
      type: 'rental',
      tenant_name: 'John Smith',
      property_name: 'Sunrise Apartments',
      amount: 2500,
      date: '2024-01-15',
      status: 'completed',
      payment_method: 'Bank Transfer',
      reference: 'BT240115001'
    },
    {
      id: '2',
      type: 'deposit',
      tenant_name: 'Lisa Brown',
      property_name: 'Metropolitan Heights',
      amount: 3000,
      date: '2024-01-14',
      status: 'completed',
      payment_method: 'Check',
      reference: 'CH240114001'
    },
    {
      id: '3',
      type: 'rental',
      tenant_name: 'David Wilson',
      property_name: 'Garden View Complex',
      amount: 1800,
      date: '2024-01-13',
      status: 'pending',
      payment_method: 'Credit Card',
      reference: 'CC240113001'
    },
    {
      id: '4',
      type: 'maintenance',
      tenant_name: 'Amy Taylor',
      property_name: 'Pine View Towers',
      amount: 450,
      date: '2024-01-12',
      status: 'completed',
      payment_method: 'Cash',
      reference: 'CA240112001'
    }
  ];

  const mockLandlordPayments: LandlordPayment[] = [
    {
      id: '1',
      landlord_name: 'Johnson Property Group',
      property_name: 'Sunrise Apartments',
      amount_due: 42500,
      due_date: '2024-01-31',
      status: 'pending',
      rent_collected: 50000,
      management_fee: 5000,
      expenses: 2500,
      contact_email: 'robert.johnson@email.com',
      contact_phone: '(555) 111-2222'
    },
    {
      id: '2',
      landlord_name: 'Metropolitan Investments',
      property_name: 'Metropolitan Heights',
      amount_due: 35000,
      due_date: '2024-01-28',
      status: 'pending',
      rent_collected: 42000,
      management_fee: 4200,
      expenses: 2800,
      contact_email: 'maria.garcia@email.com',
      contact_phone: '(555) 222-3333'
    },
    {
      id: '3',
      landlord_name: 'Garden View LLC',
      property_name: 'Garden View Complex',
      amount_due: 12000,
      due_date: '2024-01-25',
      status: 'overdue',
      rent_collected: 15000,
      management_fee: 1500,
      expenses: 1500,
      contact_email: 'james.wilson@email.com',
      contact_phone: '(555) 333-4444'
    }
  ];

  const mockSupplierPayments: SupplierPayment[] = [
    {
      id: '1',
      supplier_name: 'AquaFix Plumbing',
      description: 'Kitchen faucet repair - Unit 2A',
      amount: 350,
      due_date: '2024-01-20',
      status: 'pending',
      category: 'Maintenance',
      invoice_number: 'INV-2024-001',
      contact_person: 'John ABC',
      contact_phone: '(555) 777-8888'
    },
    {
      id: '2',
      supplier_name: 'CoolAir HVAC Services',
      description: 'HVAC maintenance - Building A',
      amount: 1200,
      due_date: '2024-01-18',
      status: 'overdue',
      category: 'Maintenance',
      invoice_number: 'INV-2024-002',
      contact_person: 'Mike Green',
      contact_phone: '(555) 888-9999'
    },
    {
      id: '3',
      supplier_name: 'GreenThumb Landscaping',
      description: 'Monthly landscaping services',
      amount: 800,
      due_date: '2024-01-30',
      status: 'pending',
      category: 'Landscaping',
      invoice_number: 'INV-2024-003',
      contact_person: 'Sarah Elite',
      contact_phone: '(555) 999-0000'
    }
  ];

  const mockBankTransactions: BankTransaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'Rent Payment - John Smith',
      amount: 2500,
      type: 'credit',
      category: 'Rental Income',
      balance: 125300,
      reference: 'TXN240115001',
      reconciled: true
    },
    {
      id: '2',
      date: '2024-01-14',
      description: 'Maintenance Payment - AquaFix',
      amount: -350,
      type: 'debit',
      category: 'Maintenance',
      balance: 122800,
      reference: 'TXN240114001',
      reconciled: true
    },
    {
      id: '3',
      date: '2024-01-13',
      description: 'Security Deposit - Lisa Brown',
      amount: 3000,
      type: 'credit',
      category: 'Deposits',
      balance: 123150,
      reference: 'TXN240113001',
      reconciled: false
    },
    {
      id: '4',
      date: '2024-01-12',
      description: 'Landlord Payment - Johnson Group',
      amount: -42500,
      type: 'debit',
      category: 'Landlord Payments',
      balance: 120150,
      reference: 'TXN240112001',
      reconciled: true
    }
  ];

  // Initialize data
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (isAuthenticated) {
        try {
          setLoading(true);
          
          // Fetch financial summary
          const summary = await financeApi.getFinancialSummary();
          console.log('Financial summary API response:', summary);
          setFinancialSummary(summary);
          
          // Fetch rental outstanding
          const outstanding = await financeApi.getRentalOutstanding();
          setRentalOutstanding(Array.isArray(outstanding) ? outstanding : []);
          
          // Fetch recent payments
          const payments = await financeApi.getPayments();
          console.log('Payments API response:', payments);
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
          
        } catch (error) {
          console.error('Error fetching financial data:', error);
          setError('Failed to load financial data. Using mock data as fallback.');
          // Fallback to mock data if API fails
          setFinancialSummary(mockFinancialSummary);
          setRentalOutstanding(mockRentalOutstanding);
          setRecentPayments(mockRecentPayments);
          setLandlordPayments(mockLandlordPayments);
          setSupplierPayments(mockSupplierPayments);
          setBankTransactions(mockBankTransactions);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFinancialData();
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  // Export functions with debugging
  const handleExportOverviewPDF = () => {
    console.log('handleExportOverviewPDF called');
    console.log('financialSummary:', financialSummary);
    console.log('rentalOutstanding:', rentalOutstanding);
    console.log('recentPayments:', recentPayments);
    
    if (financialSummary) {
      generateFinancialOverviewPDF(financialSummary, rentalOutstanding, recentPayments);
    } else {
      console.error('Financial summary is null or undefined');
      alert('Financial data is not available. Please refresh the page and try again.');
    }
  };

  const handleExportOverviewXLSX = () => {
    console.log('handleExportOverviewXLSX called');
    if (financialSummary) {
      generateFinancialOverviewXLSX(financialSummary, rentalOutstanding, recentPayments);
    } else {
      console.error('Financial summary is null or undefined');
      alert('Financial data is not available. Please refresh the page and try again.');
    }
  };

  const handleExportIncomePDF = () => {
    console.log('handleExportIncomePDF called');
    console.log('rentalOutstanding:', rentalOutstanding);
    generateIncomeReportPDF(rentalOutstanding);
  };

  const handleExportIncomeXLSX = () => {
    console.log('handleExportIncomeXLSX called');
    generateIncomeReportXLSX(rentalOutstanding);
  };

  const handleExportExpensesPDF = () => {
    console.log('handleExportExpensesPDF called');
    console.log('recentPayments:', recentPayments);
    generateExpenseReportPDF(recentPayments);
  };

  const handleExportExpensesXLSX = () => {
    console.log('handleExportExpensesXLSX called');
    generateExpenseReportXLSX(recentPayments);
  };

  const handleExportCommissionsPDF = () => {
    console.log('handleExportCommissionsPDF called');
    console.log('landlordPayments:', landlordPayments);
    generateLandlordStatementPDF(landlordPayments);
  };

  const handleExportCommissionsXLSX = () => {
    console.log('handleExportCommissionsXLSX called');
    generateLandlordStatementXLSX(landlordPayments);
  };

  const handleExportTransactionsPDF = () => {
    console.log('handleExportTransactionsPDF called');
    console.log('supplierPayments:', supplierPayments);
    generateSupplierReportPDF(supplierPayments);
  };

  const handleExportTransactionsXLSX = () => {
    console.log('handleExportTransactionsXLSX called');
    generateSupplierReportXLSX(supplierPayments);
  };

  // Test function to verify PDF functionality
  const testPDFGeneration = () => {
    console.log('Testing basic PDF generation...');
    try {
      const doc = new (require('jspdf').default)();
      doc.text('Test PDF Generation', 20, 20);
      doc.text('If you see this PDF, the library is working correctly!', 20, 40);
      doc.save('test-pdf.pdf');
      console.log('Test PDF generated successfully!');
      alert('Test PDF generated! Check your downloads folder.');
    } catch (error) {
      console.error('Test PDF generation failed:', error);
      alert('PDF generation test failed: ' + (error instanceof Error ? error.message : String(error)));
    }
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
      <DashboardLayout title="Financial Management">
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
              
              {/* Debug Test Button */}
              <div className="mb-4">
                <button 
                  onClick={testPDFGeneration}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  🧪 Test PDF Generation
                </button>
                <span className="ml-2 text-xs text-muted-foreground">(Debug - Remove after testing)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => openModal('recordPayment')}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <PlusIcon className="h-8 w-8 text-blue-400 mb-2" />
                  <span className="text-sm text-foreground">Record Payment</span>
                </button>
                <button 
                  onClick={() => openModal('generateInvoice')}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <DocumentTextIcon className="h-8 w-8 text-green-400 mb-2" />
                  <span className="text-sm text-foreground">Generate Invoice</span>
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
                <button className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <ArrowUpTrayIcon className="h-8 w-8 text-orange-400 mb-2" />
                  <span className="text-sm text-foreground">Import Transactions</span>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Incomes</h3>
                <p className="text-muted-foreground">Manage rental income and revenue tracking</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openModal('recordPayment')}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Record Payment</span>
                </button>
                <button 
                  onClick={() => openModal('generateInvoice')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Generate Invoice</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => toggleDropdown('income-export')}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    <span>Export</span>
                  </button>
                  {activeDropdown === 'income-export' && (
                    <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
                      <button 
                        onClick={() => {
                          handleExportIncomePDF();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-t-lg"
                      >
                        📄 Export PDF
                      </button>
                      <button 
                        onClick={() => {
                          handleExportIncomeXLSX();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-b-lg"
                      >
                        📊 Export Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tenants or properties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="overdue">Overdue</option>
                  <option value="late">Late</option>
                  <option value="current">Current</option>
                </select>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h4 className="text-lg font-semibold text-foreground">Outstanding Rentals</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount Due</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Days Overdue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rentalOutstanding.map((rental) => (
                      <tr key={rental.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-foreground font-medium">{rental.tenant_name}</div>
                          <div className="text-muted-foreground text-sm">Last payment: {formatDate(rental.last_payment_date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-muted-foreground">{rental.property_name}</div>
                          <div className="text-muted-foreground text-sm">Unit {rental.unit_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-red-400 font-semibold">
                          {formatCurrency(rental.amount_due)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rental.days_overdue > 30 ? 'bg-red-600 text-white' : 
                            rental.days_overdue > 15 ? 'bg-orange-600 text-white' : 
                            rental.days_overdue > 5 ? 'bg-yellow-600 text-white' : 
                            'bg-green-600 text-white'
                          }`}>
                            {rental.days_overdue} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(rental.status)}`}>
                            {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('recordPayment', rental)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Record Payment"
                            >
                              <CreditCardIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => openModal('sendReminder', rental)}
                              className="text-yellow-400 hover:text-yellow-300"
                              title="Send Reminder"
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => openModal('viewDetails', rental)}
                              className="text-green-400 hover:text-green-300"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Monthly Rent Roll</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Total Units</p>
                  <p className="text-2xl font-bold text-white">45</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Occupied</p>
                  <p className="text-2xl font-bold text-green-400">42</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Monthly Rent</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(125000)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Collection Rate</p>
                  <p className="text-2xl font-bold text-green-400">94.2%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Expenses</h3>
                <p className="text-muted-foreground">Track and manage all expenses and costs</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openModal('recordPayment')}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Record Payment</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => toggleDropdown('expenses-export')}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    <span>Export</span>
                  </button>
                  {activeDropdown === 'expenses-export' && (
                    <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
                      <button 
                        onClick={() => {
                          handleExportExpensesPDF();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-t-lg"
                      >
                        📄 Export PDF
                      </button>
                      <button 
                        onClick={() => {
                          handleExportExpensesXLSX();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-b-lg"
                      >
                        📊 Export Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h4 className="text-lg font-semibold text-white">Recent Payments</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {recentPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {formatDate(payment.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                          {payment.tenant_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {payment.property_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-400 font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {payment.payment_method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('viewDetails', payment)}
                              className="text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button className="text-green-400 hover:text-green-300" title="Print Receipt">
                              <PrinterIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Landlords Tab */}
        {activeTab === 'commissions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Commissions</h3>
                <p className="text-muted-foreground">Manage commission payments and fees</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openModal('processPayment')}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Process Payment</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => toggleDropdown('commissions-export')}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span>Generate Statement</span>
                  </button>
                  {activeDropdown === 'commissions-export' && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                      <button 
                        onClick={() => {
                          handleExportCommissionsPDF();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-t-lg"
                      >
                        📄 Generate PDF Statement
                      </button>
                      <button 
                        onClick={() => {
                          handleExportCommissionsXLSX();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-b-lg"
                      >
                        📊 Generate Excel Statement
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h4 className="text-lg font-semibold text-white">Pending Landlord Payments</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Landlord</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rent Collected</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fees & Expenses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount Due</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {landlordPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-white font-medium">{payment.landlord_name}</div>
                          <div className="text-muted-foreground text-sm">{payment.contact_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {payment.property_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-400 font-semibold">
                          {formatCurrency(payment.rent_collected)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-muted-foreground text-sm">
                            <div>Management: {formatCurrency(payment.management_fee)}</div>
                            <div>Expenses: {formatCurrency(payment.expenses)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-400 font-semibold">
                          {formatCurrency(payment.amount_due)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('processPayment', payment)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Process Payment"
                            >
                              <CreditCardIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => openModal('viewDetails', payment)}
                              className="text-green-400 hover:text-green-300"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <div className="relative">
                              <button 
                                onClick={() => toggleDropdown(`landlord-statement-${payment.id}`)}
                                className="text-purple-400 hover:text-purple-300" 
                                title="Generate Statement"
                              >
                                <DocumentTextIcon className="h-5 w-5" />
                              </button>
                              {activeDropdown === `landlord-statement-${payment.id}` && (
                                <div className="absolute top-full right-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-lg z-50">
                                  <button 
                                    onClick={() => {
                                      console.log('Individual landlord PDF clicked for:', payment);
                                      generateLandlordStatementPDF([payment]);
                                      closeDropdown();
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-muted rounded-t-lg"
                                  >
                                    📄 PDF
                                  </button>
                                  <button 
                                    onClick={() => {
                                      console.log('Individual landlord Excel clicked for:', payment);
                                      generateLandlordStatementXLSX([payment]);
                                      closeDropdown();
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-muted rounded-b-lg"
                                  >
                                    📊 Excel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Transactions</h3>
                <p className="text-muted-foreground">Track all financial transactions</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openModal('addInvoice')}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Invoice</span>
                </button>
                <button 
                  onClick={() => openModal('processPayment')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Process Payment</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => toggleDropdown('transactions-export')}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    <span>Export</span>
                  </button>
                  {activeDropdown === 'transactions-export' && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                      <button 
                        onClick={() => {
                          handleExportTransactionsPDF();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-t-lg"
                      >
                        📄 Export PDF Report
                      </button>
                      <button 
                        onClick={() => {
                          handleExportTransactionsXLSX();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted rounded-b-lg"
                      >
                        📊 Export Excel Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h4 className="text-lg font-semibold text-white">Supplier Invoices</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {supplierPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-white font-medium">{payment.supplier_name}</div>
                          <div className="text-muted-foreground text-sm">{payment.contact_person}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-muted-foreground">{payment.description}</div>
                          <div className="text-muted-foreground/70 text-sm">Invoice: {payment.invoice_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs">
                            {payment.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-orange-400 font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('processPayment', payment)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Process Payment"
                            >
                              <CreditCardIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => openModal('viewDetails', payment)}
                              className="text-green-400 hover:text-green-300"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button className="text-red-400 hover:text-red-300" title="Delete">
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">
                  {modalType === 'recordPayment' && 'Record Payment'}
                  {modalType === 'generateInvoice' && 'Generate Invoice'}
                  {modalType === 'viewDetails' && 'View Details'}
                  {modalType === 'sendReminder' && 'Send Reminder'}
                </h3>
                <button onClick={closeModal} className="text-muted-foreground/70 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="text-muted-foreground">
                <p>Modal functionality will be implemented here for {modalType}.</p>
                {selectedItem && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <pre className="text-xs">{JSON.stringify(selectedItem, null, 2)}</pre>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 