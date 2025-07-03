'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  UserIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  PencilIcon,
  HomeIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  BanknotesIcon,
  XMarkIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../../components/Layout';
import UnitDetailModal from '../../../../components/UnitDetailModal';
import { propertyApi, unitApi, tenantApi, leaseApi, invoiceApi, landlordApi, formatCurrency, formatDate, Property, Unit, Tenant, Lease, Invoice, Landlord } from '../../../../lib/api';

const PropertyDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'property' | 'financials' | 'leases' | 'tenants' | 'advertise' | 'more' | 'reports'>('property');
  const [financialPeriod, setFinancialPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'three_months'>('three_months');
  const [financialSubTab, setFinancialSubTab] = useState<'statement' | 'tax_expenses' | 'unpaid_bills'>('statement');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUnitDetail, setShowUnitDetail] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const propertyId = parseInt(params.id as string);

  useEffect(() => {
    fetchPropertyDetails();
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching property details for ID:', propertyId);
      
      const [propertyData, allUnits, allTenants, allLeases, allInvoices] = await Promise.all([
        propertyApi.getById(propertyId),
        unitApi.getAll(),
        tenantApi.getAll(),
        leaseApi.getAll(),
        invoiceApi.getAll()
      ]);

      setProperty(propertyData);
      
      // Filter data for this property
      const propertyUnits = allUnits.filter(unit => unit.property_id === propertyId);
      setUnits(propertyUnits);
      
      // Get tenants for this property's units
      const unitIds = propertyUnits.map(unit => unit.id);
      const propertyLeases = allLeases.filter(lease => unitIds.includes(lease.unit.id));
      setLeases(propertyLeases);
      
      const tenantIds = propertyLeases.map(lease => lease.tenant.id);
      const propertyTenants = allTenants.filter(tenant => tenantIds.includes(tenant.id));
      setTenants(propertyTenants);
      
      // Get invoices for this property
      const propertyInvoices = allInvoices.filter(invoice => unitIds.includes(invoice.unit.id));
      setInvoices(propertyInvoices);

      // Get landlord if property has landlord_id
      if (propertyData.landlord_id) {
        try {
          const landlordData = await landlordApi.getById(propertyData.landlord_id);
          setLandlord(landlordData);
        } catch (err) {
          console.log('No landlord found for this property');
        }
      }

      console.log('✅ Property details loaded:', {
        property: propertyData,
        units: propertyUnits.length,
        tenants: propertyTenants.length,
        leases: propertyLeases.length,
        invoices: propertyInvoices.length
      });

    } catch (err) {
      console.error('❌ Error fetching property details:', err);
      setError('Failed to load property details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProperty = async () => {
    try {
      await propertyApi.delete(propertyId);
      router.push('/property-management/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const handleEditProperty = () => {
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Property Details...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error || !property) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">⚠️ Property Not Found</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => router.push('/property-management/properties')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
            >
              Back to Properties
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const occupiedUnits = units.filter(unit => unit.is_occupied).length;
  const vacantUnits = units.length - occupiedUnits;
  const totalMonthlyRent = units.reduce((sum, unit) => sum + unit.rent, 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + (invoice.total_amount - invoice.paid_amount), 0);
  const activeLease = leases.find(lease => lease.status === 'active');
  const currentTenant = activeLease ? tenants.find(t => t.id === activeLease.tenant.id) : null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-1">
              {[
                { key: 'property', label: 'Property', icon: BuildingOfficeIcon, active: activeTab === 'property' },
                { key: 'financials', label: 'Financials', icon: CurrencyDollarIcon, active: activeTab === 'financials' },
                { key: 'leases', label: 'Lease(s)', icon: DocumentTextIcon, active: activeTab === 'leases' },
                { key: 'tenants', label: 'Tenants', icon: UsersIcon, active: activeTab === 'tenants' },
                { key: 'advertise', label: 'Advertise', icon: EyeIcon, active: activeTab === 'advertise' },
                { key: 'more', label: 'More', icon: HomeIcon, active: activeTab === 'more' },
                { key: 'reports', label: 'Reports', icon: ChartBarIcon, active: activeTab === 'reports' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                    tab.active
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
          {activeTab === 'property' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Section */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Map Placeholder */}
                  <div className="h-96 bg-blue-100 dark:bg-blue-900 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapPinIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Interactive Map</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{property.address}</p>
                        <div className="mt-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                          📍 {property.address.split(',')[0]}
                        </div>
                      </div>
                    </div>
                    {/* Map Controls */}
                    <div className="absolute top-4 right-4 flex flex-col space-y-2">
                      <button className="bg-white dark:bg-gray-800 p-2 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">+</button>
                      <button className="bg-white dark:bg-gray-800 p-2 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">−</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Information Panel */}
              <div className="space-y-6">
                {/* Property Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{property.name}</h2>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={handleEditProperty}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Landlord</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {landlord?.name || property.landlord_name || 'Not specified'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Address</label>
                      <p className="font-medium text-gray-900 dark:text-white">{property.address}</p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Type</label>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {property.property_type?.replace('_', ' ')} - {property.property_category || 'House'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Tenant(s)</label>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {currentTenant?.name || 'No current tenant'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Invoice Bank Account</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {landlord?.bank_account_name || property.bank_account_name || 'Not specified'}
                        {landlord?.bank_account_number && `, ${landlord.bank_account_number}`}
                        {landlord?.phone && ` (${landlord.phone})`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-2">
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      🗑 Delete property
                    </button>
                    <button 
                      onClick={handleEditProperty}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      ✏️ Edit property
                    </button>
                  </div>
                </div>

                {/* Occupancy Status Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Occupied Status */}
                  <div className="bg-green-500 text-white rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">🏠 Occupied</h3>
                        <p className="text-sm opacity-90">
                          {activeLease ? `Occupied until ${formatDate(activeLease.end_date)}` : 'Currently vacant'}
                        </p>
                        <div className="mt-2 flex space-x-4 text-sm">
                          <button className="underline hover:no-underline">View leases</button>
                          <button className="underline hover:no-underline">Make inactive</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rental Information */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">💰 Rental</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{formatCurrency(totalOutstanding)} outstanding</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Rental: {formatCurrency(activeLease?.monthly_rent || 0)}</p>
                        <p>Deposit held: {formatCurrency(activeLease?.deposit_amount || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">🛠 Expenses</h3>
                    </div>
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No unpaid bills</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              {/* Financial Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Property Income Statement</h2>
                  <select 
                    value={financialPeriod}
                    onChange={(e) => setFinancialPeriod(e.target.value as any)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="three_months">Three months to date</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 mb-6">
                  <div className="flex space-x-8 text-sm">
                    <button 
                      onClick={() => setFinancialSubTab('statement')}
                      className={`font-medium pb-1 transition-colors ${
                        financialSubTab === 'statement' 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Statement
                    </button>
                    <button 
                      onClick={() => setFinancialSubTab('tax_expenses')}
                      className={`font-medium pb-1 transition-colors ${
                        financialSubTab === 'tax_expenses' 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Tax Expenses
                    </button>
                    <button 
                      onClick={() => setFinancialSubTab('unpaid_bills')}
                      className={`font-medium pb-1 transition-colors ${
                        financialSubTab === 'unpaid_bills' 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Unpaid Bills
                    </button>
                  </div>
                </div>

                {/* Content based on selected tab */}
                {financialSubTab === 'statement' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-left py-3 font-medium text-gray-900 dark:text-white">PROPERTY INCOME STATEMENT</th>
                          <th className="text-center py-3 font-medium text-gray-900 dark:text-white">Apr 2025</th>
                          <th className="text-center py-3 font-medium text-gray-900 dark:text-white">May 2025</th>
                          <th className="text-center py-3 font-medium text-gray-900 dark:text-white">Jun 2025</th>
                          <th className="text-center py-3 font-medium text-gray-900 dark:text-white">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                        <tr>
                          <td className="py-3 font-medium text-gray-900 dark:text-white">Income</td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td className="py-3 pl-4 text-gray-700 dark:text-gray-300">Rent Income</td>
                          <td className="text-center text-blue-600">{formatCurrency(17545)}</td>
                          <td className="text-center text-blue-600">{formatCurrency(17545)}</td>
                          <td className="text-center text-blue-600">{formatCurrency(17545)}</td>
                          <td className="text-center text-blue-600 font-medium">{formatCurrency(52635)}</td>
                        </tr>
                        <tr>
                          <td className="py-3 pl-4 text-gray-700 dark:text-gray-300">Utility Income</td>
                          <td className="text-center text-red-600">-{formatCurrency(6136.42)}</td>
                          <td className="text-center text-blue-600">{formatCurrency(804.18)}</td>
                          <td className="text-center text-blue-600">{formatCurrency(804.15)}</td>
                          <td className="text-center text-red-600 font-medium">-{formatCurrency(4528.09)}</td>
                        </tr>
                        <tr className="border-t border-gray-200 dark:border-gray-600">
                          <td className="py-3 font-medium text-gray-900 dark:text-white">Total income</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(11408.58)}</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(18349.18)}</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(18349.15)}</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(48106.91)}</td>
                        </tr>
                        <tr className="border-t border-gray-200 dark:border-gray-600">
                          <td className="py-3 font-medium text-gray-900 dark:text-white">Net income</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(11408.58)}</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(18349.18)}</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(18349.15)}</td>
                          <td className="text-center font-medium text-blue-600">{formatCurrency(48106.91)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {financialSubTab === 'tax_expenses' && (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tax Expenses</h3>
                    <p className="text-gray-500 dark:text-gray-400">No tax expenses recorded for this period</p>
                  </div>
                )}

                {financialSubTab === 'unpaid_bills' && (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unpaid Bills</h3>
                    <p className="text-gray-500 dark:text-gray-400">No unpaid bills</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tenants' && (
            <div className="space-y-6">
              {/* Tenants Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <UsersIcon className="h-6 w-6 mr-2" />
                    Property Tenants ({tenants.length})
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {tenants.filter(tenant => tenant.is_active).length} Active • {tenants.filter(tenant => !tenant.is_active).length} Inactive
                  </div>
                </div>
                
                {tenants.length === 0 ? (
                  <div className="text-center py-12">
                    <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Tenants Found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      This property doesn't have any tenants yet.
                    </p>
                    <button
                      onClick={() => router.push('/property-management/tenants')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Add First Tenant
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tenants.map((tenant) => {
                      // Find the current lease for this tenant in this property
                      const currentLease = leases.find(lease => 
                        lease.tenant.id === tenant.id && lease.status === 'active'
                      );
                      const tenantUnit = currentLease ? units.find(unit => unit.id === currentLease.unit.id) : null;
                      
                      return (
                        <motion.div
                          key={tenant.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {tenant.name}
                                  </h3>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      tenant.is_active 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                      {tenant.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 mb-4">
                              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                <EnvelopeIcon className="h-4 w-4" />
                                <span className="text-sm truncate">{tenant.email}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                <PhoneIcon className="h-4 w-4" />
                                <span className="text-sm">{tenant.phone}</span>
                              </div>
                              {tenantUnit && (
                                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                  <HomeIcon className="h-4 w-4" />
                                  <span className="text-sm">Unit {tenantUnit.number}</span>
                                </div>
                              )}
                              {currentLease && (
                                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                  <CurrencyDollarIcon className="h-4 w-4" />
                                  <span className="text-sm">{formatCurrency(currentLease.monthly_rent)}/month</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/property-management/tenants/${tenant.id}`)}
                                  className="flex-1 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                  View Details
                                </button>
                                {currentLease && (
                                  <button
                                    onClick={() => router.push(`/property-management/leases/${currentLease.id}`)}
                                    className="flex-1 bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                                  >
                                    View Lease
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Actions for Tenants */}
                {tenants.length > 0 && (
                  <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => router.push('/property-management/tenants')}
                        className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg transition-colors"
                      >
                        <UsersIcon className="h-4 w-4" />
                        <span>Manage All Tenants</span>
                      </button>
                      <button
                        onClick={() => router.push('/property-management/leases')}
                        className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg transition-colors"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        <span>View All Leases</span>
                      </button>
                      <button
                        onClick={() => router.push('/property-management/finance')}
                        className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg transition-colors"
                      >
                        <CurrencyDollarIcon className="h-4 w-4" />
                        <span>Financial Overview</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'advertise' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enter the advert details</h2>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="eg: 3 bedroom townhouse in sandton"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={6}
                    placeholder="A full description on the rental property"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display person
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📞 Display number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ✉️ Display email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Rental and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Advertised rental
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                        R
                      </span>
                      <input
                        type="number"
                        defaultValue="0"
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex ml-2">
                        <button type="button" className="px-3 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                        <button type="button" className="px-3 py-3 border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Available date
                    </label>
                    <input
                      type="date"
                      placeholder="yyyy-mm-dd"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Category and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Residential</option>
                      <option>Commercial</option>
                      <option>Industrial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>House</option>
                      <option>Apartment</option>
                      <option>Townhouse</option>
                      <option>Flat</option>
                    </select>
                  </div>
                </div>

                {/* Property Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bedrooms
                    </label>
                    <div className="flex items-center">
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                      <input
                        type="number"
                        defaultValue="4"
                        className="w-16 text-center py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bathrooms
                    </label>
                    <div className="flex items-center">
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                      <input
                        type="number"
                        defaultValue="0"
                        className="w-16 text-center py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                    </div>
                  </div>

                  {/* Garages */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Garages
                    </label>
                    <div className="flex items-center">
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                      <input
                        type="number"
                        defaultValue="0"
                        className="w-16 text-center py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                    </div>
                  </div>
                </div>

                {/* Size Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Erf Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Erf size (m²)
                    </label>
                    <div className="flex items-center">
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                      <input
                        type="number"
                        defaultValue="0"
                        className="w-20 text-center py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                    </div>
                  </div>

                  {/* House Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      House size (m²)
                    </label>
                    <div className="flex items-center">
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                      <input
                        type="number"
                        defaultValue="496"
                        className="w-20 text-center py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                    </div>
                  </div>

                  {/* Carports */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Carports
                    </label>
                    <div className="flex items-center">
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-l">−</button>
                      <input
                        type="number"
                        defaultValue="0"
                        className="w-16 text-center py-2 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-r">+</button>
                    </div>
                  </div>
                </div>

                {/* Features Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="swimming-pool"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="swimming-pool" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Swimming pool
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="private-garden"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="private-garden" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Private garden
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pets-allowed"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="pets-allowed" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Pets allowed
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="electric-fence"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="electric-fence" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Electric fence
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="alarm-system"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="alarm-system" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Alarm system
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    type="button"
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Save Advert
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'more' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Additional Options</h2>
              <p className="text-gray-500 dark:text-gray-400">Additional property options coming soon...</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Property Reports</h2>
              <p className="text-gray-500 dark:text-gray-400">Property reporting functionality coming soon...</p>
            </div>
          )}
        </div>
      </div>

      {/* Unit Detail Modal */}
      <UnitDetailModal
        isOpen={showUnitDetail}
        onClose={() => {
          setShowUnitDetail(false);
          setSelectedUnit(null);
        }}
        unit={selectedUnit}
        onUpdate={fetchPropertyDetails}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{property?.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProperty}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PropertyDetailPage; 