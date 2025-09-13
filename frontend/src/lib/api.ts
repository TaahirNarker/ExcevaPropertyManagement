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
  tenant_code: string;
  name: string;
  email: string;
  phone: string;
  id_number?: string;
  date_of_birth?: string;
  status: 'active' | 'inactive' | 'pending';
  employment_status?: string;
  employer_name?: string;
  monthly_income?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  notes?: string;
  property_name?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
}

export interface LeaseHistory {
  id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  status: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploaded_at: string;
  expires_at?: string;
}

export interface Communication {
  id: string;
  type: 'email' | 'phone' | 'sms' | 'note';
  date: string;
  subject: string;
  content: string;
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
  property: string;
  tenant: string;
  landlord?: string;
  lease_type: 'Fixed' | 'Month-to-Month' | 'Periodic';
  start_date: string;
  end_date: string;
  lease_duration_months?: number;
  monthly_rent: string; // Changed from number to string for DecimalField
  deposit_amount: string; // Changed from number to string for DecimalField
  rental_frequency: 'Monthly' | 'Weekly' | 'Bi-weekly' | 'Quarterly' | 'Annually';
  rent_due_day: number;
  late_fee_type: 'percentage' | 'amount';
  late_fee_percentage: string; // Changed from number to string for DecimalField
  late_fee_amount: string; // Changed from number to string for DecimalField
  grace_period_days: number;
  management_fee: string; // Changed from number to string for DecimalField
  procurement_fee: string; // Changed from number to string for DecimalField
  pro_rata_amount: string; // Changed from number to string for DecimalField
  auto_renew: boolean;
  notice_period_days: number;
  escalation_type: 'percentage' | 'amount' | 'none';
  escalation_percentage: string; // Changed from number to string for DecimalField
  escalation_amount: string; // Changed from number to string for DecimalField
  escalation_date?: string;
  next_escalation_date?: string;
  invoice_date?: string;
  status: 'active' | 'expired' | 'terminated' | 'pending' | 'draft';
  terms?: string;
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

export interface Invoice {
  id: string;
  invoice_number: string;
  title?: string;
  issue_date?: string;
  due_date: string;
  status: 'draft' | 'sent' | 'locked' | 'paid' | 'overdue' | 'cancelled';
  lease: string;
  property: string;
  tenant: string;
  landlord?: string;
  created_by?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  email_subject?: string;
  email_recipient?: string;
  bank_info?: string;
  extra_notes?: string;
  line_items?: InvoiceLineItem[];
  // Locking fields
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  sent_at?: string;
  sent_by?: string;
  // Invoice type fields
  invoice_type: 'regular' | 'interim' | 'late_fee' | 'credit';
  parent_invoice?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id?: string;
  description: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  from_details?: string;
  to_details?: string;
  default_notes?: string;
  bank_info?: string;
  usage_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
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

export interface DepositSummary {
  total_deposits_held: number;
  deposits_by_landlord: number;
  deposits_by_agent: number;
  outstanding_deposits: number;
}

export interface DepositDetail {
  lease_id: string;
  property_tenant: string;
  state: string;
  held: number;
  still_due: number;
  landlord_name: string;
  deposit_paid: boolean;
  lease_start: string;
  lease_end: string;
}

export interface DepositDetailsResponse {
  results: DepositDetail[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
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

// Expense Management Types
export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  parent_category?: number | null;
  is_active: boolean;
  tax_deductible: boolean;
  color_code: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms: string;
  is_preferred: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  expense_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'rejected';
  property: string | number;
  property_name?: string;
  category: number;
  category_name?: string;
  supplier?: number | null;
  supplier_name?: string;
  created_by?: number | string;
  created_by_name?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  receipt_image?: string;
  invoice_number?: string;
  reference_number?: string;
  approved_by?: number | string | null;
  approved_by_name?: string;
  approved_at?: string | null;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  name: string;
  period: 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string;
  total_budget: number;
  spent_amount: number;
  remaining_amount: number;
  is_active: boolean;
  property?: number | null;
  property_name?: string;
  category?: number | null;
  category_name?: string;
  created_at: string;
  updated_at: string;
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

  // Additional methods for compatibility
  list: async (params?: any): Promise<{ results: Tenant[]; count: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const response = await fetchWithError(`${API_BASE_URL}/tenants/?${queryParams.toString()}`);
    return response.json();
  },

  getAll: async (): Promise<Tenant[]> => {
    const response = await fetchWithError(`${API_BASE_URL}/tenants/?page_size=1000`);
    const data = await response.json();
    return data.results || data;
  },

  delete: async (id: string): Promise<void> => {
    await fetchWithError(`${API_BASE_URL}/tenants/${id}/`, {
      method: 'DELETE',
    });
  },

  // Additional methods for tenant details
  getTenantLeaseHistory: async (id: string): Promise<LeaseHistory[]> => {
    try {
      const response = await fetchWithError(`${API_BASE_URL}/tenants/id/${id}/leases/`);
      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Error fetching tenant lease history:', error);
      // Return empty array if lease history fails
      return [];
    }
  },

  getTenantDocuments: async (id: string): Promise<Document[]> => {
    try {
      const response = await fetchWithError(`${API_BASE_URL}/tenants/${id}/documents/`);
      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Error fetching tenant documents:', error);
      // Return empty array if documents fail
      return [];
    }
  },

  getTenantCommunications: async (id: string): Promise<Communication[]> => {
    try {
      const response = await fetchWithError(`${API_BASE_URL}/tenants/${id}/communications/`);
      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Error fetching tenant communications:', error);
      // Return empty array if communications fail
      return [];
    }
  },

  // Documents API
  documents: {
    upload: async (tenantId: string, formData: FormData): Promise<any> => {
      const response = await fetchWithError(`${API_BASE_URL}/tenants/${tenantId}/documents/`, {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
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
  getLeases: async (params: {
    search?: string;
    status?: string;
    property?: string | number;
    tenant?: number;
    page?: number;
    page_size?: number;
  } = {}): Promise<{ results: Lease[]; count: number; page: number; page_size: number; total_pages: number }> => {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.property) searchParams.append('property', params.property.toString());
    if (params.tenant) searchParams.append('tenant', params.tenant.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.page_size) searchParams.append('page_size', params.page_size.toString());
    
    const url = `${API_BASE_URL}/leases/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetchWithError(url);
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

  // Lease financials for a specific lease
  getLeaseFinancials: async (leaseId: number): Promise<any> => {
    const response = await api.get('/finance/lease-financials/', {
      params: { lease_id: leaseId }
    });
    return response.data;
  },

  // Deposit management
  getDepositSummary: async (): Promise<DepositSummary> => {
    const response = await api.get('/finance/deposit-summary/');
    return response.data;
  },

  getDepositDetails: async (params?: any): Promise<DepositDetailsResponse> => {
    const response = await api.get('/finance/deposit-details/', { params });
    return response.data;
  },
};

// Expense Management API
export const expensesApi = {
  // Categories
  listCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await api.get('/finance/expense-categories/');
    return response.data.results || response.data;
  },
  createCategory: async (data: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await api.post('/finance/expense-categories/', data);
    return response.data;
  },
  updateCategory: async (id: number, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await api.patch(`/finance/expense-categories/${id}/`, data);
    return response.data;
  },
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/finance/expense-categories/${id}/`);
  },

  // Suppliers
  listSuppliers: async (): Promise<Supplier[]> => {
    const response = await api.get('/finance/suppliers/');
    return response.data.results || response.data;
  },
  createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.post('/finance/suppliers/', data);
    return response.data;
  },
  updateSupplier: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.patch(`/finance/suppliers/${id}/`, data);
    return response.data;
  },
  deleteSupplier: async (id: number): Promise<void> => {
    await api.delete(`/finance/suppliers/${id}/`);
  },

  // Expenses
  listExpenses: async (params?: any): Promise<{ results: Expense[]; count: number }> => {
    const response = await api.get('/finance/expenses/', { params });
    return response.data;
  },
  createExpense: async (data: Partial<Expense>): Promise<Expense> => {
    const response = await api.post('/finance/expenses/', data);
    return response.data;
  },
  updateExpense: async (id: number, data: Partial<Expense>): Promise<Expense> => {
    const response = await api.patch(`/finance/expenses/${id}/`, data);
    return response.data;
  },
  deleteExpense: async (id: number): Promise<void> => {
    await api.delete(`/finance/expenses/${id}/`);
  },
  getExpenseAnalytics: async (): Promise<{
    monthly_trend: Array<{ month: string; total: number }>;
    by_category: Array<{ category: string; total: number }>;
    top_properties: Array<{ property_name: string; total: number }>;
  }> => {
    const response = await api.get('/finance/expenses/analytics/');
    return response.data;
  },

  // Budgets
  listBudgets: async (params?: any): Promise<{ results: Budget[]; count: number }> => {
    const response = await api.get('/finance/budgets/', { params });
    return response.data;
  },
  createBudget: async (data: Partial<Budget>): Promise<Budget> => {
    const response = await api.post('/finance/budgets/', data);
    return response.data;
  },
  updateBudget: async (id: number, data: Partial<Budget>): Promise<Budget> => {
    const response = await api.patch(`/finance/budgets/${id}/`, data);
    return response.data;
  },
  deleteBudget: async (id: number): Promise<void> => {
    await api.delete(`/finance/budgets/${id}/`);
  },
};

// Invoice API - Complete implementation
export const invoiceApi = {
  // Get all invoices with pagination and filtering
  getInvoices: async (params?: any): Promise<{ results: Invoice[]; count: number; next?: string; previous?: string }> => {
    const response = await api.get('/finance/invoices/', { params });
    return response.data;
  },

  // Get all invoices (for compatibility with existing code)
  getAll: async (params?: any): Promise<Invoice[]> => {
    const response = await api.get('/finance/invoices/', { params });
    return response.data.results || response.data;
  },

  // Get single invoice
  getInvoice: async (id: string | number): Promise<Invoice> => {
    const response = await api.get(`/finance/invoices/${id}/`);
    return response.data;
  },

  // Create new invoice
  createInvoice: async (data: any): Promise<Invoice> => {
    const response = await api.post('/finance/invoices/', data);
    return response.data;
  },

  // Update invoice
  updateInvoice: async (id: string | number, data: any): Promise<Invoice> => {
    const response = await api.patch(`/finance/invoices/${id}/`, data);
    return response.data;
  },

  // Delete invoice
  deleteInvoice: async (id: string | number): Promise<void> => {
    await api.delete(`/finance/invoices/${id}/`);
  },

  // Send invoice via email
  sendInvoice: async (
    invoiceId: string | number,
    method: 'email' | 'whatsapp' | 'sms' = 'email',
    recipientEmail?: string
  ): Promise<{ success: boolean; message: string; status?: string }> => {
    try {
      const response = await api.post(`/finance/invoices/${invoiceId}/send/`, {
        method,
        recipient_email: recipientEmail,
      });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response = await api.post(`/finance/invoices/${invoiceId}/send_invoice/`, {
          method,
          recipient_email: recipientEmail,
        });
        return response.data;
      }
      throw err;
    }
  },

