'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  HomeIcon, 
  UsersIcon, 
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';
import FluidBackground from '@/components/FluidBackground';

export default function PropertyManagementHomePage() {
  const managementTools = [
    {
      title: 'Properties',
      description: 'Manage your property portfolio and individual units',
      icon: HomeIcon,
      href: '/property-management/properties',
      color: 'from-blue-500 to-cyan-500',
      stats: { label: 'Properties', value: '12' }
    },
    {
      title: 'Tenants',
      description: 'Tenant management and communication',
      icon: UsersIcon,
      href: '/property-management/tenants',
      color: 'from-green-500 to-emerald-500',
      stats: { label: 'Active Tenants', value: '28' }
    },
    {
      title: 'Leases',
      description: 'Lease agreements and renewals',
      icon: DocumentTextIcon,
      href: '/property-management/leases',
      color: 'from-purple-500 to-pink-500',
      stats: { label: 'Active Leases', value: '24' }
    },
    {
      title: 'Finance',
      description: 'Income tracking and financial reports',
      icon: CurrencyDollarIcon,
      href: '/property-management/finance',
      color: 'from-orange-500 to-red-500',
      stats: { label: 'Monthly Income', value: 'R 45,000' }
    },
    {
      title: 'Reports',
      description: 'Analytics and performance reports',
      icon: ChartBarIcon,
      href: '/property-management/reports',
      color: 'from-indigo-500 to-purple-500',
      stats: { label: 'Occupancy Rate', value: '92%' }
    },
    {
      title: 'Portfolio',
      description: 'Complete property portfolio overview',
      icon: BuildingOfficeIcon,
      href: '/property-management',
      color: 'from-teal-500 to-cyan-500',
      stats: { label: 'Total Value', value: 'R 2.4M' }
    }
  ];

  return (
    <Layout>
      <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Background */}
        <FluidBackground />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Property Management System
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Complete property portfolio management solution for landlords, 
              property managers, and real estate professionals
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white">R 2.4M</div>
              <div className="text-sm text-gray-400">Portfolio Value</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-green-400">92%</div>
              <div className="text-sm text-gray-400">Occupancy Rate</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-blue-400">28</div>
              <div className="text-sm text-gray-400">Active Tenants</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-purple-400">R 45K</div>
              <div className="text-sm text-gray-400">Monthly Income</div>
            </div>
          </motion.div>

          {/* Management Tools Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {managementTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 * index }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <Link href={tool.href}>
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <tool.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{tool.stats.value}</div>
                        <div className="text-sm text-gray-400">{tool.stats.label}</div>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                      {tool.title}
                    </h3>
                    
                    <p className="text-gray-400 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <button className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <PlusIcon className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-white font-semibold">Add Property</div>
              </button>
              
              <button className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <UsersIcon className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-white font-semibold">Add Tenant</div>
              </button>
              
              <button className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <DocumentTextIcon className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-white font-semibold">Create Lease</div>
              </button>
              
              <button className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <ChartBarIcon className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-white font-semibold">View Reports</div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 