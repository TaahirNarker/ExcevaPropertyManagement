'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  CheckIcon,
  DocumentTextIcon,
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../../components/Layout';
import TenantSearchDropdown from '../../../../components/TenantSearchDropdown';
import DocumentUploader from '../../../../components/DocumentUploader';
import { leaseApi, propertyApi, formatCurrency } from '../../../../lib/api';
import type { Tenant, Unit, LeaseFormData as ApiLeaseFormData } from '../../../../lib/api';

interface CreateLeaseFormData {
  // Tenant Information
  tenant: Tenant | null;
  
  // Property & Unit Selection
  selectedUnit: Unit | null;
  
  // Lease Terms
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  leaseType: 'residential' | 'commercial';
  renewalTerms: string;
  
  // Additional Terms
  escalationRate: number;
  escalationFrequency: 'annual' | 'biannual' | 'none';
  gracePeriod: number;
  lateFee: number;
  
  // Documents
  documents: File[];
  
  // Special Conditions
  specialConditions: string;
  maintenanceResponsibility: 'tenant' | 'landlord' | 'shared';
  petPolicy: 'allowed' | 'not-allowed' | 'conditional';
  smokingPolicy: 'allowed' | 'not-allowed';
}

const STEPS = [
  { id: 1, title: 'Tenant Selection', icon: UsersIcon },
  { id: 2, title: 'Property & Unit', icon: HomeIcon },
  { id: 3, title: 'Lease Terms', icon: DocumentTextIcon },
  { id: 4, title: 'Financial Details', icon: CurrencyDollarIcon },
  { id: 5, title: 'Documents', icon: PaperClipIcon },
  { id: 6, title: 'Review & Create', icon: CheckIcon }
];

const CreateLeasePage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState<CreateLeaseFormData>({
    tenant: null,
    selectedUnit: null,
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
    leaseType: 'residential',
    renewalTerms: '',
    escalationRate: 0,
    escalationFrequency: 'annual',
    gracePeriod: 5,
    lateFee: 500,
    documents: [],
    specialConditions: '',
    maintenanceResponsibility: 'landlord',
    petPolicy: 'conditional',
    smokingPolicy: 'not-allowed'
  });

  useEffect(() => {
    loadAvailableUnits();
  }, []);

  const loadAvailableUnits = async () => {
    try {
      const units = await propertyApi.getVacantUnits();
      setAvailableUnits(units);
    } catch (error) {
      console.error('Failed to load units:', error);
    }
  };

  const updateFormData = (updates: Partial<CreateLeaseFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.tenant || !formData.selectedUnit) {
      alert('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const leaseData: ApiLeaseFormData = {
        tenant_id: formData.tenant.id,
        unit_id: formData.selectedUnit.id,
        start_date: formData.startDate,
        end_date: formData.endDate,
        monthly_rent: formData.monthlyRent,
        deposit: formData.securityDeposit,
        escalation_rate: formData.escalationRate,
        notes: formData.specialConditions
      };

      const newLease = await leaseApi.createLease(leaseData);
      
      // Upload documents if any
      for (const doc of formData.documents) {
        // Document upload logic would go here
      }

      router.push(`/property-management/leases/${newLease.id}`);
    } catch (error) {
      console.error('Failed to create lease:', error);
      alert('Failed to create lease. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select or Create Tenant
              </h3>
              <TenantSearchDropdown
                onChange={(tenant: Tenant | null) => updateFormData({ tenant })}
                placeholder="Search for existing tenant or create new one..."
              />
            </div>
            
            {formData.tenant && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4"
              >
                <div className="flex items-center space-x-3">
                  <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Selected Tenant: {formData.tenant.name}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {formData.tenant.email} • {formData.tenant.phone}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select Property Unit
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableUnits.map((unit) => (
                  <motion.div
                    key={unit.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateFormData({ selectedUnit: unit, monthlyRent: unit.monthly_rent || 0 })}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.selectedUnit?.id === unit.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Unit {unit.number}
                      </h4>
                      <span className="text-sm px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                        Available
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {unit.property}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Property Unit
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(unit.monthly_rent || 0)}/month
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Lease Terms & Duration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lease Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateFormData({ startDate: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lease End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateFormData({ endDate: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lease Type
              </label>
              <select
                value={formData.leaseType}
                onChange={(e) => updateFormData({ leaseType: e.target.value as 'residential' | 'commercial' })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Renewal Terms
              </label>
              <textarea
                value={formData.renewalTerms}
                onChange={(e) => updateFormData({ renewalTerms: e.target.value })}
                rows={3}
                placeholder="Describe renewal conditions and terms..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Financial Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Rent (ZAR)
                </label>
                <input
                  type="number"
                  value={formData.monthlyRent}
                  onChange={(e) => updateFormData({ monthlyRent: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Security Deposit (ZAR)
                </label>
                <input
                  type="number"
                  value={formData.securityDeposit}
                  onChange={(e) => updateFormData({ securityDeposit: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Escalation Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.escalationRate}
                  onChange={(e) => updateFormData({ escalationRate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Escalation Frequency
                </label>
                <select
                  value={formData.escalationFrequency}
                  onChange={(e) => updateFormData({ escalationFrequency: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="none">No Escalation</option>
                  <option value="annual">Annual</option>
                  <option value="biannual">Bi-Annual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  value={formData.gracePeriod}
                  onChange={(e) => updateFormData({ gracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Late Fee (ZAR)
                </label>
                <input
                  type="number"
                  value={formData.lateFee}
                  onChange={(e) => updateFormData({ lateFee: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Upload Lease Documents
            </h3>
            
            <DocumentUploader
              documents={[]}
              onUpload={async (file: File, documentType: string) => {
                // Handle file upload
                console.log('Uploading:', file, documentType);
              }}
              onDelete={async (documentId: number) => {
                // Handle file deletion
                console.log('Deleting:', documentId);
              }}
              acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.png']}
              maxFileSize={10}
            />

            <div className="space-y-4 mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Additional Policies</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maintenance Responsibility
                  </label>
                  <select
                    value={formData.maintenanceResponsibility}
                    onChange={(e) => updateFormData({ maintenanceResponsibility: e.target.value as any })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="landlord">Landlord</option>
                    <option value="tenant">Tenant</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pet Policy
                  </label>
                  <select
                    value={formData.petPolicy}
                    onChange={(e) => updateFormData({ petPolicy: e.target.value as any })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="not-allowed">Not Allowed</option>
                    <option value="allowed">Allowed</option>
                    <option value="conditional">Conditional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Smoking Policy
                </label>
                <select
                  value={formData.smokingPolicy}
                  onChange={(e) => updateFormData({ smokingPolicy: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="not-allowed">Not Allowed</option>
                  <option value="allowed">Allowed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Special Conditions
                </label>
                <textarea
                  value={formData.specialConditions}
                  onChange={(e) => updateFormData({ specialConditions: e.target.value })}
                  rows={4}
                  placeholder="Any special conditions or clauses for this lease..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Review & Create Lease
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Tenant</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formData.tenant?.name}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Unit</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Unit {formData.selectedUnit?.number} - {formData.selectedUnit?.property}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Lease Period</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formData.startDate} to {formData.endDate}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Monthly Rent</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(formData.monthlyRent)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Create New Lease
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Step {currentStep} of {STEPS.length}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      currentStep >= step.id
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      currentStep >= step.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-4 ${
                        currentStep > step.id
                          ? 'bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Previous</span>
            </button>

            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <span>Next</span>
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    <span>Create Lease</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateLeasePage; 