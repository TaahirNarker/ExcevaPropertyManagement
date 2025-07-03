from rest_framework import serializers
from .models import Tenant, Lease


class TenantSerializer(serializers.ModelSerializer):
    current_leases = serializers.SerializerMethodField()
    total_monthly_rent = serializers.ReadOnlyField()
    has_outstanding_payments = serializers.ReadOnlyField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'tenant_type', 'id_number', 'email', 'phone_number',
            'alternative_phone', 'postal_address', 'employer', 'monthly_income',
            'emergency_contact_name', 'emergency_contact_phone', 'notes',
            'is_active', 'created_at', 'updated_at', 'current_leases',
            'total_monthly_rent', 'has_outstanding_payments'
        ]
        
    def get_current_leases(self, obj):
        return obj.current_leases.count()
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Map fields to match frontend expectations
        data['phone'] = data['phone_number']
        return data


class LeaseSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property_ref.name', read_only=True)
    is_current = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    outstanding_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Lease
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name',
            'start_date', 'end_date', 'monthly_rent', 'security_deposit',
            'annual_escalation_rate', 'escalation_date', 'rent_due_day',
            'payment_frequency', 'status', 'special_terms', 'notes',
            'is_active', 'created_at', 'updated_at', 'is_current',
            'days_remaining', 'outstanding_amount'
        ] 