'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { Unit, Lease, Tenant, leaseApi, formatCurrency, formatDate } from '../lib/api';
import LeaseForm from './LeaseForm';
import TenantForm from './TenantForm';

interface UnitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  onUpdate?: () => void;
}

const UnitDetailModal = ({ isOpen, onClose, unit, onUpdate }: UnitDetailModalProps) => {
  const [currentLease, setCurrentLease] = useState<Lease | null>(null);
  const [allLeases, setAllLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  useEffect(() => {
    if (isOpen && unit) {
      fetchUnitLeases();
    }
  }, [isOpen, unit]);

  const fetchUnitLeases = async () => {
    if (!unit) return;
    
    try {
      setIsLoading(true);
      const allLeases = await leaseApi.getAll();
      const unitLeases = allLeases.filter(lease => lease.unit.id === unit.id);
      
      setAllLeases(unitLeases);
      
      // Find current active lease
      const activeLease = unitLeases.find(lease => lease.status === 'active');
      setCurrentLease(activeLease || null);
      
    } catch (error) {
      console.error('Error fetching unit leases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaseSuccess = (lease: Lease) => {
    fetchUnitLeases();
    if (onUpdate) onUpdate();
    setSelectedLease(null);
  };

  const handleTenantSuccess = () => {
    fetchUnitLeases();
    if (onUpdate) onUpdate();
  };

  const handleCreateLease = () => {
    setSelectedLease(null);
    setShowLeaseForm(true);
  };

  const handleEditLease = (lease: Lease) => {
    setSelectedLease(lease);
    setShowLeaseForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'terminated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !unit) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {unit.number}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{unit.property}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Unit Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Unit Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Monthly Rent</label>
                  <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(unit.rent)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                  <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    unit.status === 'available' ? 'bg-green-100 text-green-800' :
                    unit.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {unit.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Size</label>
                  <p className="font-medium text-gray-900 dark:text-white">{unit.size} m²</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Type</label>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{unit.type}</p>
                </div>
              </div>
            </div>

            {/* Current Lease/Tenant Information */}
            {currentLease ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Lease</h3>
                  <button
                    onClick={() => handleEditLease(currentLease)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{currentLease.tenant.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{currentLease.tenant.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-gray-500 dark:text-gray-400">Lease Period</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(currentLease.start_date)} - {formatDate(currentLease.end_date)}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400">Monthly Rent</label>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(currentLease.monthly_rent)}</p>
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400">Deposit</label>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(currentLease.deposit_amount)}</p>
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400">Status</label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(currentLease.status)}`}>
                        {currentLease.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleEditLease(currentLease)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Manage Lease
                    </button>
                    <button
                      onClick={() => setShowTenantForm(true)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Edit Tenant
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-6 text-center">
                <BuildingOfficeIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Active Lease</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This unit is currently vacant. Create a new lease to get started.
                </p>
                <button
                  onClick={handleCreateLease}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 mx-auto transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create New Lease</span>
                </button>
              </div>
            )}

            {/* Lease History */}
            {allLeases.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lease History</h3>
                  <button
                    onClick={handleCreateLease}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center space-x-1 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>New Lease</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {allLeases.map((lease) => (
                    <div
                      key={lease.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{lease.tenant.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(lease.status)}`}>
                            {lease.status}
                          </span>
                          <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(lease.monthly_rent)}</p>
                          <button
                            onClick={() => handleEditLease(lease)}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading lease information...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Lease Form Modal */}
      <LeaseForm
        isOpen={showLeaseForm}
        onClose={() => {
          setShowLeaseForm(false);
          setSelectedLease(null);
        }}
        onSuccess={handleLeaseSuccess}
        lease={selectedLease}
        preselectedUnitId={unit.id}
      />

      {/* Tenant Form Modal */}
      <TenantForm
        isOpen={showTenantForm}
        onClose={() => setShowTenantForm(false)}
        onSuccess={handleTenantSuccess}
        tenant={currentLease?.tenant}
      />
    </>
  );
};

export default UnitDetailModal; 