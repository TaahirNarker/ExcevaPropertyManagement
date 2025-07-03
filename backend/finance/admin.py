from django.contrib import admin
from .models import Invoice, Payment, FinancialSummary


class PaymentInline(admin.TabularInline):
    """Inline admin for payments within invoice admin"""
    model = Payment
    extra = 0
    fields = ('payment_reference', 'amount', 'payment_date', 'payment_method', 'is_verified')
    readonly_fields = ('payment_reference', 'created_at', 'updated_at')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """
    Admin configuration for Invoice model
    """
    list_display = ('invoice_number', 'lease', 'invoice_type', 'amount', 'amount_paid', 'outstanding_amount', 'status', 'due_date', 'is_overdue')
    list_filter = ('status', 'invoice_type', 'is_recurring', 'auto_generated', 'due_date', 'issue_date')
    search_fields = ('invoice_number', 'lease__tenant__name', 'lease__unit__unit_number', 'lease__unit__property__name')
    ordering = ('-issue_date',)
    readonly_fields = (
        'invoice_number', 'created_at', 'updated_at', 'outstanding_amount', 'total_amount',
        'is_paid', 'is_overdue', 'days_overdue'
    )
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_number', 'lease', 'invoice_type', 'status')
        }),
        ('Financial Details', {
            'fields': ('amount', 'amount_paid', 'outstanding_amount', 'total_amount', 'late_fee')
        }),
        ('Dates', {
            'fields': ('issue_date', 'due_date', 'billing_period_start', 'billing_period_end')
        }),
        ('Status Information', {
            'fields': ('is_paid', 'is_overdue', 'days_overdue'),
            'classes': ('collapse',)
        }),
        ('Auto-generation', {
            'fields': ('is_recurring', 'auto_generated'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('description', 'notes')
        }),
        ('Documents', {
            'fields': ('pdf_file',),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [PaymentInline]
    
    def get_queryset(self, request):
        """Optimize queryset with related lease and tenant"""
        return super().get_queryset(request).select_related('lease', 'lease__tenant', 'lease__unit', 'lease__unit__property')
    
    actions = ['mark_as_sent', 'mark_as_overdue', 'update_invoice_status']
    
    def mark_as_sent(self, request, queryset):
        """Mark selected invoices as sent"""
        queryset.update(status='sent')
        self.message_user(request, f"{queryset.count()} invoices marked as sent.")
    mark_as_sent.short_description = "Mark selected invoices as sent"
    
    def mark_as_overdue(self, request, queryset):
        """Mark selected invoices as overdue"""
        queryset.update(status='overdue')
        self.message_user(request, f"{queryset.count()} invoices marked as overdue.")
    mark_as_overdue.short_description = "Mark selected invoices as overdue"
    
    def update_invoice_status(self, request, queryset):
        """Update invoice status based on payments"""
        count = 0
        for invoice in queryset:
            invoice.update_status()
            count += 1
        self.message_user(request, f"{count} invoice statuses updated.")
    update_invoice_status.short_description = "Update invoice status based on payments"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """
    Admin configuration for Payment model
    """
    list_display = ('payment_reference', 'invoice', 'tenant', 'amount', 'payment_date', 'payment_method', 'is_verified', 'verified_by')
    list_filter = ('payment_method', 'is_verified', 'payment_date', 'created_at')
    search_fields = ('payment_reference', 'bank_reference', 'depositor_name', 'invoice__invoice_number', 'invoice__lease__tenant__name')
    ordering = ('-payment_date',)
    readonly_fields = ('payment_reference', 'created_at', 'updated_at', 'tenant', 'property_unit')
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_reference', 'invoice', 'amount', 'payment_date', 'payment_method')
        }),
        ('Transaction Details', {
            'fields': ('bank_reference', 'depositor_name')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verified_by', 'verified_date')
        }),
        ('Related Information', {
            'fields': ('tenant', 'property_unit'),
            'classes': ('collapse',)
        }),
        ('Documents', {
            'fields': ('proof_of_payment',),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('System Fields', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with related invoice and tenant"""
        return super().get_queryset(request).select_related(
            'invoice', 'invoice__lease', 'invoice__lease__tenant', 
            'invoice__lease__unit', 'invoice__lease__unit__property', 'verified_by'
        )
    
    actions = ['verify_payments', 'unverify_payments']
    
    def verify_payments(self, request, queryset):
        """Verify selected payments"""
        from django.utils import timezone
        count = queryset.update(
            is_verified=True,
            verified_by=request.user,
            verified_date=timezone.now()
        )
        self.message_user(request, f"{count} payments verified.")
    verify_payments.short_description = "Verify selected payments"
    
    def unverify_payments(self, request, queryset):
        """Unverify selected payments"""
        count = queryset.update(
            is_verified=False,
            verified_by=None,
            verified_date=None
        )
        self.message_user(request, f"{count} payments unverified.")
    unverify_payments.short_description = "Unverify selected payments"


@admin.register(FinancialSummary)
class FinancialSummaryAdmin(admin.ModelAdmin):
    """
    Admin configuration for FinancialSummary model
    """
    list_display = ('date', 'total_rent_due', 'total_rent_collected', 'total_outstanding', 'collection_rate', 'occupancy_rate', 'total_properties', 'total_units')
    list_filter = ('date', 'created_at')
    ordering = ('-date',)
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Date', {
            'fields': ('date',)
        }),
        ('Income Metrics', {
            'fields': ('total_rent_due', 'total_rent_collected', 'total_outstanding', 'collection_rate')
        }),
        ('Portfolio Metrics', {
            'fields': ('total_properties', 'total_units', 'occupied_units', 'occupancy_rate')
        }),
        ('System Fields', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Prevent manual addition - these should be auto-generated"""
        return False
