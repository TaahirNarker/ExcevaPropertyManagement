/**
 * Landlords Dashboard Page
 * Landlords management interface integrated into the dashboard layout
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
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Mock Landlord interface
interface Landlord {
  id: string;
  landlord_code: string;
  name: string;
  email: string;
  phone?: string;
  type: string;
  company_name?: string;
  vat_number?: string;
  properties_count: number;
  total_rental_income: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Mock response interface
interface LandlordsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Landlord[];
  filters: {
    types: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
  };
}

// Local types for filters
interface Filters {
  search: string;
  type: string;
  status: string;
  is_active: string;
}

// Mock data
const mockLandlords: Landlord[] = [
  {
    id: '1',
    landlord_code: 'LAN000001',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+27 82 123 4567',
    type: 'Individual',
    company_name: '',
    vat_number: '',
    properties_count: 3,
    total_rental_income: 25000,
    status: 'Active',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    landlord_code: 'LAN000002',
    name: 'Sarah Johnson',
    email: 'sarah@propertyholdings.co.za',
    phone: '+27 83 456 7890',
    type: 'Company',
    company_name: 'Property Holdings Ltd',
    vat_number: '4123456789',
    properties_count: 8,
    total_rental_income: 120000,
    status: 'Active',
    created_at: '2024-02-01T14:20:00Z',
    updated_at: '2024-02-01T14:20:00Z',
  },
  {
    id: '3',
    landlord_code: 'LAN000003',
    name: 'Michael Chen',
    email: 'michael.chen@gmail.com',
    phone: '+27 84 789 0123',
    type: 'Individual',
    company_name: '',
    vat_number: '',
    properties_count: 2,
    total_rental_income: 18000,
    status: 'Active',
    created_at: '2024-02-10T09:15:00Z',
    updated_at: '2024-02-10T09:15:00Z',
  },
  {
    id: '4',
    landlord_code: 'LAN000004',
    name: 'Emma Williams',
    email: 'emma@realestate.co.za',
    phone: '+27 85 234 5678',
    type: 'Company',
    company_name: 'Williams Real Estate',
    vat_number: '4987654321',
    properties_count: 12,
    total_rental_income: 180000,
    status: 'Active',
    created_at: '2024-03-05T16:45:00Z',
    updated_at: '2024-03-05T16:45:00Z',
  },
  {
    id: '5',
    landlord_code: 'LAN000005',
    name: 'David Thompson',
    email: 'david.t@investments.com',
    phone: '+27 86 345 6789',
    type: 'Individual',
    company_name: '',
    vat_number: '',
    properties_count: 1,
    total_rental_income: 8500,
    status: 'Inactive',
    created_at: '2024-03-15T11:30:00Z',
    updated_at: '2024-03-15T11:30:00Z',
  },
];

const mockFilters = {
  types: [
    { value: 'Individual', label: 'Individual' },
    { value: 'Company', label: 'Company' },
    { value: 'Trust', label: 'Trust' },
  ],
  statuses: [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
  ],
};

export default function LandlordDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    status: '',
    is_active: 'true',
  });
  const [filterOptions, setFilterOptions] = useState(mockFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Mock fetch landlords function
  const fetchLandlords = useCallback(async () => {
    try {
      setLoading(true);
      
      // Filter mock data based on filters
      let filteredLandlords = [...mockLandlords];
      
      if (filters.search) {
        filteredLandlords = filteredLandlords.filter(landlord =>
          landlord.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          landlord.email.toLowerCase().includes(filters.search.toLowerCase()) ||
          landlord.landlord_code.toLowerCase().includes(filters.search.toLowerCase()) ||
          (landlord.company_name && landlord.company_name.toLowerCase().includes(filters.search.toLowerCase()))
        );
      }
      
      if (filters.type) {
        filteredLandlords = filteredLandlords.filter(landlord => landlord.type === filters.type);
      }
      
      if (filters.status) {
        filteredLandlords = filteredLandlords.filter(landlord => landlord.status === filters.status);
      }
      
      if (filters.is_active === 'true') {
        filteredLandlords = filteredLandlords.filter(landlord => landlord.status === 'Active');
      } else if (filters.is_active === 'false') {
        filteredLandlords = filteredLandlords.filter(landlord => landlord.status !== 'Active');
      }
      
      // Simulate pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLandlords = filteredLandlords.slice(startIndex, endIndex);
      
      setLandlords(paginatedLandlords);
      setTotalCount(filteredLandlords.length);
      setFilterOptions(mockFilters);
    } catch (error) {
      console.error('Error fetching landlords:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load landlords');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Load landlords on mount and filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchLandlords();
    }
  }, [isAuthenticated, fetchLandlords]);

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
  const handleAddLandlord = () => {
    router.push('/dashboard/landlord/add');
  };

  const handleViewLandlord = (landlordCode: string) => {
    toast.info(`View landlord ${landlordCode} - Feature coming soon`);
  };

  const handleEditLandlord = (landlordCode: string) => {
    toast.info(`Edit landlord ${landlordCode} - Feature coming soon`);
  };

  const handleDeleteLandlord = async (landlordCode: string) => {
    if (!confirm('Are you sure you want to delete this landlord?')) {
      return;
    }

    try {
      // Simulate API call
      toast.success('Landlord deleted successfully');
      fetchLandlords(); // Refresh the list
    } catch (error) {
      console.error('Error deleting landlord:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete landlord');
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusColors = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'Suspended': 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
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

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Landlords" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Landlords" 
      subtitle="Manage your landlord relationships"
    >
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add button */}
              <button
                onClick={handleAddLandlord}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add a landlord
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
                    placeholder="Search landlords..."
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Active Filter */}
                <select
                  value={filters.is_active}
                  onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  className="block w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
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
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {filterOptions.types.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      {filterOptions.statuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end sm:col-span-2 lg:col-span-2">
                    <button
                      onClick={() => setFilters({
                        search: '',
                        type: '',
                        status: '',
                        is_active: 'true',
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

        {/* Landlords Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : landlords.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-2">No landlords found</p>
              <p className="text-gray-400 text-sm">Get started by adding your first landlord</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-white/5 px-6 py-3 border-b border-white/20">
                <div className="grid grid-cols-12 gap-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <div className="col-span-3">Landlord</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Portfolio</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-white/10">
                {landlords.map((landlord) => (
                  <div key={landlord.id} className="px-6 py-4 hover:bg-white/5">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Landlord Info */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleViewLandlord(landlord.landlord_code)}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            {landlord.landlord_code}
                          </button>
                          <div className="font-medium text-white">
                            {landlord.name}
                          </div>
                          {landlord.company_name && (
                            <div className="text-sm text-gray-300">
                              {landlord.company_name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-300">
                            {landlord.email}
                          </div>
                          {landlord.phone && (
                            <div className="text-sm text-gray-300">
                              {landlord.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <div className="flex items-center">
                          {landlord.type === 'Company' ? (
                            <BuildingOfficeIcon className="h-4 w-4 text-blue-400 mr-2" />
                          ) : (
                            <UserIcon className="h-4 w-4 text-green-400 mr-2" />
                          )}
                          <span className="text-white text-sm">{landlord.type}</span>
                        </div>
                        {landlord.vat_number && (
                          <div className="text-xs text-gray-400 mt-1">
                            VAT: {landlord.vat_number}
                          </div>
                        )}
                      </div>

                      {/* Portfolio */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="text-sm text-white">
                            {landlord.properties_count} Properties
                          </div>
                          <div className="text-sm text-green-400 font-medium">
                            {formatCurrency(landlord.total_rental_income)}/month
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1">
                        {renderStatusBadge(landlord.status)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewLandlord(landlord.landlord_code)}
                            className="text-gray-400 hover:text-white"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditLandlord(landlord.landlord_code)}
                            className="text-gray-400 hover:text-blue-400"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLandlord(landlord.landlord_code)}
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
          {totalCount} landlords found.
        </div>
      </div>
    </DashboardLayout>
  );
} 