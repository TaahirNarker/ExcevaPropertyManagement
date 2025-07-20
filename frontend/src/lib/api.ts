/**
 * API Configuration for Property Management System
 * Connects to Django backend with JWT authentication
 */

import axios from 'axios';
import { authService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401 errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await authService.refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        authService.clearTokens();
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 100);
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Type definitions
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  id_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  property_type: string;
  units_count: number;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property: string;
  unit_number: string;
  rent_amount: number;
  is_occupied: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  tenant: string;
  unit: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  status: 'active' | 'ended' | 'terminated';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  lease: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  property_id: string;
  property_name: string;
  unit_number?: string;
  assigned_team: string;
  assigned_team_name: string;
  reporter_name: string;
  estimated_cost: number;
  actual_cost?: number;
  scheduled_date: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cosmetic' | 'landscaping' | 'other';
  images?: string[];
  notes?: string;
}

export interface MaintenanceTeam {
  id: string;
  name: string;
  specialties: string[];
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export interface Inspection {
  id: string;
  type: 'move_in' | 'periodic' | 'move_out';
  property_id: string;
  property_name: string;
  unit_number: string;
  tenant_name?: string;
  inspector_name: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  template_id: string;
  template_name: string;
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'unacceptable';
  total_items: number;
  passed_items: number;
  failed_items: number;
  notes?: string;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  type: 'move_in' | 'periodic' | 'move_out' | 'custom';
  is_standard: boolean;
  description: string;
  estimated_duration: number;
  categories: InspectionCategory[];
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface InspectionCategory {
  id: string;
  name: string;
  description?: string;
  items: InspectionItem[];
}

export interface InspectionItem {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
  condition_options: string[];
  notes?: string;
}

export interface FinancialSummary {
  total_rental_income: number;
  total_outstanding: number;
  collection_rate: number;
  deposits_held: number;
  payments_due_landlords: number;
  payments_due_suppliers: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_profit: number;
  cash_flow: number;
}

export interface RentalOutstanding {
  id: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  amount_due: number;
  days_overdue: number;
  last_payment_date: string;
  status: 'current' | 'late' | 'overdue' | 'delinquent';
}

export interface FinancialPayment {
  id: string;
  type: 'rental' | 'deposit' | 'fee' | 'maintenance';
  tenant_name?: string;
  property_name: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  reference?: string;
}

export interface LandlordPayment {
  id: string;
  landlord_name: string;
  property_name: string;
  amount_due: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  rent_collected: number;
  management_fee: number;
  expenses: number;
}

export interface SupplierPayment {
  id: string;
  supplier_name: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  category: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  balance: number;
  reference: string;
}

// Tenant API
export const tenantApi = {
  searchTenants: async (query: string): Promise<Tenant[]> => {
    const response = await fetchWithError(`${API_BASE_URL}/tenants/?search=${encodeURIComponent(query)}`);
    return response.json();
  },

  createTenant: async (tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> => {
    const response = await fetchWithError(`${API_BASE_URL}/tenants/`, {
      method: 'POST',
      body: JSON.stringify(tenant),
    });
    return response.json();
  },

  getTenant: async (id: string): Promise<Tenant> => {
    const response = await fetchWithError(`${API_BASE_URL}/tenants/${id}/`);
    return response.json();
  },

  updateTenant: async (id: string, tenant: Partial<Tenant>): Promise<Tenant> => {
    const response = await fetchWithError(`${API_BASE_URL}/tenants/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(tenant),
    });
    return response.json();
  },

  deleteTenant: async (id: string): Promise<void> => {
    await fetchWithError(`${API_BASE_URL}/tenants/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Property API
export const propertyAPI = {
  // List properties with pagination and filtering
  list: async (params?: any) => {
    const response = await api.get('/properties/', { params });
    return response.data;
  },

  // Get single property by property_code
  get: async (propertyCode: string) => {
    const response = await api.get(`/properties/${propertyCode}/`);
    return response.data;
  },

  // Create new property
  create: async (data: any) => {
    const response = await api.post('/properties/', data);
    return response.data;
  },

  // Update property
  update: async (propertyCode: string, data: any) => {
    const response = await api.patch(`/properties/${propertyCode}/`, data);
    return response.data;
  },

  // Delete property
  delete: async (propertyCode: string) => {
    await api.delete(`/properties/${propertyCode}/`);
  },

  // Get property statistics
  getStats: async () => {
    const response = await api.get('/properties/stats/');
    return response.data;
  },

  // Get maintenance items for a property
  getMaintenanceItems: async (params?: any) => {
    const response = await api.get('/maintenance/', { params });
    return response.data;
  },

  // Get financial summary for a property
  getFinancialSummary: async (propertyCode: string) => {
    const response = await api.get(`/properties/${propertyCode}/summary/`);
    return response.data;
  },

  // Property images
  images: {
    list: async (propertyCode: string) => {
      const response = await api.get(`/properties/${propertyCode}/images/`);
      return response.data;
  },

    upload: async (propertyCode: string, data: FormData) => {
      const response = await api.post(`/properties/${propertyCode}/images/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },

    delete: async (propertyCode: string, imageId: number) => {
      await api.delete(`/properties/${propertyCode}/images/${imageId}/`);
    },
  },

  // Property documents
  documents: {
    list: async (propertyCode: string) => {
      const response = await api.get(`/properties/${propertyCode}/documents/`);
      return response.data;
    },

    upload: async (propertyCode: string, data: FormData) => {
      const response = await api.post(`/properties/${propertyCode}/documents/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
    });
      return response.data;
  },

    delete: async (propertyCode: string, documentId: number) => {
      await api.delete(`/properties/${propertyCode}/documents/${documentId}/`);
    },
  },
};

// Unit API
export const unitApi = {
  getUnits: async (propertyId?: string): Promise<Unit[]> => {
    const url = propertyId ? `${API_BASE_URL}/units/?property=${propertyId}` : `${API_BASE_URL}/units/`;
    const response = await fetchWithError(url);
    return response.json();
  },

  getUnit: async (id: string): Promise<Unit> => {
    const response = await fetchWithError(`${API_BASE_URL}/units/${id}/`);
    return response.json();
  },

  createUnit: async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit> => {
    const response = await fetchWithError(`${API_BASE_URL}/units/`, {
      method: 'POST',
      body: JSON.stringify(unit),
    });
    return response.json();
  },

  updateUnit: async (id: string, unit: Partial<Unit>): Promise<Unit> => {
    const response = await fetchWithError(`${API_BASE_URL}/units/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(unit),
    });
    return response.json();
  },

  deleteUnit: async (id: string): Promise<void> => {
    await fetchWithError(`${API_BASE_URL}/units/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Lease API
export const leaseApi = {
  getLeases: async (): Promise<Lease[]> => {
    const response = await fetchWithError(`${API_BASE_URL}/leases/`);
    return response.json();
  },

  getLease: async (id: string): Promise<Lease> => {
    const response = await fetchWithError(`${API_BASE_URL}/leases/${id}/`);
    return response.json();
  },

  createLease: async (lease: Omit<Lease, 'id' | 'created_at' | 'updated_at'>): Promise<Lease> => {
    const response = await fetchWithError(`${API_BASE_URL}/leases/`, {
      method: 'POST',
      body: JSON.stringify(lease),
    });
    return response.json();
  },

  updateLease: async (id: string, lease: Partial<Lease>): Promise<Lease> => {
    const response = await fetchWithError(`${API_BASE_URL}/leases/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(lease),
    });
    return response.json();
  },

  deleteLease: async (id: string): Promise<void> => {
    await fetchWithError(`${API_BASE_URL}/leases/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Payment API
export const paymentApi = {
  getPayments: async (leaseId?: string): Promise<Payment[]> => {
    const url = leaseId ? `${API_BASE_URL}/payments/?lease=${leaseId}` : `${API_BASE_URL}/payments/`;
    const response = await fetchWithError(url);
    return response.json();
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await fetchWithError(`${API_BASE_URL}/payments/${id}/`);
    return response.json();
  },

  createPayment: async (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> => {
    const response = await fetchWithError(`${API_BASE_URL}/payments/`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
    return response.json();
  },

  updatePayment: async (id: string, payment: Partial<Payment>): Promise<Payment> => {
    const response = await fetchWithError(`${API_BASE_URL}/payments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payment),
    });
    return response.json();
  },

  deletePayment: async (id: string): Promise<void> => {
    await fetchWithError(`${API_BASE_URL}/payments/${id}/`, {
      method: 'DELETE',
    });
  },
};

// Tenant API functions
export const tenantAPI = {
  // List and create tenants
  list: async (params?: any) => {
    const response = await api.get('/tenants/', { params });
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/tenants/', data);
    return response.data;
  },
  
  // Get, update, and delete tenant
  get: async (tenantCode: string) => {
    const response = await api.get(`/tenants/${tenantCode}/`);
    return response.data;
  },
  
  update: async (tenantCode: string, data: any) => {
    const response = await api.patch(`/tenants/${tenantCode}/`, data);
    return response.data;
  },
  
  delete: async (tenantCode: string) => {
    const response = await api.delete(`/tenants/${tenantCode}/`);
    return response.data;
  },
  
  // Get tenant statistics
  getStats: async (tenantCode: string) => {
    const response = await api.get(`/tenants/${tenantCode}/stats/`);
    return response.data;
  },
  
  // Document management
  documents: {
    list: async (tenantCode: string) => {
      const response = await api.get(`/tenants/${tenantCode}/documents/`);
      return response.data;
    },
    
    upload: async (tenantCode: string, data: FormData) => {
      const response = await api.post(`/tenants/${tenantCode}/documents/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    
    delete: async (tenantCode: string, documentId: number) => {
      const response = await api.delete(`/tenants/${tenantCode}/documents/${documentId}/`);
      return response.data;
    },
  },
  
  // Communication management
  communications: {
    list: async (tenantCode: string) => {
      const response = await api.get(`/tenants/${tenantCode}/communications/`);
      return response.data;
    },
    
    create: async (tenantCode: string, data: any) => {
      const response = await api.post(`/tenants/${tenantCode}/communications/`, data);
      return response.data;
    },
    
    update: async (tenantCode: string, communicationId: number, data: any) => {
      const response = await api.patch(`/tenants/${tenantCode}/communications/${communicationId}/`, data);
      return response.data;
    },
    
    delete: async (tenantCode: string, communicationId: number) => {
      const response = await api.delete(`/tenants/${tenantCode}/communications/${communicationId}/`);
      return response.data;
    },
  },
};

// Maintenance API
export const maintenanceApi = {
  getMaintenanceItems: async (params?: any): Promise<MaintenanceItem[]> => {
    const response = await api.get('/maintenance/', { params });
    return response.data;
  },

  getMaintenanceItem: async (id: string): Promise<MaintenanceItem> => {
    const response = await api.get(`/maintenance/${id}/`);
    return response.data;
  },

  createMaintenanceItem: async (data: Omit<MaintenanceItem, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceItem> => {
    const response = await api.post('/maintenance/', data);
    return response.data;
  },

  updateMaintenanceItem: async (id: string, data: Partial<MaintenanceItem>): Promise<MaintenanceItem> => {
    const response = await api.patch(`/maintenance/${id}/`, data);
    return response.data;
  },

  deleteMaintenanceItem: async (id: string): Promise<void> => {
    await api.delete(`/maintenance/${id}/`);
  },

  getMaintenanceTeams: async (): Promise<MaintenanceTeam[]> => {
    const response = await api.get('/maintenance/teams/');
    return response.data;
  },

  createMaintenanceTeam: async (data: Omit<MaintenanceTeam, 'id'>): Promise<MaintenanceTeam> => {
    const response = await api.post('/maintenance/teams/', data);
    return response.data;
  },

  updateMaintenanceTeam: async (id: string, data: Partial<MaintenanceTeam>): Promise<MaintenanceTeam> => {
    const response = await api.patch(`/maintenance/teams/${id}/`, data);
    return response.data;
  },

  deleteMaintenanceTeam: async (id: string): Promise<void> => {
    await api.delete(`/maintenance/teams/${id}/`);
  },

  uploadMaintenanceImages: async (maintenanceId: string, files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    const response = await api.post(`/maintenance/${maintenanceId}/images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Inspection API
export const inspectionApi = {
  getInspections: async (params?: any): Promise<Inspection[]> => {
    const response = await api.get('/inspections/', { params });
    return response.data;
  },

  getInspection: async (id: string): Promise<Inspection> => {
    const response = await api.get(`/inspections/${id}/`);
    return response.data;
  },

  createInspection: async (data: Omit<Inspection, 'id' | 'created_at' | 'updated_at'>): Promise<Inspection> => {
    const response = await api.post('/inspections/', data);
    return response.data;
  },

  updateInspection: async (id: string, data: Partial<Inspection>): Promise<Inspection> => {
    const response = await api.patch(`/inspections/${id}/`, data);
    return response.data;
  },

  deleteInspection: async (id: string): Promise<void> => {
    await api.delete(`/inspections/${id}/`);
  },

  getInspectionTemplates: async (): Promise<InspectionTemplate[]> => {
    const response = await api.get('/inspections/templates/');
    return response.data;
  },

  getInspectionTemplate: async (id: string): Promise<InspectionTemplate> => {
    const response = await api.get(`/inspections/templates/${id}/`);
    return response.data;
  },

  createInspectionTemplate: async (data: Omit<InspectionTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<InspectionTemplate> => {
    const response = await api.post('/inspections/templates/', data);
    return response.data;
  },

  updateInspectionTemplate: async (id: string, data: Partial<InspectionTemplate>): Promise<InspectionTemplate> => {
    const response = await api.patch(`/inspections/templates/${id}/`, data);
    return response.data;
  },

  deleteInspectionTemplate: async (id: string): Promise<void> => {
    await api.delete(`/inspections/templates/${id}/`);
  },

  duplicateInspectionTemplate: async (id: string): Promise<InspectionTemplate> => {
    const response = await api.post(`/inspections/templates/${id}/duplicate/`);
    return response.data;
  },

  uploadInspectionImages: async (inspectionId: string, files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    const response = await api.post(`/inspections/${inspectionId}/images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getInspectionReport: async (inspectionId: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> => {
    const response = await api.get(`/inspections/${inspectionId}/report/`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

// Finance API
export const financeApi = {
  getFinancialSummary: async (): Promise<FinancialSummary> => {
    const response = await api.get('/finance/summary/');
    return response.data;
  },

  getRentalOutstanding: async (params?: any): Promise<RentalOutstanding[]> => {
    const response = await api.get('/finance/rental-outstanding/', { params });
    return response.data;
  },

  getPayments: async (params?: any): Promise<FinancialPayment[]> => {
    const response = await api.get('/finance/payments/', { params });
    return response.data;
  },

  createPayment: async (data: Omit<FinancialPayment, 'id'>): Promise<FinancialPayment> => {
    const response = await api.post('/finance/payments/', data);
    return response.data;
  },

  updatePayment: async (id: string, data: Partial<FinancialPayment>): Promise<FinancialPayment> => {
    const response = await api.patch(`/finance/payments/${id}/`, data);
    return response.data;
  },

  getLandlordPayments: async (params?: any): Promise<LandlordPayment[]> => {
    const response = await api.get('/finance/landlord-payments/', { params });
    return response.data;
  },

  processLandlordPayment: async (id: string): Promise<LandlordPayment> => {
    const response = await api.post(`/finance/landlord-payments/${id}/process/`);
    return response.data;
  },

  getSupplierPayments: async (params?: any): Promise<SupplierPayment[]> => {
    const response = await api.get('/finance/supplier-payments/', { params });
    return response.data;
  },

  processSupplierPayment: async (id: string): Promise<SupplierPayment> => {
    const response = await api.post(`/finance/supplier-payments/${id}/process/`);
    return response.data;
  },

  getBankTransactions: async (params?: any): Promise<BankTransaction[]> => {
    const response = await api.get('/finance/bank-transactions/', { params });
    return response.data;
  },

  importBankTransactions: async (file: File): Promise<BankTransaction[]> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/finance/bank-transactions/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  categorizeTransaction: async (id: string, category: string): Promise<BankTransaction> => {
    const response = await api.patch(`/finance/bank-transactions/${id}/`, { category });
    return response.data;
  },

  generateFinancialReport: async (reportType: string, params?: any): Promise<Blob> => {
    const response = await api.get(`/finance/reports/${reportType}/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getCollectionRate: async (period?: string): Promise<{ rate: number; trend: number }> => {
    const response = await api.get('/finance/collection-rate/', { params: { period } });
    return response.data;
  },

  getCashFlow: async (period?: string): Promise<{ inflow: number; outflow: number; net: number }> => {
    const response = await api.get('/finance/cash-flow/', { params: { period } });
    return response.data;
  },
};

// Common fetch wrapper with error handling and authentication
const fetchWithError = async (url: string, options: RequestInit = {}) => {
  // Get access token
  const token = authService.getAccessToken();
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 unauthorized - try to refresh token
    if (response.status === 401 && token) {
      try {
        const newToken = await authService.refreshToken();
        
        // Retry the original request with new token
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${newToken}`,
          },
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        
        return retryResponse;
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        authService.clearTokens();
        
        // Use a more graceful redirect that won't cause unhandled errors
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 100);
        }
        
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Export the base URL for other uses
export { API_BASE_URL }; 