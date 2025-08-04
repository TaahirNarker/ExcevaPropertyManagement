from rest_framework import serializers
from .models import Lead, Contact, Communication, Task


class LeadSerializer(serializers.ModelSerializer):
    """Serializer for Lead model"""
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    last_contact_formatted = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'email', 'phone', 'source', 'status',
            'assigned_to', 'assigned_to_name', 'created_at', 'created_at_formatted',
            'last_contact', 'last_contact_formatted', 'notes', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_last_contact_formatted(self, obj):
        try:
            if obj.last_contact:
                return obj.last_contact.strftime('%Y-%m-%d %H:%M')
            return None
        except Exception as e:
            print(f"Error formatting last_contact for lead {obj.id}: {e}")
            return None
    
    def get_created_at_formatted(self, obj):
        try:
            return obj.created_at.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting created_at for lead {obj.id}: {e}")
            return 'Unknown'
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for lead {obj.id}: {e}")
            return None
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for lead {obj.id}: {e}")
            return None
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class LeadListSerializer(serializers.ModelSerializer):
    """Simplified serializer for lead list view"""
    assigned_to_name = serializers.SerializerMethodField()
    last_contact_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'email', 'phone', 'source', 'status',
            'assigned_to_name', 'last_contact_formatted', 'created_at'
        ]
    
    def get_last_contact_formatted(self, obj):
        try:
            if obj.last_contact:
                return obj.last_contact.strftime('%Y-%m-%d')
            return 'Never'
        except Exception as e:
            print(f"Error formatting last_contact for lead list {obj.id}: {e}")
            return 'Never'
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for lead list {obj.id}: {e}")
            return None


class ContactSerializer(serializers.ModelSerializer):
    """Serializer for Contact model"""
    created_by_name = serializers.SerializerMethodField()
    last_contact_formatted = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'email', 'phone', 'type', 'status',
            'created_at', 'created_at_formatted', 'last_contact', 'last_contact_formatted',
            'notes', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_last_contact_formatted(self, obj):
        try:
            if obj.last_contact:
                return obj.last_contact.strftime('%Y-%m-%d %H:%M')
            return None
        except Exception as e:
            print(f"Error formatting last_contact for contact {obj.id}: {e}")
            return None
    
    def get_created_at_formatted(self, obj):
        try:
            return obj.created_at.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting created_at for contact {obj.id}: {e}")
            return 'Unknown'
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for contact {obj.id}: {e}")
            return None
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ContactListSerializer(serializers.ModelSerializer):
    """Simplified serializer for contact list view"""
    last_contact_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'email', 'phone', 'type', 'status',
            'last_contact_formatted', 'created_at'
        ]
    
    def get_last_contact_formatted(self, obj):
        try:
            if obj.last_contact:
                return obj.last_contact.strftime('%Y-%m-%d')
            return 'Never'
        except Exception as e:
            print(f"Error formatting last_contact for contact list {obj.id}: {e}")
            return 'Never'


class CommunicationSerializer(serializers.ModelSerializer):
    """Serializer for Communication model"""
    created_by_name = serializers.SerializerMethodField()
    date_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Communication
        fields = [
            'id', 'type', 'date', 'date_formatted', 'subject', 'content',
            'contact', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_date_formatted(self, obj):
        try:
            return obj.date.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting date for communication {obj.id}: {e}")
            return 'Unknown'
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for communication {obj.id}: {e}")
            return None
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model"""
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    due_date_formatted = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'due_date', 'due_date_formatted',
            'assigned_to', 'assigned_to_name', 'contact', 'created_at', 'created_at_formatted',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_due_date_formatted(self, obj):
        try:
            return obj.due_date.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting due_date for task {obj.id}: {e}")
            return 'Unknown'
    
    def get_created_at_formatted(self, obj):
        try:
            return obj.created_at.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting created_at for task {obj.id}: {e}")
            return 'Unknown'
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for task {obj.id}: {e}")
            return None
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for task {obj.id}: {e}")
            return None
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """Simplified serializer for task list view"""
    assigned_to_name = serializers.SerializerMethodField()
    due_date_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'status', 'priority', 'due_date_formatted',
            'assigned_to_name', 'created_at'
        ]
    
    def get_due_date_formatted(self, obj):
        try:
            return obj.due_date.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"Error formatting due_date for task list {obj.id}: {e}")
            return 'Unknown'
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for task list {obj.id}: {e}")
            return None 