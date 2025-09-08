from rest_framework import serializers
from .models import Lease, LeaseAttachment, LeaseNote


class LeaseSerializer(serializers.ModelSerializer):
    """Serializer for leases - read-only with nested data"""
    tenant = serializers.SerializerMethodField()
    property = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
    # Financial computed fields for dashboard consumption
    balance_cents = serializers.IntegerField(read_only=True)
    financial_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Lease
        fields = '__all__'
        read_only_fields = ['attachments_count', 'balance_cents']
    
    def get_tenant(self, obj):
        try:
            return {
                'id': obj.tenant.id,
                'tenant_code': obj.tenant.tenant_code,
                'name': obj.tenant.user.get_full_name(),
                'email': obj.tenant.email
            }
        except Exception as e:
            print(f"Error getting tenant data for lease {obj.id}: {e}")
            return {
                'id': obj.tenant.id if obj.tenant else None,
                'tenant_code': obj.tenant.tenant_code if obj.tenant else None,
                'name': 'Unknown',
                'email': obj.tenant.email if obj.tenant else None
            }
    
    def get_property(self, obj):
        try:
            # Check if this is a sub-property (unit) and get unit number from name or create one
            unit_number = None
            if obj.property.parent_property:
                # This is a sub-property (unit), extract unit number from name or use a default
                property_name = obj.property.name
                # Try to extract unit number from property name (e.g., "Unit 101", "Apt 2B")
                import re
                unit_match = re.search(r'(?:unit|apt|apartment|suite)\s*([a-z0-9-]+)', property_name.lower())
                if unit_match:
                    unit_number = unit_match.group(1).upper()
                else:
                    # If no unit number found, use the property name as unit identifier
                    unit_number = property_name
            
            return {
                'id': obj.property.id,
                'property_code': obj.property.property_code,
                'name': obj.property.name,
                'address': obj.property.full_address,
                'unit_number': unit_number
            }
        except Exception as e:
            print(f"Error getting property data for lease {obj.id}: {e}")
            return {
                'id': obj.property.id if obj.property else None,
                'property_code': obj.property.property_code if obj.property else None,
                'name': 'Unknown',
                'address': 'Unknown',
                'unit_number': None
            }
    
    def get_attachments_count(self, obj):
        try:
            return obj.attachments.count()
        except Exception as e:
            print(f"Error getting attachments count for lease {obj.id}: {e}")
            return 0

    def get_financial_status(self, obj):
        """
        Map balance_cents to a coarse status for UI badges.
          - 0 => UP_TO_DATE
          - <0 => IN_DEBT (owes money)
          - >0 => IN_CREDIT (has credit)
        """
        try:
            balance_cents = getattr(obj, 'balance_cents', None)
            if balance_cents is None:
                return 'UP_TO_DATE'
            if balance_cents == 0:
                return 'UP_TO_DATE'
            return 'IN_CREDIT' if balance_cents > 0 else 'IN_DEBT'
        except Exception:
            return 'UP_TO_DATE'


class LeaseUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating leases - allows updating property and tenant"""
    
    class Meta:
        model = Lease
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """Custom validation for lease data"""
        # Ensure required fields are present
        if not data.get('property'):
            raise serializers.ValidationError("Property is required")
        if not data.get('tenant'):
            raise serializers.ValidationError("Tenant is required")
        if not data.get('start_date'):
            raise serializers.ValidationError("Start date is required")
        if not data.get('end_date'):
            raise serializers.ValidationError("End date is required")
        if not data.get('monthly_rent'):
            raise serializers.ValidationError("Monthly rent is required")
        
        # Validate dates
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError("End date must be after start date")
        
        # Validate amounts
        if data.get('monthly_rent') and data['monthly_rent'] <= 0:
            raise serializers.ValidationError("Monthly rent must be greater than 0")
        if data.get('deposit_amount') and data['deposit_amount'] < 0:
            raise serializers.ValidationError("Deposit cannot be negative")
        
        # Validate late fee fields
        late_fee_type = data.get('late_fee_type', 'percentage')
        if late_fee_type == 'percentage':
            if data.get('late_fee_percentage') and (data['late_fee_percentage'] < 0 or data['late_fee_percentage'] > 100):
                raise serializers.ValidationError("Late fee percentage must be between 0 and 100")
        elif late_fee_type == 'amount':
            if data.get('late_fee_amount') and data['late_fee_amount'] < 0:
                raise serializers.ValidationError("Late fee amount cannot be negative")
        
        # Validate that property doesn't already have an active lease
        if data.get('property'):
            existing_leases = Lease.objects.filter(
                property=data['property'],
                status__in=['active', 'pending']
            )
            
            # If this is an update, exclude the current instance
            instance = getattr(self, 'instance', None)
            if instance:
                existing_leases = existing_leases.exclude(pk=instance.pk)
            
            if existing_leases.exists():
                existing_lease = existing_leases.first()
                raise serializers.ValidationError({
                    'property': f'Property "{data["property"].name}" already has an active lease '
                               f'(ID: {existing_lease.id}, Status: {existing_lease.status}). '
                               f'Please terminate the existing lease before creating a new one.'
                })
        
        return data


class LeaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating leases"""
    
    class Meta:
        model = Lease
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """Custom validation for lease data"""
        # Ensure required fields are present
        if not data.get('property'):
            raise serializers.ValidationError("Property is required")
        if not data.get('tenant'):
            raise serializers.ValidationError("Tenant is required")
        if not data.get('start_date'):
            raise serializers.ValidationError("Start date is required")
        if not data.get('end_date'):
            raise serializers.ValidationError("End date is required")
        if not data.get('monthly_rent'):
            raise serializers.ValidationError("Monthly rent is required")
        
        # Validate dates
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError("End date must be after start date")
        
        # Validate amounts
        if data.get('monthly_rent') and data['monthly_rent'] <= 0:
            raise serializers.ValidationError("Monthly rent must be greater than 0")
        if data.get('deposit_amount') and data['deposit_amount'] < 0:
            raise serializers.ValidationError("Deposit cannot be negative")
        
        # Validate late fee fields
        late_fee_type = data.get('late_fee_type', 'percentage')
        if late_fee_type == 'percentage':
            if data.get('late_fee_percentage') and (data['late_fee_percentage'] < 0 or data['late_fee_percentage'] > 100):
                raise serializers.ValidationError("Late fee percentage must be between 0 and 100")
        elif late_fee_type == 'amount':
            if data.get('late_fee_amount') and data['late_fee_amount'] < 0:
                raise serializers.ValidationError("Late fee amount cannot be negative")
        
        # Validate that property doesn't already have an active lease
        if data.get('property'):
            existing_leases = Lease.objects.filter(
                property=data['property'],
                status__in=['active', 'pending']
            )
            
            # If this is an update, exclude the current instance
            instance = getattr(self, 'instance', None)
            if instance:
                existing_leases = existing_leases.exclude(pk=instance.pk)
            
            if existing_leases.exists():
                existing_lease = existing_leases.first()
                raise serializers.ValidationError({
                    'property': f'Property "{data["property"].name}" already has an active lease '
                               f'(ID: {existing_lease.id}, Status: {existing_lease.status}). '
                               f'Please terminate the existing lease before creating a new one.'
                })
        
        return data


class LeaseAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for lease attachments"""
    uploaded_by = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()
    is_pdf = serializers.SerializerMethodField()
    formatted_file_size = serializers.SerializerMethodField()
    
    class Meta:
        model = LeaseAttachment
        fields = '__all__'
    
    def get_uploaded_by(self, obj):
        if obj.uploaded_by:
            return {
                'id': obj.uploaded_by.id,
                'name': obj.uploaded_by.get_full_name(),
                'email': obj.uploaded_by.email
            }
        return None
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_extension(self, obj):
        return obj.file_extension
    
    def get_is_image(self, obj):
        return obj.is_image
    
    def get_is_pdf(self, obj):
        return obj.is_pdf
    
    def get_formatted_file_size(self, obj):
        return obj.formatted_file_size


class LeaseAttachmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating lease attachments"""
    
    class Meta:
        model = LeaseAttachment
        fields = ['title', 'description', 'file', 'file_type', 'is_public']
    
    def validate_file(self, value):
        """Validate file size and type"""
        print(f"Validating file: {value.name}, size: {value.size}")
        
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size must be less than 10MB.")
        
        # Check file type
        allowed_extensions = [
            'pdf', 'doc', 'docx', 'txt', 'rtf',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
            'xls', 'xlsx', 'csv'
        ]
        file_extension = value.name.split('.')[-1].lower()
        print(f"File extension: {file_extension}")
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value


class LeaseAttachmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating lease attachments - only title and description"""
    
    class Meta:
        model = LeaseAttachment
        fields = ['title', 'description']
    
    def validate_title(self, value):
        """Validate title is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty")
        return value.strip()
    
    def to_representation(self, instance):
        """Return full attachment data after update"""
        return LeaseAttachmentSerializer(instance, context=self.context).data


class LeaseNoteSerializer(serializers.ModelSerializer):
    """Serializer for lease notes"""
    created_by = serializers.SerializerMethodField()
    
    class Meta:
        model = LeaseNote
        fields = '__all__'
    
    def get_created_by(self, obj):
        if obj.created_by:
            return {
                'id': obj.created_by.id,
                'name': obj.created_by.get_full_name(),
                'email': obj.created_by.email
            }
        return None


class LeaseNoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating lease notes"""
    
    class Meta:
        model = LeaseNote
        fields = ['title', 'content', 'note_type']
    
    def validate_title(self, value):
        """Validate title is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty")
        return value.strip()
    
    def validate_content(self, value):
        """Validate content is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Content cannot be empty")
        return value.strip() 