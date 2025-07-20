'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  PencilIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';

// Mock tenant interface (replace with actual API types)
interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  id_number: string;
  date_of_birth: string;
  status: 'active' | 'inactive' | 'pending';
  employment_status: string;
  employer_name: string;
  monthly_income: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
  property_unit: string;
  lease_end_date: string;
  rent_amount: number;
  created_at: string;
  updated_at: string;
}

// Mock lease history interface
interface LeaseHistory {
  id: string;
  property_unit: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  status: string;
}

// Mock document interface
interface Document {
  id: string;
  name: string;
  type: string;
  uploaded_at: string;
  expires_at?: string;
}

// Mock communication interface
interface Communication {
  id: string;
  type: 'email' | 'phone' | 'sms' | 'note';
  date: string;
  subject: string;
  content: string;
}

// Mock data
const mockTenant: Tenant = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '0123456789',
  id_number: '9001015000000',
  date_of_birth: '1990-01-01',
  status: 'active',
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
  property_unit: 'Building A - Unit 101',
  lease_end_date: '2024-12-31',
  rent_amount: 12000,
  created_at: '2023-01-01',
  updated_at: '2024-01-01'
};

const mockLeaseHistory: LeaseHistory[] = [
  {
    id: '1',
    property_unit: 'Building A - Unit 101',
    start_date: '2023-01-01',
    end_date: '2024-12-31',
    rent_amount: 12000,
    status: 'active'
  },
  {
    id: '2',
    property_unit: 'Building B - Unit 201',
    start_date: '2021-01-01',
    end_date: '2022-12-31',
    rent_amount: 10000,
    status: 'completed'
  }
];

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'ID Document',
    type: 'identification',
    uploaded_at: '2023-01-01',
  },
  {
    id: '2',
    name: 'Lease Agreement',
    type: 'lease',
    uploaded_at: '2023-01-01',
  },
  {
    id: '3',
    name: 'Proof of Income',
    type: 'financial',
    uploaded_at: '2023-01-01',
    expires_at: '2024-12-31'
  }
];

const mockCommunications: Communication[] = [
  {
    id: '1',
    type: 'email',
    date: '2024-01-15',
    subject: 'Lease Renewal Notice',
    content: 'Sent lease renewal notification'
  },
  {
    id: '2',
    type: 'phone',
    date: '2024-01-10',
    subject: 'Maintenance Request',
    content: 'Discussed bathroom leak repair'
  }
];

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  // In production, fetch tenant data based on ID
  const tenant = mockTenant;
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'leases' | 'documents' | 'communications'>('overview');
  
  const handleEdit = () => {
    router.push(`/dashboard/tenants/edit/${tenantId}`);
  };

  const handleBack = () => {
    router.push('/dashboard/tenants');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Tenant Details</h1>
        </div>
        <Button
          onClick={handleEdit}
          className="flex items-center gap-2"
        >
          <PencilIcon className="h-4 w-4" />
          Edit Tenant
        </Button>
      </div>

      {/* Tenant Overview Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-2">{tenant.name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground/70">
                <span className="flex items-center gap-1">
                  <EnvelopeIcon className="h-4 w-4" />
                  {tenant.email}
                </span>
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-4 w-4" />
                  {tenant.phone}
                </span>
              </div>
            </div>
            <StatusBadge status={tenant.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Personal Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground/70">ID Number:</span> {tenant.id_number}</p>
                <p><span className="text-muted-foreground/70">Date of Birth:</span> {tenant.date_of_birth}</p>
                <p><span className="text-muted-foreground/70">Address:</span> {tenant.address}</p>
                <p><span className="text-muted-foreground/70">City:</span> {tenant.city}</p>
                <p><span className="text-muted-foreground/70">Province:</span> {tenant.province}</p>
                <p><span className="text-muted-foreground/70">Postal Code:</span> {tenant.postal_code}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Employment Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground/70">Status:</span> {tenant.employment_status}</p>
                <p><span className="text-muted-foreground/70">Employer:</span> {tenant.employer_name}</p>
                <p><span className="text-muted-foreground/70">Monthly Income:</span> R {parseInt(tenant.monthly_income).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Emergency Contact</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground/70">Name:</span> {tenant.emergency_contact_name}</p>
                <p><span className="text-muted-foreground/70">Phone:</span> {tenant.emergency_contact_phone}</p>
                <p><span className="text-muted-foreground/70">Relationship:</span> {tenant.emergency_contact_relationship}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'leases' ? 'default' : 'outline'}
          onClick={() => setActiveTab('leases')}
        >
          Lease History
        </Button>
        <Button
          variant={activeTab === 'documents' ? 'default' : 'outline'}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </Button>
        <Button
          variant={activeTab === 'communications' ? 'default' : 'outline'}
          onClick={() => setActiveTab('communications')}
        >
          Communications
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Current Lease Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground/70">Property Unit</p>
                  <p className="font-medium">{tenant.property_unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/70">Lease End Date</p>
                  <p className="font-medium">{tenant.lease_end_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/70">Monthly Rent</p>
                  <p className="font-medium">R {tenant.rent_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/70">Notes</p>
                  <p className="font-medium">{tenant.notes}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'leases' && (
        <Card>
          <CardHeader>
            <CardTitle>Lease History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockLeaseHistory.map((lease) => (
                <div key={lease.id} className="border-b border-gray-700 pb-4 last:border-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground/70">Property Unit</p>
                      <p className="font-medium">{lease.property_unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground/70">Period</p>
                      <p className="font-medium">{lease.start_date} to {lease.end_date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground/70">Rent Amount</p>
                      <p className="font-medium">R {lease.rent_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground/70">Status</p>
                      <p className="font-medium capitalize">{lease.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="h-6 w-6 text-muted-foreground/70" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground/70">
                        Uploaded: {doc.uploaded_at}
                        {doc.expires_at && ` • Expires: ${doc.expires_at}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'communications' && (
        <Card>
          <CardHeader>
            <CardTitle>Communication History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCommunications.map((comm) => (
                <div key={comm.id} className="flex items-start gap-4 p-4 border border-gray-700 rounded-lg">
                  <div className="p-2 bg-gray-800 rounded-full">
                    {comm.type === 'email' && <EnvelopeIcon className="h-5 w-5" />}
                    {comm.type === 'phone' && <PhoneIcon className="h-5 w-5" />}
                    {comm.type === 'sms' && <ChatBubbleLeftRightIcon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{comm.subject}</p>
                        <p className="text-sm text-muted-foreground/70">{comm.type.toUpperCase()} • {comm.date}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{comm.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 