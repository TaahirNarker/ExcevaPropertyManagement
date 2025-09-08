from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceViewSet, InvoiceTemplateViewSet, InvoicePaymentViewSet, 
    InvoiceLineItemViewSet, InvoiceAuditLogViewSet, FinanceAPIViewSet,
    PaymentAllocationViewSet, RecurringChargeViewSet, RentEscalationViewSet, SystemSettingsViewSet,
    PaymentReconciliationViewSet, ManualPaymentViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'templates', InvoiceTemplateViewSet, basename='invoice-template')
router.register(r'payments', InvoicePaymentViewSet, basename='invoice-payment')
router.register(r'manual-payments', ManualPaymentViewSet, basename='manual-payment')
router.register(r'line-items', InvoiceLineItemViewSet, basename='invoice-line-item')
router.register(r'audit-logs', InvoiceAuditLogViewSet, basename='invoice-audit-log')
router.register(r'payment-allocation', PaymentAllocationViewSet, basename='payment-allocation')
router.register(r'recurring-charges', RecurringChargeViewSet, basename='recurring-charge')
router.register(r'rent-escalation', RentEscalationViewSet, basename='rent-escalation')
router.register(r'system-settings', SystemSettingsViewSet, basename='system-settings')
router.register(r'payment-reconciliation', PaymentReconciliationViewSet, basename='payment-reconciliation')

urlpatterns = [
    path('', include(router.urls)),
    
    # Finance dashboard endpoints
    path('summary/', FinanceAPIViewSet.as_view({'get': 'financial_summary'}), name='finance-summary'),
    path('rental-outstanding/', FinanceAPIViewSet.as_view({'get': 'rental_outstanding'}), name='finance-rental-outstanding'),
    path('payments/', FinanceAPIViewSet.as_view({'get': 'payments'}), name='finance-payments'),
    path('landlord-payments/', FinanceAPIViewSet.as_view({'get': 'landlord_payments'}), name='finance-landlord-payments'),
    path('supplier-payments/', FinanceAPIViewSet.as_view({'get': 'supplier_payments'}), name='finance-supplier-payments'),
    path('bank-transactions/', FinanceAPIViewSet.as_view({'get': 'bank_transactions'}), name='finance-bank-transactions'),
    path('lease-financials/', FinanceAPIViewSet.as_view({'get': 'lease_financials'}), name='lease-financials'),
    
    # New Payment Reconciliation endpoints
    path('import-csv/', PaymentReconciliationViewSet.as_view({'post': 'import_csv'}), name='import-csv'),
    path('manual-payment/', PaymentReconciliationViewSet.as_view({'post': 'record_manual_payment'}), name='manual-payment'),
    path('allocate-payment/', PaymentReconciliationViewSet.as_view({'post': 'allocate_payment'}), name='allocate-payment'),
    path('create-adjustment/', PaymentReconciliationViewSet.as_view({'post': 'create_adjustment'}), name='create-adjustment'),
    path('tenant-statement/<int:tenant_id>/', PaymentReconciliationViewSet.as_view({'get': 'get_tenant_statement'}), name='tenant-statement'),
    path('lease-statement/<int:lease_id>/', PaymentReconciliationViewSet.as_view({'get': 'get_lease_statement'}), name='lease-statement'),
    path('unmatched-payments/', PaymentReconciliationViewSet.as_view({'get': 'get_unmatched_payments'}), name='unmatched-payments'),
    path('payment-status/<int:payment_id>/', PaymentReconciliationViewSet.as_view({'get': 'get_payment_status'}), name='payment-status'),
] 