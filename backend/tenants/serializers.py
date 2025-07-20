from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Tenant, TenantDocument, TenantCommunication

User = get_user_model()

class TenantListSerializer(serializers.ModelSerializer):
    """Serializer for listing tenants with basic information."""
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    property_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'tenant_code', 'full_name', 'email', 'phone',
            'status', 'property_name', 'created_at'
        ]
        read_only_fields = ['tenant_code', 'created_at']
    
    def get_property_name(self, obj):
        """Get the name of the property if tenant is assigned to one."""
        active_lease = obj.leases.filter(status='active').first()
        if active_lease:
            return active_lease.property.name
        return None


class TenantDocumentSerializer(serializers.ModelSerializer):
    """Serializer for tenant documents."""
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantDocument
        fields = [
            'id', 'name', 'document_type', 'file', 'file_url',
            'uploaded_at', 'expires_at', 'notes'
        ]
        read_only_fields = ['uploaded_at']
    
    def get_file_url(self, obj):
        """Get the URL for the document file."""
        if obj.file:
            return self.context['request'].build_absolute_uri(obj.file.url)
        return None


class TenantCommunicationSerializer(serializers.ModelSerializer):
    """Serializer for tenant communications."""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = TenantCommunication
        fields = [
            'id', 'type', 'subject', 'content', 'date',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_by']
    
    def create(self, validated_data):
        """Set the created_by field to the current user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TenantDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed tenant information."""
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    documents = TenantDocumentSerializer(many=True, read_only=True)
    communications = TenantCommunicationSerializer(many=True, read_only=True)
    active_lease = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'tenant_code', 'full_name', 'id_number', 'date_of_birth',
            'phone', 'alternative_phone', 'email', 'alternative_email',
            'address', 'city', 'province', 'postal_code',
            'employment_status', 'employer_name', 'employer_contact', 'monthly_income',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'status', 'notes', 'created_at', 'updated_at',
            'documents', 'communications', 'active_lease'
        ]
        read_only_fields = ['tenant_code', 'created_at', 'updated_at']
    
    def get_active_lease(self, obj):
        """Get information about the tenant's active lease."""
        active_lease = obj.leases.filter(status='active').first()
        if active_lease:
            return {
                'id': active_lease.id,
                'property': {
                    'id': active_lease.property.id,
                    'name': active_lease.property.name,
                    'address': active_lease.property.street_address
                },
                'start_date': active_lease.start_date,
                'end_date': active_lease.end_date,
                'monthly_rent': active_lease.monthly_rent
            }
        return None


class TenantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tenants."""
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, write_only=True)
    last_name = serializers.CharField(required=True, write_only=True)
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Tenant
        fields = [
            'email', 'first_name', 'last_name', 'password', 'full_name',
            'id_number', 'date_of_birth', 'phone', 'alternative_phone',
            'alternative_email', 'address', 'city', 'province', 'postal_code',
            'employment_status', 'employer_name', 'employer_contact', 'monthly_income',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'status', 'notes'
        ]
    
    def create(self, validated_data):
        """Create a new tenant and associated user account."""
        # Extract user-related fields
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        password = validated_data.pop('password', None)
        
        # Create or get user
        try:
            user = User.objects.get(email=email)
            if not user.is_tenant:
                user.is_tenant = True
                user.save()
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password or User.objects.make_random_password(),
                is_tenant=True
            )
        
        # Create tenant profile
        tenant = Tenant.objects.create(user=user, **validated_data)
        return tenant
    
    def update(self, instance, validated_data):
        """Update tenant and user information."""
        # Update user information if provided
        user = instance.user
        if 'email' in validated_data:
            user.email = validated_data.pop('email')
            user.username = validated_data.pop('email')
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        if 'password' in validated_data:
            user.set_password(validated_data.pop('password'))
        user.save()
        
        # Update tenant profile
        return super().update(instance, validated_data) 