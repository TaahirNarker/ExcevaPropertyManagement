'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { invoiceApi } from '@/lib/api';

// Import the proper Lease interface from lease-api.ts
interface Lease {
  id: number;
  property: {
    id: string;
    property_code: string;
    name: string;
    address: string;
    unit_number?: string;
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

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leases?: Lease[];
}

const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  leases = []
}) => {
  // Debug logging
  console.log('ManualPaymentModal received leases:', leases);
  console.log('Number of leases:', leases.length);
  const [selectedLeaseId, setSelectedLeaseId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [leaseSearch, setLeaseSearch] = useState('');
  const [showLeaseDropdown, setShowLeaseDropdown] = useState(false);

  // Filter leases based on search term
  const filteredLeases = leases.filter(lease => {
    if (!leaseSearch) return true;
    const searchTerm = leaseSearch.toLowerCase();
    return (
      lease.tenant.name.toLowerCase().includes(searchTerm) ||
      lease.property.name.toLowerCase().includes(searchTerm) ||
      (lease.property.unit_number && lease.property.unit_number.toLowerCase().includes(searchTerm))
    );
  });

  // Set default payment date to today
  useEffect(() => {
    if (!paymentDate) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [paymentDate]);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.lease-dropdown-container')) {
        setShowLeaseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId || !amount || !paymentDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoiceApi.recordManualPayment({
        lease_id: selectedLeaseId as number,
        payment_method: paymentMethod,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      });
      
      if (result.success) {
        setSuccess(true);
        onSuccess();
      } else {
        setError(result.error || 'Payment recording failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedLeaseId('');
    setPaymentMethod('cash');
    setAmount('');
    setPaymentDate('');
    setReferenceNumber('');
    setNotes('');
    setError(null);
    setSuccess(false);
    setLeaseSearch('');
    setShowLeaseDropdown(false);
    onClose();
  };

  const selectedLease = leases.find(lease => lease.id === selectedLeaseId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Record Manual Payment</h2>
            <p className="text-muted-foreground mt-1">
              Record cash, check, or other manual payment methods
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
              {/* Lease Selection */}
              <div>
                <label htmlFor="leaseId" className="block text-sm font-medium text-foreground mb-2">
                  Select Lease *
                </label>
                <div className="relative lease-dropdown-container">
                  <input
                    type="text"
                    value={leaseSearch}
                    onChange={(e) => {
                      setLeaseSearch(e.target.value);
                      setShowLeaseDropdown(true);
                    }}
                    onFocus={() => setShowLeaseDropdown(true)}
                    placeholder="Search by tenant name or property..."
                    className="w-full px-4 py-3 pr-10 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {leaseSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLeaseSearch('');
                        setSelectedLeaseId('');
                        setShowLeaseDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted/50 rounded transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  {showLeaseDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredLeases.length > 0 ? (
                        filteredLeases.map((lease) => (
                          <button
                            key={lease.id}
                            type="button"
                            onClick={() => {
                              setSelectedLeaseId(lease.id);
                              setLeaseSearch(`${lease.tenant.name} - ${lease.property.name}${lease.property.unit_number ? ` (${lease.property.unit_number})` : ''}`);
                              setShowLeaseDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                          >
                            <div className="font-medium text-foreground">
                              {lease.tenant.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {lease.property.name}
                              {lease.property.unit_number && ` (${lease.property.unit_number})`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Monthly Rent: R{Number(lease.monthly_rent).toFixed(2)}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-muted-foreground text-center">
                          No leases found matching "{leaseSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedLeaseId && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Selected: {leases.find(l => l.id === selectedLeaseId)?.tenant.name} - {leases.find(l => l.id === selectedLeaseId)?.property.name}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-foreground mb-2">
                  Payment Method *
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                  Amount (R) *
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-foreground mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Reference Number */}
              <div>
                <label htmlFor="referenceNumber" className="block text-sm font-medium text-foreground mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Check number, transfer reference, etc."
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional payment details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Selected Lease Info */}
              {selectedLease && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-600 mb-2">Selected Lease Details</h4>
                  <div className="text-sm text-blue-600 space-y-1">
                    <div><strong>Tenant:</strong> {selectedLease.tenant.name}</div>
                    <div><strong>Property:</strong> {selectedLease.property.name}</div>
                    {selectedLease.property.unit_number && (
                      <div><strong>Unit:</strong> {selectedLease.property.unit_number}</div>
                    )}
                    <div><strong>Monthly Rent:</strong> R{Number(selectedLease.monthly_rent).toFixed(2)}</div>
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
                disabled={isLoading || !selectedLeaseId || !amount || !paymentDate}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Recording Payment...
                  </>
                ) : (
                  'Record Payment'
                )}
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center space-y-6">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Payment Recorded Successfully!</h3>
                <p className="text-muted-foreground">
                  The payment has been recorded and is now pending allocation to invoices.
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

export default ManualPaymentModal;
