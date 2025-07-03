'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { leaseApi, tenantApi, unitApi, Lease, Tenant, Unit, formatCurrency } from '../lib/api';

interface LeaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lease: Lease) => void;
  lease?: Lease | null; // For editing existing lease
  preselectedUnitId?: number; // For creating lease from unit view
  preselectedTenantId?: number; // For creating lease from tenant view
}

interface FormData {
  tenant_id: number | '';
  unit_id: number | '';
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: 'active' | 'pending' | 'expired' | 'terminated';
}

const LeaseForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  lease, 
  preselectedUnitId,
  preselectedTenantId 
}: LeaseFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    tenant_id: preselectedTenantId || lease?.tenant.id || '',
    unit_id: preselectedUnitId || lease?.unit.id || '',
    start_date: lease?.start_date || '',
    end_date: lease?.end_date || '',
    monthly_rent: lease?.monthly_rent || 0,
    deposit_amount: lease?.deposit_amount || 0,
    status: lease?.status || 'pending',
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Auto-calculate deposit as monthly rent when rent changes
  useEffect(() => {
    if (!lease && formData.monthly_rent > 0) {
      setFormData(prev => ({ ...prev, deposit_amount: prev.monthly_rent }));
    }
  }, [formData.monthly_rent, lease]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tenantsData, unitsData] = await Promise.all([
        tenantApi.getAll(),
        unitApi.getAll()
      ]);
      
      setTenants(tenantsData.filter(tenant => tenant.is_active));
      setUnits(unitsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrors({ submit: 'Failed to load form data. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.tenant_id) {
      newErrors.tenant_id = 'Please select a tenant';
    }

    if (!formData.unit_id) {
      newErrors.unit_id = 'Please select a unit';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    if (formData.monthly_rent <= 0) {
      newErrors.monthly_rent = 'Monthly rent must be greater than 0';
    }

    if (formData.deposit_amount < 0) {
      newErrors.deposit_amount = 'Deposit amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const leaseData = {
        ...formData,
        tenant_id: Number(formData.tenant_id),
        unit_id: Number(formData.unit_id),
      };

      let savedLease: Lease;
      
      if (lease) {
        // Update existing lease
        savedLease = await leaseApi.update(lease.id, leaseData);
      } else {
        // Create new lease
        savedLease = await leaseApi.create(leaseData);
      }
      
      onSuccess(savedLease);
      onClose();
      
      // Reset form
      setFormData({
        tenant_id: preselectedTenantId || '',
        unit_id: preselectedUnitId || '',
        start_date: '',
        end_date: '',
        monthly_rent: 0,
        deposit_amount: 0,
        status: 'pending',
      });
      setErrors({});
      
    } catch (error) {
      console.error('Error saving lease:', error);
      setErrors({ submit: 'Failed to save lease. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedUnit = units.find(unit => unit.id === formData.unit_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {lease ? 'Edit Lease Agreement' : 'Create New Lease Agreement'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading form data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.submit && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tenant Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UserIcon className="h-4 w-4 inline mr-1" />
                  Tenant *
                </label>
                <select
                  value={formData.tenant_id}
                  onChange={(e) => handleChange('tenant_id', e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.tenant_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={!!preselectedTenantId}
                >
                  <option value="">Select a tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.email})
                    </option>
                  ))}
                </select>
                {errors.tenant_id && <p className="text-red-500 text-sm mt-1">{errors.tenant_id}</p>}
              </div>

              {/* Unit Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                  Unit *
                </label>
                <select
                  value={formData.unit_id}
                  onChange={(e) => handleChange('unit_id', e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.unit_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={!!preselectedUnitId}
                >
                  <option value="">Select a unit</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.number} - {unit.property} ({formatCurrency(unit.rent)}/month)
                    </option>
                  ))}
                </select>
                {errors.unit_id && <p className="text-red-500 text-sm mt-1">{errors.unit_id}</p>}
                {selectedUnit && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Property: {selectedUnit.property} | Status: {selectedUnit.status}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Lease Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Lease End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Rent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                  Monthly Rent *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    R
                  </span>
                  <input
                    type="number"
                    value={formData.monthly_rent || ''}
                    onChange={(e) => handleChange('monthly_rent', Number(e.target.value))}
                    className={`w-full pl-8 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.monthly_rent ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.monthly_rent && <p className="text-red-500 text-sm mt-1">{errors.monthly_rent}</p>}
              </div>

              {/* Deposit Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                  Deposit Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    R
                  </span>
                  <input
                    type="number"
                    value={formData.deposit_amount || ''}
                    onChange={(e) => handleChange('deposit_amount', Number(e.target.value))}
                    className={`w-full pl-8 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.deposit_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.deposit_amount && <p className="text-red-500 text-sm mt-1">{errors.deposit_amount}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Typically equals monthly rent
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                Lease Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (lease ? 'Update Lease' : 'Create Lease')}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default LeaseForm; 