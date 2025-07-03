'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Tenant, tenantApi } from '../lib/api';

interface TenantSearchDropdownProps {
  value?: Tenant | null;
  onChange: (tenant: Tenant | null) => void;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
}

interface NewTenantForm {
  name: string;
  email: string;
  phone: string;
  id_number: string;
}

const TenantSearchDropdown: React.FC<TenantSearchDropdownProps> = ({
  value,
  onChange,
  placeholder = "Search for a tenant...",
  className = "",
  allowCreate = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState<NewTenantForm>({
    name: '',
    email: '',
    phone: '',
    id_number: ''
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await tenantApi.searchTenants(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectTenant = (tenant: Tenant) => {
    onChange(tenant);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
  };

  const handleCreateTenant = async () => {
    if (!newTenantForm.name || !newTenantForm.email || !newTenantForm.phone) {
      return;
    }

    setIsCreating(true);
    try {
      const newTenant = await tenantApi.createTenant(newTenantForm);
      handleSelectTenant(newTenant);
      setNewTenantForm({ name: '', email: '', phone: '', id_number: '' });
    } catch (error) {
      console.error('Failed to create tenant:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setNewTenantForm(prev => ({ ...prev, name: searchQuery }));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone);
  };

  const isFormValid = () => {
    return newTenantForm.name.trim() &&
           validateEmail(newTenantForm.email) &&
           validatePhone(newTenantForm.phone);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected Tenant Display or Search Input */}
      {value ? (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <div className="flex-shrink-0 mr-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {value.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {value.email} • {value.phone}
            </p>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsOpen(true)}
          className="relative"
        >
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden"
          >
            {!showCreateForm ? (
              <>
                {/* Search Results */}
                <div className="max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => handleSelectTenant(tenant)}
                          className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {tenant.name}
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <EnvelopeIcon className="w-3 h-3 mr-1" />
                                  {tenant.email}
                                </span>
                                <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <PhoneIcon className="w-3 h-3 mr-1" />
                                  {tenant.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center">
                      <UserIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        No tenants found for "{searchQuery}"
                      </p>
                      {allowCreate && (
                        <button
                          onClick={handleShowCreateForm}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <UserPlusIcon className="w-4 h-4 mr-1" />
                          Create new tenant
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Type at least 2 characters to search
                      </p>
                    </div>
                  )}
                </div>

                {/* Create Tenant Button */}
                {allowCreate && searchQuery.length >= 2 && searchResults.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                    <button
                      onClick={handleShowCreateForm}
                      className="w-full flex items-center justify-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Create new tenant: "{searchQuery}"
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Create Tenant Form */
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Create New Tenant
                  </h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newTenantForm.name}
                      onChange={(e) => setNewTenantForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter tenant's full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={newTenantForm.email}
                      onChange={(e) => setNewTenantForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        newTenantForm.email && !validateEmail(newTenantForm.email)
                          ? 'border-red-300 dark:border-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="tenant@example.com"
                    />
                    {newTenantForm.email && !validateEmail(newTenantForm.email) && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={newTenantForm.phone}
                      onChange={(e) => setNewTenantForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        newTenantForm.phone && !validatePhone(newTenantForm.phone)
                          ? 'border-red-300 dark:border-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="+27 12 345 6789"
                    />
                    {newTenantForm.phone && !validatePhone(newTenantForm.phone) && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid phone number</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID Number
                    </label>
                    <input
                      type="text"
                      value={newTenantForm.id_number}
                      onChange={(e) => setNewTenantForm(prev => ({ ...prev, id_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ID or passport number"
                    />
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleCreateTenant}
                      disabled={!isFormValid() || isCreating}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCreating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4 mr-2" />
                          Create Tenant
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenantSearchDropdown; 