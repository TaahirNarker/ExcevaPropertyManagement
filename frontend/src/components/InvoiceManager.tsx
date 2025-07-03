'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  BanknotesIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { invoiceApi, formatCurrency, formatDate } from '../lib/api';
import type { Invoice, InvoiceTemplate, InvoiceLineItem, PaginatedResponse } from '../lib/api';

interface InvoiceManagerProps {
  className?: string;
}

const InvoiceManager: React.FC<InvoiceManagerProps> = ({ className = '' }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    lease_id: 0,
    billing_period_start: '',
    billing_period_end: '',
    due_date: '',
    payment_terms: 'Payment due within 30 days',
    line_items: [] as Omit<InvoiceLineItem, 'id'>[],
    notes: ''
  });

  // Loading states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  useEffect(() => {
    loadInvoices();
    loadTemplates();
  }, [currentPage, statusFilter, searchQuery]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        page: currentPage
      };
      
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await invoiceApi.getInvoices(params);
      setInvoices(response.results);
      setTotalPages(Math.ceil(response.count / 20)); // Assuming 20 per page
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await invoiceApi.getInvoiceTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const newInvoice = await invoiceApi.createInvoice(invoiceForm);
      setInvoices(prev => [newInvoice, ...prev]);
      setShowCreateInvoice(false);
      resetInvoiceForm();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  const handleSendInvoice = async (invoiceId: number, method: 'email' | 'whatsapp' | 'sms') => {
    try {
      setIsSendingInvoice(true);
      const result = await invoiceApi.sendInvoice(invoiceId, method);
      if (result.success) {
        alert(`Invoice sent via ${method} successfully!`);
        loadInvoices(); // Refresh to get updated status
      } else {
        alert(`Failed to send invoice: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice. Please try again.');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleDownloadPDF = async (invoiceId: number, invoiceNumber: string) => {
    try {
      setIsGeneratingPDF(true);
      const blob = await invoiceApi.generateInvoicePDF(invoiceId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    const amount = prompt('Enter payment amount:', invoice.total_amount.toString());
    const reference = prompt('Enter payment reference:');
    
    if (amount && reference) {
      try {
        const updatedInvoice = await invoiceApi.markInvoiceAsPaid(invoice.id, {
          amount: parseFloat(amount),
          payment_method: 'bank_transfer',
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: reference
        });
        
        setInvoices(prev => prev.map(inv => inv.id === invoice.id ? updatedInvoice : inv));
      } catch (error) {
        console.error('Failed to mark invoice as paid:', error);
        alert('Failed to mark invoice as paid. Please try again.');
      }
    }
  };

  const handleApplyLateFee = async (invoice: Invoice) => {
    const amount = prompt('Enter late fee amount:', '500');
    
    if (amount) {
      try {
        const updatedInvoice = await invoiceApi.applyLateFee(invoice.id, parseFloat(amount));
        setInvoices(prev => prev.map(inv => inv.id === invoice.id ? updatedInvoice : inv));
      } catch (error) {
        console.error('Failed to apply late fee:', error);
        alert('Failed to apply late fee. Please try again.');
      }
    }
  };

  const handleBulkReminders = async (method: 'email' | 'whatsapp' | 'sms') => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices to send reminders for.');
      return;
    }

    try {
      setIsProcessingBulk(true);
      const result = await invoiceApi.sendBulkReminders(selectedInvoices, method);
      alert(`Sent ${result.sent} reminders successfully. ${result.failed} failed.`);
      setSelectedInvoices([]);
      loadInvoices();
    } catch (error) {
      console.error('Failed to send bulk reminders:', error);
      alert('Failed to send bulk reminders.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      lease_id: 0,
      billing_period_start: '',
      billing_period_end: '',
      due_date: '',
      payment_terms: 'Payment due within 30 days',
      line_items: [],
      notes: ''
    });
  };

  const addLineItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0,
          item_type: 'rent'
        }
      ]
    }));
  };

  const updateLineItem = (index: number, field: keyof Omit<InvoiceLineItem, 'id'>, value: any) => {
    setInvoiceForm(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total = updatedItem.quantity * updatedItem.unit_price;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeLineItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'sent': return <PaperAirplaneIcon className="h-5 w-5 text-blue-500" />;
      case 'overdue': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'partial': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'cancelled': return <XCircleIcon className="h-5 w-5 text-gray-500" />;
      default: return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-200';
      case 'sent': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200';
      case 'overdue': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-200';
      case 'partial': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const calculateInvoiceTotal = () => {
    return invoiceForm.line_items.reduce((sum, item) => sum + item.total, 0);
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-3" />
            Invoice Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create, manage, and track invoices with automated workflows
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedInvoices.length > 0 && (
            <button
              onClick={() => setShowBulkActions(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              <span>Bulk Actions ({selectedInvoices.length})</span>
            </button>
          )}
          
          <button
            onClick={() => setShowCreateInvoice(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partial">Partial</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        <button
          onClick={loadInvoices}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedInvoices(invoices.map(inv => inv.id));
                    } else {
                      setSelectedInvoices([]);
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Invoice #</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Tenant</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Property</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Amount</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Due Date</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <motion.tr
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoices(prev => [...prev, invoice.id]);
                      } else {
                        setSelectedInvoices(prev => prev.filter(id => id !== invoice.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(invoice.issue_date)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoice.tenant.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.tenant.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <HomeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      Unit {invoice.unit.number}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {invoice.unit.property}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(invoice.total_amount)}
                  </div>
                  {invoice.payments.length > 0 && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Paid: {formatCurrency(invoice.payments.reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(invoice.due_date)}
                    </span>
                  </div>
                  {new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' && (
                    <div className="text-sm text-red-500">
                      {Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(invoice.status)}
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceDetails(true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                      disabled={isGeneratingPDF}
                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      title="Download PDF"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    
                    {invoice.status !== 'paid' && (
                      <>
                        <button
                          onClick={() => handleSendInvoice(invoice.id, 'email')}
                          disabled={isSendingInvoice}
                          className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                          title="Send via Email"
                        >
                          <PaperAirplaneIcon className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                          title="Mark as Paid"
                        >
                          <BanknotesIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {invoice.status === 'overdue' && !invoice.late_fee_applied && (
                      <button
                        onClick={() => handleApplyLateFee(invoice)}
                        className="p-1 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded"
                        title="Apply Late Fee"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {showCreateInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateInvoice(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Invoice</h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lease ID
                    </label>
                    <input
                      type="number"
                      value={invoiceForm.lease_id}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, lease_id: parseInt(e.target.value) || 0 }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Billing Period Start
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.billing_period_start}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, billing_period_start: e.target.value }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Billing Period End
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.billing_period_end}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, billing_period_end: e.target.value }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Line Items</h4>
                    <button
                      onClick={addLineItem}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {invoiceForm.line_items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="col-span-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Type
                          </label>
                          <select
                            value={item.item_type}
                            onChange={(e) => updateLineItem(index, 'item_type', e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="rent">Rent</option>
                            <option value="utilities">Utilities</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="late_fee">Late Fee</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Total
                          </label>
                          <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded text-gray-900 dark:text-white text-center">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                        
                        <div className="col-span-1">
                          <button
                            onClick={() => removeLineItem(index)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {invoiceForm.line_items.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-white">Total Amount:</span>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(calculateInvoiceTotal())}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Terms and Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Terms
                  </label>
                  <textarea
                    value={invoiceForm.payment_terms}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                    rows={2}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes or instructions..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateInvoice(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={invoiceForm.line_items.length === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Create Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Modal */}
      <AnimatePresence>
        {showBulkActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkActions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Bulk Actions
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Send Reminders ({selectedInvoices.length} invoices)
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleBulkReminders('email')}
                        disabled={isProcessingBulk}
                        className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50"
                      >
                        Email
                      </button>
                      <button
                        onClick={() => handleBulkReminders('whatsapp')}
                        disabled={isProcessingBulk}
                        className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50"
                      >
                        WhatsApp
                      </button>
                      <button
                        onClick={() => handleBulkReminders('sms')}
                        disabled={isProcessingBulk}
                        className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50"
                      >
                        SMS
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setShowBulkActions(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InvoiceManager; 