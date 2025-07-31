from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from users.models import CustomUser
from properties.models import Property
from tenants.models import Tenant


class Debtor(models.Model):
    """
    Debtor model for managing debt collection cases
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('escalated', 'Escalated'),
    ]

    # Basic information
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    
    # Debt information
    total_debt = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Assignment and tracking
    assigned_to = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_debtors')
    last_contact = models.DateTimeField(null=True, blank=True)
    next_action = models.CharField(max_length=200, blank=True)
    
    # Relationships (optional)
    property = models.ForeignKey(Property, on_delete=models.SET_NULL, null=True, blank=True, related_name='debtors')
    tenant = models.ForeignKey(Tenant, on_delete=models.SET_NULL, null=True, blank=True, related_name='debt_cases')
    
    # Notes and additional information
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_debtors', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Debtor'
        verbose_name_plural = 'Debtors'
    
    def __str__(self):
        return f"{self.name} - ${self.total_debt}"
    
    def update_last_contact(self):
        """Update the last contact timestamp"""
        self.last_contact = timezone.now()
        self.save(update_fields=['last_contact'])


class DebtDocument(models.Model):
    """
    Documents related to debt collection cases
    """
    DOCUMENT_TYPES = [
        ('contract', 'Contract'),
        ('invoice', 'Invoice'),
        ('payment_proof', 'Payment Proof'),
        ('legal_document', 'Legal Document'),
        ('correspondence', 'Correspondence'),
        ('other', 'Other'),
    ]
    
    debtor = models.ForeignKey(Debtor, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='other')
    file = models.FileField(upload_to='debt_documents/')
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='uploaded_debt_documents')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Debt Document'
        verbose_name_plural = 'Debt Documents'
    
    def __str__(self):
        return f"{self.name} - {self.debtor.name}"


class DebtAuditLog(models.Model):
    """
    Audit trail for debt collection actions
    """
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('contacted', 'Contacted'),
        ('payment_received', 'Payment Received'),
        ('escalated', 'Escalated'),
        ('resolved', 'Resolved'),
        ('note_added', 'Note Added'),
        ('document_uploaded', 'Document Uploaded'),
        ('status_changed', 'Status Changed'),
    ]
    
    debtor = models.ForeignKey(Debtor, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    performed_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='debt_actions')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Additional details
    details = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Debt Audit Log'
        verbose_name_plural = 'Debt Audit Logs'
    
    def __str__(self):
        return f"{self.debtor.name} - {self.get_action_display()} by {self.performed_by.get_full_name()}"


class DebtPayment(models.Model):
    """
    Payment records for debt collection
    """
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('other', 'Other'),
    ]
    
    debtor = models.ForeignKey(Debtor, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='recorded_debt_payments', null=True, blank=True)
    
    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Debt Payment'
        verbose_name_plural = 'Debt Payments'
    
    def __str__(self):
        return f"Payment ${self.amount} - {self.debtor.name}"
    
    def save(self, *args, **kwargs):
        # Update debtor's total debt when payment is recorded
        super().save(*args, **kwargs)
        
        # Update debtor's total debt
        total_payments = self.debtor.payments.aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        # Calculate remaining debt (assuming original debt is stored separately)
        # This is a simplified calculation - you might want to store original debt amount
        remaining_debt = max(0, self.debtor.total_debt - total_payments)
        
        # Update debtor status if debt is fully paid
        if remaining_debt <= 0:
            self.debtor.status = 'resolved'
            self.debtor.save(update_fields=['status']) 