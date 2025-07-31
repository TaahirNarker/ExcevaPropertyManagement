"""
Bitcoin Lightning Payment URL Configuration
"""
from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    # Invoice management
    path('create-invoice/', views.create_lightning_invoice, name='create_invoice'),
    path('status/<uuid:invoice_id>/', views.get_payment_status, name='payment_status'),
    path('cancel/<uuid:invoice_id>/', views.cancel_invoice, name='cancel_invoice'),
    
    # Quote generation for real-time BTC conversion
    path('generate-quote/', views.generate_payment_quote, name='generate_quote'),
    
    # Tenant invoice listings
    path('tenant/<uuid:tenant_id>/invoices/', views.list_tenant_invoices, name='tenant_invoices'),
    
    # Exchange rate information
    path('exchange-rate/', views.get_exchange_rate, name='exchange_rate'),
    
    # Strike webhook endpoint
    path('webhook/strike/', views.strike_webhook, name='strike_webhook'),
] 