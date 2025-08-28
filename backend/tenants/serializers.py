from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from .models import Tenant, TenantDocument, TenantCommunication
from users.models import CustomUser
from properties.models import Property

class TenantListSerializer(serializers.ModelSerializer):
    """Serializer for listing tenants"""
    user = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = ['id', 'tenant_code', 'user', 'full_name', 'email', 'phone', 'status', 'created_at']
    
    def get_user(self, obj):
        try:
            return {
                'id': obj.user.id,
                'first_name': obj.user.first_name,
                'last_name': obj.user.last_name,
                'email': obj.user.email
            }
        except Exception as e:
            print(f"Error getting user data for tenant {obj.id}: {e}")
            return {
                'id': obj.user.id if obj.user else None,
                'first_name': obj.user.first_name if obj.user else None,
                'last_name': obj.user.last_name if obj.user else None,
                'email': obj.user.email if obj.user else None
            }
    
    def get_full_name(self, obj):
        try:
            return obj.user.get_full_name()
        except Exception as e:
            print(f"Error getting full name for tenant {obj.id}: {e}")
            return 'Unknown'

class TenantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tenants"""
    # User fields for creation (these will be used to create the user)
    first_name = serializers.CharField(max_length=150, write_only=True)
    last_name = serializers.CharField(max_length=150, write_only=True)
    
    # Optional user fields
    user = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    
    # Make tenant_code optional since it's auto-generated
    tenant_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    class Meta:
        model = Tenant
        fields = '__all__'
    
    def validate_tenant_code(self, value):
        """Validate tenant code uniqueness"""
        if value and Tenant.objects.filter(tenant_code=value).exists():
            raise serializers.ValidationError("Tenant code must be unique.")
        return value
    
    def validate_id_number(self, value):
        """Validate ID number uniqueness"""
        if Tenant.objects.filter(id_number=value).exists():
            raise serializers.ValidationError("ID number must be unique.")
        return value
    
    def validate_email(self, value):
        """Validate email uniqueness across users"""
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate(self, attrs):
        """Custom validation for the entire serializer"""
        # If updating an existing tenant (user is provided), don't require first_name/last_name
        if self.instance is not None:
            return attrs
            
        # For new tenant creation, require first_name and last_name if user is not provided
        if not attrs.get('user'):
            if not attrs.get('first_name'):
                raise serializers.ValidationError({"first_name": "This field is required when creating a new tenant."})
            if not attrs.get('last_name'):
                raise serializers.ValidationError({"last_name": "This field is required when creating a new tenant."})
            if not attrs.get('email'):
                raise serializers.ValidationError({"email": "This field is required when creating a new tenant."})
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Create a new tenant with associated user"""
        # Extract user fields
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        
        # Check if user is provided or needs to be created
        user = validated_data.get('user')
        if not user:
            # Create a new user
            user_data = {
                'email': validated_data['email'],
                'username': validated_data['email'],  # Use email as username
                'first_name': first_name,
                'last_name': last_name,
                'role': 'tenant',
                'phone_number': validated_data.get('phone', ''),
            }
            
            # Create user without password (they'll need to set it up later)
            user = CustomUser.objects.create_user(
                password=None,  # No password initially
                **user_data
            )
            # Set unusable password so they must reset it
            user.set_unusable_password()
            user.save()
            
            # Update validated_data with the created user
            validated_data['user'] = user
        
        # Create the tenant
        tenant = super().create(validated_data)
        return tenant
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update an existing tenant"""
        # Remove user creation fields if they exist (not used in updates)
        validated_data.pop('first_name', None)
        validated_data.pop('last_name', None)
        
        # Update the tenant
        return super().update(instance, validated_data)

class TenantDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed tenant view"""
    user = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    communications_count = serializers.SerializerMethodField()
    leases_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = '__all__'
    
    def get_user(self, obj):
        try:
            return {
                'id': obj.user.id,
                'first_name': obj.user.first_name,
                'last_name': obj.user.last_name,
                'email': obj.user.email,
                'phone_number': obj.user.phone_number,
                'company': obj.user.company,
                'role': obj.user.role
            }
        except Exception as e:
            print(f"Error getting user data for tenant detail {obj.id}: {e}")
            return {
                'id': obj.user.id if obj.user else None,
                'first_name': obj.user.first_name if obj.user else None,
                'last_name': obj.user.last_name if obj.user else None,
                'email': obj.user.email if obj.user else None,
                'phone_number': obj.user.phone_number if obj.user else None,
                'company': obj.user.company if obj.user else None,
                'role': obj.user.role if obj.user else None
            }
    
    def get_full_name(self, obj):
        try:
            return obj.user.get_full_name()
        except Exception as e:
            print(f"Error getting full name for tenant detail {obj.id}: {e}")
            return 'Unknown'
    
    def get_documents_count(self, obj):
        try:
            return obj.documents.count()
        except Exception as e:
            print(f"Error getting documents count for tenant {obj.id}: {e}")
            return 0
    
    def get_communications_count(self, obj):
        try:
            return obj.communications.count()
        except Exception as e:
            print(f"Error getting communications count for tenant {obj.id}: {e}")
            return 0
    
    def get_leases_count(self, obj):
        try:
            return obj.leases.count()
        except Exception as e:
            print(f"Error getting leases count for tenant {obj.id}: {e}")
            return 0

class TenantDocumentSerializer(serializers.ModelSerializer):
    """Serializer for tenant documents"""
    
    class Meta:
        model = TenantDocument
        fields = '__all__'

class TenantCommunicationSerializer(serializers.ModelSerializer):
    """Serializer for tenant communications"""
    created_by = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantCommunication
        fields = '__all__'
    
    def get_created_by(self, obj):
        try:
            if obj.created_by:
                return {
                    'id': obj.created_by.id,
                    'name': obj.created_by.get_full_name(),
                    'email': obj.created_by.email
                }
            return None
        except Exception as e:
            print(f"Error getting created_by for communication {obj.id}: {e}")
            return None