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
  WrenchScrewdriverIcon,
  UserGroupIcon,
  HomeIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import toast from 'react-hot-toast';

// Maintenance types and interfaces
interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  property_id: string;
  property_name: string;
  unit_number?: string;
  assigned_team: string;
  assigned_team_name: string;
  reporter_name: string;
  estimated_cost: number;
  actual_cost?: number;
  scheduled_date: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cosmetic' | 'landscaping' | 'other';
  images?: string[];
  notes?: string;
}

interface MaintenanceTeam {
  id: string;
  name: string;
  specialties: string[];
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface Property {
  id: string;
  name: string;
  address: string;
  units_count: number;
}

interface Filters {
  search: string;
  status: string;
  priority: string;
  category: string;
  property_id: string;
  assigned_team: string;
  date_range: 'all' | 'today' | 'week' | 'month' | 'overdue';
}

export default function MaintenanceDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [teams, setTeams] = useState<MaintenanceTeam[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    priority: '',
    category: '',
    property_id: '',
    assigned_team: '',
    date_range: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MaintenanceItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data for demonstration
  const mockMaintenanceItems: MaintenanceItem[] = [
    {
      id: '1',
      title: 'Leaking Kitchen Faucet',
      description: 'Kitchen faucet in Unit 2A is leaking constantly, causing water waste and potential damage.',
      priority: 'high',
      status: 'pending',
      property_id: '1',
      property_name: 'Sunrise Apartments',
      unit_number: '2A',
      assigned_team: 'team1',
      assigned_team_name: 'AquaFix Plumbing',
      reporter_name: 'Sarah Johnson',
      estimated_cost: 150,
      scheduled_date: '2024-01-15',
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-10T10:00:00Z',
      category: 'plumbing',
      notes: 'Tenant reports leak started 3 days ago'
    },
    {
      id: '2',
      title: 'HVAC System Maintenance',
      description: 'Annual HVAC system inspection and filter replacement for Building A.',
      priority: 'medium',
      status: 'in_progress',
      property_id: '1',
      property_name: 'Sunrise Apartments',
      assigned_team: 'team2',
      assigned_team_name: 'CoolAir HVAC Services',
      reporter_name: 'Property Manager',
      estimated_cost: 500,
      actual_cost: 450,
      scheduled_date: '2024-01-12',
      created_at: '2024-01-08T14:30:00Z',
      updated_at: '2024-01-12T09:15:00Z',
      category: 'hvac',
      notes: 'Routine maintenance scheduled'
    },
    {
      id: '3',
      title: 'Broken Elevator',
      description: 'Main elevator in Building B is not functioning. Stuck between floors 3 and 4.',
      priority: 'urgent',
      status: 'pending',
      property_id: '2',
      property_name: 'Metropolitan Heights',
      assigned_team: 'team3',
      assigned_team_name: 'Vertical Solutions',
      reporter_name: 'Security Guard',
      estimated_cost: 2500,
      scheduled_date: '2024-01-11',
      created_at: '2024-01-11T08:45:00Z',
      updated_at: '2024-01-11T08:45:00Z',
      category: 'structural',
      notes: 'Emergency repair needed - safety issue'
    },
    {
      id: '4',
      title: 'Landscaping - Lawn Care',
      description: 'Weekly lawn maintenance and hedge trimming for property grounds.',
      priority: 'low',
      status: 'completed',
      property_id: '3',
      property_name: 'Garden View Complex',
      assigned_team: 'team4',
      assigned_team_name: 'GreenThumb Landscaping',
      reporter_name: 'Property Manager',
      estimated_cost: 200,
      actual_cost: 180,
      scheduled_date: '2024-01-08',
      completion_date: '2024-01-08',
      created_at: '2024-01-05T11:20:00Z',
      updated_at: '2024-01-08T16:30:00Z',
      category: 'landscaping',
      notes: 'Regular maintenance completed on schedule'
    },
    {
      id: '5',
      title: 'Electrical Outlet Repair',
      description: 'Multiple outlets in Unit 5C are not working properly.',
      priority: 'medium',
      status: 'pending',
      property_id: '1',
      property_name: 'Sunrise Apartments',
      unit_number: '5C',
      assigned_team: 'team5',
      assigned_team_name: 'PowerPro Electrical',
      reporter_name: 'Mike Chen',
      estimated_cost: 300,
      scheduled_date: '2024-01-16',
      created_at: '2024-01-09T13:15:00Z',
      updated_at: '2024-01-09T13:15:00Z',
      category: 'electrical',
      notes: 'Tenant reports outlets stopped working after power outage'
    }
  ];

  const mockTeams: MaintenanceTeam[] = [
    {
      id: 'team1',
      name: 'AquaFix Plumbing',
      specialties: ['Plumbing', 'Water Systems'],
      contact_person: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john@aquafix.com',
      is_active: true
    },
    {
      id: 'team2',
      name: 'CoolAir HVAC Services',
      specialties: ['HVAC', 'Heating', 'Cooling'],
      contact_person: 'Lisa Rodriguez',
      phone: '(555) 234-5678',
      email: 'lisa@coolairhvac.com',
      is_active: true
    },
    {
      id: 'team3',
      name: 'Vertical Solutions',
      specialties: ['Elevators', 'Structural'],
      contact_person: 'David Wilson',
      phone: '(555) 345-6789',
      email: 'david@verticalsolutions.com',
      is_active: true
    },
    {
      id: 'team4',
      name: 'GreenThumb Landscaping',
      specialties: ['Landscaping', 'Grounds Maintenance'],
      contact_person: 'Maria Garcia',
      phone: '(555) 456-7890',
      email: 'maria@greenthumb.com',
      is_active: true
    },
    {
      id: 'team5',
      name: 'PowerPro Electrical',
      specialties: ['Electrical', 'Wiring', 'Lighting'],
      contact_person: 'Robert Johnson',
      phone: '(555) 567-8901',
      email: 'robert@powerpro.com',
      is_active: true
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
      setMaintenanceItems(mockMaintenanceItems);
      setTeams(mockTeams);
      setProperties(mockProperties);
      setTotalCount(mockMaintenanceItems.length);
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

  // Filter maintenance items
  const filteredItems = maintenanceItems.filter(item => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = !filters.search || (
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.property_name.toLowerCase().includes(searchLower) ||
      item.assigned_team_name.toLowerCase().includes(searchLower) ||
      item.reporter_name.toLowerCase().includes(searchLower)
    );
    
    const matchesStatus = !filters.status || item.status === filters.status;
    const matchesPriority = !filters.priority || item.priority === filters.priority;
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesProperty = !filters.property_id || item.property_id === filters.property_id;
    const matchesTeam = !filters.assigned_team || item.assigned_team === filters.assigned_team;
    
    // Date range filtering
    let matchesDateRange = true;
    if (filters.date_range !== 'all') {
      const today = new Date();
      const itemDate = new Date(item.scheduled_date);
      
      switch (filters.date_range) {
        case 'today':
          matchesDateRange = itemDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          matchesDateRange = itemDate >= today && itemDate <= weekFromNow;
          break;
        case 'month':
          const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          matchesDateRange = itemDate >= today && itemDate <= monthFromNow;
          break;
        case 'overdue':
          matchesDateRange = itemDate < today && item.status !== 'completed';
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesProperty && matchesTeam && matchesDateRange;
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('ZAR', 'R');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return ClockIcon;
      case 'in_progress': return WrenchScrewdriverIcon;
      case 'completed': return CheckCircleIcon;
      case 'cancelled': return XCircleIcon;
      default: return ClockIcon;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return ExclamationTriangleIcon;
      case 'high': return ExclamationTriangleIcon;
      default: return null;
    }
  };

  // Navigation handlers
  const handleAddMaintenance = () => {
    setShowAddModal(true);
  };

  const handleViewItem = (item: MaintenanceItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEditItem = (item: MaintenanceItem) => {
    // TODO: Implement edit functionality
    console.log('Edit item:', item);
  };

  const handleDeleteItem = async (item: MaintenanceItem) => {
    if (!confirm('Are you sure you want to delete this maintenance item?')) {
      return;
    }
    
    try {
      // TODO: Implement delete API call
      setMaintenanceItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Maintenance item deleted successfully');
    } catch (error) {
      console.error('Error deleting maintenance item:', error);
      toast.error('Failed to delete maintenance item');
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Maintenance">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Maintenance">
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">
                  {maintenanceItems.filter(item => item.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {maintenanceItems.filter(item => item.status === 'in_progress').length}
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
                <p className="text-sm font-medium text-muted-foreground">Urgent</p>
                <p className="text-2xl font-bold text-foreground">
                  {maintenanceItems.filter(item => item.priority === 'urgent').length}
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
                  {maintenanceItems.filter(item => item.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add button */}
              <button
                onClick={handleAddMaintenance}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Log Maintenance
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
                    placeholder="Search maintenance items..."
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Priority filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Priority
                    </label>
                    <select
                      value={filters.priority}
                      onChange={(e) => handleFilterChange('priority', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Priority</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Category filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Categories</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC</option>
                      <option value="appliance">Appliance</option>
                      <option value="structural">Structural</option>
                      <option value="cosmetic">Cosmetic</option>
                      <option value="landscaping">Landscaping</option>
                      <option value="other">Other</option>
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

                  {/* Team filter */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Team
                    </label>
                    <select
                      value={filters.assigned_team}
                      onChange={(e) => handleFilterChange('assigned_team', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md bg-muted/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Teams</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
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
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredItems.length)} of {filteredItems.length} maintenance items
          </p>
        </div>

        {/* Maintenance Items Table */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-20">
              <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No maintenance items found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status || filters.priority || filters.category || filters.property_id || filters.assigned_team || filters.date_range !== 'all'
                  ? "Try adjusting your filters to see more results."
                  : "Get started by logging your first maintenance item."
                }
              </p>
              <button
                onClick={handleAddMaintenance}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Log Maintenance
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Assigned Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((item) => {
                    const StatusIcon = getStatusIcon(item.status);
                    const PriorityIcon = getPriorityIcon(item.priority);
                    const isOverdue = new Date(item.scheduled_date) < new Date() && item.status !== 'completed';
                    
                    return (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <WrenchScrewdriverIcon className="h-6 w-6 text-blue-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-foreground">
                                  {item.title}
                                </div>
                                {PriorityIcon && (
                                  <PriorityIcon className="h-4 w-4 text-red-400 ml-2" />
                                )}
                                {isOverdue && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {item.category}
                                {item.unit_number && ` • Unit ${item.unit_number}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">{item.property_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Reported by {item.reporter_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">{item.assigned_team_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">{formatDate(item.scheduled_date)}</div>
                          {item.completion_date && (
                            <div className="text-sm text-muted-foreground">
                              Completed: {formatDate(item.completion_date)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {formatCurrency(item.estimated_cost)}
                          </div>
                          {item.actual_cost && (
                            <div className="text-sm text-muted-foreground">
                              Actual: {formatCurrency(item.actual_cost)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewItem(item)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-yellow-400 hover:text-yellow-300 p-1 rounded"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
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
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border px-4 py-3 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-muted/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-muted/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(startIndex + pageSize, filteredItems.length)}</span> of{' '}
                    <span className="font-medium">{filteredItems.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-muted/50 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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
                            : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-muted/50 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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