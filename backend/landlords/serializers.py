from rest_framework import serializers
from .models import Landlord

class LandlordSerializer(serializers.ModelSerializer):
    """
    Serializer for Landlord model with all fields.
    """
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    full_address = serializers.CharField(source='get_full_address', read_only=True)
    properties_count = serializers.IntegerField(source='get_properties_count', read_only=True)
    total_rental_income = serializers.DecimalField(
        source='get_total_rental_income', 
        max_digits=12, 
        decimal_places=2, 
        read_only=True
    )
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Landlord
        fields = [
            'id', 'name', 'email', 'phone', 'type', 'status',
            'company_name', 'vat_number', 'id_number', 'tax_number',
            'street_address', 'address_line_2', 'suburb', 'city', 
            'province', 'postal_code', 'country',
            'bank_name', 'account_number', 'branch_code', 'account_type',
            'notes', 'created_at', 'updated_at',
            'display_name', 'full_address', 'properties_count', 
            'total_rental_income', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if Landlord.objects.filter(email=value).exists():
            raise serializers.ValidationError("A landlord with this email already exists.")
        return value
    
    def validate(self, data):
        """Custom validation for the entire object."""
        # Company/Trust validation
        if data.get('type') in ['Company', 'Trust'] and not data.get('company_name'):
            raise serializers.ValidationError({
                'company_name': f'{data.get("type")} name is required for {data.get("type")} type landlords.'
            })
        
        # VAT number validation for companies
        if data.get('type') == 'Company' and data.get('vat_number'):
            vat_number = data.get('vat_number').replace(' ', '')
            if not vat_number.isdigit() or len(vat_number) != 10:
                raise serializers.ValidationError({
                    'vat_number': 'VAT number must be exactly 10 digits.'
                })
            data['vat_number'] = vat_number
        
        # ID number validation for individuals
        if data.get('type') == 'Individual' and data.get('id_number'):
            id_number = data.get('id_number').replace(' ', '')
            if not id_number.isdigit() or len(id_number) != 13:
                raise serializers.ValidationError({
                    'id_number': 'ID number must be exactly 13 digits.'
                })
            data['id_number'] = id_number
        
        # Postal code validation
        if data.get('postal_code'):
            postal_code = data.get('postal_code').replace(' ', '')
            if not postal_code.isdigit():
                raise serializers.ValidationError({
                    'postal_code': 'Postal code must contain only digits.'
                })
            data['postal_code'] = postal_code
        
        return data

class LandlordListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing landlords.
    """
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    properties_count = serializers.IntegerField(source='get_properties_count', read_only=True)
    total_rental_income = serializers.DecimalField(
        source='get_total_rental_income', 
        max_digits=12, 
        decimal_places=2, 
        read_only=True
    )
    
    class Meta:
        model = Landlord
        fields = [
            'id', 'name', 'email', 'phone', 'type', 'status',
            'company_name', 'vat_number', 'display_name',
            'properties_count', 'total_rental_income', 'created_at'
        ]

class LandlordCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new landlords.
    """
    class Meta:
        model = Landlord
        fields = [
            'name', 'email', 'phone', 'type', 'status',
            'company_name', 'vat_number', 'id_number', 'tax_number',
            'street_address', 'address_line_2', 'suburb', 'city', 
            'province', 'postal_code', 'country',
            'bank_name', 'account_number', 'branch_code', 'account_type',
            'notes'
        ]
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if Landlord.objects.filter(email=value).exists():
            raise serializers.ValidationError("A landlord with this email already exists.")
        return value
    
    def validate(self, data):
        """Custom validation for the entire object."""
        # Company/Trust validation
        if data.get('type') in ['Company', 'Trust'] and not data.get('company_name'):
            raise serializers.ValidationError({
                'company_name': f'{data.get("type")} name is required for {data.get("type")} type landlords.'
            })
        
        # VAT number validation for companies
        if data.get('type') == 'Company' and data.get('vat_number'):
            vat_number = str(data.get('vat_number')).replace(' ', '')
            if not vat_number.isdigit() or len(vat_number) != 10:
                raise serializers.ValidationError({
                    'vat_number': 'VAT number must be exactly 10 digits.'
                })
            data['vat_number'] = vat_number
        
        # ID number validation for individuals
        if data.get('type') == 'Individual' and data.get('id_number'):
            id_number = str(data.get('id_number')).replace(' ', '')
            if not id_number.isdigit() or len(id_number) != 13:
                raise serializers.ValidationError({
                    'id_number': 'ID number must be exactly 13 digits.'
                })
            data['id_number'] = id_number
        
        # Postal code validation
        if data.get('postal_code'):
            postal_code = str(data.get('postal_code')).replace(' ', '')
            if not postal_code.isdigit():
                raise serializers.ValidationError({
                    'postal_code': 'Postal code must contain only digits.'
                })
            data['postal_code'] = postal_code
        
        return data

class LandlordUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating landlords.
    """
    class Meta:
        model = Landlord
        fields = [
            'name', 'email', 'phone', 'type', 'status',
            'company_name', 'vat_number', 'id_number', 'tax_number',
            'street_address', 'address_line_2', 'suburb', 'city', 
            'province', 'postal_code', 'country',
            'bank_name', 'account_number', 'branch_code', 'account_type',
            'notes'
        ]
    
    def validate_email(self, value):
        """Validate email uniqueness, excluding current instance."""
        if Landlord.objects.filter(email=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A landlord with this email already exists.")
        return value
    
    def validate(self, data):
        """Custom validation for the entire object."""
        # Company/Trust validation
        if data.get('type') in ['Company', 'Trust'] and not data.get('company_name'):
            raise serializers.ValidationError({
                'company_name': f'{data.get("type")} name is required for {data.get("type")} type landlords.'
            })
        
        # VAT number validation for companies
        if data.get('type') == 'Company' and data.get('vat_number'):
            vat_number = data.get('vat_number').replace(' ', '')
            if not vat_number.isdigit() or len(vat_number) != 10:
                raise serializers.ValidationError({
                    'vat_number': 'VAT number must be exactly 10 digits.'
                })
            data['vat_number'] = vat_number
        
        # ID number validation for individuals
        if data.get('type') == 'Individual' and data.get('id_number'):
            id_number = data.get('id_number').replace(' ', '')
            if not id_number.isdigit() or len(id_number) != 13:
                raise serializers.ValidationError({
                    'id_number': 'ID number must be exactly 13 digits.'
                })
            data['id_number'] = id_number
        
        # Postal code validation
        if data.get('postal_code'):
            postal_code = data.get('postal_code').replace(' ', '')
            if not postal_code.isdigit():
                raise serializers.ValidationError({
                    'postal_code': 'Postal code must contain only digits.'
                })
            data['postal_code'] = postal_code
        
        return data 