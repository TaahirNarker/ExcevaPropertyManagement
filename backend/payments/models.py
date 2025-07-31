"""
Bitcoin Lightning Payment Models
Handles ZAR-to-BTC payments via Strike API
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()


class StripeInvoice(models.Model):
    """
    Represents a Strike invoice for rent payment
    Maps to Strike's invoice object for accounting consistency
    """
    INVOICE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('quote_generated', 'Quote Generated'),
        ('paid', 'Paid'),
        ('expired', 'Expired'),
        ('canceled', 'Canceled'),
    ]
    
    CURRENCY_CHOICES = [
        ('ZAR', 'South African Rand'),
        ('BTC', 'Bitcoin'),
    ]
    
    # Internal tracking
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Tenant and lease information
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='lightning_invoices')
    lease = models.ForeignKey('tenants.Lease', on_delete=models.CASCADE, related_name='lightning_invoices', null=True, blank=True)
    
    # Invoice details in ZAR
    amount_zar = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount in ZAR")
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='ZAR')
    description = models.TextField(help_text="Invoice description (e.g., 'Rent for July 2024')")
    
    # Invoice period
    invoice_month = models.CharField(max_length=7, help_text="YYYY-MM format (e.g., '2024-07')")
    invoice_year = models.IntegerField()
    
    # Strike API details
    strike_invoice_id = models.CharField(max_length=255, unique=True, help_text="Strike's invoice ID")
    strike_payment_request = models.TextField(blank=True, null=True, help_text="Lightning payment request (bolt11)")
    
    # Status tracking
    status = models.CharField(max_length=20, choices=INVOICE_STATUS_CHOICES, default='pending')
    payment_url = models.URLField(blank=True, null=True, help_text="Frontend payment URL")
    
    # Payment tracking
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_strike_invoice'
        verbose_name = 'Strike Invoice'
        verbose_name_plural = 'Strike Invoices'
        unique_together = [['tenant', 'invoice_month']]  # One invoice per tenant per month
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Strike Invoice {self.strike_invoice_id} - {self.tenant.name} - R{self.amount_zar}"
    
    @property
    def is_expired(self):
        """Check if the invoice has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def is_paid(self):
        """Check if the invoice has been paid"""
        return self.status == 'paid'
    
    def get_payment_url(self):
        """Generate the frontend payment URL"""
        from django.conf import settings
        return f"{settings.PAYMENT_BASE_URL}/{self.tenant.id}/invoice/{self.id}"


class LightningQuote(models.Model):
    """
    Represents a Lightning payment quote for real-time BTC conversion
    Generated when tenant clicks 'Pay Now' - expires in 15 minutes
    """
    QUOTE_STATUS_CHOICES = [
        ('active', 'Active'),
        ('paid', 'Paid'),
        ('expired', 'Expired'),
        ('canceled', 'Canceled'),
    ]
    
    # Internal tracking
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Related invoice
    strike_invoice = models.ForeignKey(StripeInvoice, on_delete=models.CASCADE, related_name='quotes')
    
    # Quote details
    quote_id = models.CharField(max_length=255, unique=True, help_text="Strike's quote ID")
    bolt11 = models.TextField(help_text="Lightning payment request")
    
    # BTC conversion details
    btc_amount = models.DecimalField(max_digits=16, decimal_places=8, help_text="Amount in BTC")
    exchange_rate = models.DecimalField(max_digits=20, decimal_places=8, help_text="ZAR to BTC exchange rate")
    
    # Expiration
    expires_at = models.DateTimeField(help_text="Quote expiration time")
    status = models.CharField(max_length=20, choices=QUOTE_STATUS_CHOICES, default='active')
    
    # Payment tracking
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_lightning_quote'
        verbose_name = 'Lightning Quote'
        verbose_name_plural = 'Lightning Quotes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Quote {self.quote_id} - {self.btc_amount} BTC"
    
    @property
    def is_expired(self):
        """Check if the quote has expired"""
        return timezone.now() > self.expires_at
    
    @property
    def time_remaining_seconds(self):
        """Get seconds remaining until expiration"""
        if self.is_expired:
            return 0
        return int((self.expires_at - timezone.now()).total_seconds())


class PaymentTransaction(models.Model):
    """
    Records completed Bitcoin Lightning payment transactions
    Used for accounting and reconciliation
    """
    TRANSACTION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ]
    
    # Internal tracking
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Related records
    strike_invoice = models.OneToOneField(StripeInvoice, on_delete=models.CASCADE, related_name='transaction')
    lightning_quote = models.ForeignKey(LightningQuote, on_delete=models.CASCADE, related_name='transaction')
    
    # Transaction details
    transaction_hash = models.CharField(max_length=255, unique=True, help_text="Lightning transaction hash")
    amount_zar = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount paid in ZAR")
    amount_btc = models.DecimalField(max_digits=16, decimal_places=8, help_text="Amount paid in BTC")
    
    # Strike webhook data
    strike_payment_id = models.CharField(max_length=255, unique=True, help_text="Strike's payment ID")
    webhook_received_at = models.DateTimeField(help_text="When webhook was received")
    
    # Status
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS_CHOICES, default='pending')
    confirmed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_payment_transaction'
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.strike_payment_id} - R{self.amount_zar} -> {self.amount_btc} BTC"


class WebhookEvent(models.Model):
    """
    Logs all Strike webhook events for debugging and audit trail
    """
    EVENT_TYPES = [
        ('invoice.created', 'Invoice Created'),
        ('invoice.updated', 'Invoice Updated'),
        ('invoice.paid', 'Invoice Paid'),
        ('invoice.canceled', 'Invoice Canceled'),
    ]
    
    # Internal tracking
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Webhook details
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    event_id = models.CharField(max_length=255, unique=True, help_text="Strike's event ID")
    
    # Payload
    raw_data = models.JSONField(help_text="Raw webhook payload from Strike")
    processed = models.BooleanField(default=False)
    processing_error = models.TextField(null=True, blank=True)
    
    # Related objects (optional)
    strike_invoice = models.ForeignKey(StripeInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='webhook_events')
    
    class Meta:
        db_table = 'payments_webhook_event'
        verbose_name = 'Webhook Event'
        verbose_name_plural = 'Webhook Events'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event_type} - {self.event_id}" 