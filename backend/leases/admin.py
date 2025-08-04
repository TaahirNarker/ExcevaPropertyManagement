from django.contrib import admin
from .models import Lease, LeaseAttachment


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'tenant', 'property', 'start_date', 'end_date', 'monthly_rent', 'status', 'created_at']
    list_filter = ['status', 'start_date', 'end_date', 'created_at']
    search_fields = ['tenant__user__first_name', 'tenant__user__last_name', 'property__name', 'property__property_code']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant', 'property', 'start_date', 'end_date')
        }),
        ('Financial Information', {
            'fields': ('monthly_rent', 'deposit_amount')
        }),
        ('Status & Terms', {
            'fields': ('status', 'terms')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']


@admin.register(LeaseAttachment)
class LeaseAttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'lease', 'title', 'file_type', 'uploaded_by', 'uploaded_at', 'is_public']
    list_filter = ['file_type', 'is_public', 'uploaded_at']
    search_fields = ['title', 'description', 'lease__tenant__user__first_name', 'lease__property__name']
    date_hierarchy = 'uploaded_at'
    ordering = ['-uploaded_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('lease', 'title', 'description')
        }),
        ('File Information', {
            'fields': ('file', 'file_type', 'file_size')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'uploaded_at', 'is_public')
        }),
    )
    
    readonly_fields = ['uploaded_at', 'file_size']
