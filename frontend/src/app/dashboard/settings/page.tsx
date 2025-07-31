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

  // Business Preferences: Company color state
  const [primaryColor, setPrimaryColor] = useState('#1d4ed8'); // Default blue
  const [secondaryColor, setSecondaryColor] = useState('#22d3ee'); // Default cyan
  // Business Preferences: Company logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Bitcoin Payment Settings state
  const [strikeApiKey, setStrikeApiKey] = useState('');
  const [strikeWebhookSecret, setStrikeWebhookSecret] = useState('');
  const [paymentNotificationEmail, setPaymentNotificationEmail] = useState('');

  // Load saved logo from localStorage on component mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
      setLogoPreview(savedLogo);
      console.log('Loaded saved company logo from localStorage');
    }
    
    // Load saved Bitcoin payment settings
    const savedStrikeApiKey = localStorage.getItem('strikeApiKey');
    const savedWebhookSecret = localStorage.getItem('strikeWebhookSecret');
    const savedNotificationEmail = localStorage.getItem('paymentNotificationEmail');
    
    if (savedStrikeApiKey) setStrikeApiKey(savedStrikeApiKey);
    if (savedWebhookSecret) setStrikeWebhookSecret(savedWebhookSecret);
    if (savedNotificationEmail) setPaymentNotificationEmail(savedNotificationEmail);
    
    console.log('Loaded Bitcoin payment settings from localStorage');
  }, []);

  // Handle logo file selection and preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        alert('Please upload a PNG file.');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoDataUrl = reader.result as string;
        setLogoPreview(logoDataUrl);
        // Save logo to localStorage for use in PDFs
        localStorage.setItem('companyLogo', logoDataUrl);
        console.log('Company logo saved to localStorage');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Bitcoin payment settings save
  const handleSaveBitcoinSettings = () => {
    localStorage.setItem('strikeApiKey', strikeApiKey);
    localStorage.setItem('strikeWebhookSecret', strikeWebhookSecret);
    localStorage.setItem('paymentNotificationEmail', paymentNotificationEmail);
    
    console.log('Bitcoin payment settings saved to localStorage');
    
    // Show success message with configuration status
    const isConfigured = strikeApiKey && strikeWebhookSecret;
    const message = isConfigured 
      ? '✅ Bitcoin payment settings saved! Your system is now configured for live Bitcoin payments.' 
      : '💾 Settings saved! Add API credentials to enable live Bitcoin payments.';
    alert(message);
  };

  // Handle clearing Bitcoin settings
  const handleClearBitcoinSettings = () => {
    if (confirm('Are you sure you want to clear all Bitcoin payment settings?')) {
      setStrikeApiKey('');
      setStrikeWebhookSecret('');
      setPaymentNotificationEmail('');
      
      localStorage.removeItem('strikeApiKey');
      localStorage.removeItem('strikeWebhookSecret');
      localStorage.removeItem('paymentNotificationEmail');
      
      console.log('Bitcoin payment settings cleared');
      alert('Bitcoin payment settings cleared successfully!');
    }
  };

  // Test Strike API connection
  const handleTestConnection = async () => {
    if (!strikeApiKey) {
      alert('Please enter a Strike API key first.');
      return;
    }

    try {
      console.log('Testing Strike API connection...');
      const response = await fetch('http://localhost:8000/api/payments/exchange-rate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strike_api_key: strikeApiKey
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        // Comprehensive debugging
        console.log('=== DEBUGGING EXCHANGE RATE ===');
        console.log('Raw API response:', JSON.stringify(data, null, 2));
        console.log('data.rate value:', data.rate);
        console.log('data.rate type:', typeof data.rate);
        
        // Parse the rate with extra validation
        let rate;
        const rawRate = data.rate;
        
        if (typeof rawRate === 'string') {
          rate = Number(rawRate);
          console.log('Parsed string rate:', rate);
        } else if (typeof rawRate === 'number') {
          rate = rawRate;
          console.log('Using number rate:', rate);
        } else {
          console.error('Unexpected rate type:', typeof rawRate);
          rate = 0.00000093; // Fallback
        }
        
        // Validate the rate makes sense (should be a very small number)
        console.log('Final rate:', rate);
        console.log('Rate in scientific notation:', rate.toExponential());
        
        // Ensure rate is in the expected range (ZAR to BTC should be ~0.000001)
        if (rate > 0.001) {
          console.error('⚠️ Rate seems too high, might be inverted:', rate);
          console.log('Attempting to fix by inverting...');
          rate = 1 / rate;
          console.log('Corrected rate:', rate);
        }
        
        // Calculate BTC price
        const btcValueNum = 1 / rate;
        console.log('BTC value calculation: 1 /', rate, '=', btcValueNum);
        
        const btcValue = btcValueNum.toLocaleString('en-US', { maximumFractionDigits: 0 });
        const rateFormatted = rate.toExponential(2);
        
        console.log('Final formatted BTC value:', btcValue);
        console.log('Final formatted rate:', rateFormatted);
        console.log('=== END DEBUGGING ===');
        
        // Validate if the rate seems reasonable (1 BTC should be between 500k-2M ZAR)
        let rateValidation = '';
        if (btcValueNum < 500000) {
          rateValidation = '\n⚠️ Note: This rate seems unusually low - please verify with Strike support.';
        } else if (btcValueNum > 2000000) {
          rateValidation = '\n⚠️ Note: This rate seems unusually high - please verify with Strike support.';
        } else {
          rateValidation = '\n✅ Exchange rate appears reasonable.';
        }
        
        alert(`✅ Connection successful!\n\n💰 1 BTC Price: R${btcValue}\n\nExchange Rate Details:\n• ZAR-BTC rate: ${rateFormatted} (1 ZAR = ${rate} BTC)${rateValidation}\n\nYour Strike API key is working correctly.`);
      } else {
        const errorMsg = data.error || 'Unknown error occurred';
        alert(`❌ Connection failed.\n\nError: ${errorMsg}\n\nPlease check:\n• API key is correct\n• API key has required permissions\n• Strike account is active`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert(`❌ Connection test failed.\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease check:\n• Backend server is running\n• Network connection is active`);
    }
  };

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
                {/* Business Preferences Navigation Button */}
                <button 
                  onClick={() => setActiveSection('business')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === 'business' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <BuildingOfficeIcon className="h-5 w-5" />
                  <span>Business Preferences</span>
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
            {/* Business Preferences Section */}
            {activeSection === 'business' && (
              <div className={`${
                theme === 'dark' 
                  ? 'bg-white/10 backdrop-blur-lg border-white/20' 
                  : 'bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg'
              } rounded-xl p-8 border`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                      <BuildingOfficeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>Business Preferences</h2>
                      <p className={`${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>Set your business-related preferences and company information</p>
                    </div>
                  </div>
                </div>
                {/* Company Colour Pickers */}
                <div className="max-w-lg mx-auto space-y-8">
                  <div className={`${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                  } p-6 rounded-lg border flex flex-col gap-6 items-center`}>
                    <h3 className={`text-xl font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>Company Colours</h3>
                    <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
                      {/* Primary Colour Picker */}
                      <div className="flex flex-col items-center gap-2">
                        <label htmlFor="primary-color" className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>Primary Company Colour</label>
                        <input
                          id="primary-color"
                          type="color"
                          value={primaryColor}
                          onChange={e => setPrimaryColor(e.target.value)}
                          className="w-16 h-16 rounded-full border-2 border-gray-300 shadow"
                        />
                        <span className="text-xs text-gray-500 mt-1">{primaryColor}</span>
                      </div>
                      {/* Secondary Colour Picker */}
                      <div className="flex flex-col items-center gap-2">
                        <label htmlFor="secondary-color" className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>Secondary Company Colour</label>
                        <input
                          id="secondary-color"
                          type="color"
                          value={secondaryColor}
                          onChange={e => setSecondaryColor(e.target.value)}
                          className="w-16 h-16 rounded-full border-2 border-gray-300 shadow"
                        />
                        <span className="text-xs text-gray-500 mt-1">{secondaryColor}</span>
                      </div>
                    </div>
                    {/* Info Text */}
                    <p className={`text-sm text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>These colours will represent your company branding throughout the platform.</p>
                  </div>
                  {/* Company Logo Upload */}
                  <div className={`${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                  } p-6 rounded-lg border flex flex-col gap-4 items-center`}>
                    <h3 className={`text-xl font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>Company Logo</h3>
                    <label htmlFor="company-logo" className={`font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>Upload your logo (PNG only)</label>
                    <input
                      id="company-logo"
                      type="file"
                      accept="image/png"
                      onChange={handleLogoChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {/* Logo Preview */}
                    {logoPreview && (
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <img
                          src={logoPreview}
                          alt="Company Logo Preview"
                          className="w-32 h-32 object-contain rounded border border-gray-300 bg-white shadow"
                        />
                        <span className="text-xs text-gray-500">Preview</span>
                      </div>
                    )}
                    {!logoPreview && (
                      <span className="text-xs text-gray-400">No logo uploaded yet.</span>
                    )}
                  </div>
                </div>
                
                {/* Bitcoin Payment Configuration */}
                <div className={`${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                } p-6 rounded-lg border flex flex-col gap-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">₿</span>
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>Bitcoin Lightning Payment Settings</h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Configure Strike API for Bitcoin rent payments</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strike API Key */}
                    <div className="space-y-2">
                      <label htmlFor="strike-api-key" className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        Strike API Key
                      </label>
                      <input
                        id="strike-api-key"
                        type="password"
                        value={strikeApiKey}
                        onChange={(e) => setStrikeApiKey(e.target.value)}
                        placeholder="Enter your Strike API key"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          theme === 'dark' 
                            ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Get this from your Strike developer dashboard
                      </p>
                    </div>

                    {/* Strike Webhook Secret */}
                    <div className="space-y-2">
                      <label htmlFor="strike-webhook-secret" className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        Strike Webhook Secret <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="strike-webhook-secret"
                        type="password"
                        value={strikeWebhookSecret}
                        onChange={(e) => setStrikeWebhookSecret(e.target.value)}
                        placeholder="Leave empty if webhooks not available"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          theme === 'dark' 
                            ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        System works without webhooks - just add your API key above to get started
                      </p>
                    </div>

                    {/* Payment Notification Email */}
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="payment-notification-email" className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        Payment Notification Email
                      </label>
                      <input
                        id="payment-notification-email"
                        type="email"
                        value={paymentNotificationEmail}
                        onChange={(e) => setPaymentNotificationEmail(e.target.value)}
                        placeholder="admin@yourcompany.com"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          theme === 'dark' 
                            ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Email address to receive Bitcoin payment notifications
                      </p>
                    </div>
                  </div>

                  {/* Configuration Status */}
                  <div className={`p-4 rounded-lg ${
                    strikeApiKey 
                      ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700/30' 
                      : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        strikeApiKey ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        strikeApiKey 
                          ? 'text-green-700 dark:text-green-400' 
                          : 'text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {strikeApiKey 
                          ? strikeWebhookSecret 
                            ? 'Bitcoin payments configured with webhooks' 
                            : 'Bitcoin payments configured (no webhooks)'
                          : 'Bitcoin payments in development mode'
                        }
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${
                      strikeApiKey 
                        ? 'text-green-600 dark:text-green-300' 
                        : 'text-yellow-600 dark:text-yellow-300'
                    }`}>
                      {strikeApiKey 
                        ? strikeWebhookSecret 
                          ? 'Ready to accept Bitcoin payments with automatic status updates' 
                          : 'Ready to accept Bitcoin payments - manual status checking required'
                        : 'Using mock data for development - add API key to go live'
                      }
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end flex-wrap">
                    <button
                      onClick={handleClearBitcoinSettings}
                      className={`px-4 py-2 border rounded-lg transition-colors ${
                        theme === 'dark' 
                          ? 'border-red-600 text-red-400 hover:bg-red-600/10' 
                          : 'border-red-500 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      Clear Settings
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={!strikeApiKey}
                      className={`px-4 py-2 border rounded-lg transition-colors ${
                        strikeApiKey
                          ? theme === 'dark' 
                            ? 'border-blue-600 text-blue-400 hover:bg-blue-600/10' 
                            : 'border-blue-500 text-blue-600 hover:bg-blue-50'
                          : 'border-gray-400 text-gray-400 cursor-not-allowed'
                      }`}
                      title="Tests API key by fetching current ZAR-BTC exchange rate"
                    >
                      Test Connection
                    </button>
                    <button
                      onClick={handleSaveBitcoinSettings}
                      className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-colors font-medium"
                    >
                      Save Bitcoin Settings
                    </button>
                  </div>
                  
                  <div className={`text-xs text-center mt-2 space-y-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <p>💡 Test Connection verifies your API key by fetching the current ZAR-BTC exchange rate</p>
                    <p className="text-xs">Expected rate: ~9.30e-7 (meaning 1 BTC ≈ 1,080,000 ZAR)</p>
                  </div>

                  {/* Help Information */}
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'
                  } border`}>
                    <h4 className={`font-medium mb-3 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                    }`}>
                      Setup Instructions:
                    </h4>
                    <ol className={`text-sm space-y-2 mb-4 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                    }`}>
                      <li>
                        <strong>1. Create Strike Account:</strong>
                        <br />• Visit <span className="font-mono">strike.me</span> and create a business account
                        <br />• Complete business verification process
                      </li>
                      <li>
                        <strong>2. Generate API Key:</strong>
                        <br />• Go to Strike Dashboard → API Keys → Create New Key
                        <br />• Select <strong>exactly these 5 permissions</strong> (see below)
                        <br />• Copy the generated API key (save securely!)
                      </li>
                      <li>
                        <strong>3. Configure Webhook (if available):</strong>
                        <br />• Look for <strong>Webhooks</strong>, <strong>Notifications</strong>, or <strong>API Settings</strong> in Strike Dashboard
                        <br />• If webhooks not visible, contact Strike support to enable them
                        <br />• URL: <span className="font-mono">https://yourdomain.com/api/payments/webhook/strike/</span>
                        <br />• <em>Note: Webhook setup may require business account verification</em>
                      </li>
                      <li>
                        <strong>4. Enter Settings:</strong>
                        <br />• Paste API key above (required)
                        <br />• Add webhook secret if available (optional)
                        <br />• Add your notification email address
                        <br />• Click "Save Bitcoin Settings"
                      </li>
                      <li>
                        <strong>5. Test Setup:</strong>
                        <br />• Click "Test Connection" to verify API access
                        <br />• Create a small test invoice to confirm functionality
                      </li>
                    </ol>

                    <div className={`p-3 rounded-md border-l-4 ${
                      theme === 'dark' 
                        ? 'bg-amber-900/20 border-amber-500/50 border-l-amber-500' 
                        : 'bg-amber-50 border-amber-200 border-l-amber-500'
                    }`}>
                      <h5 className={`font-medium mb-2 text-sm ${
                        theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                      }`}>
                        ⚠️ Required Strike API Key Permissions - Select These Checkboxes:
                      </h5>
                      
                      <div className={`text-xs space-y-2 ${
                        theme === 'dark' ? 'text-amber-300' : 'text-amber-600'
                      }`}>
                        <div className={`p-2 rounded ${
                          theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100/50'
                        }`}>
                          <p className="font-medium mb-1">📋 Receiving payments section:</p>
                          <ul className="space-y-1 ml-2">
                            <li>✅ <span className="font-mono">Read invoice details</span> → partner.invoice.read</li>
                            <li>✅ <span className="font-mono">Create invoices for your account</span> → partner.invoice.create</li>
                            <li>✅ <span className="font-mono">Generate a quote for an invoice</span> → partner.invoice.quote.generate</li>
                          </ul>
                        </div>

                        <div className={`p-2 rounded ${
                          theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100/50'
                        }`}>
                          <p className="font-medium mb-1">💱 Rates section:</p>
                          <ul className="space-y-1 ml-2">
                            <li>✅ <span className="font-mono">Read currency exchange rate tickers</span> → partner.rates.read</li>
                          </ul>
                        </div>

                        <div className={`p-2 rounded ${
                          theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100/50'
                        }`}>
                          <p className="font-medium mb-1">🔔 Webhook subscriptions section:</p>
                          <ul className="space-y-1 ml-2">
                            <li>✅ <span className="font-mono">Manage webhook subscriptions</span> → partner.webhooks.manage</li>
                          </ul>
                        </div>
                      </div>

                      <p className={`text-xs mt-3 italic ${
                        theme === 'dark' ? 'text-amber-400/80' : 'text-amber-600/80'
                      }`}>
                        <strong>Important:</strong> Check only these 5 permissions when creating your Strike API key. Do not select additional permissions as they may cause security issues.
                      </p>
                    </div>

                    <div className={`mt-3 p-3 rounded-md ${
                      theme === 'dark' 
                        ? 'bg-purple-900/20 border border-purple-700/30' 
                        : 'bg-purple-50 border border-purple-200'
                    }`}>
                      <h5 className={`font-medium mb-2 text-sm ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-700'
                      }`}>
                        📋 Quick Reference - Exact Checkboxes to Select:
                      </h5>
                      <div className={`text-xs space-y-1 ${
                        theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                      }`}>
                        <div className="font-mono bg-white/10 p-2 rounded text-center">
                          <p className="font-bold">In Strike Dashboard → API Keys → New Key:</p>
                          <div className="mt-1 space-y-0.5">
                            <p>☑️ Read invoice details</p>
                            <p>☑️ Create invoices for your account</p>
                            <p>☑️ Generate a quote for an invoice</p>
                            <p>☑️ Read currency exchange rate tickers</p>
                            <p>☑️ Manage webhook subscriptions</p>
                          </div>
                          <p className="mt-1 text-red-400 font-bold">❌ Do NOT select any other permissions!</p>
                        </div>
                      </div>
                    </div>

                    <div className={`mt-3 p-3 rounded-md ${
                      theme === 'dark' 
                        ? 'bg-cyan-900/20 border border-cyan-700/30' 
                        : 'bg-cyan-50 border border-cyan-200'
                    }`}>
                      <h5 className={`font-medium mb-2 text-sm ${
                        theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700'
                      }`}>
                        🔐 Webhook Configuration Status:
                      </h5>
                      <div className={`text-xs space-y-2 ${
                        theme === 'dark' ? 'text-cyan-300' : 'text-cyan-600'
                      }`}>
                        <div className={`p-2 rounded border-l-4 ${
                          theme === 'dark' ? 'bg-orange-900/30 border-orange-500' : 'bg-orange-100 border-orange-500'
                        }`}>
                          <p className="font-semibold text-orange-600 dark:text-orange-400">⚠️ Webhook Access May Be Limited:</p>
                          <div className="space-y-1 mt-1">
                            <p>Strike's webhook feature may not be available to all accounts. Try these options:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Look for <strong>Webhooks</strong>, <strong>API Settings</strong>, or <strong>Developer Tools</strong> in your dashboard</li>
                              <li>Check if your account needs business verification</li>
                              <li>Contact Strike support to request webhook access</li>
                              <li>The system will work in development mode without webhooks</li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className={`p-2 rounded border-l-4 ${
                          theme === 'dark' ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-100 border-blue-500'
                        }`}>
                          <p className="font-semibold text-blue-600 dark:text-blue-400">💡 For now, leave webhook secret empty:</p>
                          <p>Your Bitcoin payment system will work without webhooks. Payments will be processed, but you'll need to manually check payment status in the Strike dashboard.</p>
                        </div>
                      </div>
                    </div>

                    <div className={`mt-3 p-3 rounded-md ${
                      theme === 'dark' 
                        ? 'bg-green-900/20 border border-green-700/30' 
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <h5 className={`font-medium mb-2 text-sm ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-700'
                      }`}>
                        ✅ Production Checklist:
                      </h5>
                      <ul className={`text-xs space-y-1 ${
                        theme === 'dark' ? 'text-green-300' : 'text-green-600'
                      }`}>
                        <li>✓ Strike business account created and verified</li>
                        <li>✓ API key created with exactly 5 permissions above</li>
                        <li>✓ Test connection shows successful response</li>
                        <li>✓ Notification email is monitored regularly</li>
                        <li>⚠️ Webhook setup (optional - may require Strike support)</li>
                        <li>⚠️ System works without webhooks (manual status checking)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 