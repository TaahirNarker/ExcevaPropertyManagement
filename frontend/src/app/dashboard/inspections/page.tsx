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
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  HomeIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import toast from 'react-hot-toast';

// Inspection types and interfaces
interface Inspection {
  id: string;
  type: 'move_in' | 'periodic' | 'move_out';
  property_id: string;
  property_name: string;
  unit_number: string;
  tenant_name?: string;
  inspector_name: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  template_id: string;
  template_name: string;
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'unacceptable';
  total_items: number;
  passed_items: number;
  failed_items: number;
  notes?: string;
  images?: string[];
  created_at: string;
  updated_at: string;
}

interface InspectionTemplate {
  id: string;
  name: string;
  type: 'move_in' | 'periodic' | 'move_out' | 'custom';
  is_standard: boolean;
  categories: InspectionCategory[];
  created_at: string;
  updated_at: string;
}

interface InspectionCategory {
  id: string;
  name: string;
  items: InspectionItem[];
}

interface InspectionItem {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
  condition_options: string[];
}

interface Property {
  id: string;
  name: string;
  address: string;
  units_count: number;
}

interface Filters {
  search: string;
  type: string;
  status: string;
  property_id: string;
  date_range: 'all' | 'today' | 'week' | 'month' | 'overdue';
}

