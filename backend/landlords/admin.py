from django.contrib import admin
from django.utils.html import format_html
from .models import Landlord

@admin.register(Landlord)
class LandlordAdmin(admin.ModelAdmin):
    """
    Admin interface for Landlord model.
    """
    list_display = [
        'name', 'email', 'type', 'status', 'company_name', 
        'phone', 'properties_count', 'total_rental_income', 'created_at'
    ]
    list_filter = ['type', 'status', 'province', 'created_at']
    search_fields = ['name', 'email', 'company_name', 'phone']
    readonly_fields = ['id', 'created_at', 'updated_at', 'properties_count', 'total_rental_income']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'email', 'phone', 'type', 'status')
        }),
        ('Company/Trust Information', {
            'fields': ('company_name', 'vat_number'),
            'classes': ('collapse',),
            'description': 'Required for Company and Trust type landlords'
        }),
        ('Individual Information', {
            'fields': ('id_number', 'tax_number'),
            'classes': ('collapse',),
            'description': 'For Individual type landlords'
        }),
        ('Address Information', {
            'fields': (
                'street_address', 'address_line_2', 'suburb', 'city', 
                'province', 'postal_code', 'country'
            ),
            'classes': ('collapse',)
        }),
        ('Banking Information', {
            'fields': ('bank_name', 'account_number', 'branch_code', 'account_type'),
            'classes': ('collapse',),
            'description': 'Optional banking details for payment processing'
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def properties_count(self, obj):
        """Display properties count with link."""
        count = obj.get_properties_count()
        if count > 0:
            return format_html('<a href="?landlord_id={}">{}</a>', obj.id, count)
        return count
    properties_count.short_description = 'Properties'
    
    def total_rental_income(self, obj):
        """Display total rental income formatted."""
        income = obj.get_total_rental_income()
        return f"R {income:,.2f}" if income > 0 else "R 0.00"
    total_rental_income.short_description = 'Monthly Income'
    
    def get_queryset(self, request):
        """Optimize queryset with related data."""
        return super().get_queryset(request).select_related()
    
    def save_model(self, request, obj, form, change):
        """Custom save logic."""
        if not change:  # Creating new landlord
            obj.full_clean()  # Run validation
        super().save_model(request, obj, form, change)
    
    actions = ['activate_landlords', 'deactivate_landlords']
    
    def activate_landlords(self, request, queryset):
        """Activate selected landlords."""
        updated = queryset.update(status='Active')
        self.message_user(request, f'{updated} landlords were successfully activated.')
    activate_landlords.short_description = "Activate selected landlords"
    
    def deactivate_landlords(self, request, queryset):
        """Deactivate selected landlords."""
        updated = queryset.update(status='Inactive')
        self.message_user(request, f'{updated} landlords were successfully deactivated.')
    deactivate_landlords.short_description = "Deactivate selected landlords"
