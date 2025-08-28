'use client';

import React, { useState } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';

interface Invoice {
  id: number;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  title?: string;
  tenant_name?: string;
  property_name?: string;
  due_date: string;
  status: string;
}

interface InvoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceSelect: (invoice: Invoice) => void;
  invoices: Invoice[];
}

const InvoiceSelectionModal: React.FC<InvoiceSelectionModalProps> = ({
  isOpen,
  onClose,
  onInvoiceSelect,
  invoices
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!isOpen) return null;

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.title && invoice.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.tenant_name && invoice.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.property_name && invoice.property_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Select Invoice for Adjustment</h2>
            <p className="text-muted-foreground mt-1">
              Choose an invoice to create an adjustment for
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search invoices by number, title, tenant, or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="p-6">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No invoices match your search criteria' : 'No invoices available'}
              </div>
              <div className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search terms or filters'
                  : 'Create some invoices first to make adjustments'
                }
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onInvoiceSelect(invoice)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-medium text-foreground">
                        #{invoice.invoice_number}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {invoice.title && (
                        <div><strong>Title:</strong> {invoice.title}</div>
                      )}
                      {invoice.tenant_name && (
                        <div><strong>Tenant:</strong> {invoice.tenant_name}</div>
                      )}
                      {invoice.property_name && (
                        <div><strong>Property:</strong> {invoice.property_name}</div>
                      )}
                      <div><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-semibold text-foreground">
                      {formatCurrency(invoice.total_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Balance: {formatCurrency(invoice.balance_due)}
                    </div>
                  </div>
                  <div className="ml-4">
                    <EyeIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSelectionModal;
