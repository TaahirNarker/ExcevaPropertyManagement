'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BuildingOfficeIcon, 
  HomeIcon, 
  PlusIcon,
  ArrowLeftIcon,
  UserIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../../../components/Layout';
import UnitDetailModal from '../../../../../components/UnitDetailModal';
import UnitForm from '../../../../../components/UnitForm';
import { propertyApi, unitApi, formatCurrency, Property, Unit } from '../../../../../lib/api';

const UnitsManagementPage = () => {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnitDetail, setShowUnitDetail] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);

  const propertyId = parseInt(params.id as string);

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching property and units for ID:', propertyId);
      
      const [propertyData, allUnits] = await Promise.all([
        propertyApi.getById(propertyId),
        unitApi.getAll()
      ]);

      setProperty(propertyData);
      
      // Filter units for this property
      const propertyUnits = allUnits.filter(unit => unit.property_id === propertyId);
      setUnits(propertyUnits);

      console.log('✅ Data loaded:', {
        property: propertyData,
        units: propertyUnits.length
      });

    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Failed to load property and units data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitSuccess = (unit: Unit) => {
    fetchData(); // Refresh the data
    setShowUnitForm(false);
    setUnitToEdit(null);
  };

  const handleAddUnit = () => {
    setUnitToEdit(null);
    setShowUnitForm(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setUnitToEdit(unit);
    setShowUnitForm(true);
  };

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
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Units...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error || !property) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">⚠️ Property Not Found</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => router.push('/property-management/properties')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
            >
              Back to Properties
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const occupiedUnits = units.filter(unit => unit.is_occupied).length;
  const vacantUnits = units.length - occupiedUnits;
  const totalRent = units.reduce((sum, unit) => sum + unit.rent, 0);

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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/property-management/properties/${propertyId}`)}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>Back to Property</span>
                </button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Units - {property.name}
                </h1>
              </div>
              <button 
                onClick={handleAddUnit}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Unit</span>
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Units</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{units.length}</p>
                  </div>
                  <HomeIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupied</p>
                    <p className="text-2xl font-bold text-green-600">{occupiedUnits}</p>
                    <p className="text-xs text-gray-500">{units.length > 0 ? ((occupiedUnits / units.length) * 100).toFixed(1) : 0}% occupancy</p>
                  </div>
                  <UserIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vacant</p>
                    <p className="text-2xl font-bold text-red-600">{vacantUnits}</p>
                    <p className="text-xs text-gray-500">{units.length > 0 ? ((vacantUnits / units.length) * 100).toFixed(1) : 0}% vacant</p>
                  </div>
                  <HomeIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Rent</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRent)}</p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Units Grid */}
          {units.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Units Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add units to this property to get started.
              </p>
              <button 
                onClick={handleAddUnit}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add First Unit</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {units.map((unit, index) => (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setSelectedUnit(unit);
                    setShowUnitDetail(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Unit {unit.number}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        unit.is_occupied 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {unit.is_occupied ? 'Occupied' : 'Vacant'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUnit(unit);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Delete unit functionality
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="text-gray-900 dark:text-white">{unit.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Size:</span>
                      <span className="text-gray-900 dark:text-white">{unit.size} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Rent:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(unit.rent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-medium ${
                        unit.status === 'available' ? 'text-green-600' :
                        unit.status === 'occupied' ? 'text-blue-600' : 'text-yellow-600'
                      }`}>
                        {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnit(unit);
                          setShowUnitDetail(true);
                        }}
                        className="flex-1 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        {unit.is_occupied ? 'View Lease' : 'Create Lease'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnit(unit);
                          setShowUnitDetail(true);
                        }}
                        className="flex-1 bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Unit Form Modal */}
        <UnitForm
          isOpen={showUnitForm}
          onClose={() => {
            setShowUnitForm(false);
            setUnitToEdit(null);
          }}
          onSuccess={handleUnitSuccess}
          unit={unitToEdit}
          propertyId={propertyId}
          propertyName={property?.name}
        />

        {/* Unit Detail Modal */}
        <UnitDetailModal
          isOpen={showUnitDetail}
          onClose={() => {
            setShowUnitDetail(false);
            setSelectedUnit(null);
          }}
          unit={selectedUnit}
          onUpdate={fetchData}
        />
      </div>
    </Layout>
  );
};

export default UnitsManagementPage; 