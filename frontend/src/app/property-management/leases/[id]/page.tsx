'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../../components/Layout';
import StatusBadge from '../../../../components/StatusBadge';
import DocumentUploader from '../../../../components/DocumentUploader';
import PaymentTracker from '../../../../components/PaymentTracker';
import LeaseRenewalManager from '../../../../components/LeaseRenewalManager';
import { 
  leaseApi, 
  formatCurrency, 
  formatDate,
  getLeaseStatus,
  calculateDaysUntilExpiry
} from '../../../../lib/api';
import type { Lease, LeaseDocument } from '../../../../lib/api';

interface PaymentRecord {
  id: number;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  method: string;
  reference: string;
}

const LeaseDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const leaseId = params?.id as string;
  
  const [lease, setLease] = useState<Lease | null>(null);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lease>>({});

  useEffect(() => {
    if (leaseId) {
      loadLeaseDetails();
    }
  }, [leaseId]);

  const loadLeaseDetails = async () => {
    try {
      setIsLoading(true);
      const [leaseData] = await Promise.all([
        leaseApi.getLease(parseInt(leaseId))
      ]);
      
      setLease(leaseData);
      setDocuments(leaseData.documents);
      setEditData(leaseData);
      
      // Mock payment history - replace with real API call
      setPaymentHistory([
        {
          id: 1,
          amount: leaseData.monthly_rent,
          date: '2024-01-01',
          status: 'paid',
          method: 'Bank Transfer',
          reference: 'REF001'
        },
        {
          id: 2,
          amount: leaseData.monthly_rent,
          date: '2024-02-01',
          status: 'paid',
          method: 'Bank Transfer',
          reference: 'REF002'
        },
        {
          id: 3,
          amount: leaseData.monthly_rent,
          date: '2024-03-01',
          status: 'pending',
          method: 'Bank Transfer',
          reference: 'REF003'
        }
      ]);
      
    } catch (error) {
      console.error('Failed to load lease details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!lease) return;
    
    try {
      const updatedLease = await leaseApi.updateLease(lease.id, editData);
      setLease(updatedLease);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update lease:', error);
      alert('Failed to update lease. Please try again.');
    }
  };

  const handlePrintLease = () => {
    window.print();
  };

  const handleRenewLease = () => {
    // Navigate to renewal form or open renewal modal
    router.push(`/property-management/leases/${leaseId}/renew`);
  };

  const handleTerminateLease = () => {
    if (confirm('Are you sure you want to terminate this lease? This action cannot be undone.')) {
      // Implement lease termination logic
      console.log('Terminating lease...');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading lease details...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (!lease) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Lease Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">The requested lease could not be found.</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const leaseStatusData = getLeaseStatus(lease);
  const daysUntilExpiry = calculateDaysUntilExpiry(lease.end_date);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Lease Details
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {lease.tenant.name} • Unit {lease.unit.number}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <StatusBadge 
                status={leaseStatusData.status}
                color={leaseStatusData.color}
                urgency={leaseStatusData.urgency}
              />
              <button
                onClick={handlePrintLease}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Print Lease"
              >
                <PrinterIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <PencilIcon className="h-4 w-4" />
                <span>{isEditing ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>
          </div>

          {/* Status Alert */}
          {leaseStatusData.status === 'Expiring Soon' && (
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
                    This lease expires in {daysUntilExpiry} days. Consider renewal or finding a new tenant.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Lease Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lease Start Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.start_date || lease.start_date}
                        onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatDate(lease.start_date)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lease End Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.end_date || lease.end_date}
                        onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatDate(lease.end_date)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monthly Rent
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.monthly_rent || lease.monthly_rent}
                        onChange={(e) => setEditData({ ...editData, monthly_rent: parseFloat(e.target.value) })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(lease.monthly_rent)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Security Deposit
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.deposit || lease.deposit}
                        onChange={(e) => setEditData({ ...editData, deposit: parseFloat(e.target.value) })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(lease.deposit)}
                      </p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Tracking */}
              <PaymentTracker
                leaseId={lease.id}
                tenantName={lease.tenant.name}
                monthlyRent={lease.monthly_rent}
                onPaymentUpdate={loadLeaseDetails}
              />

              {/* Lease Renewal Management */}
              <LeaseRenewalManager
                lease={lease}
                onRenewalUpdate={loadLeaseDetails}
              />

              {/* Documents */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
                  <PaperClipIcon className="h-5 w-5 mr-2" />
                  Lease Documents
                </h2>

                <DocumentUploader
                  documents={documents}
                  onUpload={async (file: File, documentType: string) => {
                    // Handle file upload
                    console.log('Uploading:', file, documentType);
                  }}
                  onDelete={async (documentId: number) => {
                    // Handle file deletion
                    console.log('Deleting:', documentId);
                  }}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.png']}
                  maxFileSize={10}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tenant Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Tenant Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lease.tenant.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lease.tenant.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lease.tenant.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
                  <HomeIcon className="h-5 w-5 mr-2" />
                  Property Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Property</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lease.unit.property}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unit</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Unit {lease.unit.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lease.unit.is_vacant ? 'Vacant' : 'Occupied'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Quick Actions
                </h2>

                <div className="space-y-3">
                  <button
                    onClick={handleRenewLease}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Renew Lease</span>
                  </button>
                  
                  <button
                    onClick={() => router.push(`/property-management/finance?tenant=${lease.tenant.id}`)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>View Payments</span>
                  </button>
                  
                  <button
                    onClick={handleTerminateLease}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>Terminate Lease</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeaseDetailsPage; 