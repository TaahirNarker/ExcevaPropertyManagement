'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import TenantForm, { TenantFormData } from '@/components/TenantForm';
import { tenantApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch tenant data on mount
  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantId) return;
      
      try {
        setLoading(true);
        const tenantData = await tenantApi.getTenant(tenantId);
        
        // Transform the data to match the form structure
        const transformedData = {
          first_name: tenantData.user?.first_name || '',
          last_name: tenantData.user?.last_name || '',
          email: tenantData.email || tenantData.user?.email || '',
          phone: tenantData.phone || tenantData.user?.phone_number || '',
          id_number: tenantData.id_number || '',
          date_of_birth: tenantData.date_of_birth || '',
          employment_status: tenantData.employment_status || '',
          employer_name: tenantData.employer_name || '',
          monthly_income: tenantData.monthly_income?.toString() || '',
          emergency_contact_name: tenantData.emergency_contact_name || '',
          emergency_contact_phone: tenantData.emergency_contact_phone || '',
          emergency_contact_relationship: tenantData.emergency_contact_relationship || '',
          address: tenantData.address || '',
          city: tenantData.city || '',
          province: tenantData.province || '',
          postal_code: tenantData.postal_code || '',
          notes: tenantData.notes || ''
        };
        
        setTenant(transformedData);
      } catch (error) {
        console.error('Error fetching tenant:', error);
        toast.error('Failed to load tenant data');
        router.push('/dashboard/tenants');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenant();
  }, [tenantId, router]);

  const handleSubmit = async (data: TenantFormData) => {
    if (!tenantId) return;
    
    try {
      setSaving(true);
      
      // Transform form data to match API structure
      const updateData = {
        email: data.email || undefined,
        phone: data.phone || undefined,
        id_number: data.id_number || undefined,
        date_of_birth: data.date_of_birth || undefined,
        employment_status: data.employment_status || undefined,
        employer_name: data.employer_name || undefined,
        monthly_income: data.monthly_income ? data.monthly_income : undefined,
        emergency_contact_name: data.emergency_contact_name || undefined,
        emergency_contact_phone: data.emergency_contact_phone || undefined,
        emergency_contact_relationship: data.emergency_contact_relationship || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        postal_code: data.postal_code || undefined,
        notes: data.notes || undefined
        // Note: property_id and unit_id are not fields in the Tenant model
        // They are managed through the Lease model instead
      };
      
      // Filter out undefined values to avoid sending empty strings
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      // Debug: Log the data being sent
      console.log('Sending update data:', filteredUpdateData);
      
      // Update tenant
      await tenantApi.updateTenant(tenantId, filteredUpdateData);
      
      // Show success message
      toast.success('Tenant updated successfully!');
      
      // Navigate back to tenant details
      router.push(`/dashboard/tenants/${tenantId}`);
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      
      // Show more detailed error message
      if (error.message) {
        toast.error(`Failed to update tenant: ${error.message}`);
      } else if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          toast.error(`Failed to update tenant: ${errorData}`);
        } else if (errorData.detail) {
          toast.error(`Failed to update tenant: ${errorData.detail}`);
        } else {
          toast.error(`Failed to update tenant: ${JSON.stringify(errorData)}`);
        }
      } else {
        toast.error('Failed to update tenant. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/tenants/${tenantId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tenant data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">Tenant not found</p>
          <Button onClick={() => router.push('/dashboard/tenants')}>
            Back to Tenants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Edit Tenant</h1>
      </div>
      
      <TenantForm
        initialData={tenant}
        onSubmit={handleSubmit}
        isLoading={saving}
        onCancel={handleCancel}
      />
    </div>
  );
} 