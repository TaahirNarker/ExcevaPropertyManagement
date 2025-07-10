"""
Views for the Properties app
Handles CRUD operations, search, filtering, and statistics for properties
"""
from django.db.models import Q, Count, Sum, Avg
from django.db.models.functions import Coalesce
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Property, PropertyImage, PropertyDocument
from .serializers import (
    PropertyListSerializer, PropertyDetailSerializer, 
    PropertyCreateUpdateSerializer, PropertySearchSerializer,
    PropertyStatsSerializer, PropertyImageSerializer, 
    PropertyDocumentSerializer
)


class PropertyPagination(PageNumberPagination):
    """Custom pagination for properties"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PropertyListView(generics.ListAPIView):
    """
    List all properties with search, filtering, and pagination
    Supports search by name, address, property code
    Supports filtering by type, status, location, etc.
    """
    serializer_class = PropertyListSerializer
    pagination_class = PropertyPagination
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Search fields
    search_fields = ['name', 'property_code', 'street_address', 'city', 'suburb']
    
    # Ordering fields
    ordering_fields = [
        'created_at', 'updated_at', 'property_code', 'name', 
        'property_type', 'city', 'monthly_rental_amount', 'status'
    ]
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Get properties for the current user with optional filtering
        """
        user = self.request.user
        
        # Base queryset - user's properties or all if admin
        if user.is_staff:
            queryset = Property.objects.all()
        else:
            queryset = Property.objects.filter(
                Q(owner=user) | Q(property_manager=user)
            )
        
        # Select related to optimize queries
        queryset = queryset.select_related('owner', 'property_manager')
        
        # Apply custom filtering
        return self.apply_custom_filters(queryset)
    
    def apply_custom_filters(self, queryset):
        """Apply custom filters based on query parameters"""
        
        # Property type filter
        property_type = self.request.query_params.get('property_type')
        if property_type:
            queryset = queryset.filter(property_type=property_type)
        
        # Status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # City filter
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        # Province filter
        province = self.request.query_params.get('province')
        if province:
            queryset = queryset.filter(province=province)
        
        # Active filter
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Bedrooms filter
        min_bedrooms = self.request.query_params.get('min_bedrooms')
        if min_bedrooms:
            queryset = queryset.filter(bedrooms__gte=int(min_bedrooms))
        
        max_bedrooms = self.request.query_params.get('max_bedrooms')
        if max_bedrooms:
            queryset = queryset.filter(bedrooms__lte=int(max_bedrooms))
        
        # Bathrooms filter
        min_bathrooms = self.request.query_params.get('min_bathrooms')
        if min_bathrooms:
            queryset = queryset.filter(bathrooms__gte=int(min_bathrooms))
        
        max_bathrooms = self.request.query_params.get('max_bathrooms')
        if max_bathrooms:
            queryset = queryset.filter(bathrooms__lte=int(max_bathrooms))
        
        # Rental amount filter
        min_rent = self.request.query_params.get('min_rent')
        if min_rent:
            queryset = queryset.filter(monthly_rental_amount__gte=float(min_rent))
        
        max_rent = self.request.query_params.get('max_rent')
        if max_rent:
            queryset = queryset.filter(monthly_rental_amount__lte=float(max_rent))
        
        # Size filter
        min_size = self.request.query_params.get('min_size')
        if min_size:
            queryset = queryset.filter(square_meters__gte=float(min_size))
        
        max_size = self.request.query_params.get('max_size')
        if max_size:
            queryset = queryset.filter(square_meters__lte=float(max_size))
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list to add additional metadata"""
        response = super().list(request, *args, **kwargs)
        
        # Add filter options to response
        response.data['filters'] = {
            'property_types': [
                {'value': choice[0], 'label': choice[1]} 
                for choice in Property.PROPERTY_TYPE_CHOICES
            ],
            'statuses': [
                {'value': choice[0], 'label': choice[1]} 
                for choice in Property.STATUS_CHOICES
            ],
            'provinces': [
                {'value': choice[0], 'label': choice[1]} 
                for choice in Property.PROVINCE_CHOICES
            ],
        }
        
        return response


class PropertyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a property
    """
    serializer_class = PropertyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'property_code'
    
    def get_queryset(self):
        """Get properties for the current user"""
        user = self.request.user
        
        if user.is_staff:
            return Property.objects.all()
        else:
            return Property.objects.filter(
                Q(owner=user) | Q(property_manager=user)
            )
    
    def get_serializer_class(self):
        """Use different serializer for update operations"""
        if self.request.method in ['PUT', 'PATCH']:
            return PropertyCreateUpdateSerializer
        return PropertyDetailSerializer


