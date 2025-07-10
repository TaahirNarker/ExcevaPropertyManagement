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
   * Handle API responses and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.detail || errorData?.error || `HTTP error! status: ${response.status}`;
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

    return this.handleResponse<PropertyDetailResponse>(response);
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

    return this.handleResponse<PropertyDetailResponse>(response);
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