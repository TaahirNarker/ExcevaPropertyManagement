/**
 * Leases Dashboard Page  
 * Lease management interface integrated into the dashboard layout
 */

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
  DocumentTextIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Mock Lease interface
interface Lease {
  id: string;
  lease_code: string;
  property_name: string;
  property_code: string;
  tenant_name: string;
  tenant_code: string;
  landlord_name: string;
  landlord_code: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  status: string;
  lease_type: string;
  rental_frequency: string;
  created_at: string;
  updated_at: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

// Mock response interface
interface LeasesResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Lease[];
  filters: {
    statuses: Array<{ value: string; label: string }>;
    lease_types: Array<{ value: string; label: string }>;
    rental_frequencies: Array<{ value: string; label: string }>;
  };
}

// Local types for filters
interface Filters {
  search: string;
  status: string;
  lease_type: string;
  rental_frequency: string;
  expiry_status: string;
}

// Mock data
const mockLeases: Lease[] = [
  {
    id: '1',
    lease_code: 'LSE000001',
    property_name: 'Sunset Apartment 2A',
    property_code: 'PRO000001',
    tenant_name: 'John Smith',
    tenant_code: 'TEN000001',
    landlord_name: 'Sarah Johnson',
    landlord_code: 'LAN000001',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    monthly_rent: 12000,
    deposit: 24000,
    status: 'Active',
    lease_type: 'Fixed',
    rental_frequency: 'Monthly',
    created_at: '2023-12-15T10:30:00Z',
    updated_at: '2023-12-15T10:30:00Z',
    days_until_expiry: 45,
    is_expired: false,
    is_expiring_soon: true,
  },
  {
    id: '2',
    lease_code: 'LSE000002',
    property_name: 'Garden Villa 15',
    property_code: 'PRO000002',
    tenant_name: 'Michael Chen',
    tenant_code: 'TEN000002',
    landlord_name: 'Emma Williams',
    landlord_code: 'LAN000002',
    start_date: '2023-06-01',
    end_date: '2025-05-31',
    monthly_rent: 18500,
    deposit: 37000,
    status: 'Active',
    lease_type: 'Fixed',
    rental_frequency: 'Monthly',
    created_at: '2023-05-20T14:20:00Z',
    updated_at: '2023-05-20T14:20:00Z',
    days_until_expiry: 180,
    is_expired: false,
    is_expiring_soon: false,
  },
  {
    id: '3',
    lease_code: 'LSE000003',
    property_name: 'City Loft 8B',
    property_code: 'PRO000003',
    tenant_name: 'Lisa Anderson',
    tenant_code: 'TEN000003',
    landlord_name: 'David Thompson',
    landlord_code: 'LAN000003',
    start_date: '2023-03-15',
    end_date: '2024-03-14',
    monthly_rent: 15000,
    deposit: 30000,
    status: 'Expired',
    lease_type: 'Fixed',
    rental_frequency: 'Monthly',
    created_at: '2023-03-01T09:15:00Z',
    updated_at: '2023-03-01T09:15:00Z',
    days_until_expiry: -60,
    is_expired: true,
    is_expiring_soon: false,
  },
  {
    id: '4',
    lease_code: 'LSE000004',
    property_name: 'Beachfront Condo 12',
    property_code: 'PRO000004',
    tenant_name: 'Robert Wilson',
    tenant_code: 'TEN000004',
    landlord_name: 'Sarah Johnson',
    landlord_code: 'LAN000001',
    start_date: '2024-02-01',
    end_date: '2025-01-31',
    monthly_rent: 22000,
    deposit: 44000,
    status: 'Active',
    lease_type: 'Fixed',
    rental_frequency: 'Monthly',
    created_at: '2024-01-20T16:45:00Z',
    updated_at: '2024-01-20T16:45:00Z',
    days_until_expiry: 220,
    is_expired: false,
    is_expiring_soon: false,
  },
  {
    id: '5',
    lease_code: 'LSE000005',
    property_name: 'Mountain View House',
    property_code: 'PRO000005',
    tenant_name: 'Jennifer Davis',
    tenant_code: 'TEN000005',
    landlord_name: 'Michael Brown',
    landlord_code: 'LAN000004',
    start_date: '2024-01-15',
    end_date: '2024-07-14',
    monthly_rent: 9500,
    deposit: 19000,
    status: 'Terminated',
    lease_type: 'Fixed',
    rental_frequency: 'Monthly',
    created_at: '2024-01-10T11:30:00Z',
    updated_at: '2024-01-10T11:30:00Z',
    days_until_expiry: -30,
    is_expired: true,
    is_expiring_soon: false,
  },
  {
    id: '6',
    lease_code: 'LSE000006',
    property_name: 'Downtown Studio 3A',
    property_code: 'PRO000006',
    tenant_name: 'Alex Johnson',
    tenant_code: 'TEN000006',
    landlord_name: 'Emma Williams',
    landlord_code: 'LAN000002',
    start_date: '2024-03-01',
    end_date: '2025-02-28',
    monthly_rent: 8500,
    deposit: 17000,
    status: 'Active',
    lease_type: 'Month-to-Month',
    rental_frequency: 'Monthly',
    created_at: '2024-02-25T13:15:00Z',
    updated_at: '2024-02-25T13:15:00Z',
    days_until_expiry: 365,
    is_expired: false,
    is_expiring_soon: false,
  },
];

