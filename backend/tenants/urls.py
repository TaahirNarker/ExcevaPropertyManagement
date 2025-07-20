from django.urls import path
from . import views

app_name = 'tenants'

urlpatterns = [
    # Tenant CRUD operations
    path('', views.TenantListCreateView.as_view(), name='tenant-list'),
    path('<str:tenant_code>/', views.TenantDetailView.as_view(), name='tenant-detail'),
    path('<str:tenant_code>/stats/', views.tenant_statistics, name='tenant-stats'),
    
    # Tenant documents
    path('<str:tenant_code>/documents/', views.TenantDocumentListCreateView.as_view(), name='tenant-documents'),
    path('<str:tenant_code>/documents/<int:pk>/', views.TenantDocumentDetailView.as_view(), name='tenant-document-detail'),
    
    # Tenant communications
    path('<str:tenant_code>/communications/', views.TenantCommunicationListCreateView.as_view(), name='tenant-communications'),
    path('<str:tenant_code>/communications/<int:pk>/', views.TenantCommunicationDetailView.as_view(), name='tenant-communication-detail'),
] 