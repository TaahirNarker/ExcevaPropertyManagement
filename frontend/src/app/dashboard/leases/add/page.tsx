/**
 * Add Lease Form Page
 * Comprehensive form for creating new lease agreements
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { propertyAPI, landlordApi, tenantApi } from '@/lib/api';
import { LeaseAPI } from '@/lib/lease-api';
import toast from 'react-hot-toast';

// Form data interface
interface LeaseFormData {
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  lease_type: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  deposit: string;
  rental_frequency: string;
  rent_due_day: string;
  late_fee_type: 'percentage' | 'amount';
  late_fee_percentage: string;
  late_fee_amount: string;
  grace_period_days: string;
  lease_duration_months: string;
  auto_renew: boolean;
  notice_period_days: string;
  pro_rata_amount: string;
  invoice_date: string;
  management_fee: string;
  procurement_fee: string;
  notes: string;
}

// Form validation errors
interface FormErrors {
  [key: string]: string;
}

// Interfaces for real data
interface Property {
  id: string;
  property_code: string;
  name: string;
  display_name: string;
  full_address: string;
  status: string;
  status_display: string;
  is_active: boolean;
}

interface Tenant {
  id: string;
  tenant_code: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  property_name?: string;
  created_at: string;
}

interface Landlord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type?: string;
  company_name?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

const LEASE_TYPES = [
  { value: 'Fixed', label: 'Fixed Term' },
  { value: 'Month-to-Month', label: 'Month-to-Month' },
  { value: 'Periodic', label: 'Periodic' },
];

const RENTAL_FREQUENCIES = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Annual', label: 'Annual' },
];



export default function AddLeasePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const leaseAPI = new LeaseAPI();
  
  // Form state
  const [formData, setFormData] = useState<LeaseFormData>({
    property_id: '',
    tenant_id: '',
    landlord_id: '',
    lease_type: 'Fixed',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    deposit: '',
    rental_frequency: 'Monthly',
    rent_due_day: '1',
    late_fee_type: 'percentage',
    late_fee_percentage: '10',
    late_fee_amount: '',
    grace_period_days: '5',
    lease_duration_months: '12',
    auto_renew: false,
    notice_period_days: '30',
    pro_rata_amount: '',
    invoice_date: '',
    management_fee: '',
    procurement_fee: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'property' | 'tenant' | 'landlord' | null>(null);
  
  // Real data state
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [propertiesWithActiveLeases, setPropertiesWithActiveLeases] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(false);
  
  // Autocomplete state
  const [propertySearch, setPropertySearch] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [landlordSearch, setLandlordSearch] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showLandlordDropdown, setShowLandlordDropdown] = useState(false);

  // Fetch real data for dropdowns
  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch properties
      const propertiesData = await propertyAPI.list({ page_size: 100 });
      setProperties(propertiesData.results || propertiesData);
      
      // Fetch tenants using the list method
              const tenantsData = await tenantApi.list({ page_size: 100 });
      setTenants(tenantsData.results || tenantsData || []);
      
      // Fetch landlords
      const landlordsData = await landlordApi.getLandlords();
      setLandlords(landlordsData);
      
      // Fetch all leases to identify properties with active leases
      try {
        const allLeases = await leaseAPI.getLeases({ page_size: 1000 });
        const activeLeasePropertyIds = new Set<string>();
        
        allLeases.results.forEach(lease => {
          if (lease.status === 'active' || lease.status === 'pending') {
            activeLeasePropertyIds.add(lease.property.id);
          }
        });
        
        setPropertiesWithActiveLeases(activeLeasePropertyIds);
      } catch (leaseError) {
        console.error('Error fetching leases for property filtering:', leaseError);
        // Don't show error to user, just log it
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load some data. Please refresh the page.');
    } finally {
      setLoadingData(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.autocomplete-container')) {
        setShowPropertyDropdown(false);
        setShowTenantDropdown(false);
        setShowLandlordDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Restore form data when returning from creating a new entity
  useEffect(() => {
    const returnToLeaseForm = sessionStorage.getItem('returnToLeaseForm');
    const savedFormData = sessionStorage.getItem('leaseFormData');
    
    if (returnToLeaseForm === 'true' && savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(prev => ({ ...prev, ...parsedData }));
        
        // Clear the session storage
        sessionStorage.removeItem('returnToLeaseForm');
        sessionStorage.removeItem('leaseFormData');
        
        toast.success('Form data restored. You can now select the newly created entity.');
        
        // Refresh data to include newly created entities
        fetchData();
      } catch (error) {
        console.error('Error restoring form data:', error);
      }
    }
  }, []);

  // Filter functions for autocomplete
  const filteredProperties = properties.filter(property =>
    // Filter by search term
    (property.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
     property.property_code.toLowerCase().includes(propertySearch.toLowerCase())) &&
    // Exclude properties with active leases
    !propertiesWithActiveLeases.has(property.id)
  );

  const filteredTenants = tenants.filter(tenant =>
    tenant.full_name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    tenant.email.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const filteredLandlords = landlords.filter(landlord =>
    landlord.name.toLowerCase().includes(landlordSearch.toLowerCase()) ||
    landlord.email.toLowerCase().includes(landlordSearch.toLowerCase())
  );

  // Selection handlers
  const handlePropertySelect = (property: Property) => {
    setFormData(prev => ({ ...prev, property_id: property.id }));
    setPropertySearch(property.name);
    setShowPropertyDropdown(false);
  };

  const handleTenantSelect = (tenant: Tenant) => {
    setFormData(prev => ({ ...prev, tenant_id: tenant.id }));
    setTenantSearch(tenant.full_name);
    setShowTenantDropdown(false);
  };

  const handleLandlordSelect = (landlord: Landlord) => {
    setFormData(prev => ({ ...prev, landlord_id: landlord.id }));
    setLandlordSearch(landlord.name);
    setShowLandlordDropdown(false);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };



  // Handle lease duration change and auto-calculate end date
  const handleLeaseDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const months = parseInt(e.target.value) || 0;
    setFormData(prev => {
      const newData = { ...prev, lease_duration_months: e.target.value };
      
      // Auto-calculate end date if start date is set
      if (prev.start_date && months > 0) {
        const startDate = new Date(prev.start_date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        endDate.setDate(endDate.getDate() - 1); // End one day before the anniversary
        newData.end_date = endDate.toISOString().split('T')[0];
      }
      
      return newData;
    });
  };

  // Handle start date change and auto-calculate end date
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    setFormData(prev => {
      const newData = { ...prev, start_date: startDate };
      
      // Auto-calculate end date if lease duration is set
      if (startDate && prev.lease_duration_months) {
        const months = parseInt(prev.lease_duration_months);
        if (months > 0) {
          const start = new Date(startDate);
          const end = new Date(start);
          end.setMonth(end.getMonth() + months);
          end.setDate(end.getDate() - 1); // End one day before the anniversary
          newData.end_date = end.toISOString().split('T')[0];
        }
      }
      
      return newData;
    });
  };

  // Auto-calculate deposit based on monthly rent
  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rent = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      monthly_rent: e.target.value,
      deposit: prev.deposit || (rent * 2).toString(), // Default to 2x monthly rent
    }));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.property_id) {
      newErrors.property_id = 'Property is required';
    }
    if (!formData.tenant_id) {
      newErrors.tenant_id = 'Tenant is required';
    }
    if (!formData.landlord_id) {
      newErrors.landlord_id = 'Landlord is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (!formData.monthly_rent) {
      newErrors.monthly_rent = 'Monthly rent is required';
    }
    if (!formData.deposit) {
      newErrors.deposit = 'Deposit is required';
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Amount validation
    if (formData.monthly_rent && parseFloat(formData.monthly_rent) <= 0) {
      newErrors.monthly_rent = 'Monthly rent must be greater than 0';
    }
    if (formData.deposit && parseFloat(formData.deposit) < 0) {
      newErrors.deposit = 'Deposit cannot be negative';
    }

    // Late fee validation
    if (formData.late_fee_type === 'percentage') {
      if (formData.late_fee_percentage && (parseFloat(formData.late_fee_percentage) < 0 || parseFloat(formData.late_fee_percentage) > 100)) {
        newErrors.late_fee_percentage = 'Late fee percentage must be between 0 and 100';
      }
    } else if (formData.late_fee_type === 'amount') {
      if (formData.late_fee_amount && parseFloat(formData.late_fee_amount) < 0) {
        newErrors.late_fee_amount = 'Late fee amount cannot be negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Prepare lease data for API with proper value handling
      const leaseData = {
        property: formData.property_id,
        tenant: formData.tenant_id,
        landlord: formData.landlord_id || null,
        lease_type: formData.lease_type || 'Fixed',
        start_date: formData.start_date,
        end_date: formData.end_date,
        monthly_rent: parseFloat(formData.monthly_rent),
        deposit_amount: parseFloat(formData.deposit),
        rental_frequency: formData.rental_frequency || 'Monthly',
        rent_due_day: formData.rent_due_day ? parseInt(formData.rent_due_day) : 1,
        late_fee_percentage: formData.late_fee_type === 'percentage' ? (formData.late_fee_percentage ? parseFloat(formData.late_fee_percentage) : 0.00) : 0.00,
        late_fee_amount: formData.late_fee_type === 'amount' ? (formData.late_fee_amount ? parseFloat(formData.late_fee_amount) : 0.00) : 0.00,
        grace_period_days: formData.grace_period_days ? parseInt(formData.grace_period_days) : 0,
        lease_duration_months: formData.lease_duration_months ? parseInt(formData.lease_duration_months) : null,
        auto_renew: formData.auto_renew || false,
        notice_period_days: formData.notice_period_days ? parseInt(formData.notice_period_days) : 30,
        pro_rata_amount: formData.pro_rata_amount ? parseFloat(formData.pro_rata_amount) : 0.00,
        invoice_date: formData.invoice_date || null,
        management_fee: formData.management_fee ? parseFloat(formData.management_fee) : 0.00,
        procurement_fee: formData.procurement_fee ? parseFloat(formData.procurement_fee) : 0.00,
        terms: formData.notes || '',
        notes: formData.notes || '',
        status: 'active'
      };

      console.log('Creating lease with data:', leaseData);
      
      // Call the real API
      const createdLease = await leaseAPI.createLease(leaseData);
      
      console.log('Lease created successfully:', createdLease);
      toast.success(`Lease created successfully!`);
      
      // Navigate back to leases list
      router.push('/dashboard/leases');
    } catch (error) {
      console.error('Error creating lease:', error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Try to get more details from the error response
      if (error && typeof error === 'object' && 'response' in error) {
        try {
          const errorResponse = await (error as any).response?.json();
          console.error('Error response details:', errorResponse);
          toast.error(errorResponse?.detail || errorResponse?.message || error.message || 'Failed to create lease');
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          toast.error(error instanceof Error ? error.message : 'Failed to create lease');
        }
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to create lease');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle quick add actions
  const handleQuickAdd = (type: 'property' | 'tenant' | 'landlord') => {
    // Store current form data in sessionStorage
    sessionStorage.setItem('leaseFormData', JSON.stringify(formData));
    sessionStorage.setItem('returnToLeaseForm', 'true');
    
    // Navigate to the appropriate add page
    switch (type) {
      case 'property':
        router.push('/dashboard/properties/add');
        break;
      case 'tenant':
        router.push('/dashboard/tenants/add');
        break;
      case 'landlord':
        router.push('/dashboard/landlord/add');
        break;
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/leases');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Add Lease">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Lease">
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Leases
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" style={{ position: 'relative', zIndex: 1 }}>
          {/* Property, Tenant, Landlord Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6" style={{ position: 'relative', zIndex: 10 }}>
            <h3 className="text-lg font-medium text-white mb-4">Lease Parties</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ position: 'relative', zIndex: 20 }}>
              {/* Property */}
              <div style={{ position: 'relative', zIndex: 30 }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white">
                    Property *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('property')}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-400 hover:border-blue-300 rounded-md transition-colors"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add Property
                  </button>
                </div>
                <div className="relative autocomplete-container" style={{ position: 'relative', zIndex: 1000 }}>
                  <div className="relative">
                    <input
                      type="text"
                      value={propertySearch}
                      onChange={(e) => {
                        setPropertySearch(e.target.value);
                        setShowPropertyDropdown(true);
                      }}
                      onFocus={() => setShowPropertyDropdown(true)}
                      placeholder={loadingData ? 'Loading properties...' : 'Search properties...'}
                      disabled={loadingData}
                      className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.property_id ? 'border-red-500' : 'border-white/20'
                      } disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 backdrop-blur-sm text-white placeholder-gray-300`}
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-300" />
                  </div>
                  
                  {showPropertyDropdown && filteredProperties.length > 0 && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl max-h-60 overflow-auto">
                      {filteredProperties.map(property => (
                        <div
                          key={property.id}
                          onClick={() => handlePropertySelect(property)}
                          className="px-4 py-2 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-white">{property.name}</div>
                          <div className="text-sm text-gray-300">{property.property_code}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showPropertyDropdown && filteredProperties.length === 0 && !propertySearch && properties.length > 0 && propertiesWithActiveLeases.size > 0 && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl">
                      <div className="px-4 py-2 text-gray-300">
                        All properties currently have active leases. Please terminate existing leases before creating new ones.
                      </div>
                    </div>
                  )}
                  
                  {showPropertyDropdown && filteredProperties.length === 0 && propertySearch && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl">
                      <div className="px-4 py-2 text-gray-300">
                        {propertiesWithActiveLeases.size > 0 && properties.length > 0 
                          ? 'All available properties already have active leases. Please terminate existing leases first.'
                          : 'No properties found'
                        }
                      </div>
                    </div>
                  )}
                </div>
                {errors.property_id && <p className="mt-1 text-sm text-red-400">{errors.property_id}</p>}
              </div>

              {/* Tenant */}
              <div style={{ position: 'relative', zIndex: 30 }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white">
                    Tenant *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('tenant')}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-400 hover:text-green-300 border border-green-400 hover:border-green-300 rounded-md transition-colors"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add Tenant
                  </button>
                </div>
                <div className="relative autocomplete-container" style={{ position: 'relative', zIndex: 1000 }}>
                  <div className="relative">
                    <input
                      type="text"
                      value={tenantSearch}
                      onChange={(e) => {
                        setTenantSearch(e.target.value);
                        setShowTenantDropdown(true);
                      }}
                      onFocus={() => setShowTenantDropdown(true)}
                      placeholder={loadingData ? 'Loading tenants...' : 'Search tenants...'}
                      disabled={loadingData}
                      className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.tenant_id ? 'border-red-500' : 'border-white/20'
                      } disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 backdrop-blur-sm text-white placeholder-gray-300`}
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-300" />
                  </div>
                  
                  {showTenantDropdown && filteredTenants.length > 0 && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl max-h-60 overflow-auto">
                      {filteredTenants.map(tenant => (
                        <div
                          key={tenant.id}
                          onClick={() => handleTenantSelect(tenant)}
                          className="px-4 py-2 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-white">{tenant.full_name}</div>
                          <div className="text-sm text-gray-300">{tenant.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showTenantDropdown && filteredTenants.length === 0 && tenantSearch && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl">
                      <div className="px-4 py-2 text-gray-300">No tenants found</div>
                    </div>
                  )}
                </div>
                {errors.tenant_id && <p className="mt-1 text-sm text-red-400">{errors.tenant_id}</p>}
              </div>

              {/* Landlord */}
              <div style={{ position: 'relative', zIndex: 30 }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white">
                    Landlord *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd('landlord')}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 border border-purple-400 hover:border-purple-300 rounded-md transition-colors"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add Landlord
                  </button>
                </div>
                <div className="relative autocomplete-container" style={{ position: 'relative', zIndex: 1000 }}>
                  <div className="relative">
                    <input
                      type="text"
                      value={landlordSearch}
                      onChange={(e) => {
                        setLandlordSearch(e.target.value);
                        setShowLandlordDropdown(true);
                      }}
                      onFocus={() => setShowLandlordDropdown(true)}
                      placeholder={loadingData ? 'Loading landlords...' : 'Search landlords...'}
                      disabled={loadingData}
                      className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.landlord_id ? 'border-red-500' : 'border-white/20'
                      } disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 backdrop-blur-sm text-white placeholder-gray-300`}
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-300" />
                  </div>
                  
                  {showLandlordDropdown && filteredLandlords.length > 0 && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl max-h-60 overflow-auto">
                      {filteredLandlords.map(landlord => (
                        <div
                          key={landlord.id}
                          onClick={() => handleLandlordSelect(landlord)}
                          className="px-4 py-2 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-white">{landlord.name}</div>
                          <div className="text-sm text-gray-300">{landlord.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showLandlordDropdown && filteredLandlords.length === 0 && landlordSearch && (
                    <div className="autocomplete-dropdown w-full mt-1 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-md shadow-xl">
                      <div className="px-4 py-2 text-gray-300">No landlords found</div>
                    </div>
                  )}
                </div>
                {errors.landlord_id && <p className="mt-1 text-sm text-red-400">{errors.landlord_id}</p>}
              </div>
            </div>
          </div>

          {/* Lease Terms */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Lease Terms</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lease Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Lease Type *
                </label>
                <select
                  name="lease_type"
                  value={formData.lease_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LEASE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lease Duration */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Lease Duration (Months) *
                </label>
                <input
                  type="number"
                  name="lease_duration_months"
                  value={formData.lease_duration_months}
                  onChange={handleLeaseDurationChange}
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleStartDateChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.start_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.start_date && <p className="mt-1 text-sm text-red-400">{errors.start_date}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.end_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.end_date && <p className="mt-1 text-sm text-red-400">{errors.end_date}</p>}
              </div>

              {/* Auto Renew */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="auto_renew"
                    checked={formData.auto_renew}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-white">Auto-renew lease</span>
                </label>
              </div>

              {/* Notice Period */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notice Period (Days)
                </label>
                <input
                  type="number"
                  name="notice_period_days"
                  value={formData.notice_period_days}
                  onChange={handleInputChange}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Financial Terms</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Rent */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Monthly Rent (ZAR) *
                </label>
                <input
                  type="number"
                  name="monthly_rent"
                  value={formData.monthly_rent}
                  onChange={handleRentChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.monthly_rent ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.monthly_rent && <p className="mt-1 text-sm text-red-400">{errors.monthly_rent}</p>}
              </div>

              {/* Deposit */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Deposit (ZAR) *
                </label>
                <input
                  type="number"
                  name="deposit"
                  value={formData.deposit}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.deposit ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.deposit && <p className="mt-1 text-sm text-red-400">{errors.deposit}</p>}
              </div>

              {/* Rental Frequency */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Rental Frequency
                </label>
                <select
                  name="rental_frequency"
                  value={formData.rental_frequency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RENTAL_FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rent Due Day */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Rent Due Day (of month)
                </label>
                <input
                  type="number"
                  name="rent_due_day"
                  value={formData.rent_due_day}
                  onChange={handleInputChange}
                  min="1"
                  max="31"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Late Fee */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Late Fee Type
                </label>
                <select
                  name="late_fee_type"
                  value={formData.late_fee_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="percentage">Percentage of Rent</option>
                  <option value="amount">Fixed Amount (ZAR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {formData.late_fee_type === 'percentage' ? 'Late Fee (%)' : 'Late Fee Amount (ZAR)'}
                </label>
                <input
                  type="number"
                  name={formData.late_fee_type === 'percentage' ? 'late_fee_percentage' : 'late_fee_amount'}
                  value={formData.late_fee_type === 'percentage' ? formData.late_fee_percentage : formData.late_fee_amount}
                  onChange={handleInputChange}
                  step={formData.late_fee_type === 'percentage' ? '0.1' : '0.01'}
                  min="0"
                  max={formData.late_fee_type === 'percentage' ? '100' : undefined}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    (formData.late_fee_type === 'percentage' && errors.late_fee_percentage) || 
                    (formData.late_fee_type === 'amount' && errors.late_fee_amount) 
                      ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={formData.late_fee_type === 'percentage' ? '10' : '0.00'}
                />
                {(formData.late_fee_type === 'percentage' && errors.late_fee_percentage) && (
                  <p className="mt-1 text-sm text-red-400">{errors.late_fee_percentage}</p>
                )}
                {(formData.late_fee_type === 'amount' && errors.late_fee_amount) && (
                  <p className="mt-1 text-sm text-red-400">{errors.late_fee_amount}</p>
                )}
              </div>

              {/* Grace Period */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  name="grace_period_days"
                  value={formData.grace_period_days}
                  onChange={handleInputChange}
                  min="0"
                  max="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Financial Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pro-rata Amount */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Pro-rata Amount (ZAR)
                </label>
                <input
                  type="number"
                  name="pro_rata_amount"
                  value={formData.pro_rata_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Management Fee */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Management Fee (ZAR)
                </label>
                <input
                  type="number"
                  name="management_fee"
                  value={formData.management_fee}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Procurement Fee */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Procurement Fee (ZAR)
                </label>
                <input
                  type="number"
                  name="procurement_fee"
                  value={formData.procurement_fee}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Additional Information</h3>
            
            <div className="space-y-4">
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional notes about this lease..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-foreground bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Lease'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 