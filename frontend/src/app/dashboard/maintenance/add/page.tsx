'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  WrenchScrewdriverIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

interface MaintenanceFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cosmetic' | 'landscaping' | 'other';
  property_id: string;
  unit_number: string;
  assigned_team: string;
  reporter_name: string;
  estimated_cost: number;
  scheduled_date: string;
  notes: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  units_count: number;
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

export default function AddMaintenancePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [formData, setFormData] = useState<MaintenanceFormData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    property_id: '',
    unit_number: '',
    assigned_team: '',
    reporter_name: user?.full_name || '',
    estimated_cost: 0,
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [teams, setTeams] = useState<MaintenanceTeam[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock data
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

  // Initialize data
  useEffect(() => {
    if (isAuthenticated) {
      setProperties(mockProperties);
      setTeams(mockTeams);
      setFormData(prev => ({ ...prev, reporter_name: user?.full_name || '' }));
    }
  }, [isAuthenticated, user]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);
  };

  // Remove selected image
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.property_id) {
      newErrors.property_id = 'Property is required';
    }

    if (!formData.assigned_team) {
      newErrors.assigned_team = 'Assigned team is required';
    }

    if (!formData.reporter_name.trim()) {
      newErrors.reporter_name = 'Reporter name is required';
    }

    if (formData.estimated_cost < 0) {
      newErrors.estimated_cost = 'Estimated cost must be positive';
    }

    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      console.log('Creating maintenance item:', formData);
      console.log('Selected images:', selectedImages);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Maintenance item created successfully!');
      router.push('/dashboard/maintenance');
    } catch (error) {
      console.error('Error creating maintenance item:', error);
      toast.error('Failed to create maintenance item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get filtered teams based on category
  const getRecommendedTeams = () => {
    if (!formData.category || formData.category === 'other') {
      return teams;
    }
    
    const categoryMap: Record<string, string[]> = {
      plumbing: ['Plumbing', 'Water Systems'],
      electrical: ['Electrical', 'Wiring', 'Lighting'],
      hvac: ['HVAC', 'Heating', 'Cooling'],
      structural: ['Structural', 'Elevators'],
      landscaping: ['Landscaping', 'Grounds Maintenance'],
    };
    
    const relevantSpecialties = categoryMap[formData.category] || [];
    
    return teams.filter(team => 
      team.specialties.some(specialty => 
        relevantSpecialties.some(relevant => 
          specialty.toLowerCase().includes(relevant.toLowerCase())
        )
      )
    );
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Add Maintenance">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Maintenance">
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Maintenance
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-muted-foreground mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Leaking kitchen faucet"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-2">
                    Priority *
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
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

                {/* Reporter Name */}
                <div>
                  <label htmlFor="reporter_name" className="block text-sm font-medium text-muted-foreground mb-2">
                    Reporter Name *
                  </label>
                  <input
                    type="text"
                    id="reporter_name"
                    name="reporter_name"
                    value={formData.reporter_name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Who reported this issue?"
                  />
                  {errors.reporter_name && (
                    <p className="mt-1 text-sm text-red-400">{errors.reporter_name}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the maintenance issue in detail..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-400">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Property & Location */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <HomeIcon className="h-5 w-5 mr-2" />
                Property & Location
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property */}
                <div>
                  <label htmlFor="property_id" className="block text-sm font-medium text-muted-foreground mb-2">
                    Property *
                  </label>
                  <select
                    id="property_id"
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address}
                      </option>
                    ))}
                  </select>
                  {errors.property_id && (
                    <p className="mt-1 text-sm text-red-400">{errors.property_id}</p>
                  )}
                </div>

                {/* Unit Number */}
                <div>
                  <label htmlFor="unit_number" className="block text-sm font-medium text-muted-foreground mb-2">
                    Unit Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="unit_number"
                    name="unit_number"
                    value={formData.unit_number}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2A, 101, Lobby"
                  />
                </div>
              </div>
            </div>

            {/* Team Assignment */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Team Assignment
              </h3>
              
              <div>
                <label htmlFor="assigned_team" className="block text-sm font-medium text-muted-foreground mb-2">
                  Assigned Team *
                  {formData.category && formData.category !== 'other' && (
                    <span className="ml-2 text-xs text-blue-400">
                      (Filtered by category: {formData.category})
                    </span>
                  )}
                </label>
                <select
                  id="assigned_team"
                  name="assigned_team"
                  value={formData.assigned_team}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a team</option>
                  {getRecommendedTeams().map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} - {team.specialties.join(', ')}
                    </option>
                  ))}
                </select>
                {errors.assigned_team && (
                  <p className="mt-1 text-sm text-red-400">{errors.assigned_team}</p>
                )}
                
                {/* Team contact info */}
                {formData.assigned_team && (
                  <div className="mt-2 p-3 bg-white/5 rounded-md">
                    {(() => {
                      const selectedTeam = teams.find(t => t.id === formData.assigned_team);
                      return selectedTeam ? (
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Contact:</strong> {selectedTeam.contact_person}</p>
                          <p><strong>Phone:</strong> {selectedTeam.phone}</p>
                          <p><strong>Email:</strong> {selectedTeam.email}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling & Cost */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Scheduling & Cost
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scheduled Date */}
                <div>
                  <label htmlFor="scheduled_date" className="block text-sm font-medium text-muted-foreground mb-2">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    id="scheduled_date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.scheduled_date && (
                    <p className="mt-1 text-sm text-red-400">{errors.scheduled_date}</p>
                  )}
                </div>

                {/* Estimated Cost */}
                <div>
                  <label htmlFor="estimated_cost" className="block text-sm font-medium text-muted-foreground mb-2">
                    Estimated Cost
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CurrencyDollarIcon className="h-5 w-5 text-muted-foreground/70" />
                    </div>
                    <input
                      type="number"
                      id="estimated_cost"
                      name="estimated_cost"
                      min="0"
                      step="0.01"
                      value={formData.estimated_cost}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.estimated_cost && (
                    <p className="mt-1 text-sm text-red-400">{errors.estimated_cost}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Additional Details
              </h3>
              
              {/* Notes */}
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes or special instructions..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Images (Optional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/20 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 mb-2 text-muted-foreground/70" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground/70">PNG, JPG, GIF up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Selected Images */}
                {selectedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Selected ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Maintenance Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
} 