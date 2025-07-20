'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  HomeIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

interface InspectionFormData {
  type: 'move_in' | 'periodic' | 'move_out';
  property_id: string;
  unit_number: string;
  tenant_name: string;
  inspector_name: string;
  scheduled_date: string;
  scheduled_time: string;
  template_id: string;
  notes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Property {
  id: string;
  name: string;
  address: string;
  units_count: number;
}

interface InspectionTemplate {
  id: string;
  name: string;
  type: 'move_in' | 'periodic' | 'move_out' | 'custom';
  is_standard: boolean;
  description: string;
  estimated_duration: number; // in minutes
  total_items: number;
}

interface Inspector {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  is_available: boolean;
}

export default function ScheduleInspectionPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [formData, setFormData] = useState<InspectionFormData>({
    type: 'move_in',
    property_id: '',
    unit_number: '',
    tenant_name: '',
    inspector_name: user?.full_name || '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00',
    template_id: '',
    notes: '',
    priority: 'medium',
  });
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
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

  const mockTemplates: InspectionTemplate[] = [
    {
      id: 'template1',
      name: 'Standard Move-In Inspection',
      type: 'move_in',
      is_standard: true,
      description: 'Comprehensive move-in inspection covering all areas of the unit',
      estimated_duration: 60,
      total_items: 25
    },
    {
      id: 'template2',
      name: 'Detailed Move-In Inspection',
      type: 'move_in',
      is_standard: false,
      description: 'Extended move-in inspection with additional safety and condition checks',
      estimated_duration: 90,
      total_items: 35
    },
    {
      id: 'template3',
      name: 'Quarterly Inspection',
      type: 'periodic',
      is_standard: true,
      description: 'Regular quarterly inspection focusing on maintenance and safety',
      estimated_duration: 45,
      total_items: 18
    },
    {
      id: 'template4',
      name: 'Annual Inspection',
      type: 'periodic',
      is_standard: true,
      description: 'Comprehensive annual inspection including all systems and appliances',
      estimated_duration: 120,
      total_items: 40
    },
    {
      id: 'template5',
      name: 'Standard Move-Out Inspection',
      type: 'move_out',
      is_standard: true,
      description: 'Move-out inspection for damage assessment and security deposit evaluation',
      estimated_duration: 75,
      total_items: 30
    },
    {
      id: 'template6',
      name: 'Detailed Move-Out Inspection',
      type: 'move_out',
      is_standard: false,
      description: 'Comprehensive move-out inspection with detailed damage documentation',
      estimated_duration: 120,
      total_items: 45
    }
  ];

  const mockInspectors: Inspector[] = [
    {
      id: 'inspector1',
      name: 'Mike Wilson',
      email: 'mike.wilson@company.com',
      phone: '(555) 123-4567',
      specialties: ['Move-In', 'Move-Out', 'General Inspection'],
      is_available: true
    },
    {
      id: 'inspector2',
      name: 'Lisa Rodriguez',
      email: 'lisa.rodriguez@company.com',
      phone: '(555) 234-5678',
      specialties: ['Periodic', 'Safety', 'HVAC'],
      is_available: true
    },
    {
      id: 'inspector3',
      name: 'David Wilson',
      email: 'david.wilson@company.com',
      phone: '(555) 345-6789',
      specialties: ['Move-Out', 'Damage Assessment', 'Legal'],
      is_available: false
    },
    {
      id: 'inspector4',
      name: 'Jessica Brown',
      email: 'jessica.brown@company.com',
      phone: '(555) 456-7890',
      specialties: ['Move-In', 'Periodic', 'Documentation'],
      is_available: true
    }
  ];

