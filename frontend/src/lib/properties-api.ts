/**
 * Properties API service for Property Management System
 * Handles all property-related API calls
 */

import Cookies from 'js-cookie';

// API Base URL - same as auth service
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://propman.exceva.capital/api'
  : 'http://127.0.0.1:8000/api';

// Token storage keys - same as auth service
const ACCESS_TOKEN_KEY = 'access_token';

// Types
export interface Property {
  id: string;
  property_code: string;
  name: string;
  property_type: string;
  property_type_display: string;
  street_address: string;
  suburb?: string;
  city: string;
  province: string;
  province_display: string;
  postal_code?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  monthly_rental_amount?: number;
  status: string;
  status_display: string;
  is_active: boolean;
  full_address: string;
  display_name: string;
  occupancy_info: {
    status: string;
    details?: string;
    tenant_name?: string;
    lease_end?: string;
  };
  owner_name: string;
  // Sub-property information
  is_parent_property?: boolean;
  is_sub_property?: boolean;
  sub_properties_count?: number;
  parent_property_name?: string;
  sub_properties_summary?: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    reserved: number;
    total_rental_income: number;
  };
  created_at: string;
  updated_at: string;
  primary_image?: string;
}

export interface PropertiesResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Property[];
  filters: {
    property_types: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
    provinces: Array<{ value: string; label: string }>;
  };
}

export interface PropertyDetailResponse extends Property {
  description?: string;
  purchase_price?: number;
  current_market_value?: number;
  parking_spaces?: number;
  features?: Record<string, any>;
  images?: string[];
  documents?: string[];
  owner: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  property_manager?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  current_tenant?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  current_lease?: {
    id: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    status: string;
    deposit_amount?: number;
  };
  // Sub-property relationships
  parent_property?: {
    id: string;
    property_code: string;
    name: string;
    property_type: string;
    full_address: string;
  };
  sub_properties?: Property[];
}

export interface PropertyCreateData {
  name: string;
  property_type: string;
  description?: string;
  street_address: string;
  suburb?: string;
  city: string;
  province: string;
  postal_code?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  parking_spaces?: number;
  purchase_price?: number;
  current_market_value?: number;
  monthly_rental_amount?: number;
  status: string;
  is_active?: boolean;
  property_manager?: string;
  parent_property?: string; // For sub-properties
  features?: Record<string, any>;
  primary_image?: string;
  images?: string[];
  documents?: string[];
}

