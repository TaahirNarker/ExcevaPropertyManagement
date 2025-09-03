'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, PlusIcon, TrashIcon, CurrencyDollarIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { invoiceApi } from '@/lib/api';

interface Invoice {
  id: number;
  invoice_number: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  title?: string;
  tenant_name?: string;
  property_name?: string;
}

interface PaymentAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  paymentId?: number;
  bankTransactionId?: number;
  paymentType: 'manual' | 'bank';
  paymentAmount: number;
  invoices: Invoice[];
}

const PaymentAllocationModal: React.FC<PaymentAllocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  paymentId,
  bankTransactionId,
  paymentType,
  paymentAmount,
  invoices
}) => {
  const [allocations, setAllocations] = useState<Array<{
    invoice_id: number;
    amount: number;
    notes: string;
  }>>([]);
  const [createCredit, setCreateCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('manual');
  const [showPreview, setShowPreview] = useState(false);

  // Initialize with first invoice if available
  useEffect(() => {
    if (invoices.length > 0 && allocations.length === 0) {
      const firstInvoice = invoices[0];
      setAllocations([{
        invoice_id: firstInvoice.id,
        amount: Math.min(paymentAmount, firstInvoice.balance_due),
        notes: ''
      }]);
    }
  }, [invoices, allocations.length, paymentAmount]);

  // Auto-allocation logic - distribute payment across invoices by priority (oldest first)
  const autoAllocatePayment = () => {
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    let remainingAmount = paymentAmount;
    const newAllocations: Array<{ invoice_id: number; amount: number; notes: string; }> = [];

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;
      
      const allocationAmount = Math.min(remainingAmount, invoice.balance_due);
      if (allocationAmount > 0) {
        newAllocations.push({
          invoice_id: invoice.id,
          amount: allocationAmount,
          notes: 'Auto-allocated'
        });
        remainingAmount -= allocationAmount;
      }
    }

    setAllocations(newAllocations);
    
    // Handle overpayment as credit
    if (remainingAmount > 0) {
      setCreateCredit(true);
      setCreditAmount(remainingAmount);
    } else {
      setCreateCredit(false);
      setCreditAmount(0);
    }
  };

  const addAllocation = () => {
    const availableInvoices = invoices.filter(inv => 
      !allocations.some(alloc => alloc.invoice_id === inv.id)
    );
    
    if (availableInvoices.length > 0) {
      const nextInvoice = availableInvoices[0];
      const remainingPayment = getRemainingAmount();
      setAllocations([...allocations, {
        invoice_id: nextInvoice.id,
        amount: Math.min(remainingPayment, nextInvoice.balance_due),
        notes: ''
      }]);
    }
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: 'amount' | 'notes', value: string | number) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
    
    // Update credit amount based on remaining payment
    const remaining = paymentAmount - newAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    if (remaining > 0 && createCredit) {
      setCreditAmount(remaining);
    }
  };

  const handleAllocationModeChange = (mode: 'auto' | 'manual') => {
    setAllocationMode(mode);
    if (mode === 'auto') {
      autoAllocatePayment();
    } else {
      // Reset to manual mode
      setAllocations([]);
      setCreateCredit(false);
      setCreditAmount(0);
    }
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  };

  const getRemainingAmount = () => {
    return paymentAmount - getTotalAllocated();
  };

  const getInvoiceById = (id: number) => {
    return invoices.find(inv => inv.id === id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const validateAllocations = () => {
    const errors: string[] = [];
    
    if (allocations.length === 0 && !createCredit) {
      errors.push('Please add at least one allocation or create a credit');
    }
    
    const totalAllocated = getTotalAllocated();
    const remaining = getRemainingAmount();
    
    if (totalAllocated > paymentAmount) {
      errors.push('Total allocations cannot exceed payment amount');
    }
    
    // Check for over-allocation on individual invoices
    allocations.forEach((alloc, index) => {
      const invoice = getInvoiceById(alloc.invoice_id);
      if (invoice && alloc.amount > invoice.balance_due) {
        errors.push(`Allocation ${index + 1} exceeds invoice balance`);
      }
    });
    
    if (remaining < 0) {
      errors.push('Negative remaining amount detected');
    }
    
    return errors;
  };

  const getAvailableInvoices = () => {
    return invoices.filter(inv => 
      !allocations.some(alloc => alloc.invoice_id === inv.id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive validation
    const validationErrors = validateAllocations();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const remainingAmount = getRemainingAmount();
      const result = await invoiceApi.allocatePayment({
        payment_id: paymentId,
        bank_transaction_id: bankTransactionId,
        allocations: allocations.map(alloc => ({
          invoice_id: alloc.invoice_id,
          amount: alloc.amount,
          notes: alloc.notes
        })),
        create_credit: createCredit || remainingAmount > 0,
        notes: notes || undefined,
      });
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(result.error || 'Payment allocation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment allocation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAllocations([]);
    setCreateCredit(false);
    setNotes('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Allocate Payment</h2>
            <p className="text-muted-foreground mt-1">
              Distribute payment amount across invoices
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-600 mb-2">Payment Details</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <div><strong>Type:</strong> {paymentType === 'manual' ? 'Manual Payment' : 'Bank Transaction'}</div>
                  <div><strong>Amount:</strong> {formatCurrency(paymentAmount)}</div>
                  <div><strong>Available Invoices:</strong> {invoices.length}</div>
                </div>
              </div>

              {/* Allocation Mode Selection */}
              <div className="bg-muted/20 border border-border/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">Allocation Mode</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allocationMode"
                      value="manual"
                      checked={allocationMode === 'manual'}
                      onChange={() => handleAllocationModeChange('manual')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">Manual Allocation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allocationMode"
                      value="auto"
                      checked={allocationMode === 'auto'}
                      onChange={() => handleAllocationModeChange('auto')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">Auto Allocation (Oldest First)</span>
                  </label>
                </div>
                {allocationMode === 'auto' && (
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-600">
                    <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                    Payment will be automatically distributed across invoices, starting with the oldest due dates.
                  </div>
                )}
              </div>

              {/* Allocations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-foreground">Payment Allocations</h4>
                  <button
                    type="button"
                    onClick={addAllocation}
                    disabled={allocations.length >= invoices.length}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white text-sm rounded-lg transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Invoice
                  </button>
                </div>

                <div className="space-y-4">
                  {allocations.map((allocation, index) => {
                    const invoice = getInvoiceById(allocation.invoice_id);
                    if (!invoice) return null;

                    return (
                      <div key={index} className="bg-muted/30 border border-border/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-foreground">
                            Invoice #{invoice.invoice_number}
                          </h5>
                          {allocations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAllocation(index)}
                              className="p-1 hover:bg-red-500/10 rounded text-red-500 transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Invoice Details
                            </label>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}</div>
                              <div><strong>Total:</strong> R{invoice.total_amount.toFixed(2)}</div>
                              <div><strong>Balance Due:</strong> R{invoice.balance_due.toFixed(2)}</div>
                              <div><strong>Status:</strong> {invoice.status}</div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Allocation Amount (R)
                            </label>
                            <input
                              type="number"
                              value={allocation.amount}
                              onChange={(e) => updateAllocation(index, 'amount', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              min="0"
                              max={Math.min(paymentAmount - getTotalAllocated() + allocation.amount, invoice.balance_due)}
                              className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              required
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              Max: R{Math.min(paymentAmount - getTotalAllocated() + allocation.amount, invoice.balance_due).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={allocation.notes}
                            onChange={(e) => updateAllocation(index, 'notes', e.target.value)}
                            placeholder="Allocation notes..."
                            className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Allocation Summary */}
              <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">Allocation Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Allocated:</span>
                    <span className="ml-2 font-medium text-green-600">
                      R{getTotalAllocated().toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`ml-2 font-medium ${getRemainingAmount() >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      R{getRemainingAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Option */}
              {getRemainingAmount() > 0 && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="createCredit"
                    checked={createCredit}
                    onChange={(e) => setCreateCredit(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border/50 rounded"
                  />
                  <label htmlFor="createCredit" className="text-sm text-foreground">
                    Create credit balance for remaining amount (R{getRemainingAmount().toFixed(2)})
                  </label>
                </div>
              )}

              {/* General Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                  General Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional allocation notes..."
                  rows={3}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || allocations.length === 0 || getTotalAllocated() <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Allocating Payment...
                  </>
                ) : (
                  'Allocate Payment'
                )}
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Payment Allocated Successfully!</h3>
                <p className="text-muted-foreground">
                  The payment has been distributed across {allocations.length} invoice(s).
                </p>
              </div>
              <button
                onClick={handleClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentAllocationModal;
