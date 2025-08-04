'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
import { tenantApi } from '@/lib/api';
import { Tenant, LeaseHistory, Document, Communication } from '@/lib/tenant-api';

// Tenant interface is now imported from tenant-api.ts

// All interfaces are now imported from tenant-api.ts

// Mock data removed - using real API data

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  // State for real API data
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [leaseHistory, setLeaseHistory] = useState<LeaseHistory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'leases' | 'documents' | 'communications'>('overview');
  
  // Fetch tenant data
  useEffect(() => {
    const fetchTenantData = async () => {
      if (!tenantId) return;
      
      try {
        setLoading(true);
        const [tenantData, leaseHistoryData, documentsData, communicationsData] = await Promise.all([
          tenantApi.getTenant(tenantId),
          tenantApi.getTenantLeaseHistory(tenantId),
          tenantApi.getTenantDocuments(tenantId),
          tenantApi.getTenantCommunications(tenantId)
        ]);
        
        setTenant(tenantData);
        setLeaseHistory(leaseHistoryData);
        setDocuments(documentsData);
        setCommunications(communicationsData);
      } catch (error) {
        console.error('Error fetching tenant data:', error);
        setError('Failed to load tenant data');
        toast.error('Failed to load tenant data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenantData();
  }, [tenantId]);
  
  const handleEdit = () => {
    router.push(`/dashboard/tenants/edit/${tenantId}`);
  };

  const handleBack = () => {
    // Check for lease ID in URL parameters first
    const leaseId = searchParams.get('fromLease');
    if (leaseId) {
      router.push(`/dashboard/leases/${leaseId}`);
      return;
    }
    
    // Fallback to browser history
    if (window.history.length > 1) {
      router.back();
      return;
    }
    
    // Default fallback to tenants list
    router.push('/dashboard/tenants');
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

  if (error || !tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'Tenant not found'}</p>
            <Button onClick={() => router.push('/dashboard/tenants')}>
              Back to Tenants
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                  <p className="text-sm text-muted-foreground/70">Notes</p>
                  <p className="font-medium">{tenant.notes || 'No notes available'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/70">Status</p>
                  <p className="font-medium capitalize">{tenant.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/70">Created</p>
                  <p className="font-medium">{new Date(tenant.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/70">Last Updated</p>
                  <p className="font-medium">{new Date(tenant.updated_at).toLocaleDateString()}</p>
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
              {leaseHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No lease history available</p>
              ) : (
                leaseHistory.map((lease) => (
                <div key={lease.id} className="border-b border-gray-700 pb-4 last:border-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground/70">Property</p>
                      <p className="font-medium">{lease.property_name}</p>
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
              ))
              )}
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
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No documents available</p>
              ) : (
                documents.map((doc) => (
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
              ))
              )}
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
              {communications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No communications available</p>
              ) : (
                communications.map((comm) => (
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
              ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 