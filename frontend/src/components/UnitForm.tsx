'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  HomeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { unitApi, Unit, formatCurrency } from '../lib/api';

interface UnitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (unit: Unit) => void;
  unit?: Unit | null; // For editing existing unit
  propertyId: number; // Required for creating new units
  propertyName?: string; // For display purposes
}

interface FormData {
  number: string;
  type: string;
  rent: number;
  size: number;
  status: 'available' | 'occupied' | 'maintenance';
  description: string;
}

const UnitForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  unit, 
  propertyId,
  propertyName 
}: UnitFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    number: unit?.number || '',
    type: unit?.type || 'apartment',
    rent: unit?.rent || 0,
    size: unit?.size || 0,
    status: unit?.status || 'available',
    description: (unit as any)?.description || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (unit) {
      setFormData({
        number: unit.number,
        type: unit.type,
        rent: unit.rent,
        size: unit.size,
        status: unit.status,
        description: (unit as any)?.description || '',
      });
    } else {
      // Reset form for new unit
      setFormData({
        number: '',
        type: 'apartment',
        rent: 0,
        size: 0,
        status: 'available',
        description: '',
      });
    }
    setErrors({});
  }, [unit, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.number.trim()) {
      newErrors.number = 'Unit number is required';
    }

    if (!formData.type) {
      newErrors.type = 'Unit type is required';
    }

    if (formData.rent <= 0) {
      newErrors.rent = 'Rent must be greater than 0';
    }

    if (formData.size <= 0) {
      newErrors.size = 'Size must be greater than 0';
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
      const unitData = {
        ...formData,
        property_id: propertyId,
        is_occupied: formData.status === 'occupied',
      };

      let savedUnit: Unit;
      
      if (unit) {
        // Update existing unit
        savedUnit = await unitApi.update(unit.id, unitData);
      } else {
        // Create new unit
        savedUnit = await unitApi.create(unitData);
      }
      
      onSuccess(savedUnit);
      onClose();
      
    } catch (error) {
      console.error('Error saving unit:', error);
      setErrors({ submit: 'Failed to save unit. Please try again.' });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <HomeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {unit ? 'Edit Unit' : 'Add New Unit'}
              </h2>
              {propertyName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {propertyName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unit Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                Unit Number *
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => handleChange('number', e.target.value)}
                placeholder="e.g., 101, A1, Shop 5"
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
            </div>

            {/* Unit Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <HomeIcon className="h-4 w-4 inline mr-1" />
                Unit Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="studio">Studio</option>
                <option value="townhouse">Townhouse</option>
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="warehouse">Warehouse</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
            </div>

            {/* Monthly Rent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                Monthly Rent (R) *
              </label>
              <input
                type="number"
                value={formData.rent}
                onChange={(e) => handleChange('rent', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.rent ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.rent && <p className="text-red-500 text-sm mt-1">{errors.rent}</p>}
              {formData.rent > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatCurrency(formData.rent)} per month
                </p>
              )}
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Size (m²) *
              </label>
              <input
                type="number"
                value={formData.size}
                onChange={(e) => handleChange('size', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.1"
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.size ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.size && <p className="text-red-500 text-sm mt-1">{errors.size}</p>}
              {formData.size > 0 && formData.rent > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formatCurrency(formData.rent / formData.size)} per m²
                </p>
              )}
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Additional details about the unit..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{unit ? 'Update Unit' : 'Create Unit'}</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UnitForm; 