class PropertyCreateView(generics.CreateAPIView):
    """
    Create a new property
    """
    serializer_class = PropertyCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Set the owner to the current user"""
        serializer.save(owner=self.request.user)


class PropertyStatsView(APIView):
    """
    Get property statistics for the current user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive property statistics"""
        user = request.user
        
        # Base queryset
        if user.is_staff:
            queryset = Property.objects.all()
        else:
            queryset = Property.objects.filter(
                Q(owner=user) | Q(property_manager=user)
            )
        
        # Basic counts
        total_properties = queryset.count()
        active_properties = queryset.filter(is_active=True).count()
        vacant_properties = queryset.filter(status='vacant').count()
        occupied_properties = queryset.filter(status='occupied').count()
        
        # Financial stats
        rental_stats = queryset.aggregate(
            total_rental_income=Coalesce(Sum('monthly_rental_amount'), 0),
            average_rental_amount=Coalesce(Avg('monthly_rental_amount'), 0)
        )
        
        # Property types breakdown
        property_types = queryset.values('property_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Provinces breakdown
        provinces = queryset.values('province').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Occupancy rate
        occupancy_rate = (occupied_properties / total_properties * 100) if total_properties > 0 else 0
        
        stats = {
            'total_properties': total_properties,
            'active_properties': active_properties,
            'vacant_properties': vacant_properties,
            'occupied_properties': occupied_properties,
            'total_rental_income': rental_stats['total_rental_income'],
            'average_rental_amount': rental_stats['average_rental_amount'],
            'property_types': [
                {
                    'type': item['property_type'],
                    'type_display': dict(Property.PROPERTY_TYPE_CHOICES)[item['property_type']],
                    'count': item['count']
                }
                for item in property_types
            ],
            'provinces': [
                {
                    'province': item['province'],
                    'province_display': dict(Property.PROVINCE_CHOICES)[item['province']],
                    'count': item['count']
                }
                for item in provinces
            ],
            'occupancy_rate': round(occupancy_rate, 2)
        }
        
        serializer = PropertyStatsSerializer(stats)
        return Response(serializer.data)


class PropertySearchView(APIView):
    """
    Advanced property search with multiple criteria
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Search properties with advanced criteria"""
        serializer = PropertySearchSerializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            
            # Base queryset
            if user.is_staff:
                queryset = Property.objects.all()
            else:
                queryset = Property.objects.filter(
                    Q(owner=user) | Q(property_manager=user)
                )
            
            # Apply search filters
            validated_data = serializer.validated_data
            
            # Text search
            search_term = validated_data.get('search')
            if search_term:
                queryset = queryset.filter(
                    Q(name__icontains=search_term) |
                    Q(property_code__icontains=search_term) |
                    Q(street_address__icontains=search_term) |
                    Q(city__icontains=search_term) |
                    Q(suburb__icontains=search_term)
                )
            
            # Apply all other filters
            filter_fields = [
                'property_type', 'status', 'city', 'province', 'is_active'
            ]
            
            for field in filter_fields:
                value = validated_data.get(field)
                if value is not None:
                    if field == 'city':
                        queryset = queryset.filter(city__icontains=value)
                    else:
                        queryset = queryset.filter(**{field: value})
            
            # Range filters
            range_filters = [
                ('min_bedrooms', 'bedrooms__gte'),
                ('max_bedrooms', 'bedrooms__lte'),
                ('min_bathrooms', 'bathrooms__gte'),
                ('max_bathrooms', 'bathrooms__lte'),
                ('min_rent', 'monthly_rental_amount__gte'),
                ('max_rent', 'monthly_rental_amount__lte'),
                ('min_size', 'square_meters__gte'),
                ('max_size', 'square_meters__lte'),
            ]
            
            for param, filter_key in range_filters:
                value = validated_data.get(param)
                if value is not None:
                    queryset = queryset.filter(**{filter_key: value})
            
            # Ordering
            ordering = validated_data.get('ordering', '-created_at')
            queryset = queryset.order_by(ordering)
            
            # Pagination
            paginator = PropertyPagination()
            page = paginator.paginate_queryset(queryset, request)
            
            if page is not None:
                serializer = PropertyListSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)
            
            serializer = PropertyListSerializer(queryset, many=True)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Property Images Views
class PropertyImageListView(generics.ListCreateAPIView):
    """List and create property images"""
    serializer_class = PropertyImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        property_code = self.kwargs.get('property_code')
        property_obj = get_object_or_404(Property, property_code=property_code)
        
        # Check permissions
        user = self.request.user
        if not user.is_staff:
            if property_obj.owner != user and property_obj.property_manager != user:
                return PropertyImage.objects.none()
        
        return PropertyImage.objects.filter(property=property_obj)
    
    def perform_create(self, serializer):
        property_code = self.kwargs.get('property_code')
        property_obj = get_object_or_404(Property, property_code=property_code)
        serializer.save(property=property_obj)


class PropertyImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a property image"""
    serializer_class = PropertyImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        property_code = self.kwargs.get('property_code')
        property_obj = get_object_or_404(Property, property_code=property_code)
        
        # Check permissions
        user = self.request.user
        if not user.is_staff:
            if property_obj.owner != user and property_obj.property_manager != user:
                return PropertyImage.objects.none()
        
        return PropertyImage.objects.filter(property=property_obj)


