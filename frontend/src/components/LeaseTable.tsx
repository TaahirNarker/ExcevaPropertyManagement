'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PencilIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  BanknotesIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Lease, formatCurrency, formatDate, getLeaseStatus } from '../lib/api';
import StatusBadge from './StatusBadge';

interface LeaseTableProps {
  leases: Lease[];
  loading?: boolean;
  onEdit?: (lease: Lease) => void;
  onView?: (lease: Lease) => void;
  className?: string;
}

type SortField = 'tenant_name' | 'unit_number' | 'start_date' | 'end_date' | 'monthly_rent' | 'status';
type SortDirection = 'asc' | 'desc';

interface TableFilters {
  search: string;
  status: string;
  property: string;
}

const LeaseTable: React.FC<LeaseTableProps> = ({
  leases,
  loading = false,
  onEdit,
  onView,
  className = ''
}) => {
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    status: '',
    property: ''
  });
  const [sortField, setSortField] = useState<SortField>('end_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Get unique properties and statuses for filter options
  const filterOptions = useMemo(() => {
    const properties = Array.from(new Set(leases.map(lease => lease.unit.property)));
    const statuses = Array.from(new Set(leases.map(lease => getLeaseStatus(lease).status)));
    
    return { properties, statuses };
  }, [leases]);

  // Filter and sort leases
  const filteredAndSortedLeases = useMemo(() => {
    let filtered = leases.filter(lease => {
      const matchesSearch = filters.search === '' || 
        lease.tenant.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        lease.unit.number.toLowerCase().includes(filters.search.toLowerCase()) ||
        lease.unit.property.toLowerCase().includes(filters.search.toLowerCase());
        
      const matchesStatus = filters.status === '' || 
        getLeaseStatus(lease).status === filters.status;
        
      const matchesProperty = filters.property === '' || 
        lease.unit.property === filters.property;

      return matchesSearch && matchesStatus && matchesProperty;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'tenant_name':
          aValue = a.tenant.name.toLowerCase();
          bValue = b.tenant.name.toLowerCase();
          break;
        case 'unit_number':
          aValue = a.unit.number.toLowerCase();
          bValue = b.unit.number.toLowerCase();
          break;
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'end_date':
          aValue = new Date(a.end_date);
          bValue = new Date(b.end_date);
          break;
        case 'monthly_rent':
          aValue = a.monthly_rent;
          bValue = b.monthly_rent;
          break;
        case 'status':
          aValue = getLeaseStatus(a).status;
          bValue = getLeaseStatus(b).status;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [leases, filters, sortField, sortDirection]);

  // Pagination
  const paginatedLeases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedLeases, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedLeases.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof TableFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', property: '' });
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ArrowUpIcon className="w-4 h-4" /> : 
      <ArrowDownIcon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading leases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Leases ({filteredAndSortedLeases.length})
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage all tenant leases and agreements
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 text-sm rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
            
            <Link
              href="/property-management/leases/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              New Lease
            </Link>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Tenant, unit, property..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                {filterOptions.statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Property Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Property
              </label>
              <select
                value={filters.property}
                onChange={(e) => handleFilterChange('property', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Properties</option>
                {filterOptions.properties.map(property => (
                  <option key={property} value={property}>{property}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th 
                onClick={() => handleSort('tenant_name')}
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Tenant
                  <SortIcon field="tenant_name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('unit_number')}
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Unit
                  <SortIcon field="unit_number" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('start_date')}
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Start Date
                  <SortIcon field="start_date" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('end_date')}
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  End Date
                  <SortIcon field="end_date" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('monthly_rent')}
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Monthly Rent
                  <SortIcon field="monthly_rent" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedLeases.map((lease, index) => {
              const leaseStatus = getLeaseStatus(lease);
              
              return (
                <motion.tr
                  key={lease.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Tenant */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {lease.tenant.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {lease.tenant.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Unit */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {lease.unit.number}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {lease.unit.property}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Start Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(lease.start_date)}
                      </span>
                    </div>
                  </td>

                  {/* End Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(lease.end_date)}
                      </span>
                    </div>
                  </td>

                  {/* Monthly Rent */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BanknotesIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(lease.monthly_rent)}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge
                      status={leaseStatus.status}
                      color={leaseStatus.color}
                      urgency={leaseStatus.urgency}
                      size="sm"
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/property-management/leases/${lease.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                        title="View lease"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                      
                      {onEdit && (
                        <button
                          onClick={() => onEdit(lease)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 p-1"
                          title="Edit lease"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* No results */}
        {paginatedLeases.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No leases found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {filters.search || filters.status || filters.property
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first lease agreement.'
              }
            </p>
            {(!filters.search && !filters.status && !filters.property) && (
              <Link
                href="/property-management/leases/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Create First Lease
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {paginatedLeases.length > 0 && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                entries
              </span>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages} ({filteredAndSortedLeases.length} total)
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaseTable; 