  // Mark invoice as paid
  markInvoiceAsPaid: async (id: string | number, data?: any): Promise<Invoice> => {
    const response = await api.post(`/finance/invoices/${id}/mark_paid/`, data || {});
    return response.data;
  },

  // Apply late fee to invoice
  applyLateFee: async (id: string | number, amount: number): Promise<Invoice> => {
    const response = await api.post(`/finance/invoices/${id}/apply_late_fee/`, { amount });
    return response.data;
  },

  // Duplicate invoice
  duplicateInvoice: async (id: string | number): Promise<Invoice> => {
    const response = await api.post(`/finance/invoices/${id}/duplicate/`);
    return response.data;
  },

  // Generate and download invoice PDF
  generateInvoicePDF: async (id: string | number): Promise<Blob> => {
    const response = await api.get(`/finance/invoices/${id}/generate_pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Send bulk reminders
  sendBulkReminders: async (
    invoiceIds: (string | number)[], 
    method: 'email' | 'whatsapp' | 'sms' = 'email'
  ): Promise<{ success: boolean; results: any; message: string }> => {
    const response = await api.post('/finance/invoices/send_bulk_reminders/', {
      invoice_ids: invoiceIds,
      method,
    });
    return response.data;
  },

  // Invoice templates
  getInvoiceTemplates: async (): Promise<InvoiceTemplate[]> => {
    const response = await api.get('/finance/templates/');
    return response.data.results || response.data;
  },

  getInvoiceTemplate: async (id: string | number): Promise<InvoiceTemplate> => {
    const response = await api.get(`/finance/templates/${id}/`);
    return response.data;
  },

  createInvoiceTemplate: async (data: any): Promise<InvoiceTemplate> => {
    const response = await api.post('/finance/templates/', data);
    return response.data;
  },

  updateInvoiceTemplate: async (id: string | number, data: any): Promise<InvoiceTemplate> => {
    const response = await api.patch(`/finance/templates/${id}/`, data);
    return response.data;
  },

  deleteInvoiceTemplate: async (id: string | number): Promise<void> => {
    await api.delete(`/finance/templates/${id}/`);
  },

  applyTemplateToInvoice: async (templateId: string | number, invoiceId: string | number): Promise<Invoice> => {
    const response = await api.post(`/finance/templates/${templateId}/apply_to_invoice/`, {
      invoice_id: invoiceId,
    });
    return response.data;
  },

  // Manual payments (read-only listing)
  listManualPaymentsByLease: async (leaseId: number) => {
    const response = await api.get(`/finance/manual-payments/?lease=${leaseId}`);
    return response.data;
  },

  // New locking and audit features
  getAuditTrail: async (id: string | number): Promise<{ invoice_number: string; audit_trail: any[] }> => {
    const response = await api.get(`/finance/invoices/${id}/audit_trail/`);
    return response.data;
  },

  adminUnlock: async (id: string | number, reason: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/finance/invoices/${id}/admin_unlock/`, { reason });
    return response.data;
  },