# Property Documents Views
class PropertyDocumentListView(generics.ListCreateAPIView):
    """List and create property documents"""
    serializer_class = PropertyDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        property_code = self.kwargs.get('property_code')
        property_obj = get_object_or_404(Property, property_code=property_code)
        
        # Check permissions
        user = self.request.user
        if not user.is_staff:
            if property_obj.owner != user and property_obj.property_manager != user:
                return PropertyDocument.objects.none()
        
        return PropertyDocument.objects.filter(property=property_obj)
    
    def perform_create(self, serializer):
        property_code = self.kwargs.get('property_code')
        property_obj = get_object_or_404(Property, property_code=property_code)
        serializer.save(property=property_obj, uploaded_by=self.request.user)


class PropertyDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a property document"""
    serializer_class = PropertyDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        property_code = self.kwargs.get('property_code')
        property_obj = get_object_or_404(Property, property_code=property_code)
        
        # Check permissions
        user = self.request.user
        if not user.is_staff:
            if property_obj.owner != user and property_obj.property_manager != user:
                return PropertyDocument.objects.none()
        
        return PropertyDocument.objects.filter(property=property_obj)


# Utility Views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def property_choices(request):
    """Get choices for property form fields"""
    choices = {
        'property_types': [
            {'value': choice[0], 'label': choice[1]} 
            for choice in Property.PROPERTY_TYPE_CHOICES
        ],
        'statuses': [
            {'value': choice[0], 'label': choice[1]} 
            for choice in Property.STATUS_CHOICES
        ],
        'provinces': [
            {'value': choice[0], 'label': choice[1]} 
            for choice in Property.PROVINCE_CHOICES
        ],
    }
    return Response(choices)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def property_summary(request, property_code):
    """Get a quick summary of a property"""
    user = request.user
    
    try:
        if user.is_staff:
            property_obj = Property.objects.get(property_code=property_code)
        else:
            property_obj = Property.objects.get(
                property_code=property_code,
                owner=user
            )
    except Property.DoesNotExist:
        return Response(
            {'error': 'Property not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    summary = {
        'property_code': property_obj.property_code,
        'name': property_obj.name,
        'display_name': property_obj.display_name,
        'status': property_obj.status,
        'status_display': property_obj.get_status_display(),
        'occupancy_info': property_obj.occupancy_info,
        'monthly_rental_amount': property_obj.monthly_rental_amount,
        'full_address': property_obj.full_address,
        'primary_image': property_obj.primary_image,
    }
    
    return Response(summary)