  // Initialize data
  useEffect(() => {
    if (isAuthenticated) {
      setProperties(mockProperties);
      setTemplates(mockTemplates);
      setInspectors(mockInspectors);
      setFormData(prev => ({ ...prev, inspector_name: user?.full_name || '' }));
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

    // Reset template when type changes
    if (name === 'type') {
      setFormData(prev => ({ ...prev, template_id: '' }));
    }
  };

  // Get filtered templates based on inspection type
  const getFilteredTemplates = () => {
    return templates.filter(template => 
      template.type === formData.type || template.type === 'custom'
    );
  };

  // Get recommended inspectors based on inspection type
  const getRecommendedInspectors = () => {
    const typeMap: Record<string, string> = {
      move_in: 'Move-In',
      periodic: 'Periodic',
      move_out: 'Move-Out'
    };
    
    const relevantSpecialty = typeMap[formData.type];
    
    return inspectors.filter(inspector => 
      inspector.is_available && 
      inspector.specialties.includes(relevantSpecialty)
    );
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.property_id) {
      newErrors.property_id = 'Property is required';
    }

    if (!formData.unit_number.trim()) {
      newErrors.unit_number = 'Unit number is required';
    }

    if (!formData.template_id) {
      newErrors.template_id = 'Inspection template is required';
    }

    if (!formData.inspector_name.trim()) {
      newErrors.inspector_name = 'Inspector name is required';
    }

    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required';
    }

    if (!formData.scheduled_time) {
      newErrors.scheduled_time = 'Scheduled time is required';
    }

    // Check if scheduled date is in the past
    const scheduledDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
    if (scheduledDateTime < new Date()) {
      newErrors.scheduled_date = 'Scheduled date and time cannot be in the past';
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
      console.log('Scheduling inspection:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Inspection scheduled successfully!');
      router.push('/dashboard/inspections');
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      toast.error('Failed to schedule inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected template details
  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Schedule Inspection">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Schedule Inspection">
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Inspections
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inspection Type */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                Inspection Type
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'move_in', label: 'Move-In Inspection', description: 'Document unit condition before tenant moves in' },
                  { value: 'periodic', label: 'Periodic Inspection', description: 'Regular maintenance and safety inspection' },
                  { value: 'move_out', label: 'Move-Out Inspection', description: 'Assess damages and determine security deposit' }
                ].map((type) => (
                  <label key={type.value} className="relative">
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}>
                      <div className="text-sm font-medium text-white">{type.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Property & Unit */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <HomeIcon className="h-5 w-5 mr-2" />
                Property & Unit
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
                    Unit Number *
                  </label>
                  <input
                    type="text"
                    id="unit_number"
                    name="unit_number"
                    value={formData.unit_number}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2A, 101, Penthouse"
                  />
                  {errors.unit_number && (
                    <p className="mt-1 text-sm text-red-400">{errors.unit_number}</p>
                  )}
                </div>

                {/* Tenant Name */}
                <div>
                  <label htmlFor="tenant_name" className="block text-sm font-medium text-muted-foreground mb-2">
                    Tenant Name {formData.type !== 'move_out' && '(Optional)'}
                  </label>
                  <input
                    type="text"
                    id="tenant_name"
                    name="tenant_name"
                    value={formData.tenant_name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter tenant name"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-2">
                    Priority
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
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Inspection Template
              </h3>
              
              <div>
                <label htmlFor="template_id" className="block text-sm font-medium text-muted-foreground mb-2">
                  Select Template *
                </label>
                <select
                  id="template_id"
                  name="template_id"
                  value={formData.template_id}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an inspection template</option>
                  {getFilteredTemplates().map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.is_standard && '(Standard)'} - {template.total_items} items, ~{template.estimated_duration}min
                    </option>
                  ))}
                </select>
                {errors.template_id && (
                  <p className="mt-1 text-sm text-red-400">{errors.template_id}</p>
                )}
                
                {/* Template details */}
                {selectedTemplate && (
                  <div className="mt-3 p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">{selectedTemplate.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{selectedTemplate.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground/70">
                      <span>📋 {selectedTemplate.total_items} items</span>
                      <span>⏱️ ~{selectedTemplate.estimated_duration} minutes</span>
                      <span>{selectedTemplate.is_standard ? '✅ Standard' : '🔧 Custom'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Scheduling
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
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
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.scheduled_date && (
                    <p className="mt-1 text-sm text-red-400">{errors.scheduled_date}</p>
                  )}
                </div>

                {/* Time */}
                <div>
                  <label htmlFor="scheduled_time" className="block text-sm font-medium text-muted-foreground mb-2">
                    Scheduled Time *
                  </label>
                  <input
                    type="time"
                    id="scheduled_time"
                    name="scheduled_time"
                    value={formData.scheduled_time}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.scheduled_time && (
                    <p className="mt-1 text-sm text-red-400">{errors.scheduled_time}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Inspector Assignment */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Inspector Assignment
              </h3>
              
              <div>
                <label htmlFor="inspector_name" className="block text-sm font-medium text-muted-foreground mb-2">
                  Inspector *
                  {formData.type && (
                    <span className="ml-2 text-xs text-blue-400">
                      (Showing inspectors specializing in {formData.type.replace('_', '-')} inspections)
                    </span>
                  )}
                </label>
                <select
                  id="inspector_name"
                  name="inspector_name"
                  value={formData.inspector_name}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an inspector</option>
                  {getRecommendedInspectors().map(inspector => (
                    <option key={inspector.id} value={inspector.name}>
                      {inspector.name} - {inspector.specialties.join(', ')}
                    </option>
                  ))}
                  <optgroup label="Other Inspectors">
                    {inspectors.filter(i => !getRecommendedInspectors().includes(i) && i.is_available).map(inspector => (
                      <option key={inspector.id} value={inspector.name}>
                        {inspector.name} - {inspector.specialties.join(', ')}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {errors.inspector_name && (
                  <p className="mt-1 text-sm text-red-400">{errors.inspector_name}</p>
                )}
                
                {/* Inspector contact info */}
                {formData.inspector_name && (
                  <div className="mt-2 p-3 bg-white/5 rounded-md">
                    {(() => {
                      const selectedInspector = inspectors.find(i => i.name === formData.inspector_name);
                      return selectedInspector ? (
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Email:</strong> {selectedInspector.email}</p>
                          <p><strong>Phone:</strong> {selectedInspector.phone}</p>
                          <p><strong>Specialties:</strong> {selectedInspector.specialties.join(', ')}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any special instructions or notes for the inspector..."
              />
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
                {isSubmitting ? 'Scheduling...' : 'Schedule Inspection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
} 