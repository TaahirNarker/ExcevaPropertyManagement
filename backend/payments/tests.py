"""
Bitcoin Lightning Payment Tests
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch, MagicMock

from tenants.models import Tenant
from .models import StripeInvoice, LightningQuote, PaymentTransaction
from .services import StrikeAPIService, PaymentService

User = get_user_model()


class StrikeAPIServiceTest(TestCase):
    """Test Strike API service functionality"""
    
    def setUp(self):
        self.api_service = StrikeAPIService()
    
    @patch('requests.post')
    def test_create_invoice(self, mock_post):
        """Test Strike invoice creation"""
        # Mock Strike API response
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'invoiceId': 'strike_123',
            'amount': {'currency': 'ZAR', 'amount': '6000.00'},
            'description': 'Test rent payment'
        }
        mock_post.return_value = mock_response
        
        result = self.api_service.create_invoice(
            amount_zar=Decimal('6000.00'),
            description='Test rent payment'
        )
        
        self.assertEqual(result['invoiceId'], 'strike_123')
        mock_post.assert_called_once()
    
    @patch('requests.post')
    def test_generate_quote(self, mock_post):
        """Test Lightning quote generation"""
        # Mock Strike API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'quoteId': 'quote_123',
            'lnInvoice': 'lnbc123...',
            'targetAmount': {'amount': '0.00123456'},
            'conversionRate': {'amount': '4878048.78'}
        }
        mock_post.return_value = mock_response
        
        result = self.api_service.generate_quote('strike_123')
        
        self.assertEqual(result['quoteId'], 'quote_123')
        self.assertIn('lnInvoice', result)
        mock_post.assert_called_once()


class PaymentServiceTest(TestCase):
    """Test high-level payment service"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.tenant = Tenant.objects.create(
            name='John Doe',
            email='john@example.com',
            phone='123456789'
        )
        self.payment_service = PaymentService()
    
    @patch.object(StrikeAPIService, 'create_invoice')
    def test_create_rent_invoice(self, mock_create_invoice):
        """Test rent invoice creation"""
        # Mock Strike API response
        mock_create_invoice.return_value = {
            'invoiceId': 'strike_123',
            'amount': {'currency': 'ZAR', 'amount': '6000.00'}
        }
        
        invoice = self.payment_service.create_rent_invoice(
            tenant=self.tenant,
            amount_zar=Decimal('6000.00'),
            invoice_month='2024-07',
            description='July 2024 rent'
        )
        
        self.assertIsInstance(invoice, StripeInvoice)
        self.assertEqual(invoice.tenant, self.tenant)
        self.assertEqual(invoice.amount_zar, Decimal('6000.00'))
        self.assertEqual(invoice.invoice_month, '2024-07')
        self.assertEqual(invoice.strike_invoice_id, 'strike_123')
        mock_create_invoice.assert_called_once()
    
    @patch.object(StrikeAPIService, 'generate_quote')
    def test_generate_payment_quote(self, mock_generate_quote):
        """Test payment quote generation"""
        # Create invoice first
        invoice = StripeInvoice.objects.create(
            tenant=self.tenant,
            amount_zar=Decimal('6000.00'),
            description='Test invoice',
            invoice_month='2024-07',
            invoice_year=2024,
            strike_invoice_id='strike_123'
        )
        
        # Mock Strike API response
        mock_generate_quote.return_value = {
            'quoteId': 'quote_123',
            'lnInvoice': 'lnbc123...',
            'targetAmount': {'amount': '0.00123456'},
            'conversionRate': {'amount': '4878048.78'}
        }
        
        quote = self.payment_service.generate_payment_quote(str(invoice.id))
        
        self.assertIsInstance(quote, LightningQuote)
        self.assertEqual(quote.strike_invoice, invoice)
        self.assertEqual(quote.quote_id, 'quote_123')
        self.assertEqual(quote.btc_amount, Decimal('0.00123456'))
        mock_generate_quote.assert_called_once()


class ModelsTest(TestCase):
    """Test payment models"""
    
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name='Jane Doe',
            email='jane@example.com',
            phone='987654321'
        )
    
    def test_strike_invoice_creation(self):
        """Test Strike invoice model"""
        invoice = StripeInvoice.objects.create(
            tenant=self.tenant,
            amount_zar=Decimal('5000.00'),
            description='Test invoice',
            invoice_month='2024-08',
            invoice_year=2024,
            strike_invoice_id='strike_456'
        )
        
        self.assertEqual(str(invoice), 'Strike Invoice strike_456 - Jane Doe - R5000.00')
        self.assertFalse(invoice.is_paid)
        self.assertFalse(invoice.is_expired)
        self.assertIn('/pay/', invoice.get_payment_url())
    
    def test_lightning_quote_properties(self):
        """Test Lightning quote model properties"""
        invoice = StripeInvoice.objects.create(
            tenant=self.tenant,
            amount_zar=Decimal('5000.00'),
            description='Test invoice',
            invoice_month='2024-08',
            invoice_year=2024,
            strike_invoice_id='strike_456'
        )
        
        quote = LightningQuote.objects.create(
            strike_invoice=invoice,
            quote_id='quote_456',
            bolt11='lnbc456...',
            btc_amount=Decimal('0.00098765'),
            exchange_rate=Decimal('5063291.14'),
            expires_at='2024-08-01T12:00:00Z'
        )
        
        self.assertEqual(str(quote), 'Quote quote_456 - 0.00098765 BTC')
        # Note: is_expired test would depend on current time vs expires_at 