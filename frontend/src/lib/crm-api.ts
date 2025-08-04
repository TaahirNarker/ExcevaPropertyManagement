import { API_BASE_URL, authService } from './auth';

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  assigned_to: string;
  created_at: string;
  last_contact: string;
  notes: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: 'prospect' | 'client' | 'vendor' | 'other';
  status: 'active' | 'inactive';
  created_at: string;
  last_contact: string;
  notes: string;
}

export interface Communication {
  id: number;
  type: 'email' | 'phone' | 'meeting' | 'note';
  date: string;
  subject: string;
  content: string;
  contact_id: number;
  created_by: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assigned_to: string;
  contact_id?: number;
  created_at: string;
}

class CRMAPI {
  private async handleResponse<T>(response: Response, retryCount = 0): Promise<T> {
    if (response.ok) {
      return response.json();
    }
    
    // Handle 401 Unauthorized - try to refresh token and retry once
    if (response.status === 401 && retryCount === 0) {
      try {
        console.log('🔄 Token expired, attempting refresh...');
        await authService.refreshToken();
        
        // Retry the request with new token
        const newToken = authService.getAccessToken();
        if (!newToken) {
          throw new Error('Failed to get new access token');
        }
        
        // Reconstruct the request with new token
        const url = response.url;
        const method = 'GET'; // All CRM methods are GET for now
        
        const retryResponse = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        authService.clearTokens();
        window.location.href = '/auth/login';
        throw new Error('Authentication failed. Please log in again.');
      }
    }
    
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  async getLeads(): Promise<Lead[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/crm/leads/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: Lead[]}>(response, 0);
    return data.results;
  }

  async getContacts(): Promise<Contact[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/crm/contacts/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: Contact[]}>(response, 0);
    return data.results;
  }

  async getCommunications(): Promise<Communication[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/crm/communications/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: Communication[]}>(response, 0);
    return data.results;
  }

  async getTasks(): Promise<Task[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/crm/tasks/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<{results: Task[]}>(response, 0);
    return data.results;
  }
}

export const crmAPI = new CRMAPI(); 