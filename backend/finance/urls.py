from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InvoiceTemplateViewSet, InvoicePaymentViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'templates', InvoiceTemplateViewSet, basename='invoice-template')
router.register(r'payments', InvoicePaymentViewSet, basename='invoice-payment')

urlpatterns = [
    path('', include(router.urls)),
] 