'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChartBarIcon, DocumentArrowDownIcon, CalendarIcon } from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';
import { propertyApi, unitApi, tenantApi, invoiceApi, paymentApi, formatCurrency } from '../../../lib/api';

interface PortfolioMetrics {
  portfolioValue: number;
  annualRentalIncome: number;
  averageOccupancy: number;
  collectionEfficiency: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  totalRentDue: number;
  totalRentCollected: number;
}

const ReportsPage = () => {
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    portfolioValue: 0,
    annualRentalIncome: 0,
    averageOccupancy: 0,
    collectionEfficiency: 0,
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    totalRentDue: 0,
    totalRentCollected: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Fetching portfolio metrics...');
        const [properties, units, tenants, invoices, payments] = await Promise.all([
          propertyApi.getAll(),
          unitApi.getAll(),
          tenantApi.getAll(),
          invoiceApi.getAll(),
          paymentApi.getAll()
        ]);

        console.log('📊 Portfolio data received:', {
          properties: properties.length,
          units: units.length,
          tenants: tenants.length,
          invoices: invoices.length,
          payments: payments.length
        });

        // Calculate metrics from real data
        const totalProperties = properties.length;
        const totalUnits = units.length;
        const occupiedUnits = units.filter(unit => unit.is_occupied).length;
        const averageOccupancy = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        // Calculate portfolio value (estimated at 20x annual rent)
        const monthlyRent = units.reduce((sum, unit) => sum + unit.rent, 0);
        const annualRentalIncome = monthlyRent * 12;
        const portfolioValue = annualRentalIncome * 20; // Conservative 5% yield estimate

        // Calculate financial metrics
        const totalRentDue = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
        const totalRentCollected = invoices.reduce((sum, invoice) => sum + invoice.paid_amount, 0);
        const collectionEfficiency = totalRentDue > 0 ? (totalRentCollected / totalRentDue) * 100 : 0;

        setMetrics({
          portfolioValue,
          annualRentalIncome,
          averageOccupancy,
          collectionEfficiency,
          totalProperties,
          totalUnits,
          occupiedUnits,
          totalRentDue,
          totalRentCollected
        });

        console.log('✅ Metrics calculated:', {
          portfolioValue: formatCurrency(portfolioValue),
          annualRentalIncome: formatCurrency(annualRentalIncome),
          averageOccupancy: `${averageOccupancy.toFixed(1)}%`,
          collectionEfficiency: `${collectionEfficiency.toFixed(1)}%`
        });

      } catch (err) {
        console.error('❌ Error fetching portfolio metrics:', err);
        setError('Unable to load portfolio metrics. Please ensure the Django backend is running.');
        // Keep metrics at zero - no fallback data
        setMetrics({
          portfolioValue: 0,
          annualRentalIncome: 0,
          averageOccupancy: 0,
          collectionEfficiency: 0,
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          totalRentDue: 0,
          totalRentCollected: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const reports = [
    {
      title: 'Monthly Financial Summary',
      description: 'Complete financial overview including rent collection and outstanding amounts',
      icon: ChartBarIcon,
      color: 'from-blue-500 to-blue-600',
      link: 'http://localhost:8000/admin/finance/financialsummary/'
    },
    {
      title: 'Property Performance Report',
      description: 'Occupancy rates, rental income, and property-specific metrics',
      icon: ChartBarIcon,
      color: 'from-green-500 to-green-600',
      link: 'http://localhost:8000/admin/properties/property/'
    },
    {
      title: 'Tenant Payment Report',
      description: 'Detailed payment history and arrears tracking',
      icon: DocumentArrowDownIcon,
      color: 'from-purple-500 to-purple-600',
      link: 'http://localhost:8000/admin/finance/payment/'
    },
    {
      title: 'Lease Expiry Report',
      description: 'Upcoming lease expirations and renewal opportunities',
      icon: CalendarIcon,
      color: 'from-orange-500 to-orange-600',
      link: 'http://localhost:8000/admin/tenants/lease/'
    },
    {
      title: 'Invoice Status Report',
      description: 'Outstanding invoices, overdue amounts, and collection status',
      icon: DocumentArrowDownIcon,
      color: 'from-red-500 to-red-600',
      link: 'http://localhost:8000/admin/finance/invoice/'
    },
    {
      title: 'Portfolio Overview',
      description: 'Complete portfolio performance and KPI dashboard',
      icon: ChartBarIcon,
      color: 'from-indigo-500 to-indigo-600',
      link: 'http://localhost:8000/admin/'
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
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Portfolio Analytics...</p>
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
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Reports & Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time analytics and comprehensive reporting for your property portfolio
              </p>
              {error && (
                <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  <p className="text-sm">⚠️ {error}</p>
                  <p className="text-xs mt-1">Showing zero values. Please check Django backend at http://localhost:8000</p>
                </div>
              )}
              {!error && (
                <div className="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  <p className="text-sm">✅ Connected to Django backend - Showing real-time portfolio data</p>
                </div>
              )}
            </div>
            
            {/* Report Filters */}
            <div className="flex gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search reports or data..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <select className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300">
                <option value="">All Reports</option>
                <option value="financial">Financial</option>
                <option value="property">Property Performance</option>
                <option value="tenant">Tenant Reports</option>
              </select>
              <input
                type="month"
                className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
              />
            </div>
          </motion.div>

          {/* Key Metrics - Now with Real Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Portfolio Value</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.portfolioValue)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metrics.portfolioValue === 0 ? 'Add properties to calculate' : 'Based on 20x annual rent'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Annual Rental Income</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.annualRentalIncome)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metrics.annualRentalIncome === 0 ? 'Add units with rent to calculate' : `From ${metrics.totalUnits} units`}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Occupancy</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.averageOccupancy.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metrics.totalUnits === 0 ? 'Add units to calculate' : `${metrics.occupiedUnits}/${metrics.totalUnits} units occupied`}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Collection Efficiency</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.collectionEfficiency.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metrics.totalRentDue === 0 ? 'Add invoices to calculate' : `${formatCurrency(metrics.totalRentCollected)} collected`}
              </p>
            </div>
          </motion.div>

          {/* Portfolio Summary */}
          {metrics.totalProperties > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Properties:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{metrics.totalProperties}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Units:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{metrics.totalUnits}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Monthly Rent:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(metrics.annualRentalIncome / 12)}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Vacant Units:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{metrics.totalUnits - metrics.occupiedUnits}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {metrics.totalProperties === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center py-12 mb-8"
            >
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Portfolio Data Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add properties, units, and tenants to view comprehensive analytics and reports.
              </p>
              <div className="flex justify-center gap-4">
                <a
                  href="/property-management/properties"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
                >
                  Add Properties
                </a>
                <a
                  href="/property-management/tenants"
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
                >
                  Add Tenants
                </a>
              </div>
            </motion.div>
          )}

          {/* Available Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report, index) => (
                <motion.a
                  key={report.title}
                  href={report.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`p-3 bg-gradient-to-r ${report.color} rounded-lg mb-4 w-fit`}>
                    <report.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {report.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {report.description}
                  </p>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Report Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Analytics</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Monthly and annual financial summaries</li>
                <li>• Collection rate analysis</li>
                <li>• Outstanding rent tracking</li>
                <li>• Payment pattern analysis</li>
                <li>• Revenue trend reporting</li>
                <li>• Expense categorization</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Performance</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Property-wise performance metrics</li>
                <li>• Occupancy rate tracking</li>
                <li>• Rental yield calculations</li>
                <li>• Vacancy period analysis</li>
                <li>• Lease renewal statistics</li>
                <li>• Market value assessments</li>
              </ul>
            </div>
          </motion.div>

          {/* Export Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white"
          >
            <h3 className="text-xl font-semibold mb-2">Export & Data Access</h3>
            <p className="text-orange-100 mb-4">
              All reports can be exported in multiple formats and accessed through the Django admin interface. 
              Advanced filtering and custom date ranges available for detailed analysis.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="http://localhost:8000/admin/finance/financialsummary/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Financial Reports
              </a>
              <a
                href="http://localhost:8000/admin/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Full Admin Dashboard
              </a>
              <a
                href="/property-management"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
              >
                Back to Dashboard
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;