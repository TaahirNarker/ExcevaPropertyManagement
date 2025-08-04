from rest_framework import serializers
from .models import Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment, InvoiceAuditLog
from tenants.models import Tenant
from leases.models import Lease
from properties.models import Property


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice line items"""
    
    class Meta:
        model = InvoiceLineItem
        fields = [
            'id', 'description', 'category', 'quantity', 'unit_price', 'total',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total', 'created_at', 'updated_at']


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer for invoice payments"""
    
    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'amount', 'payment_date', 'payment_method', 'reference_number',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices with nested line items and payments"""
    
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    lease_code = serializers.CharField(source='lease.lease_code', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'issue_date', 'due_date', 'status',
            'lease', 'lease_code', 'property', 'property_name', 'tenant', 'tenant_name',
            'landlord', 'landlord_name', 'created_by', 'created_by_name',
            'subtotal', 'tax_rate', 'tax_amount', 'total_amount',
            'notes', 'email_subject', 'email_recipient', 'bank_info', 'extra_notes',
            'is_locked', 'locked_at', 'locked_by', 'sent_at', 'sent_by',
            'invoice_type', 'parent_invoice',
            'line_items', 'payments', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
            'created_at', 'updated_at', 'lease_code', 'property_name', 'tenant_name',
            'landlord_name', 'created_by_name', 'line_items', 'payments',
            'is_locked', 'locked_at', 'locked_by', 'sent_at', 'sent_by'
        ]


class InvoiceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating invoices with line items"""
    
    line_items = InvoiceLineItemSerializer(many=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'issue_date', 'due_date', 'status',
            'lease', 'property', 'tenant', 'landlord', 'created_by',
            'tax_rate', 'notes', 'email_subject', 'email_recipient', 'bank_info', 'extra_notes',
            'invoice_type', 'parent_invoice',
            'line_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        invoice = Invoice.objects.create(**validated_data)
        
        # Create line items
        for line_item_data in line_items_data:
            InvoiceLineItem.objects.create(invoice=invoice, **line_item_data)
        
        return invoice
    
    def update(self, instance, validated_data):
        # Check if invoice is locked
        if instance.is_locked:
            raise serializers.ValidationError("Cannot update locked invoice")
        
        # Check if invoice can be edited
        if not instance.can_edit():
            raise serializers.ValidationError(f"Cannot edit invoice with status '{instance.get_status_display()}'")
        
        line_items_data = validated_data.pop('line_items', [])
        
        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update line items
        if line_items_data:
            # Delete existing line items
            instance.line_items.all().delete()
            
            # Create new line items
            for line_item_data in line_items_data:
                InvoiceLineItem.objects.create(invoice=instance, **line_item_data)
        
        return instance


class InvoiceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for invoice lists"""
    
    lease_code = serializers.CharField(source='lease.lease_code', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'issue_date', 'due_date', 'status', 'status_display',
            'lease_code', 'property_name', 'tenant_name', 'total_amount', 'created_at',
            'is_locked', 'invoice_type', 'parent_invoice'
        ]


class InvoiceTemplateSerializer(serializers.ModelSerializer):
    """Serializer for invoice templates"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = InvoiceTemplate
        fields = [
            'id', 'name', 'description', 'from_details', 'to_details', 'default_notes',
            'bank_info', 'default_line_items', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']


class InvoiceSummarySerializer(serializers.ModelSerializer):
    """Serializer for invoice summary statistics"""
    
    total_paid = serializers.SerializerMethodField()
    total_outstanding = serializers.SerializerMethodField()
    payment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'total_amount', 'total_paid', 'total_outstanding',
            'payment_count', 'status', 'due_date'
        ]
    
    def get_total_paid(self, obj):
        return sum(payment.amount for payment in obj.payments.all())
    
    def get_total_outstanding(self, obj):
        total_paid = self.get_total_paid(obj)
        return max(0, obj.total_amount - total_paid)
    
    def get_payment_count(self, obj):
        """Get count of payments for this invoice"""
        return obj.payments.count()


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for invoice with full information"""
    
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    audit_logs = serializers.SerializerMethodField()
    lease_code = serializers.CharField(source='lease.lease_code', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    locked_by_name = serializers.CharField(source='locked_by.get_full_name', read_only=True)
    sent_by_name = serializers.CharField(source='sent_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'issue_date', 'due_date', 'status', 'status_display',
            'lease', 'lease_code', 'property', 'property_name', 'tenant', 'tenant_name',
            'landlord', 'landlord_name', 'created_by', 'created_by_name',
            'subtotal', 'tax_rate', 'tax_amount', 'total_amount',
            'notes', 'email_subject', 'email_recipient', 'bank_info', 'extra_notes',
            'is_locked', 'locked_at', 'locked_by', 'locked_by_name', 'sent_at', 'sent_by', 'sent_by_name',
            'invoice_type', 'invoice_type_display', 'parent_invoice',
            'line_items', 'payments', 'audit_logs', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
            'created_at', 'updated_at', 'lease_code', 'property_name', 'tenant_name',
            'landlord_name', 'created_by_name', 'locked_by_name', 'sent_by_name',
            'line_items', 'payments', 'audit_logs', 'status_display', 'invoice_type_display',
            'is_locked', 'locked_at', 'locked_by', 'sent_at', 'sent_by'
        ]
    
    def get_audit_logs(self, obj):
        """Get audit logs for this invoice"""
        logs = obj.audit_logs.all()[:10]  # Limit to last 10 logs
        return InvoiceAuditLogSerializer(logs, many=True).data


class InvoiceAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for invoice audit logs"""
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    timestamp_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceAuditLog
        fields = [
            'id', 'action', 'action_display', 'description', 'user', 'user_name',
            'timestamp', 'timestamp_formatted', 'details', 'field_changed',
            'old_value', 'new_value', 'invoice_snapshot'
        ]
        read_only_fields = [
            'id', 'action', 'action_display', 'description', 'user', 'user_name',
            'timestamp', 'timestamp_formatted', 'details', 'field_changed',
            'old_value', 'new_value', 'invoice_snapshot'
        ]
    
    def get_timestamp_formatted(self, obj):
        """Format timestamp for display"""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S') 