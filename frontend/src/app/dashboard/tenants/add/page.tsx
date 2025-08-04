/**
 * Add Tenant Page
 * Comprehensive tenant creation form with modern UI design
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  XMarkIcon,
  PlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BanknotesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { tenantApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Form validation schema
const tenantFormSchema = z.object({
  // Basic Information
  type: z.enum(['Consumer', 'Business']),
  display_name: z.string().optional(),
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  rsa_id_number: z.string().optional(),
  passport_number: z.string().optional(),
  business_name: z.string().optional(),
  business_registration_number: z.string().optional(),
  
  // Contact Information
  emails: z.array(z.object({
    email: z.string().email('Invalid email address'),
    type: z.enum(['primary', 'secondary']),
  })).min(1, 'At least one email is required'),
  
  phones: z.array(z.object({
    number: z.string().min(10, 'Phone number is required'),
    type: z.enum(['mobile', 'home', 'work']),
  })).min(1, 'At least one phone number is required'),
  
  // Addresses
  addresses: z.array(z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    province: z.string().min(2, 'Province is required'),
    postal_code: z.string().min(4, 'Postal code is required'),
    type: z.enum(['residential', 'postal', 'work']),
  })).min(1, 'At least one address is required'),
  
  // Bank Accounts
  bank_accounts: z.array(z.object({
    bank_name: z.string().min(2, 'Bank name is required'),
    account_number: z.string().min(8, 'Account number is required'),
    branch_code: z.string().min(6, 'Branch code is required'),
    account_type: z.enum(['current', 'savings', 'credit']),
  })).optional(),
}).refine((data) => {
  // Require either RSA ID number or passport number
  return data.rsa_id_number || data.passport_number;
}, {
  message: "Either RSA ID number or passport number is required",
  path: ["rsa_id_number"], // This will show the error on the RSA ID field
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;

export default function AddTenantPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      type: 'Consumer',
      display_name: '',
      first_name: '',
      last_name: '',
      rsa_id_number: '',
      passport_number: '',
      business_name: '',
      business_registration_number: '',
      emails: [{ email: '', type: 'primary' as const }],
      phones: [{ number: '', type: 'mobile' as const }],
      addresses: [{ street: '', city: '', province: '', postal_code: '', type: 'residential' as const }],
      bank_accounts: [],
    },
  });

  const watchedType = watch('type');
  const watchedEmails = watch('emails');
  const watchedPhones = watch('phones');
  const watchedAddresses = watch('addresses');
  const watchedBankAccounts = watch('bank_accounts');

  // Dynamic field management
  const addEmail = () => {
    const currentEmails = getValues('emails');
    setValue('emails', [...currentEmails, { email: '', type: 'secondary' as const }]);
  };

  const removeEmail = (index: number) => {
    const currentEmails = getValues('emails');
    if (currentEmails.length > 1) {
      setValue('emails', currentEmails.filter((_, i) => i !== index));
    }
  };

  const addPhone = () => {
    const currentPhones = getValues('phones');
    setValue('phones', [...currentPhones, { number: '', type: 'mobile' as const }]);
  };

  const removePhone = (index: number) => {
    const currentPhones = getValues('phones');
    if (currentPhones.length > 1) {
      setValue('phones', currentPhones.filter((_, i) => i !== index));
    }
  };

  const addAddress = () => {
    const currentAddresses = getValues('addresses');
    setValue('addresses', [...currentAddresses, { street: '', city: '', province: '', postal_code: '', type: 'residential' as const }]);
  };

  const removeAddress = (index: number) => {
    const currentAddresses = getValues('addresses');
    if (currentAddresses.length > 1) {
      setValue('addresses', currentAddresses.filter((_, i) => i !== index));
    }
  };

  const addBankAccount = () => {
    const currentAccounts = getValues('bank_accounts') || [];
    setValue('bank_accounts', [...currentAccounts, { bank_name: '', account_number: '', branch_code: '', account_type: 'current' as const }]);
  };

  const removeBankAccount = (index: number) => {
    const currentAccounts = getValues('bank_accounts') || [];
    setValue('bank_accounts', currentAccounts.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: TenantFormData) => {
    try {
      setIsSubmitting(true);
      
      // Transform data to match backend expectations
      const tenantData = {
        // User fields (required by backend)
        email: data.emails[0]?.email || '',
        first_name: data.first_name,
        last_name: data.last_name,
        
        // Tenant fields
        id_number: data.rsa_id_number || data.passport_number || (() => {
          throw new Error('Either RSA ID number or passport number is required');
        })(),
        date_of_birth: '1990-01-01', // Default date - you may want to add this field
        phone: data.phones[0]?.number || '',
        alternative_phone: data.phones[1]?.number || '',
        alternative_email: data.emails[1]?.email || '',
        
        // Address fields (use first address)
        address: data.addresses[0]?.street || '',
        city: data.addresses[0]?.city || '',
        province: data.addresses[0]?.province || '',
        postal_code: data.addresses[0]?.postal_code || '',
        
        // Employment (default values)
        employment_status: 'employed',
        employer_name: '',
        employer_contact: '',
        monthly_income: null,
        
        // Emergency contact (default values)
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: data.phones[0]?.number || '',
        emergency_contact_relationship: 'Family',
        
        // Status
        status: 'pending',
        notes: `Type: ${data.type}${data.display_name ? `, Display Name: ${data.display_name}` : ''}${data.business_name ? `, Business Name: ${data.business_name}` : ''}${data.business_registration_number ? `, Business Reg: ${data.business_registration_number}` : ''}`
      };

      await tenantApi.createTenant(tenantData);
      toast.success('Tenant created successfully!');
      router.push('/dashboard/tenants');
    } catch (error) {
      console.error('Error creating tenant:', error);
      if (error.response?.data) {
        console.error('Server error details:', error.response.data);
        toast.error(`Failed to create tenant: ${JSON.stringify(error.response.data)}`);
      } else {
        toast.error('Failed to create tenant. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/tenants');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Add Tenant">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add New Tenant">
      <div className="p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">Type</label>
                <select
                  {...register('type')}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Consumer">Consumer</option>
                  <option value="Business">Business</option>
                </select>
                {errors.type && (
                  <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">Display As</label>
                <input
                  type="text"
                  placeholder="Internal short name for this contact"
                  {...register('display_name')}
                  className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.display_name && (
                  <p className="text-red-400 text-sm mt-1">{errors.display_name.message}</p>
                )}
              </div>
            </div>

            {/* Person Section */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-white mb-3 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Person
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">First name</label>
                  <input
                    type="text"
                    {...register('first_name')}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.first_name && (
                    <p className="text-red-400 text-sm mt-1">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Surname</label>
                  <input
                    type="text"
                    {...register('last_name')}
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.last_name && (
                    <p className="text-red-400 text-sm mt-1">{errors.last_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    RSA ID Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('rsa_id_number')}
                    placeholder="Enter RSA ID number"
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.rsa_id_number && (
                    <p className="text-red-400 text-sm mt-1">{errors.rsa_id_number.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Passport Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('passport_number')}
                    placeholder="Enter passport number"
                    className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.passport_number && (
                    <p className="text-red-400 text-sm mt-1">{errors.passport_number.message}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <p className="text-sm text-gray-300">
                    <span className="text-red-400">*</span> Either RSA ID number or passport number is required
                  </p>
                </div>
              </div>
            </div>

            {/* Business Section */}
            {watchedType === 'Business' && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-white mb-3">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Business Name</label>
                    <input
                      type="text"
                      {...register('business_name')}
                      className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.business_name && (
                      <p className="text-red-400 text-sm mt-1">{errors.business_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Business Registration Number</label>
                    <input
                      type="text"
                      {...register('business_registration_number')}
                      className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.business_registration_number && (
                      <p className="text-red-400 text-sm mt-1">{errors.business_registration_number.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emails */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                Emails
              </h3>
              <button
                type="button"
                onClick={addEmail}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add another email address
              </button>
            </div>
            
            <div className="space-y-3">
              {watchedEmails?.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="email"
                    {...register(`emails.${index}.email`)}
                    placeholder="Email address"
                    className="flex-1 px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <select
                    {...register(`emails.${index}.type`)}
                    className="px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                  {watchedEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <PhoneIcon className="h-5 w-5 mr-2" />
                Numbers
              </h3>
              <button
                type="button"
                onClick={addPhone}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add another phone
              </button>
            </div>
            
            <div className="space-y-3">
              {watchedPhones?.map((phone, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="tel"
                    {...register(`phones.${index}.number`)}
                    placeholder="Phone number"
                    className="flex-1 px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <select
                    {...register(`phones.${index}.type`)}
                    className="px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                  </select>
                  {watchedPhones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                Addresses
              </h3>
              <button
                type="button"
                onClick={addAddress}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add another address
              </button>
            </div>
            
            <div className="space-y-4">
              {watchedAddresses?.map((address, index) => (
                <div key={index} className="border border-white/10 rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <select
                      {...register(`addresses.${index}.type`)}
                      className="px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="residential">Residential</option>
                      <option value="postal">Postal</option>
                      <option value="work">Work</option>
                    </select>
                    {watchedAddresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAddress(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        {...register(`addresses.${index}.street`)}
                        placeholder="Street address"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        {...register(`addresses.${index}.city`)}
                        placeholder="City"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        {...register(`addresses.${index}.province`)}
                        placeholder="Province"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        {...register(`addresses.${index}.postal_code`)}
                        placeholder="Postal code"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2" />
                Accounts
              </h3>
              <button
                type="button"
                onClick={addBankAccount}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add another bank account
              </button>
            </div>
            
            <div className="space-y-4">
              {watchedBankAccounts?.map((account, index) => (
                <div key={index} className="border border-white/10 rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Bank Account {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeBankAccount(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        {...register(`bank_accounts.${index}.bank_name`)}
                        placeholder="Bank name"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        {...register(`bank_accounts.${index}.account_number`)}
                        placeholder="Account number"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        {...register(`bank_accounts.${index}.branch_code`)}
                        placeholder="Branch code"
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <select
                        {...register(`bank_accounts.${index}.account_type`)}
                        className="block w-full px-3 py-2 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="current">Current</option>
                        <option value="savings">Savings</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!watchedBankAccounts || watchedBankAccounts.length === 0) && (
                <div className="text-center py-8 text-muted-foreground/70">
                  <BanknotesIcon className="mx-auto h-12 w-12 mb-2" />
                  <p>No bank accounts added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-white/20 rounded-md text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 