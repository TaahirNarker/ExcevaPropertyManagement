'use client';

import React, { useState } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, EyeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { financeApi } from '@/lib/api';

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  date: string;
  description: string;
  amount: string;
  reference: string;
  balance?: string;
}

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'results'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    date: '',
    description: '',
    amount: '',
    reference: '',
    balance: ''
  });
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError(null);
      
      // Parse CSV file for preview
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          setError('CSV file must contain at least a header row and one data row');
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: CSVRow = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        setCsvHeaders(headers);
        setCsvData(rows);
        
        // Auto-detect common field mappings
        autoDetectFieldMapping(headers);
        
      } catch (err) {
        setError('Failed to parse CSV file');
        setCsvFile(null);
      }
    } else {
      setError('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const autoDetectFieldMapping = (headers: string[]) => {
    const mapping: FieldMapping = {
      date: '',
      description: '',
      amount: '',
      reference: '',
      balance: ''
    };

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // Date field detection
      if (!mapping.date && (lowerHeader.includes('date') || lowerHeader.includes('transaction'))) {
        mapping.date = header;
      }
      
      // Description field detection
      if (!mapping.description && (lowerHeader.includes('description') || lowerHeader.includes('detail') || lowerHeader.includes('narrative'))) {
        mapping.description = header;
      }
      
      // Amount field detection
      if (!mapping.amount && (lowerHeader.includes('amount') || lowerHeader.includes('value') || lowerHeader.includes('debit') || lowerHeader.includes('credit'))) {
        mapping.amount = header;
      }
      
      // Reference field detection
      if (!mapping.reference && (lowerHeader.includes('reference') || lowerHeader.includes('ref') || lowerHeader.includes('transaction'))) {
        mapping.reference = header;
      }
      
      // Balance field detection
      if (!mapping.balance && lowerHeader.includes('balance')) {
        mapping.balance = header;
      }
    });

    setFieldMapping(mapping);
  };

  const handleNextStep = () => {
    if (step === 'upload' && csvFile && bankName.trim()) {
      setStep('mapping');
    } else if (step === 'mapping' && validateFieldMapping()) {
      generatePreviewData();
      setStep('preview');
    }
  };

  const handlePrevStep = () => {
    if (step === 'mapping') {
      setStep('upload');
    } else if (step === 'preview') {
      setStep('mapping');
    }
  };

  const validateFieldMapping = () => {
    if (!fieldMapping.date || !fieldMapping.description || !fieldMapping.amount) {
      setError('Date, Description, and Amount fields are required');
      return false;
    }
    setError(null);
    return true;
  };

  const generatePreviewData = () => {
    const preview = csvData.slice(0, 5).map(row => ({
      date: row[fieldMapping.date],
      description: row[fieldMapping.description],
      amount: parseFloat(row[fieldMapping.amount]) || 0,
      reference: fieldMapping.reference ? row[fieldMapping.reference] : '',
      balance: fieldMapping.balance ? parseFloat(row[fieldMapping.balance]) || 0 : null,
      raw: row
    }));
    setPreviewData(preview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile || !bankName.trim()) {
      setError('Please select a CSV file and enter a bank name');
      return;
    }

    if (!validateFieldMapping()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('results');

    try {
      // Create a new FormData with mapped data
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('bank_name', bankName);
      formData.append('field_mapping', JSON.stringify(fieldMapping));

      const result = await financeApi.importBankCSV(csvFile, bankName);
      
      if (result.success) {
        setImportResult(result);
        onSuccess();
      } else {
        setError(result.error || 'Import failed');
        setStep('preview'); // Go back to preview on error
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setStep('preview'); // Go back to preview on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    setBankName('');
    setImportResult(null);
    setError(null);
    setStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMapping({
      date: '',
      description: '',
      amount: '',
      reference: '',
      balance: ''
    });
    setPreviewData([]);
    onClose();
  };

  const updateFieldMapping = (field: keyof FieldMapping, value: string) => {
    setFieldMapping(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Import Bank CSV</h2>
            <p className="text-muted-foreground mt-1">
              Upload bank transaction CSV for automatic payment reconciliation
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-center space-x-8">
            {[
              { key: 'upload', label: 'Upload', icon: ArrowUpTrayIcon },
              { key: 'mapping', label: 'Field Mapping', icon: DocumentTextIcon },
              { key: 'preview', label: 'Preview', icon: EyeIcon },
              { key: 'results', label: 'Results', icon: CheckCircleIcon }
            ].map((stepItem, index) => {
              const isActive = step === stepItem.key;
              const isCompleted = ['upload', 'mapping', 'preview', 'results'].indexOf(step) > index;
              const Icon = stepItem.icon;
              
              return (
                <div key={stepItem.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                    'border-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 
                    'text-muted-foreground'
                  }`}>
                    {stepItem.label}
                  </span>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 ml-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Bank Name */}
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-foreground mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., Standard Bank, FNB, ABSA"
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* CSV File Upload */}
              <div>
                <label htmlFor="csvFile" className="block text-sm font-medium text-foreground mb-2">
                  CSV File
                </label>
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors">
                  <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <label htmlFor="csvFile" className="cursor-pointer">
                    <ArrowUpTrayIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-foreground font-medium">
                      {csvFile ? csvFile.name : 'Click to upload CSV file'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      CSV file with bank transaction data
                    </div>
                  </label>
                </div>
                {csvFile && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    {csvFile.name} selected ({csvData.length} rows detected)
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-end">
                <button
                  onClick={handleNextStep}
                  disabled={!csvFile || !bankName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Next: Field Mapping
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Map CSV Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Map your CSV columns to the required fields. Auto-detection has been applied.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Required Fields */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date Field <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fieldMapping.date}
                    onChange={(e) => updateFieldMapping('date', e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select date field...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description Field <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fieldMapping.description}
                    onChange={(e) => updateFieldMapping('description', e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select description field...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Amount Field <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fieldMapping.amount}
                    onChange={(e) => updateFieldMapping('amount', e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select amount field...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Reference Field
                  </label>
                  <select
                    value={fieldMapping.reference}
                    onChange={(e) => updateFieldMapping('reference', e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select reference field...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Balance Field (Optional)
                  </label>
                  <select
                    value={fieldMapping.balance || ''}
                    onChange={(e) => updateFieldMapping('balance', e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select balance field...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="bg-muted hover:bg-muted/80 text-foreground font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!fieldMapping.date || !fieldMapping.description || !fieldMapping.amount}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Next: Preview Data
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Preview Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Review the first 5 rows to ensure field mapping is correct.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border border-border/50 rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-foreground">Date</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-foreground">Description</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-foreground">Amount</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-foreground">Reference</th>
                      {fieldMapping.balance && (
                        <th className="px-4 py-2 text-left text-sm font-medium text-foreground">Balance</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {previewData.map((row, index) => (
                      <tr key={index} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-sm text-foreground">{row.date}</td>
                        <td className="px-4 py-2 text-sm text-foreground">{row.description}</td>
                        <td className="px-4 py-2 text-sm text-foreground font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground">{row.reference}</td>
                        {fieldMapping.balance && (
                          <td className="px-4 py-2 text-sm text-foreground">
                            {row.balance ? formatCurrency(row.balance) : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-600 mb-2">Import Summary</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <div><strong>Bank:</strong> {bankName}</div>
                  <div><strong>Total Rows:</strong> {csvData.length}</div>
                  <div><strong>Fields Mapped:</strong> {Object.values(fieldMapping).filter(Boolean).length}/5</div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="bg-muted hover:bg-muted/80 text-foreground font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:text-muted-foreground text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    'Import Transactions'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Batch ID: {importResult.batch_id}
                </p>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.successful_reconciliations}
                  </div>
                  <div className="text-sm text-green-600">Auto-Reconciled</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResult.manual_review_required}
                  </div>
                  <div className="text-sm text-blue-600">Manual Review</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {importResult.total_transactions}
                  </div>
                  <div className="text-sm text-orange-600">Total Transactions</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.failed_transactions || 0}
                  </div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setImportResult(null);
                    setStep('upload');
                    setCsvFile(null);
                    setBankName('');
                    setCsvData([]);
                    setCsvHeaders([]);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600 mt-4">
              <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
