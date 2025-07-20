'use client';

import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import TenantForm, { TenantFormData } from '@/components/TenantForm';

// Mock tenant data (replace with API call)
const mockTenant = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '0123456789',
  id_number: '9001015000000',
  date_of_birth: '1990-01-01',
  employment_status: 'Employed',
  employer_name: 'Tech Corp',
  monthly_income: '25000',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '0123456780',
  emergency_contact_relationship: 'Spouse',
  address: '123 Main Street',
  city: 'Cape Town',
  province: 'Western Cape',
  postal_code: '8001',
  notes: 'Reliable tenant with good payment history',
  property_id: '1',
  unit_id: '101'
};

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const handleSubmit = async (data: TenantFormData & { documents: File[] }) => {
    try {
      // TODO: Implement API call to update tenant
      console.log('Updating tenant:', tenantId, data);
      
      // Show success message
      toast.success('Tenant updated successfully!');
      
      // Navigate back to tenant details
      router.push(`/dashboard/tenants/${tenantId}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/tenants/${tenantId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Edit Tenant</h1>
      <TenantForm
        initialData={mockTenant}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
} 