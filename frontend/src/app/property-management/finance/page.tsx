'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CurrencyDollarIcon, PlusIcon, DocumentTextIcon, CreditCardIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';
import { invoiceApi, paymentApi, formatCurrency, formatDate, Invoice, PaymentRecord } from '../../../lib/api';

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments'>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Fetching finance data...');
        const [invoicesData, paymentsData] = await Promise.all([
          invoiceApi.getAll(),
          paymentApi.getAll()
        ]);
        
        console.log('📄 Invoices received:', invoicesData);
        console.log('💳 Payments received:', paymentsData);
        
        setInvoices(invoicesData);
        setPayments(paymentsData);
      } catch (err) {
        console.error('❌ Error fetching finance data:', err);
        setError('Failed to load finance data. Please check if the Django backend is running.');
        
        // Fallback to demo data
        setInvoices([
          { id: 1, invoice_number: 'INV-2024-001', tenant: { id: 1, name: 'John Smith', email: 'john@email.com', phone: '+27 82 123 4567', id_number: '8001015009087', created_at: '2024-01-15T10:30:00Z', is_active: true, updated_at: '2024-01-15T10:30:00Z' }, unit: { id: 1, number: '101', property: 'Sunset Apartments', property_id: 1, type: 'Studio', size: 45, rent: 8500, is_occupied: true, status: 'occupied' }, issue_date: '2024-04-01', due_date: '2024-04-07', total_amount: 8500, paid_amount: 8500, status: 'paid', created_at: '2024-04-01T08:00:00Z' },
          { id: 2, invoice_number: 'INV-2024-002', tenant: { id: 2, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+27 83 987 6543', id_number: '9205234567890', created_at: '2024-02-20T14:15:00Z', is_active: true, updated_at: '2024-02-20T14:15:00Z' }, unit: { id: 2, number: '102', property: 'Sunset Apartments', property_id: 1, type: '1 Bedroom', size: 65, rent: 12000, is_occupied: false, status: 'available' }, issue_date: '2024-04-01', due_date: '2024-04-07', total_amount: 12000, paid_amount: 0, status: 'overdue', created_at: '2024-04-01T08:00:00Z' }
        ]);
        setPayments([
          { id: 1, invoice: 1, amount: 8500, date: '2024-04-05', method: 'EFT', reference_number: 'REF001', created_at: '2024-04-05T14:30:00Z' },
          { id: 2, invoice: 3, amount: 18000, date: '2024-04-06', method: 'Online', reference_number: 'REF002', created_at: '2024-04-06T11:15:00Z' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  // Calculate financial metrics
  const totalDue = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
  const totalCollected = invoices.reduce((sum, invoice) => sum + invoice.paid_amount, 0);
  const totalOutstanding = totalDue - totalCollected;
  const collectionRate = totalDue > 0 ? ((totalCollected / totalDue) * 100).toFixed(1) : '0';
  const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue').length;

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Finance Data...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Finance & Invoicing
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage invoices, payments, and financial reporting with crypto support
                </p>
                {error && (
                  <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
                    <p className="text-sm">⚠️ {error}</p>
                    <p className="text-xs mt-1">Showing demo data. Start your Django backend at http://localhost:8000</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
              {[
                { key: 'overview', label: 'Overview', icon: CurrencyDollarIcon },
                { key: 'invoices', label: 'Invoice Management', icon: DocumentTextIcon },
                { key: 'payments', label: 'Payment Processing', icon: CreditCardIcon }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Financial Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Rent Due</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalDue)}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rent Collected</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalCollected)}</p>
                      <p className="text-sm text-green-500">{collectionRate}% Collection Rate</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                      <CreditCardIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
                      <p className="text-sm text-red-500">{(100 - parseFloat(collectionRate)).toFixed(1)}% Outstanding</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
                      <CurrencyDollarIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Invoices</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{overdueInvoices}</p>
                      <p className="text-sm text-orange-500">Requires attention</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Recent Transactions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Transactions</h3>
                <div className="space-y-3 text-sm">
                  {payments.slice(0, 4).map((payment, index) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <span className="text-gray-900 dark:text-white font-medium">
                          Payment received - Invoice #{payment.invoice}
                        </span>
                        <div className="text-gray-600 dark:text-gray-400">
                          {payment.method} • {formatDate(payment.date)}
                        </div>
                      </div>
                      <span className="text-green-600 font-semibold">+{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No recent transactions found
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}

          {activeTab === 'invoices' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Management</h2>
                <button 
                  onClick={() => {
                    const choice = window.confirm(
                      "Create Invoice Options:\n\n" +
                      "OK = Open Django Admin (Full Invoice Management)\n" +
                      "Cancel = Stay on this page\n\n" +
                      "Django Admin provides complete invoice creation with all fields, tenant selection, and payment tracking."
                    );
                    if (choice) {
                      window.open('http://localhost:8000/admin/finance/invoice/add/', '_blank');
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Create Invoice</span>
                </button>
              </div>

              <div className="grid gap-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {invoice.invoice_number}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Tenant:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{invoice.tenant.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Unit:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{invoice.unit.number}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(invoice.due_date)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium">
                          View
                        </button>
                        {invoice.status !== 'paid' && (
                          <button className="bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium">
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Processing</h2>
                <button 
                  onClick={() => {
                    const choice = window.confirm(
                      "Record Payment Options:\n\n" +
                      "OK = Open Django Admin (Full Payment Management)\n" +
                      "Cancel = Stay on this page\n\n" +
                      "Django Admin provides complete payment recording with invoice linking, payment methods, and transaction tracking."
                    );
                    if (choice) {
                      window.open('http://localhost:8000/admin/finance/payment/add/', '_blank');
                    }
                  }}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Record Payment</span>
                </button>
              </div>

              <div className="grid gap-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Payment #{payment.id}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            COMPLETED
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Invoice:</span>
                            <p className="font-medium text-gray-900 dark:text-white">#{payment.invoice}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Method:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{payment.method}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Date:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(payment.date)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                            <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                          </div>
                        </div>
                        
                        {payment.reference_number && (
                          <div className="mt-3 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Reference:</span>
                            <span className="ml-2 font-mono text-gray-900 dark:text-white">{payment.reference_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Admin Panel Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl p-6 text-white mt-8"
          >
            <h3 className="text-xl font-semibold mb-2">Complete Financial Management</h3>
            <p className="text-purple-100 mb-4">
              Access the full financial management system through the Django admin interface. 
              This includes advanced invoicing, payment processing, and financial reporting.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="http://localhost:8000/admin/finance/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Finance Admin
              </a>
              <a
                href="/property-management"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Back to Dashboard
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default FinancePage; 