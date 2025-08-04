/**
 * Create Sub-Properties Page
 * Dedicated page for creating multiple sub-properties under a parent property
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon,
  MinusIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesAPI } from '@/lib/properties-api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Parent property interface
interface ParentProperty {
  id: string;
  property_code: string;
  name: string;
  property_type: string;
  full_address: string;
  street_address: string;
  suburb?: string;
  city: string;
  province: string;
  postal_code?: string;
}

// Bulk creation form interface
interface BulkCreateFormData {
  parent_property_id: string;
  base_name: string;
  count: number;
  start_number: number;
  prefix: string;
  suffix: string;
  property_type: string;
  description: string;
  square_meters: number;
}

// Form options
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

export default function CreateSubPropertiesPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<BulkCreateFormData>({
    parent_property_id: '',
    base_name: '',
    count: 1,
    start_number: 1,
    prefix: '',
    suffix: '',
    property_type: '',
    description: '',
    square_meters: 0,
  });

  const [loading, setLoading] = useState(false);
  const [parentProperties, setParentProperties] = useState<ParentProperty[]>([]);
  const [loadingParentProperties, setLoadingParentProperties] = useState(false);
  const [showParentPropertyDropdown, setShowParentPropertyDropdown] = useState(false);
  const [parentPropertySearch, setParentPropertySearch] = useState('');

  // Fetch parent properties (properties that can have sub-properties)
  const fetchParentProperties = async () => {
    try {
      setLoadingParentProperties(true);
      const data = await propertiesAPI.getProperties({ page_size: 100 });
      // Filter to only show properties that don't have a parent (can be parent properties)
      const potentialParents = data.results.filter((prop: any) => !prop.parent_property);
      console.log('Fetched parent properties:', potentialParents);
      setParentProperties(potentialParents);
    } catch (error) {
      console.error('Error fetching parent properties:', error);
      setParentProperties([]);
    } finally {
      setLoadingParentProperties(false);
    }
  };

  // Initialize component
  useEffect(() => {
    if (isAuthenticated) {
      fetchParentProperties();
    }
  }, [isAuthenticated]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.autocomplete-container')) {
        setShowParentPropertyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter parent properties based on search
  const filteredParentProperties = parentProperties.filter(property =>
    property.name.toLowerCase().includes(parentPropertySearch.toLowerCase()) ||
    property.property_code.toLowerCase().includes(parentPropertySearch.toLowerCase()) ||
    property.full_address.toLowerCase().includes(parentPropertySearch.toLowerCase())
  );

  // Handle parent property selection
  const handleParentPropertySelect = (property: ParentProperty) => {
    setFormData(prev => ({ ...prev, parent_property_id: property.id }));
    setParentPropertySearch(property.name);
    setShowParentPropertyDropdown(false);
  };

  // Handle form input changes
  const handleInputChange = (field: keyof BulkCreateFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle number input changes with increment/decrement
  const handleNumberChange = (field: keyof BulkCreateFormData, increment: boolean) => {
    const currentValue = formData[field] as number;
    const newValue = increment ? currentValue + 1 : Math.max(0, currentValue - 1);
    handleInputChange(field, newValue);
  };

  // Handle form submission - navigate to review screen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('You must be logged in to create properties');
      router.push('/auth/login');
      return;
    }
    
    // Validation
    if (!formData.parent_property_id) {
      toast.error('Parent property is required');
      return;
    }
    
    if (!formData.base_name.trim()) {
      toast.error('Base name is required');
      return;
    }
    
    if (formData.count < 1 || formData.count > 50) {
      toast.error('Count must be between 1 and 50');
      return;
    }

    if (!formData.property_type) {
      toast.error('Property type is required');
      return;
    }

        // Get the selected parent property to inherit address details
    const selectedParent = parentProperties.find(p => p.id === formData.parent_property_id);
    
    if (!selectedParent) {
      toast.error('Parent property not found');
      return;
    }
    
    // Fetch full parent property details to ensure we have all address fields
    let fullParentDetails;
    try {
      fullParentDetails = await propertiesAPI.getProperty(selectedParent.property_code);
      console.log('Full parent property details:', fullParentDetails);
    } catch (error) {
      console.error('Error fetching parent property details:', error);
      toast.error('Error fetching parent property details');
      return;
    }
    
    // Ensure we have all required fields
    if (!fullParentDetails.street_address || !fullParentDetails.city || !fullParentDetails.province) {
      toast.error('Parent property is missing required address information');
      return;
    }

    // Map province display value to choice value if needed
    const provinceMapping: { [key: string]: string } = {
      'Western Cape': 'western_cape',
      'Eastern Cape': 'eastern_cape',
      'Northern Cape': 'northern_cape',
      'Free State': 'free_state',
      'KwaZulu-Natal': 'kwazulu_natal',
      'North West': 'north_west',
      'Gauteng': 'gauteng',
      'Mpumalanga': 'mpumalanga',
      'Limpopo': 'limpopo'
    };

    const provinceValue = provinceMapping[fullParentDetails.province] || fullParentDetails.province;
    console.log('Province mapping:', { original: fullParentDetails.province, mapped: provinceValue });

    // Generate the sub-properties data for review
    const subPropertiesData = [];
    
    for (let i = 0; i < formData.count; i++) {
      const number = formData.start_number + i;
      const propertyName = `${formData.prefix}${formData.base_name} ${number}${formData.suffix}`.trim();
      
      subPropertiesData.push({
        name: propertyName,
        property_type: formData.property_type,
        description: formData.description,
        street_address: fullParentDetails.street_address,
        suburb: fullParentDetails.suburb || '',
        city: fullParentDetails.city,
        province: provinceValue, // Use mapped province value
        postal_code: fullParentDetails.postal_code || '',
        country: 'South Africa',
        bedrooms: 0, // Default value since bedrooms only apply to apartments
        bathrooms: 0,
        square_meters: formData.square_meters > 0 ? parseFloat(formData.square_meters.toString()) : undefined, // Only include if positive
        parking_spaces: 0,
        status: 'vacant',
        is_active: true,
        parent_property: formData.parent_property_id
      });
    }

    // Navigate to review screen with data
    const reviewData = {
      parentProperty: fullParentDetails,
      subProperties: subPropertiesData,
      formData: formData
    };
    
    console.log('Review data being stored:', reviewData);
    
    // Store in sessionStorage for the review page
    sessionStorage.setItem('subPropertiesReviewData', JSON.stringify(reviewData));
    router.push('/dashboard/properties/review-sub-properties');
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/properties');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Create Sub-Properties">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Create Sub-Properties">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Back button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Properties
            </button>
          </div>

          {/* Parent Property Selection */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Parent Property</h3>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Parent Property *
              </label>
              <div className="relative autocomplete-container" style={{ position: 'relative', zIndex: 1000 }}>
                <div className="relative">
                  <input
                    type="text"
                    value={parentPropertySearch}
                    onChange={(e) => {
                      setParentPropertySearch(e.target.value);
                      setShowParentPropertyDropdown(true);
                    }}
                    onFocus={() => setShowParentPropertyDropdown(true)}
                    placeholder={loadingParentProperties ? 'Loading properties...' : 'Search parent property...'}
                    disabled={loadingParentProperties}
                    className="block w-full px-3 py-2 pr-10 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
                
                {showParentPropertyDropdown && filteredParentProperties.length > 0 && (
                  <div className="autocomplete-dropdown w-full mt-1 bg-card/95 backdrop-blur-lg border border-border rounded-md shadow-xl max-h-60 overflow-auto">
                    {filteredParentProperties.map(property => (
                      <div
                        key={property.id}
                        onClick={() => handleParentPropertySelect(property)}
                        className="px-4 py-2 hover:bg-primary/10 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-foreground">{property.name}</div>
                        <div className="text-sm text-muted-foreground">{property.property_code} • {property.full_address}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showParentPropertyDropdown && filteredParentProperties.length === 0 && parentPropertySearch && (
                  <div className="autocomplete-dropdown w-full mt-1 bg-card/95 backdrop-blur-lg border border-border rounded-md shadow-xl">
                    <div className="px-4 py-2 text-muted-foreground">No properties found</div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Select the parent property under which sub-properties will be created
              </p>
            </div>
          </div>

          {/* Naming Configuration */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Naming Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Base Name *
                </label>
                <input
                  type="text"
                  value={formData.base_name}
                  onChange={(e) => handleInputChange('base_name', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  placeholder="e.g., Apartment, Unit, Room"
                />
              </div>

              {/* Count */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Number of Properties *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.count}
                    onChange={(e) => handleInputChange('count', parseInt(e.target.value) || 1)}
                    className="flex-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                    min="1"
                    max="50"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumberChange('count', false)}
                    className="p-2 border border-border rounded-md hover:bg-muted"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('count', true)}
                    className="p-2 border border-border rounded-md hover:bg-muted"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Prefix */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => handleInputChange('prefix', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  placeholder="e.g., Block A"
                />
              </div>

              {/* Start Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Number *
                </label>
                <input
                  type="number"
                  value={formData.start_number}
                  onChange={(e) => handleInputChange('start_number', parseInt(e.target.value) || 1)}
                  className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  min="1"
                />
              </div>

              {/* Suffix */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Suffix (Optional)
                </label>
                <input
                  type="text"
                  value={formData.suffix}
                  onChange={(e) => handleInputChange('suffix', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  placeholder="e.g., Floor 1"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 bg-muted/50 rounded-md p-3">
              <div className="text-sm font-medium text-foreground mb-2">Preview:</div>
              <div className="text-sm text-muted-foreground">
                {formData.count > 0 && formData.base_name && (
                  <>
                    {Array.from({ length: Math.min(formData.count, 3) }, (_, i) => {
                      const number = formData.start_number + i;
                      const name = `${formData.prefix}${formData.base_name} ${number}${formData.suffix}`.trim();
                      return <div key={i}>{name}</div>;
                    })}
                    {formData.count > 3 && (
                      <div className="text-muted-foreground/70">... and {formData.count - 3} more</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Property Details</h3>
            <p className="text-sm text-muted-foreground mb-4">
              These details will be applied to all sub-properties. Address details will be inherited from the parent property.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Property Type *
                </label>
                <select
                  value={formData.property_type}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  placeholder="Property description"
                />
              </div>





              {/* Square Meters */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Building Size (m²)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.square_meters}
                    onChange={(e) => handleInputChange('square_meters', parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumberChange('square_meters', false)}
                    className="p-2 border border-border rounded-md hover:bg-muted"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberChange('square_meters', true)}
                    className="p-2 border border-border rounded-md hover:bg-muted"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-border rounded-md text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Review ${formData.count} Sub-Properties`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 