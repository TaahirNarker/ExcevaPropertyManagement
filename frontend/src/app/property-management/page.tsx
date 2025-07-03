'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import Layout from '../../components/Layout';
// import ProblematicTenantsCard from '../../components/ProblematicTenantsCard';
import { dashboardApi, formatCurrency, DashboardSummary } from '../../lib/api';

const PropertyManagementDashboard = () => {
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Fetching dashboard summary...');
        const summaryData = await dashboardApi.getSummary();
        console.log('📊 Dashboard data received:', summaryData);
        
        setStats(summaryData);
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        setError('Unable to connect to Django backend. Please ensure the server is running on http://localhost:8000');
        setStats(null); // No fallback data
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Properties',
      description: 'Manage properties and units',
      icon: BuildingOfficeIcon,
      href: '/property-management/properties',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Leases',
      description: 'Manage tenant agreements',
      icon: UsersIcon,
      href: '/property-management/leases',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Tenants',
      description: 'Manage tenant information',
      icon: UsersIcon,
      href: '/property-management/tenants',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Finance',
      description: 'Invoices and payments',
      icon: CurrencyDollarIcon,
      href: '/property-management/finance',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Reports',
      description: 'Financial reports and analytics',
      icon: ChartBarIcon,
      href: '/property-management/reports',
      color: 'from-orange-500 to-orange-600'
    }
  ];

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
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Property Control System...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error || !stats) {
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

  const occupancyRate = stats.total_units > 0 ? 
    ((stats.occupied_units / stats.total_units) * 100).toFixed(1) : '0';
  
  const collectionRate = stats.rent_due > 0 ? 
    ((stats.rent_collected / stats.rent_due) * 100).toFixed(1) : '0';

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.total_properties.toString(),
      icon: HomeIcon,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Units',
      value: `${stats.occupied_units}/${stats.total_units}`,
      subtitle: `${occupancyRate}% Occupied`,
      icon: BuildingOfficeIcon,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Active Tenants',
      value: stats.total_tenants.toString(),
      icon: UserGroupIcon,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Monthly Rent Due',
      value: formatCurrency(stats.rent_due),
      icon: DocumentTextIcon,
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Rent Collected',
      value: formatCurrency(stats.rent_collected),
      subtitle: `${collectionRate}% Collection Rate`,
      icon: CreditCardIcon,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Outstanding Amount',
      value: formatCurrency(stats.outstanding_amount),
      icon: CurrencyDollarIcon,
      color: 'from-red-500 to-red-600'
    }
  ];

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
                  Property Control System
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Real-time property portfolio management
                </p>
                <div className="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  <p className="text-sm">✅ Connected to Django backend at http://localhost:8000</p>
                  <p className="text-xs mt-1">Displaying real-time data from database</p>
                </div>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="max-w-md">
              <input
                type="text"
                placeholder="Search properties, tenants, or invoices..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {statCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (index * 0.1) }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                    {card.subtitle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{card.subtitle}</p>
                    )}
                  </div>
                  <div className={`p-3 bg-gradient-to-r ${card.color} rounded-lg`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Problematic Tenants Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            {/* <ProblematicTenantsCard 
              onViewTenant={(tenantId) => {
                // Navigate to tenant management with the specific tenant highlighted
                window.location.href = `/property-management/tenants#tenant-${tenantId}`;
              }}
            /> */}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <motion.a
                  key={action.title}
                  href={action.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`p-3 bg-gradient-to-r ${action.color} rounded-lg mb-4 w-fit`}>
                    <action.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {action.description}
                  </p>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Admin Panel Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Django Admin Panel</h3>
                <p className="text-blue-100">
                  Access the full administrative interface for advanced management
                </p>
              </div>
              <a
                href="http://localhost:8000/admin/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
              >
                Open Admin Panel
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default PropertyManagementDashboard; 