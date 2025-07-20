from django.db import models
from django.contrib.auth.models import User
from properties.models import Property
from tenants.models import Tenant, Lease
from users.models import CustomUser


class Invoice(models.Model):
    """
    Invoice model for managing property management invoices
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
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
    lease = models.ForeignKey('tenants.Lease', on_delete=models.CASCADE, related_name='invoices')
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
            last_invoice = Invoice.objects.order_by('-id').first()
            if last_invoice:
                last_number = int(last_invoice.invoice_number.split('-')[-1])
                self.invoice_number = f"INV-{str(last_number + 1).zfill(6)}"
            else:
                self.invoice_number = "INV-000001"
        
        # Calculate totals
        self.calculate_totals()
        super().save(*args, **kwargs)
    
    def calculate_totals(self):
        """Calculate subtotal, tax, and total amounts"""
        self.subtotal = sum(item.total for item in self.line_items.all())
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount


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
