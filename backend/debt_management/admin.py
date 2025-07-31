from django.contrib import admin
from .models import Debtor, DebtDocument, DebtAuditLog, DebtPayment


@admin.register(Debtor)
class DebtorAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'total_debt', 'status', 'assigned_to', 'created_at']
    list_filter = ['status', 'assigned_to', 'created_at']
    search_fields = ['name', 'email', 'phone']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'email', 'phone', 'address')
        }),
        ('Debt Information', {
            'fields': ('total_debt', 'status', 'next_action')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'property', 'tenant')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DebtDocument)
class DebtDocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'debtor', 'document_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at', 'uploaded_by']
    search_fields = ['name', 'debtor__name']
    readonly_fields = ['uploaded_at', 'uploaded_by']


@admin.register(DebtAuditLog)
class DebtAuditLogAdmin(admin.ModelAdmin):
    list_display = ['debtor', 'action', 'performed_by', 'timestamp']
    list_filter = ['action', 'timestamp', 'performed_by']
    search_fields = ['debtor__name', 'description']
    readonly_fields = ['timestamp', 'performed_by']
    ordering = ['-timestamp']


@admin.register(DebtPayment)
class DebtPaymentAdmin(admin.ModelAdmin):
    list_display = ['debtor', 'amount', 'payment_date', 'payment_method', 'created_by']
    list_filter = ['payment_method', 'payment_date', 'created_by']
    search_fields = ['debtor__name', 'reference_number']
    readonly_fields = ['created_at', 'created_by'] 