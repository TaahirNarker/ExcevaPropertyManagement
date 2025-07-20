from django.shortcuts import render
from django.db.models import Q
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Tenant, TenantDocument, TenantCommunication
from .serializers import (
    TenantListSerializer,
    TenantDetailSerializer,
    TenantCreateUpdateSerializer,
    TenantDocumentSerializer,
    TenantCommunicationSerializer
)
from django.utils import timezone


# Create your views here.

class TenantListCreateView(generics.ListCreateAPIView):
    """
    List all tenants or create a new tenant.
    Supports filtering, searching, and ordering.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__first_name', 'user__last_name', 'email', 'phone', 'tenant_code']
    filterset_fields = ['status', 'employment_status']
    ordering_fields = ['created_at', 'user__first_name', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TenantCreateUpdateSerializer
        return TenantListSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role and search parameters."""
        queryset = Tenant.objects.select_related('user').all()
        
        # Apply search filter if provided
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(tenant_code__icontains=search)
            )
        
        return queryset


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a tenant instance.
    """
    queryset = Tenant.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'tenant_code'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TenantCreateUpdateSerializer
        return TenantDetailSerializer


class TenantDocumentListCreateView(generics.ListCreateAPIView):
    """
    List and create tenant documents.
    """
    serializer_class = TenantDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return TenantDocument.objects.filter(tenant__tenant_code=self.kwargs['tenant_code'])
    
    def perform_create(self, serializer):
        tenant = Tenant.objects.get(tenant_code=self.kwargs['tenant_code'])
        serializer.save(tenant=tenant)


class TenantDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a tenant document.
    """
    serializer_class = TenantDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return TenantDocument.objects.filter(tenant__tenant_code=self.kwargs['tenant_code'])


class TenantCommunicationListCreateView(generics.ListCreateAPIView):
    """
    List and create tenant communications.
    """
    serializer_class = TenantCommunicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TenantCommunication.objects.filter(tenant__tenant_code=self.kwargs['tenant_code'])
    
    def perform_create(self, serializer):
        tenant = Tenant.objects.get(tenant_code=self.kwargs['tenant_code'])
        serializer.save(tenant=tenant, created_by=self.request.user)


class TenantCommunicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a tenant communication.
    """
    serializer_class = TenantCommunicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TenantCommunication.objects.filter(tenant__tenant_code=self.kwargs['tenant_code'])


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tenant_statistics(request, tenant_code):
    """
    Get statistics and summary information for a tenant.
    """
    try:
        tenant = Tenant.objects.get(tenant_code=tenant_code)
        active_lease = tenant.leases.filter(status='active').first()
        
        # Gather statistics
        stats = {
            'total_leases': tenant.leases.count(),
            'total_documents': tenant.documents.count(),
            'total_communications': tenant.communications.count(),
            'active_lease': None,
            'payment_history': {
                'total_payments': 0,
                'on_time_payments': 0,
                'late_payments': 0,
                'missed_payments': 0
            }
        }
        
        # Add active lease information if exists
        if active_lease:
            stats['active_lease'] = {
                'property_name': active_lease.property.name,
                'start_date': active_lease.start_date,
                'end_date': active_lease.end_date,
                'monthly_rent': active_lease.monthly_rent,
                'days_remaining': (active_lease.end_date - timezone.now().date()).days
            }
        
        return Response(stats)
    
    except Tenant.DoesNotExist:
        return Response(
            {'error': 'Tenant not found'},
            status=status.HTTP_404_NOT_FOUND
        )
