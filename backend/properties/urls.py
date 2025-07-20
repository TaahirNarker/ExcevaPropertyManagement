"""
URL routing for the Properties app
Defines all endpoints for property management
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import BrandingLogoUploadView

# Define URL patterns
urlpatterns = [
    # Property CRUD operations
    path('', views.PropertyListView.as_view(), name='property-list'),
    path('create/', views.PropertyCreateView.as_view(), name='property-create'),
    path('<str:property_code>/', views.PropertyDetailView.as_view(), name='property-detail'),
    
    # Property search and filtering
    path('search/advanced/', views.PropertySearchView.as_view(), name='property-search'),
    
    # Property statistics
    path('stats/overview/', views.PropertyStatsView.as_view(), name='property-stats'),
    
    # Property utility endpoints
    path('choices/all/', views.property_choices, name='property-choices'),
    path('<str:property_code>/summary/', views.property_summary, name='property-summary'),
    
    # Property images
    path('<str:property_code>/images/', views.PropertyImageListView.as_view(), name='property-images'),
    path('<str:property_code>/images/<int:pk>/', views.PropertyImageDetailView.as_view(), name='property-image-detail'),
    
    # Property documents
    path('<str:property_code>/documents/', views.PropertyDocumentListView.as_view(), name='property-documents'),
    path('<str:property_code>/documents/<int:pk>/', views.PropertyDocumentDetailView.as_view(), name='property-document-detail'),
    path('branding/logo/', BrandingLogoUploadView.as_view(), name='branding-logo-upload'),
] 