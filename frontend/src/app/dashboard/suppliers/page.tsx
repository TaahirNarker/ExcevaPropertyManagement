/**
 * Suppliers Dashboard Page
 * Suppliers management interface integrated into the dashboard layout
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
  WrenchScrewdriverIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Mock Supplier interface
interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  category: string;
  subcategory: string;
  website: string;
  vat_number: string;
  tax_number: string;
  rating: number;
  is_verified: boolean;
  is_preferred: boolean;
  status: string;
  services_provided: string[];
  hourly_rate: number;
  min_call_out_fee: number;
  response_time: string;
  last_service_date: string;
  total_services: number;
  created_at: string;
  updated_at: string;
}

// Mock response interface
interface SuppliersResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Supplier[];
  filters: {
    categories: Array<{ value: string; label: string }>;
    provinces: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
  };
}

// Local types for filters
interface Filters {
  search: string;
  category: string;
  province: string;
  status: string;
  is_verified: string;
  is_preferred: string;
  rating: string;
}

// Mock data
const mockSuppliers: Supplier[] = [
  {
    id: '1',
    supplier_code: 'SUP000001',
    name: 'ABC Plumbing Services',
    company_name: 'ABC Plumbing Services (Pty) Ltd',
    contact_person: 'John Anderson',
    email: 'john@abcplumbing.co.za',
    phone: '+27 21 123 4567',
    mobile: '+27 82 123 4567',
    address: '123 Main Street, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '7530',
    category: 'Plumbing',
    subcategory: 'Emergency Plumbing',
    website: 'www.abcplumbing.co.za',
    vat_number: '4123456789',
    tax_number: '9876543210',
    rating: 4.5,
    is_verified: true,
    is_preferred: true,
    status: 'Active',
    services_provided: ['Leak Repairs', 'Pipe Installation', 'Drain Cleaning', 'Emergency Callouts'],
    hourly_rate: 450,
    min_call_out_fee: 200,
    response_time: '2 hours',
    last_service_date: '2024-01-15',
    total_services: 25,
    created_at: '2023-06-15T10:30:00Z',
    updated_at: '2024-01-15T14:20:00Z',
  },
  {
    id: '2',
    supplier_code: 'SUP000002',
    name: 'Elite Electrical Solutions',
    company_name: 'Elite Electrical Solutions CC',
    contact_person: 'Sarah Mitchell',
    email: 'sarah@eliteelectrical.co.za',
    phone: '+27 21 987 6543',
    mobile: '+27 83 987 6543',
    address: '456 Oak Avenue, Claremont',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '7708',
    category: 'Electrical',
    subcategory: 'Commercial Electrical',
    website: 'www.eliteelectrical.co.za',
    vat_number: '4987654321',
    tax_number: '1234567890',
    rating: 4.8,
    is_verified: true,
    is_preferred: true,
    status: 'Active',
    services_provided: ['Wiring', 'DB Board Installation', 'Electrical Inspections', 'Solar Installation'],
    hourly_rate: 550,
    min_call_out_fee: 250,
    response_time: '4 hours',
    last_service_date: '2024-02-01',
    total_services: 18,
    created_at: '2023-08-20T09:15:00Z',
    updated_at: '2024-02-01T11:45:00Z',
  },
  {
    id: '3',
    supplier_code: 'SUP000003',
    name: 'Garden Masters Landscaping',
    company_name: 'Garden Masters Landscaping',
    contact_person: 'Michael Green',
    email: 'michael@gardenmasters.co.za',
    phone: '+27 21 555 0123',
    mobile: '+27 84 555 0123',
    address: '789 Garden Route, Constantia',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '7806',
    category: 'Landscaping',
    subcategory: 'Garden Maintenance',
    website: 'www.gardenmasters.co.za',
    vat_number: '4555666777',
    tax_number: '7777888899',
    rating: 4.2,
    is_verified: true,
    is_preferred: false,
    status: 'Active',
    services_provided: ['Lawn Mowing', 'Tree Trimming', 'Garden Design', 'Irrigation Systems'],
    hourly_rate: 300,
    min_call_out_fee: 150,
    response_time: '1 day',
    last_service_date: '2024-01-30',
    total_services: 42,
    created_at: '2023-04-10T16:45:00Z',
    updated_at: '2024-01-30T13:30:00Z',
  },
  {
    id: '4',
    supplier_code: 'SUP000004',
    name: 'Precision Painting Co',
    company_name: 'Precision Painting Co',
    contact_person: 'David Johnson',
    email: 'david@precisionpainting.co.za',
    phone: '+27 21 444 5678',
    mobile: '+27 85 444 5678',
    address: '321 Brush Street, Wynberg',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '7800',
    category: 'Painting',
    subcategory: 'Interior Painting',
    website: '',
    vat_number: '',
    tax_number: '5555666677',
    rating: 3.9,
    is_verified: false,
    is_preferred: false,
    status: 'Active',
    services_provided: ['Interior Painting', 'Exterior Painting', 'Wallpaper Installation', 'Surface Preparation'],
    hourly_rate: 280,
    min_call_out_fee: 100,
    response_time: '2 days',
    last_service_date: '2023-12-20',
    total_services: 8,
    created_at: '2023-10-05T12:15:00Z',
    updated_at: '2023-12-20T15:45:00Z',
  },
  {
    id: '5',
    supplier_code: 'SUP000005',
    name: 'SecureGuard Security',
    company_name: 'SecureGuard Security Systems (Pty) Ltd',
    contact_person: 'Lisa Thompson',
    email: 'lisa@secureguard.co.za',
    phone: '+27 21 777 8899',
    mobile: '+27 86 777 8899',
    address: '654 Security Avenue, Goodwood',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '7460',
    category: 'Security',
    subcategory: 'Alarm Systems',
    website: 'www.secureguard.co.za',
    vat_number: '4777888999',
    tax_number: '9999000111',
    rating: 4.6,
    is_verified: true,
    is_preferred: true,
    status: 'Active',
    services_provided: ['Alarm Installation', 'CCTV Systems', 'Access Control', 'Security Monitoring'],
    hourly_rate: 650,
    min_call_out_fee: 300,
    response_time: '1 hour',
    last_service_date: '2024-02-10',
    total_services: 15,
    created_at: '2023-09-12T08:30:00Z',
    updated_at: '2024-02-10T10:20:00Z',
  },
  {
    id: '6',
    supplier_code: 'SUP000006',
    name: 'Handy Home Repairs',
    company_name: 'Handy Home Repairs',
    contact_person: 'Robert Wilson',
    email: 'robert@handyhome.co.za',
    phone: '+27 21 333 4455',
    mobile: '+27 87 333 4455',
    address: '987 Fix-It Lane, Parow',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '7500',
    category: 'Handyman',
    subcategory: 'General Repairs',
    website: '',
    vat_number: '',
    tax_number: '3333444455',
    rating: 4.1,
    is_verified: false,
    is_preferred: false,
    status: 'Inactive',
    services_provided: ['General Repairs', 'Furniture Assembly', 'Door Installation', 'Minor Electrical'],
    hourly_rate: 350,
    min_call_out_fee: 180,
    response_time: '4 hours',
    last_service_date: '2023-11-15',
    total_services: 12,
    created_at: '2023-07-25T14:00:00Z',
    updated_at: '2023-11-15T16:30:00Z',
  },
];

const mockFilters = {
  categories: [
    { value: 'Plumbing', label: 'Plumbing' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'Landscaping', label: 'Landscaping' },
    { value: 'Painting', label: 'Painting' },
    { value: 'Security', label: 'Security' },
    { value: 'Handyman', label: 'Handyman' },
    { value: 'HVAC', label: 'HVAC' },
    { value: 'Cleaning', label: 'Cleaning' },
  ],
  provinces: [
    { value: 'Western Cape', label: 'Western Cape' },
    { value: 'Gauteng', label: 'Gauteng' },
    { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
    { value: 'Eastern Cape', label: 'Eastern Cape' },
  ],
  statuses: [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
  ],
};

export default function SuppliersDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: '',
    province: '',
    status: '',
    is_verified: '',
    is_preferred: '',
    rating: '',
  });
  const [filterOptions, setFilterOptions] = useState(mockFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Mock fetch suppliers function
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Filter mock data based on filters
      let filteredSuppliers = [...mockSuppliers];
      
      if (filters.search) {
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          supplier.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          supplier.company_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          supplier.supplier_code.toLowerCase().includes(filters.search.toLowerCase()) ||
          supplier.contact_person.toLowerCase().includes(filters.search.toLowerCase()) ||
          supplier.email.toLowerCase().includes(filters.search.toLowerCase()) ||
          supplier.category.toLowerCase().includes(filters.search.toLowerCase()) ||
          supplier.services_provided.some(service => 
            service.toLowerCase().includes(filters.search.toLowerCase())
          )
        );
      }
      
      if (filters.category) {
        filteredSuppliers = filteredSuppliers.filter(supplier => supplier.category === filters.category);
      }
      
      if (filters.province) {
        filteredSuppliers = filteredSuppliers.filter(supplier => supplier.province === filters.province);
      }
      
      if (filters.status) {
        filteredSuppliers = filteredSuppliers.filter(supplier => supplier.status === filters.status);
      }
      
      if (filters.is_verified) {
        filteredSuppliers = filteredSuppliers.filter(supplier => 
          supplier.is_verified === (filters.is_verified === 'true')
        );
      }
      
      if (filters.is_preferred) {
        filteredSuppliers = filteredSuppliers.filter(supplier => 
          supplier.is_preferred === (filters.is_preferred === 'true')
        );
      }
      
      if (filters.rating) {
        const minRating = parseFloat(filters.rating);
        filteredSuppliers = filteredSuppliers.filter(supplier => supplier.rating >= minRating);
      }
      
      // Simulate pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);
      
      setSuppliers(paginatedSuppliers);
      setTotalCount(filteredSuppliers.length);
      setFilterOptions(mockFilters);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Load suppliers on mount and filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSuppliers();
    }
  }, [isAuthenticated, fetchSuppliers]);

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
  const handleAddSupplier = () => {
    router.push('/dashboard/suppliers/add');
  };

  const handleViewSupplier = (supplierCode: string) => {
    toast(`View supplier ${supplierCode} - Feature coming soon`);
  };

  const handleEditSupplier = (supplierCode: string) => {
    toast(`Edit supplier ${supplierCode} - Feature coming soon`);
  };

  const handleDeleteSupplier = async (supplierCode: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    try {
      // Simulate API call
      toast.success('Supplier deleted successfully');
      fetchSuppliers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete supplier');
    }
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

  // Render rating stars
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-current" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <StarIcon key="half" className="h-4 w-4 text-yellow-400 fill-current opacity-50" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />
      );
    }
    
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">
          {stars}
        </div>
        <span className="text-sm text-muted-foreground">({rating.toFixed(1)})</span>
      </div>
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
      <DashboardLayout title="Suppliers">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Suppliers">
      <div className="p-6">
        {/* Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Left side - Add button */}
              <button
                onClick={handleAddSupplier}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add a supplier
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
                    placeholder="Search suppliers..."
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-muted/50 placeholder-muted-foreground text-foreground focus:outline-none focus:placeholder-muted-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="block w-full sm:w-40 px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {filterOptions.categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>

                {/* Page Size */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="block w-full sm:w-20 px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  {/* Province */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Province
                    </label>
                    <select
                      value={filters.province}
                      onChange={(e) => handleFilterChange('province', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Provinces</option>
                      {filterOptions.provinces.map(province => (
                        <option key={province.value} value={province.value}>
                          {province.label}
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
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      {filterOptions.statuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Verified */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Verified
                    </label>
                    <select
                      value={filters.is_verified}
                      onChange={(e) => handleFilterChange('is_verified', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="true">Verified</option>
                      <option value="false">Not Verified</option>
                    </select>
                  </div>

                  {/* Preferred */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Preferred
                    </label>
                    <select
                      value={filters.is_preferred}
                      onChange={(e) => handleFilterChange('is_preferred', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="true">Preferred</option>
                      <option value="false">Not Preferred</option>
                    </select>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Min Rating
                    </label>
                    <select
                      value={filters.rating}
                      onChange={(e) => handleFilterChange('rating', e.target.value)}
                      className="block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Ratings</option>
                      <option value="4.5">4.5+ Stars</option>
                      <option value="4.0">4.0+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                      <option value="3.0">3.0+ Stars</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end sm:col-span-2 lg:col-span-3">
                    <button
                      onClick={() => setFilters({
                        search: '',
                        category: '',
                        province: '',
                        status: '',
                        is_verified: '',
                        is_preferred: '',
                        rating: '',
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

        {/* Suppliers Table */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12">
              <WrenchScrewdriverIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground text-lg mb-2">No suppliers found</p>
              <p className="text-muted-foreground text-sm">Get started by adding your first supplier</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-white/5 px-6 py-3 border-b border-white/20">
                <div className="grid grid-cols-12 gap-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Supplier</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Details</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-white/10">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="px-6 py-4 hover:bg-white/5">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Supplier Info */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewSupplier(supplier.supplier_code)}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              {supplier.supplier_code}
                            </button>
                            {supplier.is_verified && (
                              <CheckCircleIcon className="h-4 w-4 text-green-400" title="Verified" />
                            )}
                            {supplier.is_preferred && (
                              <StarIcon className="h-4 w-4 text-yellow-400 fill-current" title="Preferred" />
                            )}
                          </div>
                          <div className="font-medium text-white">
                            {supplier.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.contact_person}
                          </div>
                          {renderRating(supplier.rating)}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <EnvelopeIcon className="h-4 w-4 mr-2" />
                            {supplier.email}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <PhoneIcon className="h-4 w-4 mr-2" />
                            {supplier.phone}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.city}, {supplier.province}
                          </div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <WrenchScrewdriverIcon className="h-4 w-4 text-blue-400 mr-2" />
                            <span className="text-white text-sm">{supplier.category}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.subcategory}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.services_provided.length} services
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <div className="text-sm text-white">
                            {formatCurrency(supplier.hourly_rate)}/hour
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Min: {formatCurrency(supplier.min_call_out_fee)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Response: {supplier.response_time}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.total_services} jobs completed
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1">
                        {renderStatusBadge(supplier.status)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewSupplier(supplier.supplier_code)}
                            className="text-muted-foreground/70 hover:text-white"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditSupplier(supplier.supplier_code)}
                            className="text-muted-foreground/70 hover:text-blue-400"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(supplier.supplier_code)}
                            className="text-muted-foreground/70 hover:text-red-400"
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
          {totalCount} suppliers found.
        </div>
      </div>
    </DashboardLayout>
  );
} 