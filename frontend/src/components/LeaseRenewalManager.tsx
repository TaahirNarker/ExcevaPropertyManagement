'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BellIcon,
  CurrencyDollarIcon,
  UserIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftEllipsisIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { renewalApi, formatCurrency, formatDate } from '../lib/api';
import type { LeaseRenewal, Lease } from '../lib/api';

interface LeaseRenewalManagerProps {
  lease: Lease;
  onRenewalUpdate?: () => void;
}

const LeaseRenewalManager: React.FC<LeaseRenewalManagerProps> = ({
  lease,
  onRenewalUpdate
}) => {
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [activeRenewal, setActiveRenewal] = useState<LeaseRenewal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  
  // Renewal form state
  const [renewalForm, setRenewalForm] = useState({
    new_start_date: '',
    new_end_date: '',
    new_monthly_rent: lease.monthly_rent,
    escalation_percentage: 8.0, // Default 8% escalation
    renewal_terms: '',
    renewal_date: ''
  });

  useEffect(() => {
    loadRenewalData();
  }, [lease.id]);

  const loadRenewalData = async () => {
    try {
      setIsLoading(true);
      // In real implementation, we'd have an endpoint to get renewals for a lease
      const renewalsForLease = await renewalApi.getRenewalsDue(365); // Get all renewals
      setRenewals(renewalsForLease.filter(r => r.original_lease_id === lease.id));
      
      // Check if there's an active renewal
      const active = renewalsForLease.find(r => 
        r.original_lease_id === lease.id && 
        ['pending', 'approved'].includes(r.status)
      );
      setActiveRenewal(active || null);
    } catch (error) {
      console.error('Failed to load renewal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysUntilExpiry = () => {
    const today = new Date();
    const expiryDate = new Date(lease.end_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateNewRent = (escalationPercentage: number) => {
    return lease.monthly_rent * (1 + escalationPercentage / 100);
  };

  const handleInitiateRenewal = async () => {
    try {
      const renewalData = {
        original_lease_id: lease.id,
        renewal_date: renewalForm.renewal_date,
        new_start_date: renewalForm.new_start_date,
        new_end_date: renewalForm.new_end_date,
        new_monthly_rent: renewalForm.new_monthly_rent,
        escalation_percentage: renewalForm.escalation_percentage,
        status: 'pending' as const,
        renewal_terms: renewalForm.renewal_terms,
        tenant_acceptance: false,
        landlord_acceptance: false
      };

      const newRenewal = await renewalApi.initiateRenewal(renewalData);
      setRenewals(prev => [newRenewal, ...prev]);
      setActiveRenewal(newRenewal);
      setShowRenewalForm(false);
      
      if (onRenewalUpdate) onRenewalUpdate();
    } catch (error) {
      console.error('Failed to initiate renewal:', error);
      alert('Failed to initiate renewal. Please try again.');
    }
  };

  const handleUpdateRenewalStatus = async (renewalId: number, status: LeaseRenewal['status']) => {
    try {
      const updated = await renewalApi.updateRenewalStatus(renewalId, status);
      setRenewals(prev => prev.map(r => r.id === renewalId ? updated : r));
      
      if (activeRenewal?.id === renewalId) {
        setActiveRenewal(updated);
      }
      
      if (onRenewalUpdate) onRenewalUpdate();
    } catch (error) {
      console.error('Failed to update renewal status:', error);
      alert('Failed to update renewal status.');
    }
  };

  const handleSendRenewalNotification = async (renewalId: number, method: 'whatsapp' | 'email') => {
    try {
      setIsSendingNotification(true);
      const result = await renewalApi.sendRenewalNotification(renewalId, method);
      
      if (result.success) {
        alert(`${method.charAt(0).toUpperCase() + method.slice(1)} notification sent successfully!`);
      } else {
        alert(`Failed to send notification: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const getStatusColor = (status: LeaseRenewal['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-200';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-200';
      case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: LeaseRenewal['status']) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'approved': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'completed': return <DocumentDuplicateIcon className="h-5 w-5 text-blue-500" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const daysUntilExpiry = calculateDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="bg-gray-100 dark:bg-gray-800">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
            Lease Renewal Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Current lease expires {formatDate(lease.end_date)} ({daysUntilExpiry} days)
          </p>
        </div>
        
        {!activeRenewal && (isExpiringSoon || isExpired) && (
          <button
            onClick={() => setShowRenewalForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            <span>Initiate Renewal</span>
          </button>
        )}
      </div>

      {/* Expiry Alert */}
      {isExpiringSoon && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Lease Expiring Soon
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                This lease expires in {daysUntilExpiry} days. Consider initiating renewal process.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {isExpired && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center space-x-3">
            <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                Lease Expired
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                This lease expired {Math.abs(daysUntilExpiry)} days ago. Immediate action required.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Renewal Status */}
      {activeRenewal && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(activeRenewal.status)}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Active Renewal Process
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Initiated on {formatDate(activeRenewal.created_at)}
                </p>
              </div>
            </div>
            
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(activeRenewal.status)}`}>
              {activeRenewal.status.charAt(0).toUpperCase() + activeRenewal.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New Term</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(activeRenewal.new_start_date)} - {formatDate(activeRenewal.new_end_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New Monthly Rent</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(activeRenewal.new_monthly_rent)}
                <span className="text-sm text-green-600 dark:text-green-400 ml-2">
                  (+{activeRenewal.escalation_percentage}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rent Increase</p>
              <p className="font-medium text-gray-900 dark:text-white">
                +{formatCurrency(activeRenewal.new_monthly_rent - lease.monthly_rent)}
              </p>
            </div>
          </div>

          {/* Acceptance Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Tenant Acceptance:</span>
                {activeRenewal.tenant_acceptance ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ClockIcon className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Landlord Acceptance:</span>
                {activeRenewal.landlord_acceptance ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ClockIcon className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {activeRenewal.status === 'pending' && (
              <>
                <button
                  onClick={() => handleUpdateRenewalStatus(activeRenewal.id, 'approved')}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Approve</span>
                </button>
                
                <button
                  onClick={() => handleUpdateRenewalStatus(activeRenewal.id, 'rejected')}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  <XCircleIcon className="h-4 w-4" />
                  <span>Reject</span>
                </button>
              </>
            )}
            
            {activeRenewal.status === 'approved' && (
              <button
                onClick={() => handleUpdateRenewalStatus(activeRenewal.id, 'completed')}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span>Complete Renewal</span>
              </button>
            )}

            <button
              onClick={() => handleSendRenewalNotification(activeRenewal.id, 'whatsapp')}
              disabled={isSendingNotification}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
            >
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
            
            <button
              onClick={() => handleSendRenewalNotification(activeRenewal.id, 'email')}
              disabled={isSendingNotification}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              <EnvelopeIcon className="h-4 w-4" />
              <span>Email</span>
            </button>
          </div>
        </div>
      )}

      {/* Renewal History */}
      {renewals.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Renewal History</h3>
          <div className="space-y-3">
            {renewals.map((renewal) => (
              <div
                key={renewal.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(renewal.status)}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(renewal.new_start_date)} - {formatDate(renewal.new_end_date)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(renewal.new_monthly_rent)} (+{renewal.escalation_percentage}%)
                    </p>
                  </div>
                </div>
                
                <span className={`px-2 py-1 text-xs rounded ${getStatusColor(renewal.status)}`}>
                  {renewal.status.charAt(0).toUpperCase() + renewal.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewal Form Modal */}
      <AnimatePresence>
        {showRenewalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowRenewalForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Initiate Lease Renewal</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Start Date
                    </label>
                    <input
                      type="date"
                      value={renewalForm.new_start_date}
                      onChange={(e) => setRenewalForm(prev => ({ ...prev, new_start_date: e.target.value }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New End Date
                    </label>
                    <input
                      type="date"
                      value={renewalForm.new_end_date}
                      onChange={(e) => setRenewalForm(prev => ({ ...prev, new_end_date: e.target.value }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Escalation Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={renewalForm.escalation_percentage}
                    onChange={(e) => {
                      const percentage = parseFloat(e.target.value) || 0;
                      setRenewalForm(prev => ({ 
                        ...prev, 
                        escalation_percentage: percentage,
                        new_monthly_rent: calculateNewRent(percentage)
                      }));
                    }}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Monthly Rent (ZAR)
                  </label>
                  <input
                    type="number"
                    value={renewalForm.new_monthly_rent}
                    onChange={(e) => setRenewalForm(prev => ({ ...prev, new_monthly_rent: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Current: {formatCurrency(lease.monthly_rent)} • 
                    Increase: {formatCurrency(renewalForm.new_monthly_rent - lease.monthly_rent)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Renewal Terms
                  </label>
                  <textarea
                    value={renewalForm.renewal_terms}
                    onChange={(e) => setRenewalForm(prev => ({ ...prev, renewal_terms: e.target.value }))}
                    rows={4}
                    placeholder="Special conditions, changes, or notes for the renewal..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={renewalForm.renewal_date}
                    onChange={(e) => setRenewalForm(prev => ({ ...prev, renewal_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRenewalForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiateRenewal}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>Initiate Renewal</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaseRenewalManager; 