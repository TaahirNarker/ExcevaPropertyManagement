'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BuildingOfficeIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { propertiesAPI } from '@/lib/properties-api';

interface Property {
  id: string;
  property_code: string;
  name: string;
  display_name: string;
  property_type: string;
  property_type_display: string;
  full_address: string;
  monthly_rental_amount?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city: string;
  province: string;
  primary_image?: string;
}

interface PropertySearchDropdownProps {
  value: Property | null;
  onChange: (property: Property | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const PropertySearchDropdown: React.FC<PropertySearchDropdownProps> = ({
  value,
  onChange,
  placeholder = "Search for a property...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
          const data = await propertiesAPI.getVacantPropertiesForTenantAssignment(searchQuery);
          setSearchResults(data.results || []);
        } catch (error) {
          console.error('Property search failed:', error);
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

  const handleSelectProperty = (property: Property) => {
    onChange(property);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    onChange(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Display selected property or search input */}
      {value ? (
        <div className="border border-white/20 rounded-md bg-white/10 backdrop-blur-sm p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-white">{value.name}</span>
                <span className="text-sm text-gray-300">({value.property_code})</span>
              </div>
              <div className="mt-1 text-sm text-gray-300">
                <div className="flex items-center space-x-1">
                  <MapPinIcon className="h-3 w-3" />
                  <span>{value.full_address}</span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <CurrencyDollarIcon className="h-3 w-3" />
                  <span>{formatCurrency(value.monthly_rental_amount)}</span>
                  {value.bedrooms && value.bathrooms && (
                    <span className="ml-2">
                      • {value.bedrooms} bed, {value.bathrooms} bath
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !value && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/20 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-300">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Searching properties...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handleSelectProperty(property)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800 focus:bg-gray-800 focus:outline-none border-b border-white/10 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <BuildingOfficeIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white truncate">{property.name}</span>
                        <span className="text-sm text-gray-400">({property.property_code})</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="h-3 w-3" />
                          <span className="truncate">{property.full_address}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-blue-400 font-medium">
                            {formatCurrency(property.monthly_rental_amount)}
                          </span>
                          {property.bedrooms && property.bathrooms && (
                            <span className="text-gray-400">
                              {property.bedrooms} bed, {property.bathrooms} bath
                            </span>
                          )}
                          <span className="text-gray-500 text-xs">
                            {property.property_type_display}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="p-4 text-center text-gray-300">
              <BuildingOfficeIcon className="h-8 w-8 mx-auto mb-2 text-gray-500" />
              <p>No vacant properties found</p>
              <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-300">
              <BuildingOfficeIcon className="h-8 w-8 mx-auto mb-2 text-gray-500" />
              <p>Start typing to search for vacant properties</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertySearchDropdown;
