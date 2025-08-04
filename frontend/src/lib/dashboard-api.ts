import { API_BASE_URL, authService } from './auth';

export interface DashboardMetrics {
  // Financial metrics
  invoicesDue: { count: number; breakdown: { sent: number; readyToSend: number; currentPeriod: number; dismissed: number; }; };
  rentDue: { count: number; breakdown: { collected: number; outstanding: number; }; };
  billsDue: { count: number; breakdown: { toVendors: number; withCashflow: number; }; };
  feesDue: { count: number; breakdown: { dueToYou: number; withCashflow: number; }; };
  payments: { count: number; breakdown: { landlords: number; paymentDue: number; }; };
  // Property & Lease metrics
  properties: { count: number; breakdown: { occupied: number; vacant: number; }; };
  leases: { count: number; breakdown: { active: number; expired: number; }; };
  renewals: { count: number; breakdown: { dueIn: number; days90: number; days60: number; days30: number; }; };
  // Deposit metrics
  depositsDue: { count: number; breakdown: { partialHeld: number; withoutDeposit: number; }; };
  depositsHeld: { count: number; breakdown: { byLandlord: number; byAgent: number; }; };
}

class DashboardAPI {
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
        const method = 'GET'; // Dashboard methods are GET
        
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

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/dashboard/metrics/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<DashboardMetrics>(response, 0);
  }
}

export const dashboardAPI = new DashboardAPI(); 