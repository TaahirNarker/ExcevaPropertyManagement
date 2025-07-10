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
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesAPI, Property, PropertiesResponse } from '@/lib/properties-api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Local types
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
        page: currentPage,
        page_size: pageSize,
      };

      const data = await propertiesAPI.getProperties(apiFilters);
      setProperties(data.results);
      setTotalCount(data.count);
      setFilterOptions(data.filters);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load properties');
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

  const handleViewProperty = (propertyCode: string) => {
    router.push(`/dashboard/properties/${propertyCode}`);
  };

  const handleEditProperty = (propertyCode: string) => {
    router.push(`/dashboard/properties/${propertyCode}/edit`);
  };

  const handleDeleteProperty = async (propertyCode: string) => {
    if (!confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await propertiesAPI.deleteProperty(propertyCode);
      toast.success('Property deleted successfully');
      fetchProperties(); // Refresh the list
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete property');
    }
  };

  // Render occupancy status
  const renderOccupancyStatus = (occupancy: Property['occupancy_info']) => {
    if (occupancy.status === 'Vacant') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Vacant
        </span>
      );
    } else if (occupancy.status === 'Occupied' && occupancy.details) {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Occupied
          </span>
          <div className="text-sm text-white">
            {occupancy.details}
            {occupancy.lease_end && (
              <div className="text-xs text-gray-300">
                Until {new Date(occupancy.lease_end).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {occupancy.status}
        </span>
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Properties" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Properties" 
      subtitle="Manage your property portfolio"
    >
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add button */}
              <button
                onClick={handleAddProperty}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add a property
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
                    placeholder="Enter search text"
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
                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Property Type
                    </label>
                    <select
                      value={filters.property_type}
                      onChange={(e) => handleFilterChange('property_type', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {filterOptions.property_types.map(type => (
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

                  {/* Province */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Province
                    </label>
                    <select
                      value={filters.province}
                      onChange={(e) => handleFilterChange('province', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Provinces</option>
                      {filterOptions.provinces.map(province => (
                        <option key={province.value} value={province.value}>
                          {province.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({
                        search: '',
                        property_type: '',
                        status: '',
                        province: '',
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

        {/* Properties Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300">No properties found</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-white/5 px-6 py-3 border-b border-white/20">
                <div className="grid grid-cols-12 gap-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <div className="col-span-2">Property</div>
                  <div className="col-span-6">Details</div>
                  <div className="col-span-3">State</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-white/10">
                {properties.map((property) => (
                  <div key={property.id} className="px-6 py-4 hover:bg-white/5">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Property Code */}
                      <div className="col-span-2">
                        <button
                          onClick={() => handleViewProperty(property.property_code)}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          {property.property_code}
                        </button>
                      </div>

                      {/* Property Details */}
                      <div className="col-span-6">
                        <div className="space-y-1">
                          <div className="font-medium text-white">
                            {property.display_name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {property.full_address}
                          </div>
                          {property.monthly_rental_amount && (
                            <div className="text-sm text-green-400 font-medium">
                              R{property.monthly_rental_amount.toLocaleString()}/month
                            </div>
                          )}
                        </div>
                      </div>

                      {/* State */}
                      <div className="col-span-3">
                        {renderOccupancyStatus(property.occupancy_info)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewProperty(property.property_code)}
                            className="text-gray-400 hover:text-white"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditProperty(property.property_code)}
                            className="text-gray-400 hover:text-blue-400"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(property.property_code)}
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
          {totalCount} items found.
        </div>
      </div>
    </DashboardLayout>
  );
} 