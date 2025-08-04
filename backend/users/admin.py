from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Admin interface for CustomUser model
    Provides easy management of users with all custom fields
    """
    
    # Fields to display in the user list
    list_display = [
        'email', 
        'first_name', 
        'last_name', 
        'role',
        'company',
        'has_passkey',
        'is_active', 
        'date_joined'
    ]
    
    # Fields to filter by
    list_filter = [
        'role',
        'company',
        'is_active', 
        'is_staff', 
        'date_joined',
        'last_login'
    ]
    
    # Fields to search
    search_fields = ['email', 'first_name', 'last_name', 'phone_number', 'company']
    
    # Default ordering
    ordering = ['-date_joined']
    
    # Fieldsets for the user edit form
    fieldsets = UserAdmin.fieldsets + (
        ('Property Management Info', {
            'fields': ('phone_number', 'company', 'role')
        }),
        ('Legacy Fields', {
            'fields': ('is_landlord', 'is_tenant'),
            'classes': ('collapse',),
            'description': 'Legacy fields for backward compatibility'
        }),
        ('WebAuthn/Passkeys', {
            'fields': ('webauthn_credentials',),
            'classes': ('collapse',),
        }),
    )
    
    # Fields to show when adding a new user
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'email', 'phone_number')
        }),
        ('Account Info', {
            'fields': ('company', 'role')
        }),
    )
    
    # Make webauthn_credentials read-only for safety
    readonly_fields = ['webauthn_credentials']
    
    def has_passkey(self, obj):
        """Display if user has a registered passkey"""
        return bool(obj.webauthn_credentials)
    has_passkey.boolean = True
    has_passkey.short_description = 'Has Passkey'
