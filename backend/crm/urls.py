from django.urls import path
from . import views

urlpatterns = [
    # Lead URLs
    path('leads/', views.LeadListView.as_view(), name='lead-list'),
    path('leads/<int:pk>/', views.LeadDetailView.as_view(), name='lead-detail'),
    
    # Contact URLs
    path('contacts/', views.ContactListView.as_view(), name='contact-list'),
    path('contacts/<int:pk>/', views.ContactDetailView.as_view(), name='contact-detail'),
    
    # Communication URLs
    path('communications/', views.CommunicationListView.as_view(), name='communication-list'),
    path('communications/<int:pk>/', views.CommunicationDetailView.as_view(), name='communication-detail'),
    
    # Task URLs
    path('tasks/', views.TaskListView.as_view(), name='task-list'),
    path('tasks/<int:pk>/', views.TaskDetailView.as_view(), name='task-detail'),
] 