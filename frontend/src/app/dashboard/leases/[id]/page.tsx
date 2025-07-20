"use client";

import React, { useState, useRef } from "react";
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
  ClockIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Mock Data Definitions ---

// Lease interface
interface Lease {
  id: string;
  lease_code: string;
  property_name: string;
  property_code: string;
  tenant_name: string;
  tenant_code: string;
  landlord_name: string;
  landlord_code: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  status: string;
  lease_type: string;
  rental_frequency: string;
  created_at: string;
  updated_at: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

// Invoice line item interface
interface InvoiceLineItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  notes?: string;
}

// Invoice form data interface
interface InvoiceFormData {
  invoiceNumber: string;
  dueDate: string;
  depositHeld: number;
  paymentReference: string;
  emailSubject: string;
  emailRecipient: string;
  lineItems: InvoiceLineItem[];
  notes: string;
  showBankDetails: boolean;
}

const mockLeases: Lease[] = [
  {
    id: '1', lease_code: 'LSE000001', property_name: 'Sunset Apartment 2A', property_code: 'PRO000001', tenant_name: 'John Smith', tenant_code: 'TEN000001', landlord_name: 'Sarah Johnson', landlord_code: 'LAN000001', start_date: '2024-01-01', end_date: '2024-12-31', monthly_rent: 12000, deposit: 24000, status: 'Active', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2023-12-15T10:30:00Z', updated_at: '2023-12-15T10:30:00Z', days_until_expiry: 45, is_expired: false, is_expiring_soon: true,
  },
  {
    id: '2', lease_code: 'LSE000002', property_name: 'Garden Villa 15', property_code: 'PRO000002', tenant_name: 'Michael Chen', tenant_code: 'TEN000002', landlord_name: 'Emma Williams', landlord_code: 'LAN000002', start_date: '2023-06-01', end_date: '2025-05-31', monthly_rent: 18500, deposit: 37000, status: 'Active', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2023-05-20T14:20:00Z', updated_at: '2023-05-20T14:20:00Z', days_until_expiry: 180, is_expired: false, is_expiring_soon: false,
  },
];

// Mock properties, tenants, landlords
const mockProperties = [
  { id: '1', name: 'Sunset Apartment 2A', code: 'PRO000001', address: '123 Main St, Cape Town' },
  { id: '2', name: 'Garden Villa 15', code: 'PRO000002', address: '456 Oak Ave, Stellenbosch' },
];
const mockTenants = [
  { id: '1', name: 'John Smith', code: 'TEN000001', email: 'john.smith@email.com' },
  { id: '2', name: 'Michael Chen', code: 'TEN000002', email: 'michael.chen@email.com' },
];
const mockLandlords = [
  { id: '1', name: 'Sarah Johnson', code: 'LAN000001', email: 'sarah@propertyholdings.co.za' },
  { id: '2', name: 'Emma Williams', code: 'LAN000002', email: 'emma@realestate.co.za' },
];

// --- Lease Detail Page Component ---

