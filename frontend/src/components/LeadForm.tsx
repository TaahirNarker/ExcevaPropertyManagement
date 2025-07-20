/**
 * Lead Form Component
 * Handles adding and editing leads in the CRM system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

// Types
interface Lead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  source: 'Property24' | 'PrivateProperty' | 'Facebook' | 'Walk-in' | 'Referral';
  stage: 'New' | 'Contacted' | 'Qualified' | 'Viewing Scheduled' | 'Application Sent' | 'Converted' | 'Dropped';
  assignedTo: string;
  propertyInterest?: string;
  notes: string;
  createdAt?: string;
  lastContact?: string;
  nextFollowUp?: string;
}

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  lead?: Lead | null;
  mode: 'add' | 'edit';
}

export default function LeadForm({ isOpen, onClose, onSave, lead, mode }: LeadFormProps) {
  // Form state
  const [formData, setFormData] = useState<Lead>({
    name: '',
    email: '',
    phone: '',
    source: 'Property24',
    stage: 'New',
    assignedTo: '',
    propertyInterest: '',
    notes: '',
    nextFollowUp: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock staff members for assignment
  const staffMembers = [
    'Sarah Johnson',
    'Mike Wilson',
    'Lisa Chen',
    'David Thompson',
    'Emma Rodriguez'
  ];

  // Mock properties for interest
  const availableProperties = [
    'Sunset Villas Unit 101',
    'Ocean View Complex Unit 205',
    'Parkview Apartments Unit 302',
    'Harbor Heights Unit 405',
    'Mountain View Lodge Unit 201'
  ];

  // Initialize form with lead data when editing
  useEffect(() => {
    if (lead && mode === 'edit') {
      setFormData(lead);
    } else {
      // Reset form for new lead
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: 'Property24',
        stage: 'New',
        assignedTo: '',
        propertyInterest: '',
        notes: '',
        nextFollowUp: ''
      });
    }
    setErrors({});
  }, [lead, mode, isOpen]);

  // Handle input changes
  const handleInputChange = (field: keyof Lead, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.assignedTo.trim()) {
      newErrors.assignedTo = 'Please assign to a staff member';
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

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate ID for new leads
      const leadToSave = mode === 'add' 
        ? { ...formData, id: `LEAD${Date.now()}` }
        : formData;

      onSave(leadToSave);
      
      toast.success(mode === 'add' ? 'Lead added successfully!' : 'Lead updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to save lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {mode === 'add' ? 'Add New Lead' : 'Edit Lead'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {mode === 'add' ? 'Create a new lead in the CRM system' : 'Update lead information'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-400" />
                Basic Information
              </h3>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+27 82 123 4567"
                  className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Lead Source */}
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-300 mb-2">
                Lead Source
              </label>
              <Select
                value={formData.source}
                onChange={(e) => handleInputChange('source', e.target.value)}
              >
                <option value="Property24">Property24</option>
                <option value="PrivateProperty">PrivateProperty</option>
                <option value="Facebook">Facebook</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Referral">Referral</option>
              </Select>
            </div>

            {/* Lead Stage */}
            <div>
              <label htmlFor="stage" className="block text-sm font-medium text-gray-300 mb-2">
                Current Stage
              </label>
              <Select
                value={formData.stage}
                onChange={(e) => handleInputChange('stage', e.target.value)}
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Viewing Scheduled">Viewing Scheduled</option>
                <option value="Application Sent">Application Sent</option>
                <option value="Converted">Converted</option>
                <option value="Dropped">Dropped</option>
              </Select>
            </div>

            {/* Assigned To */}
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-300 mb-2">
                Assign To *
              </label>
              <Select
                value={formData.assignedTo}
                onChange={(e) => handleInputChange('assignedTo', e.target.value)}
              >
                <option value="">Select staff member</option>
                {staffMembers.map((member) => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </Select>
              {errors.assignedTo && (
                <p className="text-red-500 text-sm mt-1">{errors.assignedTo}</p>
              )}
            </div>

            {/* Property Interest */}
            <div>
              <label htmlFor="propertyInterest" className="block text-sm font-medium text-gray-300 mb-2">
                Property Interest
              </label>
              <div className="relative">
                <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Select
                  value={formData.propertyInterest}
                  onChange={(e) => handleInputChange('propertyInterest', e.target.value)}
                >
                  <option value="">Select property (optional)</option>
                  {availableProperties.map((property) => (
                    <option key={property} value={property}>{property}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Next Follow-up */}
            <div>
              <label htmlFor="nextFollowUp" className="block text-sm font-medium text-gray-300 mb-2">
                Next Follow-up Date
              </label>
              <Input
                id="nextFollowUp"
                type="date"
                value={formData.nextFollowUp}
                onChange={(e) => handleInputChange('nextFollowUp', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                Notes & Comments
              </label>
              <div className="relative">
                <DocumentTextIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes, preferences, or important information about this lead..."
                  className="pl-10 min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                mode === 'add' ? 'Add Lead' : 'Update Lead'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 