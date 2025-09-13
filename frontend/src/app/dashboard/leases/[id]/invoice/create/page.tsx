// Enhanced Invoice Creation Page for Lease
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CogIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  DocumentTextIcon,
  EyeIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { invoiceApi } from '@/lib/api';
import { 
  enhancedInvoiceAPI, 
  EnhancedInvoice, 
  InvoiceLineItem as EnhancedLineItem,
  InvoiceDraft,
  TenantCreditBalance,
  RecurringCharge,
  PaymentAllocation 
} from '@/lib/enhanced-invoice-api';
import { LeaseAPI, Lease } from '@/lib/lease-api';

// Using the Lease interface from lease-api.ts


// Enhanced Invoice Display Component
interface EnhancedInvoiceDisplayProps {
  lease: Lease;
  currentBillingMonth: string;
  generateInitialInvoice: () => Promise<void>;
  tenantCreditBalance: TenantCreditBalance | null;
}

const EnhancedInvoiceDisplay: React.FC<EnhancedInvoiceDisplayProps> = ({
  lease,
  currentBillingMonth,
  generateInitialInvoice,
  tenantCreditBalance
}) => {
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState('Not yet actioned');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [notes, setNotes] = useState('Kindly ensure the correct reference number (your lease number) is utilised as a penalty will be incurred after two incorrect references are used.');
  const [emailRecipients, setEmailRecipients] = useState([
    { type: 'email', value: lease.tenant.email, label: lease.tenant.email },
    { type: 'email', value: 'info@narkerproperty.com', label: 'info@narkerproperty.com' }
  ]);
  const [emailSubject, setEmailSubject] = useState('');
  const [invoiceData, setInvoiceData] = useState<EnhancedInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load invoice data for the current billing month
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!lease) return;
      
      setIsLoading(true);
      try {
        const response = await enhancedInvoiceAPI.navigateToMonth(lease.id, currentBillingMonth);
        
        if (response.has_invoice && response.invoice) {
          setInvoiceData(response.invoice);
          setInvoiceStatus(response.invoice.status || 'Not yet actioned');
        } else {
          setInvoiceData(null);
        }
      } catch (error) {
        console.error('Error loading invoice data:', error);
        setInvoiceData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoiceData();
  }, [lease, currentBillingMonth]);

  // Calculate values from invoice data or use defaults
  const depositHeld = lease.deposit_amount || 17000.00;
  const openingBalance = invoiceData ? 0 : 23516.67; // Will be calculated from actual transactions
  const totalDue = invoiceData ? invoiceData.balance_due : 8500.00;
  
  // Generate transactions from invoice data
  const transactions = invoiceData ? [
    // Add opening balance if it exists
    ...(invoiceData.line_items.map(item => ({
      id: item.id || Math.random(),
      date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
      description: `[${item.category || 'Charge'}] ${item.description}`,
      reference: '',
      amount: item.total,
      type: 'charge'
    }))),
    // Add payments
    ...(invoiceData.payments.map(payment => ({
      id: payment.id,
      date: payment.payment_date,
      description: `[Payment] ${payment.payment_method} - Thank You`,
      reference: payment.reference_number || '',
      amount: -payment.amount,
      type: 'payment'
    })))
  ] : [
    // Mock data when no invoice exists
    {
      id: 1,
      date: '2025-08-29',
      description: '[Payment] Rental Deposit Payment - Thank You',
      reference: 'LEA000978',
      amount: -17000.00,
      type: 'payment'
    },
    {
      id: 2,
      date: '2025-08-30',
      description: '[Payment] Rental Payment - Thank You',
      reference: 'LEA000978',
      amount: -6516.67,
      type: 'payment'
    },
    {
      id: 3,
      date: '2025-10-01',
      description: '[Rent] Rent due',
      reference: '',
      amount: 8500.00,
      type: 'charge'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const removeDeliveryOption = (index: number) => {
    setEmailRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const addDeliveryOption = () => {
    // In a real implementation, this would open a modal to add new delivery options
    console.log('Add new delivery option');
  };

  const sendInvoice = async () => {
    if (!invoiceData) {
      console.error('No invoice data to send');
      return;
    }

    try {
      // Send invoice (this will update status and send email)
      const response = await enhancedInvoiceAPI.sendInvoice(invoiceData.id);
      setInvoiceData(response.invoice);
      setInvoiceStatus('Sent');
      
      console.log('Invoice sent successfully');
    } catch (error) {
      console.error('Error sending invoice:', error);
    }
  };

  const previewInvoice = () => {
    if (!invoiceData) {
      console.error('No invoice data to preview');
      return;
    }

    // In a real implementation, this would open a preview modal or generate PDF
    console.log('Previewing invoice:', invoiceData);
    // Could open a modal with the invoice preview or generate a PDF
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading invoice data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Show enhanced display if we have invoice data or if we're creating an invoice */}
      {invoiceData || showCreateInvoice ? (
        <>
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Current Invoice | {new Date(currentBillingMonth).toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Tenant Information */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">To:</span>
                <span className="text-sm text-gray-900">{lease.tenant.name}</span>
                <button className="text-blue-600 text-sm hover:text-blue-800">Change</button>
              </div>
              <div className="text-sm text-gray-600">
                Unit 112, Ujala Towers<br />
                258 Main Rd, Kirstenhof<br />
                Cape Town, Western Cape, 7945
              </div>
            </div>

            {/* Right Side - Invoice Details */}
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900 mb-3">Tax Invoice</div>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Invoice Number:</span> {invoiceData?.invoice_number || 'INV0004210986'}</div>
                <div><span className="font-medium">Due Date:</span> {invoiceData?.due_date ? new Date(invoiceData.due_date).toLocaleDateString('en-CA') : new Date(currentBillingMonth).toLocaleDateString('en-CA')}</div>
                <div><span className="font-medium">Deposit Held:</span> {formatCurrency(depositHeld)}</div>
                <div><span className="font-medium">Payment Reference:</span> {lease.property?.property_code || 'LEA000978'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          Add payment
        </button>
        <button 
          onClick={() => setShowChargeModal(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          Add charge
        </button>
        <button 
          onClick={() => setShowCreditModal(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          Issue credit
        </button>
        <button 
          onClick={() => setShowRefundModal(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          Issue refund
        </button>
        <button 
          onClick={() => setShowDepositModal(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          Use deposit
        </button>
      </div>

      {/* Invoice Status */}
      <div className="mb-4">
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <input type="checkbox" checked className="mr-2" />
            {invoiceStatus}
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[200px]">
              <div className="py-1">
                {['Not yet actioned', 'Sent', 'Paid', 'Overdue'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setInvoiceStatus(status);
                      setShowStatusDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date ↑</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Reference</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm text-gray-900"></td>
              <td className="px-4 py-3 text-sm text-gray-900">Opening Balance</td>
              <td className="px-4 py-3 text-sm text-gray-500"></td>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(openingBalance)}</td>
              <td className="px-4 py-3 text-sm text-gray-500"></td>
            </tr>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{formatDate(transaction.date)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{transaction.description}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{transaction.reference}</td>
                <td className={`px-4 py-3 text-sm font-medium ${transaction.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900" colSpan={2}>Total Due</td>
              <td className="px-4 py-3 text-sm text-gray-500"></td>
              <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(totalDue)}</td>
              <td className="px-4 py-3 text-sm text-gray-500"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes Section */}
      <div className="mb-6">
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <DocumentTextIcon className="h-5 w-5 text-gray-500 mt-0.5" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a note to this invoice (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Change note</button>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="mb-6">
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <EnvelopeIcon className="h-5 w-5 text-gray-500 mt-0.5" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deliver invoice to:
            </label>
            <div className="space-y-2">
              {emailRecipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                  <span className="text-sm text-gray-900">
                    {recipient.type === 'email' ? 'Email' : 'Sms'}: {recipient.label}
                  </span>
                  <button 
                    onClick={() => removeDeliveryOption(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="Email subject: Enter a custom email subject (Optional)"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
          <button 
            onClick={addDeliveryOption}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add new delivery option
          </button>
        </div>
      </div>

      {/* Bank Details */}
      <div className="mb-6">
        <button
          onClick={() => setShowBankDetails(!showBankDetails)}
          className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg w-full text-left hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            {showBankDetails ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            <CheckCircleIcon className="h-5 w-5 text-gray-500" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            View your bank account and contact details
          </span>
        </button>
        {showBankDetails && (
          <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Bank Account Details:</p>
              <p>Bank: Standard Bank</p>
              <p>Account Number: 1234567890</p>
              <p>Branch Code: 051001</p>
              <p className="mt-2 font-medium">Contact Information:</p>
              <p>Phone: +27 21 123 4567</p>
              <p>Email: info@narkerproperty.com</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={sendInvoice}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <EnvelopeIcon className="h-5 w-5 mr-2" />
          Send Invoice
        </button>
        <button
          onClick={previewInvoice}
          className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
        >
          <EyeIcon className="h-5 w-5 mr-2" />
          Preview
        </button>
      </div>
        </>
      ) : (
        /* Show create invoice prompt when no invoice exists */
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No Invoice for This Month</h3>
          <p className="text-gray-400 mb-4">
            There is no invoice data available for {new Date(currentBillingMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
          </p>
          <button 
            onClick={() => {
              setShowCreateInvoice(true);
              generateInitialInvoice();
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select className="w-full border rounded px-3 py-2">
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
                  className="w-full border rounded px-3 py-2"
                  placeholder="Payment reference"
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
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Charge</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="Charge description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="late_fee">Late Fee</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowChargeModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Issue Credit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="Credit description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="refund">Refund</option>
                  <option value="discount">Discount</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Issue Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Issue Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Refund reason"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Issue Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Use Deposit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount to Use</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                  max={depositHeld}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available deposit: {formatCurrency(depositHeld)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="rent_payment">Rent Payment</option>
                  <option value="damage_repair">Damage Repair</option>
                  <option value="outstanding_charges">Outstanding Charges</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Deposit usage description"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Use Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InvoiceCreatePage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Create API instances
  const leaseAPI = new LeaseAPI();
  
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced Invoice state
  const [currentBillingMonth, setCurrentBillingMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [tenantCreditBalance, setTenantCreditBalance] = useState<TenantCreditBalance | null>(null);

  // Fetch real lease data
  useEffect(() => {
    const fetchLease = async () => {
      try {
        setLoading(true);
        const leaseData = await leaseAPI.getLease(parseInt(leaseId || '1'));
        setLease(leaseData);
        console.log('Fetched lease data:', leaseData);
        
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

  // Generate initial invoice
  const generateInitialInvoice = async () => {
    if (!lease) return;
    
    try {
      const response = await enhancedInvoiceAPI.generateInitialInvoice(lease.id);
      console.log('Generated initial invoice:', response);
    } catch (error) {
      console.error('Error generating initial invoice:', error);
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <DashboardLayout title="Invoice Management">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !lease) {
    return (
      <DashboardLayout title="Invoice Management">
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

  return (
    <DashboardLayout title="Invoice Management">
      <EnhancedInvoiceDisplay 
        lease={lease}
        currentBillingMonth={currentBillingMonth}
        generateInitialInvoice={generateInitialInvoice}
        tenantCreditBalance={tenantCreditBalance}
      />
    </DashboardLayout>
  );
}