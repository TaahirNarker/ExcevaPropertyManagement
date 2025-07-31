"""
Bitcoin Lightning Payment Admin Interface
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import StripeInvoice, LightningQuote, PaymentTransaction, WebhookEvent


@admin.register(StripeInvoice)
class StripeInvoiceAdmin(admin.ModelAdmin):
    """Admin interface for Strike invoices"""
    
    list_display = [
        'strike_invoice_id', 'tenant_name', 'amount_zar', 
        'invoice_month', 'status', 'is_paid', 'created_at'
    ]
    list_filter = ['status', 'currency', 'invoice_year', 'created_at']
    search_fields = ['strike_invoice_id', 'tenant__name', 'tenant__email', 'description']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'strike_invoice_id', 
        'payment_url_link', 'is_paid', 'is_expired'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'created_at', 'updated_at', 'tenant', 'lease')
        }),
        ('Invoice Details', {
            'fields': ('amount_zar', 'currency', 'description', 'invoice_month', 'invoice_year')
        }),
        ('Strike Integration', {
            'fields': ('strike_invoice_id', 'status', 'payment_url_link')
        }),
        ('Payment Tracking', {
            'fields': ('paid_at', 'expires_at', 'is_paid', 'is_expired')
        }),
    )
    
    def tenant_name(self, obj):
        return obj.tenant.name
    tenant_name.short_description = 'Tenant'
    
    def payment_url_link(self, obj):
        if obj.payment_url:
            return format_html('<a href="{}" target="_blank">Open Payment Page</a>', obj.payment_url)
        return '-'
    payment_url_link.short_description = 'Payment URL'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('tenant', 'lease')


@admin.register(LightningQuote)
class LightningQuoteAdmin(admin.ModelAdmin):
    """Admin interface for Lightning quotes"""
    
    list_display = [
        'quote_id', 'invoice_tenant', 'btc_amount', 
        'exchange_rate', 'status', 'expires_at', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['quote_id', 'strike_invoice__tenant__name', 'bolt11']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'quote_id', 'bolt11',
        'btc_amount', 'exchange_rate', 'expires_at', 'is_expired', 'time_remaining_seconds'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'created_at', 'updated_at', 'strike_invoice')
        }),
        ('Quote Details', {
            'fields': ('quote_id', 'btc_amount', 'exchange_rate', 'bolt11_display')
        }),
        ('Status & Timing', {
            'fields': ('status', 'expires_at', 'is_expired', 'time_remaining_seconds', 'paid_at')
        }),
    )
    
    def invoice_tenant(self, obj):
        return obj.strike_invoice.tenant.name
    invoice_tenant.short_description = 'Tenant'
    
    def bolt11_display(self, obj):
        if obj.bolt11:
            truncated = obj.bolt11[:50] + '...' if len(obj.bolt11) > 50 else obj.bolt11
            return format_html('<code style="font-size: 11px;">{}</code>', truncated)
        return '-'
    bolt11_display.short_description = 'Lightning Invoice (bolt11)'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('strike_invoice__tenant')


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    """Admin interface for payment transactions"""
    
    list_display = [
        'strike_payment_id', 'tenant_name', 'amount_zar', 
        'amount_btc', 'status', 'confirmed_at', 'created_at'
    ]
    list_filter = ['status', 'confirmed_at', 'created_at']
    search_fields = [
        'strike_payment_id', 'transaction_hash', 
        'strike_invoice__tenant__name', 'strike_invoice__tenant__email'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'transaction_hash',
        'amount_zar', 'amount_btc', 'strike_payment_id', 
        'webhook_received_at', 'confirmed_at'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'created_at', 'updated_at', 'strike_invoice', 'lightning_quote')
        }),
        ('Transaction Details', {
            'fields': ('transaction_hash', 'amount_zar', 'amount_btc', 'strike_payment_id')
        }),
        ('Status & Timing', {
            'fields': ('status', 'webhook_received_at', 'confirmed_at')
        }),
    )
    
    def tenant_name(self, obj):
        return obj.strike_invoice.tenant.name
    tenant_name.short_description = 'Tenant'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'strike_invoice__tenant', 'lightning_quote'
        )


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    """Admin interface for webhook events"""
    
    list_display = [
        'event_id', 'event_type', 'related_invoice', 
        'processed', 'created_at'
    ]
    list_filter = ['event_type', 'processed', 'created_at']
    search_fields = ['event_id', 'strike_invoice__tenant__name']
    readonly_fields = ['id', 'created_at', 'raw_data_display']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Event Information', {
            'fields': ('id', 'created_at', 'event_type', 'event_id', 'strike_invoice')
        }),
        ('Processing Status', {
            'fields': ('processed', 'processing_error')
        }),
        ('Raw Data', {
            'fields': ('raw_data_display',),
            'classes': ('collapse',)
        }),
    )
    
    def related_invoice(self, obj):
        if obj.strike_invoice:
            url = reverse('admin:payments_stripeinvoice_change', args=[obj.strike_invoice.id])
            return format_html('<a href="{}">{}</a>', url, obj.strike_invoice.strike_invoice_id)
        return '-'
    related_invoice.short_description = 'Related Invoice'
    
    def raw_data_display(self, obj):
        import json
        formatted_json = json.dumps(obj.raw_data, indent=2)
        return format_html('<pre style="font-size: 12px; max-height: 400px; overflow-y: auto;">{}</pre>', formatted_json)
    raw_data_display.short_description = 'Raw Webhook Data'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('strike_invoice') 