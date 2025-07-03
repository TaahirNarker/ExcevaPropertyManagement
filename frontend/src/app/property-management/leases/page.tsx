'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';
import LeaseTable from '../../../components/LeaseTable';
import LeaseForm from '../../../components/LeaseForm';
import TenantForm from '../../../components/TenantForm';
import { Lease, leaseApi, calculateDaysUntilExpiry, formatCurrency } from '../../../lib/api';

interface LeaseStats {
  totalLeases: number;
  activeLeases: number;
  expiringLeases: number;
  expiredLeases: number;
  totalMonthlyRent: number;
  avgLeaseLength: number;
}

const LeasesPage = () => {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [stats, setStats] = useState<LeaseStats>({
    totalLeases: 0,
    activeLeases: 0,
    expiringLeases: 0,
    expiredLeases: 0,
    totalMonthlyRent: 0,
    avgLeaseLength: 0
  });

  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For development, we'll use mock data
      // In production, uncomment the line below:
      // const response = await leaseApi.getAll();
      
      // Mock data for development
      const mockLeases: Lease[] = [
        {
          id: 1,
          tenant: { 
            id: 1, 
            name: 'John Doe', 
            email: 'john@example.com', 
            phone: '+27123456789', 
            id_number: '1234567890123', 
            is_active: true,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          },
          unit: { 
            id: 1, 
            number: 'Unit 5B', 
            property: 'Sunset Villas', 
            property_id: 1, 
            type: 'apartment',
            size: 85,
            rent: 8500,
            is_occupied: true,
            status: 'occupied'
          },
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          monthly_rent: 8500,
          deposit_amount: 8500,
          status: 'active',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 2,
          tenant: { 
            id: 2, 
            name: 'Sarah Johnson', 
            email: 'sarah@example.com', 
            phone: '+27123456790', 
            id_number: '9876543210987', 
            is_active: true,
            created_at: '2024-02-01',
            updated_at: '2024-02-01'
          },
          unit: { 
            id: 2, 
            number: 'Unit 12A', 
            property: 'Ocean View Apartments', 
            property_id: 2, 
            type: 'apartment',
            size: 120,
            rent: 12000,
            is_occupied: true,
            status: 'occupied'
          },
          start_date: '2024-02-01',
          end_date: '2025-01-31',
          monthly_rent: 12000,
          deposit_amount: 12000,
          status: 'active',
          created_at: '2024-02-01',
          updated_at: '2024-02-01'
        },
        {
          id: 3,
          tenant: { 
            id: 3, 
            name: 'Michael Chen', 
            email: 'michael@example.com', 
            phone: '+27123456791', 
            id_number: '5555666677777', 
            is_active: false,
            created_at: '2023-06-01',
            updated_at: '2024-05-31'
          },
          unit: { 
            id: 3, 
            number: 'Unit 7C', 
            property: 'Mountain View Complex', 
            property_id: 3, 
            type: 'apartment',
            size: 95,
            rent: 9500,
            is_occupied: false,
            status: 'available'
          },
          start_date: '2023-06-01',
          end_date: '2024-05-31',
          monthly_rent: 9500,
          deposit_amount: 9500,
          status: 'expired',
          created_at: '2023-06-01',
          updated_at: '2024-05-31'
        },
        {
          id: 4,
          tenant: { 
            id: 4, 
            name: 'Emma Wilson', 
            email: 'emma@example.com', 
            phone: '+27123456792', 
            id_number: '1111222233333', 
            is_active: true,
            created_at: '2024-03-01',
            updated_at: '2024-03-01'
          },
          unit: { 
            id: 4, 
            number: 'Unit 3B', 
            property: 'City Center Towers', 
            property_id: 4, 
            type: 'apartment',
            size: 150,
            rent: 15000,
            is_occupied: true,
            status: 'occupied'
          },
          start_date: '2024-03-01',
          end_date: '2025-02-28',
          monthly_rent: 15000,
          deposit_amount: 15000,
          status: 'active',
          created_at: '2024-03-01',
          updated_at: '2024-03-01'
        }
      ];

      setLeases(mockLeases);
      calculateStats(mockLeases);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leases');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leaseData: Lease[]) => {
    const now = new Date();
    
    const stats: LeaseStats = {
      totalLeases: leaseData.length,
      activeLeases: 0,
      expiringLeases: 0,
      expiredLeases: 0,
      totalMonthlyRent: 0,
      avgLeaseLength: 0
    };

    let totalDays = 0;

    leaseData.forEach(lease => {
      const daysUntilExpiry = calculateDaysUntilExpiry(lease.end_date);
      
      // Count active leases
      if (lease.status === 'active' && daysUntilExpiry > 0) {
        stats.activeLeases++;
      }
      
      // Count expiring leases (30 days or less)
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        stats.expiringLeases++;
      }
      
      // Count expired leases
      if (daysUntilExpiry < 0 || lease.status === 'expired') {
        stats.expiredLeases++;
      }
      
      // Add to total monthly rent (only active leases)
      if (lease.status === 'active') {
        stats.totalMonthlyRent += lease.monthly_rent;
      }
      
      // Calculate lease length for average
      const startDate = new Date(lease.start_date);
      const endDate = new Date(lease.end_date);
      const leaseDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += leaseDays;
    });

    stats.avgLeaseLength = leaseData.length > 0 ? Math.round(totalDays / leaseData.length) : 0;
    
    setStats(stats);
  };

  const handleLeaseSuccess = (lease: Lease) => {
    if (selectedLease) {
      // Update existing lease
      setLeases(prev => prev.map(l => l.id === lease.id ? lease : l));
    } else {
      // Add new lease
      setLeases(prev => [...prev, lease]);
    }
    // Recalculate stats
    const updatedLeases = selectedLease 
      ? leases.map(l => l.id === lease.id ? lease : l)
      : [...leases, lease];
    calculateStats(updatedLeases);
    setSelectedLease(null);
  };

  const handleTenantSuccess = () => {
    // Refresh leases to get updated tenant information
    fetchLeases();
  };

  const handleCreateLease = () => {
    setSelectedLease(null);
    setShowLeaseForm(true);
  };

  const handleEditLease = (lease: Lease) => {
    setSelectedLease(lease);
    setShowLeaseForm(true);
  };

  const handleCreateTenant = () => {
    setShowTenantForm(true);
  };

  const handleViewLease = (lease: Lease) => {
    // Navigate to lease details page
    window.location.href = `/property-management/leases/${lease.id}`;
  };

  const statCards = [
    {
      title: 'Total Leases',
      value: stats.totalLeases.toString(),
      icon: DocumentTextIcon,
      color: 'from-blue-500 to-blue-600',
      description: 'All lease agreements'
    },
    {
      title: 'Active Leases',
      value: stats.activeLeases.toString(),
      icon: UserIcon,
      color: 'from-green-500 to-green-600',
      description: 'Currently active'
    },
    {
      title: 'Expiring Soon',
      value: stats.expiringLeases.toString(),
      icon: ExclamationTriangleIcon,
      color: 'from-orange-500 to-orange-600',
      description: 'Within 30 days',
      urgent: stats.expiringLeases > 0
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.totalMonthlyRent),
      icon: BanknotesIcon,
      color: 'from-purple-500 to-purple-600',
      description: 'From active leases'
    },
    {
      title: 'Avg Lease Length',
      value: `${Math.round(stats.avgLeaseLength / 30)} months`,
      icon: CalendarIcon,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Average duration'
    },
    {
      title: 'Expired Leases',
      value: stats.expiredLeases.toString(),
      icon: ExclamationTriangleIcon,
      color: 'from-red-500 to-red-600',
      description: 'Needs attention',
      urgent: stats.expiredLeases > 0
    }
  ];

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md mx-auto"
          >
            <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Leases
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchLeases}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Lease Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage lease agreements and tenant relationships
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateTenant}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Add Tenant</span>
                </button>
                <button
                  onClick={handleCreateLease}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>Create Lease</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8"
          >
            {statCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${
                  card.urgent ? 'ring-2 ring-orange-500 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color}`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  {card.urgent && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-orange-500 rounded-full"
                    />
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.a
                href="/property-management/leases/create"
                whileHover={{ scale: 1.02 }}
                className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Create Lease</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">New tenant agreement</p>
                </div>
              </motion.a>

              <motion.a
                href="/property-management/properties"
                whileHover={{ scale: 1.02 }}
                className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <BuildingOfficeIcon className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Vacant Units</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available properties</p>
                </div>
              </motion.a>

              <motion.a
                href="/property-management/reports"
                whileHover={{ scale: 1.02 }}
                className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <ChartBarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Lease Reports</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Analytics & insights</p>
                </div>
              </motion.a>

              <motion.a
                href="/property-management/tenants"
                whileHover={{ scale: 1.02 }}
                className="flex items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <UserIcon className="w-8 h-8 text-orange-600 dark:text-orange-400 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Manage Tenants</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tenant information</p>
                </div>
              </motion.a>
            </div>
          </motion.div>

          {/* Leases Table/List */}
          {leases.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Leases Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create your first lease agreement to get started.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleCreateTenant}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Add Tenant First</span>
                </button>
                <button
                  onClick={handleCreateLease}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>Create Lease</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <LeaseTable 
                leases={leases} 
                onEdit={handleEditLease}
                onView={handleViewLease}
              />
            </motion.div>
          )}
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
        />

        {/* Tenant Form Modal */}
        <TenantForm
          isOpen={showTenantForm}
          onClose={() => setShowTenantForm(false)}
          onSuccess={handleTenantSuccess}
        />
      </div>
    </Layout>
  );
};

export default LeasesPage; 