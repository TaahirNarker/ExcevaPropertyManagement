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
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
import os


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
        
        # Select related to optimize queries and prefetch related data
        queryset = queryset.select_related('owner', 'property_manager', 'parent_property').prefetch_related(
            'property_images',
            'property_documents',
            'leases__tenant__user',
            'sub_properties'
        )
        
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
        
        # Exclude sub-properties filter (only when not searching)
        exclude_sub_properties = self.request.query_params.get('exclude_sub_properties')
        search_query = self.request.query_params.get('search', '').strip()
        
        # Only exclude sub-properties if explicitly requested AND no search is being performed
        if exclude_sub_properties and exclude_sub_properties.lower() == 'true' and not search_query:
            queryset = queryset.filter(parent_property__isnull=True)
        
        # Parent property filter (for getting sub-properties)
        parent_property = self.request.query_params.get('parent_property')
        if parent_property:
            queryset = queryset.filter(parent_property=parent_property)
        
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
            queryset = Property.objects.all()
        else:
            queryset = Property.objects.filter(
                Q(owner=user) | Q(property_manager=user)
            )
        
        # Optimize queries with select_related and prefetch_related
        return queryset.select_related('owner', 'property_manager', 'parent_property').prefetch_related(
            'property_images',
            'property_documents',
            'leases__tenant__user',
            'sub_properties'
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


class BrandingLogoUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]  # Or allow any if public

    def post(self, request, format=None):
        file_obj = request.FILES.get('logo')
        if not file_obj or not file_obj.name.lower().endswith('.png'):
            return Response({'error': 'Please upload a PNG file.'}, status=400)
        logo_path = os.path.join(settings.MEDIA_ROOT, 'branding', 'logo.png')
        os.makedirs(os.path.dirname(logo_path), exist_ok=True)
        with open(logo_path, 'wb+') as f:
            for chunk in file_obj.chunks():
                f.write(chunk)
        logo_url = request.build_absolute_uri(settings.MEDIA_URL + 'branding/logo.png')
        return Response({'logo_url': logo_url})


