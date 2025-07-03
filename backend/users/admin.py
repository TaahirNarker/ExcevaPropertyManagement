from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Custom admin configuration for CustomUser model
    """
    list_display = ('username', 'email', 'role', 'company', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'company')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Property Control System', {
            'fields': ('role', 'phone_number', 'company'),
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Property Control System', {
            'fields': ('role', 'phone_number', 'company'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def get_form(self, request, obj=None, **kwargs):
        """Override form to show additional fields in change view"""
        form = super().get_form(request, obj, **kwargs)
        if obj:  # Editing existing user
            self.readonly_fields = ('created_at', 'updated_at')
        return form
