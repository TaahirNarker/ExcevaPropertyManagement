from rest_framework import serializers
from .models import Invoice, Payment, FinancialSummary
from tenants.serializers import TenantSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(source='lease.tenant', read_only=True)
    unit = serializers.SerializerMethodField()
    outstanding_amount = serializers.ReadOnlyField()
    total_amount = serializers.ReadOnlyField()
    is_paid = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'lease', 'tenant', 'unit', 'issue_date',
            'due_date', 'amount', 'invoice_type', 'description', 'status',
            'amount_paid', 'late_fee', 'billing_period_start', 'billing_period_end',
            'is_recurring', 'auto_generated', 'notes', 'is_active',
            'created_at', 'updated_at', 'outstanding_amount', 'total_amount',
            'is_paid', 'is_overdue', 'days_overdue'
        ]
        
    def get_unit(self, obj):
        unit = obj.lease.unit
        return {
            'id': unit.id,
            'number': unit.unit_number,
            'property': unit.property_ref.name,
            'type': unit.unit_type,
            'size': float(unit.size_sqm) if unit.size_sqm else 0,
            'rent': float(unit.monthly_rent),
            'is_occupied': unit.is_occupied,
            'status': unit.status
        }
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Map fields to match frontend expectations
        data['paid_amount'] = data['amount_paid']
        return data


class PaymentRecordSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='invoice.lease.tenant.name', read_only=True)
    unit_number = serializers.CharField(source='invoice.lease.unit.unit_number', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_reference', 'invoice', 'invoice_number', 'tenant_name',
            'unit_number', 'amount', 'payment_date', 'payment_method',
            'bank_reference', 'depositor_name', 'is_verified', 'verified_by',
            'verified_date', 'notes', 'is_active', 'created_at', 'updated_at'
        ]
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Map fields to match frontend expectations
        data['date'] = data['payment_date']
        data['method'] = data['payment_method'].replace('_', ' ').title() if data['payment_method'] else ''
        data['reference_number'] = data['bank_reference']
        return data


class FinancialSummarySerializer(serializers.ModelSerializer):
    vacancy_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = FinancialSummary
        fields = [
            'date', 'total_rent_due', 'total_rent_collected', 'total_outstanding',
            'total_properties', 'total_units', 'occupied_units', 'occupancy_rate',
            'collection_rate', 'vacancy_rate', 'created_at'
        ]
        
    def get_vacancy_rate(self, obj):
        if obj.total_units > 0:
            return 100 - float(obj.occupancy_rate)
        return 0
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Map fields to match frontend expectations
        data['rent_due'] = float(data['total_rent_due'])
        data['rent_collected'] = float(data['total_rent_collected'])
        data['outstanding_amount'] = float(data['total_outstanding'])
        data['total_tenants'] = data['occupied_units']  # Assuming one tenant per unit
        return data 