from django.contrib import admin
from .models import (
    Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment, InvoiceAuditLog,
    TenantCreditBalance, RecurringCharge, RentEscalationLog, InvoiceDraft, SystemSettings,
    BankTransaction, ManualPayment, PaymentAllocation, Adjustment, CSVImportBatch,
    AdjustmentAuditLog, UnderpaymentAlert
)
from django.utils import timezone


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0
    readonly_fields = ('total',)


class InvoiceAuditLogInline(admin.TabularInline):
    model = InvoiceAuditLog
    extra = 0
    readonly_fields = ('action', 'user', 'timestamp', 'details', 'field_changed', 'old_value', 'new_value')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number', 'tenant', 'property', 'status', 'is_locked', 
        'total_amount', 'due_date', 'invoice_type', 'created_at'
    ]
    list_filter = [
        'status', 'is_locked', 'invoice_type', 'created_at', 'due_date',
        'property', 'landlord'
    ]
    search_fields = ['invoice_number', 'tenant__name', 'property__name', 'title']
    readonly_fields = [
        'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
        'is_locked', 'locked_at', 'locked_by', 'sent_at', 'sent_by',
        'created_at', 'updated_at'
    ]
    inlines = [InvoiceLineItemInline, InvoiceAuditLogInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('invoice_number', 'title', 'issue_date', 'due_date', 'status')
        }),
        ('Relationships', {
            'fields': ('lease', 'property', 'tenant', 'landlord', 'created_by')
        }),
        ('Financial Details', {
            'fields': ('subtotal', 'tax_rate', 'tax_amount', 'total_amount')
        }),
        ('Invoice Type & Relationships', {
            'fields': ('invoice_type', 'parent_invoice')
        }),
        ('Email Settings', {
            'fields': ('email_subject', 'email_recipient')
        }),
        ('Additional Information', {
            'fields': ('notes', 'bank_info', 'extra_notes')
        }),
        ('Locking & Audit', {
            'fields': ('is_locked', 'locked_at', 'locked_by', 'sent_at', 'sent_by'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(self.readonly_fields)
        
        # If invoice is locked, make most fields readonly
        if obj and obj.is_locked and not request.user.is_superuser:
            readonly_fields.extend([
                'title', 'issue_date', 'due_date', 'status', 'lease', 'property', 
                'tenant', 'landlord', 'tax_rate', 'email_subject', 'email_recipient',
                'notes', 'bank_info', 'extra_notes', 'invoice_type', 'parent_invoice'
            ])
        
        return readonly_fields

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of locked invoices unless superuser
        if obj and obj.is_locked and not request.user.is_superuser:
            return False
        return super().has_delete_permission(request, obj)

    actions = ['unlock_invoices']

    def unlock_invoices(self, request, queryset):
        """Admin action to unlock selected invoices"""
        if not request.user.is_superuser:
            self.message_user(request, "Only superusers can unlock invoices.", level='ERROR')
            return
        
        count = 0
        for invoice in queryset.filter(is_locked=True):
            invoice.is_locked = False
            invoice.status = 'draft'
            invoice.save()
            
            # Create audit log
            InvoiceAuditLog.objects.create(
                invoice=invoice,
                action='unlocked',
                user=request.user,
                details=f"Invoice {invoice.invoice_number} unlocked via admin action"
            )
            count += 1
        
        self.message_user(request, f"Successfully unlocked {count} invoices.")
    
    unlock_invoices.short_description = "Unlock selected invoices (Admin only)"


@admin.register(InvoiceAuditLog)
class InvoiceAuditLogAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'action', 'user', 'timestamp']
    list_filter = ['action', 'timestamp', 'user']
    search_fields = ['invoice__invoice_number', 'user__username', 'details']
    readonly_fields = ['invoice', 'action', 'user', 'timestamp', 'details', 'field_changed', 'old_value', 'new_value']
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(InvoiceTemplate)
class InvoiceTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'created_at']
    list_filter = ['created_by', 'created_at']
    search_fields = ['name', 'description']


@admin.register(InvoicePayment)
class InvoicePaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'tenant', 'amount', 'allocated_amount', 'payment_date', 'payment_method', 'is_overpayment']
    list_filter = ['payment_method', 'payment_date', 'is_overpayment']
    search_fields = ['invoice__invoice_number', 'reference_number', 'tenant__name']


@admin.register(TenantCreditBalance)
class TenantCreditBalanceAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'balance', 'last_updated']
    list_filter = ['last_updated']
    search_fields = ['tenant__name']
    readonly_fields = ['last_updated']


