"""
Admin interface for the Properties app
Provides Django admin configuration for property management
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Property, PropertyImage, PropertyDocument


class PropertyImageInline(admin.TabularInline):
    """Inline admin for property images"""
    model = PropertyImage
    extra = 1
    fields = ('image_url', 'image_file', 'title', 'is_primary', 'order')
    ordering = ['order', 'created_at']


class PropertyDocumentInline(admin.TabularInline):
    """Inline admin for property documents"""
    model = PropertyDocument
    extra = 1
    fields = ('document_type', 'title', 'file_url', 'file_upload')
    ordering = ['-created_at']


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Admin interface for Property model"""
    
    # List display
    list_display = [
        'property_code', 'name', 'property_type_display', 'status_badge',
        'city', 'province_display', 'bedrooms', 'monthly_rental_amount',
        'owner_name', 'is_active', 'created_at'
    ]
    
    # List filters
    list_filter = [
        'property_type', 'status', 'province', 'is_active',
        'bedrooms', 'bathrooms', 'created_at', 'updated_at'
    ]
    
    # Search fields
    search_fields = [
        'property_code', 'name', 'street_address', 'city',
        'suburb', 'owner__email', 'owner__first_name', 'owner__last_name'
    ]
    
    # Filter by owner/manager
    list_select_related = ['owner', 'property_manager']
    
    # Pagination
    list_per_page = 25
    
    # Ordering
    ordering = ['-created_at']
    
    # Read-only fields
    readonly_fields = [
        'property_code', 'created_at', 'updated_at', 'display_name',
        'full_address', 'occupancy_info_display'
    ]
    
    # Fieldsets for organized form layout
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'property_code', 'name', 'property_type', 'description',
                'display_name', 'status', 'is_active'
            )
        }),
        ('Address Information', {
            'fields': (
                'street_address', 'suburb', 'city', 'province',
                'postal_code', 'country', 'full_address'
            )
        }),
        ('Property Details', {
            'fields': (
                'bedrooms', 'bathrooms', 'square_meters', 'parking_spaces'
            ),
            'classes': ('collapse',)
        }),
        ('Financial Information', {
            'fields': (
                'purchase_price', 'current_market_value', 'monthly_rental_amount'
            ),
            'classes': ('collapse',)
        }),
        ('Management', {
            'fields': (
                'owner', 'property_manager', 'occupancy_info_display'
            )
        }),
        ('Media & Documents', {
            'fields': (
                'primary_image', 'images', 'documents'
            ),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': (
                'features',
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (
                'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    # Inlines
    inlines = [PropertyImageInline, PropertyDocumentInline]
    
    # Actions
    actions = ['make_active', 'make_inactive', 'mark_as_vacant', 'mark_as_occupied']
    
    def property_type_display(self, obj):
        """Display property type with color coding"""
        colors = {
            'house': '#28a745',
            'flat': '#17a2b8',
            'apartment': '#17a2b8',
            'business': '#ffc107',
            'retail': '#fd7e14',
            'office': '#6f42c1',
            'industrial': '#6c757d',
            'commercial': '#dc3545',
            'land': '#20c997',
            'other': '#6c757d',
        }
        color = colors.get(obj.property_type, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_property_type_display()
        )
    property_type_display.short_description = 'Type'
    property_type_display.admin_order_field = 'property_type'
    
    def status_badge(self, obj):
        """Display status with colored badge"""
        colors = {
            'vacant': '#28a745',
            'occupied': '#dc3545',
            'maintenance': '#ffc107',
            'reserved': '#17a2b8',
            'sold': '#6c757d',
            'inactive': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def province_display(self, obj):
        """Display province"""
        return obj.get_province_display()
    province_display.short_description = 'Province'
    province_display.admin_order_field = 'province'
    
    def owner_name(self, obj):
        """Display owner name with link"""
        if obj.owner:
            url = reverse('admin:users_customuser_change', args=[obj.owner.pk])
            return format_html('<a href="{}">{}</a>', url, obj.owner.get_full_name())
        return '-'
    owner_name.short_description = 'Owner'
    owner_name.admin_order_field = 'owner'
    
    def occupancy_info_display(self, obj):
        """Display occupancy information"""
        info = obj.occupancy_info
        if info['details']:
            return info['details']
        return info['status']
    occupancy_info_display.short_description = 'Occupancy'
    
    # Actions
    def make_active(self, request, queryset):
        """Mark selected properties as active"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} properties marked as active.')
    make_active.short_description = 'Mark selected properties as active'
    
    def make_inactive(self, request, queryset):
        """Mark selected properties as inactive"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} properties marked as inactive.')
    make_inactive.short_description = 'Mark selected properties as inactive'
    
    def mark_as_vacant(self, request, queryset):
        """Mark selected properties as vacant"""
        updated = queryset.update(status='vacant')
        self.message_user(request, f'{updated} properties marked as vacant.')
    mark_as_vacant.short_description = 'Mark selected properties as vacant'
    
    def mark_as_occupied(self, request, queryset):
        """Mark selected properties as occupied"""
        updated = queryset.update(status='occupied')
        self.message_user(request, f'{updated} properties marked as occupied.')
    mark_as_occupied.short_description = 'Mark selected properties as occupied'


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    """Admin interface for PropertyImage model"""
    
    list_display = [
        'property_link', 'title', 'is_primary', 'order', 'image_preview', 'created_at'
    ]
    
    list_filter = ['is_primary', 'created_at', 'property__property_type']
    
    search_fields = [
        'title', 'description', 'property__name', 'property__property_code'
    ]
    
    list_select_related = ['property']
    
    ordering = ['property', 'order', 'created_at']
    
    readonly_fields = ['created_at', 'updated_at', 'image_preview']
    
    fieldsets = (
        ('Image Information', {
            'fields': ('property', 'title', 'description')
        }),
        ('Image File', {
            'fields': ('image_url', 'image_file', 'image_preview')
        }),
        ('Display Options', {
            'fields': ('is_primary', 'order')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def property_link(self, obj):
        """Display property link"""
        url = reverse('admin:properties_property_change', args=[obj.property.pk])
        return format_html('<a href="{}">{}</a>', url, obj.property.property_code)
    property_link.short_description = 'Property'
    property_link.admin_order_field = 'property'
    
    def image_preview(self, obj):
        """Display image preview"""
        if obj.image_file:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.image_file.url
            )
        elif obj.image_url:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.image_url
            )
        return 'No image'
    image_preview.short_description = 'Preview'


@admin.register(PropertyDocument)
class PropertyDocumentAdmin(admin.ModelAdmin):
    """Admin interface for PropertyDocument model"""
    
    list_display = [
        'property_link', 'title', 'document_type_display', 'uploaded_by_name', 'created_at'
    ]
    
    list_filter = ['document_type', 'created_at', 'property__property_type']
    
    search_fields = [
        'title', 'description', 'property__name', 'property__property_code'
    ]
    
    list_select_related = ['property', 'uploaded_by']
    
    ordering = ['-created_at']
    
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Document Information', {
            'fields': ('property', 'document_type', 'title', 'description')
        }),
        ('Document File', {
            'fields': ('file_url', 'file_upload')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def property_link(self, obj):
        """Display property link"""
        url = reverse('admin:properties_property_change', args=[obj.property.pk])
        return format_html('<a href="{}">{}</a>', url, obj.property.property_code)
    property_link.short_description = 'Property'
    property_link.admin_order_field = 'property'
    
    def document_type_display(self, obj):
        """Display document type"""
        return obj.get_document_type_display()
    document_type_display.short_description = 'Type'
    document_type_display.admin_order_field = 'document_type'
    
    def uploaded_by_name(self, obj):
        """Display uploaded by name"""
        if obj.uploaded_by:
            url = reverse('admin:users_customuser_change', args=[obj.uploaded_by.pk])
            return format_html('<a href="{}">{}</a>', url, obj.uploaded_by.get_full_name())
        return '-'
    uploaded_by_name.short_description = 'Uploaded By'
    uploaded_by_name.admin_order_field = 'uploaded_by'
