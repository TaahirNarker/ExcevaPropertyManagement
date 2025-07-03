'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BuildingOfficeIcon, PlusIcon, HomeIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';
import { propertyApi, unitApi, landlordApi, Property, Unit, Landlord } from '../../../lib/api';
import { useRouter } from 'next/navigation';

interface PropertyFormData {
  name: string;
  address: string;
  address_line_2?: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  property_type: string;
  property_category: string;
  purchase_price: number;
  current_market_value: number;
  total_units: number;
  bedrooms: number;
  building_size: number;
  description: string;
  landlord_name: string;
  landlord_phone: string;
  landlord_email: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
}

const PropertiesPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    address_line_2: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    property_type: 'house',
    property_category: 'residential',
    purchase_price: 0,
    current_market_value: 0,
    total_units: 1,
    bedrooms: 0,
    building_size: 0,
    description: '',
    landlord_name: '',
    landlord_phone: '',
    landlord_email: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_name: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching properties, units, and landlords...');
      const [propertiesData, unitsData] = await Promise.all([
        propertyApi.getAll(),
        unitApi.getAll()
      ]);

      // Try to fetch landlords but don't fail if API doesn't exist yet
      let landlordsData: Landlord[] = [];
      try {
        landlordsData = await landlordApi.getAll();
      } catch (err) {
        console.log('Landlords API not available yet');
      }
      
      console.log('🏢 Properties received:', propertiesData);
      console.log('🏠 Units received:', unitsData);
      console.log('👤 Landlords received:', landlordsData);
      
      setProperties(propertiesData);
      setUnits(unitsData);
      setLandlords(landlordsData);
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Unable to connect to Django backend. Please ensure the server is running on http://localhost:8000');
      setProperties([]);
      setUnits([]);
      setLandlords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name === 'total_units' ? Number(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.address.trim()) {
      alert('Please fill in all required fields (Property Name and Address)');
      return;
    }

    if (!formData.property_type || formData.property_type === '') {
      alert('Please select a property type');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('🔄 Creating property:', formData);
      
      // Filter data to only include fields that the Django backend expects
      const backendData = {
        name: formData.name,
        address: [
          formData.address,
          formData.address_line_2,
          formData.suburb,
          formData.city,
          formData.province,
          formData.postal_code
        ].filter(Boolean).join(', '), // Combine all address fields and filter out empty ones
        property_type: formData.property_type,
        purchase_price: formData.purchase_price.toString(),
        current_market_value: formData.current_market_value.toString(),
        total_units: formData.total_units,
        description: [
          formData.description,
          formData.bedrooms > 0 ? `Bedrooms: ${formData.bedrooms}` : '',
          formData.building_size > 0 ? `Building Size: ${formData.building_size} m²` : '',
          formData.landlord_name ? `Landlord: ${formData.landlord_name}` : '',
          formData.landlord_phone ? `Contact: ${formData.landlord_phone}` : '',
          formData.bank_account_name ? `Bank Account: ${formData.bank_account_name} (${formData.bank_name})` : ''
        ].filter(Boolean).join('\n') // Combine description with additional details
      };
      
      console.log('🔄 Sending to backend:', backendData);
      
      const newProperty = await propertyApi.create(backendData);
      console.log('✅ Property created:', newProperty);
      
      // Refresh the data to show the new property
      await fetchData();
      
      // Reset form and close modal
      setFormData({
        name: '',
        address: '',
        address_line_2: '',
        suburb: '',
        city: '',
        province: '',
        postal_code: '',
        property_type: 'residential',
        property_category: 'residential',
        purchase_price: 0,
        current_market_value: 0,
        total_units: 1,
        bedrooms: 0,
        building_size: 0,
        description: '',
        landlord_name: '',
        landlord_phone: '',
        landlord_email: '',
        bank_account_name: '',
        bank_account_number: '',
        bank_name: ''
      });
      setShowAddModal(false);
      
      alert('✅ Property created successfully! All your comprehensive details have been saved in the description field.');
    } catch (error: any) {
      console.error('❌ Error creating property:', error);
      const errorMessage = error.response?.data ? 
        `Failed to create property: ${JSON.stringify(error.response.data)}` : 
        'Failed to create property. Please check your input and try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnits = units.length;
  const occupiedUnits = units.filter(unit => unit.is_occupied).length;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Properties...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">⚠️ Backend Connection Failed</h3>
              <p className="text-sm">{error}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              <h4 className="font-semibold mb-2">🔧 Quick Fix:</h4>
              <ol className="text-sm text-left space-y-1">
                <li>1. Navigate to the Django project directory</li>
                <li>2. Activate virtual environment</li>
                <li>3. Run: <code className="bg-blue-100 px-1 rounded">python manage.py runserver 8000</code></li>
                <li>4. Refresh this page</li>
              </ol>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Properties & Units
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your property portfolio and individual units
                </p>
                <div className="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  <p className="text-sm">✅ Connected to Django backend - Showing real-time data</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Property</span>
              </motion.button>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="flex gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search properties by name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <select className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300">
                <option value="">All Properties</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Properties</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{properties.length}</p>
                </div>
                <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUnits}</p>
                </div>
                <HomeIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupied Units</p>
                  <p className="text-2xl font-bold text-green-600">{occupiedUnits}</p>
                  <p className="text-sm text-gray-500">{occupancyRate}% Occupancy</p>
                </div>
                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vacant Units</p>
                  <p className="text-2xl font-bold text-red-600">{vacantUnits}</p>
                  <p className="text-sm text-gray-500">{(100 - parseFloat(occupancyRate)).toFixed(1)}% Vacant</p>
                </div>
                <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">○</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Properties List */}
          {filteredProperties.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center py-12"
            >
              <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Properties Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm ? 'No properties match your search criteria.' : 'Add your first property to get started.'}
              </p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Property</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
            >
              {filteredProperties.map((property, index) => {
                const propertyUnits = units.filter(unit => unit.property_id === property.id);
                const propertyOccupied = propertyUnits.filter(unit => unit.is_occupied).length;
                const propertyVacant = propertyUnits.length - propertyOccupied;
                
                return (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {property.name}
                        </h3>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.address}</span>
                        </div>
                      </div>
                      <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{propertyUnits.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Units</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{propertyOccupied}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Occupied</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{propertyVacant}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Vacant</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => router.push(`/property-management/properties/${property.id}`)}
                        className="flex-1 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => router.push(`/property-management/properties/${property.id}/units`)}
                        className="flex-1 bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                      >
                        Manage Units
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Admin Panel Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white"
          >
            <h3 className="text-xl font-semibold mb-2">Advanced Property Management</h3>
            <p className="text-blue-100 mb-4">
              For advanced features like document uploads, detailed property settings, and bulk operations,
              you can access the Django admin interface.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="http://localhost:8000/admin/properties/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Advanced Properties Admin
              </a>
              <a
                href="/property-management"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Back to Dashboard
              </a>
            </div>
          </motion.div>

          {/* Add Property Modal */}
          <AnimatePresence>
            {showAddModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => !isSubmitting && setShowAddModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Property</h2>
                    <button
                      onClick={() => !isSubmitting && setShowAddModal(false)}
                      disabled={isSubmitting}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Form sections with tabs */}
                    <div className="mb-6">
                      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                        <button
                          type="button"
                          className="flex-1 py-2 px-4 rounded-md bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm font-medium"
                        >
                          Basic Info
                        </button>
                        <button
                          type="button"
                          className="flex-1 py-2 px-4 rounded-md text-gray-600 dark:text-gray-400 font-medium"
                          disabled
                        >
                          Property Details
                        </button>
                        <button
                          type="button"
                          className="flex-1 py-2 px-4 rounded-md text-gray-600 dark:text-gray-400 font-medium"
                          disabled
                        >
                          Owner & Banking
                        </button>
                      </div>
                    </div>

                    {/* Basic Information Section */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Property Display Name */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Display Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            maxLength={40}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            placeholder="Reporting display name (Max 40 characters)"
                          />
                        </div>

                        {/* Property Category */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Category
                          </label>
                          <select
                            name="property_category"
                            value={formData.property_category}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="industrial">Industrial</option>
                            <option value="retail">Retail</option>
                            <option value="mixed_use">Mixed Use</option>
                          </select>
                        </div>

                        {/* Property Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Type
                          </label>
                          <select
                            name="property_type"
                            value={formData.property_type}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="">-- Select a property type --</option>
                            <option value="apartment">Apartment</option>
                            <option value="bungalow">Bungalow</option>
                            <option value="cluster">Cluster</option>
                            <option value="complex">Complex</option>
                            <option value="cottage">Cottage</option>
                            <option value="farm">Farm</option>
                            <option value="smallholding">SmallHolding</option>
                            <option value="flat">Flat</option>
                            <option value="house">House</option>
                            <option value="retirement">Retirement</option>
                            <option value="room">Room</option>
                            <option value="townhouse">Townhouse</option>
                            <option value="sectional_title">SectionalTitle</option>
                            <option value="freehold">Freehold</option>
                          </select>
                        </div>
                      </div>

                      {/* Address Section */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Property Address</h4>
                        
                        {/* Building Number & Street Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Building No. & Name / Street No. & Name *
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            placeholder="e.g., 123 Main Street or Sunset Apartments, 45 Oak Avenue"
                          />
                        </div>

                        {/* Address Line 2 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Address line 2 (Optional)
                          </label>
                          <input
                            type="text"
                            name="address_line_2"
                            value={formData.address_line_2}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            placeholder="Apartment, suite, unit, building, floor, etc."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Suburb */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Suburb
                            </label>
                            <input
                              type="text"
                              name="suburb"
                              value={formData.suburb}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="e.g., Rondebosch"
                            />
                          </div>

                          {/* City */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="e.g., Cape Town"
                            />
                          </div>

                          {/* Postal Code */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              name="postal_code"
                              value={formData.postal_code}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="e.g., 7700"
                            />
                          </div>
                        </div>

                        {/* Province */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Province
                          </label>
                          <select
                            name="province"
                            value={formData.province}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="">--Province--</option>
                            <option value="western_cape">Western Cape</option>
                            <option value="eastern_cape">Eastern Cape</option>
                            <option value="northern_cape">Northern Cape</option>
                            <option value="free_state">Free State</option>
                            <option value="kwazulu_natal">KwaZulu-Natal</option>
                            <option value="north_west">North West</option>
                            <option value="gauteng">Gauteng</option>
                            <option value="mpumalanga">Mpumalanga</option>
                            <option value="limpopo">Limpopo</option>
                          </select>
                        </div>

                        {/* Location Note */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            <strong>Location:</strong> Please click on the map to set a location.
                            <br />
                            <span className="text-xs italic">Note: Map integration will be implemented in the next update</span>
                          </p>
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Property Details</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Bedrooms */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Bedrooms
                            </label>
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, bedrooms: Math.max(0, prev.bedrooms - 1) }))}
                                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-medium transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                name="bedrooms"
                                value={formData.bedrooms}
                                onChange={handleInputChange}
                                min="0"
                                className="w-20 text-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, bedrooms: prev.bedrooms + 1 }))}
                                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-medium transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Building Size */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Building size (m²)
                            </label>
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, building_size: Math.max(0, prev.building_size - 10) }))}
                                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-medium transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                name="building_size"
                                value={formData.building_size}
                                onChange={handleInputChange}
                                min="0"
                                step="10"
                                className="w-24 text-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, building_size: prev.building_size + 10 }))}
                                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-medium transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Purchase Price */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Purchase Price (ZAR)
                            </label>
                            <input
                              type="number"
                              name="purchase_price"
                              value={formData.purchase_price || ''}
                              onChange={handleInputChange}
                              min="0"
                              step="1000"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="0"
                            />
                          </div>

                          {/* Current Market Value */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Market Value (ZAR)
                            </label>
                            <input
                              type="number"
                              name="current_market_value"
                              value={formData.current_market_value || ''}
                              onChange={handleInputChange}
                              min="0"
                              step="1000"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="0"
                            />
                          </div>

                          {/* Total Units */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Total Units
                            </label>
                            <input
                              type="number"
                              name="total_units"
                              value={formData.total_units || ''}
                              onChange={handleInputChange}
                              min="1"
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Landlord Information */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Landlord Information</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Select Landlord {landlords.length > 0 && '(or enter manually)'}
                            </label>
                            {landlords.length > 0 ? (
                              <select
                                name="landlord_name"
                                value={formData.landlord_name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              >
                                <option value="">Select a landlord or enter manually</option>
                                {landlords.map(landlord => (
                                  <option key={landlord.id} value={landlord.name}>
                                    {landlord.name} - {landlord.phone}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                name="landlord_name"
                                value={formData.landlord_name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                                placeholder="Enter landlord name"
                              />
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="landlord_phone"
                              value={formData.landlord_phone}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="e.g., +27 11 123 4567"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Email Address
                            </label>
                            <input
                              type="email"
                              name="landlord_email"
                              value={formData.landlord_email}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="landlord@example.com"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bank Account Information */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Bank Account for Invoices</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              name="bank_account_name"
                              value={formData.bank_account_name}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="Account holder name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Account Number
                            </label>
                            <input
                              type="text"
                              name="bank_account_number"
                              value={formData.bank_account_number}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="Account number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              name="bank_name"
                              value={formData.bank_name}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              placeholder="e.g., FNB, Standard Bank, ABSA"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Additional Notes & Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          placeholder="Additional property details, special features, maintenance notes, etc."
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.name.trim() || !formData.address.trim()}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Property'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default PropertiesPage; 