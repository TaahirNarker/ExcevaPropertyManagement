import { API_BASE_URL, authService } from './auth';

export interface Tenant {
  id: number;
  tenant_code: string;
  name: string;
  email: string;
  phone: string;
  id_number: string;
  date_of_birth: string;
  status: 'active' | 'inactive' | 'pending';
  employment_status: string;
  employer_name: string;
  monthly_income: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LeaseHistory {
  id: number;
  property_name: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  status: string;
}

export interface Document {
  id: number;
  name: string;
  type: string;
  uploaded_at: string;
  expires_at?: string;
}

export interface Communication {
  id: number;
  type: 'email' | 'phone' | 'sms' | 'note';
  date: string;
  subject: string;
  content: string;
}

class TenantAPI {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    return response.json();
  }

  async getTenant(id: number): Promise<Tenant> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/tenants/${id}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<Tenant>(response);
  }

  async getTenantLeaseHistory(id: number): Promise<LeaseHistory[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/tenants/id/${id}/leases/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: LeaseHistory[]}>(response);
    return data.results;
  }

  async getTenantDocuments(id: number): Promise<Document[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/tenants/id/${id}/documents/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: Document[]}>(response);
    return data.results;
  }

  async getTenantCommunications(id: number): Promise<Communication[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/tenants/id/${id}/communications/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: Communication[]}>(response);
    return data.results;
  }
}

export const tenantAPI = new TenantAPI(); 