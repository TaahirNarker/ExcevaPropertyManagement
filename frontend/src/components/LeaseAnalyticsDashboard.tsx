'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { analyticsApi, formatCurrency } from '../lib/api';
import type { LeaseAnalytics } from '../lib/api';

const LeaseAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<LeaseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | '90days' | '1year'>('30days');
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const analyticsData = await analyticsApi.getLeaseAnalytics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async (reportType: 'comprehensive' | 'financial' | 'occupancy') => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportAnalyticsReport(exportFormat, reportType);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lease-${reportType}-report.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getGrowthIndicator = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100;
    if (growth > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">+{growth.toFixed(1)}%</span>
        </div>
      );
    } else if (growth < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{growth.toFixed(1)}%</span>
        </div>
      );
    }
    return <span className="text-sm text-gray-500">No change</span>;
  };

  if (isLoading || !analytics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="bg-gray-100 dark:bg-gray-800">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-3" />
              Lease Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive insights into your property portfolio performance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Period Filter */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>
            
            {/* Export Options */}
            <div className="flex items-center space-x-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
              
              <button
                onClick={() => handleExportReport('comprehensive')}
                disabled={isExporting}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Leases</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {analytics.total_leases}
                </p>
              </div>
              <HomeIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">Active Leases</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {analytics.active_leases}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {((analytics.active_leases / analytics.total_leases) * 100).toFixed(1)}% occupancy
                </p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                  {analytics.expiring_soon}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {formatCurrency(analytics.total_revenue)}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {formatCurrency(analytics.monthly_revenue)}/month avg
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Trends</h2>
          <button className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
            <EyeIcon className="h-4 w-4" />
            <span className="text-sm">View Details</span>
          </button>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Revenue chart would be rendered here</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Integrate with Chart.js or similar library
            </p>
          </div>
        </div>
        
        {/* Revenue Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          {analytics.revenue_by_month.slice(-3).map((month, index) => (
            <div key={month.month} className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{month.month}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(month.revenue)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lease Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Lease Status Distribution</h2>
          
          <div className="space-y-4">
            {analytics.lease_status_distribution.map((status) => {
              const percentage = (status.count / analytics.total_leases) * 100;
              const colors = {
                active: 'bg-green-500',
                pending: 'bg-yellow-500',
                expired: 'bg-red-500',
                terminated: 'bg-gray-500'
              };
              const bgColor = colors[status.status as keyof typeof colors] || 'bg-blue-500';
              
              return (
                <div key={status.status}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {status.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {status.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-2 rounded-full ${bgColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Properties */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Top Performing Properties</h2>
          
          <div className="space-y-4">
            {analytics.top_performing_properties.map((property, index) => (
              <div key={property.property} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {property.property}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(property.revenue)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Export Options</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExportReport('financial')}
            disabled={isExporting}
            className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Financial Report</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revenue & payment analysis</p>
            </div>
          </button>

          <button
            onClick={() => handleExportReport('occupancy')}
            disabled={isExporting}
            className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <HomeIcon className="h-6 w-6 text-gray-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Occupancy Report</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lease status & utilization</p>
            </div>
          </button>

          <button
            onClick={() => handleExportReport('comprehensive')}
            disabled={isExporting}
            className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <DocumentTextIcon className="h-6 w-6 text-gray-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Full Report</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Complete analytics overview</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaseAnalyticsDashboard; 