  createInterimInvoice: async (
    parentInvoiceId: string | number,
    data: {
      invoice_type: 'interim' | 'late_fee' | 'credit';
      description: string;
      line_items: Array<{
        description: string;
        category?: string;
        quantity: number;
        unit_price: number;
      }>;
    }
  ): Promise<{ success: boolean; message: string; invoice?: Invoice }> => {
    const response = await api.post(`/finance/invoices/${parentInvoiceId}/create_interim_invoice/`, data);
    return response.data;
  },

  // Check invoice permissions
  canEdit: (invoice: Invoice): boolean => {
    return !invoice.is_locked && invoice.status === 'draft';
  },

  canSend: (invoice: Invoice): boolean => {
    return !invoice.is_locked && invoice.status === 'draft';
  },

  canDelete: (invoice: Invoice): boolean => {
    return !invoice.is_locked && invoice.status === 'draft';
  },

  isLocked: (invoice: Invoice): boolean => {
    return invoice.is_locked || invoice.status === 'locked';
  },

  // New Payment Reconciliation Methods
  importBankCSV: async (csvFile: File, bankName: string): Promise<{
    success: boolean;
    batch_id: string;
    total_transactions: number;
    successful_reconciliations: number;
    manual_review_required: number;
    failed_transactions: number;
    error?: string;
  }> => {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    formData.append('bank_name', bankName);
    
    const response = await api.post('/finance/payment-reconciliation/import-csv/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  recordManualPayment: async (data: {
    lease_id: number;
    payment_method: string;
    amount: number;
    payment_date: string;
    reference_number?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    payment_id: number;
    status: string;
    message: string;
    error?: string;
  }> => {
    const response = await api.post('/finance/payment-reconciliation/manual-payment/', data);
    return response.data;
  },

  allocatePayment: async (data: {
    payment_id?: number;
    bank_transaction_id?: number;
    allocations: Array<{
      invoice_id: number;
      amount: number;
      notes?: string;
    }>;
    create_credit?: boolean;
    notes?: string;
  }): Promise<{
    success: boolean;
    total_allocated: number;
    allocations_created: number;
    message: string;
    error?: string;
  }> => {
    const response = await api.post('/finance/payment-reconciliation/allocate-payment/', data);
    return response.data;
  },

  createAdjustment: async (data: {
    invoice_id: number;
    adjustment_type: string;
    amount: number;
    reason: string;
    notes?: string;
    effective_date: string;
  }): Promise<{
    success: boolean;
    adjustment_id: number;
    new_invoice_total: number;
    new_balance_due: number;
    message: string;
    error?: string;
  }> => {
    const response = await api.post('/finance/payment-reconciliation/create-adjustment/', data);
    return response.data;
  },

  getTenantStatement: async (tenantId: number, startDate?: string, endDate?: string): Promise<{
    success: boolean;
    tenant: {
      id: number;
      name: string;
      email: string;
    };
    lease: {
      id: number;
      unit: string;
      monthly_rent: number;
    };
    statement_period: {
      start_date: string;
      end_date: string;
      generated_date: string;
    };
    summary: {
      opening_balance: number;
      total_charges: number;
      total_payments: number;
      total_adjustments: number;
      closing_balance: number;
      credit_balance: number;
      overdue_amount: number;
    };
    transactions: Array<{
      date: string;
      type: string;
      description: string;
      reference: string;
      charges: number;
      payments: number;
      adjustments: number;
      balance: number;
    }>;
    outstanding_invoices: Array<{
      invoice_id: number;
      invoice_number: string;
      due_date: string;
      amount: number;
      days_overdue: number;
    }>;
    error?: string;
  }> => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get(`/finance/payment-reconciliation/tenant-statement/${tenantId}/`, { params });
    return response.data;
  },

