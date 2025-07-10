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
  ArrowLeftIcon,
  Cog6ToothIcon,
  BellIcon,
  GlobeAltIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth, withAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import FluidBackground from '@/components/FluidBackground';

function SettingsPage() {
  const { user, logout, registerPasskey, isPasskeySupported } = useAuth();
  const router = useRouter();
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
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background */}
      <FluidBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
              <p className="text-gray-300 text-lg">Manage your account, security, and preferences</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-white font-semibold">{user?.full_name}</p>
              <p className="text-gray-300 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

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
                        {user?.has_passkey 
                          ? 'You can sign in using Face ID, Touch ID, Windows Hello, or security keys.'
                          : 'Set up passwordless login with your device\'s biometric authentication.'
                        }
                      </p>

                      {isPasskeySupported && !user?.has_passkey && (
                        <>
                          <button
                            onClick={handleRegisterPasskey}
                            disabled={isRegisteringPasskey}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRegisteringPasskey ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Setting up...</span>
                              </>
                            ) : (
                              <>
                                <FaceSmileIcon className="h-4 w-4" />
                                <span>Set up Face ID / Touch ID</span>
                              </>
                            )}
                          </button>
                          
                          {passkeyError && (
                            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                              <div className="flex items-center space-x-2 text-red-400 mb-1">
                                <span className="text-sm font-medium">Registration Failed</span>
                              </div>
                              <p className="text-red-300 text-sm">{passkeyError}</p>
                            </div>
                          )}
                        </>
                      )}

                      {user?.has_passkey && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          <div className="flex items-center space-x-2 text-green-400 mb-2">
                            <ShieldCheckIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Passkey Active</span>
                          </div>
                          <p className="text-green-300 text-sm">
                            Your passkey is registered and ready to use for secure login.
                          </p>
                        </div>
                      )}

                      {!isPasskeySupported && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                          <p className="text-yellow-300 text-sm">
                            Passkeys are not supported on this device or browser. 
                            Try using a modern browser like Chrome, Safari, or Edge.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Last Login */}
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="text-sm text-gray-400 block mb-1">Last Login</label>
                      <p className="text-white font-medium">
                        {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </p>
                    </div>

                    {/* Account Actions */}
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <label className="text-sm text-gray-400 block mb-3">Account Actions</label>
                      <div className="space-y-2">
                        <button className="w-full text-left px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-white/5 rounded-lg transition-colors text-sm">
                          Change Password
                        </button>
                        <button className="w-full text-left px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-white/5 rounded-lg transition-colors text-sm">
                          Update Profile Information
                        </button>
                        <button className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors text-sm">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Settings Sections (Placeholder) */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center">
                  <BellIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                  <p className="text-gray-300">Configure how you receive notifications</p>
                </div>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-400">Notification settings coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the component wrapped with authentication
export default withAuth(SettingsPage); 