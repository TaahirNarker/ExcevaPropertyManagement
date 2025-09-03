/**
 * Tenant Assignment Modal Component
 * Allows users to assign tenants to vacant properties
 */

'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { propertiesAPI } from '@/lib/properties-api';
import toast from 'react-hot-toast';

interface Tenant {
  id: number;
  tenant_code: string;
  name: string;
  email: string;
  phone: string;
  employment_status: string;
  monthly_income?: string;
}

interface Property {
  id: string;
  property_code: string;
  name: string;
  monthly_rental_amount?: number;
}

interface TenantAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyCode: string;
  propertyName: string;
  onSuccess: () => void;
}

export default function TenantAssignmentModal({
  isOpen,
  onClose,
  propertyCode,
  propertyName,
  onSuccess
}: TenantAssignmentModalProps) {
  // State
  const [loading, setLoading] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  // Load available tenants when modal opens
  useEffect(() => {
    if (isOpen && propertyCode) {
      loadAvailableTenants();
    }
  }, [isOpen, propertyCode]);

  // Set default dates when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(today.getFullYear() + 1);
      
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(oneYearFromNow.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Load available tenants
  const loadAvailableTenants = async () => {
    try {
      setLoading(true);
      const data = await propertiesAPI.getAvailableTenants(propertyCode);
      setAvailableTenants(data.available_tenants);
      setProperty(data.property);
      
      // Set default monthly rent if property has it
      if (data.property.monthly_rental_amount) {
        setMonthlyRent(data.property.monthly_rental_amount.toString());
      }
    } catch (error) {
      console.error('Error loading available tenants:', error);
      toast.error('Failed to load available tenants');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTenantId || !startDate || !endDate || !monthlyRent) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      await propertiesAPI.assignTenant(propertyCode, {
        tenant_id: selectedTenantId as number,
        start_date: startDate,
        end_date: endDate,
        monthly_rent: parseFloat(monthlyRent),
        deposit_amount: depositAmount ? parseFloat(depositAmount) : undefined
      });

      toast.success('Tenant assigned successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning tenant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign tenant');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    setSelectedTenantId('');
    setStartDate('');
    setEndDate('');
    setMonthlyRent('');
    setDepositAmount('');
    setAvailableTenants([]);
    setProperty(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-card text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-muted/30 px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Assign Tenant to Property
              </h3>
              <button
                onClick={handleClose}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {propertyName} ({propertyCode})
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Tenant Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Tenant *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value ? parseInt(e.target.value) : '')}
                  className="block w-full pl-10 pr-3 py-2 border border-border rounded-md bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a tenant...</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.tenant_code}) - {tenant.employment_status}
                    </option>
                  ))}
                </select>
              </div>
              {availableTenants.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground mt-1">
                  No available tenants found. All active tenants may already have leases.
                </p>
              )}
            </div>

            {/* Lease Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date *
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Date *
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Monthly Rent *
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    placeholder="0.00"
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Deposit Amount
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Selected Tenant Info */}
            {selectedTenantId && (
              <div className="bg-muted/30 p-3 rounded-md">
                <h4 className="text-sm font-medium text-foreground mb-2">Selected Tenant Details</h4>
                {(() => {
                  const tenant = availableTenants.find(t => t.id === selectedTenantId);
                  if (!tenant) return null;
                  
                  return (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Name:</span> {tenant.name}</p>
                      <p><span className="font-medium">Code:</span> {tenant.tenant_code}</p>
                      <p><span className="font-medium">Email:</span> {tenant.email}</p>
                      <p><span className="font-medium">Phone:</span> {tenant.phone}</p>
                      <p><span className="font-medium">Employment:</span> {tenant.employment_status}</p>
                      {tenant.monthly_income && (
                        <p><span className="font-medium">Monthly Income:</span> R{tenant.monthly_income}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedTenantId || availableTenants.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Assigning...' : 'Assign Tenant'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
