from django.urls import path
from . import views

urlpatterns = [
    # Tenant CRUD operations
    path('', views.TenantListCreateView.as_view(), name='tenant-list'),
    path('<str:tenant_code>/', views.TenantDetailView.as_view(), name='tenant-detail'),
    path('<str:tenant_code>/stats/', views.tenant_statistics, name='tenant-stats'),
    
    # Tenant lease history (by tenant_code)
    path('<str:tenant_code>/leases/', views.tenant_lease_history, name='tenant-lease-history'),
    
    # Tenant lease history (by ID)
    path('id/<int:tenant_id>/leases/', views.tenant_lease_history_by_id, name='tenant-lease-history-by-id'),
    
    # Tenant documents (by ID)
    path('id/<int:tenant_id>/documents/', views.tenant_documents_by_id, name='tenant-documents-by-id'),
    
    # Tenant communications (by ID)
    path('id/<int:tenant_id>/communications/', views.tenant_communications_by_id, name='tenant-communications-by-id'),
    
    # Tenant documents
    path('<str:tenant_code>/documents/', views.TenantDocumentListCreateView.as_view(), name='tenant-documents'),
    path('<str:tenant_code>/documents/<int:pk>/', views.TenantDocumentDetailView.as_view(), name='tenant-document-detail'),
    
    # Tenant communications
    path('<str:tenant_code>/communications/', views.TenantCommunicationListCreateView.as_view(), name='tenant-communications'),
    path('<str:tenant_code>/communications/<int:pk>/', views.TenantCommunicationDetailView.as_view(), name='tenant-communication-detail'),
    
    # Choices for dropdowns
    path('choices/tenants/', views.tenant_choices, name='tenant-choices'),
] 