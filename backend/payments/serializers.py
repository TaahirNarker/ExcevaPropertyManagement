"""
Bitcoin Lightning Payment Serializers
"""
from rest_framework import serializers
from .models import StripeInvoice, LightningQuote, PaymentTransaction, WebhookEvent


class StripeInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Strike invoices"""
    
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    tenant_email = serializers.CharField(source='tenant.email', read_only=True)
    is_paid = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    payment_url = serializers.URLField(read_only=True)
    
    class Meta:
        model = StripeInvoice
        fields = [
            'id', 'created_at', 'updated_at',
            'tenant', 'tenant_name', 'tenant_email',
            'amount_zar', 'currency', 'description',
            'invoice_month', 'invoice_year',
            'strike_invoice_id', 'status',
            'payment_url', 'paid_at', 'expires_at',
            'is_paid', 'is_expired'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'strike_invoice_id', 'status', 'paid_at'
        ]


class LightningQuoteSerializer(serializers.ModelSerializer):
    """Serializer for Lightning payment quotes"""
    
    invoice_amount_zar = serializers.DecimalField(
        source='strike_invoice.amount_zar', 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    invoice_description = serializers.CharField(
        source='strike_invoice.description', 
        read_only=True
    )
    is_expired = serializers.BooleanField(read_only=True)
    time_remaining_seconds = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = LightningQuote
        fields = [
            'id', 'created_at', 'updated_at',
            'strike_invoice', 'invoice_amount_zar', 'invoice_description',
            'quote_id', 'bolt11', 'btc_amount', 'exchange_rate',
            'expires_at', 'status', 'paid_at',
            'is_expired', 'time_remaining_seconds'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'quote_id', 'bolt11', 'btc_amount', 'exchange_rate',
            'expires_at', 'status', 'paid_at'
        ]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for completed payment transactions"""
    
    tenant_name = serializers.CharField(source='strike_invoice.tenant.name', read_only=True)
    invoice_month = serializers.CharField(source='strike_invoice.invoice_month', read_only=True)
    invoice_description = serializers.CharField(source='strike_invoice.description', read_only=True)
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'created_at', 'updated_at',
            'strike_invoice', 'lightning_quote',
            'tenant_name', 'invoice_month', 'invoice_description',
            'transaction_hash', 'amount_zar', 'amount_btc',
            'strike_payment_id', 'webhook_received_at',
            'status', 'confirmed_at'
        ]
        read_only_fields = '__all__'


class WebhookEventSerializer(serializers.ModelSerializer):
    """Serializer for webhook events (admin use)"""
    
    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'created_at', 'event_type', 'event_id',
            'raw_data', 'processed', 'processing_error',
            'strike_invoice'
        ]
        read_only_fields = '__all__'


class PaymentSummarySerializer(serializers.Serializer):
    """Serializer for payment status summary"""
    
    invoice = StripeInvoiceSerializer(read_only=True)
    latest_quote = LightningQuoteSerializer(read_only=True, allow_null=True)
    transaction = PaymentTransactionSerializer(read_only=True, allow_null=True)
    
    # Additional computed fields
    can_generate_quote = serializers.BooleanField(read_only=True)
    needs_new_quote = serializers.BooleanField(read_only=True)
    payment_complete = serializers.BooleanField(read_only=True) 