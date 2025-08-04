/**
 * Properties Dashboard Page
 * Properties management interface integrated into the dashboard layout
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { propertyAPI } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Local types
interface Property {
  id: string;
  property_code: string;
  name: string;
  property_type: string;
  property_type_display: string;
  street_address: string;
  suburb?: string;
  city: string;
  province: string;
  province_display: string;
  postal_code?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  monthly_rental_amount?: number;
  status: string;
  status_display: string;
  is_active: boolean;
  full_address: string;
  display_name: string;
  occupancy_info: {
    status: string;
    details?: string;
    tenant_name?: string;
    lease_end?: string;
  };
  owner_name: string;
  // Sub-property information
  is_parent_property: boolean;
  is_sub_property: boolean;
  sub_properties_count: number;
  parent_property_name?: string;
  sub_properties_summary?: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    reserved: number;
    total_rental_income: number;
  };
  created_at: string;
  updated_at: string;
  primary_image?: string;
}

interface PropertiesResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Property[];
  filters: {
    property_types: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
    provinces: Array<{ value: string; label: string }>;
  };
}

interface Filters {
  search: string;
  property_type: string;
  status: string;
  province: string;
  is_active: string;
}

export default function PropertiesDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    property_type: '',
    status: '',
    province: '',
    is_active: 'true',
  });
  const [filterOptions, setFilterOptions] = useState<PropertiesResponse['filters']>({
    property_types: [],
    statuses: [],
    provinces: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      const apiFilters = {
        search: filters.search || undefined,
        property_type: filters.property_type || undefined,
        status: filters.status || undefined,
        province: filters.province || undefined,
        is_active: filters.is_active ? filters.is_active === 'true' : undefined,
        // Only exclude sub-properties when not searching
        exclude_sub_properties: filters.search ? undefined : 'true',
        page: currentPage,
        page_size: pageSize,
      };

      const data = await propertyAPI.list(apiFilters);
      setProperties(data.results || data);
      setTotalCount(data.count || data.length);
      setFilterOptions(data.filters || {
        property_types: [],
        statuses: [],
        provinces: [],
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load properties');
      setProperties([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Load properties on mount and filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchProperties();
    }
  }, [isAuthenticated, fetchProperties]);

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
  const handleAddProperty = () => {
    router.push('/dashboard/properties/add');
  };



  // Render occupancy status
  const renderOccupancyStatus = (occupancy: Property['occupancy_info']) => {
    if (occupancy.status === 'Vacant') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/20 text-green-400 border border-green-500/30">
          Vacant
        </span>
      );
    } else if (occupancy.status === 'Occupied' && occupancy.details) {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-500/30">
            Occupied
          </span>
          <div className="text-sm text-muted-foreground">
            {occupancy.details}
            {occupancy.lease_end && (
              <div className="text-xs text-muted-foreground/70">
                Until {new Date(occupancy.lease_end).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-muted-foreground border border-border/30">
          {occupancy.status}
        </span>
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Properties">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Properties">
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleAddProperty}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add a property
                </button>
                <button
                  onClick={() => router.push('/dashboard/properties/create-sub-properties')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Sub-Properties
                </button>
              </div>

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
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-muted/50 text-foreground placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Filters toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-border shadow-sm text-sm leading-4 font-medium rounded-md text-muted-foreground bg-muted/50 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Property Type
                    </label>
                    <select
                      value={filters.property_type}
                      onChange={(e) => handleFilterChange('property_type', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Types</option>
                      {filterOptions.property_types.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Statuses</option>
                      {filterOptions.statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Province */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Province
                    </label>
                    <select
                      value={filters.province}
                      onChange={(e) => handleFilterChange('province', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Provinces</option>
                      {filterOptions.provinces.map((province) => (
                        <option key={province.value} value={province.value}>
                          {province.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Active Status
                    </label>
                    <select
                      value={filters.is_active}
                      onChange={(e) => handleFilterChange('is_active', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                      <option value="">All</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties List */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <div className="mx-auto h-12 w-12 text-muted-foreground">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-muted-foreground">No properties</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new property.</p>
              <div className="mt-6">
                <button
                  onClick={handleAddProperty}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Property
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sub-Properties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-muted/20 divide-y divide-border">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {property.primary_image ? (
                              <img
                                className="h-10 w-10 rounded-lg object-cover"
                                src={property.primary_image}
                                alt={property.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">
                              <button
                                onClick={() => router.push(`/dashboard/properties/${property.property_code}`)}
                                className="hover:text-blue-400 hover:underline"
                              >
                                {property.name}
                              </button>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <button
                                onClick={() => router.push(`/dashboard/properties/${property.property_code}`)}
                                className="hover:text-blue-400 hover:underline"
                              >
                                {property.property_code}
                              </button>
                            </div>
                            <div className="text-sm text-muted-foreground">{property.property_type_display}</div>
                            {/* Sub-property information */}
                            {property.is_sub_property && property.parent_property_name && (
                              <div className="text-xs text-blue-400 mt-1">
                                Sub-property of: {property.parent_property_name}
                              </div>
                            )}
                            {property.is_parent_property && property.sub_properties_count > 0 && (
                              <div className="text-xs text-green-400 mt-1">
                                Parent property • {property.sub_properties_count} sub-properties
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{property.city}</div>
                        <div className="text-sm text-muted-foreground">{property.province_display}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderOccupancyStatus(property.occupancy_info)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {property.is_parent_property && property.sub_properties_summary ? (
                          <div className="text-sm">
                            <div className="text-foreground font-medium">
                              {property.sub_properties_summary.total} total
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {property.sub_properties_summary.occupied} occupied • {property.sub_properties_summary.vacant} vacant
                            </div>
                            {property.sub_properties_summary.total_rental_income > 0 && (
                              <div className="text-xs text-green-400">
                                R{property.sub_properties_summary.total_rental_income.toLocaleString()}/month
                              </div>
                            )}
                          </div>
                        ) : property.is_sub_property ? (
                          <div className="text-sm text-muted-foreground">
                            Sub-property
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            —
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && properties.length > 0 && (
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mt-6 px-4 py-3 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-muted/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!totalCount || currentPage * pageSize >= totalCount}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-muted/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-muted/50 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!totalCount || currentPage * pageSize >= totalCount}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-muted/50 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 