export interface PropertyFilters {
  search?: string;
  property_type?: string;
  status?: string;
  province?: string;
  city?: string;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  min_rent?: number;
  max_rent?: number;
  min_size?: number;
  max_size?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface PropertyStats {
  total_properties: number;
  active_properties: number;
  vacant_properties: number;
  occupied_properties: number;
  total_rental_income: number;
  average_rental_amount: number;
  property_types: Array<{
    type: string;
    type_display: string;
    count: number;
  }>;
  provinces: Array<{
    province: string;
    province_display: string;
    count: number;
  }>;
  occupancy_rate: number;
}

export interface PropertyChoices {
  property_types: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
  provinces: Array<{ value: string; label: string }>;
}

class PropertiesAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const token = Cookies.get(ACCESS_TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Check if the current token is valid
   */
  private async checkTokenValidity(): Promise<boolean> {
    try {
      const token = Cookies.get(ACCESS_TOKEN_KEY);
      if (!token) {
        return false;
      }

      // Try to make a simple API call to check token validity
      const response = await fetch(`${this.baseUrl}/auth/verify/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Token validity check failed:', error);
      return false;
    }
  }

  /**
   * Handle API responses and errors with automatic token refresh
   */
    private async handleResponse<T>(response: Response, retryCount = 0, originalData?: any): Promise<T> {
    if (!response.ok) {
      // If we get a 401 and haven't retried yet, try to refresh the token
      if (response.status === 401 && retryCount === 0) {
        try {
          // Import auth service dynamically to avoid circular dependencies
          const { authService } = await import('./auth');
          await authService.refreshToken();

          // Retry the request with the new token
          const retryOptions: RequestInit = {
            method: response.method,
            headers: this.getAuthHeaders(),
          };

          // For POST/PUT/PATCH requests, use the original data
          if (['POST', 'PUT', 'PATCH'].includes(response.method) && originalData) {
            retryOptions.body = JSON.stringify(originalData);
          }

          const retryResponse = await fetch(response.url, retryOptions);

          return this.handleResponse<T>(retryResponse, retryCount + 1, originalData);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, redirect to login
          const { authService } = await import('./auth');
          authService.clearTokens();
          window.location.href = '/auth/login';
          throw new Error('Session expired. Please log in again.');
        }
      }

      // Get detailed error information from the response
      let errorData;
      try {
        errorData = await response.json();
        console.error('Backend error response:', errorData);
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        errorData = null;
      }

      // Construct detailed error message
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      if (errorData) {
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          // Handle field-specific validation errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          errorMessage = fieldErrors || JSON.stringify(errorData);
        } else {
          errorMessage = String(errorData);
        }
      }

      throw new Error(errorMessage);
    }
    return response.json();
  }

  /**
   * Get properties list with filtering and pagination
   */
  async getProperties(filters: PropertyFilters = {}): Promise<PropertiesResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${this.baseUrl}/properties/?${params.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PropertiesResponse>(response);
  }

  /**
   * Get property details by property code
   */
  async getProperty(propertyCode: string): Promise<PropertyDetailResponse> {
    const response = await fetch(`${this.baseUrl}/properties/${propertyCode}/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PropertyDetailResponse>(response);
  }

  /**
   * Create a new property
   */
  async createProperty(data: PropertyCreateData): Promise<PropertyDetailResponse> {
    const response = await fetch(`${this.baseUrl}/properties/create/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<PropertyDetailResponse>(response, 0, data);
  }

  /**
   * Update an existing property
   */
  async updateProperty(propertyCode: string, data: Partial<PropertyCreateData>): Promise<PropertyDetailResponse> {
    const response = await fetch(`${this.baseUrl}/properties/${propertyCode}/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<PropertyDetailResponse>(response, 0, data);
  }

  /**
   * Delete a property
   */
  async deleteProperty(propertyCode: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/properties/${propertyCode}/`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.detail || errorData?.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Get property statistics
   */
  async getPropertyStats(): Promise<PropertyStats> {
    const response = await fetch(`${this.baseUrl}/properties/stats/overview/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PropertyStats>(response);
  }

  /**
   * Get property form choices (property types, statuses, provinces)
   */
  async getPropertyChoices(): Promise<PropertyChoices> {
    const response = await fetch(`${this.baseUrl}/properties/choices/all/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<PropertyChoices>(response);
  }

  /**
   * Advanced property search
   */
  async searchProperties(searchData: PropertyFilters): Promise<PropertiesResponse> {
    const response = await fetch(`${this.baseUrl}/properties/search/advanced/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(searchData),
    });

    return this.handleResponse<PropertiesResponse>(response);
  }

  /**
   * Get property summary
   */
  async getPropertySummary(propertyCode: string): Promise<{
    property_code: string;
    name: string;
    display_name: string;
    status: string;
    status_display: string;
    occupancy_info: Property['occupancy_info'];
    monthly_rental_amount?: number;
    full_address: string;
    primary_image?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/properties/${propertyCode}/summary/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  /**
   * Get property images
   */
  async getPropertyImages(propertyCode: string): Promise<Array<{
    id: string;
    image_url?: string;
    image_file?: string;
    title?: string;
    description?: string;
    is_primary: boolean;
    order: number;
    created_at: string;
    updated_at: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/properties/${propertyCode}/images/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  /**
   * Get property documents
   */
  async getPropertyDocuments(propertyCode: string): Promise<Array<{
    id: string;
    document_type: string;
    document_type_display: string;
    title: string;
    description?: string;
    file_url?: string;
    file_upload?: string;
    created_at: string;
    updated_at: string;
    uploaded_by?: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/properties/${propertyCode}/documents/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }
}

// Create and export a singleton instance
export const propertiesAPI = new PropertiesAPI();

// Export the class for testing or custom instances
export default PropertiesAPI; 