/**
 * Add Landlord Form Page
 * Comprehensive form for adding new landlords with support for individual and company types
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BuildingOfficeIcon,
  UserIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Form data interface
interface LandlordFormData {
  name: string;
  email: string;
  phone: string;
  type: 'Individual' | 'Company' | 'Trust';
  company_name: string;
  vat_number: string;
  id_number: string;
  tax_number: string;
  street_address: string;
  address_line_2: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_type: string;
  notes: string;
}

// Form validation errors
interface FormErrors {
  [key: string]: string;
}

// South African provinces
const SA_PROVINCES = [
  { value: 'western_cape', label: 'Western Cape' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu_natal', label: 'KwaZulu-Natal' },
  { value: 'eastern_cape', label: 'Eastern Cape' },
  { value: 'free_state', label: 'Free State' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'north_west', label: 'North West' },
  { value: 'northern_cape', label: 'Northern Cape' },
];

// Account types
const ACCOUNT_TYPES = [
  { value: 'current', label: 'Current' },
  { value: 'savings', label: 'Savings' },
  { value: 'transmission', label: 'Transmission' },
];

// Major SA banks
const SA_BANKS = [
  'Standard Bank',
  'First National Bank (FNB)',
  'ABSA Bank',
  'Nedbank',
  'Capitec Bank',
  'African Bank',
  'Investec',
  'TymeBank',
  'Discovery Bank',
  'Bidvest Bank',
  'Other',
];

export default function AddLandlordPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<LandlordFormData>({
    name: '',
    email: '',
    phone: '',
    type: 'Individual',
    company_name: '',
    vat_number: '',
    id_number: '',
    tax_number: '',
    street_address: '',
    address_line_2: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    bank_name: '',
    account_number: '',
    branch_code: '',
    account_type: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle landlord type change
  const handleTypeChange = (type: 'Individual' | 'Company' | 'Trust') => {
    setFormData(prev => ({
      ...prev,
      type,
      // Clear company-specific fields if switching to individual
      company_name: type === 'Individual' ? '' : prev.company_name,
      vat_number: type === 'Individual' ? '' : prev.vat_number,
    }));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    // Company-specific validation
    if (formData.type === 'Company') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = 'Company name is required';
      }

      if (formData.vat_number.trim() && !/^\d{10}$/.test(formData.vat_number.replace(/\s/g, ''))) {
        newErrors.vat_number = 'VAT number must be 10 digits';
      }
    }

    // Individual-specific validation
    if (formData.type === 'Individual') {
      if (formData.id_number.trim() && !/^\d{13}$/.test(formData.id_number.replace(/\s/g, ''))) {
        newErrors.id_number = 'ID number must be 13 digits';
      }
    }

    // Bank details validation (if any bank field is filled)
    const bankFieldsFilled = formData.bank_name || formData.account_number || formData.branch_code || formData.account_type;
    if (bankFieldsFilled) {
      if (!formData.bank_name.trim()) {
        newErrors.bank_name = 'Bank name is required';
      }
      if (!formData.account_number.trim()) {
        newErrors.account_number = 'Account number is required';
      }
      if (!formData.branch_code.trim()) {
        newErrors.branch_code = 'Branch code is required';
      }
      if (!formData.account_type.trim()) {
        newErrors.account_type = 'Account type is required';
      }
    }

    // Postal code validation
    if (formData.postal_code.trim() && !/^\d{4}$/.test(formData.postal_code.trim())) {
      newErrors.postal_code = 'Postal code must be 4 digits';
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
      
      // Generate mock landlord code
      const landlordCode = `LAN${(Math.floor(Math.random() * 999999) + 1).toString().padStart(6, '0')}`;
      
      toast.success(`Landlord ${landlordCode} created successfully!`);
      
      // Check if we should return to lease form
      const returnToLeaseForm = sessionStorage.getItem('returnToLeaseForm');
      
      if (returnToLeaseForm === 'true') {
        // Clear the flag and navigate back to lease form
        sessionStorage.removeItem('returnToLeaseForm');
        router.push('/dashboard/leases/add');
      } else {
        // Navigate back to landlords list
        router.push('/dashboard/landlord');
      }
    } catch (error) {
      console.error('Error creating landlord:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create landlord');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/landlord');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Add Landlord" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Add Landlord" 
      subtitle="Create a new landlord profile"
    >
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Landlords
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Landlord Type Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Landlord Type</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Individual */}
              <button
                type="button"
                onClick={() => handleTypeChange('Individual')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'Individual'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <UserIcon className="h-8 w-8 text-blue-400" />
                  <span className="text-white font-medium">Individual</span>
                  <span className="text-sm text-gray-300">Private person</span>
                </div>
              </button>

              {/* Company */}
              <button
                type="button"
                onClick={() => handleTypeChange('Company')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'Company'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <BuildingOfficeIcon className="h-8 w-8 text-green-400" />
                  <span className="text-white font-medium">Company</span>
                  <span className="text-sm text-gray-300">Business entity</span>
                </div>
              </button>

              {/* Trust */}
              <button
                type="button"
                onClick={() => handleTypeChange('Trust')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'Trust'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />
                  <span className="text-white font-medium">Trust</span>
                  <span className="text-sm text-gray-300">Trust fund</span>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">
              {formData.type === 'Individual' ? 'Personal Information' : 'Company Information'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {formData.type === 'Individual' ? 'Full Name' : 'Contact Person Name'} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Company Name (only for Company/Trust) */}
              {(formData.type === 'Company' || formData.type === 'Trust') && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {formData.type === 'Company' ? 'Company Name' : 'Trust Name'} *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.company_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={`Enter ${formData.type.toLowerCase()} name`}
                  />
                  {errors.company_name && <p className="mt-1 text-sm text-red-400">{errors.company_name}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+27 82 123 4567"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
              </div>

              {/* ID Number (Individual only) */}
              {formData.type === 'Individual' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    ID Number
                  </label>
                  <input
                    type="text"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.id_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234567890123"
                  />
                  {errors.id_number && <p className="mt-1 text-sm text-red-400">{errors.id_number}</p>}
                </div>
              )}

              {/* VAT Number (Company only) */}
              {formData.type === 'Company' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    name="vat_number"
                    value={formData.vat_number}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.vat_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="4123456789"
                  />
                  {errors.vat_number && <p className="mt-1 text-sm text-red-400">{errors.vat_number}</p>}
                </div>
              )}

              {/* Tax Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tax Number
                </label>
                <input
                  type="text"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tax number"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Address Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line_2"
                  value={formData.address_line_2}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Apartment, suite, etc."
                />
              </div>

              {/* Suburb */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Suburb
                </label>
                <input
                  type="text"
                  name="suburb"
                  value={formData.suburb}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Suburb"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Province
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Province</option>
                  {SA_PROVINCES.map(province => (
                    <option key={province.value} value={province.value}>
                      {province.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.postal_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="7700"
                />
                {errors.postal_code && <p className="mt-1 text-sm text-red-400">{errors.postal_code}</p>}
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Banking Information</h3>
            <p className="text-sm text-gray-300 mb-4">
              Optional: Add bank details for payment processing
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Bank Name
                </label>
                <select
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.bank_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Bank</option>
                  {SA_BANKS.map(bank => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                {errors.bank_name && <p className="mt-1 text-sm text-red-400">{errors.bank_name}</p>}
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Account Type
                </label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.account_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Account Type</option>
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.account_type && <p className="mt-1 text-sm text-red-400">{errors.account_type}</p>}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.account_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1234567890"
                />
                {errors.account_number && <p className="mt-1 text-sm text-red-400">{errors.account_number}</p>}
              </div>

              {/* Branch Code */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Branch Code
                </label>
                <input
                  type="text"
                  name="branch_code"
                  value={formData.branch_code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.branch_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123456"
                />
                {errors.branch_code && <p className="mt-1 text-sm text-red-400">{errors.branch_code}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Additional Notes</h3>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes about this landlord..."
              />
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
              {loading ? 'Creating...' : 'Create Landlord'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 