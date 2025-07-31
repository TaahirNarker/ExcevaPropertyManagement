from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DebtorViewSet, DebtDocumentViewSet, DebtPaymentViewSet, DebtAuditLogViewSet

router = DefaultRouter()
router.register(r'debtors', DebtorViewSet)
router.register(r'documents', DebtDocumentViewSet)
router.register(r'payments', DebtPaymentViewSet)
router.register(r'audit-logs', DebtAuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 