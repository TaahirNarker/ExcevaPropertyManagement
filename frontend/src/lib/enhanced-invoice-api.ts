/**
 * Enhanced Invoice API service for the comprehensive invoicing and payment system
 * Integrates with the new backend invoice generation, payment allocation, and management features
 */

import { authService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Enhanced interfaces for the new system
export interface EnhancedInvoice {
  id: number;
  invoice_number: string;
  title: string;
  issue_date?: string;
  due_date: string;
  status: 'draft' | 'queued' | 'sent' | 'locked' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  billing_period_start?: string;
  billing_period_end?: string;
  scheduled_send_date?: string;
  lease: number;
  property: number;
  tenant: number;
  landlord?: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  line_items: InvoiceLineItem[];
  payments: InvoicePayment[];
  notes?: string;
  invoice_type: 'regular' | 'interim' | 'late_fee' | 'credit';
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id?: number;
  description: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoicePayment {
  id: number;
  amount: number;
  allocated_amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  tenant: number;
  recorded_by?: number;
  is_overpayment: boolean;
}

export interface InvoiceDraft {
  title: string;
  invoice_number?: string;
  issue_date?: string;
  due_date: string;
  billing_period_start: string;
  billing_period_end: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}

export interface TenantCreditBalance {
  tenant_id: number;
  tenant_name: string;
  credit_balance: number;
}

export interface RecurringCharge {
  id?: number;
  lease: number;
  description: string;
  category: 'utility' | 'maintenance' | 'parking' | 'storage' | 'insurance' | 'other';
  amount: number;
  is_active: boolean;
}

export interface PaymentAllocation {
  tenant_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  invoice_allocations?: Array<{
    invoice_id: number;
    amount: number;
  }>;
}

export interface RentEscalation {
  lease_id: number;
  previous_rent: number;
  new_rent: number;
  escalation_percentage?: number;
  escalation_amount?: number;
  effective_date: string;
  reason: string;
}

class EnhancedInvoiceAPI {
  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await authService.refreshToken();
      if (!refreshed) {
        window.location.href = '/auth/login';
        throw new Error('Authentication failed');
      }
      // Retry the original request
      return null; // Caller should retry
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const token = authService.getAccessToken();
    const url = `${API_BASE_URL}/api/finance${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    let response = await fetch(url, config);
    let result = await this.handleResponse(response);

    // If token was refreshed, retry the request
    if (result === null) {
      const newToken = authService.getAccessToken();
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${newToken}`,
      };
      response = await fetch(url, config);
      result = await this.handleResponse(response);
    }

    return result;
  }

  // Invoice Navigation (for month arrows)
  async navigateToMonth(leaseId: number, billingMonth: string): Promise<{
    has_invoice: boolean;
    invoice?: EnhancedInvoice;
    invoice_data?: InvoiceDraft;
    is_draft: boolean;
    billing_month: string;
  }> {
    return this.apiCall('/invoices/navigate-month/', {
      method: 'POST',
      body: JSON.stringify({
        lease_id: leaseId,
        billing_month: billingMonth
      })
    });
  }

  // Save invoice draft for future months
  async saveDraft(leaseId: number, billingMonth: string, invoiceData: InvoiceDraft): Promise<{
    success: boolean;
    draft: any;
    message: string;
  }> {
    return this.apiCall('/invoices/save-draft/', {
      method: 'POST',
      body: JSON.stringify({
        lease_id: leaseId,
        billing_month: billingMonth,
        invoice_data: invoiceData
      })
    });
  }

  // Generate initial invoice when lease is created
  async generateInitialInvoice(leaseId: number): Promise<{
    success: boolean;
    invoice: EnhancedInvoice;
    message: string;
  }> {
    return this.apiCall('/invoices/generate-initial/', {
      method: 'POST',
      body: JSON.stringify({
        lease_id: leaseId
      })
    });
  }

  // Send invoice (locks it)
  async sendInvoice(invoiceId: number): Promise<{
    success: boolean;
    invoice: EnhancedInvoice;
    message: string;
  }> {
    return this.apiCall(`/invoices/${invoiceId}/send/`, {
      method: 'POST'
    });
  }

  // Get invoice details
  async getInvoice(invoiceId: number): Promise<EnhancedInvoice> {
    return this.apiCall(`/invoices/${invoiceId}/`);
  }

  // Update invoice
  async updateInvoice(invoiceId: number, data: Partial<EnhancedInvoice>): Promise<EnhancedInvoice> {
    return this.apiCall(`/invoices/${invoiceId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Payment Allocation
  async allocatePayment(paymentData: PaymentAllocation): Promise<{
    success: boolean;
    payments: InvoicePayment[];
    message: string;
  }> {
    return this.apiCall('/payment-allocation/allocate/', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // Get tenant credit balance
  async getTenantCreditBalance(tenantId: number): Promise<TenantCreditBalance> {
    return this.apiCall(`/payment-allocation/credit-balance/${tenantId}/`);
  }

  // Apply credit balance to invoice
  async applyCreditBalance(tenantId: number, invoiceId: number, amount: number): Promise<{
    success: boolean;
    payment: InvoicePayment;
    remaining_credit: number;
    message: string;
  }> {
    return this.apiCall('/payment-allocation/apply-credit/', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        invoice_id: invoiceId,
        amount: amount
      })
    });
  }

  // Recurring Charges Management
  async getRecurringCharges(leaseId?: number): Promise<RecurringCharge[]> {
    const params = leaseId ? `?lease=${leaseId}` : '';
    return this.apiCall(`/recurring-charges/${params}`);
  }

  async createRecurringCharge(charge: Omit<RecurringCharge, 'id'>): Promise<RecurringCharge> {
    return this.apiCall('/recurring-charges/', {
      method: 'POST',
      body: JSON.stringify(charge)
    });
  }

  async updateRecurringCharge(chargeId: number, charge: Partial<RecurringCharge>): Promise<RecurringCharge> {
    return this.apiCall(`/recurring-charges/${chargeId}/`, {
      method: 'PATCH',
      body: JSON.stringify(charge)
    });
  }

  async deleteRecurringCharge(chargeId: number): Promise<void> {
    return this.apiCall(`/recurring-charges/${chargeId}/`, {
      method: 'DELETE'
    });
  }

  // Rent Escalation
  async processEscalations(): Promise<{
    success: boolean;
    escalated_count: number;
    escalated_leases: Array<{
      lease_id: number;
      lease_code: string;
      property_name: string;
      tenant_name: string;
      new_rent: number;
    }>;
    message: string;
  }> {
    return this.apiCall('/rent-escalation/process-due/', {
      method: 'POST'
    });
  }

  async getRentHistory(leaseId: number): Promise<{
    lease_id: number;
    current_rent: number;
    escalation_history: RentEscalation[];
  }> {
    return this.apiCall(`/rent-escalation/history/${leaseId}/`);
  }

  // System Settings
  async getVATRate(): Promise<{
    vat_rate: number;
    formatted: string;
  }> {
    return this.apiCall('/system-settings/vat-rate/');
  }

  // Get invoices for a lease (with filtering)
  async getLeaseInvoices(leaseId: number, status?: string): Promise<EnhancedInvoice[]> {
    const params = new URLSearchParams({ lease: leaseId.toString() });
    if (status) params.append('status', status);
    
    const response = await this.apiCall(`/invoices/?${params.toString()}`);
    return response.results || response;
  }

  // Get unpaid invoices for a tenant (for payment allocation)
  async getUnpaidInvoices(tenantId: number): Promise<EnhancedInvoice[]> {
    const params = new URLSearchParams({ 
      tenant: tenantId.toString(),
      status: 'sent,overdue,partially_paid'
    });
    
    const response = await this.apiCall(`/invoices/?${params.toString()}`);
    return (response.results || response).filter((invoice: EnhancedInvoice) => invoice.balance_due > 0);
  }

  // Create invoice from draft data (used when converting drafts to actual invoices)
  async createInvoiceFromDraft(invoiceData: any): Promise<EnhancedInvoice> {
    return this.apiCall('/invoices/', {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  }

  // Utility function to format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('ZAR', 'R');
  }

  // Utility function to calculate invoice totals
  calculateInvoiceTotals(lineItems: InvoiceLineItem[], vatRate: number = 0): {
    subtotal: number;
    taxAmount: number;
    total: number;
  } {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (vatRate / 100);
    const total = subtotal + taxAmount;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }
}

export const enhancedInvoiceAPI = new EnhancedInvoiceAPI();