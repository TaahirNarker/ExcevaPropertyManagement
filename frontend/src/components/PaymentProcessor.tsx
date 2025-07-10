'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CurrencyDollarIcon,
  CreditCardIcon,
  QrCodeIcon,
  BoltIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  LinkIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon,
  ChatBubbleLeftRightIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { paymentApi, invoiceApi, formatCurrency, formatDate } from '../lib/api';
import type { 
  PaymentRecord, 
  Invoice, 
  LightningPayment, 
  CryptoExchangeRate, 
  FinancialAnalytics 
} from '../lib/api';

interface PaymentProcessorProps {
  className?: string;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'process' | 'history' | 'analytics'>('process');
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['payment_method']>('bank_transfer');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [exchangeRates, setExchangeRates] = useState<CryptoExchangeRate[]>([]);
  const [lightningPayment, setLightningPayment] = useState<LightningPayment | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingLightning, setIsGeneratingLightning] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Form state
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: 0,
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    transaction_hash: '',
    notes: ''
  });

  // QR Code and Lightning states
  const [showQRCode, setShowQRCode] = useState(false);
  const [lightningInvoiceExpiry, setLightningInvoiceExpiry] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lightningPayment && lightningPayment.status === 'pending') {
      const interval = setInterval(() => {
        checkLightningPaymentStatus();
      }, 5000); // Check every 5 seconds

      const expiryTime = new Date(lightningPayment.expires_at).getTime();
      const now = new Date().getTime();
      setLightningInvoiceExpiry(Math.max(0, expiryTime - now));

      const countdown = setInterval(() => {
        const remaining = Math.max(0, expiryTime - new Date().getTime());
        setLightningInvoiceExpiry(remaining);
        
        if (remaining <= 0) {
          clearInterval(countdown);
          setLightningPayment(null);
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(countdown);
      };
    }
  }, [lightningPayment]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [invoicesData, paymentsData, analyticsData, ratesData] = await Promise.all([
        invoiceApi.getInvoices({ status: 'sent,overdue,partial' }),
        paymentApi.getPaymentHistory(1), // This would need to be modified for all payments
        paymentApi.getPaymentAnalytics(),
        paymentApi.getExchangeRates()
      ]);
      
      setInvoices(invoicesData.results);
      setPayments(paymentsData);
      setAnalytics(analyticsData);
      setExchangeRates(ratesData);
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice) {
      alert('Please select an invoice first.');
      return;
    }

    try {
      setIsProcessing(true);

      if (paymentMethod === 'bitcoin_lightning') {
        await handleLightningPayment();
      } else if (paymentMethod === 'crypto') {
        await handleCryptoPayment();
      } else {
        await handleTraditionalPayment();
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLightningPayment = async () => {
    try {
      setIsGeneratingLightning(true);
      const lightning = await paymentApi.createLightningPayment(
        selectedInvoice!.id,
        paymentForm.amount || selectedInvoice!.total_amount
      );
      
      setLightningPayment(lightning);
      setShowQRCode(true);
    } catch (error) {
      console.error('Failed to create Lightning payment:', error);
      alert('Failed to create Lightning invoice. Please try again.');
    } finally {
      setIsGeneratingLightning(false);
    }
  };

  const handleCryptoPayment = async () => {
    if (!paymentForm.transaction_hash) {
      alert('Please provide the transaction hash for crypto payment verification.');
      return;
    }

    try {
      const payment = await paymentApi.verifyCryptoPayment(
        paymentForm.transaction_hash,
        selectedInvoice!.id
      );
      
      setPayments(prev => [payment, ...prev]);
      alert('Crypto payment verified successfully!');
      resetForm();
    } catch (error) {
      console.error('Failed to verify crypto payment:', error);
      alert('Failed to verify crypto payment. Please check the transaction hash.');
    }
  };

  const handleTraditionalPayment = async () => {
    try {
      const paymentData = {
        lease_id: selectedInvoice!.lease_id,
        invoice_id: selectedInvoice!.id,
        amount: paymentForm.amount || selectedInvoice!.total_amount,
        payment_date: paymentForm.payment_date,
        due_date: selectedInvoice!.due_date,
        payment_method: paymentMethod,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
        status: 'paid' as const
      };

      const payment = await paymentApi.recordPayment(paymentData);
      setPayments(prev => [payment, ...prev]);
      
      alert('Payment recorded successfully!');
      resetForm();
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  const checkLightningPaymentStatus = async () => {
    if (!lightningPayment) return;

    try {
      const updatedPayment = await paymentApi.checkLightningPayment(lightningPayment.id);
      
      if (updatedPayment.status === 'paid') {
        setLightningPayment(updatedPayment);
        alert('Lightning payment received successfully!');
        loadData(); // Refresh data
        resetForm();
        setShowQRCode(false);
      } else {
        setLightningPayment(updatedPayment);
      }
    } catch (error) {
      console.error('Failed to check Lightning payment status:', error);
    }
  };

  const resetForm = () => {
    setPaymentForm({
      invoice_id: 0,
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      transaction_hash: '',
      notes: ''
    });
    setSelectedInvoice(null);
    setLightningPayment(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getPaymentMethodIcon = (method: PaymentRecord['payment_method']) => {
    switch (method) {
      case 'bitcoin_lightning': return <BoltIcon className="h-5 w-5 text-orange-500" />;
      case 'crypto': return <QrCodeIcon className="h-5 w-5 text-purple-500" />;
      case 'bank_transfer': return <BuildingLibraryIcon className="h-5 w-5 text-blue-500" />;
      case 'card': return <CreditCardIcon className="h-5 w-5 text-green-500" />;
      case 'cash': return <BanknotesIcon className="h-5 w-5 text-green-600" />;
      case 'online': return <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-500" />;
      default: return <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPaymentStatusIcon = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'overdue': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBitcoinRate = () => {
    const btcRate = exchangeRates.find(rate => rate.currency_pair === 'BTC/ZAR');
    return btcRate ? btcRate.rate : 0;
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="bg-gray-100 dark:bg-gray-800">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            <CreditCardIcon className="h-6 w-6 mr-3" />
            Payment Processing
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Process payments with traditional and crypto methods including Bitcoin Lightning
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {getBitcoinRate() > 0 && (
            <div className="text-sm bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full">
              BTC: {formatCurrency(getBitcoinRate())}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {[
          { key: 'process', label: 'Process Payment', icon: CreditCardIcon },
          { key: 'history', label: 'Payment History', icon: CalendarIcon },
          { key: 'analytics', label: 'Analytics', icon: ChatBubbleLeftRightIcon }
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

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'process' && (
          <motion.div
            key="process"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Invoice Selection */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Select Invoice</h3>
              <div className="grid grid-cols-1 gap-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <motion.div
                    key={invoice.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setPaymentForm(prev => ({ 
                        ...prev, 
                        invoice_id: invoice.id,
                        amount: invoice.total_amount 
                      }));
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedInvoice?.id === invoice.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {invoice.invoice_number}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {invoice.tenant.name} • Unit {invoice.unit.number}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Due: {formatDate(invoice.due_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          invoice.status === 'overdue' 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {selectedInvoice && (
              <>
                {/* Payment Method Selection */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Payment Method</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { method: 'bank_transfer', label: 'Bank Transfer', icon: BuildingLibraryIcon, color: 'blue' },
                      { method: 'card', label: 'Card Payment', icon: CreditCardIcon, color: 'green' },
                      { method: 'bitcoin_lightning', label: 'Bitcoin Lightning', icon: BoltIcon, color: 'orange' },
                      { method: 'crypto', label: 'Cryptocurrency', icon: QrCodeIcon, color: 'purple' },
                      { method: 'cash', label: 'Cash', icon: BanknotesIcon, color: 'emerald' },
                      { method: 'online', label: 'Online Payment', icon: DevicePhoneMobileIcon, color: 'indigo' }
                    ].map(({ method, label, icon: Icon, color }) => (
                      <motion.button
                        key={method}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod(method as any)}
                        className={`p-4 border-2 rounded-lg transition-colors ${
                          paymentMethod === method
                            ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mx-auto mb-2 ${
                          paymentMethod === method 
                            ? `text-${color}-600 dark:text-${color}-400`
                            : 'text-gray-400'
                        }`} />
                        <div className={`text-sm font-medium ${
                          paymentMethod === method
                            ? `text-${color}-900 dark:text-${color}-100`
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {label}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Payment Form */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Payment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (ZAR)
                      </label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      {paymentMethod === 'bitcoin_lightning' && getBitcoinRate() > 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          ≈ {(paymentForm.amount / getBitcoinRate() * 100000000).toFixed(0)} sats
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Conditional Fields */}
                  {(paymentMethod === 'bank_transfer' || paymentMethod === 'card' || paymentMethod === 'online') && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={paymentForm.reference_number}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                        placeholder="Transaction reference..."
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {paymentMethod === 'crypto' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Transaction Hash
                      </label>
                      <input
                        type="text"
                        value={paymentForm.transaction_hash}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_hash: e.target.value }))}
                        placeholder="Enter blockchain transaction hash..."
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Additional payment notes..."
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Process Payment Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessing || isGeneratingLightning}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing || isGeneratingLightning ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        {getPaymentMethodIcon(paymentMethod)}
                        <span>
                          {paymentMethod === 'bitcoin_lightning' ? 'Generate Lightning Invoice' : 
                           paymentMethod === 'crypto' ? 'Verify Crypto Payment' :
                           'Record Payment'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <h3 className="font-medium text-gray-900 dark:text-white">Recent Payments</h3>
            
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payments found</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getPaymentStatusIcon(payment.status)}
                      {getPaymentMethodIcon(payment.payment_method)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ')}
                      </div>
                      {payment.reference_number && (
                        <div className="text-xs text-gray-400">
                          Ref: {payment.reference_number}
                        </div>
                      )}
                      {payment.transaction_hash && (
                        <div className="text-xs text-gray-400">
                          Hash: {payment.transaction_hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      payment.status === 'paid' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                    
                    {payment.payment_method === 'bitcoin_lightning' && payment.lightning_invoice && (
                      <button
                        onClick={() => copyToClipboard(payment.lightning_invoice!)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Copy Lightning Invoice"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'analytics' && analytics && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h3 className="font-medium text-gray-900 dark:text-white">Payment Analytics</h3>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Collected</div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {formatCurrency(analytics.total_paid_amount)}
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">Collection Rate</div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {(analytics.collection_rate * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="text-sm text-red-600 dark:text-red-400 mb-1">Outstanding</div>
                <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {formatCurrency(analytics.total_outstanding)}
                </div>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Payment Methods</h4>
              <div className="space-y-3">
                {analytics.payment_method_breakdown.map((method) => {
                  const percentage = (method.amount / analytics.total_paid_amount) * 100;
                  return (
                    <div key={method.method} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getPaymentMethodIcon(method.method as any)}
                        <span className="text-gray-900 dark:text-white capitalize">
                          {method.method.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">
                          {formatCurrency(method.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightning QR Code Modal */}
      <AnimatePresence>
        {showQRCode && lightningPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="text-center mb-6">
                  <BoltIcon className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Bitcoin Lightning Payment
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Scan with Lightning wallet or copy payment request
                  </p>
                </div>

                {/* QR Code Placeholder - In real implementation, use a QR code library */}
                <div className="bg-gray-100 dark:bg-gray-700 h-64 w-64 mx-auto rounded-lg flex items-center justify-center mb-4">
                  <QrCodeIcon className="h-32 w-32 text-gray-400" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount
                    </label>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(lightningPayment.amount_zar)}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({lightningPayment.amount_sats} sats)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Request
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={lightningPayment.payment_request}
                        readOnly
                        className="flex-1 p-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => copyToClipboard(lightningPayment.payment_request)}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {lightningInvoiceExpiry > 0 && (
                    <div className="text-center">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Expires in: <span className="font-mono text-orange-600 dark:text-orange-400">
                          {formatTimeRemaining(lightningInvoiceExpiry)}
                        </span>
                      </div>
                    </div>
                  )}

                  {lightningPayment.status === 'paid' && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">
                            Payment Received!
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Lightning payment confirmed successfully
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => setShowQRCode(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
                {lightningPayment.status === 'pending' && (
                  <button
                    onClick={checkLightningPaymentStatus}
                    disabled={isVerifyingPayment}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isVerifyingPayment ? 'Checking...' : 'Check Status'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentProcessor; 