/**
 * Enhanced Lease Detail Page with Real Invoice System Integration
 * This is the updated version that integrates with the comprehensive backend invoice system
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { API_BASE_URL } from '@/lib/auth';
import { authService } from '@/lib/auth';
import LeaseAttachments from '@/components/LeaseAttachments';
import LeaseNotes from '@/components/LeaseNotes';
import { LeaseAPI } from '@/lib/lease-api';
import { 
  enhancedInvoiceAPI, 
  EnhancedInvoice, 
  InvoiceLineItem as EnhancedLineItem,
  InvoiceDraft,
  TenantCreditBalance,
  RecurringCharge,
  PaymentAllocation 
} from '@/lib/enhanced-invoice-api';

// Enhanced interfaces that match the backend
interface Lease {
  id: number;
  property: {
    id: string;
    property_code: string;
    name: string;
    address: string;
    property_type: 'residential' | 'commercial';
  };
  tenant: {
    id: number;
    tenant_code: string;
    name: string;
    email: string;
  };
  landlord?: {
    id: string;
    name: string;
    email: string;
  };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  lease_type: string;
  rental_frequency: string;
  rent_due_day: number;
  late_fee_type: string;
  late_fee_percentage: number;
  late_fee_amount: number;
  grace_period_days: number;
  lease_duration_months: number;
  auto_renew: boolean;
  notice_period_days: number;
  pro_rata_amount: number;
  invoice_date: string;
  management_fee: number;
  procurement_fee: number;
  terms: string;
  notes: string;
  created_at: string;
  updated_at: string;
  attachments_count: number;
  // Enhanced fields for rent escalation
  escalation_type?: 'percentage' | 'amount' | 'none';
  escalation_percentage?: number;
  escalation_amount?: number;
  escalation_date?: string;
  next_escalation_date?: string;
}

export default function EnhancedLeaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  // Create API instances
  const leaseAPI = new LeaseAPI();
  
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("Lease");
  const [activeFinancialTab, setActiveFinancialTab] = useState("Statement");
  
  // Enhanced Invoice state - now uses real backend data
  const [currentInvoice, setCurrentInvoice] = useState<EnhancedInvoice | null>(null);
  const [currentDraft, setCurrentDraft] = useState<InvoiceDraft | null>(null);
  const [currentBillingMonth, setCurrentBillingMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [hasInvoice, setHasInvoice] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [vatRate, setVatRate] = useState(15); // Default VAT rate
  
  // Credit balance state
  const [tenantCreditBalance, setTenantCreditBalance] = useState<TenantCreditBalance | null>(null);
  
  // Recurring charges state
  const [recurringCharges, setRecurringCharges] = useState<RecurringCharge[]>([]);
  
  // Payment allocation state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  
  // PDF generation state
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Fetch real lease data
  useEffect(() => {
    const fetchLease = async () => {
      try {
        setLoading(true);
        const leaseData = await leaseAPI.getLease(parseInt(leaseId));
        setLease(leaseData);
        console.log('Fetched enhanced lease data:', leaseData);
        
        // Load VAT rate
        try {
          const vatData = await enhancedInvoiceAPI.getVATRate();
          setVatRate(vatData.vat_rate);
        } catch (vatError) {
          console.warn('Could not load VAT rate, using default:', vatError);
        }
        
      } catch (err) {
        console.error('Error fetching lease:', err);
        setError('Failed to load lease data');
      } finally {
        setLoading(false);
      }
    };

    if (leaseId) {
      fetchLease();
    }
  }, [leaseId]);

  // Load current invoice/draft when lease or billing month changes
  useEffect(() => {
    const loadCurrentInvoice = async () => {
      if (!lease) return;
      
      setIsLoadingInvoice(true);
      try {
        const response = await enhancedInvoiceAPI.navigateToMonth(lease.id, currentBillingMonth);
        
        if (response.has_invoice && response.invoice) {
          // Existing invoice
          setCurrentInvoice(response.invoice);
          setCurrentDraft(null);
          setHasInvoice(true);
          setIsDraft(false);
        } else if (response.invoice_data) {
          // Draft data
          setCurrentInvoice(null);
          setCurrentDraft(response.invoice_data);
          setHasInvoice(true);
          setIsDraft(true);
        } else {
          // No invoice or draft
          setCurrentInvoice(null);
          setCurrentDraft(null);
          setHasInvoice(false);
          setIsDraft(false);
        }
      } catch (error) {
        console.error('Error loading invoice:', error);
        toast.error('Failed to load invoice data');
        setHasInvoice(false);
      } finally {
        setIsLoadingInvoice(false);
      }
    };

    if (activeFinancialTab === "Current invoice") {
      loadCurrentInvoice();
    }
  }, [lease, currentBillingMonth, activeFinancialTab]);

  // Load tenant credit balance
  useEffect(() => {
    const loadCreditBalance = async () => {
      if (!lease?.tenant?.id) return;
      
      try {
        const balance = await enhancedInvoiceAPI.getTenantCreditBalance(lease.tenant.id);
        setTenantCreditBalance(balance);
      } catch (error) {
        console.warn('Could not load tenant credit balance:', error);
      }
    };

    if (lease) {
      loadCreditBalance();
    }
  }, [lease]);

  // Load recurring charges
  useEffect(() => {
    const loadRecurringCharges = async () => {
      if (!lease?.id) return;
      
      try {
        const charges = await enhancedInvoiceAPI.getRecurringCharges(lease.id);
        setRecurringCharges(charges);
      } catch (error) {
        console.warn('Could not load recurring charges:', error);
      }
    };

    if (lease && activeFinancialTab === "Recurring charges") {
      loadRecurringCharges();
    }
  }, [lease, activeFinancialTab]);

  // Enhanced month navigation with backend integration
  const navigateMonth = async (direction: 'previous' | 'next') => {
    if (isNavigating || !lease) return;
    
    setIsNavigating(true);
    
    try {
      // Save current draft if it exists
      if (isDraft && currentDraft) {
        await saveDraft();
      }
      
      // Calculate new billing month
      const currentDate = new Date(currentBillingMonth);
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1);
      const newBillingMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
      
      setCurrentBillingMonth(newBillingMonth);
      
      // The useEffect will handle loading the new invoice/draft
      
    } catch (error) {
      console.error('Error navigating month:', error);
      toast.error('Failed to navigate to month');
    } finally {
      setTimeout(() => setIsNavigating(false), 500); // Small delay for UX
    }
  };

  // Save draft function
  const saveDraft = async () => {
    if (!lease || !currentDraft) return;
    
    try {
      await enhancedInvoiceAPI.saveDraft(lease.id, currentBillingMonth, currentDraft);
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  // Create invoice from draft
  const createInvoiceFromDraft = async () => {
    if (!lease || !currentDraft) return;
    
    try {
      const invoiceData = {
        ...currentDraft,
        lease: lease.id,
        tenant: lease.tenant.id,
        property: lease.property.id,
        landlord: lease.landlord?.id,
        billing_period_start: currentBillingMonth,
        billing_period_end: (() => {
          const start = new Date(currentBillingMonth);
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 0); // Last day of month
          return end.toISOString().split('T')[0];
        })(),
        status: 'draft'
      };
      
      const newInvoice = await enhancedInvoiceAPI.createInvoiceFromDraft(invoiceData);
      setCurrentInvoice(newInvoice);
      setCurrentDraft(null);
      setIsDraft(false);
      toast.success('Invoice created successfully');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  // Send invoice
  const sendInvoice = async () => {
    if (!currentInvoice) return;
    
    try {
      const response = await enhancedInvoiceAPI.sendInvoice(currentInvoice.id);
      setCurrentInvoice(response.invoice);
      toast.success('Invoice sent and locked successfully');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  // Generate initial invoice
  const generateInitialInvoice = async () => {
    if (!lease) return;
    
    try {
      const response = await enhancedInvoiceAPI.generateInitialInvoice(lease.id);
      setCurrentInvoice(response.invoice);
      setHasInvoice(true);
      setIsDraft(false);
      toast.success('Initial invoice generated successfully');
    } catch (error) {
      console.error('Error generating initial invoice:', error);
      toast.error('Failed to generate initial invoice');
    }
  };

  // Update line item in current invoice/draft
  const updateLineItem = (index: number, field: keyof EnhancedLineItem, value: any) => {
    if (currentInvoice) {
      // Update existing invoice (if not locked)
      if (currentInvoice.status === 'locked' || currentInvoice.status === 'sent') {
        toast.error('Cannot edit locked invoice');
        return;
      }
      
      const updatedLineItems = [...currentInvoice.line_items];
      updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
      
      // Recalculate total for the line item
      if (field === 'quantity' || field === 'unit_price') {
        updatedLineItems[index].total = updatedLineItems[index].quantity * updatedLineItems[index].unit_price;
      }
      
      setCurrentInvoice({
        ...currentInvoice,
        line_items: updatedLineItems,
        ...enhancedInvoiceAPI.calculateInvoiceTotals(updatedLineItems, lease?.property?.property_type === 'commercial' ? vatRate : 0)
      });
    } else if (currentDraft) {
      // Update draft
      const updatedLineItems = [...currentDraft.line_items];
      updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
      
      // Recalculate total for the line item
      if (field === 'quantity' || field === 'unit_price') {
        updatedLineItems[index].total = updatedLineItems[index].quantity * updatedLineItems[index].unit_price;
      }
      
      const totals = enhancedInvoiceAPI.calculateInvoiceTotals(updatedLineItems, lease?.property?.property_type === 'commercial' ? vatRate : 0);
      
      setCurrentDraft({
        ...currentDraft,
        line_items: updatedLineItems,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total
      });
    }
  };

  // Add new line item
  const addLineItem = () => {
    const newItem: EnhancedLineItem = {
      description: '',
      category: 'Other',
      quantity: 1,
      unit_price: 0,
      total: 0
    };

    if (currentInvoice) {
      setCurrentInvoice({
        ...currentInvoice,
        line_items: [...currentInvoice.line_items, newItem]
      });
    } else if (currentDraft) {
      setCurrentDraft({
        ...currentDraft,
        line_items: [...currentDraft.line_items, newItem]
      });
    }
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (currentInvoice) {
      const updatedLineItems = currentInvoice.line_items.filter((_, i) => i !== index);
      setCurrentInvoice({
        ...currentInvoice,
        line_items: updatedLineItems,
        ...enhancedInvoiceAPI.calculateInvoiceTotals(updatedLineItems, lease?.property?.property_type === 'commercial' ? vatRate : 0)
      });
    } else if (currentDraft) {
      const updatedLineItems = currentDraft.line_items.filter((_, i) => i !== index);
      const totals = enhancedInvoiceAPI.calculateInvoiceTotals(updatedLineItems, lease?.property?.property_type === 'commercial' ? vatRate : 0);
      
      setCurrentDraft({
        ...currentDraft,
        line_items: updatedLineItems,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total
      });
    }
  };

  // Process payment allocation
  const processPayment = async () => {
    if (!lease || !paymentAmount) return;
    
    try {
      const paymentData: PaymentAllocation = {
        tenant_id: lease.tenant.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: paymentReference,
        notes: paymentNotes
      };
      
      const response = await enhancedInvoiceAPI.allocatePayment(paymentData);
      toast.success(response.message);
      
      // Refresh invoice and credit balance
      if (currentInvoice) {
        const updatedInvoice = await enhancedInvoiceAPI.getInvoice(currentInvoice.id);
        setCurrentInvoice(updatedInvoice);
      }
      
      const updatedBalance = await enhancedInvoiceAPI.getTenantCreditBalance(lease.tenant.id);
      setTenantCreditBalance(updatedBalance);
      
      // Reset payment form
      setPaymentAmount(0);
      setPaymentReference('');
      setPaymentNotes('');
      setShowPaymentModal(false);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  };

  // Handle tab switching
  const handleTabClick = (tab: string) => setActiveTab(tab);
  const handleFinancialTabClick = (tab: string) => setActiveFinancialTab(tab);

  // Utility functions
  const formatCurrency = (amount: number) => enhancedInvoiceAPI.formatCurrency(amount);
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-muted text-muted-foreground';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-orange-100 text-orange-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading and error states
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

  const property = lease.property;
  const landlord = lease.landlord;
  const tenant = lease.tenant;

  return (
    <DashboardLayout title={`Lease Details - ${property?.name || 'Unknown Property'}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {property?.name || 'Unknown Property'}
              </h1>
              <p className="text-muted-foreground">
                Lease ID: {lease.id} • {tenant?.name || 'Unknown Tenant'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lease.status)}`}>
                {lease.status}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
          {[
            { id: 'Lease', label: 'Lease', icon: DocumentTextIcon },
            { id: 'Financials', label: 'Financials', icon: BanknotesIcon },
            { id: 'Tenant', label: 'Tenant', icon: UserIcon },
            { id: 'Property', label: 'Property', icon: BuildingOfficeIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
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

              {/* Current Invoice Tab - Enhanced with Real Backend Integration */}
              {activeFinancialTab === "Current invoice" && (
                <div className="space-y-6">
                  {/* Header with Month Navigation */}
                  <div className={`bg-white/10 border border-white/20 rounded-lg p-6 transition-opacity duration-200 ${isNavigating ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        {new Date(currentBillingMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Invoice
                      </h3>
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
                          {new Date(currentBillingMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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

                    {/* Loading State */}
                    {(isLoadingInvoice || isNavigating) && (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-2 text-white">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span>Loading...</span>
                        </div>
                      </div>
                    )}

                    {/* Invoice Content */}
                    {!isLoadingInvoice && !isNavigating && (
                      <>
                        {hasInvoice ? (
                          <div className="space-y-6">
                            {/* Invoice Status and Actions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  currentInvoice ? getInvoiceStatusColor(currentInvoice.status) : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {isDraft ? 'Draft' : currentInvoice?.status || 'Unknown'}
                                </div>
                                {tenantCreditBalance && tenantCreditBalance.credit_balance > 0 && (
                                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    Credit: {formatCurrency(tenantCreditBalance.credit_balance)}
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                {isDraft && (
                                  <>
                                    <button
                                      onClick={saveDraft}
                                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                                    >
                                      Save Draft
                                    </button>
                                    <button
                                      onClick={createInvoiceFromDraft}
                                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                                    >
                                      Create Invoice
                                    </button>
                                  </>
                                )}
                                {currentInvoice && currentInvoice.status === 'draft' && (
                                  <button
                                    onClick={sendInvoice}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                                  >
                                    Send Invoice
                                  </button>
                                )}
                                <button
                                  onClick={() => setShowPaymentModal(true)}
                                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                                >
                                  Record Payment
                                </button>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Subtotal</h4>
                                <p className="text-xl font-bold text-white">
                                  {formatCurrency(currentInvoice?.subtotal || currentDraft?.subtotal || 0)}
                                </p>
                              </div>
                              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                  VAT ({vatRate}%)
                                </h4>
                                <p className="text-xl font-bold text-white">
                                  {formatCurrency(currentInvoice?.tax_amount || currentDraft?.tax_amount || 0)}
                                </p>
                              </div>
                              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Amount</h4>
                                <p className="text-xl font-bold text-white">
                                  {formatCurrency(currentInvoice?.total_amount || currentDraft?.total_amount || 0)}
                                </p>
                              </div>
                            </div>

                            {/* Line Items */}
                            <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
                              <div className="bg-white/10 px-4 py-3 border-b border-white/20 flex items-center justify-between">
                                <h4 className="text-md font-medium text-white">Line Items</h4>
                                <button
                                  onClick={addLineItem}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                >
                                  <PlusIcon className="h-4 w-4 inline mr-1" />
                                  Add Item
                                </button>
                              </div>
                              
                              <div className="p-4 space-y-3">
                                {(currentInvoice?.line_items || currentDraft?.line_items || []).map((item, index) => (
                                  <div key={index} className="grid grid-cols-12 gap-3 items-center bg-white/5 p-3 rounded">
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                      placeholder="Description"
                                      className="col-span-5 bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm"
                                    />
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                      placeholder="Qty"
                                      className="col-span-2 bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm"
                                    />
                                    <input
                                      type="number"
                                      value={item.unit_price}
                                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                      placeholder="Price"
                                      className="col-span-2 bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm"
                                    />
                                    <div className="col-span-2 text-white text-sm font-medium">
                                      {formatCurrency(item.total)}
                                    </div>
                                    <button
                                      onClick={() => removeLineItem(index)}
                                      className="col-span-1 p-1 text-red-400 hover:text-red-300"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <DocumentTextIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Invoice for This Month</h3>
                            <p className="text-muted-foreground/70 mb-4">
                              There is no invoice data available for {new Date(currentBillingMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                            </p>
                            <button 
                              onClick={generateInitialInvoice}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                            >
                              <PlusIcon className="h-5 w-5 mr-2" />
                              Create Invoice
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Other financial tabs would go here */}
              {activeFinancialTab === "Statement" && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Statement functionality coming soon...</p>
                </div>
              )}
            </div>
          )}

          {/* Other main tabs would go here */}
          {activeTab === "Lease" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Lease details tab content...</p>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Reference</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Payment reference"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Payment notes"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}