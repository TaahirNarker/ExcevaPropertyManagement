'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { tenantAPI } from '@/lib/api';

// Form validation schema
const tenantFormSchema = z.object({
  // Personal Information
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  id_number: z.string().min(10, 'ID number is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  
  // Employment Information
  employment_status: z.enum(['Employed', 'Self-Employed', 'Unemployed', 'Retired', 'Student']),
  employer_name: z.string().optional(),
  monthly_income: z.string().optional(),
  
  // Emergency Contact
  emergency_contact_name: z.string().min(2, 'Emergency contact name is required'),
  emergency_contact_phone: z.string().min(10, 'Emergency contact phone is required'),
  emergency_contact_relationship: z.string().min(2, 'Relationship is required'),
  
  // Address Information
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postal_code: z.string().min(4, 'Postal code is required'),
  
  // Property Assignment
  property_id: z.string().optional(),
  unit_id: z.string().optional(),
  
  // Additional Information
  notes: z.string().optional(),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  initialData?: Partial<TenantFormData>;
  onSubmit: (data: TenantFormData) => void;
  isLoading?: boolean;
}

export default function TenantForm({ initialData, onSubmit, isLoading = false }: TenantFormProps) {
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  const { register, handleSubmit, formState: { errors } } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: initialData,
  });

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const newDocuments = Array.from(files);
    setDocuments(prev => [...prev, ...newDocuments]);
    
    // Upload each document
    for (const file of newDocuments) {
      try {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('name', file.name);
        formData.append('document_type', getDocumentType(file.name));
        
        // Track upload progress
        const progressId = Math.random().toString(36).substring(7);
        setUploadProgress(prev => ({ ...prev, [progressId]: 0 }));
        
        // Upload document
        await tenantAPI.documents.upload(initialData?.id_number || '', formData);
        
        // Update progress
        setUploadProgress(prev => ({ ...prev, [progressId]: 100 }));
        toast.success(`Document ${file.name} uploaded successfully`);
      } catch (error) {
        console.error('Failed to upload document:', error);
        toast.error(`Failed to upload document ${file.name}`);
      }
    }
  };

  const getDocumentType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  };

  const handleFormSubmit = async (data: TenantFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission failed:', error);
      toast.error('Failed to save tenant information');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Personal Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <Input {...register('first_name')} />
              {errors.first_name && (
                <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <Input {...register('last_name')} />
              {errors.last_name && (
                <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input type="email" {...register('email')} />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input {...register('phone')} />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ID Number</label>
              <Input {...register('id_number')} />
              {errors.id_number && (
                <p className="text-red-500 text-sm mt-1">{errors.id_number.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <Input type="date" {...register('date_of_birth')} />
              {errors.date_of_birth && (
                <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employment Status</label>
              <Select {...register('employment_status')}>
                <option value="">Select status</option>
                <option value="Employed">Employed</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Retired">Retired</option>
                <option value="Student">Student</option>
              </Select>
              {errors.employment_status && (
                <p className="text-red-500 text-sm mt-1">{errors.employment_status.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employer Name</label>
              <Input {...register('employer_name')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Income</label>
              <Input type="number" {...register('monthly_income')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
              <Input {...register('emergency_contact_name')} />
              {errors.emergency_contact_name && (
                <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Emergency Contact Phone</label>
              <Input {...register('emergency_contact_phone')} />
              {errors.emergency_contact_phone && (
                <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_phone.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Relationship</label>
              <Input {...register('emergency_contact_relationship')} />
              {errors.emergency_contact_relationship && (
                <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_relationship.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input {...register('address')} />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <Input {...register('city')} />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Province</label>
              <Input {...register('province')} />
              {errors.province && (
                <p className="text-red-500 text-sm mt-1">{errors.province.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <Input {...register('postal_code')} />
              {errors.postal_code && (
                <p className="text-red-500 text-sm mt-1">{errors.postal_code.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Upload Documents</label>
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e.target.files)}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG
              </p>
            </div>
            
            {/* Document list */}
            {documents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Uploaded Documents</h4>
                <ul className="space-y-2">
                  {documents.map((doc, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span className="text-sm">{doc.name}</span>
                      {uploadProgress[doc.name] !== undefined && (
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${uploadProgress[doc.name]}%` }}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea {...register('notes')} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Tenant'}
        </Button>
      </div>
    </form>
  );
} 