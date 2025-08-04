from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.shortcuts import get_object_or_404

from .models import Landlord
from .serializers import (
    LandlordSerializer, 
    LandlordListSerializer, 
    LandlordCreateSerializer, 
    LandlordUpdateSerializer
)

class LandlordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing landlords.
    Provides CRUD operations for landlord management.
    """
    queryset = Landlord.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status', 'province']
    search_fields = ['name', 'email', 'company_name', 'phone']
    ordering_fields = ['name', 'email', 'created_at', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return LandlordCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return LandlordUpdateSerializer
        elif self.action == 'list':
            return LandlordListSerializer
        return LandlordSerializer
    
    def get_queryset(self):
        """Return filtered queryset based on request parameters."""
        queryset = Landlord.objects.all()
        
        # Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(company_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        # Filter by type
        landlord_type = self.request.query_params.get('type', None)
        if landlord_type:
            queryset = queryset.filter(type=landlord_type)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active == 'true':
            queryset = queryset.filter(status='Active')
        elif is_active == 'false':
            queryset = queryset.exclude(status='Active')
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new landlord."""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            landlord = serializer.save()
            response_serializer = LandlordSerializer(landlord)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update a landlord."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            landlord = serializer.save()
            response_serializer = LandlordSerializer(landlord)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a landlord."""
        landlord = self.get_object()
        landlord.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def properties(self, request, pk=None):
        """Get all properties owned by this landlord."""
        landlord = self.get_object()
        # This will be implemented when we connect properties to landlords
        return Response({
            'landlord_id': landlord.id,
            'landlord_name': landlord.get_display_name(),
            'properties': []  # TODO: Implement when property-landlord relationship is established
        })
    
    @action(detail=True, methods=['get'])
    def financial_summary(self, request, pk=None):
        """Get financial summary for this landlord."""
        landlord = self.get_object()
        return Response({
            'landlord_id': landlord.id,
            'landlord_name': landlord.get_display_name(),
            'properties_count': landlord.get_properties_count(),
            'total_rental_income': float(landlord.get_total_rental_income()),
            'status': landlord.status,
            'is_active': landlord.is_active
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get landlord statistics."""
        total_landlords = Landlord.objects.count()
        active_landlords = Landlord.objects.filter(status='Active').count()
        individual_landlords = Landlord.objects.filter(type='Individual').count()
        company_landlords = Landlord.objects.filter(type='Company').count()
        trust_landlords = Landlord.objects.filter(type='Trust').count()
        
        return Response({
            'total_landlords': total_landlords,
            'active_landlords': active_landlords,
            'inactive_landlords': total_landlords - active_landlords,
            'by_type': {
                'individual': individual_landlords,
                'company': company_landlords,
                'trust': trust_landlords
            }
        })
    
    @action(detail=False, methods=['get'])
    def filter_options(self, request):
        """Get available filter options for landlords."""
        return Response({
            'types': [
                {'value': 'Individual', 'label': 'Individual'},
                {'value': 'Company', 'label': 'Company'},
                {'value': 'Trust', 'label': 'Trust'},
            ],
            'statuses': [
                {'value': 'Active', 'label': 'Active'},
                {'value': 'Inactive', 'label': 'Inactive'},
                {'value': 'Suspended', 'label': 'Suspended'},
            ],
            'provinces': [
                {'value': 'western_cape', 'label': 'Western Cape'},
                {'value': 'gauteng', 'label': 'Gauteng'},
                {'value': 'kwazulu_natal', 'label': 'KwaZulu-Natal'},
                {'value': 'eastern_cape', 'label': 'Eastern Cape'},
                {'value': 'free_state', 'label': 'Free State'},
                {'value': 'limpopo', 'label': 'Limpopo'},
                {'value': 'mpumalanga', 'label': 'Mpumalanga'},
                {'value': 'north_west', 'label': 'North West'},
                {'value': 'northern_cape', 'label': 'Northern Cape'},
            ]
        })
