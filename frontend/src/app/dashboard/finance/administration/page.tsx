'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

export default function FinanceAdministrationPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Authentication check
  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Finance Administration">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Finance Administration">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-muted-foreground">Loading administration data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Finance Administration">
      <div className="p-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Administration Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-sm text-blue-400 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  All systems operational
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Security Status</p>
                <p className="text-2xl font-bold text-foreground">Secure</p>
                <p className="text-sm text-green-400 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  No threats detected
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Last Backup</p>
                <p className="text-2xl font-bold text-foreground">2h ago</p>
                <p className="text-sm text-orange-400 flex items-center">
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Scheduled backup
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Cog6ToothIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-foreground">98%</p>
                <p className="text-sm text-purple-400 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Optimal performance
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Administration Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Management */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-foreground">User Management</h3>
              <button 
                onClick={() => openModal('addUser')}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add User</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">JD</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">John Doe</p>
                    <p className="text-xs text-muted-foreground">Administrator</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-400 hover:text-blue-300">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button className="text-red-400 hover:text-red-300">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">JS</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Jane Smith</p>
                    <p className="text-xs text-muted-foreground">Finance Manager</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-400 hover:text-blue-300">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button className="text-red-400 hover:text-red-300">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-foreground">System Settings</h3>
              <button 
                onClick={() => openModal('editSettings')}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                <span>Edit</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Currency</p>
                  <p className="text-xs text-muted-foreground">Default system currency</p>
                </div>
                <span className="text-sm text-foreground font-medium">ZAR (R)</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto Backup</p>
                  <p className="text-xs text-muted-foreground">Automatic data backup</p>
                </div>
                <span className="text-sm text-green-400 font-medium">Enabled</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Audit Logging</p>
                  <p className="text-xs text-muted-foreground">Track system activities</p>
                </div>
                <span className="text-sm text-green-400 font-medium">Active</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Auth</p>
                  <p className="text-xs text-muted-foreground">Enhanced security</p>
                </div>
                <span className="text-sm text-orange-400 font-medium">Optional</span>
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-foreground">Recent Audit Logs</h3>
              <button 
                onClick={() => openModal('viewLogs')}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                <EyeIcon className="h-4 w-4" />
                <span>View All</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">User login successful</p>
                  <p className="text-xs text-muted-foreground">John Doe • 2 minutes ago</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <PencilIcon className="h-5 w-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Settings updated</p>
                  <p className="text-xs text-muted-foreground">Jane Smith • 15 minutes ago</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <ArrowPathIcon className="h-5 w-5 text-orange-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">System backup completed</p>
                  <p className="text-xs text-muted-foreground">System • 2 hours ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-6">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => openModal('backup')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <ArrowPathIcon className="h-8 w-8 text-blue-400 mb-2" />
                <span className="text-sm text-foreground">Backup Data</span>
              </button>

              <button 
                onClick={() => openModal('restore')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <ClockIcon className="h-8 w-8 text-green-400 mb-2" />
                <span className="text-sm text-foreground">Restore Data</span>
              </button>

              <button 
                onClick={() => openModal('export')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <DocumentTextIcon className="h-8 w-8 text-purple-400 mb-2" />
                <span className="text-sm text-foreground">Export Logs</span>
              </button>

              <button 
                onClick={() => openModal('maintenance')}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Cog6ToothIcon className="h-8 w-8 text-orange-400 mb-2" />
                <span className="text-sm text-foreground">Maintenance</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">
                  {modalType === 'addUser' && 'Add New User'}
                  {modalType === 'editSettings' && 'Edit Settings'}
                  {modalType === 'viewLogs' && 'View Audit Logs'}
                  {modalType === 'backup' && 'Backup Data'}
                  {modalType === 'restore' && 'Restore Data'}
                  {modalType === 'export' && 'Export Logs'}
                  {modalType === 'maintenance' && 'System Maintenance'}
                </h3>
                <button onClick={closeModal} className="text-muted-foreground/70 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="text-muted-foreground">
                <p>Administration functionality will be implemented here for {modalType}.</p>
                {selectedItem && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <pre className="text-xs">{JSON.stringify(selectedItem, null, 2)}</pre>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  // Helper function
  function openModal(type: string, item?: any) {
    setModalType(type);
    setSelectedItem(item);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
  }
} 