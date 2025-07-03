from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid


class InvoiceStatus(models.TextChoices):
    """Invoice status classifications"""
    DRAFT = 'draft', 'Draft'
    SENT = 'sent', 'Sent'
    PAID = 'paid', 'Paid'
    PARTIAL = 'partial', 'Partially Paid'
    OVERDUE = 'overdue', 'Overdue'
    CANCELLED = 'cancelled', 'Cancelled'


class Invoice(models.Model):
    """
    Invoice model for rent billing and other charges
    """
    # Unique invoice identifier
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique invoice number"
    )
    
    lease = models.ForeignKey(
        'tenants.Lease',
        on_delete=models.CASCADE,
        related_name='invoices',
        help_text="Lease this invoice relates to"
    )
    
    # Invoice Details
    issue_date = models.DateField(
        default=timezone.now,
        help_text="Date invoice was issued"
    )
    
    due_date = models.DateField(
        help_text="Payment due date"
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Invoice amount in ZAR"
    )
    
    # Invoice Type and Description
    invoice_type = models.CharField(
        max_length=20,
        choices=[
            ('rent', 'Monthly Rent'),
            ('deposit', 'Security Deposit'),
            ('utilities', 'Utilities'),
            ('maintenance', 'Maintenance'),
            ('late_fee', 'Late Fee'),
            ('other', 'Other'),
        ],
        default='rent',
        help_text="Type of invoice"
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Invoice description or itemization"
    )
    
    # Payment Status
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT,
        help_text="Current status of the invoice"
    )
    
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total amount paid against this invoice"
    )
    
    # Additional Charges
    late_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Late payment fee"
    )
    
    # Billing Period (for recurring charges)
    billing_period_start = models.DateField(
        blank=True,
        null=True,
        help_text="Start of billing period"
    )
    
    billing_period_end = models.DateField(
        blank=True,
        null=True,
        help_text="End of billing period"
    )
    
    # Auto-generation flags
    is_recurring = models.BooleanField(
        default=False,
        help_text="Is this a recurring invoice?"
    )
    
    auto_generated = models.BooleanField(
        default=False,
        help_text="Was this invoice auto-generated?"
    )
    
    # Notes and References
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes"
    )
    
    # PDF generation
    pdf_file = models.FileField(
        upload_to='invoices/pdf/',
        blank=True,
        null=True,
        help_text="Generated PDF invoice"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this invoice active?"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'finance_invoice'
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['lease', 'status']),
            models.Index(fields=['due_date', 'status']),
            models.Index(fields=['invoice_number']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.lease.tenant.name}"
    
    def save(self, *args, **kwargs):
        """Override save to generate invoice number if not provided"""
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        super().save(*args, **kwargs)
    
    def generate_invoice_number(self):
        """Generate unique invoice number"""
        date_part = timezone.now().strftime('%Y%m')
        uuid_part = str(uuid.uuid4()).replace('-', '')[:8].upper()
        return f"INV-{date_part}-{uuid_part}"
    
    @property
    def outstanding_amount(self):
        """Calculate outstanding amount"""
        return self.total_amount - self.amount_paid
    
    @property
    def total_amount(self):
        """Calculate total amount including late fees"""
        return self.amount + self.late_fee
    
    @property
    def is_paid(self):
        """Check if invoice is fully paid"""
        return self.amount_paid >= self.total_amount
    
    @property
    def is_overdue(self):
        """Check if invoice is overdue"""
        return (
            self.due_date < timezone.now().date() and
            not self.is_paid and
            self.status not in [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT]
        )
    
    @property
    def days_overdue(self):
        """Calculate days overdue"""
        if self.is_overdue:
            return (timezone.now().date() - self.due_date).days
        return 0
    
    def update_status(self):
        """Update invoice status based on payment status"""
        if self.is_paid:
            self.status = InvoiceStatus.PAID
        elif self.amount_paid > 0:
            self.status = InvoiceStatus.PARTIAL
        elif self.is_overdue:
            self.status = InvoiceStatus.OVERDUE
        elif self.status == InvoiceStatus.DRAFT:
            pass  # Keep as draft until sent
        else:
            self.status = InvoiceStatus.SENT
        self.save()


