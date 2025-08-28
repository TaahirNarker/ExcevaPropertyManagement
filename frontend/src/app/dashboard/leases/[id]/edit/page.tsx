/**
 * Lease Edit Page
 * Allows editing of lease details
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { LeaseAPI, Lease } from '@/lib/lease-api';

const leaseAPI = new LeaseAPI();

interface LeaseFormData {
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  lease_type: string;
  rental_frequency: string;
  rent_due_day: number;
  late_fee_type: string;
  late_fee_percentage: number;
  late_fee_amount: number;
  grace_period_days: number;
  lease_duration_months: number;
  auto_renew: boolean;
  notice_period_days: number;
  terms: string;
  notes: string;
}

export default function EditLeasePage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<LeaseFormData>({
    start_date: '',
    end_date: '',
    monthly_rent: 0,
    deposit_amount: 0,
    status: 'active',
    lease_type: 'Fixed',
    rental_frequency: 'Monthly',
    rent_due_day: 1,
    late_fee_type: 'percentage',
    late_fee_percentage: 5,
    late_fee_amount: 0,
    grace_period_days: 5,
    lease_duration_months: 12,
    auto_renew: false,
    notice_period_days: 30,
    terms: '',
    notes: '',
  });

  // Fetch lease data
  useEffect(() => {
    const fetchLease = async () => {
      try {
        setLoading(true);
        const leaseData = await leaseAPI.getLease(parseInt(leaseId));
        setLease(leaseData);
        
        // Populate form with lease data
        setFormData({
          start_date: leaseData.start_date,
          end_date: leaseData.end_date,
          monthly_rent: leaseData.monthly_rent,
          deposit_amount: leaseData.deposit_amount,
          status: leaseData.status,
          lease_type: leaseData.lease_type,
          rental_frequency: leaseData.rental_frequency,
          rent_due_day: leaseData.rent_due_day,
          late_fee_type: leaseData.late_fee_type,
          late_fee_percentage: leaseData.late_fee_percentage || 5,
          late_fee_amount: leaseData.late_fee_amount || 0,
          grace_period_days: leaseData.grace_period_days,
          lease_duration_months: leaseData.lease_duration_months,
          auto_renew: leaseData.auto_renew,
          notice_period_days: leaseData.notice_period_days,
          terms: leaseData.terms || '',
          notes: leaseData.notes || '',
        });
        
      } catch (err) {
        console.error('Error fetching lease:', err);
        setError('Failed to load lease data');
      } finally {
        setLoading(false);
      }
    };

    if (leaseId) {
      fetchLease();
    }
  }, [leaseId]);

  const handleInputChange = (field: keyof LeaseFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Convert form data to the format expected by the API
      const updateData = {
        ...formData,
        monthly_rent: Number(formData.monthly_rent),
        deposit_amount: Number(formData.deposit_amount),
        rent_due_day: Number(formData.rent_due_day),
        late_fee_percentage: Number(formData.late_fee_percentage),
        late_fee_amount: Number(formData.late_fee_amount),
        grace_period_days: Number(formData.grace_period_days),
        lease_duration_months: Number(formData.lease_duration_months),
        notice_period_days: Number(formData.notice_period_days),
      };

      await leaseAPI.updateLease(parseInt(leaseId), updateData);
      toast.success('Lease updated successfully!');
      router.push(`/dashboard/leases/${leaseId}`);
      
    } catch (error) {
      console.error('Error updating lease:', error);
      toast.error('Failed to update lease');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/leases/${leaseId}`);
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Lease">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !lease) {
    return (
      <DashboardLayout title="Edit Lease">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Lease</h3>
            <p className="text-muted-foreground">{error || 'Lease not found'}</p>
            <button
              onClick={() => router.push('/dashboard/leases')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Edit Lease - ${lease.property?.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Edit Lease
              </h1>
              <p className="text-muted-foreground">
                {lease.property?.name} • {lease.tenant?.name}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-4 py-2 text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Lease Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lease Dates */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Financial Details */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Monthly Rent
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthly_rent}
                  onChange={(e) => handleInputChange('monthly_rent', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Deposit Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount}
                  onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Lease Type and Status */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Lease Type
                </label>
                <select
                  value={formData.lease_type}
                  onChange={(e) => handleInputChange('lease_type', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Fixed">Fixed Term</option>
                  <option value="Month-to-Month">Month-to-Month</option>
                  <option value="Periodic">Periodic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              {/* Payment Details */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Payment Frequency
                </label>
                <select
                  value={formData.rental_frequency}
                  onChange={(e) => handleInputChange('rental_frequency', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Rent Due Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.rent_due_day}
                  onChange={(e) => handleInputChange('rent_due_day', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Late Fee Settings */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Late Fee Type
                </label>
                <select
                  value={formData.late_fee_type}
                  onChange={(e) => handleInputChange('late_fee_type', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage</option>
                  <option value="amount">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {formData.late_fee_type === 'percentage' ? 'Late Fee Percentage (%)' : 'Late Fee Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.late_fee_type === 'percentage' ? formData.late_fee_percentage : formData.late_fee_amount}
                  onChange={(e) => handleInputChange(
                    formData.late_fee_type === 'percentage' ? 'late_fee_percentage' : 'late_fee_amount', 
                    parseFloat(e.target.value)
                  )}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Grace Period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.grace_period_days}
                  onChange={(e) => handleInputChange('grace_period_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notice Period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.notice_period_days}
                  onChange={(e) => handleInputChange('notice_period_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Auto Renew */}
            <div className="mt-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.auto_renew}
                  onChange={(e) => handleInputChange('auto_renew', e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-white">Auto-renew lease</span>
              </label>
            </div>

            {/* Terms and Notes */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter lease terms and conditions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-white/20 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckIcon className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
