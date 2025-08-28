"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  DocumentTextIcon,
  BanknotesIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  PlusIcon,
  MinusIcon,
  EyeIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CogIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simplified Lease interface
interface Lease {
  id: number;
  property: {
    id: string;
    property_code: string;
    name: string;
    address: string;
  };
  tenant: {
    id: number;
    tenant_code: string;
    name: string;
    email: string;
  };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  terms: string;
  created_at: string;
  updated_at: string;
  attachments_count: number;
}

export default function LeaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<Lease | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'documents' | 'maintenance'>('overview');

  useEffect(() => {
    // Simulate loading real data for now
    setTimeout(() => {
      setLoading(false);
      setLease({
        id: parseInt(leaseId || '1'),
        property: { 
          id: '1', 
          property_code: 'PROP001',
          name: 'Sample Property', 
          address: '123 Main Street, City, State'
        },
        tenant: { 
          id: 1, 
          tenant_code: 'TEN001',
          name: 'Sample Tenant', 
          email: 'tenant@example.com' 
        },
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        monthly_rent: 1500.00,
        deposit_amount: 1500.00,
        status: 'active',
        terms: 'Standard lease terms apply',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        attachments_count: 0
      });
    }, 1000);
  }, [leaseId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      case 'terminated': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Lease Details">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !lease) {
    return (
      <DashboardLayout title="Lease Details">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Lease</h2>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lease) {
    return (
      <DashboardLayout title="Lease Not Found">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Lease not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Lease Details - ${lease.property?.name || 'Unknown Property'}`}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Lease Details</h1>
              <p className="text-muted-foreground">
                {lease.property?.name} • {lease.tenant?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lease.status)}`}>
              {lease.status}
            </span>
            <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/edit`)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Lease
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
          {[
            { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
            { id: 'financials', label: 'Financials', icon: BanknotesIcon },
            { id: 'documents', label: 'Documents', icon: ClipboardDocumentListIcon },
            { id: 'maintenance', label: 'Maintenance', icon: CogIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white/20 text-blue-400"
                  : "text-white/70 hover:text-blue-300"
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Lease Overview</h2>
              
              {/* Property & Tenant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Property Name</label>
                      <p className="text-white font-medium">{lease.property?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Address</label>
                      <p className="text-white font-medium">{lease.property?.address}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Property Code</label>
                      <p className="text-white font-medium">{lease.property?.property_code}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <UserIcon className="h-5 w-5 mr-2" />
                      Tenant Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Tenant Name</label>
                      <p className="text-white font-medium">{lease.tenant?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <p className="text-white font-medium">{lease.tenant?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Tenant Code</label>
                      <p className="text-white font-medium">{lease.tenant?.tenant_code}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lease Terms */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Lease Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm text-muted-foreground">Start Date</label>
                      <p className="text-white font-medium">{formatDate(lease.start_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">End Date</label>
                      <p className="text-white font-medium">{formatDate(lease.end_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <p className="text-white font-medium capitalize">{lease.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <BanknotesIcon className="h-5 w-5 mr-2" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-muted-foreground">Monthly Rent</label>
                      <p className="text-white font-medium text-xl">{formatCurrency(lease.monthly_rent)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Security Deposit</label>
                      <p className="text-white font-medium text-xl">{formatCurrency(lease.deposit_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Financial Management</h2>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Financial management features will be implemented here</p>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Documents</h3>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No documents uploaded yet</p>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Maintenance Requests</h3>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              </div>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No maintenance requests</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}