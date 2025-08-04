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
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { landlordApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Landlord interface
interface Landlord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type?: string;
  company_name?: string;
  vat_number?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Local types for filters
interface Filters {
  search: string;
  type: string;
  status: string;
  is_active: string;
}

// Filter options
const filterOptions = {
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
  const [showFilters, setShowFilters] = useState(false);

  // Fetch landlords function
  const fetchLandlords = useCallback(async () => {
    try {
      setLoading(true);
      
      const data = await landlordApi.getLandlords();
      
      // Filter data based on search
      let filteredLandlords = data;
      
      if (filters.search) {
        filteredLandlords = data.filter(landlord =>
          landlord.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          landlord.email.toLowerCase().includes(filters.search.toLowerCase()) ||
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
    } catch (error) {
      console.error('Error fetching landlords:', error);
      setLandlords([]);
      setTotalCount(0);
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



  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusColors = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-muted text-muted-foreground',
      'Suspended': 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-muted text-muted-foreground'}`}>
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
      <DashboardLayout title="Landlords">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Landlords">
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
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
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search landlords..."
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-background placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Active Filter */}
                <select
                  value={filters.is_active}
                  onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  className="block w-full sm:w-32 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                {/* Page Size */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="block w-full sm:w-20 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                {/* Filters Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-muted/50 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-muted/50 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : landlords.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No landlords found</p>
              <p className="text-muted-foreground text-sm">Get started by adding your first landlord</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-muted/50 px-6 py-3 border-b border-border">
                <div className="grid grid-cols-11 gap-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Landlord</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Portfolio</div>
                  <div className="col-span-1">Status</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border">
                {landlords.map((landlord) => (
                  <div key={landlord.id} className="px-6 py-4 hover:bg-muted/50">
                    <div className="grid grid-cols-11 gap-4 items-start">
                      {/* Landlord Info */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <button
                            onClick={() => router.push(`/dashboard/landlord/${landlord.id}`)}
                            className="text-blue-400 hover:text-blue-300 font-medium hover:underline cursor-pointer"
                          >
                            {landlord.name}
                          </button>
                          <div className="text-sm text-muted-foreground">
                            {landlord.email}
                          </div>
                          {landlord.company_name && (
                            <div className="text-sm text-muted-foreground">
                              {landlord.company_name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          {landlord.phone && (
                            <div className="text-sm text-muted-foreground">
                              {landlord.phone}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            ID: {landlord.id.slice(0, 8)}...
                          </div>
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
                          <div className="text-xs text-muted-foreground/70 mt-1">
                            VAT: {landlord.vat_number}
                          </div>
                        )}
                      </div>

                      {/* Portfolio */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="text-sm text-white">
                            Portfolio Info
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Coming soon
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1">
                        {renderStatusBadge(landlord.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="bg-white/5 px-6 py-3 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-white/20 rounded text-sm font-medium text-muted-foreground bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-muted-foreground">
                        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        className="px-3 py-1 border border-white/20 rounded text-sm font-medium text-muted-foreground bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-4 text-sm text-muted-foreground">
          {totalCount} landlords found.
        </div>
      </div>
    </DashboardLayout>
  );
} 