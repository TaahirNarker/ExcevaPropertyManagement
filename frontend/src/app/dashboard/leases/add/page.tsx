/**
 * Add Lease Form Page
 * Comprehensive form for creating new lease agreements
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
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
  late_fee_percentage: string;
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

// Mock data for dropdowns
const mockProperties = [
  { id: '1', name: 'Sunset Apartment 2A', code: 'PRO000001', address: '123 Main St, Cape Town' },
  { id: '2', name: 'Garden Villa 15', code: 'PRO000002', address: '456 Oak Ave, Stellenbosch' },
  { id: '3', name: 'City Loft 8B', code: 'PRO000003', address: '789 High St, Durban' },
  { id: '4', name: 'Beachfront Condo 12', code: 'PRO000004', address: '321 Beach Rd, Port Elizabeth' },
];

const mockTenants = [
  { id: '1', name: 'John Smith', code: 'TEN000001', email: 'john.smith@email.com' },
  { id: '2', name: 'Michael Chen', code: 'TEN000002', email: 'michael.chen@email.com' },
  { id: '3', name: 'Lisa Anderson', code: 'TEN000003', email: 'lisa.anderson@email.com' },
  { id: '4', name: 'Robert Wilson', code: 'TEN000004', email: 'robert.wilson@email.com' },
];

const mockLandlords = [
  { id: '1', name: 'Sarah Johnson', code: 'LAN000001', email: 'sarah@propertyholdings.co.za' },
  { id: '2', name: 'Emma Williams', code: 'LAN000002', email: 'emma@realestate.co.za' },
  { id: '3', name: 'David Thompson', code: 'LAN000003', email: 'david.t@investments.com' },
  { id: '4', name: 'Michael Brown', code: 'LAN000004', email: 'michael.brown@email.com' },
];

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
    late_fee_percentage: '10',
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
      } catch (error) {
        console.error('Error restoring form data:', error);
      }
    }
  }, []);

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

    // Percentage validation
    if (formData.late_fee_percentage && (parseFloat(formData.late_fee_percentage) < 0 || parseFloat(formData.late_fee_percentage) > 100)) {
      newErrors.late_fee_percentage = 'Late fee percentage must be between 0 and 100';
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
      // Mock API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock lease code
      const leaseCode = `LSE${(Math.floor(Math.random() * 999999) + 1).toString().padStart(6, '0')}`;
      
      toast.success(`Lease ${leaseCode} created successfully!`);
      
      // Navigate back to leases list
      router.push('/dashboard/leases');
    } catch (error) {
      console.error('Error creating lease:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create lease');
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
      <DashboardLayout title="Add Lease" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Add Lease" 
      subtitle="Create a new lease agreement"
    >
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property, Tenant, Landlord Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Lease Parties</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Property */}
              <div>
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
                <select
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.property_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Property</option>
                  {mockProperties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name} ({property.code})
                    </option>
                  ))}
                </select>
                {errors.property_id && <p className="mt-1 text-sm text-red-400">{errors.property_id}</p>}
              </div>

              {/* Tenant */}
              <div>
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
                <select
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.tenant_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Tenant</option>
                  {mockTenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.code})
                    </option>
                  ))}
                </select>
                {errors.tenant_id && <p className="mt-1 text-sm text-red-400">{errors.tenant_id}</p>}
              </div>

              {/* Landlord */}
              <div>
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
                <select
                  name="landlord_id"
                  value={formData.landlord_id}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.landlord_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Landlord</option>
                  {mockLandlords.map(landlord => (
                    <option key={landlord.id} value={landlord.id}>
                      {landlord.name} ({landlord.code})
                    </option>
                  ))}
                </select>
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
                  Late Fee (%)
                </label>
                <input
                  type="number"
                  name="late_fee_percentage"
                  value={formData.late_fee_percentage}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.late_fee_percentage ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.late_fee_percentage && <p className="mt-1 text-sm text-red-400">{errors.late_fee_percentage}</p>}
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
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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