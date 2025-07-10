/**
 * Settings Page - Property Management System
 * User profile, security settings, and system preferences
 */

'use client';

import { useState } from 'react';
import { 
  UserIcon,
  ShieldCheckIcon,
  FaceSmileIcon,
  BuildingOfficeIcon,
  HomeIcon,
  BellIcon,
  GlobeAltIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';

export default function SettingsPage() {
  const { user, logout, registerPasskey, isPasskeySupported } = useAuth();
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Handle passkey registration
  const handleRegisterPasskey = async () => {
    try {
      setIsRegisteringPasskey(true);
      setPasskeyError(null);
      
      // Check if user is authenticated first
      if (!user) {
        throw new Error('User must be logged in to register passkey');
      }

      console.log('Starting passkey registration...');
      await registerPasskey();
      console.log('Passkey registration successful!');
      
      // Show success message (you could add a toast here)
      
    } catch (error) {
      console.error('Failed to register passkey:', error);
      setPasskeyError(error instanceof Error ? error.message : 'Failed to register passkey');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account, security, and preferences">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <div className="xl:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6">Settings Menu</h2>
              <nav className="space-y-2">
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-blue-600 text-white">
                  <UserIcon className="h-5 w-5" />
                  <span>Profile & Security</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  <BellIcon className="h-5 w-5" />
                  <span>Notifications</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  <GlobeAltIcon className="h-5 w-5" />
                  <span>Preferences</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  <EyeIcon className="h-5 w-5" />
                  <span>Privacy</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Settings Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Profile & Security Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Profile & Security</h2>
                    <p className="text-gray-300">Manage your account information and security settings</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-6">Account Information</h3>
                  <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="text-sm text-gray-400 block mb-1">Full Name</label>
                      <p className="text-white font-medium">{user?.full_name}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="text-sm text-gray-400 block mb-1">Email Address</label>
                      <p className="text-white font-medium">{user?.email}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="text-sm text-gray-400 block mb-1">Phone Number</label>
                      <p className="text-white font-medium">{user?.phone_number || 'Not provided'}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="text-sm text-gray-400 block mb-1">Member Since</label>
                      <p className="text-white font-medium">
                        {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-6">Security Settings</h3>
                  <div className="space-y-4">
                    {/* Passkey Section */}
                    <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user?.has_passkey ? 'bg-green-500/20' : 'bg-gray-500/20'
                          }`}>
                            {user?.has_passkey ? (
                              <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                            ) : (
                              <FaceSmileIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Passkey Authentication</h4>
                            <p className="text-sm text-gray-400">
                              {user?.has_passkey ? 'Enabled' : 'Not set up'}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          user?.has_passkey 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user?.has_passkey ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-4">
                        {isPasskeySupported 
                          ? 'Use passkeys for more secure and convenient authentication.'
                          : 'Your browser does not support passkeys.'}
                      </p>

                      {isPasskeySupported && !user?.has_passkey && (
                        <button
                          onClick={handleRegisterPasskey}
                          disabled={isRegisteringPasskey}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRegisteringPasskey ? 'Registering...' : 'Register Passkey'}
                        </button>
                      )}

                      {passkeyError && (
                        <p className="text-red-400 text-sm mt-2">{passkeyError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 