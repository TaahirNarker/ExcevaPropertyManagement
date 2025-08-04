from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from properties.models import Property
from tenants.models import Tenant
from leases.models import Lease
from users.models import CustomUser


class Invoice(models.Model):
    """
    Invoice model for managing property management invoices
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('locked', 'Locked'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    # Basic invoice information
    invoice_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Relationships
    lease = models.ForeignKey('leases.Lease', on_delete=models.CASCADE, related_name='invoices')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='invoices')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    landlord = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='landlord_invoices', null=True, blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_invoices', null=True, blank=True)
    
    # Financial information
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Additional information
    notes = models.TextField(blank=True)
    email_subject = models.CharField(max_length=200, blank=True)
    email_recipient = models.EmailField(blank=True)
    bank_info = models.TextField(blank=True)
    extra_notes = models.TextField(blank=True)
    
    # Locking and audit fields
    is_locked = models.BooleanField(default=False, help_text="Invoice is locked and cannot be edited")
    locked_at = models.DateTimeField(null=True, blank=True, help_text="When the invoice was locked")
    locked_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='locked_invoices', help_text="User who locked the invoice")
    sent_at = models.DateTimeField(null=True, blank=True, help_text="When the invoice was sent")
    sent_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='sent_invoices', help_text="User who sent the invoice")
    
    # Invoice type for interim invoices
    INVOICE_TYPE_CHOICES = [
        ('regular', 'Regular Monthly Invoice'),
        ('interim', 'Interim Adjustment Invoice'),
        ('late_fee', 'Late Fee Invoice'),
        ('credit', 'Credit Note'),
    ]
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPE_CHOICES, default='regular')
    parent_invoice = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True,
                                     related_name='related_invoices', 
                                     help_text="Parent invoice for interim/adjustment invoices")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-issue_date', '-created_at']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.tenant.name}"
    
    def save(self, *args, **kwargs):
        # Auto-generate invoice number if not provided
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        
        # Calculate totals
        self.calculate_totals()
        super().save(*args, **kwargs)
    
    def calculate_totals(self):
        """Calculate subtotal, tax, and total amounts"""
        self.subtotal = sum(item.total for item in self.line_items.all())
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount
    
    def can_edit(self):
        """Check if invoice can be edited"""
        return not self.is_locked and self.status in ['draft']
    
    def can_send(self):
        """Check if invoice can be sent"""
        return not self.is_locked and self.status == 'draft'
    
    def can_delete(self):
        """Check if invoice can be deleted"""
        return not self.is_locked and self.status == 'draft'
    
    def lock_invoice(self, user):
        """Lock the invoice and prevent further edits"""
        from django.utils import timezone
        self.is_locked = True
        self.locked_at = timezone.now()
        self.locked_by = user
        self.status = 'locked'
        self.save()
        
        # Create audit log entry
        InvoiceAuditLog.objects.create(
            invoice=self,
            action='locked',
            user=user,
            details=f"Invoice {self.invoice_number} locked after sending"
        )
    
    def generate_invoice_number(self):
        """Generate unique sequential invoice number"""
        from django.db import transaction
        
        with transaction.atomic():
            # Get the last invoice number for this year
            current_year = timezone.now().year
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f"INV-{current_year}-"
            ).order_by('-invoice_number').first()
            
            if last_invoice:
                # Extract the sequence number
                try:
                    last_seq = int(last_invoice.invoice_number.split('-')[-1])
                    next_seq = last_seq + 1
                except (ValueError, IndexError):
                    next_seq = 1
            else:
                next_seq = 1
            
            return f"INV-{current_year}-{str(next_seq).zfill(6)}"


class InvoiceLineItem(models.Model):
    """
    Individual line items within an invoice
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=200)
    category = models.CharField(max_length=100, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Invoice Line Item'
        verbose_name_plural = 'Invoice Line Items'
    
    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Calculate total
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Update invoice totals
        self.invoice.calculate_totals()
        self.invoice.save()


class InvoiceAuditLog(models.Model):
    """
    Audit trail for all invoice changes
    """
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('sent', 'Sent'),
        ('locked', 'Locked'),
        ('paid', 'Marked as Paid'),
        ('cancelled', 'Cancelled'),
        ('unlocked', 'Unlocked (Admin Override)'),
        ('line_item_added', 'Line Item Added'),
        ('line_item_updated', 'Line Item Updated'),
        ('line_item_deleted', 'Line Item Deleted'),
        ('payment_recorded', 'Payment Recorded'),
    ]
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='invoice_actions')
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, help_text="Additional details about the change")
    
    # Store previous and new values for important changes
    field_changed = models.CharField(max_length=100, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    
    # Store full invoice state snapshot for critical changes
    invoice_snapshot = models.JSONField(null=True, blank=True, 
                                      help_text="Full invoice state at time of change")
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Invoice Audit Log'
        verbose_name_plural = 'Invoice Audit Logs'
        indexes = [
            models.Index(fields=['invoice', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.get_action_display()} by {self.user.get_full_name()}"


class InvoiceTemplate(models.Model):
    """
    Templates for creating invoices
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='invoice_templates')
    
    # Template content
    from_details = models.TextField(blank=True)
    to_details = models.TextField(blank=True)
    default_notes = models.TextField(blank=True)
    bank_info = models.TextField(blank=True)
    
    # Default line items
    default_line_items = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Invoice Template'
        verbose_name_plural = 'Invoice Templates'
    
    def __str__(self):
        return self.name


class InvoicePayment(models.Model):
    """
    Payment records for invoices
    """
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('other', 'Other'),
    ]
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Invoice Payment'
        verbose_name_plural = 'Invoice Payments'
    
    def __str__(self):
        return f"Payment {self.reference_number} - {self.invoice.invoice_number}"
