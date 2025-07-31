from django.contrib import admin
from .models import Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment, InvoiceAuditLog


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
    list_display = ['invoice', 'amount', 'payment_date', 'payment_method']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['invoice__invoice_number', 'reference_number']
