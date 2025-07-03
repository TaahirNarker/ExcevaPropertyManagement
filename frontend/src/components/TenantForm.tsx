'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  MapPinIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { tenantApi, propertyApi, Tenant, Property } from '../lib/api';

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tenant: Tenant) => void;
  tenant?: Tenant | null; // For editing existing tenant
}

interface EmailEntry {
  id: string;
  email: string;
  type: string;
}

interface PhoneEntry {
  id: string;
  number: string;
  type: string;
}

interface AddressEntry {
  id: string;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  type: string;
}

interface BankAccountEntry {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch_code: string;
  type: string;
}

interface FormData {
  type: 'consumer' | 'business';
  display_as: string;
  first_name: string;
  surname: string;
  rsa_id_number: string;
  passport_number: string;
  trading_as: string;
  emails: EmailEntry[];
  phones: PhoneEntry[];
  addresses: AddressEntry[];
  bank_accounts: BankAccountEntry[];
  is_active: boolean;
  property_id: number | null;
  create_new_property: boolean;
  new_property_name: string;
  new_property_address: string;
  new_property_city: string;
  new_property_province: string;
  new_property_postal_code: string;
}

const TenantForm = ({ isOpen, onClose, onSuccess, tenant }: TenantFormProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: 'consumer',
    display_as: '',
    first_name: tenant?.name?.split(' ')[0] || '',
    surname: tenant?.name?.split(' ').slice(1).join(' ') || '',
    rsa_id_number: tenant?.id_number || '',
    passport_number: '',
    trading_as: '',
    emails: tenant ? [{ id: '1', email: tenant.email, type: 'primary' }] : [{ id: '1', email: '', type: 'primary' }],
    phones: tenant ? [{ id: '1', number: tenant.phone, type: 'primary' }] : [{ id: '1', number: '', type: 'primary' }],
    addresses: [{ id: '1', street: '', city: '', province: '', postal_code: '', type: 'residential' }],
    bank_accounts: [{ id: '1', account_name: '', account_number: '', bank_name: '', branch_code: '', type: 'primary' }],
    is_active: tenant?.is_active ?? true,
    property_id: null,
    create_new_property: false,
    new_property_name: '',
    new_property_address: '',
    new_property_city: '',
    new_property_province: '',
    new_property_postal_code: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const propertiesData = await propertyApi.getAll();
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Auto-populate property address when property is selected
  useEffect(() => {
    if (formData.property_id && !formData.create_new_property) {
      const selectedProperty = properties.find(p => p.id === formData.property_id);
      if (selectedProperty) {
        setFormData(prev => ({
          ...prev,
          addresses: [{
            ...prev.addresses[0],
            street: selectedProperty.address || '',
            city: selectedProperty.city || '',
            province: selectedProperty.province || '',
            postal_code: selectedProperty.postal_code || ''
          }]
        }));
      }
    }
  }, [formData.property_id, formData.create_new_property, properties]);

  // Auto-populate new property fields from address
  useEffect(() => {
    if (formData.create_new_property && formData.addresses[0]) {
      const address = formData.addresses[0];
      setFormData(prev => ({
        ...prev,
        new_property_address: address.street,
        new_property_city: address.city,
        new_property_province: address.province,
        new_property_postal_code: address.postal_code
      }));
    }
  }, [formData.create_new_property, formData.addresses]);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, { id: generateId(), email: '', type: 'secondary' }]
    }));
  };

  const removeEmail = (id: string) => {
    if (formData.emails.length > 1) {
      setFormData(prev => ({
        ...prev,
        emails: prev.emails.filter(email => email.id !== id)
      }));
    }
  };

  const updateEmail = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map(email => 
        email.id === id ? { ...email, [field]: value } : email
      )
    }));
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, { id: generateId(), number: '', type: 'secondary' }]
    }));
  };

  const removePhone = (id: string) => {
    if (formData.phones.length > 1) {
      setFormData(prev => ({
        ...prev,
        phones: prev.phones.filter(phone => phone.id !== id)
      }));
    }
  };

  const updatePhone = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.map(phone => 
        phone.id === id ? { ...phone, [field]: value } : phone
      )
    }));
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { id: generateId(), street: '', city: '', province: '', postal_code: '', type: 'secondary' }]
    }));
  };

  const removeAddress = (id: string) => {
    if (formData.addresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        addresses: prev.addresses.filter(address => address.id !== id)
      }));
    }
  };

  const updateAddress = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map(address => 
        address.id === id ? { ...address, [field]: value } : address
      )
    }));
  };

  const addBankAccount = () => {
    setFormData(prev => ({
      ...prev,
      bank_accounts: [...prev.bank_accounts, { id: generateId(), account_name: '', account_number: '', bank_name: '', branch_code: '', type: 'secondary' }]
    }));
  };

  const removeBankAccount = (id: string) => {
    if (formData.bank_accounts.length > 1) {
      setFormData(prev => ({
        ...prev,
        bank_accounts: prev.bank_accounts.filter(account => account.id !== id)
      }));
    }
  };

  const updateBankAccount = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map(account => 
        account.id === id ? { ...account, [field]: value } : account
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }

    if (!formData.rsa_id_number.trim() && !formData.passport_number.trim()) {
      newErrors.identification = 'Either RSA ID Number or Passport Number is required';
    }

    if (formData.rsa_id_number && formData.rsa_id_number.length !== 13) {
      newErrors.rsa_id_number = 'RSA ID number must be 13 digits';
    }

    // Validate primary email
    const primaryEmail = formData.emails[0];
    if (!primaryEmail.email.trim()) {
      newErrors.primary_email = 'Primary email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail.email)) {
      newErrors.primary_email = 'Please enter a valid email address';
    }

    // Validate primary phone
    const primaryPhone = formData.phones[0];
    if (!primaryPhone.number.trim()) {
      newErrors.primary_phone = 'Primary phone number is required';
    }

    // Validate property selection
    if (!formData.create_new_property && !formData.property_id) {
      newErrors.property = 'Please select a property or choose to create a new one';
    }

    // Validate new property fields if creating new property
    if (formData.create_new_property) {
      if (!formData.new_property_name.trim()) {
        newErrors.new_property_name = 'Property name is required';
      }
      if (!formData.new_property_address.trim()) {
        newErrors.new_property_address = 'Property address is required';
      }
      if (!formData.new_property_city.trim()) {
        newErrors.new_property_city = 'City is required';
      }
      if (!formData.new_property_province.trim()) {
        newErrors.new_property_province = 'Province is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      let propertyId = formData.property_id;

      // Create new property if needed
      if (formData.create_new_property) {
        const newPropertyData = {
          name: formData.new_property_name,
          address: formData.new_property_address,
          city: formData.new_property_city,
          province: formData.new_property_province,
          postal_code: formData.new_property_postal_code,
          property_type: 'residential',
          property_category: 'residential',
          purchase_price: '0',
          current_market_value: '0',
          total_units: 1,
          bedrooms: 0,
          building_size: 0,
          description: `Property created for tenant: ${formData.first_name} ${formData.surname}`,
          landlord_name: '',
          landlord_phone: '',
          landlord_email: '',
          bank_account_name: '',
          bank_account_number: '',
          bank_name: ''
        };

        const newProperty = await propertyApi.create(newPropertyData);
        propertyId = newProperty.id;
      }

      // Convert form data to API format
      const tenantData = {
        name: `${formData.first_name} ${formData.surname}`.trim(),
        email: formData.emails[0].email,
        phone_number: formData.phones[0].number,
        id_number: formData.rsa_id_number || formData.passport_number,
        tenant_type: formData.type === 'business' ? 'company' : 'individual',
        is_active: formData.is_active,
        property_id: propertyId, // Link to property
        // Optional fields that the Django model supports
        alternative_phone: formData.phones.length > 1 ? formData.phones[1].number : null,
        postal_address: formData.addresses.length > 0 ? 
          `${formData.addresses[0].street}, ${formData.addresses[0].city}, ${formData.addresses[0].province} ${formData.addresses[0].postal_code}`.trim() : null,
        notes: formData.trading_as ? `Trading as: ${formData.trading_as}` : null
      };
      
      let savedTenant: Tenant;
      
      if (tenant) {
        // Update existing tenant
        savedTenant = await tenantApi.update(tenant.id, tenantData);
      } else {
        // Create new tenant
        savedTenant = await tenantApi.create(tenantData);
      }
      
      onSuccess(savedTenant);
      onClose();
      
      // Reset form
      setFormData({
        type: 'consumer',
        display_as: '',
        first_name: '',
        surname: '',
        rsa_id_number: '',
        passport_number: '',
        trading_as: '',
        emails: [{ id: '1', email: '', type: 'primary' }],
        phones: [{ id: '1', number: '', type: 'primary' }],
        addresses: [{ id: '1', street: '', city: '', province: '', postal_code: '', type: 'residential' }],
        bank_accounts: [{ id: '1', account_name: '', account_number: '', bank_name: '', branch_code: '', type: 'primary' }],
        is_active: true,
        property_id: null,
        create_new_property: false,
        new_property_name: '',
        new_property_address: '',
        new_property_city: '',
        new_property_province: '',
        new_property_postal_code: '',
      });
      setErrors({});
      
    } catch (error) {
      console.error('Error saving tenant:', error);
      setErrors({ submit: 'Failed to save tenant. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {tenant ? 'Edit Tenant Details' : 'Enter the details for the new applicant / tenant'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Type and Display As Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'consumer' | 'business' }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="consumer">Consumer</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display As
              </label>
              <input
                type="text"
                value={formData.display_as}
                onChange={(e) => setFormData(prev => ({ ...prev, display_as: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Internal short name for this contact"
              />
            </div>
          </div>

          {/* Person Section */}
          <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Person</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="First name"
                />
                {errors.first_name && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.surname ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Surname"
                />
                {errors.surname && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.surname}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  value={formData.rsa_id_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, rsa_id_number: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.rsa_id_number || errors.identification ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="RSA ID Number"
                  maxLength={13}
                />
                {errors.rsa_id_number && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.rsa_id_number}</p>}
              </div>

              <div>
                <input
                  type="text"
                  value={formData.passport_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, passport_number: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.identification ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Passport Number"
                />
              </div>
            </div>
            
            {errors.identification && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.identification}</p>}
          </div>

          {/* Sole Proprietor Section */}
          {formData.type === 'business' && (
            <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sole Proprietor</h3>
              
              <div>
                <input
                  type="text"
                  value={formData.trading_as}
                  onChange={(e) => setFormData(prev => ({ ...prev, trading_as: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Trading As"
                />
              </div>
            </div>
          )}

          {/* Emails Section */}
          <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Emails</h3>
              <button
                type="button"
                onClick={addEmail}
                className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <span>⊕ Add another email address</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.emails.map((email, index) => (
                <div key={email.id} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email.email}
                      onChange={(e) => updateEmail(email.id, 'email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        index === 0 && errors.primary_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder={index === 0 ? "Primary email address" : "Additional email address"}
                    />
                    {index === 0 && errors.primary_email && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.primary_email}</p>}
                  </div>
                  {formData.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(email.id)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Numbers Section */}
          <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Numbers</h3>
              <button
                type="button"
                onClick={addPhone}
                className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <span>⊕ Add another phone</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.phones.map((phone, index) => (
                <div key={phone.id} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={phone.number}
                      onChange={(e) => updatePhone(phone.id, 'number', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        index === 0 && errors.primary_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder={index === 0 ? "Primary phone number" : "Additional phone number"}
                    />
                    {index === 0 && errors.primary_phone && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.primary_phone}</p>}
                  </div>
                  {formData.phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(phone.id)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Property Selection Section - NEW */}
          <div className="border-l-4 border-blue-300 dark:border-blue-600 pl-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2" />
              Property Association
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="property_option"
                    checked={!formData.create_new_property}
                    onChange={() => setFormData(prev => ({ ...prev, create_new_property: false, property_id: null }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Existing Property
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="property_option"
                    checked={formData.create_new_property}
                    onChange={() => setFormData(prev => ({ ...prev, create_new_property: true, property_id: null }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Create New Property
                  </span>
                </label>
              </div>

              {!formData.create_new_property ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Property *
                  </label>
                  <select
                    value={formData.property_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.property ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={loadingProperties}
                  >
                    <option value="">
                      {loadingProperties ? 'Loading properties...' : 'Select a property'}
                    </option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address}, {property.city}
                      </option>
                    ))}
                  </select>
                  {errors.property && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.property}</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      value={formData.new_property_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, new_property_name: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.new_property_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., Sunset Apartments, Ocean View Complex"
                    />
                    {errors.new_property_name && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.new_property_name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={formData.new_property_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_property_address: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.new_property_address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Street address"
                      />
                      {errors.new_property_address && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.new_property_address}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.new_property_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_property_city: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.new_property_city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="City"
                      />
                      {errors.new_property_city && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.new_property_city}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Province *
                      </label>
                      <select
                        value={formData.new_property_province}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_property_province: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.new_property_province ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">Select Province</option>
                        <option value="Eastern Cape">Eastern Cape</option>
                        <option value="Free State">Free State</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Mpumalanga">Mpumalanga</option>
                        <option value="Northern Cape">Northern Cape</option>
                        <option value="North West">North West</option>
                        <option value="Western Cape">Western Cape</option>
                      </select>
                      {errors.new_property_province && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.new_property_province}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={formData.new_property_postal_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_property_postal_code: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Postal code"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <HomeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          New Property Creation
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                          This property will be created in the Properties & Units section and can be managed there after tenant creation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Addresses Section */}
          <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Addresses</h3>
              <button
                type="button"
                onClick={addAddress}
                className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <span>⊕ Add another address</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.addresses.map((address, index) => (
                <div key={address.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {index === 0 ? 'Primary Address' : `Address ${index + 1}`}
                    </h4>
                    {formData.addresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAddress(address.id)}
                        className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={address.street}
                        onChange={(e) => updateAddress(address.id, 'street', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Street Address"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={address.city}
                        onChange={(e) => updateAddress(address.id, 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={address.province}
                        onChange={(e) => updateAddress(address.id, 'province', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Province"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accounts Section */}
          <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accounts</h3>
              <button
                type="button"
                onClick={addBankAccount}
                className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <span>⊕ Add another bank account</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.bank_accounts.map((account, index) => (
                <div key={account.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {index === 0 ? 'Primary Bank Account' : `Bank Account ${index + 1}`}
                    </h4>
                    {formData.bank_accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBankAccount(account.id)}
                        className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={account.account_name}
                        onChange={(e) => updateBankAccount(account.id, 'account_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Account Name"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={account.account_number}
                        onChange={(e) => updateBankAccount(account.id, 'account_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Account Number"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={account.bank_name}
                        onChange={(e) => updateBankAccount(account.id, 'bank_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Bank Name"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={account.branch_code}
                        onChange={(e) => updateBankAccount(account.id, 'branch_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Branch Code"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (tenant ? 'Updating Tenant...' : 'Creating Tenant...') : (tenant ? 'Update Tenant' : 'Create Tenant')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default TenantForm; 