class PaymentMethod(models.TextChoices):
    """Payment method classifications"""
    CASH = 'cash', 'Cash'
    BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
    EFT = 'eft', 'Electronic Funds Transfer'
    DEBIT_ORDER = 'debit_order', 'Debit Order'
    CREDIT_CARD = 'credit_card', 'Credit Card'
    CHEQUE = 'cheque', 'Cheque'
    OTHER = 'other', 'Other'


class Payment(models.Model):
    """
    Payment model for tracking rent and other payments
    """
    # Payment Identifier
    payment_reference = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique payment reference"
    )
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
        help_text="Invoice this payment relates to"
    )
    
    # Payment Details
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Payment amount in ZAR"
    )
    
    payment_date = models.DateField(
        default=timezone.now,
        help_text="Date payment was received"
    )
    
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.BANK_TRANSFER,
        help_text="Method of payment"
    )
    
    # Bank/Transaction Details
    bank_reference = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Bank transaction reference"
    )
    
    depositor_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Name of person who made the payment"
    )
    
    # Verification
    is_verified = models.BooleanField(
        default=False,
        help_text="Has this payment been verified?"
    )
    
    verified_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='verified_payments',
        help_text="User who verified this payment"
    )
    
    verified_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Date payment was verified"
    )
    
    # Supporting Documents
    proof_of_payment = models.FileField(
        upload_to='payments/proof/',
        blank=True,
        null=True,
        help_text="Proof of payment document"
    )
    
    # Additional Information
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional payment notes"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this payment record active?"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'finance_payment'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['invoice', 'payment_date']),
            models.Index(fields=['payment_reference']),
            models.Index(fields=['is_verified']),
        ]
    
    def __str__(self):
        return f"Payment {self.payment_reference} - R{self.amount}"
    
    def save(self, *args, **kwargs):
        """Override save to generate payment reference and update invoice"""
        if not self.payment_reference:
            self.payment_reference = self.generate_payment_reference()
        
        # Save the payment first
        super().save(*args, **kwargs)
        
        # Update invoice amount paid and status
        self.update_invoice_status()
    
    def generate_payment_reference(self):
        """Generate unique payment reference"""
        date_part = timezone.now().strftime('%Y%m%d')
        uuid_part = str(uuid.uuid4()).replace('-', '')[:6].upper()
        return f"PAY-{date_part}-{uuid_part}"
    
    def update_invoice_status(self):
        """Update related invoice's payment status"""
        total_payments = Payment.objects.filter(
            invoice=self.invoice,
            is_active=True
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        self.invoice.amount_paid = total_payments
        self.invoice.update_status()
    
    @property
    def tenant(self):
        """Get the tenant associated with this payment"""
        return self.invoice.lease.tenant
    
    @property
    def property_unit(self):
        """Get the property unit associated with this payment"""
        return self.invoice.lease.unit


class FinancialSummary(models.Model):
    """
    Model for storing pre-calculated financial summaries for performance
    This is useful for dashboard KPIs and reporting
    """
    date = models.DateField(
        unique=True,
        help_text="Date of the financial summary"
    )
    
    # Income Metrics
    total_rent_due = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total rent due for the date"
    )
    
    total_rent_collected = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total rent collected for the date"
    )
    
    total_outstanding = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total outstanding amount"
    )
    
    # Portfolio Metrics
    total_properties = models.PositiveIntegerField(
        default=0,
        help_text="Total number of active properties"
    )
    
    total_units = models.PositiveIntegerField(
        default=0,
        help_text="Total number of active units"
    )
    
    occupied_units = models.PositiveIntegerField(
        default=0,
        help_text="Number of occupied units"
    )
    
    occupancy_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Occupancy rate percentage"
    )
    
    # Collection Metrics
    collection_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Collection rate percentage"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'finance_summary'
        verbose_name = 'Financial Summary'
        verbose_name_plural = 'Financial Summaries'
        ordering = ['-date']
    
    def __str__(self):
        return f"Financial Summary for {self.date}"
