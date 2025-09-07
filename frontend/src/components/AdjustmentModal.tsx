'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { invoiceApi } from '@/lib/api';

interface Invoice {
  id: number;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  title?: string;
}

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: Invoice | null;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice
}) => {
  const [adjustmentType, setAdjustmentType] = useState('waiver');
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState<'fixed' | 'percentage'>('fixed');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Set default effective date to today
  useEffect(() => {
    if (!effectiveDate) {
      setEffectiveDate(new Date().toISOString().split('T')[0]);
    }
  }, [effectiveDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !amount || !reason || !effectiveDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoiceApi.createAdjustment({
        invoice_id: invoice.id,
        adjustment_type: adjustmentType,
        amount: parseFloat(amount),
        reason: reason,
        notes: notes || undefined,
        effective_date: effectiveDate,
      });
      
      if (result.success) {
        setSuccess(true);
        onSuccess();
      } else {
        setError(result.error || 'Adjustment creation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Adjustment creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAdjustmentAmount = () => {
    if (!amount || !invoice) return 0;
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return 0;
    
    const currentTotal = Number(invoice.total_amount) || 0;
    if (amountType === 'percentage') {
      return (currentTotal * numericAmount) / 100;
    }
    
    return numericAmount;
  };

  const getNewInvoiceTotal = () => {
    if (!invoice) return 0;
    
    const adjustmentAmount = calculateAdjustmentAmount();
    const isReduction = adjustmentType === 'waiver' || adjustmentType === 'discount' || adjustmentType === 'credit';
    const currentTotal = Number(invoice.total_amount) || 0;
    
    return currentTotal + (isReduction ? -adjustmentAmount : adjustmentAmount);
  };

  const validateAdjustment = () => {
    const errors: string[] = [];
    
    if (!amount || parseFloat(amount) <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (amountType === 'percentage' && parseFloat(amount) > 100) {
      errors.push('Percentage cannot exceed 100%');
    }
    
    const newTotal = getNewInvoiceTotal();
    if (newTotal < 0) {
      errors.push('Adjustment would result in negative invoice total');
    }
    
    if (!reason.trim()) {
      errors.push('Reason is required');
    }
    
    if (!effectiveDate) {
      errors.push('Effective date is required');
    }
    
    return errors;
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateAdjustment();
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }
    
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmation(false);
    setIsLoading(true);
    setError(null);

    try {
      const adjustmentAmount = calculateAdjustmentAmount();
      const result = await invoiceApi.createAdjustment({
        invoice_id: invoice!.id,
        adjustment_type: adjustmentType,
        amount: adjustmentAmount,
        amount_type: amountType,
        percentage: amountType === 'percentage' ? parseFloat(amount) : undefined,
        reason: reason,
        notes: notes || undefined,
        effective_date: effectiveDate,
      });
      
      if (result.success) {
        setSuccess(true);
        onSuccess();
      } else {
        setError(result.error || 'Adjustment creation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Adjustment creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustmentType('waiver');
    setAmount('');
    setAmountType('fixed');
    setReason('');
    setNotes('');
    setEffectiveDate('');
    setError(null);
    setSuccess(false);
    setShowConfirmation(false);
    onClose();
  };

  const getAdjustmentTypeInfo = () => {
    switch (adjustmentType) {
      case 'waiver':
        return {
          label: 'Waiver',
          description: 'Remove charges from the invoice',
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20'
        };
      case 'discount':
        return {
          label: 'Discount',
          description: 'Reduce invoice amount',
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20'
        };
      case 'credit':
        return {
          label: 'Credit',
          description: 'Apply credit to the invoice',
          color: 'text-purple-600',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20'
        };
      case 'charge':
        return {
          label: 'Additional Charge',
          description: 'Add extra charges to the invoice',
          color: 'text-orange-600',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20'
        };
      case 'late_fee':
        return {
          label: 'Late Fee',
          description: 'Add late payment penalty',
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20'
        };
      default:
        return {
          label: 'Adjustment',
          description: 'Modify invoice amount',
          color: 'text-gray-600',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20'
        };
    }
  };

  const typeInfo = getAdjustmentTypeInfo();

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Create Adjustment</h2>
            <p className="text-muted-foreground mt-1">
              Modify invoice #{invoice.invoice_number}
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
            <form onSubmit={handleSubmitClick} className="space-y-6">
              {/* Invoice Info */}
              <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Invoice Details</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div><strong>Invoice #:</strong> {invoice.invoice_number}</div>
                  <div><strong>Title:</strong> {invoice.title || 'N/A'}</div>
                  <div><strong>Current Total:</strong> R{(Number(invoice.total_amount) || 0).toFixed(2)}</div>
                  <div><strong>Balance Due:</strong> R{(Number(invoice.balance_due) || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Adjustment Type */}
              <div>
                <label htmlFor="adjustmentType" className="block text-sm font-medium text-foreground mb-2">
                  Adjustment Type *
                </label>
                <select
                  id="adjustmentType"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="waiver">Waiver</option>
                  <option value="discount">Discount</option>
                  <option value="credit">Credit</option>
                  <option value="charge">Additional Charge</option>
                  <option value="late_fee">Late Fee</option>
                </select>
                <div className={`mt-2 p-3 rounded-lg ${typeInfo.bgColor} border ${typeInfo.borderColor}`}>
                  <div className={`text-sm font-medium ${typeInfo.color}`}>
                    {typeInfo.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {typeInfo.description}
                  </div>
                </div>
              </div>

              {/* Amount Type Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Amount Type *
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amountType"
                      value="fixed"
                      checked={amountType === 'fixed'}
                      onChange={() => setAmountType('fixed')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">Fixed Amount (R)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amountType"
                      value="percentage"
                      checked={amountType === 'percentage'}
                      onChange={() => setAmountType('percentage')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-foreground">Percentage (%)</span>
                  </label>
                </div>

                <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                  {amountType === 'fixed' ? 'Amount (R)' : 'Percentage (%)'} *
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={amountType === 'fixed' ? '0.00' : '0.0'}
                  step={amountType === 'fixed' ? '0.01' : '0.1'}
                  min="0"
                  max={amountType === 'percentage' ? '100' : undefined}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {amountType === 'percentage' && amount 
                    ? `Calculated amount: R${calculateAdjustmentAmount().toFixed(2)}`
                    : adjustmentType === 'waiver' || adjustmentType === 'discount' || adjustmentType === 'credit' 
                      ? 'This will reduce the invoice amount'
                      : 'This will increase the invoice amount'
                  }
                </div>
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-2">
                  Reason *
                </label>
                <input
                  type="text"
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Customer service issue, payment delay, etc."
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Effective Date */}
              <div>
                <label htmlFor="effectiveDate" className="block text-sm font-medium text-foreground mb-2">
                  Effective Date *
                </label>
                <input
                  type="date"
                  id="effectiveDate"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details about this adjustment..."
                  rows={3}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Preview */}
              {amount && (
                <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-3">Adjustment Preview</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Invoice Total:</span>
                      <span className="font-medium">R{(Number(invoice.total_amount) || 0).toFixed(2)}</span>
                    </div>
                    {amountType === 'percentage' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Percentage:</span>
                        <span className="font-medium">{amount}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adjustment Amount:</span>
                      <span className={`font-medium ${adjustmentType === 'waiver' || adjustmentType === 'discount' || adjustmentType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {adjustmentType === 'waiver' || adjustmentType === 'discount' || adjustmentType === 'credit' ? '-' : '+'}R{calculateAdjustmentAmount().toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-border/50 pt-2">
                      <div className="flex justify-between font-medium">
                        <span>New Invoice Total:</span>
                        <span className={`${getNewInvoiceTotal() < 0 ? 'text-red-600' : ''}`}>
                          R{getNewInvoiceTotal().toFixed(2)}
                        </span>
                      </div>
                      {getNewInvoiceTotal() < 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          Warning: This adjustment would result in a negative total
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !amount || !reason || !effectiveDate || validateAdjustment().length > 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Adjustment...
                  </>
                ) : (
                  'Review Adjustment'
                )}
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Adjustment Created Successfully!</h3>
                <p className="text-muted-foreground">
                  The invoice has been updated with the new adjustment.
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

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center p-4">
              <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Confirm Adjustment</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium text-foreground">{getAdjustmentTypeInfo().label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium text-foreground">
                        {amountType === 'percentage' ? `${amount}% ` : ''}
                        (R{calculateAdjustmentAmount().toFixed(2)})
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">New Total:</span>
                      <span className="font-medium text-foreground">R{getNewInvoiceTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="font-medium text-foreground">{reason}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmedSubmit}
                      disabled={isLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </>
                      ) : (
                        'Confirm'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdjustmentModal;
