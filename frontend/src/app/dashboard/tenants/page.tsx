'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  HomeIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { tenantApi, propertyAPI, leaseApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Tenant type definition
interface Tenant {
  id: string;
  tenant_code: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  property_name?: string;
  property_id?: string;
  created_at: string;
}

// Local types for filters
interface Filters {
  search: string;
  status: string;
}

export default function TenantsDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [tenantToAssignProperty, setTenantToAssignProperty] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tenantApi.list();
      
      // Handle paginated response structure
      const tenantsArray = Array.isArray(data) ? data : (data.results || []);
      
      // Transform the data to match our local Tenant interface
      const transformedTenants = tenantsArray.map((tenant: any) => ({
        id: tenant.id,
        tenant_code: tenant.tenant_code,
        full_name: tenant.full_name || tenant.name || `${tenant.user?.first_name || ''} ${tenant.user?.last_name || ''}`.trim(),
        email: tenant.email || tenant.user?.email || '',
        phone: tenant.phone || tenant.user?.phone_number || '',
        status: 'active' as const,
        property_name: tenant.property_name || tenant.property?.name || '',
        created_at: tenant.created_at || new Date().toISOString()
      }));
      
      setTenants(transformedTenants);
      setTotalCount(transformedTenants.length);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load tenants');
      // Set empty array to prevent filter errors
      setTenants([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tenants on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchTenants();
    }
  }, [isAuthenticated, fetchTenants]);

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value);
  };

  // Navigation handlers
  const handleAddTenant = () => {
    router.push('/dashboard/tenants/add');
  };

  const handleViewTenant = (tenantCode: string) => {
    router.push(`/dashboard/tenants/${tenantCode}`);
  };

  const handleEditTenant = (tenantCode: string) => {
    router.push(`/dashboard/tenants/edit/${tenantCode}`);
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!tenantToDelete) return;

    try {
      await tenantApi.delete(tenantToDelete.tenant_code);
      toast.success('Tenant deleted successfully');
      fetchTenants(); // Refresh the list
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete tenant');
    } finally {
      setDeleteModalOpen(false);
      setTenantToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setTenantToDelete(null);
  };

  // Fetch properties for assignment
  const fetchProperties = useCallback(async () => {
    try {
      setLoadingProperties(true);
      const data = await propertyAPI.list();
      const propertiesArray = Array.isArray(data) ? data : (data.results || []);
      setProperties(propertiesArray);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  // Handle property assignment
  const handleAssignProperty = (tenant: Tenant) => {
    setTenantToAssignProperty(tenant);
    setSelectedProperty('');
    setSelectedUnit('');
    setPropertyModalOpen(true);
    fetchProperties();
  };

  const confirmPropertyAssignment = async () => {
    if (!tenantToAssignProperty || !selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    try {
      // Create a lease to link tenant to property
      const leaseData = {
        property: selectedProperty,
        tenant: tenantToAssignProperty.id,
        start_date: new Date().toISOString().split('T')[0], // Today's date
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from today
        monthly_rent: '1000.00', // Required field - must be a string for DecimalField
        deposit_amount: '1000.00', // Required field - must be a string for DecimalField
        lease_type: 'Fixed' as const,
        rental_frequency: 'Monthly' as const,
        rent_due_day: 1,
        late_fee_type: 'percentage' as const,
        late_fee_percentage: '5.00', // Must be string for DecimalField
        late_fee_amount: '0.00', // Must be string for DecimalField
        grace_period_days: 5,
        management_fee: '10.00', // Must be string for DecimalField
        procurement_fee: '0.00', // Must be string for DecimalField
        pro_rata_amount: '0.00', // Must be string for DecimalField
        auto_renew: false,
        notice_period_days: 30,
        escalation_type: 'none' as const,
        escalation_percentage: '0.00', // Must be string for DecimalField
        escalation_amount: '0.00', // Must be string for DecimalField
        status: 'active' as const,
        terms: 'Standard lease agreement for property assignment.'
      };

      // Debug: Log the lease data being sent
      console.log('Creating lease with data:', leaseData);
      console.log('Lease data type check:', {
        property: typeof leaseData.property,
        tenant: typeof leaseData.tenant,
        start_date: typeof leaseData.start_date,
        end_date: typeof leaseData.end_date,
        monthly_rent: typeof leaseData.monthly_rent,
        deposit_amount: typeof leaseData.deposit_amount,
        lease_type: typeof leaseData.lease_type,
        rental_frequency: typeof leaseData.rental_frequency,
        rent_due_day: typeof leaseData.rent_due_day,
        late_fee_type: typeof leaseData.late_fee_type,
        late_fee_percentage: typeof leaseData.late_fee_percentage,
        late_fee_amount: typeof leaseData.late_fee_amount,
        grace_period_days: typeof leaseData.grace_period_days,
        management_fee: typeof leaseData.management_fee,
        procurement_fee: typeof leaseData.procurement_fee,
        pro_rata_amount: typeof leaseData.pro_rata_amount,
        auto_renew: typeof leaseData.auto_renew,
        notice_period_days: typeof leaseData.notice_period_days,
        escalation_type: typeof leaseData.escalation_type,
        escalation_percentage: typeof leaseData.escalation_percentage,
        escalation_amount: typeof leaseData.escalation_amount,
        status: typeof leaseData.status,
        terms: typeof leaseData.terms
      });

      // Create the lease to link tenant to property
      await leaseApi.createLease(leaseData);
      
      toast.success(`Property assigned to ${tenantToAssignProperty.full_name}`);
      setPropertyModalOpen(false);
      setTenantToAssignProperty(null);
      setSelectedProperty('');
      setSelectedUnit('');
      fetchTenants(); // Refresh the list
    } catch (error: any) {
      console.error('Error assigning property:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Show more detailed error message
      if (error.message) {
        console.error('Error message:', error.message);
        toast.error(`Failed to assign property: ${error.message}`);
      } else if (error.response?.data) {
        const errorData = error.response.data;
        console.error('Backend error data:', errorData);
        
        if (typeof errorData === 'string') {
          toast.error(`Failed to assign property: ${errorData}`);
        } else if (errorData.detail) {
          toast.error(`Failed to assign property: ${errorData.detail}`);
        } else if (errorData.non_field_errors) {
          toast.error(`Failed to assign property: ${errorData.non_field_errors.join(', ')}`);
        } else {
          // Show field-specific errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          console.error('Field errors:', fieldErrors);
          toast.error(`Failed to assign property: ${fieldErrors}`);
        }
      } else {
        console.error('No detailed error information available');
        toast.error('Failed to assign property. Please try again.');
      }
    }
  };

  const cancelPropertyAssignment = () => {
    setPropertyModalOpen(false);
    setTenantToAssignProperty(null);
    setSelectedProperty('');
    setSelectedUnit('');
  };

  // Filter tenants based on search query and status
  const filteredTenants = (Array.isArray(tenants) ? tenants : []).filter(tenant => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = !filters.search || (
      tenant.full_name.toLowerCase().includes(searchLower) ||
      tenant.email.toLowerCase().includes(searchLower) ||
      tenant.phone.toLowerCase().includes(searchLower) ||
      tenant.property_name?.toLowerCase().includes(searchLower)
    );
    
    const matchesStatus = !filters.status || tenant.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Tenants">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tenants">
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add button */}
              <button
                onClick={handleAddTenant}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add a tenant
              </button>

              {/* Right side - Search and filters */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter search text"
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-background placeholder-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-muted/50 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                  Filters
                </button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status filter */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Total Tenants</dt>
                  <dd className="text-lg font-medium text-foreground">{totalCount}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Active</dt>
                  <dd className="text-lg font-medium text-foreground">
                    {(Array.isArray(tenants) ? tenants : []).filter(t => t.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Pending</dt>
                  <dd className="text-lg font-medium text-foreground">
                    {(Array.isArray(tenants) ? tenants : []).filter(t => t.status === 'pending').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Inactive</dt>
                  <dd className="text-lg font-medium text-foreground">
                    {(Array.isArray(tenants) ? tenants : []).filter(t => t.status === 'inactive').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-blue-400 mb-2" />
              <span className="text-sm text-foreground">Record Payment</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-green-400 mb-2" />
              <span className="text-sm text-foreground">Create Adjustment</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <ArrowUpTrayIcon className="h-8 w-8 text-orange-400 mb-2" />
              <span className="text-sm text-foreground">Import Transactions</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-indigo-400 mb-2" />
              <span className="text-sm text-foreground">View Statements</span>
            </button>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
              Tenants ({filteredTenants.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-20">
                <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No tenants found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filters.search || filters.status ? 'Try adjusting your filters' : 'Get started by adding a new tenant'}
                </p>
                {!filters.search && !filters.status && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddTenant}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add tenant
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tenant
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Property
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Added
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {tenant.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tenant.tenant_code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            <div className="flex items-center">
                              <EnvelopeIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                              {tenant.email}
                            </div>
                            <div className="flex items-center mt-1">
                              <PhoneIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                              {tenant.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-foreground">
                            <HomeIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            {tenant.property_name ? (
                              <span className="flex items-center">
                                {tenant.property_name}
                              </span>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-muted-foreground">Not assigned</span>
                                <button
                                  onClick={() => handleAssignProperty(tenant)}
                                  className="text-blue-400 hover:text-blue-300 text-xs underline"
                                  title="Assign property"
                                >
                                  Assign Property
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={tenant.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(tenant.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewTenant(tenant.tenant_code)}
                              className="text-blue-400 hover:text-blue-300"
                              title="View tenant"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEditTenant(tenant.tenant_code)}
                              className="text-yellow-400 hover:text-yellow-300"
                              title="Edit tenant"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleAssignProperty(tenant)}
                              className="text-green-400 hover:text-green-300"
                              title="Assign property"
                            >
                              <LinkIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(tenant)}
                              className="text-red-400 hover:text-red-300"
                              title="Delete tenant"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && tenantToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-foreground mb-4">Delete Tenant</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{tenantToDelete.full_name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Assignment Modal */}
      {propertyModalOpen && tenantToAssignProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-foreground mb-4">Assign Property to Tenant</h3>
            <p className="text-muted-foreground mb-6">
              Assign a property to <strong>{tenantToAssignProperty.full_name}</strong>
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Select Property</label>
                {loadingProperties ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  </div>
                ) : (
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="block w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a property...</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Unit/Sub-property (Optional)</label>
                <input
                  type="text"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  placeholder="e.g., Unit 101, Apartment A"
                  className="block w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelPropertyAssignment}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmPropertyAssignment}
                disabled={!selectedProperty}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Property
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 