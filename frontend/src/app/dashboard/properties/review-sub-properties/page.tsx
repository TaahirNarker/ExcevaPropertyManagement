/**
 * Review Sub-Properties Page
 * Editable table to review and modify sub-properties before creation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesAPI } from '@/lib/properties-api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Interfaces
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

interface SubProperty {
  name: string;
  property_type: string;
  description: string;
  street_address: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  parking_spaces: number;
  status: string;
  is_active: boolean;
  parent_property: string;
}

interface ReviewData {
  parentProperty: ParentProperty;
  subProperties: SubProperty[];
  formData: any;
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

export default function ReviewSubPropertiesPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [subProperties, setSubProperties] = useState<SubProperty[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data from sessionStorage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('subPropertiesReviewData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        console.log('Loaded review data:', data);
        setReviewData(data);
        setSubProperties(data.subProperties);
      } catch (error) {
        console.error('Error parsing stored data:', error);
        toast.error('Error loading review data. Please try again.');
        router.push('/dashboard/properties/create-sub-properties');
      }
    } else {
      toast.error('No review data found. Please start over.');
      router.push('/dashboard/properties/create-sub-properties');
    }
  }, [router]);

  // Handle updating a property field
  const handlePropertyUpdate = (index: number, field: keyof SubProperty, value: string | number | boolean) => {
    const updatedProperties = [...subProperties];
    updatedProperties[index] = {
      ...updatedProperties[index],
      [field]: value
    };
    setSubProperties(updatedProperties);
  };

  // Handle removing a property
  const handleRemoveProperty = (index: number) => {
    const updatedProperties = subProperties.filter((_, i) => i !== index);
    setSubProperties(updatedProperties);
    toast.success('Property removed from list');
  };

  // Handle adding a new property
  const handleAddProperty = () => {
    if (!reviewData) return;
    
    const newProperty: SubProperty = {
      name: `New Property ${subProperties.length + 1}`,
      property_type: reviewData.formData.property_type,
      description: reviewData.formData.description,
      street_address: reviewData.parentProperty.street_address,
      suburb: reviewData.parentProperty.suburb || '',
      city: reviewData.parentProperty.city,
      province: reviewData.parentProperty.province,
      postal_code: reviewData.parentProperty.postal_code || '',
      country: 'South Africa',
      bedrooms: 0, // Default value since bedrooms only apply to apartments
      bathrooms: 0,
      square_meters: reviewData.formData.square_meters,
      parking_spaces: 0,
      status: 'vacant',
      is_active: true,
      parent_property: reviewData.parentProperty.id
    };
    
    setSubProperties([...subProperties, newProperty]);
    toast.success('New property added to list');
  };

  // Handle creating all properties
  const handleCreateProperties = async () => {
    if (subProperties.length === 0) {
      toast.error('No properties to create');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('You must be logged in to create properties');
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    
    try {
      const createdProperties = [];
      
      for (const propertyData of subProperties) {
        console.log('Creating property with data:', propertyData);
        console.log('Property data type check:', {
          name: typeof propertyData.name,
          property_type: typeof propertyData.property_type,
          street_address: typeof propertyData.street_address,
          city: typeof propertyData.city,
          province: typeof propertyData.province,
          parent_property: typeof propertyData.parent_property,
          parent_property_value: propertyData.parent_property
        });
        
        // Validate required fields before sending to API
        if (!propertyData.name || !propertyData.property_type || !propertyData.street_address || !propertyData.city || !propertyData.province) {
          throw new Error(`Property "${propertyData.name}" is missing required fields: name, property_type, street_address, city, or province`);
        }
        
        try {
          const createdProperty = await propertiesAPI.createProperty(propertyData);
          createdProperties.push(createdProperty);
        } catch (error) {
          console.error('Error creating property:', propertyData.name, error);
          console.error('Property data being sent:', JSON.stringify(propertyData, null, 2));
          
          // Try to get more detailed error information
          let errorMessage = error.message;
          if (error.response && error.response.data) {
            console.error('Backend error response:', error.response.data);
            if (typeof error.response.data === 'object') {
              errorMessage = JSON.stringify(error.response.data);
            } else {
              errorMessage = error.response.data;
            }
          }
          
          console.error('Detailed error message:', errorMessage);
          
          // Handle authentication errors specifically
          if (error.message.includes('token') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
            toast.error('Your session has expired. Please log in again.');
            router.push('/auth/login');
            return;
          }
          
          throw new Error(`Failed to create property "${propertyData.name}": ${errorMessage}`);
        }
      }
      
      // Clear session storage
      sessionStorage.removeItem('subPropertiesReviewData');
      
      toast.success(`Successfully created ${createdProperties.length} sub-properties!`);
      router.push('/dashboard/properties');
      
    } catch (error) {
      console.error('Error creating properties:', error);
      if (error instanceof Error) {
        toast.error(`Failed to create properties: ${error.message}`);
      } else {
        toast.error('Failed to create some properties. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle going back
  const handleGoBack = () => {
    // Update session storage with current data
    if (reviewData) {
      const updatedReviewData = {
        ...reviewData,
        subProperties: subProperties
      };
      sessionStorage.setItem('subPropertiesReviewData', JSON.stringify(updatedReviewData));
    }
    router.push('/dashboard/properties/create-sub-properties');
  };

  // Handle canceling the entire process
  const handleCancel = () => {
    sessionStorage.removeItem('subPropertiesReviewData');
    router.push('/dashboard/properties');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Review Sub-Properties">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!reviewData) {
    return (
      <DashboardLayout title="Review Sub-Properties">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Review Sub-Properties">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Review Sub-Properties</h1>
              <p className="text-muted-foreground mt-1">
                Review and edit {subProperties.length} sub-properties for {reviewData.parentProperty.name}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Setup
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Parent Property Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Parent Property
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Name:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">{reviewData.parentProperty.name}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Code:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">{reviewData.parentProperty.property_code}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-200">Address:</span>
                <span className="ml-2 text-blue-700 dark:text-blue-300">{reviewData.parentProperty.full_address}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">
              Sub-Properties ({subProperties.length})
            </h2>
            <button
              onClick={handleAddProperty}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Property
            </button>
          </div>

          {/* Properties Table */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Property Name
                    </th>
                                                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                       Type
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                       Size (m²)
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                       Actions
                     </th>                    
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {subProperties.map((property, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={property.name}
                          onChange={(e) => handlePropertyUpdate(index, 'name', e.target.value)}
                          className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={property.property_type}
                          onChange={(e) => handlePropertyUpdate(index, 'property_type', e.target.value)}
                          className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                        >
                          {PROPERTY_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                                                 <input
                           type="number"
                           value={property.square_meters}
                           onChange={(e) => handlePropertyUpdate(index, 'square_meters', parseInt(e.target.value) || 0)}
                           className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                           min="0"
                         />
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <button
                           onClick={() => handleRemoveProperty(index)}
                           className="text-red-600 hover:text-red-900"
                           title="Remove property"
                         >
                           <TrashIcon className="h-4 w-4" />
                         </button>
                       </td>
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-center pt-6">
            <button
              onClick={handleCreateProperties}
              disabled={loading || subProperties.length === 0}
              className="inline-flex items-center px-8 py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating Properties...
                </>
              ) : (
                <>
                  <PlusIcon className="h-6 w-6 mr-3" />
                  Create {subProperties.length} Sub-Properties
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 