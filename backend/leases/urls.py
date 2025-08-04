from django.urls import path
from . import views

urlpatterns = [
    # Lease CRUD operations
    path('', views.LeaseListView.as_view(), name='lease-list'),
    path('<int:id>/', views.LeaseDetailView.as_view(), name='lease-detail'),
    
    # Lease Attachments
    path('<int:id>/attachments/', views.LeaseAttachmentListView.as_view(), name='lease-attachments'),
    path('<int:id>/attachments/<int:pk>/', views.LeaseAttachmentDetailView.as_view(), name='lease-attachment-detail'),
    
    # Lease Notes
    path('<int:id>/notes/', views.LeaseNoteListView.as_view(), name='lease-notes'),
    path('<int:id>/notes/<int:pk>/', views.LeaseNoteDetailView.as_view(), name='lease-note-detail'),
    
    # Choices for dropdowns
    path('choices/', views.lease_choices, name='lease-choices'),
] 