from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Lead, Contact, Communication, Task
from .serializers import (
    LeadSerializer, LeadListSerializer,
    ContactSerializer, ContactListSerializer,
    CommunicationSerializer, TaskSerializer, TaskListSerializer
)


class LeadListView(generics.ListCreateAPIView):
    """View for listing and creating leads"""
    permission_classes = [IsAuthenticated]
    serializer_class = LeadListSerializer
    
    def get_queryset(self):
        """Optimized queryset with select_related"""
        try:
            return Lead.objects.select_related('assigned_to', 'created_by').all()
        except Exception as e:
            print(f"Error in lead queryset: {e}")
            return Lead.objects.all()
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return LeadListSerializer
        return LeadSerializer
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in lead list view: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch leads: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting leads"""
    permission_classes = [IsAuthenticated]
    serializer_class = LeadSerializer
    
    def get_queryset(self):
        try:
            return Lead.objects.select_related('assigned_to', 'created_by').all()
        except Exception as e:
            print(f"Error in lead detail queryset: {e}")
            return Lead.objects.all()


class ContactListView(generics.ListCreateAPIView):
    """View for listing and creating contacts"""
    permission_classes = [IsAuthenticated]
    serializer_class = ContactListSerializer
    
    def get_queryset(self):
        """Optimized queryset with select_related"""
        try:
            return Contact.objects.select_related('created_by').all()
        except Exception as e:
            print(f"Error in contact queryset: {e}")
            return Contact.objects.all()
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ContactListSerializer
        return ContactSerializer
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in contact list view: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch contacts: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting contacts"""
    permission_classes = [IsAuthenticated]
    serializer_class = ContactSerializer
    
    def get_queryset(self):
        try:
            return Contact.objects.select_related('created_by').all()
        except Exception as e:
            print(f"Error in contact detail queryset: {e}")
            return Contact.objects.all()


class CommunicationListView(generics.ListCreateAPIView):
    """View for listing and creating communications"""
    permission_classes = [IsAuthenticated]
    serializer_class = CommunicationSerializer
    
    def get_queryset(self):
        """Optimized queryset with select_related"""
        try:
            return Communication.objects.select_related('contact', 'created_by').all()
        except Exception as e:
            print(f"Error in communication queryset: {e}")
            return Communication.objects.all()
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in communication list view: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch communications: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommunicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting communications"""
    permission_classes = [IsAuthenticated]
    serializer_class = CommunicationSerializer
    
    def get_queryset(self):
        try:
            return Communication.objects.select_related('contact', 'created_by').all()
        except Exception as e:
            print(f"Error in communication detail queryset: {e}")
            return Communication.objects.all()


class TaskListView(generics.ListCreateAPIView):
    """View for listing and creating tasks"""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskListSerializer
    
    def get_queryset(self):
        """Optimized queryset with select_related"""
        try:
            return Task.objects.select_related('assigned_to', 'contact', 'created_by').all()
        except Exception as e:
            print(f"Error in task queryset: {e}")
            return Task.objects.all()
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TaskListSerializer
        return TaskSerializer
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in task list view: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch tasks: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting tasks"""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        try:
            return Task.objects.select_related('assigned_to', 'contact', 'created_by').all()
        except Exception as e:
            print(f"Error in task detail queryset: {e}")
            return Task.objects.all()
