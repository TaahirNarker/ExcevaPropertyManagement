/**
 * API Configuration for Property Management System
 * Connects to Django backend with JWT authentication
 */

import Cookies from 'js-cookie';

// Base API URL - updated for production deployment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://propman.exceva.capital/api'
  : 'http://127.0.0.1:8000/api';

// Token management functions to avoid circular dependency
const getAccessToken = (): string | null => {
  return Cookies.get('access_token') || null;
};

const getRefreshToken = (): string | null => {
  return Cookies.get('refresh_token') || null;
};

const clearTokens = (): void => {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
  localStorage.removeItem('user');
};

const refreshToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  
  // Update access token
  Cookies.set('access_token', data.access, {
    expires: 1,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  return data.access;
};

// Common fetch wrapper with error handling and authentication
const fetchWithError = async (url: string, options: RequestInit = {}) => {
  // Get access token
  const token = getAccessToken();
  
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
        const newToken = await refreshToken();
        
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
        clearTokens();
        
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
export const propertyApi = {
  getProperties: async (): Promise<Property[]> => {
    const response = await fetchWithError(`${API_BASE_URL}/properties/`);
    return response.json();
  },

  getProperty: async (id: string): Promise<Property> => {
    const response = await fetchWithError(`${API_BASE_URL}/properties/${id}/`);
    return response.json();
  },

  createProperty: async (property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> => {
    const response = await fetchWithError(`${API_BASE_URL}/properties/`, {
      method: 'POST',
      body: JSON.stringify(property),
    });
    return response.json();
  },

  updateProperty: async (id: string, property: Partial<Property>): Promise<Property> => {
    const response = await fetchWithError(`${API_BASE_URL}/properties/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(property),
    });
    return response.json();
  },

  deleteProperty: async (id: string): Promise<void> => {
    await fetchWithError(`${API_BASE_URL}/properties/${id}/`, {
      method: 'DELETE',
    });
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

// Export the base URL for other uses
export { API_BASE_URL }; 