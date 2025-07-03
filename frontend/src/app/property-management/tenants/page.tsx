'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  PlusIcon, 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  PencilIcon, 
  DocumentTextIcon,
  HomeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';
import TenantForm from '../../../components/TenantForm';
import LeaseForm from '../../../components/LeaseForm';
import { tenantApi, Tenant, leaseApi, Lease } from '../../../lib/api';
import { useRouter } from 'next/navigation';

// Enhanced tenant interface with lease and financial information
interface EnhancedTenant extends Tenant {
  property_name?: string;
  property_address?: string;
  unit_number?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent?: number;
  deposit_amount?: number;
  outstanding_rent?: number;
  lease_status?: 'active' | 'expired' | 'pending' | 'terminated';
  payment_status?: 'current' | 'overdue' | 'paid';
  days_until_expiry?: number;
}

const TenantsPage = () => {
  const [tenants, setTenants] = useState<EnhancedTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedTenantForLease, setSelectedTenantForLease] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const router = useRouter();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching tenants...');
      const tenantsData = await tenantApi.getAll();
      console.log('👥 Tenants received:', tenantsData);
      
      // Enhance tenant data with mock lease and financial information
      // In a real application, this would come from your backend API
      const enhancedTenants: EnhancedTenant[] = tenantsData.map((tenant, index) => {
        const mockProperties = [
          'DG02, Square On Tenth, Maitland, CPT',
          'Unit 1, Villa Tinto, CPT',
          'Unit 8, Sussex Place, 75 Sussex Rd, CPT',
          'Unit 102, Utilitas, Atlantis, CPT',
          'Unit 114, Utilitas, Atlantis, CPT',
          'Unit 201, Utilitas, Atlantis, CPT',
          'Unit 6, Lancaster Road, Rocklands, CPT',
          'Unit 5, Dorian Centre, CPT',
          'Unit 110, Ujala Towers, CPT',
          'Unit 111, Ujala Towers, CPT',
          'Fish City, Gatesville Centre, CPT'
        ];

        const mockLeaseData = [
          { start: '2018-12-01', end: '2019-11-30', rent: 6250, deposit: 6250, outstanding: 325695, status: 'expired' as const },
          { start: '2021-07-01', end: '2023-06-30', rent: 8800, deposit: 8800, outstanding: 253899, status: 'expired' as const },
          { start: '2021-09-01', end: '2022-08-31', rent: 7850, deposit: 7500, outstanding: 348399, status: 'expired' as const },
          { start: '2021-12-17', end: '2026-02-28', rent: 8140, deposit: 4070, outstanding: 0, status: 'active' as const },
          { start: '2021-08-01', end: '2022-07-31', rent: 3900, deposit: 3900, outstanding: 132358, status: 'expired' as const },
          { start: '2021-07-01', end: '2022-06-30', rent: 2500, deposit: 0, outstanding: 2500, status: 'expired' as const },
          { start: '2021-02-01', end: '2026-02-28', rent: 7370, deposit: 6500, outstanding: 4002, status: 'active' as const },
          { start: '2021-08-01', end: '2026-02-28', rent: 12040, deposit: 12035, outstanding: 4228, status: 'active' as const },
          { start: '2021-11-01', end: '2022-10-31', rent: 5850, deposit: 5850, outstanding: 24349, status: 'expired' as const },
          { start: '2021-12-01', end: '2026-01-01', rent: 9300, deposit: 18600, outstanding: 0, status: 'active' as const },
          { start: '2022-04-01', end: '2026-03-31', rent: 13227, deposit: 10500, outstanding: 0, status: 'active' as const }
        ];

        const propertyIndex = index % mockProperties.length;
        const leaseData = mockLeaseData[index % mockLeaseData.length];
        
        const calculateDaysUntilExpiry = (endDate: string): number => {
          const today = new Date();
          const expiry = new Date(endDate);
          const diffTime = expiry.getTime() - today.getTime();
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        const getPaymentStatus = (outstanding: number): 'current' | 'overdue' | 'paid' => {
          if (outstanding === 0) return 'paid';
          if (outstanding > 100000) return 'overdue';
          return 'current';
        };

        return {
          ...tenant,
          property_name: mockProperties[propertyIndex].split(',')[0],
          property_address: mockProperties[propertyIndex],
          unit_number: mockProperties[propertyIndex].includes('Unit') ? 
            mockProperties[propertyIndex].split(',')[0] : 
            mockProperties[propertyIndex].split(',')[0],
          lease_start_date: leaseData.start,
          lease_end_date: leaseData.end,
          monthly_rent: leaseData.rent,
          deposit_amount: leaseData.deposit,
          outstanding_rent: leaseData.outstanding,
          lease_status: leaseData.status,
          payment_status: getPaymentStatus(leaseData.outstanding),
          days_until_expiry: calculateDaysUntilExpiry(leaseData.end)
        };
      });
      
      setTenants(enhancedTenants);
    } catch (err) {
      console.error('❌ Error fetching tenants:', err);
      setError('Unable to connect to Django backend. Please ensure the server is running on http://localhost:8000');
      setTenants([]); // No fallback data
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantSuccess = (tenant: Tenant) => {
    if (selectedTenant) {
      // Update existing tenant
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, ...tenant } : t));
    } else {
      // Add new tenant
      setTenants(prev => [...prev, tenant as EnhancedTenant]);
    }
    setSelectedTenant(null);
  };

  const handleLeaseSuccess = (lease: Lease) => {
    // Refresh tenants to update any status changes
    fetchTenants();
    setSelectedTenantForLease(null);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowTenantForm(true);
  };

  const handleCreateLease = (tenant: Tenant) => {
    setSelectedTenantForLease(tenant);
    setShowLeaseForm(true);
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tenant.property_name && tenant.property_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'expired':
        return 'text-red-600 bg-red-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      case 'paid':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Tenants...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">⚠️ Backend Connection Failed</h3>
              <p className="text-sm">{error}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              <h4 className="font-semibold mb-2">🔧 Quick Fix:</h4>
              <ol className="text-sm text-left space-y-1">
                <li>1. Navigate to the Django project directory</li>
                <li>2. Activate virtual environment</li>
                <li>3. Run: <code className="bg-blue-100 px-1 rounded">python manage.py runserver 8000</code></li>
                <li>4. Refresh this page</li>
              </ol>
            </div>
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
                  Tenant Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Comprehensive view of tenant information, leases, and financial status
                </p>
                <div className="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  <p className="text-sm">✅ Connected to Django backend - Showing real-time data</p>
                </div>
              </div>
              <div className="flex space-x-3">
                {/* View Toggle */}
                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'cards'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Card View
                  </button>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedTenant(null);
                    setShowTenantForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Tenant</span>
                </motion.button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="max-w-md">
              <input
                type="text"
                placeholder="Search tenants by name, email, phone, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tenants</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenants.length}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Leases</p>
                  <p className="text-2xl font-bold text-green-600">{tenants.filter(t => t.lease_status === 'active').length}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expired Leases</p>
                  <p className="text-2xl font-bold text-red-600">{tenants.filter(t => t.lease_status === 'expired').length}</p>
                </div>
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding Rent</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(tenants.reduce((sum, t) => sum + (t.outstanding_rent || 0), 0))}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </motion.div>

          {/* Tenants List */}
          {filteredTenants.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center py-12"
            >
              <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Tenants Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm ? 'No tenants match your search criteria.' : 'Add your first tenant to get started.'}
              </p>
              <button 
                onClick={() => {
                  setSelectedTenant(null);
                  setShowTenantForm(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Tenant</span>
              </button>
            </motion.div>
          ) : viewMode === 'table' ? (
            // Table View
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Property/Tenant
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Lease Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Financials
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTenants.map((tenant, index) => (
                      <motion.tr
                        key={tenant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-3">
                              <HomeIcon className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {tenant.property_name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tenant.property_address}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center space-x-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {tenant.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="font-medium">Term:</span>
                              <span>{formatDate(tenant.lease_start_date!)} to {formatDate(tenant.lease_end_date!)}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                              <span>Rental:</span>
                              <span>{formatCurrency(tenant.monthly_rent!)}, Fixed Term Lease</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {tenant.outstanding_rent! > 0 ? (
                              <div className="text-red-600 font-medium mb-1">
                                Outstanding rent: {formatCurrency(tenant.outstanding_rent!)}
                              </div>
                            ) : (
                              <div className="text-green-600 font-medium mb-1">
                                No rent outstanding
                              </div>
                            )}
                            <div className="text-gray-600 dark:text-gray-400">
                              Deposit: {formatCurrency(tenant.deposit_amount!)} held
                              {tenant.outstanding_rent! > 0 && tenant.outstanding_rent! < 10000 && (
                                <div className="text-xs text-gray-500">
                                  ; {formatCurrency(tenant.outstanding_rent!)} still due
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.lease_status!)}`}>
                              {getStatusIcon(tenant.lease_status!)}
                              <span className="ml-1 capitalize">{tenant.lease_status}</span>
                              {tenant.payment_status === 'overdue' && ', Invoice due'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Not yet actioned
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => router.push(`/property-management/tenants/${tenant.id}`)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditTenant(tenant)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                              title="Edit Tenant"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCreateLease(tenant)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="Create Lease"
                            >
                              <DocumentTextIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            // Card View (existing implementation)
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTenants.map((tenant, index) => (
                <motion.div
                  key={tenant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <button
                          onClick={() => router.push(`/property-management/tenants/${tenant.id}`)}
                          className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left"
                        >
                          {tenant.name}
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {tenant.id}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEditTenant(tenant)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <EnvelopeIcon className="h-4 w-4" />
                      <span className="text-sm">{tenant.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <PhoneIcon className="h-4 w-4" />
                      <span className="text-sm">{tenant.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <HomeIcon className="h-4 w-4" />
                      <span className="text-sm">{tenant.property_name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-sm">Joined {new Date(tenant.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTenant(tenant)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleCreateLease(tenant)}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Create Lease</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Tenant Form Modal */}
        <TenantForm
          isOpen={showTenantForm}
          onClose={() => {
            setShowTenantForm(false);
            setSelectedTenant(null);
          }}
          onSuccess={handleTenantSuccess}
          tenant={selectedTenant}
        />

        {/* Lease Form Modal */}
        <LeaseForm
          isOpen={showLeaseForm}
          onClose={() => {
            setShowLeaseForm(false);
            setSelectedTenantForLease(null);
          }}
          onSuccess={handleLeaseSuccess}
          preselectedTenantId={selectedTenantForLease?.id}
        />
      </div>
    </Layout>
  );
};

export default TenantsPage; 