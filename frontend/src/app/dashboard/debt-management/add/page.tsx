/**
 * Add Debtor Page
 * Form to create new debt collection cases
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { authService } from '@/lib/auth';

interface DebtorForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  totalDebt: string;
  assignedTo: string;
  notes: string;
}

export default function AddDebtorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<DebtorForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    totalDebt: '',
    assignedTo: '',
    notes: ''
  });

  const handleInputChange = (field: keyof DebtorForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = authService.getAccessToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const requestData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        total_debt: parseFloat(formData.totalDebt),
        notes: formData.notes,
      };
      
      // Only include assigned_to if it's not empty
      if (formData.assignedTo && formData.assignedTo.trim()) {
        requestData.assigned_to = null; // For now, set to null since we don't have user IDs
      }
      
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/debt-management/debtors/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (response.ok) {
        router.push('/dashboard/debt-management');
      } else {
        console.error('Failed to create debtor. Status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        try {
          const errorData = await response.json();
          console.error('Error data:', errorData);
        } catch (jsonError) {
          console.error('Could not parse error response as JSON');
          const textError = await response.text();
          console.error('Error response text:', textError);
        }
        
        // Show error message to user
        alert(`Failed to create debtor. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Network error creating debtor:', error);
      alert('Network error while creating debtor. Please check your connection.');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/debt-management');
  };

  return (
    <DashboardLayout title="Add New Debtor" subtitle="Create a new debt collection case">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add New Debtor</h1>
            <p className="text-gray-600">Create a new debt collection case</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Debtor Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Debt Amount *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.totalDebt}
                    onChange={(e) => handleInputChange('totalDebt', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter full address"
                />
              </div>

              {/* Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <Select
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                >
                  <option value="">Select assignee</option>
                  <option value="Sarah Johnson">Sarah Johnson</option>
                  <option value="Mike Wilson">Mike Wilson</option>
                  <option value="Lisa Chen">Lisa Chen</option>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes about this case..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Debt Collection Case
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 