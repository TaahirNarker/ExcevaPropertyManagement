/**
 * Landlord Details Page
 * Displays comprehensive information about a specific landlord
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  BanknotesIcon,
  DocumentTextIcon,
  PencilIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { landlordApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

interface Landlord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type?: string;
  company_name?: string;
  vat_number?: string;
  id_number?: string;
  tax_number?: string;
  street_address?: string;
  address_line_2?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  bank_name?: string;
  account_number?: string;
  branch_code?: string;
  account_type?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  display_name?: string;
  full_address?: string;
  properties_count?: number;
  total_rental_income?: number;
  is_active?: boolean;
}

export default function LandlordDetailsPage() {
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const landlordId = params.id as string;

  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);

  // Fetch landlord details
  useEffect(() => {
    const fetchLandlordDetails = async () => {
      try {
        setLoading(true);
        const data = await landlordApi.getLandlord(landlordId);
        setLandlord(data);
        
        // TODO: Fetch properties and financial summary when APIs are implemented
        setProperties([]);
        setFinancialSummary({
          properties_count: data.properties_count || 0,
          total_rental_income: data.total_rental_income || 0,
          status: data.status || 'Active'
        });
      } catch (error) {
        console.error('Error fetching landlord details:', error);
        toast.error('Failed to load landlord details');
        router.push('/dashboard/landlord');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && landlordId) {
      fetchLandlordDetails();
    }
  }, [isAuthenticated, landlordId, router]);

  // Handle edit landlord
  const handleEditLandlord = () => {
    router.push(`/dashboard/landlord/${landlordId}/edit`);
  };



  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('ZAR', 'R');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusColors = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-muted text-muted-foreground',
      'Suspended': 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-muted text-muted-foreground'}`}>
        {status}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Landlord Details">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Landlord Details">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!landlord) {
    return (
      <DashboardLayout title="Landlord Details">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Landlord Not Found</h2>
            <p className="text-muted-foreground mt-2">The landlord you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/dashboard/landlord')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Landlords
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Landlord Details">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/landlord')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{landlord.name}</h1>
                <p className="text-gray-300">{landlord.company_name || 'Individual Landlord'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {renderStatusBadge(landlord.status || 'Active')}
              <button
                onClick={handleEditLandlord}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                title="Edit Landlord"
              >
                <PencilIcon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <p className="text-white">{landlord.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <div className="flex items-center">
                    {landlord.type === 'Company' ? (
                      <BuildingOfficeIcon className="h-4 w-4 text-blue-400 mr-2" />
                    ) : (
                      <UserIcon className="h-4 w-4 text-green-400 mr-2" />
                    )}
                    <span className="text-white">{landlord.type || 'Individual'}</span>
                  </div>
                </div>
                {landlord.company_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                    <p className="text-white">{landlord.company_name}</p>
                  </div>
                )}
                {landlord.vat_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">VAT Number</label>
                    <p className="text-white">{landlord.vat_number}</p>
                  </div>
                )}
                {landlord.id_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">ID Number</label>
                    <p className="text-white">{landlord.id_number}</p>
                  </div>
                )}
                {landlord.tax_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tax Number</label>
                    <p className="text-white">{landlord.tax_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <p className="text-white">{landlord.email}</p>
                </div>
                {landlord.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                    <p className="text-white">{landlord.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            {(landlord.street_address || landlord.city) && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Address Information
                </h3>
                <div className="space-y-2">
                  {landlord.street_address && (
                    <p className="text-white">{landlord.street_address}</p>
                  )}
                  {landlord.address_line_2 && (
                    <p className="text-white">{landlord.address_line_2}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {landlord.suburb && <span className="text-gray-300">{landlord.suburb}</span>}
                    {landlord.city && <span className="text-gray-300">{landlord.city}</span>}
                    {landlord.province && <span className="text-gray-300">{landlord.province}</span>}
                    {landlord.postal_code && <span className="text-gray-300">{landlord.postal_code}</span>}
                  </div>
                  {landlord.country && (
                    <p className="text-gray-300">{landlord.country}</p>
                  )}
                </div>
              </div>
            )}

            {/* Banking Information */}
            {(landlord.bank_name || landlord.account_number) && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BanknotesIcon className="h-5 w-5 mr-2" />
                  Banking Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {landlord.bank_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Bank Name</label>
                      <p className="text-white">{landlord.bank_name}</p>
                    </div>
                  )}
                  {landlord.account_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Account Number</label>
                      <p className="text-white">{landlord.account_number}</p>
                    </div>
                  )}
                  {landlord.branch_code && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Branch Code</label>
                      <p className="text-white">{landlord.branch_code}</p>
                    </div>
                  )}
                  {landlord.account_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Account Type</label>
                      <p className="text-white">{landlord.account_type}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {landlord.notes && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Notes
                </h3>
                <p className="text-white whitespace-pre-wrap">{landlord.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                Financial Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Properties</label>
                  <p className="text-2xl font-bold text-white">{financialSummary?.properties_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Monthly Income</label>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(financialSummary?.total_rental_income || 0)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  {renderStatusBadge(financialSummary?.status || 'Active')}
                </div>
              </div>
            </div>

            {/* Properties List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <HomeIcon className="h-5 w-5 mr-2" />
                Properties
              </h3>
              {properties.length > 0 ? (
                <div className="space-y-3">
                  {properties.map((property) => (
                    <div key={property.id} className="p-3 bg-white/5 rounded-lg">
                      <p className="text-white font-medium">{property.name}</p>
                      <p className="text-sm text-gray-300">{property.address}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">No properties assigned</p>
                  <button
                    onClick={() => router.push('/dashboard/properties/add')}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Add Property
                  </button>
                </div>
              )}
            </div>

            {/* System Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Landlord ID</label>
                  <p className="text-sm text-gray-300 font-mono">{landlord.id}</p>
                </div>
                {landlord.created_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Created</label>
                    <p className="text-sm text-gray-300">{formatDate(landlord.created_at)}</p>
                  </div>
                )}
                {landlord.updated_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Last Updated</label>
                    <p className="text-sm text-gray-300">{formatDate(landlord.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 