'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CurrencyDollarIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftEllipsisIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { paymentApi, notificationApi, formatCurrency, formatDate } from '../lib/api';
import type { PaymentRecord, NotificationSettings } from '../lib/api';

interface PaymentTrackerProps {
  leaseId: number;
  tenantName: string;
  monthlyRent: number;
  onPaymentUpdate?: () => void;
}

const PaymentTracker: React.FC<PaymentTrackerProps> = ({
  leaseId,
  tenantName,
  monthlyRent,
  onPaymentUpdate
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'notifications' | 'record'>('history');
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    amount: monthlyRent,
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_method: 'bank_transfer' as PaymentRecord['payment_method'],
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    loadPaymentData();
  }, [leaseId]);

  const loadPaymentData = async () => {
    try {
      setIsLoading(true);
      const [paymentHistory, notificationSettings] = await Promise.all([
        paymentApi.getPaymentHistory(leaseId),
        notificationApi.getNotificationSettings(leaseId)
      ]);
      setPayments(paymentHistory);
      setNotifications(notificationSettings);
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      const paymentData = {
        lease_id: leaseId,
        ...newPayment,
        status: 'paid' as const
      };
      
      const newPaymentRecord = await paymentApi.recordPayment(paymentData);
      setPayments(prev => [newPaymentRecord, ...prev]);
      setShowRecordPayment(false);
      setNewPayment({
        amount: monthlyRent,
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
      
      if (onPaymentUpdate) onPaymentUpdate();
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  const handleSendReminder = async (method: 'whatsapp' | 'email' | 'sms') => {
    try {
      setIsSendingReminder(true);
      const result = await paymentApi.sendPaymentReminder(leaseId, method);
      if (result.success) {
        alert(`${method.charAt(0).toUpperCase() + method.slice(1)} reminder sent successfully!`);
      } else {
        alert(`Failed to send reminder: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
      alert('Failed to send reminder. Please try again.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleUpdateNotifications = async (settings: Partial<NotificationSettings>) => {
    try {
      const updated = await notificationApi.updateNotificationSettings(leaseId, settings);
      setNotifications(updated);
      alert('Notification settings updated successfully!');
    } catch (error) {
      console.error('Failed to update notifications:', error);
      alert('Failed to update notification settings.');
    }
  };

  const getPaymentStatusColor = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'overdue': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-200';
      case 'partial': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPaymentStatusIcon = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'overdue': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'partial': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const overduePayments = payments.filter(p => p.status === 'overdue');
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header with Quick Stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Payment Tracking
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {tenantName} • {formatCurrency(monthlyRent)}/month
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {overduePayments.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-sm font-medium"
            >
              {overduePayments.length} Overdue
            </motion.div>
          )}
          
          <button
            onClick={() => setShowRecordPayment(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <CurrencyDollarIcon className="h-4 w-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-red-800 dark:text-red-200">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Last Payment</p>
          <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
            {payments.length > 0 ? formatDate(payments[0].payment_date) : 'None'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {[
          { key: 'history', label: 'Payment History', icon: DocumentTextIcon },
          { key: 'notifications', label: 'Notifications', icon: BellIcon }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment history found</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getPaymentStatusIcon(payment.status)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ')}
                      </p>
                      {payment.reference_number && (
                        <p className="text-xs text-gray-400">Ref: {payment.reference_number}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded ${getPaymentStatusColor(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                    
                    {payment.status === 'overdue' && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleSendReminder('whatsapp')}
                          disabled={isSendingReminder}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                          title="Send WhatsApp reminder"
                        >
                          <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSendReminder('email')}
                          disabled={isSendingReminder}
                          className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                          title="Send email reminder"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSendReminder('sms')}
                          disabled={isSendingReminder}
                          className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                          title="Send SMS reminder"
                        >
                          <DevicePhoneMobileIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'notifications' && notifications && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">WhatsApp Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Send payment reminders via WhatsApp</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.whatsapp_enabled}
                      onChange={(e) => handleUpdateNotifications({ whatsapp_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Send payment reminders via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email_enabled}
                      onChange={(e) => handleUpdateNotifications({ email_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Reminder Schedule</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Days before due date to send reminders: {notifications.rent_reminder_days.join(', ')}
              </p>
              
              <div className="grid grid-cols-4 gap-2">
                {[30, 14, 7, 3, 1].map(day => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notifications.rent_reminder_days.includes(day)}
                      onChange={(e) => {
                        const days = e.target.checked
                          ? [...notifications.rent_reminder_days, day]
                          : notifications.rent_reminder_days.filter(d => d !== day);
                        handleUpdateNotifications({ rent_reminder_days: days });
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{day}d</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showRecordPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowRecordPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Record New Payment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount (ZAR)
                  </label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={newPayment.payment_date}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={newPayment.payment_method}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value as PaymentRecord['payment_method'] }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="online">Online Payment</option>
                    <option value="card">Card Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={newPayment.reference_number}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="Transaction reference..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRecordPayment(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Record Payment</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentTracker; 