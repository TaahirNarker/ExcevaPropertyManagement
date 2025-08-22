from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceViewSet, InvoiceTemplateViewSet, InvoicePaymentViewSet, 
    InvoiceLineItemViewSet, InvoiceAuditLogViewSet, FinanceAPIViewSet,
    PaymentAllocationViewSet, RecurringChargeViewSet, RentEscalationViewSet, SystemSettingsViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'templates', InvoiceTemplateViewSet, basename='invoice-template')
router.register(r'payments', InvoicePaymentViewSet, basename='invoice-payment')
router.register(r'line-items', InvoiceLineItemViewSet, basename='invoice-line-item')
router.register(r'audit-logs', InvoiceAuditLogViewSet, basename='invoice-audit-log')
router.register(r'payment-allocation', PaymentAllocationViewSet, basename='payment-allocation')
router.register(r'recurring-charges', RecurringChargeViewSet, basename='recurring-charge')
router.register(r'rent-escalation', RentEscalationViewSet, basename='rent-escalation')
router.register(r'system-settings', SystemSettingsViewSet, basename='system-settings')

urlpatterns = [
    path('', include(router.urls)),
    
    # Finance dashboard endpoints
    path('summary/', FinanceAPIViewSet.as_view({'get': 'financial_summary'}), name='finance-summary'),
    path('rental-outstanding/', FinanceAPIViewSet.as_view({'get': 'rental_outstanding'}), name='finance-rental-outstanding'),
    path('payments/', FinanceAPIViewSet.as_view({'get': 'payments'}), name='finance-payments'),
    path('landlord-payments/', FinanceAPIViewSet.as_view({'get': 'landlord_payments'}), name='finance-landlord-payments'),
    path('supplier-payments/', FinanceAPIViewSet.as_view({'get': 'supplier_payments'}), name='finance-supplier-payments'),
    path('bank-transactions/', FinanceAPIViewSet.as_view({'get': 'bank_transactions'}), name='finance-bank-transactions'),
] 