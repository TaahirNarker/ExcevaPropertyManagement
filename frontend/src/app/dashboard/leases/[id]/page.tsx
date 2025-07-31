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
  CheckIcon,
  ClockIcon,
  CogIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, subMonths, addMonths } from 'date-fns';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/auth';  // Import API_BASE_URL from auth.ts
import { authService } from '@/lib/auth';  // Import authService for token access

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

// Seeded random number generator for consistent SSR/client results
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Generate lease-specific transactions
const getLeaseTransactions = (lease: Lease) => {
  if (!lease) return [];
  
  const transactions: Array<{
    id: string;
    date: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
  }> = [];
  
  // Create transactions based on lease data
  const monthlyRent = lease.monthly_rent;
  const startDate = new Date(lease.start_date);
  const currentDate = new Date();
  
  // Create seeded random generator based on lease ID for consistency
  const rng = new SeededRandom(parseInt(lease.id) * 12345);
  
  // Generate monthly rent charges and payments from start date to current
  let runningBalance = 0;
  let transactionId = 1;
  
  for (let date = new Date(startDate); date <= currentDate; date.setMonth(date.getMonth() + 1)) {
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dateStr = date.toISOString().split('T')[0];
    
    // Add rent charge on 1st of each month
    runningBalance += monthlyRent;
    transactions.push({
      id: transactionId.toString(),
      date: dateStr,
      description: `Rent - ${monthYear}`,
      type: 'charge',
      amount: monthlyRent,
      balance: runningBalance
    });
    transactionId++;
    
    // Add payment (usually 5-10 days later) for most months
    const shouldAddPayment = rng.next() > 0.1; // 90% chance of payment
    if (shouldAddPayment) {
      const paymentDate = new Date(date);
      paymentDate.setDate(Math.floor(rng.next() * 10) + 5); // 5-15 days later
      
      let paymentAmount = monthlyRent;
      // Sometimes add late fees
      if (rng.next() > 0.8) {
        const lateFee = Math.floor(rng.next() * 500) + 200;
        runningBalance += lateFee;
        transactions.push({
          id: transactionId.toString(),
          date: paymentDate.toISOString().split('T')[0],
          description: 'Late payment fee',
          type: 'charge',
          amount: lateFee,
          balance: runningBalance
        });
        transactionId++;
        paymentAmount += lateFee;
      }
      
      runningBalance -= paymentAmount;
      transactions.push({
        id: transactionId.toString(),
        date: paymentDate.toISOString().split('T')[0],
        description: `Payment received - ${monthYear}`,
        type: 'payment',
        amount: -paymentAmount,
        balance: runningBalance
      });
      transactionId++;
    }
    
    // Occasionally add utility charges
    if (rng.next() > 0.7) {
      const utilityAmount = Math.floor(rng.next() * 1000) + 500;
      const utilityDate = new Date(date);
      utilityDate.setDate(Math.floor(rng.next() * 20) + 10);
      
      runningBalance += utilityAmount;
      transactions.push({
        id: transactionId.toString(),
        date: utilityDate.toISOString().split('T')[0],
        description: 'Utilities charge',
        type: 'charge',
        amount: utilityAmount,
        balance: runningBalance
      });
      transactionId++;
    }
  }
  
  // Add security deposit at the beginning if this is lease 1
  if (lease.id === '1') {
    transactions.unshift({
      id: '0',
      date: startDate.toISOString().split('T')[0],
      description: 'Security deposit received',
      type: 'payment',
      amount: -lease.deposit,
      balance: -lease.deposit
    });
    
    // Adjust all other balances
    transactions.slice(1).forEach(t => t.balance -= lease.deposit);
  }
  
  // Sort by date
  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

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

  // Current invoice tab state
  const [issueDate, setIssueDate] = useState('2024-07-01');
  const [dueDate, setDueDate] = useState('2024-07-31');
  const [title, setTitle] = useState('Invoice for July 2024');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-202407');
  const [hasInvoice, setHasInvoice] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lineItems, setLineItems] = useState([
    { 
      description: 'Monthly Rent', 
      category: 'Rent', 
      quantity: 1, 
      price: 12500, 
      total: 12500 
    },
    { 
      description: 'Utilities & Services', 
      category: 'Utilities', 
      quantity: 1, 
      price: 850, 
      total: 850 
    },
  ]);
  const [fromDetails, setFromDetails] = useState('Your Company Name\nYour Address\nCity, State ZIP\nPhone: (123) 456-7890\nEmail: info@company.com');
  const [toDetails, setToDetails] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState('draft');
  const invoiceRef = useRef<HTMLDivElement>(null);

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

  // Financial Statement PDF Export Handler
  const handleExportFinancialStatement = async () => {
    console.log('Exporting Lease Statement PDF...');
    
    if (!lease) {
      toast.error('Lease data not available');
      return;
    }
    
    try {
      const doc = new jsPDF();
      
      // Get logo from localStorage (if saved from settings)
      const savedLogo = localStorage.getItem('companyLogo');
      
      // Add logo if available
      if (savedLogo) {
        try {
          doc.addImage(savedLogo, 'PNG', 20, 15, 40, 20);
        } catch (logoError) {
          console.warn('Could not add logo to PDF:', logoError);
        }
      }
      
      // Header - "Lease Statement" on the right
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 130, 180); // Steel blue color
      doc.text('Lease Statement', 140, 25);
      
      // Statement details on the right
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('STATEMENT DATE', 140, 35);
      doc.text(':', 175, 35);
      doc.text(new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }), 180, 35);
      
      doc.text('ACCOUNT NO.', 140, 42);
      doc.text(':', 175, 42);
      doc.text(lease.lease_code, 180, 42);
      
      // Statement to (Tenant details) - Left side
      let yPos = 55;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Statement to', 20, yPos);
      
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(tenant ? tenant.name : lease.tenant_name, 20, yPos);
      
             // Tenant address (using sample address format)
       yPos += 6;
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(9);
       // For now, using sample address format as shown in the image
       // You can extend the tenant interface later to include full address
       doc.text('Att: Prince Mokako', 20, yPos);
       yPos += 4;
       doc.text('Room 1 & 2', 20, yPos);
       yPos += 4;
       doc.text('92 Donkin St', 20, yPos);
       yPos += 4;
       doc.text('Beaufort West', 20, yPos);
       yPos += 4;
       doc.text('Beaufort West', 20, yPos);
       yPos += 4;
       doc.text('Western Cape', 20, yPos);
       yPos += 4;
       doc.text('6970', 20, yPos);
      
             // Property details
       yPos += 15;
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(10);
       const propertyText = `Property: ${property ? property.name + ' - ' + lease.property_name : lease.property_name}`;
       doc.text(propertyText, 20, yPos);
      
      // Financial summary boxes
      yPos += 15;
      
      // Deposit held box (golden background)
      doc.setFillColor(218, 165, 32); // Golden color
      doc.rect(20, yPos, 95, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DEPOSIT HELD: ' + formatCurrency(lease.deposit), 25, yPos + 8);
      
      // Amount due box (golden background)
      doc.rect(115, yPos, 95, 12, 'F');
      const leaseTransactions = getLeaseTransactions(lease);
      const amountDue = Math.max(0, leaseTransactions[leaseTransactions.length - 1]?.balance || 0);
      doc.text('AMOUNT DUE: ' + formatCurrency(amountDue), 120, yPos + 8);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Transaction table
      yPos += 25;
      
      // Table header with blue background
      doc.setFillColor(70, 130, 180); // Steel blue
      doc.rect(20, yPos, 170, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('DATE', 22, yPos + 6);
      doc.text('REFERENCE', 45, yPos + 6);
      doc.text('DESCRIPTION', 70, yPos + 6);
      doc.text('DEBIT', 130, yPos + 6);
      doc.text('CREDIT', 150, yPos + 6);
      doc.text('BALANCE', 170, yPos + 6);
      
      yPos += 8;
      
      // Reset text color for table content
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // Use actual lease transaction data
      const pdfTransactions = getLeaseTransactions(lease);
      
      pdfTransactions.forEach((transaction, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 30;
        }
        
        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(20, yPos, 170, 6, 'F');
        }
        
        doc.setFontSize(8);
        // Format date
        const formattedDate = new Date(transaction.date).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }).replace(' ', ' ');
        doc.text(formattedDate, 22, yPos + 4);
        doc.text('', 45, yPos + 4); // Reference (empty for now)
        doc.text(transaction.description.substring(0, 35), 70, yPos + 4);
        
        // Display debit/credit based on transaction type
        if (transaction.type === 'charge') {
          doc.text(formatCurrency(transaction.amount), 130, yPos + 4);
        } else {
          doc.text('', 130, yPos + 4);
        }
        if (transaction.type === 'payment') {
          doc.text(formatCurrency(Math.abs(transaction.amount)), 150, yPos + 4);
        } else {
          doc.text('', 150, yPos + 4);
        }
        doc.text(formatCurrency(transaction.balance), 170, yPos + 4);
        
        yPos += 6;
      });
      
      // Footer with company details
      yPos = 280; // Fixed position at bottom
      doc.setFillColor(218, 165, 32); // Golden footer
      doc.rect(0, yPos, 210, 20, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Page 1 of 2', 180, yPos + 6);
      
      doc.setFontSize(9);
      const footerText = 'Narker Property Group | 11 Commercial Street Cape Town Cape Town Western Cape';
      doc.text(footerText, 105 - (footerText.length * 1.2), yPos + 12);
      
      const contactText = '0214626223 | info@narkerproperty.com | Vat No: 429023792';
      doc.text(contactText, 105 - (contactText.length * 1.2), yPos + 16);
      
      console.log('PDF generated successfully, attempting to save...');
      doc.save(`lease-statement-${lease.lease_code}.pdf`);
      console.log('PDF saved successfully');
      
      toast.success('Lease Statement PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating Lease Statement PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
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

  // Month navigation function for Current Invoice tab
  const navigateMonth = (direction: 'previous' | 'next') => {
    if (isNavigating) return; // Prevent multiple clicks during navigation
    
    setIsNavigating(true);
    const currentDate = new Date(issueDate);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1);
    
    // Auto-save current invoice before navigating (silent save)
    if (hasInvoice) {
      saveInvoice();
    }
    
    // Determine if invoice exists for new month (more predictable pattern)
    // Recent months (last 6 months) are more likely to have invoices
    const now = new Date();
    const monthsFromNow = (now.getFullYear() - newDate.getFullYear()) * 12 + (now.getMonth() - newDate.getMonth());
    
    // Only past 6 months and current month have invoices
    const newMonthHasInvoice = monthsFromNow >= 0 && monthsFromNow <= 6;
    
    // Batch all state updates together for smoother rendering
    const monthName = newDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const newInvoiceNumber = `INV-${newDate.getFullYear()}${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Update all states in one batch
    const updates = () => {
      // Fix timezone issue - use local date format instead of ISO string
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const newDateString = `${year}-${month}-${day}`;
      

      
      setIssueDate(newDateString);
      setHasInvoice(newMonthHasInvoice);
      
      if (newMonthHasInvoice) {
        // Load realistic invoice data for existing months
        setTitle(`Invoice for ${monthName}`);
        setInvoiceNumber(newInvoiceNumber);
        // Use seeded random based on month/year for consistent utilities amount
        const monthSeed = newDate.getFullYear() * 12 + newDate.getMonth();
        const monthRng = new SeededRandom(monthSeed);
        const utilitiesAmount = Math.floor(monthRng.next() * 800) + 400; // Random utilities 400-1200
        setLineItems([
          { 
            description: 'Monthly Rent', 
            category: 'Rent', 
            quantity: 1, 
            price: lease.monthly_rent, 
            total: lease.monthly_rent 
          },
          { 
            description: 'Utilities & Services', 
            category: 'Utilities', 
            quantity: 1, 
            price: utilitiesAmount, 
            total: utilitiesAmount 
          },
        ]);
        setFromDetails('Your Company Name\nYour Address\nCity, State ZIP\nPhone: (123) 456-7890\nEmail: info@company.com');
        setToDetails(`${tenant?.name || lease.tenant_name}\n${property?.address || 'Property Address'}`);
        setBankInfo('Bank: First National Bank\nAccount Name: Property Management\nAccount Number: 12345678901\nBranch Code: 250655');
        setNotes('Payment due within 30 days.');
      } else {
        // Reset for future months (no invoice exists)
        setTitle(`Invoice for ${monthName}`);
        setInvoiceNumber(newInvoiceNumber);
        setLineItems([
          { 
            description: 'Monthly Rent', 
            category: 'Rent', 
            quantity: 1, 
            price: lease.monthly_rent, 
            total: lease.monthly_rent 
          }
        ]);
        setFromDetails('Your Company Name\nYour Address\nCity, State ZIP\nPhone: (123) 456-7890\nEmail: info@company.com');
        setToDetails(`${tenant?.name || lease.tenant_name}\n${property?.address || 'Property Address'}`);
        setBankInfo('');
        setNotes('');
      }
    };
    
    // Add slight delay for smooth transition with error handling
    setTimeout(() => {
      try {
        updates();
      } catch (error) {
        console.error('Navigation error:', error);
      } finally {
        setIsNavigating(false);
      }
    }, 150);
  };

  // Auto-save function (silent)
  const saveInvoice = () => {
    // Mock save functionality - silent save during navigation
    console.log('Invoice auto-saved for month:', new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  };

  // Totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxRate = 10; // 10% VAT as shown in template
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Create Bitcoin Lightning invoice for current month's rent
  const createBitcoinInvoice = async () => {
    try {
      setDownloading(true);
      
      // Get Strike API settings from localStorage if available
      const strikeApiKey = localStorage.getItem('strikeApiKey');
      const strikeWebhookSecret = localStorage.getItem('strikeWebhookSecret'); 
      const paymentNotificationEmail = localStorage.getItem('paymentNotificationEmail');
      
      const requestBody: any = {
        tenant_id: lease.tenant_code,
        amount: total.toFixed(2),
        invoice_month: new Date(issueDate).toISOString().slice(0, 7), // Format: YYYY-MM
        description: `${title} - ${tenant?.name || lease.tenant_name}`
      };
      
      // Include Strike settings if configured
      if (strikeApiKey) {
        requestBody.strike_api_key = strikeApiKey;
      }
      if (strikeWebhookSecret) {
        requestBody.strike_webhook_secret = strikeWebhookSecret;
      }
      if (paymentNotificationEmail) {
        requestBody.payment_notification_email = paymentNotificationEmail;
      }
      
      const response = await fetch(`${API_BASE_URL}/payments/create-invoice/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getAccessToken()}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const invoice = await response.json();
      const paymentUrl = `${window.location.origin}/pay/${lease.tenant_code}/invoice/${invoice.id}`;
      
      toast.success('Bitcoin payment invoice created! Payment link ready.');
      return paymentUrl;
      
    } catch (error) {
      console.error('Error creating Bitcoin invoice:', error);
      toast.error('Failed to create Bitcoin payment option');
      return null;
    } finally {
      setDownloading(false);
    }
  };

  // PDF download handler
  const handleDownloadPDF = async () => {
    console.log('Starting PDF download...');
    console.log('Invoice ref current:', invoiceRef.current);
    
    if (!invoiceRef.current) {
      console.error('Invoice ref is not available');
      alert('PDF element not found. Please try again.');
      return;
    }
    
    setDownloading(true);
    
    try {
      // Make the element visible temporarily for capture
      const element = invoiceRef.current;
      const originalStyle = element.style.cssText;
      
      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.visibility = 'visible';
      element.style.zIndex = '9999';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 794,
        height: 1123,
        ignoreElements: (el) => {
          return el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `invoice_${invoiceNumber}_${new Date(issueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
      pdf.save(filename);
      
      // Restore original styling
      element.style.cssText = originalStyle;
      
      console.log('PDF downloaded successfully!');
      toast.success('Invoice PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Ensure styling is restored even on error
      if (invoiceRef.current) {
        invoiceRef.current.style.position = 'absolute';
        invoiceRef.current.style.left = '-9999px';
        invoiceRef.current.style.visibility = 'hidden';
      }
    } finally {
      setDownloading(false);
    }
  };

  // Simple PDF generation without html2canvas (fallback)  
  const handleDownloadSimplePDF = async () => {
    console.log('Starting professional PDF generation...');
    setDownloading(true);
    
    // Generate Bitcoin payment URL for PDF
    const bitcoinPaymentUrl = await createBitcoinInvoice();
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;
      
      // Logo section (dark rectangle)
      doc.setFillColor(64, 64, 64); // Dark gray
      doc.rect(20, yPos, 40, 25, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('logo', 40, yPos + 16, { align: 'center' });
      
      // Company info section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('To', 70, yPos + 5);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(tenant?.name || lease.tenant_name, 70, yPos + 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Phone: 07790 046362', 70, yPos + 18);
      doc.text(`Address: ${property?.address || 'Unit 2A, Property Address'}`, 70, yPos + 22);
      doc.text('City Goes Here, 8001', 70, yPos + 26);
      
      yPos += 40;
      
      // Summary box (light gray)
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, pageWidth - 40, 15, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 30, yPos + 6);
      doc.text('Total Due:', 80, yPos + 6);
      doc.text('Account Net', 130, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(issueDate).toLocaleDateString('en-GB'), 30, yPos + 10);
      doc.text(`$${formatCurrency(total)}`, 80, yPos + 10);
      doc.text(`$${formatCurrency(total)}`, 130, yPos + 10);
      
      yPos += 25;
      
      // Invoice title and number
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 20, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - 20, yPos, { align: 'right' });
      
      yPos += 20;
      
      // Table header
      doc.setFillColor(64, 64, 64);
      doc.rect(20, yPos, pageWidth - 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEM DESCRIPTION', 25, yPos + 6);
      doc.text('UNIT PRICE', 100, yPos + 6, { align: 'right' });
      doc.text('QTY', 120, yPos + 6, { align: 'center' });
      doc.text('TOTAL', pageWidth - 25, yPos + 6, { align: 'right' });
      
      yPos += 10;
      
      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      lineItems.filter(item => item.description.trim() !== '').forEach((item, idx) => {
        const bgColor = idx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(20, yPos, pageWidth - 40, 15, 'F');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(item.description, 25, yPos + 6);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(item.category || 'Service description', 25, yPos + 10);
        
        doc.setFontSize(8);
        doc.text(`$${formatCurrency(item.price)}`, 100, yPos + 8, { align: 'right' });
        doc.text(item.quantity.toString(), 120, yPos + 8, { align: 'center' });
        doc.text(`$${formatCurrency(item.total)}`, pageWidth - 25, yPos + 8, { align: 'right' });
        
        yPos += 15;
      });
      
      yPos += 10;
      
      // Bottom section - Payment method and summary
      const bottomY = yPos;
      
      // Payment method (left side)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method', 25, bottomY);
      doc.setFont('helvetica', 'normal');
      doc.text(bankInfo ? bankInfo.split('\n').slice(0, 2).join('\n') : 'Bank transfer details available on request', 25, bottomY + 6, { maxWidth: 80 });
      
      // Bitcoin payment option
      if (bitcoinPaymentUrl) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 140, 0); // Orange color for Bitcoin
        doc.text('⚡ Pay with Bitcoin', 25, bottomY + 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 255); // Blue color for URL
        doc.textWithLink('Click here to pay with Bitcoin Lightning', 25, bottomY + 20, { url: bitcoinPaymentUrl });
        doc.setTextColor(0, 0, 0); // Reset to black
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Transfer • Cash • Cheque • Bitcoin', 25, bottomY + 26);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Transfer • Cash • Cheque', 25, bottomY + 15);
      }
      
      // Summary (right side)
      const summaryX = 130;
      doc.setFillColor(240, 240, 240);
      doc.rect(summaryX, bottomY, 60, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Sub Total', summaryX + 2, bottomY + 5);
      doc.text(`$${formatCurrency(subtotal)}`, summaryX + 58, bottomY + 5, { align: 'right' });
      
      doc.text('Tax Vat 10%', summaryX + 2, bottomY + 12);
      doc.text(`$${formatCurrency(tax)}`, summaryX + 58, bottomY + 12, { align: 'right' });
      
      doc.setFillColor(64, 64, 64);
      doc.rect(summaryX, bottomY + 15, 60, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('GRAND TOTAL', summaryX + 2, bottomY + 22);
      doc.text(`$${formatCurrency(total)}`, summaryX + 58, bottomY + 22, { align: 'right' });
      
      // Footer section
      const footerY = bottomY + 35;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', 25, footerY);
      doc.setFont('helvetica', 'normal');
      doc.text(notes || 'Payment due within 30 days of invoice date.\nLate payments may incur additional charges.', 25, footerY + 5, { maxWidth: 80 });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Contact Us', 25, footerY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text('📍 Property Management Office', 25, footerY + 25);
      doc.text('📞 +27 82 123 4567', 25, footerY + 29);
      doc.text('✉ info@propertymanagement.co.za', 25, footerY + 33);
      
      // Right side - Signature and Thank you
      const rightX = 130;
      doc.setDrawColor(0, 0, 0);
      doc.line(rightX, footerY + 10, rightX + 40, footerY + 10); // Signature line
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPERTY MANAGER', rightX + 20, footerY + 15, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Manager', rightX + 20, footerY + 19, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('THANK YOU FOR', rightX + 20, footerY + 28, { align: 'center' });
      doc.text('YOUR BUSINESS', rightX + 20, footerY + 33, { align: 'center' });
      
      const filename = `invoice_${invoiceNumber}_${new Date(issueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
      doc.save(filename);
      
      console.log('Professional PDF generated successfully!');
      toast.success('Professional invoice PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating professional PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  // Status options
  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft', color: 'text-gray-500', icon: PencilIcon },
    { value: 'sent', label: 'Sent', color: 'text-blue-500', icon: ArrowRightIcon },
    { value: 'paid', label: 'Paid', color: 'text-green-500', icon: CheckIcon },
    { value: 'overdue', label: 'Overdue', color: 'text-red-500', icon: ExclamationTriangleIcon },
  ];

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
                <BanknotesIcon className="h-5 w-5 mr-2 text-blue-400" /> {formatCurrency((() => {
                  const transactions = getLeaseTransactions(lease);
                  return Math.max(0, transactions[transactions.length - 1]?.balance || 0);
                })())}
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
                    <button 
                      onClick={handleExportFinancialStatement}
                      className="inline-flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Export PDF
                    </button>
                    <button 
                      onClick={() => {
                        console.log('Debug: Testing Lease Statement PDF Export');
                        console.log('Lease data:', lease);
                        console.log('Tenant data:', tenant);
                        console.log('Property data:', property);
                        const savedLogo = localStorage.getItem('companyLogo');
                        console.log('Company logo available:', savedLogo ? 'Yes' : 'No');
                        if (savedLogo) {
                          console.log('Logo data length:', savedLogo.length);
                        }
                        handleExportFinancialStatement();
                      }}
                      className="inline-flex items-center px-3 py-2 border border-red-500 rounded-md text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20"
                    >
                      🧪 Test Export
                    </button>
                  </div>
                </div>
                
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    const transactions = getLeaseTransactions(lease);
                    const totalCharged = transactions.filter(t => t.type === 'charge').reduce((sum, t) => sum + t.amount, 0);
                    const totalPaid = Math.abs(transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0));
                    const outstanding = Math.max(0, transactions[transactions.length - 1]?.balance || 0);
                    
                    return (
                      <>
                        <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                          <p className="text-muted-foreground text-sm mb-1">Total Charged</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(totalCharged)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                          <p className="text-muted-foreground text-sm mb-1">Total Paid</p>
                          <p className="text-xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                          <p className="text-muted-foreground text-sm mb-1">Outstanding</p>
                          <p className="text-xl font-bold text-red-400">{formatCurrency(outstanding)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/20 rounded-lg p-4 text-center">
                          <p className="text-muted-foreground text-sm mb-1">Deposit Held</p>
                          <p className="text-xl font-bold text-purple-400">{formatCurrency(lease.deposit)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Transaction History */}
                <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
                  <div className="bg-white/10 px-4 py-3 border-b border-white/20">
                    <h4 className="text-md font-medium text-white">Transaction History</h4>
                  </div>
                  
                  <div className="divide-y divide-white/10">
                    {/* Lease-specific transactions */}
                    {getLeaseTransactions(lease).map((transaction) => (
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
              <div className="space-y-6">
                {/* Header with Month Navigation */}
                <div className={`bg-white/10 border border-white/20 rounded-lg p-6 transition-opacity duration-200 ${isNavigating ? 'opacity-50' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => navigateMonth('previous')}
                        disabled={isNavigating}
                        className={`p-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isNavigating ? 'animate-pulse' : ''}`}
                        title="Previous Month"
                      >
                        <ArrowLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="text-white font-medium min-w-[120px] text-center">
                        {new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button 
                        onClick={() => navigateMonth('next')}
                        disabled={isNavigating}
                        className={`p-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isNavigating ? 'animate-pulse' : ''}`}
                        title="Next Month"
                      >
                        <ArrowRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Loading Overlay */}
                  {isNavigating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-lg">
                      <div className="flex items-center space-x-2 text-white">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Loading...</span>
                      </div>
                    </div>
                  )}

                  {hasInvoice ? (
                    <div className="space-y-6">
                      {/* Status and Actions */}
                      <div className="flex items-center justify-between">
                        <div className="relative">
                          <button 
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className="flex items-center space-x-2 px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
                          >
                            <span className="capitalize">{status}</span>
                            <ChevronDownIcon className="h-4 w-4" />
                          </button>
                          {/* Download button next to status */}
                          <button
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            className="flex items-center px-3 py-2 border border-green-500 rounded-md text-sm font-medium text-green-500 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50 ml-2"
                            title="Download PDF"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            {downloading ? 'Generating...' : 'Download'}
                          </button>
                          <button 
                            onClick={handleDownloadSimplePDF}
                            disabled={downloading}
                            className="flex items-center px-3 py-2 border border-blue-500 rounded-md text-sm font-medium text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-colors disabled:opacity-50 ml-2"
                            title="Download Simple PDF (Fallback)"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Professional PDF
                          </button>
                          <button
                            onClick={async () => {
                              const bitcoinPaymentUrl = await createBitcoinInvoice();
                              if (bitcoinPaymentUrl) {
                                window.open(bitcoinPaymentUrl, '_blank');
                              }
                            }}
                            disabled={downloading}
                            className="flex items-center px-3 py-2 border border-orange-500 rounded-md text-sm font-medium text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 transition-colors disabled:opacity-50 ml-2"
                            title="Pay with Bitcoin Lightning"
                          >
                            <BoltIcon className="h-4 w-4 mr-2" />
                            Pay with Bitcoin
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
                      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/10 border border-white/20 rounded-lg p-6 transition-opacity duration-200 ${isNavigating ? 'opacity-50' : 'opacity-100'}`}>
                        <div>
                          <label className="block text-muted-foreground/70 text-sm mb-2">Issue Date</label>
                          <input 
                            type="date" 
                            value={issueDate} 
                            onChange={e => setIssueDate(e.target.value)}
                            className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-muted-foreground/70 text-sm mb-2">Due Date</label>
                          <input 
                            type="date" 
                            value={dueDate} 
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-muted-foreground/70 text-sm mb-2">Invoice Number</label>
                          <input 
                            type="text" 
                            value={invoiceNumber} 
                            onChange={e => setInvoiceNumber(e.target.value)}
                            className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white"
                          />
                        </div>
                      </div>

                      {/* From/To Details */}
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-200 ${isNavigating ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                          <label className="block text-muted-foreground/70 text-sm mb-2">From</label>
                          <textarea 
                            className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white min-h-[100px]" 
                            value={fromDetails} 
                            onChange={e => setFromDetails(e.target.value)}
                            placeholder="Your company details"
                          />
                        </div>
                        <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                          <label className="block text-muted-foreground/70 text-sm mb-2">To</label>
                          <textarea 
                            className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white min-h-[100px]" 
                            value={toDetails} 
                            onChange={e => setToDetails(e.target.value)}
                            placeholder="Customer details"
                          />
                        </div>
                      </div>

                      {/* Line Items */}
                      <div className={`bg-white/10 border border-white/20 rounded-lg p-6 transition-opacity duration-200 ${isNavigating ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-white">Items</h4>
                          <button 
                            onClick={() => setLineItems([...lineItems, { description: '', category: '', quantity: 1, price: 0, total: 0 }])}
                            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Item
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {lineItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-white/5 rounded-lg">
                              <div className="md:col-span-2">
                                <input 
                                  type="text" 
                                  placeholder="Description" 
                                  value={item.description}
                                  onChange={e => {
                                    const newItems = [...lineItems];
                                    newItems[index].description = e.target.value;
                                    setLineItems(newItems);
                                  }}
                                  className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <input 
                                  type="text" 
                                  placeholder="Category" 
                                  value={item.category}
                                  onChange={e => {
                                    const newItems = [...lineItems];
                                    newItems[index].category = e.target.value;
                                    setLineItems(newItems);
                                  }}
                                  className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <input 
                                  type="number" 
                                  placeholder="Qty" 
                                  value={item.quantity}
                                  onChange={e => {
                                    const newItems = [...lineItems];
                                    newItems[index].quantity = parseInt(e.target.value) || 1;
                                    newItems[index].total = newItems[index].quantity * newItems[index].price;
                                    setLineItems(newItems);
                                  }}
                                  className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white text-sm"
                                />
                              </div>
                              <div>
                                <input 
                                  type="number" 
                                  placeholder="Price" 
                                  value={item.price}
                                  onChange={e => {
                                    const newItems = [...lineItems];
                                    newItems[index].price = parseFloat(e.target.value) || 0;
                                    newItems[index].total = newItems[index].quantity * newItems[index].price;
                                    setLineItems(newItems);
                                  }}
                                  className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white text-sm"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-white font-medium">{item.total.toFixed(2)}</span>
                                {lineItems.length > 1 && (
                                  <button 
                                    onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))}
                                    className="text-red-400 hover:text-red-300 ml-2"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-6 flex justify-end">
                          <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="text-white">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax (10%):</span>
                              <span className="text-white">${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t border-white/20 pt-2">
                              <span className="text-white">Total:</span>
                              <span className="text-white">${total.toFixed(2)}</span>
                            </div>
                          </div>
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
                  ) : (
                    <div className="text-center py-12">
                      <DocumentTextIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No Invoice for This Month</h3>
                      <p className="text-muted-foreground/70 mb-4">There is no invoice data available for {new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
                      <button 
                        onClick={() => {
                          setHasInvoice(true);
                          setTitle(`Invoice for ${new Date(issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
                          setLineItems([
                            { 
                              description: 'Monthly Rent', 
                              category: 'Rent', 
                              quantity: 1, 
                              price: lease.monthly_rent, 
                              total: lease.monthly_rent 
                            }
                          ]);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Invoice
                      </button>
                    </div>
                  )}
                </div>

                {/* Hidden PDF Content - Completely isolated from CSS */}
                <div 
                  ref={invoiceRef} 
                  style={{ 
                    position: 'absolute',
                    left: '-9999px',
                    top: '0',
                    visibility: 'hidden'
                  }}
                >
                  <div style={{ 
                    backgroundColor: '#ffffff', 
                    color: '#000000', 
                    padding: '20px', 
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    minHeight: '297mm',
                    width: '210mm',
                    boxSizing: 'border-box',
                    lineHeight: '1.4'
                  }}>
                    {/* Header Section */}
                    <div style={{ display: 'flex', marginBottom: '20px' }}>
                      {/* Dark Logo Section */}
                      <div style={{ 
                        backgroundColor: '#404040', 
                        width: '120px', 
                        height: '80px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginRight: '20px'
                      }}>
                        <div style={{ 
                          color: '#ffffff', 
                          fontSize: '24px', 
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          logo
                        </div>
                      </div>
                      
                      {/* Company Info Section */}
                      <div style={{ flex: 1, paddingLeft: '20px' }}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>To</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                          {tenant?.name || lease.tenant_name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#888', lineHeight: '1.3' }}>
                          <div>Phone: 07790 046362</div>
                          <div>Address: {property?.address || 'Unit 2A, Property Address'}</div>
                          <div>City Goes Here, 8001</div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div style={{ 
                      backgroundColor: '#f0f0f0', 
                      padding: '10px', 
                      marginBottom: '20px',
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'center'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Date</div>
                        <div style={{ fontSize: '9px' }}>{new Date(issueDate).toLocaleDateString('en-GB')}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Total Due:</div>
                        <div style={{ fontSize: '9px' }}>${total.toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Account Net</div>
                        <div style={{ fontSize: '9px' }}>${total.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Invoice Title and Number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                      <div style={{ fontSize: '36px', fontWeight: 'bold' }}>INVOICE</div>
                      <div style={{ fontSize: '12px' }}>Invoice No: {invoiceNumber}</div>
                    </div>

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#404040', color: '#ffffff' }}>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' }}>ITEM DESCRIPTION</th>
                          <th style={{ padding: '10px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold' }}>UNIT PRICE</th>
                          <th style={{ padding: '10px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>QTY</th>
                          <th style={{ padding: '10px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.filter(item => item.description.trim() !== '').map((item, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f5f5f5' : '#ffffff' }}>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{item.description}</div>
                              <div style={{ fontSize: '8px', color: '#888' }}>{item.category || 'Service description'}</div>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '9px' }}>${item.price.toFixed(2)}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '9px' }}>{item.quantity}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '9px' }}>${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Bottom Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Payment Method */}
                      <div style={{ width: '45%' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>Payment Method</h4>
                        <div style={{ fontSize: '8px', color: '#888', marginBottom: '8px', lineHeight: '1.3' }}>
                          {bankInfo ? bankInfo.split('\n').slice(0, 2).join('\n') : 'Bank transfer details available on request'}
                        </div>
                        <div style={{ fontSize: '8px', fontWeight: 'bold' }}>
                          Bank Transfer • Cash • Cheque
                        </div>
                      </div>

                      {/* Summary */}
                      <div style={{ width: '45%' }}>
                        <div style={{ 
                          backgroundColor: '#f0f0f0', 
                          padding: '8px', 
                          marginBottom: '2px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Sub Total</span>
                          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ 
                          padding: '8px', 
                          marginBottom: '2px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '10px' }}>Tax Vat 10%</span>
                          <span style={{ fontSize: '10px' }}>${tax.toFixed(2)}</span>
                        </div>
                        <div style={{ 
                          backgroundColor: '#404040', 
                          color: '#ffffff',
                          padding: '12px', 
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>GRAND TOTAL</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      {/* Left Side - Terms and Contact */}
                      <div style={{ width: '45%' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>Terms:</h4>
                        <div style={{ fontSize: '8px', color: '#888', marginBottom: '20px', lineHeight: '1.3' }}>
                          {notes || 'Payment due within 30 days of invoice date.\nLate payments may incur additional charges.'}
                        </div>
                        
                        <h4 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>Contact Us</h4>
                        <div style={{ fontSize: '8px', color: '#888', lineHeight: '1.3' }}>
                          <div>📍 Property Management Office</div>
                          <div>📞 +27 82 123 4567</div>
                          <div>✉ info@propertymanagement.co.za</div>
                        </div>
                      </div>

                      {/* Right Side - Signature and Thank You */}
                      <div style={{ width: '45%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '5px' }}>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>PROPERTY MANAGER</div>
                          <div style={{ fontSize: '8px', color: '#888' }}>Manager</div>
                        </div>
                        
                        <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                          <div>THANK YOU FOR</div>
                          <div>YOUR BUSINESS</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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