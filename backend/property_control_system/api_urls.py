from django.urls import path, include
from rest_framework.routers import DefaultRouter
from properties.views import PropertyViewSet, UnitViewSet
from tenants.views import TenantViewSet, LeaseViewSet
from finance.views import InvoiceViewSet, PaymentViewSet, dashboard_summary

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'properties', PropertyViewSet)
router.register(r'units', UnitViewSet)
router.register(r'tenants', TenantViewSet)
router.register(r'leases', LeaseViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'payments', PaymentViewSet)

# API URL patterns
urlpatterns = [
    # Dashboard summary endpoint
    path('summary/', dashboard_summary, name='dashboard-summary'),
    
    # Include router URLs
    path('', include(router.urls)),
] 