from django.contrib import admin
from .models import Tenant, TenantDocument, TenantCommunication

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['tenant_code', 'get_full_name', 'email', 'phone', 'status', 'created_at']
    list_filter = ['status', 'employment_status', 'created_at']
    search_fields = ['tenant_code', 'user__first_name', 'user__last_name', 'email', 'phone']
    readonly_fields = ['tenant_code', 'created_at', 'updated_at']
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'


@admin.register(TenantDocument)
class TenantDocumentAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'name', 'document_type', 'uploaded_at', 'expires_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['tenant__tenant_code', 'name']
    readonly_fields = ['uploaded_at']


@admin.register(TenantCommunication)
class TenantCommunicationAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'type', 'subject', 'date', 'created_by']
    list_filter = ['type', 'date']
    search_fields = ['tenant__tenant_code', 'subject', 'content']
    readonly_fields = ['created_by']
