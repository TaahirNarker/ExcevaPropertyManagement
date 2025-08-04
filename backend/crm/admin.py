from django.contrib import admin
from .models import Lead, Contact, Communication, Task


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'source', 'status', 'assigned_to', 'created_at']
    list_filter = ['status', 'source', 'assigned_to', 'created_at']
    search_fields = ['name', 'email', 'phone']
    readonly_fields = ['created_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'type', 'status', 'created_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['name', 'email', 'phone']
    readonly_fields = ['created_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = ['type', 'subject', 'contact', 'date', 'created_by']
    list_filter = ['type', 'date', 'created_by']
    search_fields = ['subject', 'content', 'contact__name']
    readonly_fields = ['created_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'assigned_to', 'due_date', 'contact']
    list_filter = ['status', 'priority', 'assigned_to', 'due_date']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'created_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
