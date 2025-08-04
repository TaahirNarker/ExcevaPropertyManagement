from rest_framework import serializers
from .models import Debtor, DebtDocument, DebtAuditLog, DebtPayment


class DebtorSerializer(serializers.ModelSerializer):
    """Serializer for Debtor model"""
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    last_contact_formatted = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Debtor
        fields = [
            'id', 'name', 'email', 'phone', 'address', 'total_debt', 'status',
            'assigned_to', 'assigned_to_name', 'last_contact', 'last_contact_formatted',
            'next_action', 'property', 'tenant', 'notes', 'created_at', 'created_at_formatted',
            'created_by', 'created_by_name', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_last_contact_formatted(self, obj):
        try:
            if obj.last_contact:
                return obj.last_contact.strftime('%Y-%m-%d %H:%M')
            return None
        except Exception as e:
            print(f"Error formatting last_contact for debtor {obj.id}: {e}")
            return None
    
    def get_created_at_formatted(self, obj):
        try:
            return obj.created_at.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting created_at for debtor {obj.id}: {e}")
            return 'Unknown'
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for debtor {obj.id}: {e}")
            return None
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for debtor {obj.id}: {e}")
            return None
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class DebtorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for debtor list view"""
    assigned_to_name = serializers.SerializerMethodField()
    last_contact_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Debtor
        fields = [
            'id', 'name', 'email', 'phone', 'total_debt', 'status',
            'assigned_to_name', 'last_contact_formatted', 'next_action'
        ]
    
    def get_last_contact_formatted(self, obj):
        try:
            if obj.last_contact:
                return obj.last_contact.strftime('%Y-%m-%d')
            return 'Never'
        except Exception as e:
            print(f"Error formatting last_contact for debtor list {obj.id}: {e}")
            return 'Never'
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for debtor list {obj.id}: {e}")
            return None


class DebtDocumentSerializer(serializers.ModelSerializer):
    """Serializer for DebtDocument model"""
    uploaded_by_name = serializers.SerializerMethodField()
    uploaded_at_formatted = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DebtDocument
        fields = [
            'id', 'debtor', 'name', 'document_type', 'file', 'file_url',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'uploaded_at_formatted'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by']
    
    def get_uploaded_at_formatted(self, obj):
        try:
            return obj.uploaded_at.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting uploaded_at for document {obj.id}: {e}")
            return 'Unknown'
    
    def get_file_url(self, obj):
        try:
            if obj.file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.file.url)
            return None
        except Exception as e:
            print(f"Error getting file_url for document {obj.id}: {e}")
            return None
    
    def get_uploaded_by_name(self, obj):
        try:
            if obj.uploaded_by:
                return obj.uploaded_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting uploaded_by_name for debt document {obj.id}: {e}")
            return None
    
    def create(self, validated_data):
        # Set the uploaded_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class DebtAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for DebtAuditLog model"""
    performed_by_name = serializers.SerializerMethodField()
    timestamp_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DebtAuditLog
        fields = [
            'id', 'debtor', 'action', 'description', 'performed_by', 'performed_by_name',
            'timestamp', 'timestamp_formatted', 'details'
        ]
        read_only_fields = ['id', 'timestamp', 'performed_by']
    
    def get_timestamp_formatted(self, obj):
        try:
            return obj.timestamp.strftime('%Y-%m-%d %H:%M')
        except Exception as e:
            print(f"Error formatting timestamp for audit log {obj.id}: {e}")
            return 'Unknown'
    
    def create(self, validated_data):
        # Set the performed_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['performed_by'] = request.user
        return super().create(validated_data)
    
    def get_performed_by_name(self, obj):
        try:
            if obj.performed_by:
                return obj.performed_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting performed_by_name for audit log {obj.id}: {e}")
            return None


class DebtPaymentSerializer(serializers.ModelSerializer):
    """Serializer for DebtPayment model"""
    created_by_name = serializers.SerializerMethodField()
    payment_date_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DebtPayment
        fields = [
            'id', 'debtor', 'amount', 'payment_date', 'payment_date_formatted',
            'payment_method', 'reference_number', 'notes', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_payment_date_formatted(self, obj):
        try:
            return obj.payment_date.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"Error formatting payment_date for payment {obj.id}: {e}")
            return 'Unknown'
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for debt payment {obj.id}: {e}")
            return None


class DebtorDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for debtor with related data"""
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    documents = DebtDocumentSerializer(many=True, read_only=True)
    audit_logs = DebtAuditLogSerializer(many=True, read_only=True)
    payments = DebtPaymentSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    remaining_debt = serializers.SerializerMethodField()
    
    class Meta:
        model = Debtor
        fields = [
            'id', 'name', 'email', 'phone', 'address', 'total_debt', 'status',
            'assigned_to', 'assigned_to_name', 'last_contact', 'next_action',
            'property', 'tenant', 'notes', 'created_at', 'created_by', 'created_by_name',
            'updated_at', 'documents', 'audit_logs', 'payments', 'total_paid', 'remaining_debt'
        ]
    
    def get_total_paid(self, obj):
        try:
            return sum(payment.amount for payment in obj.payments.all())
        except Exception as e:
            print(f"Error calculating total_paid for debtor {obj.id}: {e}")
            return 0
    
    def get_remaining_debt(self, obj):
        try:
            total_paid = self.get_total_paid(obj)
            return max(0, float(obj.total_debt) - total_paid)
        except Exception as e:
            print(f"Error calculating remaining_debt for debtor {obj.id}: {e}")
            return float(obj.total_debt) if obj.total_debt else 0
    
    def get_assigned_to_name(self, obj):
        try:
            if obj.assigned_to:
                return obj.assigned_to.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting assigned_to_name for debtor detail {obj.id}: {e}")
            return None
    
    def get_created_by_name(self, obj):
        try:
            if obj.created_by:
                return obj.created_by.get_full_name()
            return None
        except Exception as e:
            print(f"Error getting created_by_name for debtor detail {obj.id}: {e}")
            return None 