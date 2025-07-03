from rest_framework import serializers
from .models import Property, Unit


class PropertySerializer(serializers.ModelSerializer):
    occupied_units_count = serializers.ReadOnlyField()
    vacant_units_count = serializers.ReadOnlyField()
    occupancy_rate = serializers.ReadOnlyField()
    total_rental_income = serializers.ReadOnlyField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'name', 'address', 'property_type', 'purchase_price',
            'current_market_value', 'total_units', 'description',
            'is_active', 'created_at', 'updated_at', 'occupied_units_count',
            'vacant_units_count', 'occupancy_rate', 'total_rental_income'
        ]


class UnitSerializer(serializers.ModelSerializer):
    property = serializers.CharField(source='property_ref.name', read_only=True)
    property_id = serializers.IntegerField(source='property_ref.id', read_only=True)
    is_occupied = serializers.ReadOnlyField()
    current_tenant_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Unit
        fields = [
            'id', 'property', 'property_id', 'unit_number', 'unit_type',
            'status', 'monthly_rent', 'size_sqm', 'description',
            'is_active', 'created_at', 'updated_at', 'is_occupied',
            'current_tenant_name'
        ]
        
    def get_current_tenant_name(self, obj):
        """Get current tenant name safely"""
        try:
            current_tenant = obj.current_tenant
            return current_tenant.name if current_tenant else None
        except:
            return None
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Map fields to match frontend expectations
        data['number'] = data['unit_number']
        data['type'] = data['unit_type']
        data['rent'] = float(data['monthly_rent'])
        data['size'] = float(data['size_sqm']) if data['size_sqm'] else 0
        data['current_tenant'] = data['current_tenant_name']
        return data 