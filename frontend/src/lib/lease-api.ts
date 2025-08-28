import { authService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface LeaseAttachment {
  id: number;
  lease: number;
  title: string;
  description: string;
  file: string;
  file_url: string;
  file_type: string;
  file_size: number;
  file_extension: string;
  is_image: boolean;
  is_pdf: boolean;
  formatted_file_size: string;
  uploaded_by: {
    id: number;
    name: string;
    email: string;
  } | null;
  uploaded_at: string;
  is_public: boolean;
}

export interface LeaseAttachmentCreate {
  lease: number;
  title: string;
  description: string;
  file: File;
  file_type: string;
  is_public: boolean;
}

export interface Lease {
  id: number;
  property: {
    id: string;
    property_code: string;
    name: string;
    address: string;
  };
  tenant: {
    id: number;
    tenant_code: string;
    name: string;
    email: string;
  };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  terms: string;
  created_at: string;
  updated_at: string;
  attachments_count: number;
}

export interface LeaseNote {
  id: number;
  lease: number;
  title: string;
  content: string;
  note_type: string;
  created_by: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseNoteCreate {
  title: string;
  content: string;
  note_type: string;
}

class LeaseAPI {
  private async handleResponse<T>(response: Response, retryCount = 0, originalData?: any): Promise<T> {
    if (response.ok) {
      return response.json();
    }

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && retryCount < 1) {
      try {
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          // Retry the original request with new token
          const retryResponse = await fetch(response.url, {
            method: response.method,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Authorization': `Bearer ${authService.getAccessToken()}`,
            },
            body: originalData,
          });
          return this.handleResponse<T>(retryResponse, retryCount + 1, originalData);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        authService.logout();
        window.location.href = '/auth/login';
        throw new Error('Authentication failed');
      }
    }
    
    // Handle error response
    let errorData;
    try {
      errorData = await response.json();
      console.error('Backend error response:', errorData);
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      errorData = null;
    }
    
    let errorMessage = `HTTP error! status: ${response.status}`;
    if (errorData) {
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'object') {
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

  async getLeases(params: {
    search?: string;
    status?: string;
    property?: string | number;
    tenant?: number;
    page?: number;
    page_size?: number;
  } = {}): Promise<{ results: Lease[]; count: number; page: number; page_size: number; total_pages: number }> {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.property) searchParams.append('property', params.property.toString());
    if (params.tenant) searchParams.append('tenant', params.tenant.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.page_size) searchParams.append('page_size', params.page_size.toString());
    
    const url = `${API_BASE_URL}/leases/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    return this.handleResponse(response);
  }

  async getLease(leaseId: number): Promise<Lease> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    return this.handleResponse(response);
  }

  async createLease(leaseData: any): Promise<Lease> {
    const response = await fetch(`${API_BASE_URL}/leases/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaseData),
    });
    
    return this.handleResponse(response, 0, leaseData);
  }

  async updateLease(leaseId: number, updateData: Partial<Lease>): Promise<Lease> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    return this.handleResponse(response, 0, updateData);
  }

  async deleteLease(leaseId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete lease: ${response.statusText}`);
    }
  }

  async getLeaseAttachments(leaseId: number, params: {
    file_type?: string;
    is_public?: boolean;
  } = {}): Promise<LeaseAttachment[]> {
    const searchParams = new URLSearchParams();
    
    if (params.file_type) searchParams.append('file_type', params.file_type);
    if (params.is_public !== undefined) searchParams.append('is_public', params.is_public.toString());
    
    const url = `${API_BASE_URL}/leases/${leaseId}/attachments/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    console.log('Fetching attachments from URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    return this.handleResponse(response);
  }

  async uploadLeaseAttachment(leaseId: number, attachment: LeaseAttachmentCreate): Promise<LeaseAttachment> {
    const formData = new FormData();
    // Don't include lease in FormData since it's in the URL
    formData.append('title', attachment.title);
    formData.append('description', attachment.description);
    formData.append('file', attachment.file);
    formData.append('file_type', attachment.file_type);
    formData.append('is_public', attachment.is_public.toString());
    
    console.log('Uploading attachment for lease:', leaseId);
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/attachments/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        // Don't set Content-Type for FormData, let the browser set it with boundary
      },
      body: formData,
    });
    
    console.log('Upload response status:', response.status);
    console.log('Upload response headers:', response.headers);
    
    return this.handleResponse(response, 0, formData);
  }

  async updateLeaseAttachment(leaseId: number, attachmentId: number, updates: Partial<LeaseAttachmentCreate>): Promise<LeaseAttachment> {
    // For renaming, we only need title and description - send as JSON
    const jsonData: any = {};
    
    if (updates.title) jsonData.title = updates.title;
    if (updates.description) jsonData.description = updates.description;
    
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/attachments/${attachmentId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonData),
    });
    
    return this.handleResponse(response, 0, jsonData);
  }

  async deleteLeaseAttachment(leaseId: number, attachmentId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/attachments/${attachmentId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete attachment: ${response.statusText}`);
    }
  }

  async downloadAttachment(attachment: LeaseAttachment): Promise<void> {
    const response = await fetch(attachment.file_url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.title || 'attachment';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Lease Notes Methods
  async getLeaseNotes(leaseId: number): Promise<LeaseNote[]> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/notes/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await this.handleResponse<{results: LeaseNote[]}>(response);
    return data.results;
  }

  async createLeaseNote(leaseId: number, noteData: LeaseNoteCreate): Promise<LeaseNote> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/notes/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteData),
    });
    
    return this.handleResponse(response, 0, noteData);
  }

  async updateLeaseNote(leaseId: number, noteId: number, updates: Partial<LeaseNoteCreate>): Promise<LeaseNote> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/notes/${noteId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    return this.handleResponse(response, 0, updates);
  }

  async deleteLeaseNote(leaseId: number, noteId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/leases/${leaseId}/notes/${noteId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete note: ${response.statusText}`);
    }
  }
}

export { LeaseAPI };
export const leaseAPI = new LeaseAPI(); 