export default function LeaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Find the lease by id
  const lease = mockLeases.find((l) => l.id === leaseId);
  const property = mockProperties.find((p) => p.code === lease?.property_code);
  const landlord = mockLandlords.find((l) => l.code === lease?.landlord_code);
  const tenant = mockTenants.find((t) => t.code === lease?.tenant_code);

  // Tab state
  const [activeTab, setActiveTab] = useState("Lease");
  const [activeFinancialTab, setActiveFinancialTab] = useState("Statement");
  
  // Invoice creation state
  const [selectedTransactionType, setSelectedTransactionType] = useState<string | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  
  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    invoiceNumber: `INV${Date.now().toString().slice(-6)}`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    depositHeld: lease?.deposit || 0,
    paymentReference: `LEA${Date.now().toString().slice(-6)}`,
    emailSubject: "Enter a custom email subject (Optional)",
    emailRecipient: tenant?.email || "tenant@example.com",
    lineItems: [
      {
        id: '1',
        date: new Date().toISOString().split('T')[0],
        description: '[Utilities (To landlord)] utilities',
        amount: 1549.91,
        notes: 'zm test'
      },
      {
        id: '2',
        date: new Date().toISOString().split('T')[0],
        description: '[Credit note] rates credit',
        amount: -286.03,
        notes: 'zm test'
      },
      {
        id: '3',
        date: new Date().toISOString().split('T')[0],
        description: '[Payment] July payment',
        amount: -15190.00,
        notes: 'thank you'
      },
      {
        id: '4',
        date: new Date().toISOString().split('T')[0],
        description: '[Rent] rent',
        amount: 12248.00,
        notes: 'zm test'
      }
    ],
    notes: '',
    showBankDetails: true
  });

  // Handle tab switching
  const handleTabClick = (tab: string) => setActiveTab(tab);
  const handleFinancialTabClick = (tab: string) => setActiveFinancialTab(tab);

  // Transaction types data
  const transactionTypes = {
    feesRaised: [
      { id: 'admin_fee', name: 'Admin fee' },
      { id: 'bank_fee', name: 'Bank fee' },
      { id: 'collection_fee', name: 'Collection fee' }
    ],
    vendorCharges: [
      { id: 'bookkeeping', name: 'Bookkeeping / accounting costs' },
      { id: 'insurance', name: 'Insurance costs' },
      { id: 'landscaping', name: 'Landscaping' },
      { id: 'legal', name: 'Legal expenses' },
      { id: 'other_expense', name: 'Other expense' },
      { id: 'repairs_maintenance', name: 'Repairs and maintenance' },
      { id: 'utilities', name: 'Utilities' }
    ],
    otherCharges: [
      { id: 'deposit_due', name: 'Deposit due' },
      { id: 'interest', name: 'Interest' },
      { id: 'other_charge', name: 'Other charge' },
      { id: 'rent', name: 'Rent' },
      { id: 'repairs_maintenance_landlord', name: 'Repairs and maintenance (To landlord)' },
      { id: 'utilities_landlord', name: 'Utilities (To landlord)' }
    ]
  };

  // Handle actions
  const handleEdit = () => toast.success("Edit lease - feature coming soon");
  const handleExtend = () => toast.success("Extend lease - feature coming soon");
  const handleCancel = () => toast.success("Cancel lease - feature coming soon");

  // Invoice form handlers
  const handleInvoiceInputChange = (field: keyof InvoiceFormData, value: any) => {
    setInvoiceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLineItemChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      notes: ''
    };
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const removeLineItem = (id: string) => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const calculateTotal = () => {
    return invoiceForm.lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSendInvoice = () => {
    toast.success("Invoice sent successfully!");
  };

  const handlePreviewInvoice = () => {
    toast.success("Preview invoice - feature coming soon");
  };

  const handleCustomizeInvoice = () => {
    toast.success("Customize invoice - feature coming soon");
  };

  if (!lease) {
    return (
      <DashboardLayout title="Lease Not Found">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Lease Not Found</h3>
            <p className="text-muted-foreground">The requested lease could not be found.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-muted text-muted-foreground';
      default: return 'bg-blue-100 text-blue-800';
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

  // --- Main Render ---
  return (
    <DashboardLayout title={`Lease - ${tenant ? tenant.name : lease.tenant_name}`}>
      {/* Back to Leases button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/leases")}
          className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Leases
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-white/10 border border-white/20 rounded-lg p-1 mb-6">
        {[
          { label: "Lease", icon: DocumentTextIcon },
          { label: "Financials", icon: BanknotesIcon },
          { label: "Contacts", icon: UserGroupIcon },
          { label: "Notes", icon: ClipboardDocumentListIcon },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab.label)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none ${
              activeTab === tab.label
                ? "bg-white/20 text-blue-400"
                : "text-white/70 hover:text-blue-300"
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "Lease" && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-8">
          <div className="bg-white/5 px-6 py-3 border-b border-white/20">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lease Summary</div>
          </div>
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Card */}
            <div className="flex flex-col items-start justify-center">
              <div className="text-xs text-muted-foreground/70 mb-1">Status</div>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${getStatusColor(lease.status)}`}>
                {lease.status}
              </div>
              <div className="text-muted-foreground text-sm mb-1">
                Expiry in {lease.days_until_expiry > 0 ? `${lease.days_until_expiry} days` : "Expired"}
              </div>
              <div className="text-xs text-muted-foreground/70">{lease.start_date} - {lease.end_date}</div>
              <div className="flex space-x-2 mt-4">
                <button onClick={handleEdit} className="text-xs text-blue-400 underline">Edit</button>
                <span className="text-muted-foreground/70">|</span>
                <button onClick={handleExtend} className="text-xs text-blue-400 underline">Extend</button>
                <span className="text-muted-foreground/70">|</span>
                <button onClick={handleCancel} className="text-xs text-blue-400 underline">Cancel</button>
              </div>
            </div>
            {/* Total Due Card */}
            <div className="flex flex-col items-start justify-center">
              <div className="text-xs text-muted-foreground/70 mb-1">Total Due</div>
              <div className="flex items-center text-lg font-semibold text-white mb-2">
                <BanknotesIcon className="h-5 w-5 mr-2 text-blue-400" /> {formatCurrency(calculateTotal())}
              </div>
              <div className="text-muted-foreground/70 text-xs mb-1">Rental: {formatCurrency(lease.monthly_rent)} monthly</div>
              <div className="text-muted-foreground/70 text-xs">Rent due: On the 1st</div>
            </div>
            {/* Deposit Held Card */}
            <div className="flex flex-col items-start justify-center">
              <div className="text-xs text-muted-foreground/70 mb-1">Deposit Held</div>
              <div className="flex items-center text-lg font-semibold text-white mb-2">
                <BanknotesIcon className="h-5 w-5 mr-2 text-purple-400" /> {formatCurrency(lease.deposit)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lease Details Section (Tab Content) */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
        {activeTab === "Lease" && (
          <div className="space-y-6">
            {/* Basic Lease Information */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-6">
              <h4 className="text-md font-medium text-white mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Lease Reference</div>
                  <div className="text-lg font-semibold text-white">{lease.lease_code}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Lease Type</div>
                  <div className="text-white font-medium">{lease.lease_type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Rental Frequency</div>
                  <div className="text-white font-medium">{lease.rental_frequency}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Monthly Rent</div>
                  <div className="text-white font-medium">{formatCurrency(lease.monthly_rent)}</div>
                </div>
              </div>
            </div>

            {/* Dates and Duration */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-6">
              <h4 className="text-md font-medium text-white mb-4 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                Lease Period
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Start Date</div>
                  <div className="text-white font-medium">{lease.start_date}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">End Date</div>
                  <div className="text-white font-medium">{lease.end_date}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Days Remaining</div>
                  <div className={`font-medium ${lease.days_until_expiry > 30 ? 'text-green-400' : lease.days_until_expiry > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {lease.days_until_expiry > 0 ? `${lease.days_until_expiry} days` : 'Expired'}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-6">
              <h4 className="text-md font-medium text-white mb-4 flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2" />
                Financial Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Security Deposit</div>
                  <div className="text-white font-medium">{formatCurrency(lease.deposit)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Rent Due Date</div>
                  <div className="text-white font-medium">1st of each month</div>
                </div>
              </div>
            </div>

            {/* Related Parties */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-6">
              <h4 className="text-md font-medium text-white mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Related Parties
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Landlord</div>
                  <div className="text-primary font-semibold cursor-pointer underline hover:text-secondary" onClick={() => router.push(`/dashboard/landlord`)}>
                    {landlord ? landlord.name : lease.landlord_name}
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{lease.landlord_code}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70 mb-1">Property</div>
                  <div className="text-primary font-semibold cursor-pointer underline hover:text-secondary" onClick={() => router.push(`/dashboard/properties`)}>
                    {property ? property.name : lease.property_name}
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{lease.property_code}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground/70 mb-1">Tenant(s)</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-200" onClick={() => router.push(`/dashboard/tenants`)}>
                      {tenant ? tenant.name : lease.tenant_name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{lease.tenant_code}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-6">
              <h4 className="text-md font-medium text-white mb-4">Quick Actions</h4>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Lease
                </button>
                <button 
                  onClick={handleExtend}
                  className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                >
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  Extend Lease
                </button>
                <button 
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Cancel Lease
                </button>
                <button 
                  onClick={() => router.push(`/dashboard/leases/${lease.id}/documents`)}
                  className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                >
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  View Documents
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "Financials" && (
          <div className="space-y-6">
            {/* Financial Sub-tabs */}
            <div className="border-b border-white/20">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'Statement', name: 'Statement' },
                  { id: 'Current invoice', name: 'Current invoice' },
                  { id: 'Deposits', name: 'Deposits' },
                  { id: 'Future charges', name: 'Future charges' },
                  { id: 'Recurring charges', name: 'Recurring charges' },
                  { id: 'Management fees', name: 'Management fees' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleFinancialTabClick(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeFinancialTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-muted-foreground hover:text-white hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Statement Tab */}
            {activeFinancialTab === "Statement" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Financial Statement</h3>
                  <div className="flex space-x-2">
                    <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Export PDF
                    </button>
                  </div>
                </div>
                
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground text-sm mb-1">Total Charged</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(15000)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground text-sm mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(12000)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground text-sm mb-1">Outstanding</p>
                    <p className="text-xl font-bold text-red-400">{formatCurrency(3000)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground text-sm mb-1">Deposit Held</p>
                    <p className="text-xl font-bold text-purple-400">{formatCurrency(lease.deposit)}</p>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
                  <div className="bg-white/10 px-4 py-3 border-b border-white/20">
                    <h4 className="text-md font-medium text-white">Transaction History</h4>
                  </div>
                  
                  <div className="divide-y divide-white/10">
                    {/* Sample transactions - in real app, these would come from API */}
                    {[
                      { id: '1', date: '2024-01-01', description: 'Rent - January 2024', type: 'charge', amount: 12000, balance: 12000 },
                      { id: '2', date: '2024-01-05', description: 'Payment received', type: 'payment', amount: -12000, balance: 0 },
                      { id: '3', date: '2024-02-01', description: 'Rent - February 2024', type: 'charge', amount: 12000, balance: 12000 },
                      { id: '4', date: '2024-02-03', description: 'Late payment fee', type: 'charge', amount: 500, balance: 12500 },
                      { id: '5', date: '2024-02-10', description: 'Payment received', type: 'payment', amount: -12500, balance: 0 },
                      { id: '6', date: '2024-03-01', description: 'Rent - March 2024', type: 'charge', amount: 12000, balance: 12000 },
                      { id: '7', date: '2024-03-15', description: 'Utilities charge', type: 'charge', amount: 1500, balance: 13500 },
                      { id: '8', date: '2024-03-20', description: 'Partial payment', type: 'payment', amount: -10000, balance: 3500 },
                    ].map((transaction) => (
                      <div key={transaction.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                transaction.type === 'charge' ? 'bg-red-400' : 'bg-green-400'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-white">{transaction.description}</p>
                                <p className="text-xs text-muted-foreground/70">{transaction.date}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              transaction.type === 'charge' ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {transaction.type === 'charge' ? '+' : ''}{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground/70">Balance: {formatCurrency(transaction.balance)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Current Invoice Tab */}
            {activeFinancialTab === "Current invoice" && (
              <InvoiceCreationForm lease={lease} tenant={tenant} landlord={landlord} property={property} />
            )}

            {/* Other Financial Tabs */}
            {activeFinancialTab === "Deposits" && (
              <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Security Deposits</h3>
                <div className="text-center text-muted-foreground">
                  <p>Deposit management functionality will be implemented here</p>
                </div>
              </div>
            )}

            {activeFinancialTab === "Future charges" && (
              <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Future Charges</h3>
                <div className="text-center text-muted-foreground">
                  <p>Future charges functionality will be implemented here</p>
                </div>
              </div>
            )}

            {activeFinancialTab === "Recurring charges" && (
              <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recurring Charges</h3>
                <div className="text-center text-muted-foreground">
                  <p>Recurring charges functionality will be implemented here</p>
                </div>
              </div>
            )}

            {activeFinancialTab === "Management fees" && (
              <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Management Fees</h3>
                <div className="text-center text-muted-foreground">
                  <p>Management fees functionality will be implemented here</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "Contacts" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            
            {/* Tenant Information */}
            <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
              <div className="bg-white/10 px-4 py-3 border-b border-white/20">
                <h4 className="text-md font-medium text-white flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Tenant Details
                </h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Name</p>
                    <p className="text-white font-medium">{tenant ? tenant.name : lease.tenant_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Code</p>
                    <p className="text-primary">{lease.tenant_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Email</p>
                    <p className="text-white">{tenant ? tenant.email : 'tenant@example.com'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Phone</p>
                    <p className="text-white">+27 82 123 4567</p>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Send Email
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                    <UserIcon className="h-4 w-4 mr-2" />
                    View Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Landlord Information */}
            <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
              <div className="bg-white/10 px-4 py-3 border-b border-white/20">
                <h4 className="text-md font-medium text-white flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Landlord Details
                </h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Name</p>
                    <p className="text-white font-medium">{landlord ? landlord.name : lease.landlord_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Code</p>
                    <p className="text-primary">{lease.landlord_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Email</p>
                    <p className="text-white">{landlord ? landlord.email : 'landlord@example.com'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Phone</p>
                    <p className="text-white">+27 83 987 6543</p>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Send Email
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    View Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
              <div className="bg-white/10 px-4 py-3 border-b border-white/20">
                <h4 className="text-md font-medium text-white flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Property Details
                </h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Property Name</p>
                    <p className="text-white font-medium">{property ? property.name : lease.property_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70 mb-1">Code</p>
                    <p className="text-primary">{lease.property_code}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground/70 mb-1">Address</p>
                    <p className="text-white">{property ? property.address : '123 Main Street, Cape Town, 8001'}</p>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    View Property
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20">
                    <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                    View Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "Notes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Lease Notes</h3>
              <button 
                onClick={() => {
                  // Add new note functionality
                  toast.success("Add note functionality coming soon");
                }}
                className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Note
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {[
                {
                  id: '1',
                  title: 'Lease Renewal Discussion',
                  content: 'Tenant expressed interest in renewing the lease for another year. Discussed potential rent increase of 5% to align with market rates.',
                  author: 'Property Manager',
                  date: '2024-03-15',
                  type: 'important'
                },
                {
                  id: '2',
                  title: 'Maintenance Request',
                  content: 'Tenant reported minor plumbing issue in the kitchen. Scheduled maintenance for next week.',
                  author: 'John Smith',
                  date: '2024-03-10',
                  type: 'maintenance'
                },
                {
                  id: '3',
                  title: 'Payment Reminder',
                  content: 'Sent payment reminder for March rent. Tenant confirmed payment will be made by end of week.',
                  author: 'Property Manager',
                  date: '2024-03-01',
                  type: 'payment'
                },
                {
                  id: '4',
                  title: 'Property Inspection',
                  content: 'Conducted quarterly property inspection. Property is well-maintained. No issues found.',
                  author: 'Property Manager',
                  date: '2024-02-28',
                  type: 'inspection'
                }
              ].map((note) => (
                <div key={note.id} className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        note.type === 'important' ? 'bg-red-400' :
                        note.type === 'maintenance' ? 'bg-yellow-400' :
                        note.type === 'payment' ? 'bg-green-400' :
                        'bg-blue-400'
                      }`}></div>
                      <h4 className="text-md font-medium text-white">{note.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-muted-foreground/70 hover:text-white p-1">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-muted-foreground/70 hover:text-red-400 p-1">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{note.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>By {note.author}</span>
                    <span>{note.date}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Note Input */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-4">
              <h4 className="text-md font-medium text-white mb-3">Quick Note</h4>
              <textarea
                placeholder="Add a quick note about this lease..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <input type="checkbox" className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500" />
                    <span>Mark as important</span>
                  </label>
                </div>
                <button className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Invoice Creation Form Component
interface InvoiceCreationFormProps {
  lease: Lease;
  tenant: any;
  landlord: any;
  property: any;
}

const STATUS_OPTIONS = [
  { value: 'not_actioned', label: 'Not yet actioned', icon: ClockIcon, color: 'text-muted-foreground/70' },
  { value: 'ready', label: 'Ready to send', icon: CheckCircleIcon, color: 'text-green-500' },
  { value: 'waiting_expenses', label: 'Waiting for expenses', icon: CogIcon, color: 'text-yellow-400' },
  { value: 'urgent', label: 'Requires urgent attention', icon: ExclamationTriangleIcon, color: 'text-red-500' },
];

function InvoiceCreationForm({ lease, tenant, landlord, property }: InvoiceCreationFormProps) {
  // Get current month for initial invoice date
  const getCurrentMonthDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  };

  // Invoice state
  const [title, setTitle] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState(getCurrentMonthDate());
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10));
  const [status, setStatus] = useState('ready');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [fromDetails, setFromDetails] = useState('Your company details...');
  const [toDetails, setToDetails] = useState('Client details...');
  const [lineItems, setLineItems] = useState([
    { description: 'Item description', category: '', quantity: 1, price: 0, total: 0 },
    { description: 'Item description', category: '', quantity: 1, price: 0, total: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailRecipient, setEmailRecipient] = useState(tenant?.email || 'tenant@example.com');
  const [bankInfo, setBankInfo] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [hasInvoice, setHasInvoice] = useState(false); // Track if invoice exists for current month
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Line item handlers
  const handleLineChange = (idx: number, field: string, value: any) => {
    setLineItems(items => items.map((item, i) =>
      i === idx ? { ...item, [field]: value, total: field === 'quantity' || field === 'price' ? (field === 'quantity' ? value * item.price : item.quantity * value) : item.quantity * item.price } : item
    ));
  };
  
  const addLine = () => setLineItems([...lineItems, { description: '', category: '', quantity: 1, price: 0, total: 0 }]);
  const removeLine = (idx: number) => setLineItems(items => items.filter((_, i) => i !== idx));

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date(issueDate);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1);
    
    // Auto-save current invoice before navigating
    if (hasInvoice) {
      saveInvoice();
    }
    
    // Update issue date
    setIssueDate(newDate.toISOString().slice(0, 10));
    
    // Check if invoice exists for new month (mock check)
    const newMonthHasInvoice = Math.random() > 0.5; // Mock: 50% chance of having invoice
    setHasInvoice(newMonthHasInvoice);
    
    if (newMonthHasInvoice) {
      // Load existing invoice data (mock)
      setTitle(`Invoice for ${newDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      setInvoiceNumber(`INV-${newDate.getFullYear()}${String(newDate.getMonth() + 1).padStart(2, '0')}`);
      setLineItems([
        { description: 'Rent', category: 'Rent', quantity: 1, price: lease.monthly_rent, total: lease.monthly_rent },
        { description: 'Utilities', category: 'Utilities', quantity: 1, price: 500, total: 500 },
      ]);
    } else {
      // Reset to empty state
      setTitle('');
      setInvoiceNumber(`INV-${newDate.getFullYear()}${String(newDate.getMonth() + 1).padStart(2, '0')}`);
      setLineItems([
        { description: 'Item description', category: '', quantity: 1, price: 0, total: 0 },
        { description: 'Item description', category: '', quantity: 1, price: 0, total: 0 },
      ]);
    }
    
    toast.success(`Navigated to ${newDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  };

  // Auto-save function
  const saveInvoice = () => {
    // Mock save functionality
    toast.success('Invoice auto-saved');
  };

  // Totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxRate = 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // PDF download handler
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoiceNumber}.pdf`);
    } catch (error) {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // If no invoice exists for current month, show empty state
  if (!hasInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Current Invoice</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-white font-medium">
              {new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <DocumentTextIcon className="h-16 w-16 text-muted-foreground/70 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Invoice for This Month</h3>
            <p className="text-muted-foreground/70 mb-6">
              There's no invoice created for {new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. 
              Use the arrows to navigate to a month with an existing invoice, or create a new one.
            </p>
            <button
              onClick={() => {
                setHasInvoice(true);
                setTitle(`Invoice for ${new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
                toast.success('New invoice created');
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Invoice for This Month
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Month Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <input
            className="text-3xl font-bold bg-transparent border-none outline-none text-muted-foreground placeholder-gray-400"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (Optional)"
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-white font-medium">
              {new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            className="flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
            onClick={() => setShowStatusDropdown(v => !v)}
            type="button"
          >
            {STATUS_OPTIONS.find(opt => opt.value === status)?.icon && (
              <span className={`mr-2 ${STATUS_OPTIONS.find(opt => opt.value === status)?.color}`}>
                {React.createElement(STATUS_OPTIONS.find(opt => opt.value === status)!.icon, { className: 'h-5 w-5' })}
              </span>
            )}
            {STATUS_OPTIONS.find(opt => opt.value === status)?.label}
            <ChevronDownIcon className="h-4 w-4 ml-2" />
          </button>
          {/* Download button next to status */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center px-3 py-2 border border-green-500 rounded-md text-sm font-medium text-green-500 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            title="Download PDF"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            {downloading ? 'Generating...' : 'Download'}
          </button>
          {showStatusDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              {STATUS_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={`flex items-center px-4 py-2 cursor-pointer hover:bg-muted ${status === opt.value ? 'bg-muted' : ''}`}
                  onClick={() => { setStatus(opt.value); setShowStatusDropdown(false); }}
                >
                  <span className={`mr-2 ${opt.color}`}>{React.createElement(opt.icon, { className: 'h-5 w-5' })}</span>
                  {opt.label}
                </div>
              ))}
              <div className="border-t border-gray-200">
                <button className="flex items-center px-4 py-2 w-full text-xs text-blue-500 hover:bg-muted">
                  <CogIcon className="h-4 w-4 mr-2" /> Set default state
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/10 border border-white/20 rounded-lg p-6">
        <div>
          <div className="text-muted-foreground/70 text-sm mb-1">Invoice #</div>
          <input className="bg-transparent border-none outline-none text-blue-400 font-semibold" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <div className="text-muted-foreground/70 text-sm mb-1">Issue Date</div>
          <input type="date" className="bg-transparent border-none outline-none text-white" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
        </div>
        <div>
          <div className="text-muted-foreground/70 text-sm mb-1">Due Date</div>
          <input type="date" className="bg-transparent border-none outline-none text-white" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* From/To */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={fromDetails} onChange={e => setFromDetails(e.target.value)} placeholder="Your company details..." />
        <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={toDetails} onChange={e => setToDetails(e.target.value)} placeholder="Client details..." />
      </div>

      {/* Line Items */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="text-muted-foreground/70 text-sm">
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-center">Quantity</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx} className="bg-white/5">
                <td className="px-4 py-2">
                  <input className="w-full bg-transparent border-none outline-none text-white" value={item.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} placeholder="Item description" />
                </td>
                <td className="px-4 py-2">
                  <input className="w-full bg-transparent border-none outline-none text-white" value={item.category} onChange={e => handleLineChange(idx, 'category', e.target.value)} placeholder="Category" />
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button onClick={() => handleLineChange(idx, 'quantity', Math.max(1, item.quantity - 1))} className="p-1"><MinusIcon className="h-4 w-4 text-muted-foreground/70" /></button>
                    <input type="number" min={1} className="w-12 text-center bg-transparent border-none outline-none text-white" value={item.quantity} onChange={e => handleLineChange(idx, 'quantity', Math.max(1, Number(e.target.value)))} />
                    <button onClick={() => handleLineChange(idx, 'quantity', item.quantity + 1)} className="p-1"><PlusIcon className="h-4 w-4 text-muted-foreground/70" /></button>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <input type="number" min={0} className="w-20 text-right bg-transparent border-none outline-none text-white" value={item.price} onChange={e => handleLineChange(idx, 'price', Number(e.target.value))} />
                </td>
                <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                <td className="px-2 py-2 text-center">
                  <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-300"><MinusIcon className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} className="mt-2 flex items-center text-blue-400 hover:text-blue-300 text-sm">
          <PlusIcon className="h-4 w-4 mr-1" /> Add line
        </button>
      </div>

      {/* Invoice Actions */}
      <div className="flex flex-wrap gap-2 mt-2">
        <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add payment</button>
        <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add charge</button>
        <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Issue credit</button>
        <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Issue refund</button>
        <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Use deposit</button>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end space-y-1">
        <div className="flex items-center gap-8">
          <div className="text-muted-foreground/70">Subtotal</div>
          <div className="text-white font-semibold">${formatCurrency(subtotal)}</div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-muted-foreground/70">Tax</div>
          <div className="text-white font-semibold">{taxRate}% ${formatCurrency(tax)}</div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-muted-foreground/70">Subtotal with Tax</div>
          <div className="text-white font-semibold">${formatCurrency(subtotal + tax)}</div>
        </div>
        <div className="flex items-center gap-8 text-lg font-bold border-t border-white/20 pt-2 mt-2">
          <div className="text-white">Total</div>
          <div className="text-white">${formatCurrency(total)}</div>
        </div>
      </div>

      {/* Notes and Delivery */}
      <div className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-muted-foreground/70 text-sm mb-1">Add a note to this invoice (optional)</label>
          <textarea className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white" value={notes} onChange={e => setNotes(e.target.value)} placeholder="No notes have been specified" />
        </div>
        <div>
          <label className="block text-muted-foreground/70 text-sm mb-1">Deliver invoice to</label>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <input className="flex-1 bg-transparent border border-white/20 rounded-md p-2 text-white" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject (optional)" />
            <input className="flex-1 bg-transparent border border-white/20 rounded-md p-2 text-white" value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)} placeholder="CC email" />
          </div>
        </div>
      </div>

      {/* Bank Info and Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={bankInfo} onChange={e => setBankInfo(e.target.value)} placeholder="Bank Information" />
        <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={extraNotes} onChange={e => setExtraNotes(e.target.value)} placeholder="Notes" />
      </div>
      <div ref={invoiceRef} className="invoice-pdf-content">
        {/* Move all invoice content here for PDF capture */}
        {/* Header with Month Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <input
              className="text-3xl font-bold bg-transparent border-none outline-none text-muted-foreground placeholder-gray-400"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title (Optional)"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-white font-medium">
                {new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              className="flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
              onClick={() => setShowStatusDropdown(v => !v)}
              type="button"
            >
              {STATUS_OPTIONS.find(opt => opt.value === status)?.icon && (
                <span className={`mr-2 ${STATUS_OPTIONS.find(opt => opt.value === status)?.color}`}>
                  {React.createElement(STATUS_OPTIONS.find(opt => opt.value === status)!.icon, { className: 'h-5 w-5' })}
                </span>
              )}
              {STATUS_OPTIONS.find(opt => opt.value === status)?.label}
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>
            {/* Download button next to status */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center px-3 py-2 border border-green-500 rounded-md text-sm font-medium text-green-500 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {downloading ? 'Generating...' : 'Download'}
            </button>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/10 border border-white/20 rounded-lg p-6">
          <div>
            <div className="text-muted-foreground/70 text-sm mb-1">Invoice #</div>
            <input className="bg-transparent border-none outline-none text-blue-400 font-semibold" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <div className="text-muted-foreground/70 text-sm mb-1">Issue Date</div>
            <input type="date" className="bg-transparent border-none outline-none text-white" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div>
            <div className="text-muted-foreground/70 text-sm mb-1">Due Date</div>
            <input type="date" className="bg-transparent border-none outline-none text-white" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* From/To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={fromDetails} onChange={e => setFromDetails(e.target.value)} placeholder="Your company details..." />
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={toDetails} onChange={e => setToDetails(e.target.value)} placeholder="Client details..." />
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr className="text-muted-foreground/70 text-sm">
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} className="bg-white/5">
                  <td className="px-4 py-2">
                    <input className="w-full bg-transparent border-none outline-none text-white" value={item.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} placeholder="Item description" />
                  </td>
                  <td className="px-4 py-2">
                    <input className="w-full bg-transparent border-none outline-none text-white" value={item.category} onChange={e => handleLineChange(idx, 'category', e.target.value)} placeholder="Category" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleLineChange(idx, 'quantity', Math.max(1, item.quantity - 1))} className="p-1"><MinusIcon className="h-4 w-4 text-muted-foreground/70" /></button>
                      <input type="number" min={1} className="w-12 text-center bg-transparent border-none outline-none text-white" value={item.quantity} onChange={e => handleLineChange(idx, 'quantity', Math.max(1, Number(e.target.value)))} />
                      <button onClick={() => handleLineChange(idx, 'quantity', item.quantity + 1)} className="p-1"><PlusIcon className="h-4 w-4 text-muted-foreground/70" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" min={0} className="w-20 text-right bg-transparent border-none outline-none text-white" value={item.price} onChange={e => handleLineChange(idx, 'price', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-300"><MinusIcon className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addLine} className="mt-2 flex items-center text-blue-400 hover:text-blue-300 text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add line
          </button>
        </div>

        {/* Invoice Actions */}
        <div className="flex flex-wrap gap-2 mt-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add payment</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add charge</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Issue credit</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Issue refund</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Use deposit</button>
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end space-y-1">
          <div className="flex items-center gap-8">
            <div className="text-muted-foreground/70">Subtotal</div>
            <div className="text-white font-semibold">${formatCurrency(subtotal)}</div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-muted-foreground/70">Tax</div>
            <div className="text-white font-semibold">{taxRate}% ${formatCurrency(tax)}</div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-muted-foreground/70">Subtotal with Tax</div>
            <div className="text-white font-semibold">${formatCurrency(subtotal + tax)}</div>
          </div>
          <div className="flex items-center gap-8 text-lg font-bold border-t border-white/20 pt-2 mt-2">
            <div className="text-white">Total</div>
            <div className="text-white">${formatCurrency(total)}</div>
          </div>
        </div>

        {/* Notes and Delivery */}
        <div className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-muted-foreground/70 text-sm mb-1">Add a note to this invoice (optional)</label>
            <textarea className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white" value={notes} onChange={e => setNotes(e.target.value)} placeholder="No notes have been specified" />
          </div>
          <div>
            <label className="block text-muted-foreground/70 text-sm mb-1">Deliver invoice to</label>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input className="flex-1 bg-transparent border border-white/20 rounded-md p-2 text-white" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject (optional)" />
              <input className="flex-1 bg-transparent border border-white/20 rounded-md p-2 text-white" value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)} placeholder="CC email" />
            </div>
          </div>
        </div>

        {/* Bank Info and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={bankInfo} onChange={e => setBankInfo(e.target.value)} placeholder="Bank Information" />
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={extraNotes} onChange={e => setExtraNotes(e.target.value)} placeholder="Notes" />
        </div>
      </div>
    </div>
  );
}