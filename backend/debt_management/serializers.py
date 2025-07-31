from rest_framework import serializers
from .models import Debtor, DebtDocument, DebtAuditLog, DebtPayment


class DebtorSerializer(serializers.ModelSerializer):
    """Serializer for Debtor model"""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
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
        if obj.last_contact:
            return obj.last_contact.strftime('%Y-%m-%d %H:%M')
        return None
    
    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M')
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class DebtorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for debtor list view"""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    last_contact_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Debtor
        fields = [
            'id', 'name', 'email', 'phone', 'total_debt', 'status',
            'assigned_to_name', 'last_contact_formatted', 'next_action'
        ]
    
    def get_last_contact_formatted(self, obj):
        if obj.last_contact:
            return obj.last_contact.strftime('%Y-%m-%d')
        return 'Never'


class DebtDocumentSerializer(serializers.ModelSerializer):
    """Serializer for DebtDocument model"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
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
        return obj.uploaded_at.strftime('%Y-%m-%d %H:%M')
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
    
    def create(self, validated_data):
        # Set the uploaded_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class DebtAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for DebtAuditLog model"""
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    timestamp_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DebtAuditLog
        fields = [
            'id', 'debtor', 'action', 'description', 'performed_by', 'performed_by_name',
            'timestamp', 'timestamp_formatted', 'details'
        ]
        read_only_fields = ['id', 'timestamp', 'performed_by']
    
    def get_timestamp_formatted(self, obj):
        return obj.timestamp.strftime('%Y-%m-%d %H:%M')
    
    def create(self, validated_data):
        # Set the performed_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['performed_by'] = request.user
        return super().create(validated_data)


class DebtPaymentSerializer(serializers.ModelSerializer):
    """Serializer for DebtPayment model"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    payment_date_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DebtPayment
        fields = [
            'id', 'debtor', 'amount', 'payment_date', 'payment_date_formatted',
            'payment_method', 'reference_number', 'notes', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_payment_date_formatted(self, obj):
        return obj.payment_date.strftime('%Y-%m-%d')
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class DebtorDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for debtor with related data"""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
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
        return sum(payment.amount for payment in obj.payments.all())
    
    def get_remaining_debt(self, obj):
        total_paid = self.get_total_paid(obj)
        return max(0, float(obj.total_debt) - total_paid) 