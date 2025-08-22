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
    Enhanced to support comprehensive billing periods and payment tracking
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('queued', 'Queued to Send'),
        ('sent', 'Sent'),
        ('locked', 'Locked'),
        ('paid', 'Paid'),
        ('partially_paid', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    # Basic invoice information
    invoice_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Billing period information
    billing_period_start = models.DateField(null=True, blank=True, help_text="Start date of billing period")
    billing_period_end = models.DateField(null=True, blank=True, help_text="End date of billing period")
    
    # Queued sending information
    scheduled_send_date = models.DateField(null=True, blank=True, help_text="Date when invoice should be automatically sent")
    
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
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total amount paid towards this invoice")
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Remaining balance due")
    
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
        """Calculate subtotal, tax, total amounts, and balance due"""
        self.subtotal = sum(item.total for item in self.line_items.all())
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount
        
        # Calculate amount paid and balance due
        self.amount_paid = sum(payment.amount for payment in self.payments.all())
        self.balance_due = self.total_amount - self.amount_paid
        
        # Update status based on payment
        if self.balance_due <= 0 and self.amount_paid > 0:
            self.status = 'paid'
        elif self.amount_paid > 0 and self.balance_due > 0:
            self.status = 'partially_paid'
        elif self.due_date and self.due_date < timezone.now().date() and self.balance_due > 0:
            self.status = 'overdue'
    
    def can_edit(self):
        """Check if invoice can be edited"""
        return not self.is_locked and self.status in ['draft']
    
    def can_send(self):
        """Check if invoice can be sent"""
        return not self.is_locked and self.status == 'draft'
    
    def can_delete(self):
        """Check if invoice can be deleted"""
        return not self.is_locked and self.status == 'draft'
    
    def is_overdue(self):
        """Check if invoice is overdue"""
        return (self.due_date < timezone.now().date() and 
                self.status not in ['paid', 'cancelled'] and 
                self.balance_due > 0)
    
    def days_overdue(self):
        """Calculate days overdue"""
        if not self.is_overdue():
            return 0
        return (timezone.now().date() - self.due_date).days
    
    def calculate_late_fee(self):
        """Calculate late fee based on lease terms"""
        if not self.is_overdue() or not self.lease:
            return 0
        
        days_past_grace = self.days_overdue() - self.lease.grace_period_days
        if days_past_grace <= 0:
            return 0
        
        if self.lease.late_fee_type == 'percentage':
            return (self.lease.monthly_rent * self.lease.late_fee_percentage / 100)
        else:
            return self.lease.late_fee_amount
    
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
    Payment records for invoices with enhanced allocation support
    """
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('credit_balance', 'Credit Balance Application'),
        ('other', 'Other'),
    ]
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    # Payment allocation tracking
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Amount allocated to this specific invoice")
    is_overpayment = models.BooleanField(default=False, help_text="True if this payment exceeds the invoice total")
    
    # User who recorded the payment
    recorded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Invoice Payment'
        verbose_name_plural = 'Invoice Payments'
    
    def __str__(self):
        return f"Payment {self.reference_number} - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Set allocated amount to payment amount if not specified
        if not self.allocated_amount:
            self.allocated_amount = self.amount
            
        # Check if this is an overpayment
        if self.allocated_amount > self.invoice.balance_due:
            self.is_overpayment = True
            
        super().save(*args, **kwargs)
        
        # Update invoice payment totals
        self.invoice.calculate_totals()
        self.invoice.save()


class TenantCreditBalance(models.Model):
    """
    Track tenant credit balances for overpayments
    """
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='credit_balance')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Tenant Credit Balance'
        verbose_name_plural = 'Tenant Credit Balances'
    
    def __str__(self):
        return f"{self.tenant.name} - Credit Balance: R{self.balance}"
    
    def apply_credit_to_invoice(self, invoice, amount, user):
        """Apply credit balance to an invoice"""
        from decimal import Decimal
        
        if amount > self.balance:
            raise ValueError("Cannot apply more credit than available balance")
        
        if amount > invoice.balance_due:
            amount = invoice.balance_due
        
        # Create payment record for credit application
        payment = InvoicePayment.objects.create(
            invoice=invoice,
            tenant=self.tenant,
            amount=amount,
            allocated_amount=amount,
            payment_date=timezone.now().date(),
            payment_method='credit_balance',
            reference_number=f"CREDIT-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            notes=f"Credit balance applied to invoice {invoice.invoice_number}",
            recorded_by=user
        )
        
        # Reduce credit balance
        self.balance -= amount
        self.save()
        
        return payment


class RecurringCharge(models.Model):
    """
    Recurring charges that should be added to invoices
    """
    CHARGE_CATEGORY_CHOICES = [
        ('utility', 'Utility Charges'),
        ('maintenance', 'Maintenance'),
        ('parking', 'Parking'),
        ('storage', 'Storage'),
        ('insurance', 'Insurance'),
        ('other', 'Other'),
    ]
    
    lease = models.ForeignKey('leases.Lease', on_delete=models.CASCADE, related_name='recurring_charges')
    description = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CHARGE_CATEGORY_CHOICES, default='other')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'description']
        verbose_name = 'Recurring Charge'
        verbose_name_plural = 'Recurring Charges'
    
    def __str__(self):
        return f"{self.lease} - {self.description}: R{self.amount}"


class RentEscalationLog(models.Model):
    """
    Track historical rent changes and escalations
    """
    lease = models.ForeignKey('leases.Lease', on_delete=models.CASCADE, related_name='rent_escalations')
    previous_rent = models.DecimalField(max_digits=10, decimal_places=2)
    new_rent = models.DecimalField(max_digits=10, decimal_places=2)
    escalation_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    escalation_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    effective_date = models.DateField()
    reason = models.CharField(max_length=200, default='Annual Escalation')
    applied_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-effective_date']
        verbose_name = 'Rent Escalation Log'
        verbose_name_plural = 'Rent Escalation Logs'
    
    def __str__(self):
        return f"{self.lease} - Rent changed from R{self.previous_rent} to R{self.new_rent} on {self.effective_date}"


class InvoiceDraft(models.Model):
    """
    Store future invoice drafts with user modifications
    """
    lease = models.ForeignKey('leases.Lease', on_delete=models.CASCADE, related_name='invoice_drafts')
    billing_month = models.DateField(help_text="First day of the billing month")
    draft_data = models.JSONField(help_text="Stored invoice data including line items and modifications")
    user_modified = models.BooleanField(default=False, help_text="True if user has made changes to this draft")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['lease', 'billing_month']
        ordering = ['billing_month']
        verbose_name = 'Invoice Draft'
        verbose_name_plural = 'Invoice Drafts'
    
    def __str__(self):
        return f"Draft for {self.lease} - {self.billing_month.strftime('%B %Y')}"


# System settings will be defined at the end to avoid circular imports

class SystemSettings(models.Model):
    """
    System-wide settings for the finance module
    """
    SETTING_TYPES = [
        ('vat_rate', 'VAT Rate'),
        ('invoice_terms', 'Invoice Terms'),
        ('late_fee_compound', 'Late Fee Compounding'),
    ]
    
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    setting_type = models.CharField(max_length=20, choices=SETTING_TYPES)
    description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'System Setting'
        verbose_name_plural = 'System Settings'
    
    def __str__(self):
        return f"{self.key}: {self.value}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Clear cache when settings change
        from django.core.cache import cache
        cache.delete(f'system_setting_{self.key}')
    
    @classmethod
    def get_vat_rate(cls):
        """Get current VAT rate (default 15% for South Africa)"""
        from django.core.cache import cache
        
        cached_rate = cache.get('system_setting_vat_rate')
        if cached_rate is not None:
            return float(cached_rate)
        
        try:
            setting = cls.objects.get(key='vat_rate')
            rate = float(setting.value)
            cache.set(f'system_setting_vat_rate', rate, 3600)  # Cache for 1 hour
            return rate
        except (cls.DoesNotExist, ValueError):
            # Default VAT rate for South Africa
            default_rate = 15.0
            cls.objects.get_or_create(
                key='vat_rate',
                defaults={
                    'value': str(default_rate),
                    'setting_type': 'vat_rate',
                    'description': 'VAT rate percentage for commercial properties'
                }
            )
            cache.set(f'system_setting_vat_rate', default_rate, 3600)
            return default_rate
    
    @classmethod
    def get_setting(cls, key, default=None):
        """Get any system setting by key"""
        from django.core.cache import cache
        
        cached_value = cache.get(f'system_setting_{key}')
        if cached_value is not None:
            return cached_value
        
        try:
            setting = cls.objects.get(key=key)
            cache.set(f'system_setting_{key}', setting.value, 3600)
            return setting.value
        except cls.DoesNotExist:
            return default
