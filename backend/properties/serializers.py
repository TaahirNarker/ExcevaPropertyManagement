"""
Serializers for the Properties app
Handles serialization of property data for the API
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Property, PropertyImage, PropertyDocument

User = get_user_model()


class PropertyImageSerializer(serializers.ModelSerializer):
    """Serializer for property images"""
    
    class Meta:
        model = PropertyImage
        fields = [
            'id', 'image_url', 'image_file', 'title', 'description', 
            'is_primary', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertyDocumentSerializer(serializers.ModelSerializer):
    """Serializer for property documents"""
    
    document_type_display = serializers.CharField(
        source='get_document_type_display', 
        read_only=True
    )
    
    class Meta:
        model = PropertyDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'title', 
            'description', 'file_url', 'file_upload', 'created_at', 
            'updated_at', 'uploaded_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by']


class PropertyOwnerSerializer(serializers.ModelSerializer):
    """Serializer for property owner/manager information"""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id', 'email', 'first_name', 'last_name', 'full_name']


class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer for property list view - lighter version for performance"""
    
    property_type_display = serializers.CharField(
        source='get_property_type_display', 
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', 
        read_only=True
    )
    province_display = serializers.CharField(
        source='get_province_display', 
        read_only=True
    )
    full_address = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    occupancy_info = serializers.JSONField(read_only=True)
    
    # Owner info
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'property_code', 'name', 'property_type', 'property_type_display',
            'street_address', 'suburb', 'city', 'province', 'province_display',
            'postal_code', 'country', 'bedrooms', 'bathrooms', 'square_meters',
            'parking_spaces', 'monthly_rental_amount', 'status', 'status_display',
            'is_active', 'full_address', 'display_name', 'occupancy_info',
            'owner_name', 'created_at', 'updated_at', 'primary_image'
        ]
        read_only_fields = [
            'id', 'property_code', 'property_type_display', 'status_display',
            'province_display', 'full_address', 'display_name', 'occupancy_info',
            'owner_name', 'created_at', 'updated_at'
        ]


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Serializer for property detail view - includes all relationships"""
    
    property_type_display = serializers.CharField(
        source='get_property_type_display', 
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', 
        read_only=True
    )
    province_display = serializers.CharField(
        source='get_province_display', 
        read_only=True
    )
    full_address = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    occupancy_info = serializers.JSONField(read_only=True)
    
    # Related objects
    owner = PropertyOwnerSerializer(read_only=True)
    property_manager = PropertyOwnerSerializer(read_only=True)
    property_images = PropertyImageSerializer(many=True, read_only=True)
    property_documents = PropertyDocumentSerializer(many=True, read_only=True)
    
    # Current tenant info (if applicable)
    current_tenant = serializers.SerializerMethodField()
    current_lease = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'property_code', 'name', 'property_type', 'property_type_display',
            'description', 'street_address', 'suburb', 'city', 'province', 
            'province_display', 'postal_code', 'country', 'bedrooms', 'bathrooms',
            'square_meters', 'parking_spaces', 'purchase_price', 'current_market_value',
            'monthly_rental_amount', 'status', 'status_display', 'is_active',
            'features', 'primary_image', 'images', 'documents', 'full_address',
            'display_name', 'occupancy_info', 'owner', 'property_manager',
            'property_images', 'property_documents', 'current_tenant', 'current_lease',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'property_code', 'property_type_display', 'status_display',
            'province_display', 'full_address', 'display_name', 'occupancy_info',
            'current_tenant', 'current_lease', 'created_at', 'updated_at'
        ]
    
    def get_current_tenant(self, obj):
        """Get current tenant information"""
        tenant = obj.current_tenant
        if tenant:
            return {
                'id': tenant.id,
                'name': tenant.get_full_name(),
                'email': tenant.email,
                'phone': getattr(tenant, 'phone_number', None)
            }
        return None
    
    def get_current_lease(self, obj):
        """Get current lease information"""
        lease = obj.current_lease
        if lease:
            return {
                'id': lease.id,
                'start_date': lease.start_date,
                'end_date': lease.end_date,
                'monthly_rent': lease.monthly_rent,
                'status': lease.status,
                'deposit_amount': getattr(lease, 'deposit_amount', None)
            }
        return None


class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating properties"""
    
    class Meta:
        model = Property
        fields = [
            'name', 'property_type', 'description', 'street_address', 'suburb',
            'city', 'province', 'postal_code', 'country', 'bedrooms', 'bathrooms',
            'square_meters', 'parking_spaces', 'purchase_price', 'current_market_value',
            'monthly_rental_amount', 'status', 'is_active', 'property_manager',
            'features', 'primary_image', 'images', 'documents'
        ]
    
    def validate_bedrooms(self, value):
        """Validate bedrooms count"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Bedrooms cannot be negative")
        return value
    
    def validate_bathrooms(self, value):
        """Validate bathrooms count"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Bathrooms cannot be negative")
        return value
    
    def validate_square_meters(self, value):
        """Validate square meters"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Square meters must be positive")
        return value
    
    def validate_monthly_rental_amount(self, value):
        """Validate rental amount"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Rental amount cannot be negative")
        return value
    
    def create(self, validated_data):
        """Create property with owner set to current user"""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class PropertySearchSerializer(serializers.Serializer):
    """Serializer for property search parameters"""
    
    search = serializers.CharField(required=False, allow_blank=True)
    property_type = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    province = serializers.CharField(required=False, allow_blank=True)
    min_bedrooms = serializers.IntegerField(required=False, min_value=0)
    max_bedrooms = serializers.IntegerField(required=False, min_value=0)
    min_bathrooms = serializers.IntegerField(required=False, min_value=0)
    max_bathrooms = serializers.IntegerField(required=False, min_value=0)
    min_rent = serializers.DecimalField(required=False, min_value=0, max_digits=10, decimal_places=2)
    max_rent = serializers.DecimalField(required=False, min_value=0, max_digits=10, decimal_places=2)
    min_size = serializers.DecimalField(required=False, min_value=0, max_digits=10, decimal_places=2)
    max_size = serializers.DecimalField(required=False, min_value=0, max_digits=10, decimal_places=2)
    is_active = serializers.BooleanField(required=False)
    
    # Ordering
    ordering = serializers.CharField(required=False, allow_blank=True)
    
    def validate_ordering(self, value):
        """Validate ordering field"""
        if value:
            allowed_fields = [
                'created_at', '-created_at', 'updated_at', '-updated_at',
                'property_code', '-property_code', 'name', '-name',
                'property_type', '-property_type', 'city', '-city',
                'monthly_rental_amount', '-monthly_rental_amount',
                'status', '-status'
            ]
            if value not in allowed_fields:
                raise serializers.ValidationError(f"Invalid ordering field. Allowed: {', '.join(allowed_fields)}")
        return value


class PropertyStatsSerializer(serializers.Serializer):
    """Serializer for property statistics"""
    
    total_properties = serializers.IntegerField()
    active_properties = serializers.IntegerField()
    vacant_properties = serializers.IntegerField()
    occupied_properties = serializers.IntegerField()
    total_rental_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_rental_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    property_types = serializers.JSONField()
    provinces = serializers.JSONField()
    occupancy_rate = serializers.FloatField() 