  // Lease-based statement endpoint using real backend data
  getLeaseStatement: async (
    leaseId: number,
    startDate?: string,
    endDate?: string
  ): Promise<any> => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/finance/payment-reconciliation/lease-statement/${leaseId}/`, { params });
    return response.data;
  },

  getUnmatchedPayments: async (): Promise<{
    success: boolean;
    unmatched_transactions: Array<{
      id: number;
      transaction_date: string;
      description: string;
      amount: number;
      tenant_reference: string;
      status: string;
      tenant_name?: string;
      property_name?: string;
    }>;
    pending_payments: Array<{
      id: number;
      payment_date: string;
      amount: number;
      payment_method: string;
      tenant_name: string;
      property_name: string;
      unit_number: string;
      status: string;
    }>;
    total_unmatched: number;
    error?: string;
  }> => {
    const response = await api.get('/finance/payment-reconciliation/unmatched-payments/');
    return response.data;
  },

  // Fetch active underpayment alerts for internal notifications
  getUnderpaymentAlerts: async (): Promise<{
    success: boolean;
    count: number;
    alerts: Array<{
      id: number;
      tenant: number;
      tenant_name: string;
      invoice: number;
      invoice_number: string;
      expected_amount: number;
      actual_amount: number;
      shortfall_amount: number;
      alert_message: string;
      status: string;
      created_at: string;
      created_at_formatted: string;
    }>;
    error?: string;
  }> => {
    const response = await api.get('/finance/payment-reconciliation/underpayment-alerts/');
    return response.data;
  },

  getPaymentStatus: async (paymentId: number): Promise<{
    success: boolean;
    payment: any;
    payment_type: string;
    allocations: Array<{
      id: number;
      invoice_number: string;
      tenant_name: string;
      allocated_amount: number;
      allocation_type: string;
      allocation_date: string;
    }>;
    total_allocated: number;
    allocation_count: number;
    error?: string;
  }> => {
    const response = await api.get(`/finance/payment-reconciliation/payment-status/${paymentId}/`);
    return response.data;
  },
};

// Landlord API
export const landlordApi = {
  // Get all landlords
  getLandlords: async (): Promise<{ id: string; name: string; email: string }[]> => {
    try {
      const response = await api.get('/landlords/');
      return response.data.results || response.data;
    } catch (error: any) {
      // Silently handle 404 errors (API not implemented yet)
      if (error.response?.status === 404) {
        return [];
      }
      // Log other errors but still return empty array
      console.error('Error fetching landlords:', error);
      return [];
    }
  },

  // Create new landlord
  createLandlord: async (data: any): Promise<{ id: string; name: string; email: string }> => {
    try {
      const response = await api.post('/landlords/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating landlord:', error);
      throw error;
    }
  },

  // Get single landlord
  getLandlord: async (id: string): Promise<{ 
    id: string; 
    name: string; 
    email: string;
    bank_accounts?: Array<{
      id: string;
      bank_name: string;
      account_number: string;
      branch_code: string;
      account_type: string;
    }>;
  }> => {
    const response = await api.get(`/landlords/${id}/`);
    return response.data;
  },

  // Update landlord
  updateLandlord: async (id: string, data: any): Promise<{ id: string; name: string; email: string }> => {
    const response = await api.patch(`/landlords/${id}/`, data);
    return response.data;
  },

  // Delete landlord
  deleteLandlord: async (id: string): Promise<void> => {
    await api.delete(`/landlords/${id}/`);
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