const mockFilters = {
  statuses: [
    { value: 'Active', label: 'Active' },
    { value: 'Expired', label: 'Expired' },
    { value: 'Terminated', label: 'Terminated' },
    { value: 'Suspended', label: 'Suspended' },
  ],
  lease_types: [
    { value: 'Fixed', label: 'Fixed Term' },
    { value: 'Month-to-Month', label: 'Month-to-Month' },
    { value: 'Periodic', label: 'Periodic' },
  ],
  rental_frequencies: [
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Annual', label: 'Annual' },
  ],
};

export default function LeasesDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    lease_type: '',
    rental_frequency: '',
    expiry_status: '',
  });
  const [filterOptions, setFilterOptions] = useState(mockFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Mock fetch leases function
  const fetchLeases = useCallback(async () => {
    try {
      setLoading(true);
      
      // Filter mock data based on filters
      let filteredLeases = [...mockLeases];
      
      if (filters.search) {
        filteredLeases = filteredLeases.filter(lease =>
          lease.lease_code.toLowerCase().includes(filters.search.toLowerCase()) ||
          lease.property_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          lease.tenant_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          lease.landlord_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          lease.property_code.toLowerCase().includes(filters.search.toLowerCase()) ||
          lease.tenant_code.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      if (filters.status) {
        filteredLeases = filteredLeases.filter(lease => lease.status === filters.status);
      }
      
      if (filters.lease_type) {
        filteredLeases = filteredLeases.filter(lease => lease.lease_type === filters.lease_type);
      }
      
      if (filters.rental_frequency) {
        filteredLeases = filteredLeases.filter(lease => lease.rental_frequency === filters.rental_frequency);
      }
      
      if (filters.expiry_status) {
        if (filters.expiry_status === 'expiring_soon') {
          filteredLeases = filteredLeases.filter(lease => lease.is_expiring_soon);
        } else if (filters.expiry_status === 'expired') {
          filteredLeases = filteredLeases.filter(lease => lease.is_expired);
        } else if (filters.expiry_status === 'active') {
          filteredLeases = filteredLeases.filter(lease => !lease.is_expired && !lease.is_expiring_soon);
        }
      }
      
      // Simulate pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLeases = filteredLeases.slice(startIndex, endIndex);
      
      setLeases(paginatedLeases);
      setTotalCount(filteredLeases.length);
      setFilterOptions(mockFilters);
    } catch (error) {
      console.error('Error fetching leases:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load leases');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Load leases on mount and filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchLeases();
    }
  }, [isAuthenticated, fetchLeases]);

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
  const handleAddLease = () => {
    router.push('/dashboard/leases/add');
  };

  const handleEditLease = (leaseCode: string) => {
    toast.info(`Edit lease ${leaseCode} - Feature coming soon`);
  };

  const handleDeleteLease = async (leaseCode: string) => {
    if (!confirm('Are you sure you want to delete this lease?')) {
      return;
    }

    try {
      // Simulate API call
      toast.success('Lease deleted successfully');
      fetchLeases(); // Refresh the list
    } catch (error) {
      console.error('Error deleting lease:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete lease');
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusColors = {
      'Active': 'bg-green-100 text-green-800',
      'Expired': 'bg-red-100 text-red-800',
      'Terminated': 'bg-yellow-100 text-yellow-800',
      'Suspended': 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Render expiry warning
  const renderExpiryWarning = (lease: Lease) => {
    if (lease.is_expired) {
      return (
        <div className="flex items-center text-red-400 text-sm">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Expired {Math.abs(lease.days_until_expiry)} days ago
        </div>
      );
    } else if (lease.is_expiring_soon) {
      return (
        <div className="flex items-center text-yellow-400 text-sm">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Expires in {lease.days_until_expiry} days
        </div>
      );
    }
    return null;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('ZAR', 'R');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Leases" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Leases" 
      subtitle="Manage lease agreements and renewals"
    >
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add button */}
              <button
                onClick={handleAddLease}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add a lease
              </button>

              {/* Right side - Search and filters */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search leases..."
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>

                {/* Page Size */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="block w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                {/* Filters Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Lease Type */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Lease Type
                    </label>
                    <select
                      value={filters.lease_type}
                      onChange={(e) => handleFilterChange('lease_type', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {filterOptions.lease_types.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rental Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Rental Frequency
                    </label>
                    <select
                      value={filters.rental_frequency}
                      onChange={(e) => handleFilterChange('rental_frequency', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Frequencies</option>
                      {filterOptions.rental_frequencies.map(freq => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expiry Status */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Expiry Status
                    </label>
                    <select
                      value={filters.expiry_status}
                      onChange={(e) => handleFilterChange('expiry_status', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="active">Active</option>
                      <option value="expiring_soon">Expiring Soon</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({
                        search: '',
                        status: '',
                        lease_type: '',
                        rental_frequency: '',
                        expiry_status: '',
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leases Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : leases.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-2">No leases found</p>
              <p className="text-gray-400 text-sm">Get started by adding your first lease</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-white/5 px-6 py-3 border-b border-white/20">
                <div className="grid grid-cols-12 gap-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <div className="col-span-2">Lease</div>
                  <div className="col-span-2">Property</div>
                  <div className="col-span-2">Tenant</div>
                  <div className="col-span-2">Landlord</div>
                  <div className="col-span-2">Terms</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-white/10">
                {leases.map((lease) => (
                  <div key={lease.id} className="px-6 py-4 hover:bg-white/5">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Lease Info */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          {/* Make lease code clickable and link to detail page */}
                          <button
                            onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            {lease.lease_code}
                          </button>
                          <div className="text-sm text-gray-300">
                            {lease.lease_type}
                          </div>
                          {renderExpiryWarning(lease)}
                        </div>
                      </div>

                      {/* Property */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="font-medium text-white">
                            {lease.property_name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {lease.property_code}
                          </div>
                        </div>
                      </div>

                      {/* Tenant */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="font-medium text-white">
                            {lease.tenant_name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {lease.tenant_code}
                          </div>
                        </div>
                      </div>

                      {/* Landlord */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="font-medium text-white">
                            {lease.landlord_name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {lease.landlord_code}
                          </div>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-white">
                            <BanknotesIcon className="h-4 w-4 mr-2 text-green-400" />
                            {formatCurrency(lease.monthly_rent)}/month
                          </div>
                          <div className="flex items-center text-sm text-gray-300">
                            <CalendarDaysIcon className="h-4 w-4 mr-2 text-blue-400" />
                            {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                          </div>
                          <div className="text-sm text-gray-300">
                            Deposit: {formatCurrency(lease.deposit)}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1">
                        {renderStatusBadge(lease.status)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1">
                        <div className="flex space-x-2">
                          {/* View action navigates to detail page */}
                          <button
                            onClick={() => router.push(`/dashboard/leases/${lease.id}`)}
                            className="text-gray-400 hover:text-white"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditLease(lease.lease_code)}
                            className="text-gray-400 hover:text-blue-400"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLease(lease.lease_code)}
                            className="text-gray-400 hover:text-red-400"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="bg-white/5 px-6 py-3 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-white/20 rounded text-sm font-medium text-gray-300 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-300">
                        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        className="px-3 py-1 border border-white/20 rounded text-sm font-medium text-gray-300 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-300">
          {totalCount} leases found.
        </div>
      </div>
    </DashboardLayout>
  );
} 