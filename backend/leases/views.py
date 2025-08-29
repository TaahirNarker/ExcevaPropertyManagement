from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Lease, LeaseAttachment, LeaseNote
from .serializers import (
    LeaseSerializer, LeaseCreateSerializer, LeaseUpdateSerializer,
    LeaseAttachmentSerializer, LeaseAttachmentCreateSerializer, LeaseAttachmentUpdateSerializer,
    LeaseNoteSerializer, LeaseNoteCreateSerializer
)


class LeaseListView(generics.ListCreateAPIView):
    """
    List and create leases.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tenant__user__first_name', 'tenant__user__last_name', 'property__name', 'property__property_code']
    filterset_fields = ['status', 'property', 'tenant']
    ordering_fields = ['start_date', 'end_date', 'monthly_rent']
    ordering = ['-start_date']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LeaseCreateSerializer
        return LeaseSerializer
    
    def get_queryset(self):
        return Lease.objects.select_related('tenant__user', 'property', 'landlord').all()
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'Failed to create lease: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in lease list view: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch leases: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LeaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a lease instance.
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        return Lease.objects.select_related('tenant__user', 'property', 'landlord').all()
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return LeaseUpdateSerializer
        return LeaseSerializer
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'Failed to update lease: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'Failed to delete lease: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class LeaseAttachmentListView(generics.ListCreateAPIView):
    """
    List and create lease attachments.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return LeaseAttachment.objects.filter(lease__id=self.kwargs['id'])
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LeaseAttachmentCreateSerializer
        return LeaseAttachmentSerializer
    
    def create(self, request, *args, **kwargs):
        try:
            print(f"Creating attachment - Request method: {request.method}")
            print(f"Request data: {request.data}")
            print(f"Request files: {request.FILES}")
            print(f"Request content type: {request.content_type}")
            
            # Check if lease exists
            lease_id = self.kwargs.get('id')
            try:
                lease = Lease.objects.get(id=lease_id)
                print(f"Found lease: {lease}")
            except Lease.DoesNotExist:
                print(f"Lease with id {lease_id} does not exist")
                return Response(
                    {'error': f'Lease with id {lease_id} does not exist'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating attachment: {e}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to create attachment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        lease = Lease.objects.get(id=self.kwargs['id'])
        print(f"Creating attachment for lease {lease.id}")
        print(f"Request data: {self.request.data}")
        print(f"Request files: {self.request.FILES}")
        attachment = serializer.save(lease=lease, uploaded_by=self.request.user)
        print(f"Created attachment: {attachment.id}")
        return attachment


class LeaseAttachmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a lease attachment.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LeaseAttachment.objects.filter(lease__id=self.kwargs['id'])
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return LeaseAttachmentUpdateSerializer
        return LeaseAttachmentSerializer
    
    def get_parsers(self):
        """Use JSON parser for updates, MultiPart for other operations"""
        if self.request.method in ['PUT', 'PATCH']:
            return [JSONParser()]
        return [MultiPartParser(), FormParser()]


class LeaseNoteListView(generics.ListCreateAPIView):
    """
    List and create lease notes.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LeaseNote.objects.filter(lease__id=self.kwargs['id']).select_related('created_by')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LeaseNoteCreateSerializer
        return LeaseNoteSerializer
    
    def perform_create(self, serializer):
        lease = Lease.objects.get(id=self.kwargs['id'])
        serializer.save(lease=lease, created_by=self.request.user)


class LeaseNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a lease note.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LeaseNote.objects.filter(lease__id=self.kwargs['id'])
    
    def get_serializer_class(self):
        return LeaseNoteSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def lease_choices(request):
    """
    Get choices for lease dropdowns.
    """
    from tenants.models import Tenant
    from properties.models import Property
    
    tenants = Tenant.objects.all()
    properties = Property.objects.all()
    
    return Response({
        'tenants': [
            {
                'id': tenant.id,
                'name': tenant.user.get_full_name(),
                'tenant_code': tenant.tenant_code
            }
            for tenant in tenants
        ],
        'properties': [
            {
                'id': property.id,
                'name': property.name,
                'property_code': property.property_code
            }
            for property in properties
        ]
    })
