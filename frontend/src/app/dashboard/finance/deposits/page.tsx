'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { financeApi } from '@/lib/api';
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface DepositSummary {
  total_deposits_held: number;
  deposits_by_landlord: number;
  deposits_by_agent: number;
  outstanding_deposits: number;
}

interface DepositDetail {
  lease_id: string;
  property_tenant: string;
  state: string;
  held: number;
  still_due: number;
  landlord_name: string;
  deposit_paid: boolean;
  lease_start: string;
  lease_end: string;
}

interface DepositDetailsResponse {
  results: DepositDetail[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function DepositsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [depositSummary, setDepositSummary] = useState<DepositSummary | null>(null);
  const [depositDetails, setDepositDetails] = useState<DepositDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'by_landlord' | 'by_agent' | 'outstanding'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Fetch deposit summary
  const fetchDepositSummary = async () => {
    try {
      const summary = await financeApi.getDepositSummary();
      setDepositSummary(summary);
    } catch (err) {
      console.error('Error fetching deposit summary:', err);
      setError('Failed to load deposit summary');
    }
  };

  // Fetch deposit details
  const fetchDepositDetails = async () => {
    try {
      setLoading(true);
      const params = {
        type: activeTab,
        search: searchTerm,
        page: page,
        page_size: pageSize
      };
      
      const response = await financeApi.getDepositDetails(params);
      setDepositDetails(response.results);
      setTotalPages(response.total_pages);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching deposit details:', err);
      setError('Failed to load deposit details');
    } finally {
      setLoading(false);
    }
  };

  // Handle tab click
  const handleTabClick = (tab: 'all' | 'by_landlord' | 'by_agent' | 'outstanding') => {
    setActiveTab(tab);
    setPage(1);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchDepositDetails();
    }, 500);
    
    setSearchTimeout(timeout);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchDepositDetails();
    }, 500);
    
    setSearchTimeout(timeout);
  };

  // Initialize data
  useEffect(() => {
    if (isAuthenticated) {
      fetchDepositSummary();
      fetchDepositDetails();
    }
  }, [isAuthenticated]);

  // Refetch when tab or page changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchDepositDetails();
    }
  }, [activeTab, page, pageSize]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
            <p className="text-muted-foreground">Please log in to view this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-foreground" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Deposit Summary</h1>
                  <p className="text-muted-foreground">Manage and track security deposits</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          {depositSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div 
                className={`bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 cursor-pointer transition-all hover:shadow-lg ${
                  activeTab === 'all' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleTabClick('all')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">TOTAL DEPOSIT HELD</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(depositSummary.total_deposits_held)}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div 
                className={`bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 cursor-pointer transition-all hover:shadow-lg ${
                  activeTab === 'by_landlord' ? 'ring-2 ring-orange-500' : ''
                }`}
                onClick={() => handleTabClick('by_landlord')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">BY LANDLORD</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {formatCurrency(depositSummary.deposits_by_landlord)}
                    </p>
                  </div>
                  <BuildingOfficeIcon className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <div 
                className={`bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 cursor-pointer transition-all hover:shadow-lg ${
                  activeTab === 'by_agent' ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleTabClick('by_agent')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">BY AGENT</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(depositSummary.deposits_by_agent)}
                    </p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div 
                className={`bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 cursor-pointer transition-all hover:shadow-lg ${
                  activeTab === 'outstanding' ? 'ring-2 ring-red-500' : ''
                }`}
                onClick={() => handleTabClick('outstanding')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">OUTSTANDING</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(depositSummary.outstanding_deposits)}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter search text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </form>
              
              <div className="flex gap-4">
                <select
                  value={activeTab}
                  onChange={(e) => handleTabClick(e.target.value as any)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">With Deposit (Active leases)</option>
                  <option value="by_landlord">By Landlord</option>
                  <option value="by_agent">By Agent</option>
                  <option value="outstanding">Outstanding</option>
                </select>
                
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Deposit Details Table */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lease ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Property/Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Held
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Still Due
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2">Loading deposits...</span>
                        </div>
                      </td>
                    </tr>
                  ) : depositDetails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No deposits found
                      </td>
                    </tr>
                  ) : (
                    depositDetails.map((deposit, index) => {
                      // Extract tenant name from property_tenant string
                      const parts = deposit.property_tenant.split(', ');
                      const propertyInfo = parts.slice(0, -1).join(', ');
                      const tenantName = parts[parts.length - 1];
                      
                      // Extract lease ID number for navigation
                      const leaseId = deposit.lease_id.replace('LEA', '');
                      
                      return (
                        <tr key={index} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {deposit.lease_id}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            <div className="space-y-1">
                              <div className="text-muted-foreground">{propertyInfo}</div>
                              <button
                                onClick={() => router.push(`/dashboard/leases/${leaseId}`)}
                                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors flex items-center gap-1 group cursor-pointer"
                                title={`View lease details for ${tenantName}`}
                              >
                                <span>{tenantName}</span>
                                <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {deposit.deposit_paid ? (
                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                              ) : (
                                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                              )}
                              <span className="text-sm text-foreground">{deposit.state}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {formatCurrency(deposit.held)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {formatCurrency(deposit.still_due)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-muted/50 px-6 py-3 flex items-center justify-between border-t border-border">
                <div className="flex items-center text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
