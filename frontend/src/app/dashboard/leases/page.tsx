/**
 * Leases Dashboard Page  
 * Lease management interface integrated into the dashboard layout
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { leaseAPI } from '@/lib/lease-api';
import toast from 'react-hot-toast';

// Real Lease interface matching the API
interface Lease {
  id: number;
  property: {
    id: number;
    property_code: string;
    name: string;
    address: string;
  };
  tenant: {
    id: number;
    tenant_code: string;
    name: string;
    email: string;
  };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  terms: string;
  created_at: string;
  updated_at: string;
  attachments_count: number;
}

// API response interface
interface LeasesResponse {
  results: Lease[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Local types for filters
interface Filters {
  search: string;
  status: string;
  property: number;
  tenant: number;
}

export default function LeasesDashboardPage() {
  try {
    console.log('🚀 LeasesDashboardPage component rendering...');
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    
    console.log('🔐 Auth state:', { user, isAuthenticated });
  
  // State
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    property: 0,
    tenant: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Real fetch leases function using API
  const fetchLeases = useCallback(async () => {
    try {
      console.log('🔍 Fetching leases...');
      setLoading(true);
      
      const params = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        property: filters.property || undefined,
        tenant: filters.tenant || undefined,
        page: currentPage,
        page_size: pageSize,
      };

      console.log('📋 API params:', params);
      const response: LeasesResponse = await leaseAPI.getLeases(params);
      console.log('✅ API response:', response);
      
      setLeases(response.results);
      setTotalCount(response.count);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('❌ Error fetching leases:', error);
      toast.error('Failed to load leases');
      setLeases([]);
      setTotalCount(0);
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
  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Navigation handlers
  const handleAddLease = () => {
    router.push('/dashboard/leases/add');
  };

  const handleViewLease = (leaseId: number) => {
    console.log('🔍 View lease clicked:', leaseId);
    router.push(`/dashboard/leases/${leaseId}`);
  };

  const handleEditLease = (leaseId: number) => {
    router.push(`/dashboard/leases/${leaseId}/edit`);
  };

  const handleDeleteLease = async (leaseId: number) => {
    if (!confirm('Are you sure you want to delete this lease?')) {
      return;
    }

    try {
      await leaseAPI.deleteLease(leaseId);
      toast.success('Lease deleted successfully');
      fetchLeases(); // Refresh the list
    } catch (error) {
      console.error('Error deleting lease:', error);
      toast.error('Failed to delete lease');
    }
  };

  // Utility functions
  const renderStatusBadge = (status: string) => {
    const statusColors = {
      'active': 'bg-green-100 text-green-800 border-green-200',
      'expired': 'bg-red-100 text-red-800 border-red-200',
      'terminated': 'bg-gray-100 text-gray-800 border-gray-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };

    const color = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderExpiryWarning = (lease: Lease) => {
    const endDate = new Date(lease.end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Expired {Math.abs(daysUntilExpiry)} days ago
        </div>
      );
    } else if (daysUntilExpiry <= 30) {
      return (
        <div className="flex items-center text-orange-600 text-sm">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Expires in {daysUntilExpiry} days
        </div>
      );
    }

    return (
      <div className="flex items-center text-gray-600 text-sm">
        <CalendarDaysIcon className="h-4 w-4 mr-1" />
        Expires in {daysUntilExpiry} days
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (loading && leases.length === 0) {
    console.log('🔄 Showing loading state...');
    return (
      <DashboardLayout title="Leases">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  console.log('📊 Rendering leases page with data:', { leases: leases.length, totalCount, loading });

  return (
    <DashboardLayout title="Leases">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Leases</h1>
            <p className="text-gray-400 mt-1">
              Manage your property leases and agreements
            </p>
          </div>
          <button
            onClick={handleAddLease}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Lease
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leases, properties, tenants..."
                  value={filters.search}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-blue-400 mb-2" />
              <span className="text-sm text-white">Record Payment</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-green-400 mb-2" />
              <span className="text-sm text-white">Create Adjustment</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <BanknotesIcon className="h-8 w-8 text-orange-400 mb-2" />
              <span className="text-sm text-white">Import Transactions</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/finance/master')}
              className="flex flex-col items-center p-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-indigo-400 mb-2" />
              <span className="text-sm text-white">View Statements</span>
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {leases.length} of {totalCount} leases
          </span>
          {totalCount > 0 && (
            <span>
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        {/* Leases Table */}
        <div className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lease Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Financials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {leases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-300 mb-2">No leases found</h3>
                      <p className="text-gray-500 mb-4">
                        {filters.search || filters.status 
                          ? 'Try adjusting your search or filters'
                          : 'Get started by adding your first lease'
                        }
                      </p>
                      {!filters.search && !filters.status && (
                        <button
                          onClick={handleAddLease}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          <PlusIcon className="h-5 w-5 mr-2" />
                          Add First Lease
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  leases.map((lease) => (
                    <tr 
                      key={lease.id} 
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <Link href={`/dashboard/leases/${lease.id}`} className="text-left text-sm font-medium text-white hover:underline">
                            Lease #{lease.id}
                          </Link>
                          <div className="text-sm text-gray-400">
                            {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                          </div>
                          {renderExpiryWarning(lease)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {lease.property.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {lease.property.property_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {lease.tenant.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {lease.tenant.tenant_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {formatCurrency(lease.monthly_rent)}
                          </div>
                          <div className="text-sm text-gray-400">
                            Deposit: {formatCurrency(lease.deposit_amount)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(lease.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/leases/${lease.id}`}
                          className="inline-block px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-lg text-white transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-lg text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
  } catch (error) {
    console.error('❌ Error in LeasesDashboardPage:', error);
    return (
      <DashboardLayout title="Leases">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Leases</h1>
            <p className="text-gray-400 mb-4">Something went wrong while loading the leases page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
} 