class PropertyTenantAssignmentView(APIView):
    """
    View for assigning tenants to properties
    Creates a lease agreement and updates property status
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, property_code):
        """Assign a tenant to a property by creating a lease"""
        try:
            # Get the property
            property_obj = get_object_or_404(Property, property_code=property_code)
            
            # Check permissions
            user = request.user
            if not user.is_staff:
                if property_obj.owner != user and property_obj.property_manager != user:
                    return Response(
                        {'error': 'You do not have permission to assign tenants to this property'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Check if property is available for assignment
            if property_obj.status != 'vacant':
                return Response(
                    {'error': f'Property is not available for assignment. Current status: {property_obj.get_status_display()}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get request data
            tenant_id = request.data.get('tenant_id')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            monthly_rent = request.data.get('monthly_rent')
            deposit_amount = request.data.get('deposit_amount', 0)
            
            # Validate required fields
            if not all([tenant_id, start_date, end_date, monthly_rent]):
                return Response(
                    {'error': 'Missing required fields: tenant_id, start_date, end_date, monthly_rent'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import here to avoid circular imports
            from tenants.models import Tenant
            from leases.models import Lease
            from django.utils.dateparse import parse_date
            
            # Get the tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {'error': 'Tenant not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Parse dates
            try:
                start_date = parse_date(start_date)
                end_date = parse_date(end_date)
                if not start_date or not end_date:
                    raise ValueError("Invalid date format")
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate dates
            if start_date >= end_date:
                return Response(
                    {'error': 'Start date must be before end date'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if tenant already has an active lease
            existing_lease = Lease.objects.filter(
                tenant=tenant,
                status__in=['active', 'pending']
            ).first()
            
            if existing_lease:
                return Response(
                    {'error': f'Tenant already has an active lease at {existing_lease.property.name}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the lease
            lease = Lease.objects.create(
                property=property_obj,
                tenant=tenant,
                start_date=start_date,
                end_date=end_date,
                monthly_rent=monthly_rent,
                deposit_amount=deposit_amount,
                status='pending',
                lease_type='Fixed'
            )
            
            # Update property status to occupied
            property_obj.status = 'occupied'
            property_obj.save()
            
            # Return success response
            return Response({
                'message': f'Tenant {tenant.user.get_full_name()} successfully assigned to {property_obj.name}',
                'lease_id': lease.id,
                'property_status': property_obj.status,
                'lease_details': {
                    'id': lease.id,
                    'start_date': lease.start_date,
                    'end_date': lease.end_date,
                    'monthly_rent': lease.monthly_rent,
                    'status': lease.status
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to assign tenant: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request, property_code):
        """Get available tenants for assignment"""
        try:
            # Get the property
            property_obj = get_object_or_404(Property, property_code=property_code)
            
            # Check permissions
            user = request.user
            if not user.is_staff:
                if property_obj.owner != user and property_obj.property_manager != user:
                    return Response(
                        {'error': 'You do not have permission to view this property'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Import here to avoid circular imports
            from tenants.models import Tenant
            from leases.models import Lease
            
            # Get all active tenants who don't have active leases
            active_tenants = Tenant.objects.filter(status='active')
            
            # Filter out tenants who already have active leases
            tenants_with_leases = Lease.objects.filter(
                status__in=['active', 'pending']
            ).values_list('tenant_id', flat=True)
            
            available_tenants = active_tenants.exclude(id__in=tenants_with_leases)
            
            # Serialize available tenants
            tenant_data = []
            for tenant in available_tenants:
                tenant_data.append({
                    'id': tenant.id,
                    'tenant_code': tenant.tenant_code,
                    'name': tenant.user.get_full_name(),
                    'email': tenant.email,
                    'phone': tenant.phone,
                    'employment_status': tenant.employment_status,
                    'monthly_income': str(tenant.monthly_income) if tenant.monthly_income else None
                })
            
            return Response({
                'property': {
                    'id': property_obj.id,
                    'property_code': property_obj.property_code,
                    'name': property_obj.name,
                    'monthly_rental_amount': property_obj.monthly_rental_amount
                },
                'available_tenants': tenant_data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get available tenants: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def vacant_properties_for_tenant_assignment(request):
    """Get vacant properties for tenant assignment during tenant creation"""
    try:
        user = request.user
        
        # Get vacant properties accessible to the user
        if user.is_staff:
            vacant_properties = Property.objects.filter(status='vacant', is_active=True)
        else:
            vacant_properties = Property.objects.filter(
                Q(owner=user) | Q(property_manager=user),
                status='vacant',
                is_active=True
            )
        
        # Apply search filter if provided
        search = request.query_params.get('search', '').strip()
        if search:
            vacant_properties = vacant_properties.filter(
                Q(name__icontains=search) |
                Q(property_code__icontains=search) |
                Q(street_address__icontains=search) |
                Q(city__icontains=search) |
                Q(suburb__icontains=search)
            )
        
        # Select related to optimize queries
        vacant_properties = vacant_properties.select_related('owner', 'property_manager')
        
        # Serialize properties
        properties_data = []
        for property_obj in vacant_properties:
            properties_data.append({
                'id': property_obj.id,
                'property_code': property_obj.property_code,
                'name': property_obj.name,
                'display_name': property_obj.display_name,
                'property_type': property_obj.property_type,
                'property_type_display': property_obj.get_property_type_display(),
                'full_address': property_obj.full_address,
                'monthly_rental_amount': property_obj.monthly_rental_amount,
                'bedrooms': property_obj.bedrooms,
                'bathrooms': property_obj.bathrooms,
                'square_meters': property_obj.square_meters,
                'city': property_obj.city,
                'province': property_obj.province,
                'primary_image': property_obj.primary_image,
            })
        
        return Response({
            'count': len(properties_data),
            'results': properties_data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get vacant properties: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
