from django.contrib import admin
from .models import Tenant, Lease


class LeaseInline(admin.TabularInline):
    """Inline admin for leases within tenant admin"""
    model = Lease
    extra = 0
    fields = ('unit', 'start_date', 'end_date', 'monthly_rent', 'status', 'is_active')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    """
    Admin configuration for Tenant model
    """
    list_display = ('name', 'tenant_type', 'email', 'phone_number', 'employer', 'total_monthly_rent', 'has_outstanding_payments', 'is_active')
    list_filter = ('tenant_type', 'is_active', 'created_at')
    search_fields = ('name', 'email', 'phone_number', 'id_number', 'company_registration')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at', 'current_leases', 'total_monthly_rent', 'has_outstanding_payments')
    
    fieldsets = (
        ('Personal/Company Information', {
            'fields': ('name', 'tenant_type', 'id_number', 'company_registration')
        }),
        ('Contact Information', {
            'fields': ('email', 'phone_number', 'alternative_phone', 'postal_address')
        }),
        ('Employment/Business Information', {
            'fields': ('employer', 'monthly_income')
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone'),
            'classes': ('collapse',)
        }),
        ('Documents', {
            'fields': ('id_document', 'proof_of_income'),
            'classes': ('collapse',)
        }),
        ('Lease Summary', {
            'fields': ('current_leases', 'total_monthly_rent', 'has_outstanding_payments'),
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
    
    inlines = [LeaseInline]
    
    def get_queryset(self, request):
        """Optimize queryset with related leases"""
        return super().get_queryset(request).prefetch_related('leases')


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    """
    Admin configuration for Lease model
    """
    list_display = ('__str__', 'tenant', 'unit', 'start_date', 'end_date', 'monthly_rent', 'status', 'days_remaining', 'is_active')
    list_filter = ('status', 'payment_frequency', 'is_active', 'start_date', 'end_date')
    search_fields = ('tenant__name', 'unit__unit_number', 'unit__property__name')
    ordering = ('-start_date',)
    readonly_fields = (
        'created_at', 'updated_at', 'is_current', 'days_remaining', 'is_expiring_soon',
        'total_rent_due', 'total_rent_paid', 'outstanding_amount'
    )
    
    fieldsets = (
        ('Lease Parties', {
            'fields': ('tenant', 'unit')
        }),
        ('Lease Terms', {
            'fields': ('start_date', 'end_date', 'monthly_rent', 'security_deposit', 'status')
        }),
        ('Payment Terms', {
            'fields': ('rent_due_day', 'payment_frequency')
        }),
        ('Escalation Terms', {
            'fields': ('annual_escalation_rate', 'escalation_date'),
            'classes': ('collapse',)
        }),
        ('Documents', {
            'fields': ('signed_lease',),
            'classes': ('collapse',)
        }),
        ('Financial Summary', {
            'fields': ('total_rent_due', 'total_rent_paid', 'outstanding_amount'),
            'classes': ('collapse',)
        }),
        ('Lease Status', {
            'fields': ('is_current', 'days_remaining', 'is_expiring_soon'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('special_terms', 'notes')
        }),
        ('System Fields', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with related tenant and unit"""
        return super().get_queryset(request).select_related('tenant', 'unit', 'unit__property')
    
    def save_model(self, request, obj, form, change):
        """Override save to handle unit status updates"""
        super().save_model(request, obj, form, change)
        # The model's save method will handle unit status updates
