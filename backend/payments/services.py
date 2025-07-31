"""
Strike API Service
Handles all Strike API interactions for Bitcoin Lightning payments
"""
import requests
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import json

logger = logging.getLogger(__name__)


class StrikeAPIException(Exception):
    """Custom exception for Strike API errors"""
    pass


class StrikeAPIService:
    """
    Service class for interacting with Strike API
    Handles invoice creation, quote generation, and payment processing
    """
    
    def __init__(self, api_key=None, webhook_secret=None):
        self.base_url = settings.STRIKE_API_BASE_URL
        # Use provided API key or fall back to environment variable
        self.api_key = api_key or settings.STRIKE_API_KEY
        self.webhook_secret = webhook_secret or getattr(settings, 'STRIKE_WEBHOOK_SECRET', None)
        
        # Log API configuration for debugging
        logger.info(f"Strike API initialized with base URL: {self.base_url}")
        logger.info(f"API key present: {bool(self.api_key)} (Length: {len(self.api_key) if self.api_key else 0})")
        logger.info(f"Webhook secret present: {bool(self.webhook_secret)}")
        logger.info(f"Production mode: {not settings.DEBUG}")
        
        # Validate API key in production mode
        if not settings.DEBUG:
            if not self.api_key:
                raise StrikeAPIException("Strike API key is required for production mode")
            if self.api_key == 'your-strike-api-key-here':
                raise StrikeAPIException("Invalid Strike API key - placeholder key detected in production")
            if len(self.api_key) < 10:
                raise StrikeAPIException("Invalid Strike API key - key appears to be malformed")
        
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        # Log the first few characters of the API key for debugging
        if self.api_key:
            masked_key = f"{self.api_key[:5]}...{self.api_key[-5:]}" if len(self.api_key) > 10 else "***"
            logger.debug(f"Using Strike API key: {masked_key}")
        else:
            if settings.DEBUG:
                logger.warning("No Strike API key configured - will use mock data in development")
            else:
                logger.error("No Strike API key configured for production")
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make authenticated request to Strike API
        """
        # In production mode, API key must be configured
        if not settings.DEBUG and (not self.api_key or self.api_key == 'your-strike-api-key-here'):
            raise StrikeAPIException("Strike API key not properly configured for production use")
        
        # Only use mock data in development mode when API key is not configured
        if settings.DEBUG and (not self.api_key or self.api_key == 'your-strike-api-key-here'):
            logger.warning(f"Strike API not configured - returning mock data for {method} {endpoint}")
            return self._get_mock_response(method, endpoint, data)
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            logger.debug(f"Making Strike API request: {method} {url}")
            logger.debug(f"Request headers: {self.headers}")
            if data:
                logger.debug(f"Request data: {json.dumps(data)}")
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers, params=data)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=self.headers, json=data)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=self.headers)
            else:
                raise StrikeAPIException(f"Unsupported HTTP method: {method}")
            
            # Log the request for debugging
            logger.info(f"Strike API {method} {endpoint}: {response.status_code}")
            
            if response.status_code not in [200, 201]:
                error_msg = f"Strike API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                
                # Add more detailed error information
                if response.status_code == 401:
                    logger.error("Authentication error: Check API key format and permissions")
                    logger.debug(f"API key used: {self.api_key[:5]}...{self.api_key[-5:]}")
                
                # In production, always raise errors - no fallback to mock data
                if not settings.DEBUG:
                    raise StrikeAPIException(error_msg)
                    
                # In development, we can fall back to mock data
                logger.warning("Using mock data as fallback in development mode")
                return self._get_mock_response(method, endpoint, data)
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Strike API request failed: {str(e)}"
            logger.error(error_msg)
            
            # In production, always raise errors - no fallback to mock data
            if not settings.DEBUG:
                raise StrikeAPIException(error_msg)
                
            # In development, we can fall back to mock data
            logger.warning("Using mock data as fallback in development mode")
            return self._get_mock_response(method, endpoint, data)
    
    def _get_mock_response(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate mock responses for development mode
        """
        import uuid
        from django.utils import timezone
        
        if '/invoices' in endpoint and method == 'POST' and '/quote' not in endpoint:
            # Mock invoice creation
            invoice_id = str(uuid.uuid4())
            amount = data.get("amount", {"currency": "BTC", "amount": "0.0001"}) if data else {"currency": "BTC", "amount": "0.0001"}
            description = data.get("description", "Mock Invoice") if data else "Mock Invoice"
            return {
                "id": invoice_id,
                "invoiceId": invoice_id,  # Strike API uses invoiceId field
                "amount": amount,
                "description": description,
                "state": "PENDING",
                "created": timezone.now().isoformat(),
                "paymentRequestUrl": f"https://strike.me/invoice/{invoice_id}"
            }
        
        elif '/quote' in endpoint and method == 'POST':
            # Mock quote generation with realistic rates
            import random
            
            # Calculate realistic BTC amount based on ZAR amount
            zar_amount = Decimal('1000.00')  # Default amount in ZAR
            zar_to_btc_rate = Decimal('650000.00')  # 650,000 ZAR per BTC - realistic exchange rate
            
            # If we have data with an amount, use that
            if data and isinstance(data, dict) and 'amount' in data:
                amount_data = data.get('amount', {})
                if isinstance(amount_data, dict) and 'amount' in amount_data:
                    zar_amount = Decimal(str(amount_data['amount']))
            
            # Calculate BTC amount
            btc_amount = str(zar_amount / zar_to_btc_rate)
            
            # Generate mock Lightning invoice
            bolt11 = f"lnbc{random.randint(10000, 99999)}u1pjh8x3cpp5{''.join(random.choices('abcdef0123456789', k=64))}"
            
            return {
                "quoteId": str(uuid.uuid4()),
                "expiresAt": (timezone.now() + timezone.timedelta(minutes=15)).isoformat(),
                "lnInvoice": bolt11,
                "onchainAddress": None,
                "targetAmount": {
                    "amount": btc_amount,
                    "currency": "BTC"
                },
                "sourceAmount": {
                    "amount": str(zar_amount),
                    "currency": "ZAR"
                },
                "conversionRate": {
                    "amount": str(zar_to_btc_rate),
                    "sourceCurrency": "ZAR",
                    "targetCurrency": "BTC"
                }
            }
        
        elif '/rates/ticker' in endpoint:
            # Mock exchange rates for ZAR-to-BTC
            return {
                "amount": "650000.00",  # 650,000 ZAR per BTC - realistic exchange rate
                "sourceCurrency": "ZAR", 
                "targetCurrency": "BTC",
                "rate": "650000.00"  # Alternative field name
            }
        
        elif '/invoices/' in endpoint and method == 'GET':
            # Mock invoice status
            return {
                "id": endpoint.split('/')[-1],
                "state": "PENDING",
                "amount": {"currency": "BTC", "amount": "0.0001"},
                "description": "Mock Invoice",
                "created": timezone.now().isoformat()
            }
        
        # Default mock response
        return {"success": True, "mock": True, "endpoint": endpoint}
    
    def create_invoice(self, amount_zar: Decimal, description: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Create a new Strike invoice in BTC
        
        Args:
            amount_zar: Amount in BTC
            description: Invoice description
            metadata: Additional metadata for the invoice
        
        Returns:
            Strike invoice response data
        """
        # Check API key before sending
        if not self.api_key:
            logger.error("Cannot create invoice - no Strike API key configured")
            raise StrikeAPIException("No Strike API key configured for production use")
            
        if self.api_key == 'your-strike-api-key-here':
            logger.error("Using placeholder API key - invalid configuration")
            raise StrikeAPIException("Invalid Strike API key configuration - placeholder key detected")
        
        logger.info(f"Using Strike API key: {self.api_key[:5]}...{self.api_key[-5:]}")
        
        payload = {
            "amount": {
                "currency": "BTC",
                "amount": str(amount_zar)
            },
            "description": description,
            "metadata": metadata or {}
        }
        
        logger.info(f"Creating Strike invoice: BTC {amount_zar} - {description}")
        return self._make_request('POST', '/invoices', payload)
    
    def generate_quote(self, invoice_id: str) -> Dict[str, Any]:
        """
        Generate a Lightning payment quote for an existing invoice
        This provides real-time BTC conversion and bolt11 payment request
        
        Args:
            invoice_id: Strike invoice ID
        
        Returns:
            Strike quote response with bolt11, BTC amount, and expiration
        """
        logger.info(f"Generating quote for Strike invoice: {invoice_id}")
        return self._make_request('POST', f'/invoices/{invoice_id}/quote')
    
    def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """
        Get invoice details from Strike
        
        Args:
            invoice_id: Strike invoice ID
        
        Returns:
            Strike invoice data
        """
        return self._make_request('GET', f'/invoices/{invoice_id}')
    
    def cancel_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """
        Cancel a Strike invoice
        
        Args:
            invoice_id: Strike invoice ID
        
        Returns:
            Strike cancellation response
        """
        logger.info(f"Canceling Strike invoice: {invoice_id}")
        return self._make_request('DELETE', f'/invoices/{invoice_id}')
    
    def get_exchange_rate(self, from_currency: str = 'BTC', to_currency: str = 'BTC') -> Decimal:
        """
        Get current exchange rate from Strike
        
        Args:
            from_currency: Source currency (default: BTC)
            to_currency: Target currency (default: BTC)
        
        Returns:
            Exchange rate as Decimal
        """
        # Check API key before making request
        if not self.api_key or self.api_key == 'your-strike-api-key-here':
            raise StrikeAPIException("No valid Strike API key configured for exchange rate lookup")
        
        try:
            # Try the correct Strike API endpoint format
            endpoint = f'/rates/ticker'
            params = {
                'sourceCurrency': from_currency,
                'targetCurrency': to_currency
            }
            
            logger.info(f"Getting exchange rate from Strike API: {endpoint} with params {params}")
            response = self._make_request('GET', endpoint, params)
            
            logger.debug(f"Strike API exchange rate response: {response}")
            
            # Handle different response formats
            if isinstance(response, list) and len(response) > 0:
                # If response is a list, take the first item
                rate_data = response[0]
            elif isinstance(response, dict):
                # If response is a dict, use it directly
                rate_data = response
            else:
                raise StrikeAPIException(f"Unexpected response format: {type(response)}")
            
            # Extract rate from the data
            if 'amount' in rate_data:
                rate = Decimal(str(rate_data['amount']))
            elif 'rate' in rate_data:
                rate = Decimal(str(rate_data['rate']))
            else:
                raise StrikeAPIException(f"No rate found in response: {rate_data}")
            
            logger.info(f"Current {from_currency}-{to_currency} rate: {rate}")
            return rate
            
        except StrikeAPIException as e:
            logger.error(f"Strike API error getting exchange rate: {str(e)}")
            
            # Provide user-friendly error messages in production
            if "401" in str(e) or "UNAUTHORIZED" in str(e):
                raise StrikeAPIException("Invalid Strike API key. Please check your API key and permissions.")
            elif "403" in str(e) or "FORBIDDEN" in str(e):
                raise StrikeAPIException("Strike API key lacks required permissions. Please check your API key permissions.")
            else:
                raise StrikeAPIException(f"Unable to get exchange rate: {str(e)}")
                
        except Exception as e:
            logger.error(f"Failed to get exchange rate: {str(e)}")
            raise StrikeAPIException(f"Unable to get exchange rate: {str(e)}")
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify Strike webhook signature for security
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature from Strike
        
        Returns:
            True if signature is valid
        """
        import hmac
        import hashlib
        
        webhook_secret = self.webhook_secret
        if not webhook_secret:
            logger.warning("No webhook secret configured - skipping signature verification")
            return True
        
        # Convert webhook_secret to bytes
        webhook_secret_bytes = webhook_secret.encode('utf-8')
        
        # Calculate HMAC-SHA256 signature using the webhook secret
        expected_signature = hmac.new(
            webhook_secret_bytes,
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Secure comparison to prevent timing attacks
        is_valid = hmac.compare_digest(signature, expected_signature)
        
        if not is_valid:
            logger.warning("Invalid webhook signature")
        else:
            logger.info("Webhook signature verified successfully")
            
        return is_valid


class PaymentService:
    """
    High-level service for managing Bitcoin Lightning payments
    Combines Strike API calls with database operations
    """
    
    def __init__(self, api_key=None, webhook_secret=None, notification_email=None):
        self.strike_api = StrikeAPIService(api_key=api_key, webhook_secret=webhook_secret)
        self.notification_email = notification_email
    
    def create_rent_invoice(self, tenant, amount_zar: Decimal, invoice_month: str, description: str = None) -> 'StripeInvoice':
        """
        Create a new rent invoice for Bitcoin Lightning payment
        
        Args:
            tenant: Tenant instance
            amount_zar: Rent amount in ZAR  
            invoice_month: Format YYYY-MM (e.g., '2024-07')
            description: Custom description
        
        Returns:
            StripeInvoice instance
        """
        from .models import StripeInvoice
        
        # Default description
        if not description:
            month_name = datetime.strptime(invoice_month, '%Y-%m').strftime('%B %Y')
            description = f"Rent payment for {month_name} - {tenant.user.get_full_name()}"
        
        # Check if invoice already exists for this tenant/month
        existing = StripeInvoice.objects.filter(
            tenant=tenant,
            invoice_month=invoice_month
        ).first()
        
        if existing:
            logger.info(f"Invoice already exists for {tenant.user.get_full_name()} - {invoice_month}")
            return existing
        
        # Create invoice via Strike API
        metadata = {
            'tenant_id': str(tenant.id),
            'invoice_month': invoice_month,
            'system': 'property_management'
        }
        
        strike_response = self.strike_api.create_invoice(
            amount_zar=amount_zar,
            description=description,
            metadata=metadata
        )
        
        # Create database record
        invoice = StripeInvoice.objects.create(
            tenant=tenant,
            amount_zar=amount_zar,
            description=description,
            invoice_month=invoice_month,
            invoice_year=int(invoice_month.split('-')[0]),
            strike_invoice_id=strike_response['invoiceId'],
            status='pending'
        )
        
        # Generate payment URL
        invoice.payment_url = invoice.get_payment_url()
        invoice.save()
        
        logger.info(f"Created rent invoice: {invoice.id} for {tenant.user.get_full_name()}")
        return invoice
    
    def generate_payment_quote(self, invoice_id: str) -> 'LightningQuote':
        """
        Generate a new Lightning payment quote with current BTC rate
        
        Args:
            invoice_id: StripeInvoice UUID
        
        Returns:
            LightningQuote instance
        """
        from .models import StripeInvoice, LightningQuote
        
        try:
            invoice = StripeInvoice.objects.get(id=invoice_id)
        except StripeInvoice.DoesNotExist:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        if invoice.is_paid:
            raise ValueError(f"Invoice {invoice_id} is already paid")
        
        # Generate quote via Strike API
        strike_response = self.strike_api.generate_quote(invoice.strike_invoice_id)
        
        # Calculate expiration time (15 minutes from now)
        expires_at = timezone.now() + timedelta(minutes=settings.LIGHTNING_INVOICE_EXPIRY_MINUTES)
        
        # Create quote record
        quote = LightningQuote.objects.create(
            strike_invoice=invoice,
            quote_id=strike_response['quoteId'],
            bolt11=strike_response['lnInvoice'],
            btc_amount=Decimal(str(strike_response['targetAmount']['amount'])),
            exchange_rate=Decimal(str(strike_response['conversionRate']['amount'])),
            expires_at=expires_at,
            status='active'
        )
        
        # Update invoice status
        invoice.status = 'quote_generated'
        invoice.save()
        
        logger.info(f"Generated payment quote: {quote.id} for invoice {invoice.id}")
        return quote
    
    def process_payment_webhook(self, webhook_data: Dict[str, Any]) -> bool:
        """
        Process Strike webhook for payment confirmation
        
        Args:
            webhook_data: Strike webhook payload
        
        Returns:
            True if processed successfully
        """
        from .models import StripeInvoice, PaymentTransaction, WebhookEvent
        
        event_type = webhook_data.get('eventType')
        event_id = webhook_data.get('eventId')
        invoice_data = webhook_data.get('data', {})
        
        # Log webhook event
        webhook_event = WebhookEvent.objects.create(
            event_type=event_type,
            event_id=event_id,
            raw_data=webhook_data
        )
        
        try:
            if event_type == 'invoice.created':
                return self._handle_invoice_created(invoice_data, webhook_event)
            elif event_type == 'invoice.updated':
                return self._handle_invoice_updated(invoice_data, webhook_event)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                return True
                
        except Exception as e:
            webhook_event.processing_error = str(e)
            webhook_event.save()
            logger.error(f"Error processing webhook {event_id}: {str(e)}")
            return False
    
    def _handle_invoice_created(self, invoice_data: Dict, webhook_event: 'WebhookEvent') -> bool:
        """Handle invoice.created webhook event"""
        from .models import StripeInvoice, PaymentTransaction
        
        strike_invoice_id = invoice_data.get('invoiceId')
        
        try:
            invoice = StripeInvoice.objects.get(strike_invoice_id=strike_invoice_id)
            webhook_event.strike_invoice = invoice
            webhook_event.save()
            
            # If invoice is already marked as paid, do nothing
            if invoice.is_paid:
                logger.info(f"Invoice {invoice.id} already marked as paid")
                return True
            
            # Generate payment quote for the newly created invoice
            self.generate_payment_quote(invoice.id)
            
            logger.info(f"Successfully processed invoice.created webhook for invoice {invoice.id}")
            return True
            
        except StripeInvoice.DoesNotExist:
            logger.error(f"Invoice not found for Strike ID: {strike_invoice_id}")
            return False
    
    def _handle_invoice_updated(self, invoice_data: Dict, webhook_event: 'WebhookEvent') -> bool:
        """
        Handle invoice.updated webhook event
        
        This is the key event we'll use to detect payment completion since
        'invoice.paid' is not available via webhook
        """
        from .models import StripeInvoice, PaymentTransaction
        
        strike_invoice_id = invoice_data.get('invoiceId')
        state = invoice_data.get('state', '').upper()  # UNPAID, PENDING, PAID, etc.
        
        try:
            invoice = StripeInvoice.objects.get(strike_invoice_id=strike_invoice_id)
            webhook_event.strike_invoice = invoice
            webhook_event.save()
            
            # If state is PAID and invoice not already marked as paid
            if state == 'PAID' and invoice.status != 'paid':
                logger.info(f"Invoice {invoice.id} marked as paid via invoice.updated webhook")
                
                # Get the latest quote for this invoice
                latest_quote = invoice.quotes.filter(status='active').first()
                if not latest_quote:
                    raise ValueError(f"No active quote found for invoice {invoice.id}")
                
                # Create payment transaction record
                transaction = PaymentTransaction.objects.create(
                    strike_invoice=invoice,
                    lightning_quote=latest_quote,
                    transaction_hash=invoice_data.get('transactionHash', ''),
                    amount_zar=invoice.amount_zar,
                    amount_btc=latest_quote.btc_amount,
                    strike_payment_id=invoice_data.get('paymentId', strike_invoice_id),
                    webhook_received_at=timezone.now(),
                    status='confirmed',
                    confirmed_at=timezone.now()
                )
                
                # Update invoice and quote status
                invoice.status = 'paid'
                invoice.paid_at = timezone.now()
                invoice.save()
                
                latest_quote.status = 'paid'
                latest_quote.paid_at = timezone.now()
                latest_quote.save()
                
                logger.info(f"Successfully processed payment for invoice {invoice.id}")
                
            # Handle other state changes
            elif state == 'CANCELED' and invoice.status != 'canceled':
                invoice.status = 'canceled'
                invoice.save()
                
                # Cancel active quotes
                invoice.quotes.filter(status='active').update(status='canceled')
                
                logger.info(f"Invoice {invoice.id} canceled")
            
            # Mark webhook as processed
            webhook_event.processed = True
            webhook_event.save()
            
            return True
            
        except StripeInvoice.DoesNotExist:
            logger.error(f"Invoice not found for Strike ID: {strike_invoice_id}")
            return False 