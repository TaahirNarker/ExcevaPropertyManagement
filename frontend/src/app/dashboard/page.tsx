/**
 * Dashboard Page
 * Protected route that shows user profile and property management options
 */

'use client';

import { motion } from 'framer-motion';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  HomeIcon,
  ArrowRightOnRectangleIcon,
  FaceSmileIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth, withAuth } from '@/contexts/AuthContext';
import FluidBackground from '@/components/FluidBackground';

function DashboardPage() {
  const { user, logout, registerPasskey, isPasskeySupported } = useAuth();

  const handleRegisterPasskey = async () => {
    try {
      await registerPasskey();
    } catch (error) {
      console.error('Failed to register passkey:', error);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background */}
      <FluidBackground />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-300 mt-2">Welcome back, {user?.full_name}!</p>
          </motion.div>
          
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Logout</span>
          </motion.button>
        </div>

        {/* User Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8"
        >
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <UserIcon className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.full_name}</h2>
              <p className="text-gray-300">{user?.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                {user?.is_landlord && (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <span>Landlord</span>
                  </span>
                )}
                {user?.is_tenant && (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <HomeIcon className="h-4 w-4" />
                    <span>Tenant</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Phone</label>
                  <p className="text-white">{user?.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Member Since</label>
                  <p className="text-white">
                    {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Passkey Authentication</p>
                    <p className="text-sm text-gray-400">
                      {user?.has_passkey ? 'Enabled' : 'Not set up'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user?.has_passkey ? (
                      <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                    ) : (
                      <FaceSmileIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isPasskeySupported && !user?.has_passkey && (
                  <button
                    onClick={handleRegisterPasskey}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2"
                  >
                    <FaceSmileIcon className="h-4 w-4" />
                    <span>Set up Face ID / Touch ID</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Properties</h3>
            <p className="text-gray-300 text-sm mb-4">
              Manage your property portfolio and track performance
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              View Properties
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <HomeIcon className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Tenants</h3>
            <p className="text-gray-300 text-sm mb-4">
              Manage tenant relationships and lease agreements
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              View Tenants
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <UserIcon className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Profile</h3>
            <p className="text-gray-300 text-sm mb-4">
              Update your profile information and preferences
            </p>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Edit Profile
            </button>
          </div>
        </motion.div>

        {/* Development Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4">🚀 Authentication System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-400">✅ JWT Token Authentication</p>
              <p className="text-green-400">✅ User Registration & Login</p>
              <p className="text-green-400">✅ Protected Routes</p>
            </div>
            <div>
              <p className="text-green-400">✅ Passkey Support (WebAuthn)</p>
              <p className="text-green-400">✅ Secure Token Storage</p>
              <p className="text-green-400">✅ Auto Token Refresh</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Export with authentication protection
export default withAuth(DashboardPage); 