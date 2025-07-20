/**
 * Settings Page - Property Management System
 * User profile, security settings, and system preferences
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  UserIcon,
  ShieldCheckIcon,
  FaceSmileIcon,
  BuildingOfficeIcon,
  HomeIcon,
  BellIcon,
  GlobeAltIcon,
  EyeIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage() {
  console.log('🔧 SettingsPage rendering');
  
  useEffect(() => {
    console.log('🔧 SettingsPage mounted');
    return () => console.log('🔧 SettingsPage unmounted');
  }, []);

  const { user, logout, registerPasskey, isPasskeySupported } = useAuth();
  
  console.log('🔧 About to call useTheme in SettingsPage');
  const { theme } = useTheme();
  console.log('🔧 Theme value in SettingsPage:', theme);

  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('profile');

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
    <DashboardLayout title="Settings">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <div className="xl:col-span-1">
            <div className={`${
              theme === 'dark' 
                ? 'bg-white/10 backdrop-blur-lg border-white/20' 
                : 'bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg'
            } rounded-xl p-6 border sticky top-8`}>
              <h2 className={`text-xl font-bold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Settings Menu</h2>
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveSection('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === 'profile' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <UserIcon className="h-5 w-5" />
                  <span>Profile & Security</span>
                </button>
                <button 
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === 'notifications' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <BellIcon className="h-5 w-5" />
                  <span>Notifications</span>
                </button>
                <button 
                  onClick={() => setActiveSection('preferences')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === 'preferences' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <GlobeAltIcon className="h-5 w-5" />
                  <span>Preferences</span>
                </button>
                <button 
                  onClick={() => setActiveSection('privacy')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === 'privacy' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <EyeIcon className="h-5 w-5" />
                  <span>Privacy</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Settings Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Profile & Security Section */}
            {activeSection === 'profile' && (
            <div className={`${
              theme === 'dark' 
                ? 'bg-white/10 backdrop-blur-lg border-white/20' 
                : 'bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg'
            } rounded-xl p-8 border`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>Profile & Security</h2>
                    <p className={`${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Manage your account information and security settings</p>
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
                  <h3 className={`text-lg font-semibold mb-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Account Information</h3>
                  <div className="space-y-4">
                    <div className={`${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    } p-4 rounded-lg border`}>
                      <label className={`text-sm block mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Full Name</label>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>{user?.full_name}</p>
                    </div>
                    <div className={`${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    } p-4 rounded-lg border`}>
                      <label className={`text-sm block mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Email Address</label>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>{user?.email}</p>
                    </div>
                    <div className={`${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    } p-4 rounded-lg border`}>
                      <label className={`text-sm block mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Phone Number</label>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>{user?.phone_number || 'Not provided'}</p>
                    </div>
                    <div className={`${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    } p-4 rounded-lg border`}>
                      <label className={`text-sm block mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Member Since</label>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div>
                  <h3 className={`text-lg font-semibold mb-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Security Settings</h3>
                  <div className="space-y-4">
                    {/* Passkey Section */}
                    <div className={`${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    } p-6 rounded-lg border`}>
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
                            <h4 className={`font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-800'
                            }`}>Passkey Authentication</h4>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
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
                      
                      <p className={`text-sm mb-4 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
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
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className={`${
                theme === 'dark' 
                  ? 'bg-white/10 backdrop-blur-lg border-white/20' 
                  : 'bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg'
              } rounded-xl p-8 border`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <GlobeAltIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>Preferences</h2>
                      <p className={`${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>Customize your application experience</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Theme Settings */}
                  <div className={`${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                  } p-6 rounded-lg border`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          {theme === 'dark' ? (
                            <MoonIcon className="h-5 w-5 text-white" />
                          ) : (
                            <SunIcon className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <h4 className={`font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>Theme Settings</h4>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Choose between light and dark mode
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <ThemeToggle className="w-full" />
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Your theme preference will be saved and applied across all devices.
                      </p>
                    </div>
                  </div>

                  {/* Other Preferences */}
                  <div className={`${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                  } p-6 rounded-lg border`}>
                    <h4 className={`font-medium mb-4 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>Display Settings</h4>
                    <div className="space-y-4">
                                              <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-800'
                            }`}>Compact Mode</p>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Reduce spacing for more content</p>
                          </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1 transition-transform"></span>
                        </button>
                      </div>
                      
                                              <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-800'
                            }`}>Show Animations</p>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Enable smooth transitions and effects</p>
                          </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className={`${
                theme === 'dark' 
                  ? 'bg-white/10 backdrop-blur-lg border-white/20' 
                  : 'bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg'
              } rounded-xl p-8 border`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <BellIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>Notifications</h2>
                      <p className={`${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>Manage your notification preferences</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-12">
                  <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className={`text-xl font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Notification Settings</h3>
                  <p className={`${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Configure your notification preferences here</p>
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className={`${
                theme === 'dark' 
                  ? 'bg-white/10 backdrop-blur-lg border-white/20' 
                  : 'bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg'
              } rounded-xl p-8 border`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                      <EyeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>Privacy</h2>
                      <p className={`${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>Manage your privacy settings</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-12">
                  <EyeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className={`text-xl font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Privacy Settings</h3>
                  <p className={`${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Configure your privacy preferences here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 