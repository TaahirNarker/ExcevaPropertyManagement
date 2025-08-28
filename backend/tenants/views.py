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
    TenantCommunicationSerializer,
)
from django.utils import timezone
from django.shortcuts import get_object_or_404


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
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in tenant list view: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch tenants: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_queryset(self):
        """Filter queryset based on user role and search parameters."""
        try:
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
        except Exception as e:
            print(f"Error in tenant queryset: {e}")
            # Fallback to basic query if prefetch fails
            return Tenant.objects.select_related('user').all()


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a tenant instance.
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'tenant_code'
    
    def get_queryset(self):
        try:
            return Tenant.objects.select_related('user').all()
        except Exception as e:
            print(f"Error in tenant detail queryset: {e}")
            return Tenant.objects.all()
    
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

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tenant_lease_history(request, tenant_code):
    """
    Get lease history for a specific tenant by tenant_code.
    """
    try:
        tenant = Tenant.objects.get(tenant_code=tenant_code)
        leases = tenant.leases.all().order_by('-start_date')
        
        lease_history = []
        for lease in leases:
            lease_data = {
                'id': lease.id,
                'property_name': lease.property.name,
                'property_address': lease.property.address,
                'start_date': lease.start_date,
                'end_date': lease.end_date,
                'monthly_rent': lease.monthly_rent,
                'status': lease.status,
                'deposit_amount': lease.deposit_amount,
                'lease_type': lease.lease_type,
                'rental_frequency': lease.rental_frequency,
                'rent_due_day': lease.rent_due_day,
                'created_at': lease.created_at,
                'updated_at': lease.updated_at
            }
            lease_history.append(lease_data)
        
        return Response({
            'count': len(lease_history),
            'results': lease_history
        })
    
    except Tenant.DoesNotExist:
        return Response(
            {'error': 'Tenant not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tenant_lease_history_by_id(request, tenant_id):
    """
    Get lease history for a specific tenant by ID.
    """
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        leases = tenant.leases.all().order_by('-start_date')
        
        lease_history = []
        for lease in leases:
            lease_data = {
                'id': lease.id,
                'property_name': lease.property.name,
                'property_address': lease.property.address,
                'start_date': lease.start_date,
                'end_date': lease.end_date,
                'monthly_rent': lease.monthly_rent,
                'status': lease.status,
                'deposit_amount': lease.deposit_amount,
                'lease_type': lease.lease_type,
                'rental_frequency': lease.rental_frequency,
                'rent_due_day': lease.rent_due_day,
                'created_at': lease.created_at,
                'updated_at': lease.updated_at
            }
            lease_history.append(lease_data)
        
        return Response({
            'count': len(lease_history),
            'results': lease_history
        })
    
    except Tenant.DoesNotExist:
        return Response(
            {'error': 'Tenant not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tenant_choices(request):
    """Get tenant choices for dropdowns."""
    tenants = Tenant.objects.all()
    choices = [
        {
            'value': tenant.id,
            'label': f"{tenant.user.get_full_name()} ({tenant.tenant_code})"
        }
        for tenant in tenants
    ]
    return Response(choices)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tenant_communications_by_id(request, tenant_id):
    """
    Get communications for a specific tenant by ID.
    """
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        communications = tenant.communications.all().order_by('-created_at')
        
        comm_data = []
        for comm in communications:
            comm_data.append({
                'id': comm.id,
                'type': comm.type,
                'date': comm.date,
                'subject': comm.subject,
                'content': comm.content,
                'created_at': comm.created_at
            })
        
        return Response({
            'count': len(comm_data),
            'results': comm_data
        })
    
    except Tenant.DoesNotExist:
        return Response(
            {'error': 'Tenant not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tenant_documents_by_id(request, tenant_id):
    """
    Get documents for a specific tenant by ID.
    """
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        documents = tenant.documents.all().order_by('-uploaded_at')
        
        doc_data = []
        for doc in documents:
            doc_data.append({
                'id': doc.id,
                'name': doc.name,
                'type': doc.type,
                'uploaded_at': doc.uploaded_at,
                'expires_at': doc.expires_at
            })
        
        return Response({
            'count': len(doc_data),
            'results': doc_data
        })
    
    except Tenant.DoesNotExist:
        return Response(
            {'error': 'Tenant not found'},
            status=status.HTTP_404_NOT_FOUND
        )