export default function InspectionsDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    status: '',
    property_id: '',
    date_range: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data for demonstration
  const mockInspections: Inspection[] = [
    {
      id: '1',
      type: 'move_in',
      property_id: '1',
      property_name: 'Sunrise Apartments',
      unit_number: '2A',
      tenant_name: 'Sarah Johnson',
      inspector_name: 'Mike Wilson',
      scheduled_date: '2024-01-15',
      completed_date: '2024-01-15',
      status: 'completed',
      template_id: 'template1',
      template_name: 'Standard Move-In Inspection',
      overall_condition: 'good',
      total_items: 25,
      passed_items: 23,
      failed_items: 2,
      notes: 'Minor issues with bathroom faucet and bedroom window lock',
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-15T16:30:00Z'
    },
    {
      id: '2',
      type: 'periodic',
      property_id: '1',
      property_name: 'Sunrise Apartments',
      unit_number: '5C',
      tenant_name: 'Robert Chen',
      inspector_name: 'Lisa Rodriguez',
      scheduled_date: '2024-01-20',
      status: 'scheduled',
      template_id: 'template2',
      template_name: 'Quarterly Inspection',
      overall_condition: 'good',
      total_items: 18,
      passed_items: 0,
      failed_items: 0,
      notes: 'Routine quarterly inspection',
      created_at: '2024-01-12T14:00:00Z',
      updated_at: '2024-01-12T14:00:00Z'
    },
    {
      id: '3',
      type: 'move_out',
      property_id: '2',
      property_name: 'Metropolitan Heights',
      unit_number: '12B',
      tenant_name: 'Emily Davis',
      inspector_name: 'David Wilson',
      scheduled_date: '2024-01-18',
      status: 'in_progress',
      template_id: 'template3',
      template_name: 'Standard Move-Out Inspection',
      overall_condition: 'fair',
      total_items: 30,
      passed_items: 18,
      failed_items: 5,
      notes: 'Tenant moving out, security deposit assessment needed',
      created_at: '2024-01-14T09:00:00Z',
      updated_at: '2024-01-18T11:15:00Z'
    },
    {
      id: '4',
      type: 'periodic',
      property_id: '3',
      property_name: 'Garden View Complex',
      unit_number: '8A',
      tenant_name: 'Michael Thompson',
      inspector_name: 'Jessica Brown',
      scheduled_date: '2024-01-25',
      status: 'scheduled',
      template_id: 'template2',
      template_name: 'Quarterly Inspection',
      overall_condition: 'excellent',
      total_items: 18,
      passed_items: 0,
      failed_items: 0,
      notes: 'Annual inspection due',
      created_at: '2024-01-16T13:30:00Z',
      updated_at: '2024-01-16T13:30:00Z'
    },
    {
      id: '5',
      type: 'move_in',
      property_id: '2',
      property_name: 'Metropolitan Heights',
      unit_number: '7C',
      tenant_name: 'Amanda Wilson',
      inspector_name: 'Mike Wilson',
      scheduled_date: '2024-01-12',
      status: 'cancelled',
      template_id: 'template1',
      template_name: 'Standard Move-In Inspection',
      overall_condition: 'good',
      total_items: 25,
      passed_items: 0,
      failed_items: 0,
      notes: 'Tenant cancelled move-in',
      created_at: '2024-01-08T10:00:00Z',
      updated_at: '2024-01-12T08:00:00Z'
    }
  ];

  const mockTemplates: InspectionTemplate[] = [
    {
      id: 'template1',
      name: 'Standard Move-In Inspection',
      type: 'move_in',
      is_standard: true,
      categories: [
        {
          id: 'cat1',
          name: 'Kitchen',
          items: [
            {
              id: 'item1',
              name: 'Appliances',
              description: 'Check all kitchen appliances for proper function',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Not Working']
            },
            {
              id: 'item2',
              name: 'Cabinets & Drawers',
              description: 'Inspect cabinet doors, drawers, and hardware',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
            }
          ]
        },
        {
          id: 'cat2',
          name: 'Bathroom',
          items: [
            {
              id: 'item3',
              name: 'Plumbing Fixtures',
              description: 'Check faucets, toilet, shower/tub for leaks and function',
              is_required: true,
              condition_options: ['Excellent', 'Good', 'Fair', 'Poor', 'Leaking']
            }
          ]
        }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template2',
      name: 'Quarterly Inspection',
      type: 'periodic',
      is_standard: true,
      categories: [
        {
          id: 'cat3',
          name: 'Safety',
          items: [
            {
              id: 'item4',
              name: 'Smoke Detectors',
              description: 'Test all smoke detectors and replace batteries if needed',
              is_required: true,
              condition_options: ['Working', 'Needs Battery', 'Not Working']
            }
          ]
        }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template3',
      name: 'Standard Move-Out Inspection',
      type: 'move_out',
      is_standard: true,
      categories: [
        {
          id: 'cat4',
          name: 'Damage Assessment',
          items: [
            {
              id: 'item5',
              name: 'Walls & Paint',
              description: 'Assess wall damage and paint condition',
              is_required: true,
              condition_options: ['No Damage', 'Minor Scuffs', 'Holes', 'Needs Repainting', 'Major Damage']
            }
          ]
        }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockProperties: Property[] = [
    {
      id: '1',
      name: 'Sunrise Apartments',
      address: '123 Main St, Downtown',
      units_count: 50
    },
    {
      id: '2',
      name: 'Metropolitan Heights',
      address: '456 Oak Ave, Midtown',
      units_count: 75
    },
    {
      id: '3',
      name: 'Garden View Complex',
      address: '789 Pine Rd, Suburbs',
      units_count: 30
    }
  ];

  // Initialize data
  useEffect(() => {
    if (isAuthenticated) {
      setInspections(mockInspections);
      setTemplates(mockTemplates);
      setProperties(mockProperties);
      setTotalCount(mockInspections.length);
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value);
  };

  // Filter inspections
  const filteredInspections = inspections.filter(inspection => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = !filters.search || (
      inspection.property_name.toLowerCase().includes(searchLower) ||
      inspection.unit_number.toLowerCase().includes(searchLower) ||
      inspection.tenant_name?.toLowerCase().includes(searchLower) ||
      inspection.inspector_name.toLowerCase().includes(searchLower) ||
      inspection.template_name.toLowerCase().includes(searchLower)
    );
    
    const matchesType = !filters.type || inspection.type === filters.type;
    const matchesStatus = !filters.status || inspection.status === filters.status;
    const matchesProperty = !filters.property_id || inspection.property_id === filters.property_id;
    
    // Date range filtering
    let matchesDateRange = true;
    if (filters.date_range !== 'all') {
      const today = new Date();
      const inspectionDate = new Date(inspection.scheduled_date);
      
      switch (filters.date_range) {
        case 'today':
          matchesDateRange = inspectionDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          matchesDateRange = inspectionDate >= today && inspectionDate <= weekFromNow;
          break;
        case 'month':
          const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          matchesDateRange = inspectionDate >= today && inspectionDate <= monthFromNow;
          break;
        case 'overdue':
          matchesDateRange = inspectionDate < today && inspection.status !== 'completed';
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesProperty && matchesDateRange;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInspections.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInspections = filteredInspections.slice(startIndex, startIndex + pageSize);

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return CalendarIcon;
      case 'in_progress': return ClockIcon;
      case 'completed': return CheckCircleIcon;
      case 'cancelled': return ExclamationTriangleIcon;
      default: return CalendarIcon;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'move_in': return 'bg-green-100 text-green-800 border-green-200';
      case 'periodic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'move_out': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-muted text-muted-foreground border-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'unacceptable': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground border-gray-200';
    }
  };

  // Navigation handlers
  const handleScheduleInspection = () => {
    router.push('/dashboard/inspections/schedule');
  };

  const handleManageTemplates = () => {
    router.push('/dashboard/inspections/templates');
  };

  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowDetailModal(true);
  };

  const handleEditInspection = (inspection: Inspection) => {
    router.push(`/dashboard/inspections/edit/${inspection.id}`);
  };

  const handleDeleteInspection = async (inspection: Inspection) => {
    if (!confirm('Are you sure you want to delete this inspection?')) {
      return;
    }
    
    try {
      // TODO: Implement delete API call
      setInspections(prev => prev.filter(i => i.id !== inspection.id));
      toast.success('Inspection deleted successfully');
    } catch (error) {
      console.error('Error deleting inspection:', error);
      toast.error('Failed to delete inspection');
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Inspections">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inspections">
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-foreground">
                  {inspections.filter(i => i.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {inspections.filter(i => i.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {inspections.filter(i => i.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">
                  {inspections.filter(i => new Date(i.scheduled_date) < new Date() && i.status !== 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold text-foreground">
                  {templates.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Action buttons */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handleScheduleInspection}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Schedule Inspection
                </button>
                
                <button
                  onClick={handleManageTemplates}
                  className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-muted/50 backdrop-blur-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CogIcon className="h-5 w-5 mr-2" />
                  Manage Templates
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
                    placeholder="Search inspections..."
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-muted/50 backdrop-blur-sm placeholder-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-muted/50 backdrop-blur-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                </button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Type filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="move_in">Move-In</option>
                      <option value="periodic">Periodic</option>
                      <option value="move_out">Move-Out</option>
                    </select>
                  </div>

                  {/* Status filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Property filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Property
                    </label>
                    <select
                      value={filters.property_id}
                      onChange={(e) => handleFilterChange('property_id', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Properties</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date range filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Date Range
                    </label>
                    <select
                      value={filters.date_range}
                      onChange={(e) => handleFilterChange('date_range', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredInspections.length)} of {filteredInspections.length} inspections
          </p>
        </div>

        {/* Inspections Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          ) : paginatedInspections.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No inspections found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.type || filters.status || filters.property_id || filters.date_range !== 'all'
                  ? "Try adjusting your filters to see more results."
                  : "Get started by scheduling your first inspection."
                }
              </p>
              <button
                onClick={handleScheduleInspection}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Schedule Inspection
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/20">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Inspection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Property & Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Inspector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Results
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {paginatedInspections.map((inspection) => {
                    const StatusIcon = getStatusIcon(inspection.status);
                    const isOverdue = new Date(inspection.scheduled_date) < new Date() && inspection.status !== 'completed';
                    const completionRate = inspection.total_items > 0 ? (inspection.passed_items / inspection.total_items) * 100 : 0;
                    
                    return (
                      <tr key={inspection.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-white">
                                  {inspection.template_name}
                                </div>
                                {isOverdue && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {inspection.tenant_name || 'No tenant assigned'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{inspection.property_name}</div>
                          <div className="text-sm text-muted-foreground">Unit {inspection.unit_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(inspection.type)}`}>
                            {inspection.type.replace('_', '-').charAt(0).toUpperCase() + inspection.type.replace('_', '-').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(inspection.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {inspection.status.replace('_', ' ').charAt(0).toUpperCase() + inspection.status.replace('_', ' ').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{inspection.inspector_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{formatDate(inspection.scheduled_date)}</div>
                          {inspection.completed_date && (
                            <div className="text-sm text-muted-foreground">
                              Completed: {formatDate(inspection.completed_date)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {inspection.status === 'completed' ? (
                            <div>
                              <div className="text-sm text-white">
                                {inspection.passed_items}/{inspection.total_items} passed
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getConditionColor(inspection.overall_condition)}`}>
                                  {inspection.overall_condition.charAt(0).toUpperCase() + inspection.overall_condition.slice(1)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground/70">
                              Pending completion
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewInspection(inspection)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditInspection(inspection)}
                              className="text-yellow-400 hover:text-yellow-300 p-1 rounded"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInspection(inspection)}
                              className="text-red-400 hover:text-red-300 p-1 rounded"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 px-4 py-3 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(startIndex + pageSize, filteredInspections.length)}</span> of{' '}
                    <span className="font-medium">{filteredInspections.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/20 bg-white/10 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/20 bg-white/10 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 