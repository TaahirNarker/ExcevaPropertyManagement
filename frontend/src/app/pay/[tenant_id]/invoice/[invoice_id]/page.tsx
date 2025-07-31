'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  QRCodeSVG 
} from 'qrcode.react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BoltIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../../../../../lib/auth';

// Types for Bitcoin Lightning payment
interface StripeInvoice {
  id: string;
  tenant_name: string;
  tenant_email: string;
  amount_zar: string;
  description: string;
  invoice_month: string;
  status: 'pending' | 'quote_generated' | 'paid' | 'expired' | 'canceled';
  payment_url: string;
  is_paid: boolean;
  is_expired: boolean;
  created_at: string;
}

interface LightningQuote {
  id: string;
  quote_id: string;
  bolt11: string;
  btc_amount: string;
  exchange_rate: string;
  expires_at: string;
  is_expired: boolean;
  time_remaining_seconds: number;
  status: 'active' | 'paid' | 'expired' | 'canceled';
}

interface PaymentStatus {
  invoice: StripeInvoice;
  latest_quote: LightningQuote | null;
  transaction: any | null;
}

export default function BitcoinPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { tenant_id, invoice_id } = params;

  // State management
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch current payment status
  const fetchPaymentStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/status/${invoice_id}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setPaymentStatus(data);
      
      // Update time remaining if quote exists
      if (data.latest_quote && !data.latest_quote.is_expired) {
        setTimeRemaining(data.latest_quote.time_remaining_seconds);
      }

      // Check if payment is complete
      if (data.invoice.is_paid) {
        setPaymentComplete(true);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching payment status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment information');
    }
  }, [invoice_id]);

  // Generate new Lightning quote
  const generateQuote = async () => {
    setGenerating(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/payments/generate-quote/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoice_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Refresh payment status to get new quote
      await fetchPaymentStatus();
      
    } catch (err) {
      console.error('Error generating quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate payment quote');
    } finally {
      setGenerating(false);
    }
  };

  // Copy Lightning invoice to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    return `R${parseFloat(amount).toLocaleString()}`;
  };

  // Format Bitcoin amount
  const formatBTC = (amount: string) => {
    return `${parseFloat(amount).toFixed(8)} BTC`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !paymentComplete) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Quote expired, refresh status
            fetchPaymentStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, paymentComplete, fetchPaymentStatus]);

  // Payment status polling
  useEffect(() => {
    if (!paymentComplete && paymentStatus?.latest_quote) {
      const pollInterval = setInterval(() => {
        fetchPaymentStatus();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [paymentComplete, paymentStatus?.latest_quote, fetchPaymentStatus]);

  // Initial load
  useEffect(() => {
    fetchPaymentStatus().finally(() => setLoading(false));
  }, [fetchPaymentStatus]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-white mt-4 text-center">Loading payment information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !paymentStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-red-500/50 p-8 max-w-md">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center mb-4">Payment Error</h2>
          <p className="text-red-300 text-center mb-6">{error}</p>
          <button
            onClick={() => {
              setError('');
              setLoading(true);
              fetchPaymentStatus().finally(() => setLoading(false));
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!paymentStatus) return null;

  const { invoice, latest_quote } = paymentStatus;

  // Payment complete state
  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-blue-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-green-500/50 p-8 max-w-md">
          <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white text-center mb-4">Payment Successful!</h1>
          <div className="space-y-3 text-center">
            <p className="text-gray-300">
              <span className="font-semibold">Amount:</span> {formatCurrency(invoice.amount_zar)}
            </p>
            <p className="text-gray-300">
              <span className="font-semibold">Invoice:</span> {invoice.description}
            </p>
            <p className="text-gray-300">
              <span className="font-semibold">Tenant:</span> {invoice.tenant_name}
            </p>
          </div>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => window.print()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bitcoin Lightning Payment</h1>
          <p className="text-gray-300">Pay your rent with Bitcoin using the Lightning Network</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-2" />
              Invoice Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Tenant:</span>
                <span className="text-white font-semibold">{invoice.tenant_name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Amount (ZAR):</span>
                <span className="text-green-400 font-bold text-lg">R{parseFloat(invoice.amount_zar).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Description:</span>
                <span className="text-white">{invoice.description}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Invoice Month:</span>
                <span className="text-white">{invoice.invoice_month}</span>
              </div>

              {latest_quote && (
                <>
                  <hr className="border-white/20" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Bitcoin Amount:</span>
                    <span className="text-orange-400 font-bold">{formatBTC(latest_quote.btc_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Exchange Rate:</span>
                    <span className="text-gray-400 text-sm">1 BTC = R{parseFloat(latest_quote.exchange_rate).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Interface */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <BoltIcon className="h-6 w-6 mr-2" />
              Lightning Payment
            </h2>

            {latest_quote && !latest_quote.is_expired ? (
              <div className="space-y-6">
                {/* Countdown Timer */}
                <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <ClockIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <span className="text-yellow-300 font-semibold">Quote expires in:</span>
                  </div>
                  <div className="text-2xl font-mono text-yellow-400 text-center">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={latest_quote.bolt11}
                    size={256}
                    level="M"
                    includeMargin={true}
                    className="mx-auto"
                  />
                </div>

                {/* Lightning Invoice */}
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-semibold">Lightning Invoice:</label>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <code className="text-green-400 text-xs break-all">
                        {latest_quote.bolt11.substring(0, 40)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(latest_quote.bolt11)}
                        className="ml-2 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {copied && <p className="text-green-400 text-xs mt-1">✓ Copied to clipboard!</p>}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-4">
                  <h3 className="text-blue-300 font-semibold mb-2">How to Pay:</h3>
                  <ol className="text-blue-200 text-sm space-y-1">
                    <li>1. Open your Lightning wallet app</li>
                    <li>2. Scan the QR code above</li>
                    <li>3. Confirm the payment amount</li>
                    <li>4. Send the payment</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-orange-600/20 border border-orange-500/50 rounded-lg p-4">
                  <ExclamationTriangleIcon className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-orange-300">
                    {latest_quote ? 'Payment quote has expired' : 'No payment quote available'}
                  </p>
                </div>

                <button
                  onClick={generateQuote}
                  disabled={generating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {generating ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Generating Quote...
                    </>
                  ) : (
                    <>
                      <BoltIcon className="h-5 w-5 mr-2" />
                      Generate Payment Quote
                    </>
                  )}
                </button>

                {error && (
                  <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Powered by Strike Lightning Network • Secure Bitcoin Payments
          </p>
        </div>
      </div>
    </div>
  );
} 