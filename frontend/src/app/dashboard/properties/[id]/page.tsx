/**
 * Property Detail Page
 * Displays comprehensive information about a specific property
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  CurrencyDollarIcon, 
  UserIcon, 
  CalendarIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  PhotoIcon,
  HomeIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { propertyAPI } from '@/lib/api';

interface Property {
  id: string;
  property_code: string;
  name: string;
  property_type: string;
  description: string;
  street_address: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  parking_spaces?: number;
  purchase_price?: number;
  current_market_value?: number;
  monthly_rental_amount?: number;
  status: string;
  is_active: boolean;
  owner: {
    id: string;
    full_name: string;
    email: string;
  };
  property_manager: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  features: Record<string, any>;
  primary_image: string;
  images: string[];
  documents: string[];
  created_at: string;
  updated_at: string;
  current_tenant?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  current_lease?: {
    id: string;
    start_date: string;
    end_date: string;
    monthly_rent?: number;
    deposit_amount?: number;
    status: string;
  };
}

interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  estimated_cost?: number;
  actual_cost?: number;
  scheduled_date: string;
  completion_date?: string;
  created_at: string;
}

interface FinancialSummary {
  total_rental_income?: number;
  total_outstanding?: number;
  collection_rate?: number;
  monthly_revenue?: number;
  monthly_expenses?: number;
  net_profit?: number;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  
  // Helper function to safely format numbers
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };
  
  const [property, setProperty] = useState<Property | null>(null);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch property details
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        const data = await propertyAPI.get(propertyId);
        setProperty(data);
        
        // Fetch related data
        await Promise.all([
          fetchMaintenanceItems(),
          fetchFinancialSummary()
        ]);
      } catch (error) {
        console.error('Error fetching property details:', error);
        toast.error('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchMaintenanceItems = async () => {
    try {
      const data = await propertyAPI.getMaintenanceItems({ property_id: propertyId });
      setMaintenanceItems(data);
    } catch (error) {
      console.error('Error fetching maintenance items:', error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const data = await propertyAPI.getFinancialSummary(propertyId);
      setFinancialSummary(data);
    } catch (error) {
      console.error('Error fetching financial summary:', error);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/properties/${propertyId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      await propertyAPI.delete(propertyId);
      toast.success('Property deleted successfully');
      router.push('/dashboard/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'occupied':
        return 'bg-green-100 text-green-800';
      case 'vacant':
        return 'bg-muted text-muted-foreground';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-blue-100 text-blue-800';
      case 'sold':
        return 'bg-purple-100 text-purple-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!property) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Property Not Found</h2>
            <p className="text-muted-foreground mt-2">The property you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/dashboard/properties')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Properties
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: HomeIcon },
    { id: 'financials', name: 'Financials', icon: CurrencyDollarIcon },
    { id: 'maintenance', name: 'Maintenance', icon: WrenchScrewdriverIcon },
    { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
    { id: 'images', name: 'Images', icon: PhotoIcon },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/properties')}
                className="p-2 text-muted-foreground/70 hover:text-muted-foreground rounded-lg hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{property.name}</h1>
                <p className="text-muted-foreground">{property.property_code}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleEdit}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Property Status Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100/20 rounded-lg">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                  {property.status}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100/20 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold text-white">
                  R {property.monthly_rental_amount?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100/20 rounded-lg">
                <UserIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Tenant</p>
                <p className="font-semibold text-white">
                  {property.current_tenant?.full_name || 'Vacant'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20">
          <div className="border-b border-white/20">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-muted-foreground hover:text-white hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Property Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Property Details</h3>
                    <div className="bg-white/5 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium text-white">{property.property_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bedrooms:</span>
                        <span className="font-medium text-white">{property.bedrooms || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bathrooms:</span>
                        <span className="font-medium text-white">{property.bathrooms || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium text-white">{property.square_meters ? `${property.square_meters}m²` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parking:</span>
                        <span className="font-medium text-white">{property.parking_spaces || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Address</h3>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <MapPinIcon className="h-5 w-5 text-muted-foreground/70 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium text-white">{property.street_address}</p>
                          {property.suburb && <p className="text-muted-foreground">{property.suburb}</p>}
                          <p className="text-muted-foreground">{property.city}, {property.province}</p>
                          {property.postal_code && <p className="text-muted-foreground">{property.postal_code}</p>}
                          <p className="text-muted-foreground">{property.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Lease */}
                {property.current_lease && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Current Lease</h3>
                    <div className="bg-blue-500/10 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tenant</p>
                          <p className="font-medium text-white">{property.current_tenant?.full_name}</p>
                          <p className="text-sm text-muted-foreground/70">{property.current_tenant?.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lease Period</p>
                          <p className="font-medium text-white">
                            {new Date(property.current_lease.start_date).toLocaleDateString()} - {new Date(property.current_lease.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Rent</p>
                          <p className="font-medium text-white">
                            R {formatCurrency(property.current_lease.monthly_rent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                {financialSummary && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Financial Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-green-500/10 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                        <p className="text-lg font-semibold text-green-400">
                          R {formatCurrency(financialSummary.monthly_revenue)}
                        </p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                        <p className="text-lg font-semibold text-red-400">
                          R {formatCurrency(financialSummary.monthly_expenses)}
                        </p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Net Profit</p>
                        <p className="text-lg font-semibold text-blue-400">
                          R {formatCurrency(financialSummary.net_profit)}
                        </p>
                      </div>
                      <div className="bg-yellow-500/10 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Collection Rate</p>
                        <p className="text-lg font-semibold text-yellow-400">
                          {financialSummary.collection_rate || 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Financials Tab */}
            {activeTab === 'financials' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Financial Information</h3>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export Report
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Property Value</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Purchase Price:</span>
                        <span className="font-medium text-white">R {formatCurrency(property.purchase_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Market Value:</span>
                        <span className="font-medium text-white">R {formatCurrency(property.current_market_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Rental:</span>
                        <span className="font-medium text-white">R {formatCurrency(property.monthly_rental_amount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Ownership</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Owner</p>
                        <p className="font-medium text-white">{property.owner.full_name}</p>
                        <p className="text-sm text-muted-foreground/70">{property.owner.email}</p>
                      </div>
                      {property.property_manager && (
                        <div>
                          <p className="text-sm text-muted-foreground">Property Manager</p>
                          <p className="font-medium text-white">{property.property_manager.full_name}</p>
                          <p className="text-sm text-muted-foreground/70">{property.property_manager.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Maintenance Items</h3>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Maintenance
                  </button>
                </div>

                <div className="space-y-4">
                  {maintenanceItems.length === 0 ? (
                    <div className="text-center py-8">
                      <WrenchScrewdriverIcon className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                      <p className="text-muted-foreground">No maintenance items found</p>
                    </div>
                  ) : (
                    maintenanceItems.map((item) => (
                      <div key={item.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-white">{item.title}</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground/70">
                              <span>Category: {item.category}</span>
                              <span>Est. Cost: R {formatCurrency(item.estimated_cost)}</span>
                              {item.actual_cost && <span>Actual Cost: R {item.actual_cost.toLocaleString()}</span>}
                            </div>
                          </div>
                          <button className="text-blue-400 hover:text-blue-300">
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Property Documents</h3>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Upload Document
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {property.documents.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <DocumentTextIcon className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                      <p className="text-muted-foreground">No documents uploaded</p>
                    </div>
                  ) : (
                    property.documents.map((doc, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-8 w-8 text-blue-400" />
                            <div>
                              <p className="font-medium text-white">Document {index + 1}</p>
                              <p className="text-sm text-muted-foreground/70">PDF • 2.3 MB</p>
                            </div>
                          </div>
                          <button className="text-blue-400 hover:text-blue-300">
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Property Images</h3>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Upload Image
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {property.images.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <PhotoIcon className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                      <p className="text-muted-foreground">No images uploaded</p>
                    </div>
                  ) : (
                    property.images.map((image, index) => (
                      <div key={index} className="bg-white/5 rounded-lg overflow-hidden">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                          <img
                            src={image}
                            alt={`Property image ${index + 1}`}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <p className="font-medium text-white">Image {index + 1}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <button className="text-blue-400 hover:text-blue-300">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-blue-400 hover:text-blue-300">
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 