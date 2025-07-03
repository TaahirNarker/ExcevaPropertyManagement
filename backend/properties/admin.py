from django.contrib import admin
from .models import Property, Unit


class UnitInline(admin.TabularInline):
    """Inline admin for units within property admin"""
    model = Unit
    extra = 1
    fields = ('unit_number', 'unit_type', 'status', 'monthly_rent', 'size_sqm', 'is_active')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """
    Admin configuration for Property model
    """
    list_display = ('name', 'property_type', 'address', 'total_units', 'purchase_price', 'current_market_value', 'is_active', 'created_at')
    list_filter = ('property_type', 'is_active', 'created_at')
    search_fields = ('name', 'address', 'description')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at', 'total_rental_income', 'occupied_units_count', 'vacant_units_count', 'occupancy_rate')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'address', 'property_type', 'description')
        }),
        ('Financial Information', {
            'fields': ('purchase_price', 'current_market_value')
        }),
        ('Property Details', {
            'fields': ('total_units',)
        }),
        ('Documents & Media', {
            'fields': ('title_deed', 'compliance_certificate', 'property_image'),
            'classes': ('collapse',)
        }),
        ('Calculated Metrics', {
            'fields': ('total_rental_income', 'occupied_units_count', 'vacant_units_count', 'occupancy_rate'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [UnitInline]
    
    def get_queryset(self, request):
        """Optimize queryset with related units"""
        return super().get_queryset(request).prefetch_related('units')


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    """
    Admin configuration for Unit model
    """
    list_display = ('__str__', 'unit_type', 'status', 'monthly_rent', 'size_sqm', 'current_tenant', 'is_active')
    list_filter = ('unit_type', 'status', 'property_ref__property_type', 'is_active', 'created_at')
    search_fields = ('unit_number', 'property_ref__name', 'description')
    ordering = ('property_ref__name', 'unit_number')
    readonly_fields = ('created_at', 'updated_at', 'current_tenant', 'is_occupied', 'rent_per_sqm')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('property_ref', 'unit_number', 'unit_type', 'status')
        }),
        ('Financial Information', {
            'fields': ('monthly_rent', 'size_sqm', 'rent_per_sqm')
        }),
        ('Additional Details', {
            'fields': ('description', 'unit_image')
        }),
        ('Tenant Information', {
            'fields': ('current_tenant', 'is_occupied'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with related property and leases"""
        return super().get_queryset(request).select_related('property_ref').prefetch_related('leases__tenant')
