/**
 * Add Supplier Form Page
 * Comprehensive form for adding new suppliers with contact details, services, and rates
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

// Form data interface
interface SupplierFormData {
  name: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  category: string;
  subcategory: string;
  website: string;
  vat_number: string;
  tax_number: string;
  is_verified: boolean;
  is_preferred: boolean;
  status: string;
  services_provided: string[];
  hourly_rate: string;
  min_call_out_fee: string;
  response_time: string;
  emergency_available: boolean;
  insurance_valid: boolean;
  license_number: string;
  certifications: string[];
  payment_terms: string;
  notes: string;
}

// Form validation errors
interface FormErrors {
  [key: string]: string;
}

// South African provinces
const SA_PROVINCES = [
  { value: 'western_cape', label: 'Western Cape' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu_natal', label: 'KwaZulu-Natal' },
  { value: 'eastern_cape', label: 'Eastern Cape' },
  { value: 'free_state', label: 'Free State' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'north_west', label: 'North West' },
  { value: 'northern_cape', label: 'Northern Cape' },
];

// Service categories
const SERVICE_CATEGORIES = [
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Landscaping', label: 'Landscaping' },
  { value: 'Painting', label: 'Painting' },
  { value: 'Security', label: 'Security' },
  { value: 'Handyman', label: 'Handyman' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Cleaning', label: 'Cleaning' },
  { value: 'Roofing', label: 'Roofing' },
  { value: 'Flooring', label: 'Flooring' },
  { value: 'Pest Control', label: 'Pest Control' },
  { value: 'Pool Maintenance', label: 'Pool Maintenance' },
];

// Common services by category
const COMMON_SERVICES = {
  'Plumbing': ['Leak Repairs', 'Pipe Installation', 'Drain Cleaning', 'Geyser Installation', 'Toilet Repairs'],
  'Electrical': ['Wiring', 'DB Board Installation', 'Electrical Inspections', 'Solar Installation', 'Fault Finding'],
  'Landscaping': ['Lawn Mowing', 'Tree Trimming', 'Garden Design', 'Irrigation Systems', 'Hedge Trimming'],
  'Painting': ['Interior Painting', 'Exterior Painting', 'Wallpaper Installation', 'Surface Preparation', 'Staining'],
  'Security': ['Alarm Installation', 'CCTV Systems', 'Access Control', 'Security Monitoring', 'Gate Motors'],
  'Handyman': ['General Repairs', 'Furniture Assembly', 'Door Installation', 'Minor Electrical', 'Carpentry'],
  'HVAC': ['Air Conditioning', 'Heating Systems', 'Ventilation', 'Duct Cleaning', 'System Maintenance'],
  'Cleaning': ['House Cleaning', 'Office Cleaning', 'Carpet Cleaning', 'Window Cleaning', 'Deep Cleaning'],
  'Roofing': ['Roof Repairs', 'Roof Installation', 'Gutter Cleaning', 'Waterproofing', 'Roof Inspection'],
  'Flooring': ['Tile Installation', 'Carpet Installation', 'Hardwood Flooring', 'Laminate Flooring', 'Floor Repairs'],
  'Pest Control': ['Termite Treatment', 'Rodent Control', 'Ant Treatment', 'Cockroach Control', 'General Pest Control'],
  'Pool Maintenance': ['Pool Cleaning', 'Chemical Balancing', 'Equipment Repairs', 'Pool Covers', 'Pump Maintenance'],
};

// Response time options
const RESPONSE_TIMES = [
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: '24 hours', label: '24 hours' },
  { value: '1 day', label: '1 day' },
  { value: '2 days', label: '2 days' },
  { value: '1 week', label: '1 week' },
];

// Payment terms
const PAYMENT_TERMS = [
  { value: 'COD', label: 'Cash on Delivery' },
  { value: '7 days', label: '7 days' },
  { value: '30 days', label: '30 days' },
  { value: '60 days', label: '60 days' },
  { value: 'Advance Payment', label: 'Advance Payment' },
];

export default function AddSupplierPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    category: '',
    subcategory: '',
    website: '',
    vat_number: '',
    tax_number: '',
    is_verified: false,
    is_preferred: false,
    status: 'Active',
    services_provided: [],
    hourly_rate: '',
    min_call_out_fee: '',
    response_time: '24 hours',
    emergency_available: false,
    insurance_valid: false,
    license_number: '',
    certifications: [],
    payment_terms: '30 days',
    notes: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [newService, setNewService] = useState('');
  const [newCertification, setNewCertification] = useState('');

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle category change and auto-populate services
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setFormData(prev => ({
      ...prev,
      category,
      subcategory: '',
      services_provided: category && COMMON_SERVICES[category as keyof typeof COMMON_SERVICES] 
        ? COMMON_SERVICES[category as keyof typeof COMMON_SERVICES].slice(0, 3)
        : [],
    }));
  };

  // Handle service addition
  const handleAddService = () => {
    if (newService.trim() && !formData.services_provided.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services_provided: [...prev.services_provided, newService.trim()],
      }));
      setNewService('');
    }
  };

  // Handle service removal
  const handleRemoveService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_provided: prev.services_provided.filter(s => s !== service),
    }));
  };

  // Handle certification addition
  const handleAddCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()],
      }));
      setNewCertification('');
    }
  };

  // Handle certification removal
  const handleRemoveCertification = (certification: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== certification),
    }));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    // Website validation
    if (formData.website.trim() && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid URL (including http:// or https://)';
    }

    // VAT number validation
    if (formData.vat_number.trim() && !/^\d{10}$/.test(formData.vat_number.replace(/\s/g, ''))) {
      newErrors.vat_number = 'VAT number must be 10 digits';
    }

    // Rate validation
    if (formData.hourly_rate && parseFloat(formData.hourly_rate) <= 0) {
      newErrors.hourly_rate = 'Hourly rate must be greater than 0';
    }

    if (formData.min_call_out_fee && parseFloat(formData.min_call_out_fee) < 0) {
      newErrors.min_call_out_fee = 'Call-out fee cannot be negative';
    }

    // Postal code validation
    if (formData.postal_code.trim() && !/^\d{4}$/.test(formData.postal_code.trim())) {
      newErrors.postal_code = 'Postal code must be 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Mock API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock supplier code
      const supplierCode = `SUP${(Math.floor(Math.random() * 999999) + 1).toString().padStart(6, '0')}`;
      
      toast.success(`Supplier ${supplierCode} created successfully!`);
      
      // Navigate back to suppliers list
      router.push('/dashboard/suppliers');
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/dashboard/suppliers');
  };

  if (!isAuthenticated) {
    return (
      <DashboardLayout title="Add Supplier" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Add Supplier" 
      subtitle="Create a new supplier profile"
    >
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Suppliers
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter supplier name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company name"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contact_person ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter contact person name"
                />
                {errors.contact_person && <p className="mt-1 text-sm text-red-400">{errors.contact_person}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+27 21 123 4567"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+27 82 123 4567"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.website ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://www.example.com"
                />
                {errors.website && <p className="mt-1 text-sm text-red-400">{errors.website}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Address Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Province
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Province</option>
                  {SA_PROVINCES.map(province => (
                    <option key={province.value} value={province.value}>
                      {province.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.postal_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="7700"
                />
                {errors.postal_code && <p className="mt-1 text-sm text-red-400">{errors.postal_code}</p>}
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Service Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleCategoryChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Category</option>
                  {SERVICE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-400">{errors.category}</p>}
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Emergency Plumbing"
                />
              </div>

              {/* Services Provided */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Services Provided
                </label>
                <div className="space-y-2">
                  {/* Add new service */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter service name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddService();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Display services */}
                  <div className="flex flex-wrap gap-2">
                    {formData.services_provided.map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {service}
                        <button
                          type="button"
                          onClick={() => handleRemoveService(service)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rates & Terms */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Rates & Terms</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hourly Rate */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Hourly Rate (ZAR)
                </label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.hourly_rate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.hourly_rate && <p className="mt-1 text-sm text-red-400">{errors.hourly_rate}</p>}
              </div>

              {/* Min Call-out Fee */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Minimum Call-out Fee (ZAR)
                </label>
                <input
                  type="number"
                  name="min_call_out_fee"
                  value={formData.min_call_out_fee}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.min_call_out_fee ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.min_call_out_fee && <p className="mt-1 text-sm text-red-400">{errors.min_call_out_fee}</p>}
              </div>

              {/* Response Time */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Response Time
                </label>
                <select
                  name="response_time"
                  value={formData.response_time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RESPONSE_TIMES.map(time => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Payment Terms
                </label>
                <select
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_TERMS.map(term => (
                    <option key={term.value} value={term.value}>
                      {term.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emergency Available */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="emergency_available"
                    checked={formData.emergency_available}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-white">Emergency services available</span>
                </label>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Business Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* VAT Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  VAT Number
                </label>
                <input
                  type="text"
                  name="vat_number"
                  value={formData.vat_number}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.vat_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="4123456789"
                />
                {errors.vat_number && <p className="mt-1 text-sm text-red-400">{errors.vat_number}</p>}
              </div>

              {/* Tax Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tax Number
                </label>
                <input
                  type="text"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tax number"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter license number"
                />
              </div>

              {/* Insurance Valid */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="insurance_valid"
                    checked={formData.insurance_valid}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-white">Insurance valid</span>
                </label>
              </div>

              {/* Verified */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_verified"
                    checked={formData.is_verified}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-white">Verified supplier</span>
                </label>
              </div>

              {/* Preferred */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_preferred"
                    checked={formData.is_preferred}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-white">Preferred supplier</span>
                </label>
              </div>

              {/* Certifications */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Certifications
                </label>
                <div className="space-y-2">
                  {/* Add new certification */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter certification name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCertification();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Display certifications */}
                  <div className="flex flex-wrap gap-2">
                    {formData.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {cert}
                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(cert)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Additional Notes</h3>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes about this supplier..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 