@admin.register(RecurringCharge)
class RecurringChargeAdmin(admin.ModelAdmin):
    list_display = ['lease', 'description', 'category', 'amount', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['description', 'lease__tenant__name', 'lease__property__name']


@admin.register(RentEscalationLog)
class RentEscalationLogAdmin(admin.ModelAdmin):
    list_display = ['lease', 'previous_rent', 'new_rent', 'effective_date', 'reason', 'applied_by']
    list_filter = ['effective_date', 'applied_by']
    search_fields = ['lease__tenant__name', 'lease__property__name', 'reason']
    readonly_fields = ['created_at']


@admin.register(InvoiceDraft)
class InvoiceDraftAdmin(admin.ModelAdmin):
    list_display = ['lease', 'billing_month', 'user_modified', 'created_at', 'updated_at']
    list_filter = ['user_modified', 'billing_month', 'created_at']
    search_fields = ['lease__tenant__name', 'lease__property__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'setting_type', 'description']
    list_filter = ['setting_type']
    search_fields = ['key', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        """Only superusers can see all settings"""
        if request.user.is_superuser:
            return super().get_queryset(request)
        return SystemSettings.objects.none()
    
    def has_module_permission(self, request):
        """Only superusers can access system settings"""
        return request.user.is_superuser


# New Payment Models Admin
@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_date', 'description', 'amount', 'transaction_type', 'status', 'tenant_reference', 'import_batch']
    list_filter = ['status', 'transaction_type', 'transaction_date', 'import_batch']
    search_fields = ['description', 'reference_number', 'tenant_reference', 'import_batch']
    readonly_fields = ['import_date', 'created_at', 'updated_at']
    
    def has_add_permission(self, request):
        return False  # Only created via CSV import
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superusers can delete


@admin.register(ManualPayment)
class ManualPaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_date', 'lease', 'payment_method', 'amount', 'status', 'allocated_amount', 'recorded_by']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['lease__tenant__name', 'reference_number', 'notes']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'allocated_amount', 'allocation_type', 'allocation_date', 'allocated_by']
    list_filter = ['allocation_type', 'allocation_date']
    search_fields = ['invoice__invoice_number', 'notes']
    readonly_fields = ['allocation_date', 'created_at', 'updated_at']


@admin.register(Adjustment)
class AdjustmentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'adjustment_type', 'amount', 'reason', 'is_approved', 'applied_date', 'applied_by']
    list_filter = ['adjustment_type', 'is_approved', 'applied_date']
    search_fields = ['invoice__invoice_number', 'reason', 'notes']
    readonly_fields = ['applied_date', 'created_at', 'updated_at']


@admin.register(CSVImportBatch)
class CSVImportBatchAdmin(admin.ModelAdmin):
    list_display = ['batch_id', 'filename', 'bank_name', 'status', 'total_transactions', 'successful_reconciliations', 'imported_by']
    list_filter = ['status', 'bank_name', 'import_date']
    search_fields = ['batch_id', 'filename', 'bank_name']
    readonly_fields = ['import_date', 'created_at', 'updated_at']
    
    def has_add_permission(self, request):
        return False  # Only created via CSV import process


@admin.register(AdjustmentAuditLog)
class AdjustmentAuditLogAdmin(admin.ModelAdmin):
    """Admin interface for adjustment audit logs"""
    list_display = ['invoice', 'adjustment_type', 'amount', 'created_by', 'created_at', 'effective_date']
    list_filter = ['adjustment_type', 'created_at', 'effective_date']
    search_fields = ['invoice__invoice_number', 'reason', 'notes']
    readonly_fields = ['created_at', 'pre_adjustment_total', 'post_adjustment_total']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Adjustment Details', {
            'fields': ('invoice', 'adjustment', 'adjustment_type', 'amount', 'reason', 'notes')
        }),
        ('Audit Information', {
            'fields': ('pre_adjustment_total', 'post_adjustment_total', 'effective_date')
        }),
        ('User Tracking', {
            'fields': ('created_by', 'created_at')
        }),
    )


@admin.register(UnderpaymentAlert)
class UnderpaymentAlertAdmin(admin.ModelAdmin):
    """Admin interface for underpayment alerts"""
    list_display = ['tenant', 'invoice', 'shortfall_amount', 'status', 'created_at']
    list_filter = ['status', 'created_at', 'acknowledged_at']
    search_fields = ['tenant__name', 'invoice__invoice_number', 'alert_message']
    readonly_fields = ['created_at', 'expected_amount', 'actual_amount', 'shortfall_amount']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Alert Details', {
            'fields': ('tenant', 'invoice', 'payment', 'bank_transaction', 'alert_message')
        }),
        ('Payment Information', {
            'fields': ('expected_amount', 'actual_amount', 'shortfall_amount')
        }),
        ('Status Tracking', {
            'fields': ('status', 'acknowledged_at', 'resolved_at', 'acknowledged_by')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    actions = ['acknowledge_alerts', 'resolve_alerts', 'dismiss_alerts']
    
    def acknowledge_alerts(self, request, queryset):
        """Acknowledge selected alerts"""
        updated = queryset.update(
            status='acknowledged',
            acknowledged_at=timezone.now(),
            acknowledged_by=request.user
        )
        self.message_user(request, f'{updated} alerts acknowledged successfully.')
    acknowledge_alerts.short_description = "Acknowledge selected alerts"
    
    def resolve_alerts(self, request, queryset):
        """Resolve selected alerts"""
        updated = queryset.update(
            status='resolved',
            resolved_at=timezone.now()
        )
        self.message_user(request, f'{updated} alerts resolved successfully.')
    resolve_alerts.short_description = "Resolve selected alerts"
    
    def dismiss_alerts(self, request, queryset):
        """Dismiss selected alerts"""
        updated = queryset.update(status='dismissed')
        self.message_user(request, f'{updated} alerts dismissed successfully.')
    dismiss_alerts.short_description = "Dismiss selected alerts"
