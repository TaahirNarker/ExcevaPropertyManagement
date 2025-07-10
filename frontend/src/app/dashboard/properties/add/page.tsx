/**
 * Add Property Page
 * Comprehensive property creation form matching the provided design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPinIcon,
  PlusIcon,
  MinusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesAPI } from '@/lib/properties-api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Property form interface
interface PropertyFormData {
  name: string;
  street_address: string;
  address_line_2: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  property_type: string;
  bedrooms: number;
  square_meters: number;
  description: string;
}

// Form options - matching backend model choices
const PROVINCES = [
  { value: '', label: '--Province--' },
  { value: 'western_cape', label: 'Western Cape' },
  { value: 'eastern_cape', label: 'Eastern Cape' },
  { value: 'northern_cape', label: 'Northern Cape' },
  { value: 'free_state', label: 'Free State' },
  { value: 'kwazulu_natal', label: 'KwaZulu-Natal' },
  { value: 'north_west', label: 'North West' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'limpopo', label: 'Limpopo' },
];

const PROPERTY_TYPES = [
  { value: '', label: '-- Select a property type --' },
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'business', label: 'Business' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

export default function AddPropertyPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    street_address: '',
    address_line_2: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    property_type: '',
    bedrooms: 0,
    square_meters: 0,
    description: '',
  });

  const [loading, setLoading] = useState(false);

  // Initialize component
  useEffect(() => {
    // Component initialization if needed
  }, [isAuthenticated]);

  // Handle form input changes
  const handleInputChange = (field: keyof PropertyFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle number input changes with increment/decrement
  const handleNumberChange = (field: keyof PropertyFormData, increment: boolean) => {
    const currentValue = formData[field] as number;
    const newValue = increment ? currentValue + 1 : Math.max(0, currentValue - 1);
    handleInputChange(field, newValue);
  };

  // Removed map functionality for now

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Property name is required');
      return;
    }
    
    if (!formData.street_address.trim()) {
      toast.error('Property address is required');
      return;
    }
    
    if (!formData.city.trim()) {
      toast.error('City is required');
      return;
    }
    
    if (!formData.province) {
      toast.error('Province is required');
      return;
    }
    
    if (!formData.property_type) {
      toast.error('Please select a property type');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare API data (convert form data to backend format)
      const apiData = {
        name: formData.name,
        street_address: formData.street_address,
        suburb: formData.suburb || undefined,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code || undefined,
        property_type: formData.property_type,
        bedrooms: formData.bedrooms || undefined,
        square_meters: formData.square_meters || undefined,
        description: formData.description || undefined,
        status: 'vacant', // Default status
      };

      const newProperty = await propertiesAPI.createProperty(apiData);
      console.log('Created property:', newProperty); // Debug log
      
      // Show success message with property code
      if (newProperty.property_code) {
        toast.success(`Property ${newProperty.property_code} created successfully!`);
      } else {
        toast.success('Property created successfully!');
      }
      
      // Check if we should return to lease form
      const returnToLeaseForm = sessionStorage.getItem('returnToLeaseForm');
      
      if (returnToLeaseForm === 'true') {
        // Clear the flag and navigate back to lease form
        sessionStorage.removeItem('returnToLeaseForm');
        router.push('/dashboard/leases/add');
      } else {
        // Navigate back to properties list
        router.push('/dashboard/properties');
      }
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/properties');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Add Property" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Property" subtitle="Create a new property in your portfolio">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
          {/* Property Name */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Property name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Property name (Max 40 characters)"
                  maxLength={40}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Description (Optional):
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Property description"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Property Address & Map */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Address Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Property address:</h3>
                
                <div className="relative">
                  <input
                    type="text"
                    value={formData.street_address}
                    onChange={(e) => handleInputChange('street_address', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Building No. & Name / Street No. & Name"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <input
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) => handleInputChange('address_line_2', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Address line 2 (Optional)"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.suburb}
                      onChange={(e) => handleInputChange('suburb', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Suburb"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={formData.province}
                    onChange={(e) => handleInputChange('province', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PROVINCES.map(province => (
                      <option key={province.value} value={province.value}>
                        {province.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Postal Code"
                  />
                </div>

              </div>

              {/* Map Placeholder */}
              <div className="space-y-4">
                <div className="bg-gray-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <div className="w-full h-full bg-gradient-to-br from-blue-200 to-blue-300 relative flex items-center justify-center">
                    <div className="text-center">
                      <MapPinIcon className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-gray-700 font-medium">Map Integration</p>
                      <p className="text-gray-500 text-sm">Location selection coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Options (Optional) */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="space-y-6">
              <div className="text-center text-gray-300">
                <p className="text-sm">Additional property management features</p>
                <p className="text-xs mt-1">Landlord and bank account management can be configured after property creation</p>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Property type
                </label>
                <select
                  value={formData.property_type}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Bedrooms
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumberChange('bedrooms', false)}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('bedrooms', true)}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Building Size */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Building size (m²)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.square_meters}
                    onChange={(e) => handleInputChange('square_meters', parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumberChange('square_meters', false)}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('square_meters', true)}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Property'}
              </button>
            </div>
          </div>
        </form>


      </div>
    </DashboardLayout>
  );
} 