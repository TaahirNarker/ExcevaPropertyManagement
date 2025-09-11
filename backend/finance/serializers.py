from rest_framework import serializers
from .models import (
    Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment, InvoiceAuditLog,
    TenantCreditBalance, RecurringCharge, RentEscalationLog, InvoiceDraft, SystemSettings,
    BankTransaction, ManualPayment, PaymentAllocation, Adjustment, CSVImportBatch, UnderpaymentAlert,
    ExpenseCategory, Supplier, Expense, Budget
)
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
        # 'total' is computed server-side in the model's save()
        read_only_fields = ['id', 'total', 'created_at', 'updated_at']


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer for invoice payments"""

    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'amount', 'allocated_amount', 'payment_date', 'payment_method', 'payment_method_display',
            'reference_number', 'notes', 'tenant', 'tenant_name', 'recorded_by', 'recorded_by_name',
            'is_overpayment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant_name', 'recorded_by_name', 'payment_method_display', 'created_at', 'updated_at']


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
            'subtotal', 'tax_rate', 'tax_amount', 'total_amount', 'amount_paid', 'balance_due',
            'billing_period_start', 'billing_period_end', 'scheduled_send_date',
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
    """
    Serializer for creating and updating invoices with line items.
    Improvements:
      - Accepts 'lease_id' as an alias for 'lease' for compatibility with existing frontend.
      - Auto-derives 'property' and 'tenant' from 'lease' when not provided.
      - Defaults 'status' to 'draft' if absent.
      - Ensures totals are recalculated after creating line items.
    """

    # Nested write for line items (made optional to normalize first)
    line_items = InvoiceLineItemSerializer(many=True, required=False)

    # Make property and tenant optional so we can derive them from lease during validation
    property = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all(), required=False)
    tenant = serializers.PrimaryKeyRelatedField(queryset=Tenant.objects.all(), required=False)
    lease = serializers.PrimaryKeyRelatedField(queryset=Lease.objects.all(), required=False)

    # Write-only alias for convenience with existing frontend payloads
    lease_id = serializers.IntegerField(write_only=True, required=False)
    # Allow alternative frontend field to map to notes
    payment_terms = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'title', 'issue_date', 'due_date', 'status',
            'lease', 'lease_id', 'property', 'tenant', 'landlord', 'created_by',
            'tax_rate', 'notes', 'email_subject', 'email_recipient', 'bank_info', 'extra_notes',
            'billing_period_start', 'billing_period_end',
            'invoice_type', 'parent_invoice',
            'line_items', 'payment_terms', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']

    def validate(self, attrs):
        """
        Normalize input before creation/update:
          - Resolve 'lease' from 'lease_id' BEFORE default DRF validation so 'lease' isn't flagged missing.
          - Also resolve 'lease' when provided as an integer/string PK.
          - Derive 'property' and 'tenant' from 'lease' when not provided.
          - Default status to 'draft' if absent.
        """
        # Resolve lease via lease_id if provided (do this BEFORE super().validate)
        lease_obj = attrs.get('lease')
        lease_id = attrs.pop('lease_id', None)

        if lease_obj is None and lease_id is not None:
            try:
                lease_obj = Lease.objects.get(id=lease_id)
            except Lease.DoesNotExist:
                raise serializers.ValidationError({'lease_id': 'Lease not found'})
            attrs['lease'] = lease_obj

        # If lease provided as a primitive (int/str), resolve it to a Lease instance
        if lease_obj is not None and not isinstance(lease_obj, Lease):
            try:
                lease_pk = int(lease_obj)
                lease_obj = Lease.objects.get(id=lease_pk)
            except (ValueError, Lease.DoesNotExist):
                raise serializers.ValidationError({'lease': 'Lease not found'})
            attrs['lease'] = lease_obj

        # After ensuring lease, derive property and tenant if not provided
        if lease_obj:
            if not attrs.get('property'):
                attrs['property'] = lease_obj.property
            if not attrs.get('tenant'):
                attrs['tenant'] = lease_obj.tenant

        # Map optional payment_terms -> notes if notes not provided
        payment_terms = attrs.pop('payment_terms', None)
        if payment_terms and not attrs.get('notes'):
            attrs['notes'] = payment_terms

        # Normalize line items: support `item_type` alias for `category`
        line_items = attrs.get('line_items') or []
        normalized_items = []
        for item in line_items:
            item = dict(item)
            if 'item_type' in item and not item.get('category'):
                item['category'] = item.pop('item_type')
            # Ensure defaults
            if 'description' not in item:
                item['description'] = ''
            if 'quantity' not in item:
                item['quantity'] = 1
            if 'unit_price' not in item:
                item['unit_price'] = 0
            # Skip empty-description items to avoid validation errors
            if str(item.get('description', '')).strip() == '':
                continue
            normalized_items.append(item)
        # Always set normalized items back, even if empty, then enforce at least one
        attrs['line_items'] = normalized_items

        if not normalized_items:
            raise serializers.ValidationError({'line_items': 'At least one line item with a description is required'})

        # Ensure default status
        if not attrs.get('status'):
            attrs['status'] = 'draft'

        # Now run default validation with normalized attrs
        return super().validate(attrs)

    def create(self, validated_data):
        # Extract nested line items from payload
        line_items_data = validated_data.pop('line_items', [])

        # Create invoice with normalized data
        invoice = Invoice.objects.create(**validated_data)

        # Create line items
        for line_item_data in line_items_data:
            InvoiceLineItem.objects.create(invoice=invoice, **line_item_data)

        # Recalculate totals once after all items are added
        invoice.calculate_totals()
        invoice.save()

        return invoice

    def update(self, instance, validated_data):
        """
        Update invoice and replace line items if provided.
        Enforces locking and edit-ability via model methods.
        """
        # Check if invoice is locked
        if instance.is_locked:
            raise serializers.ValidationError("Cannot update locked invoice")

        # Check if invoice can be edited
        if not instance.can_edit():
            raise serializers.ValidationError(f"Cannot edit invoice with status '{instance.get_status_display()}'")

        # Handle nested line items
        line_items_data = validated_data.pop('line_items', [])

        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace line items if provided
        if line_items_data:
            instance.line_items.all().delete()
            for line_item_data in line_items_data:
                InvoiceLineItem.objects.create(invoice=instance, **line_item_data)

            # Ensure totals reflect the new set of line items
            instance.calculate_totals()
            instance.save()

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
            'id', 'action', 'action_display', 'user', 'user_name',
            'timestamp', 'timestamp_formatted', 'details', 'field_changed',
            'old_value', 'new_value', 'invoice_snapshot'
        ]
        read_only_fields = [
            'id', 'action', 'action_display', 'user', 'user_name',
            'timestamp', 'timestamp_formatted', 'details', 'field_changed',
            'old_value', 'new_value', 'invoice_snapshot'
        ]

    def get_timestamp_formatted(self, obj):
        """Format timestamp for display"""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')


class TenantCreditBalanceSerializer(serializers.ModelSerializer):
    """Serializer for tenant credit balances"""

    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = TenantCreditBalance
        fields = ['id', 'tenant', 'tenant_name', 'balance', 'last_updated']
        read_only_fields = ['id', 'tenant_name', 'last_updated']


class RecurringChargeSerializer(serializers.ModelSerializer):
    """Serializer for recurring charges"""

    lease_code = serializers.CharField(source='lease.lease_code', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = RecurringCharge
        fields = [
            'id', 'lease', 'lease_code', 'description', 'category', 'category_display',
            'amount', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'lease_code', 'category_display', 'created_at', 'updated_at']


class RentEscalationLogSerializer(serializers.ModelSerializer):
    """Serializer for rent escalation logs"""

    lease_code = serializers.CharField(source='lease.lease_code', read_only=True)
    applied_by_name = serializers.CharField(source='applied_by.get_full_name', read_only=True)

    class Meta:
        model = RentEscalationLog
        fields = [
            'id', 'lease', 'lease_code', 'previous_rent', 'new_rent',
            'escalation_percentage', 'escalation_amount', 'effective_date',
            'reason', 'applied_by', 'applied_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'lease_code', 'applied_by_name', 'created_at']


class InvoiceDraftSerializer(serializers.ModelSerializer):
    """Serializer for invoice drafts"""

    lease_code = serializers.CharField(source='lease.lease_code', read_only=True)
    billing_month_formatted = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceDraft
        fields = [
            'id', 'lease', 'lease_code', 'billing_month', 'billing_month_formatted',
            'draft_data', 'user_modified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'lease_code', 'billing_month_formatted', 'created_at', 'updated_at']

    def get_billing_month_formatted(self, obj):
        """Format billing month for display"""
        return obj.billing_month.strftime('%B %Y')


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings"""

    setting_type_display = serializers.CharField(source='get_setting_type_display', read_only=True)

    class Meta:
        model = SystemSettings
        fields = [
            'id', 'key', 'value', 'setting_type', 'setting_type_display',
            'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'setting_type_display', 'created_at', 'updated_at']


class PaymentAllocationSerializer(serializers.Serializer):
    """Serializer for payment allocation requests"""

    tenant_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.CharField(max_length=20)
    payment_date = serializers.DateField()
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    invoice_allocations = serializers.ListField(
        child=serializers.DictField(child=serializers.DecimalField(max_digits=12, decimal_places=2)),
        required=False
    )

    def validate_payment_method(self, value):
        """Validate payment method"""
        valid_methods = [choice[0] for choice in InvoicePayment.PAYMENT_METHOD_CHOICES]
        if value not in valid_methods:
            raise serializers.ValidationError(f"Invalid payment method. Choose from: {valid_methods}")
        return value


class InvoiceNavigationSerializer(serializers.Serializer):
    """Serializer for invoice navigation requests"""

    lease_id = serializers.IntegerField()
    billing_month = serializers.DateField()

    def validate_billing_month(self, value):
        """Ensure billing month is the first day of the month"""
        if value.day != 1:
            return value.replace(day=1)
        return value


# New Payment Model Serializers
class BankTransactionSerializer(serializers.ModelSerializer):
    """Serializer for bank transactions"""

    tenant_name = serializers.CharField(source='matched_lease.tenant.name', read_only=True)
    property_name = serializers.CharField(source='matched_lease.property.name', read_only=True)
    invoice_number = serializers.CharField(source='matched_invoice.invoice_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = BankTransaction
        fields = [
            'id', 'import_batch', 'import_date', 'transaction_date', 'description',
            'amount', 'transaction_type', 'transaction_type_display', 'reference_number',
            'bank_account', 'status', 'status_display', 'tenant_reference',
            'matched_lease', 'matched_invoice', 'tenant_name', 'property_name',
            'invoice_number', 'manually_allocated', 'allocation_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'import_batch', 'import_date', 'tenant_name', 'property_name',
            'invoice_number', 'status_display', 'transaction_type_display',
            'created_at', 'updated_at'
        ]


class ManualPaymentSerializer(serializers.ModelSerializer):
    """Serializer for manual payments"""

    tenant_name = serializers.CharField(source='lease.tenant.name', read_only=True)
    property_name = serializers.CharField(source='lease.property.name', read_only=True)
    unit_number = serializers.CharField(source='lease.property.unit_number', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = ManualPayment
        fields = [
            'id', 'lease', 'tenant_name', 'property_name', 'unit_number',
            'payment_method', 'payment_method_display', 'amount', 'payment_date',
            'reference_number', 'notes', 'status', 'status_display',
            'allocated_amount', 'remaining_amount', 'recorded_by', 'recorded_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'tenant_name', 'property_name', 'unit_number',
            'payment_method_display', 'status_display', 'recorded_by_name',
            'allocated_amount', 'remaining_amount', 'created_at', 'updated_at'
        ]


class PaymentAllocationSerializer(serializers.ModelSerializer):
    """Serializer for payment allocations"""

    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    tenant_name = serializers.CharField(source='invoice.tenant.name', read_only=True)
    allocation_type_display = serializers.CharField(source='get_allocation_type_display', read_only=True)
    allocated_by_name = serializers.CharField(source='allocated_by.get_full_name', read_only=True)

    class Meta:
        model = PaymentAllocation
        fields = [
            'id', 'payment', 'bank_transaction', 'invoice', 'invoice_number',
            'tenant_name', 'allocated_amount', 'allocation_type',
            'allocation_type_display', 'allocation_date', 'notes',
            'allocated_by', 'allocated_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'tenant_name', 'allocation_type_display',
            'allocation_date', 'allocated_by_name', 'created_at', 'updated_at'
        ]


class AdjustmentSerializer(serializers.ModelSerializer):
    """Serializer for adjustments"""

    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    tenant_name = serializers.CharField(source='invoice.tenant.name', read_only=True)
    adjustment_type_display = serializers.CharField(source='get_adjustment_type_display', read_only=True)
    applied_by_name = serializers.CharField(source='applied_by.get_full_name', read_only=True)

    class Meta:
        model = Adjustment
        fields = [
            'id', 'invoice', 'invoice_number', 'tenant_name', 'adjustment_type',
            'adjustment_type_display', 'amount', 'reason', 'notes',
            'is_approved', 'applied_date', 'effective_date', 'applied_by',
            'applied_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'tenant_name', 'adjustment_type_display',
            'applied_date', 'applied_by_name', 'created_at', 'updated_at'
        ]


class CSVImportBatchSerializer(serializers.ModelSerializer):
    """Serializer for CSV import batches"""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    imported_by_name = serializers.CharField(source='imported_by.get_full_name', read_only=True)

    class Meta:
        model = CSVImportBatch
        fields = [
            'id', 'batch_id', 'filename', 'bank_name', 'import_date',
            'status', 'status_display', 'total_transactions',
            'successful_reconciliations', 'manual_review_required',
            'failed_transactions', 'error_log', 'imported_by', 'imported_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'batch_id', 'import_date', 'status_display',
            'imported_by_name', 'created_at', 'updated_at'
        ]


class UnderpaymentAlertSerializer(serializers.ModelSerializer):
    """Serializer for underpayment alerts"""
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = UnderpaymentAlert
        fields = [
            'id', 'tenant', 'tenant_name', 'invoice', 'invoice_number',
            'expected_amount', 'actual_amount', 'shortfall_amount',
            'alert_message', 'status', 'status_display', 'created_at',
            'created_at_formatted',
            'payment', 'bank_transaction'
        ]
        read_only_fields = [
            'id', 'tenant_name', 'invoice_number', 'status_display', 'created_at',
            'created_at_formatted'
        ]

    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M:%S')


class CSVImportRequestSerializer(serializers.Serializer):
    """Serializer for CSV import requests"""

    bank_name = serializers.CharField(max_length=100)
    csv_file = serializers.FileField()

    def validate_bank_name(self, value):
        """Validate bank name"""
        if not value.strip():
            raise serializers.ValidationError("Bank name is required")
        return value.strip()


class ManualPaymentRequestSerializer(serializers.Serializer):
    """Serializer for manual payment requests"""

    lease_id = serializers.IntegerField()
    payment_method = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_date = serializers.DateField()
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_payment_method(self, value):
        """Validate payment method"""
        valid_methods = [choice[0] for choice in ManualPayment.PAYMENT_METHOD_CHOICES]
        if value not in valid_methods:
            raise serializers.ValidationError(f"Invalid payment method. Choose from: {valid_methods}")
        return value


class PaymentAllocationRequestSerializer(serializers.Serializer):
    """Serializer for payment allocation requests"""

    payment_id = serializers.IntegerField(required=False)
    bank_transaction_id = serializers.IntegerField(required=False)
    allocations = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    create_credit = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate that either payment_id or bank_transaction_id is provided"""
        if not data.get('payment_id') and not data.get('bank_transaction_id'):
            raise serializers.ValidationError("Either payment_id or bank_transaction_id must be provided")

        if data.get('payment_id') and data.get('bank_transaction_id'):
            raise serializers.ValidationError("Only one of payment_id or bank_transaction_id can be provided")

        return data

    def validate_allocations(self, value):
        """Validate allocation structure"""
        for allocation in value:
            if 'invoice_id' not in allocation or 'amount' not in allocation:
                raise serializers.ValidationError("Each allocation must have invoice_id and amount")

            try:
                amount = float(allocation['amount'])
                if amount <= 0:
                    raise serializers.ValidationError("Allocation amount must be positive")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Allocation amount must be a valid number")

        return value


class AdjustmentRequestSerializer(serializers.Serializer):
    """Serializer for adjustment requests"""

    invoice_id = serializers.IntegerField()
    adjustment_type = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True)
    effective_date = serializers.DateField()

    def validate_adjustment_type(self, value):
        """Validate adjustment type"""
        valid_types = [choice[0] for choice in Adjustment.ADJUSTMENT_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid adjustment type. Choose from: {valid_types}")
        return value


class TenantStatementSerializer(serializers.Serializer):
    """Serializer for tenant statement requests"""

    tenant_id = serializers.IntegerField()
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, data):
        """Validate date range"""
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError("Start date must be before end date")
        return data


# =============================
# Expense Management Serializers
# =============================

class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Serializer for expense categories with parent reference name."""
    parent_name = serializers.CharField(source='parent_category.name', read_only=True)

    class Meta:
        model = ExpenseCategory
        fields = [
            'id', 'name', 'description', 'parent_category', 'parent_name',
            'is_active', 'tax_deductible', 'color_code', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'parent_name', 'created_at', 'updated_at']


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer for suppliers/vendors."""

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contact_person', 'email', 'phone', 'address',
            'payment_terms', 'is_preferred', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer for expenses with related display fields."""
    property_name = serializers.CharField(source='property.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'title', 'description', 'amount', 'tax_amount', 'total_amount',
            'expense_date', 'status', 'property', 'property_name', 'category',
            'category_name', 'supplier', 'supplier_name', 'created_by', 'created_by_name',
            'is_recurring', 'recurring_frequency', 'receipt_image', 'invoice_number',
            'reference_number', 'approved_by', 'approved_by_name', 'approved_at',
            'approval_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'property_name', 'category_name', 'supplier_name', 'created_by_name',
            'approved_by_name', 'created_at', 'updated_at'
        ]


class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for budgets with remaining amount property."""
    property_name = serializers.CharField(source='property.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'name', 'period', 'start_date', 'end_date', 'total_budget',
            'spent_amount', 'remaining_amount', 'is_active', 'property', 'property_name',
            'category', 'category_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'remaining_amount', 'property_name', 'category_name', 'created_at', 'updated_at']

    def get_remaining_amount(self, obj):
        try:
            return float(obj.remaining_amount_value())
        except Exception:
            return 0.0

        