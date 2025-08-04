from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DebtorViewSet, DebtDocumentViewSet, DebtPaymentViewSet, DebtAuditLogViewSet

router = DefaultRouter()
router.register(r'debtors', DebtorViewSet, basename='debtor')
router.register(r'documents', DebtDocumentViewSet, basename='debtdocument')
router.register(r'payments', DebtPaymentViewSet, basename='debtpayment')
router.register(r'audit-logs', DebtAuditLogViewSet, basename='debtauditlog')

urlpatterns = [
    path('', include(router.urls)),
] 