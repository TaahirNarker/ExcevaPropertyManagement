'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  ClipboardDocumentIcon,
  ArrowLeftIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  BanknotesIcon,
  HomeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../../components/Layout';
import TenantForm from '../../../../components/TenantForm';
import { tenantApi, leaseApi, invoiceApi, formatCurrency, formatDate, Tenant, Lease, Invoice } from '../../../../lib/api';

const TenantDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tenant' | 'leases' | 'credit' | 'notes'>('tenant');
  const [showEditModal, setShowEditModal] = useState(false);

  const tenantId = parseInt(params.id as string);

  useEffect(() => {
    fetchTenantDetails();
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching tenant details for ID:', tenantId);
      
      const [tenantData, allLeases, allInvoices] = await Promise.all([
        tenantApi.getById(tenantId),
        leaseApi.getAll(),
        invoiceApi.getAll()
      ]);

      setTenant(tenantData);
      
      // Filter leases for this tenant
      const tenantLeases = allLeases.filter(lease => lease.tenant.id === tenantId);
      setLeases(tenantLeases);
      
      // Filter invoices for this tenant's leases
      const leaseIds = tenantLeases.map(lease => lease.id);
      const tenantInvoices = allInvoices.filter(invoice => 
        invoice.tenant.id === tenantId
      );
      setInvoices(tenantInvoices);

      console.log('✅ Tenant details loaded:', {
        tenant: tenantData,
        leases: tenantLeases.length,
        invoices: tenantInvoices.length
      });

    } catch (err) {
      console.error('❌ Error fetching tenant details:', err);
      setError('Failed to load tenant details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantUpdate = (updatedTenant: Tenant) => {
    setTenant(updatedTenant);
    setShowEditModal(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Tenant Details...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error || !tenant) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">⚠️ Tenant Not Found</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => router.push('/property-management/tenants')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
            >
              Back to Tenants
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Calculate tenant statistics
  const activeLease = leases.find(lease => lease.status === 'active');
  const totalOwed = invoices.reduce((sum, invoice) => sum + (invoice.total_amount - invoice.paid_amount), 0);
  const depositHeld = activeLease ? activeLease.deposit_amount : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/property-management/tenants')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Tenant Details
                </h1>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                <span>Edit Tenant</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex space-x-8">
              {[
                { key: 'tenant', label: 'Tenant', icon: UserIcon },
                { key: 'leases', label: 'Leases', icon: DocumentTextIcon },
                { key: 'credit', label: 'Credit Checks', icon: CreditCardIcon },
                { key: 'notes', label: 'Notes', icon: ClipboardDocumentIcon }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {activeTab === 'tenant' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Tenant Information */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          TEN{tenant.id.toString().padStart(6, '0')}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {tenant.name}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-gray-900 dark:text-white">{tenant.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                        <span className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                          tenant.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mobile</label>
                        <div className="flex items-center space-x-2">
                          <PhoneIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-gray-900 dark:text-white">{tenant.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span>Edit Tenant</span>
                    </button>
                    
                    <button
                      onClick={() => router.push(`/property-management/finance?tenant=${tenant.id}`)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <BanknotesIcon className="h-4 w-4" />
                      <span>View Financials</span>
                    </button>
                    
                    {activeLease && (
                      <button
                        onClick={() => router.push(`/property-management/leases/${activeLease.id}`)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        <span>View Lease</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section - Cards for Lease, Financials, Credit Check */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Lease Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lease</h3>
                </div>
                {activeLease && (
                  <button
                    onClick={() => router.push(`/property-management/leases/${activeLease.id}`)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    View Lease
                  </button>
                )}
              </div>
              
              {activeLease ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 font-medium">
                      Expired on {formatDate(activeLease.end_date)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(activeLease.start_date)} - {formatDate(activeLease.end_date)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => router.push(`/property-management/leases/${activeLease.id}`)}
                      className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-2 rounded font-medium transition-colors"
                    >
                      View Lease
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">No active lease</p>
                </div>
              )}
            </div>

            {/* Financials Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BanknotesIcon className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financials</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Due: {formatCurrency(totalOwed)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Deposit Held: {formatCurrency(depositHeld)}
                  </p>
                </div>
              </div>
            </div>

            {/* Credit Check Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CreditCardIcon className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Credit Check</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    Last check: No credit check on file
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button className="w-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 py-2 rounded font-medium transition-colors">
                    Update credit check
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'leases' && (
            <div className="mt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Lease History</h3>
                
                {leases.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leases Found</h3>
                    <p className="text-gray-600 dark:text-gray-400">This tenant doesn't have any lease agreements yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leases.map((lease) => (
                      <div key={lease.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Unit {lease.unit.number} - {lease.unit.property}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Monthly Rent: {formatCurrency(lease.monthly_rent)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              lease.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              lease.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {lease.status}
                            </span>
                            <button
                              onClick={() => router.push(`/property-management/leases/${lease.id}`)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'credit' && (
            <div className="mt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Credit Check History</h3>
                
                <div className="text-center py-12">
                  <CreditCardIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Credit Checks</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No credit checks have been performed for this tenant.</p>
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Run Credit Check
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="mt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Notes</h3>
                
                <div className="space-y-4">
                  {(tenant as any).notes ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-900 dark:text-white">{(tenant as any).notes}</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardDocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Notes</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">No notes have been added for this tenant.</p>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                        Add Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Tenant Modal */}
        <TenantForm
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleTenantUpdate}
          tenant={tenant}
        />
      </div>
    </Layout>
  );
};

export default TenantDetailPage; 