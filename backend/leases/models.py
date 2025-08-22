from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from properties.models import Property
from tenants.models import Tenant
from landlords.models import Landlord


class Lease(models.Model):
    """Model representing a lease agreement between tenant and property."""
    
    # Lease Parties
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='leases')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='leases')
    landlord = models.ForeignKey(
        Landlord, 
        on_delete=models.CASCADE, 
        related_name='leases',
        null=True,
        blank=True,
        help_text="Landlord for this lease"
    )
    
    # Lease Type and Dates
    LEASE_TYPE_CHOICES = [
        ('Fixed', 'Fixed Term'),
        ('Month-to-Month', 'Month-to-Month'),
        ('Periodic', 'Periodic'),
    ]
    lease_type = models.CharField(
        max_length=20,
        choices=LEASE_TYPE_CHOICES,
        default='Fixed',
        help_text="Type of lease agreement"
    )
    start_date = models.DateField()
    end_date = models.DateField()
    lease_duration_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Duration of lease in months"
    )
    
    # Financial Information
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    RENTAL_FREQUENCY_CHOICES = [
        ('Monthly', 'Monthly'),
        ('Weekly', 'Weekly'),
        ('Bi-weekly', 'Bi-weekly'),
        ('Quarterly', 'Quarterly'),
        ('Annually', 'Annually'),
    ]
    rental_frequency = models.CharField(
        max_length=20,
        choices=RENTAL_FREQUENCY_CHOICES,
        default='Monthly',
        help_text="How often rent is due"
    )
    rent_due_day = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month when rent is due"
    )
    
    # Fees and Charges
    LATE_FEE_TYPE_CHOICES = [
        ('percentage', 'Percentage of Rent'),
        ('amount', 'Fixed Amount'),
    ]
    late_fee_type = models.CharField(
        max_length=20,
        choices=LATE_FEE_TYPE_CHOICES,
        default='percentage',
        help_text="Type of late fee calculation"
    )
    late_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Late fee as percentage of rent"
    )
    late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Late fee as fixed amount"
    )
    grace_period_days = models.PositiveIntegerField(
        default=0,
        help_text="Grace period in days before late fees apply"
    )
    management_fee = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Management fee as percentage"
    )
    procurement_fee = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Procurement fee as percentage"
    )
    pro_rata_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Pro-rata amount for partial months"
    )
    
    # Renewal and Notice
    auto_renew = models.BooleanField(
        default=False,
        help_text="Whether lease automatically renews"
    )
    notice_period_days = models.PositiveIntegerField(
        default=30,
        help_text="Notice period required to terminate lease"
    )
    
    # Rent Escalation Settings
    ESCALATION_TYPE_CHOICES = [
        ('percentage', 'Percentage Increase'),
        ('amount', 'Fixed Amount Increase'),
        ('none', 'No Escalation'),
    ]
    escalation_type = models.CharField(
        max_length=20,
        choices=ESCALATION_TYPE_CHOICES,
        default='none',
        help_text="Type of rent escalation"
    )
    escalation_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Annual escalation percentage"
    )
    escalation_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Fixed escalation amount"
    )
    escalation_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when rent escalation should occur annually"
    )
    next_escalation_date = models.DateField(
        null=True,
        blank=True,
        help_text="Next scheduled escalation date"
    )
    
    # Invoice Settings
    invoice_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when invoices should be generated"
    )
    
    # Status and Terms
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'), 
            ('expired', 'Expired'), 
            ('terminated', 'Terminated'), 
            ('pending', 'Pending'),
            ('draft', 'Draft')
        ],
        default='pending'
    )
    terms = models.TextField(blank=True, help_text="Lease terms and conditions")
    notes = models.TextField(blank=True, help_text="Additional notes about the lease")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"Lease for {self.tenant} at {self.property}"
    
    def clean(self):
        """Validate that only one active lease exists per property"""
        super().clean()
        
        # Check for existing active leases for this property
        existing_leases = Lease.objects.filter(
            property=self.property,
            status__in=['active', 'pending']  # Consider both active and pending as "active"
        )
        
        # Exclude current instance if it's being updated
        if self.pk:
            existing_leases = existing_leases.exclude(pk=self.pk)
        
        if existing_leases.exists():
            raise ValidationError({
                'property': f'Property "{self.property}" already has an active lease. '
                           f'Please terminate the existing lease before creating a new one.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        
        # Set next escalation date if escalation is enabled
        if self.escalation_type != 'none' and self.escalation_date and not self.next_escalation_date:
            # Find the next escalation date after the lease start date
            current_year = self.start_date.year
            escalation_this_year = self.escalation_date.replace(year=current_year)
            
            if escalation_this_year <= self.start_date:
                # Escalation date has passed this year, set for next year
                self.next_escalation_date = self.escalation_date.replace(year=current_year + 1)
            else:
                # Escalation date hasn't passed this year
                self.next_escalation_date = escalation_this_year
        
        super().save(*args, **kwargs)
    
    def apply_rent_escalation(self, user=None):
        """Apply rent escalation and create audit log"""
        if self.escalation_type == 'none' or not self.next_escalation_date:
            return False
        
        from finance.models import RentEscalationLog
        from django.utils import timezone
        
        # Check if escalation is due
        if self.next_escalation_date > timezone.now().date():
            return False
        
        previous_rent = self.monthly_rent
        
        if self.escalation_type == 'percentage':
            escalation_amount = self.monthly_rent * (self.escalation_percentage / 100)
            self.monthly_rent += escalation_amount
        elif self.escalation_type == 'amount':
            escalation_amount = self.escalation_amount
            self.monthly_rent += self.escalation_amount
        
        # Create escalation log
        RentEscalationLog.objects.create(
            lease=self,
            previous_rent=previous_rent,
            new_rent=self.monthly_rent,
            escalation_percentage=self.escalation_percentage if self.escalation_type == 'percentage' else None,
            escalation_amount=escalation_amount,
            effective_date=self.next_escalation_date,
            applied_by=user
        )
        
        # Set next escalation date
        next_year = self.next_escalation_date.year + 1
        self.next_escalation_date = self.escalation_date.replace(year=next_year)
        
        self.save()
        return True
    
    def get_current_monthly_charges(self):
        """Get all current monthly charges including rent and recurring charges"""
        charges = [
            {
                'description': 'Monthly Rent',
                'category': 'rent',
                'amount': self.monthly_rent
            }
        ]
        
        # Add active recurring charges
        for charge in self.recurring_charges.filter(is_active=True):
            charges.append({
                'description': charge.description,
                'category': charge.category,
                'amount': charge.amount
            })
        
        return charges
    
    def should_apply_vat(self):
        """Determine if VAT should be applied based on property type"""
        return self.property.property_type == 'commercial'


class LeaseAttachment(models.Model):
    """
    Model for storing lease-related attachments (PDFs, images, etc.)
    """
    ATTACHMENT_TYPE_CHOICES = [
        ('lease_agreement', 'Lease Agreement'),
        ('addendum', 'Addendum'),
        ('inspection_report', 'Inspection Report'),
        ('maintenance_request', 'Maintenance Request'),
        ('payment_proof', 'Payment Proof'),
        ('correspondence', 'Correspondence'),
        ('photo', 'Photo'),
        ('other', 'Other'),
    ]
    
    lease = models.ForeignKey(
        Lease,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    title = models.CharField(max_length=255, help_text="Title or name of the attachment")
    description = models.TextField(blank=True, help_text="Optional description of the attachment")
    file = models.FileField(
        upload_to='lease_attachments/',
        help_text="Upload file (PDF, image, document, etc.)"
    )
    file_type = models.CharField(
        max_length=20,
        choices=ATTACHMENT_TYPE_CHOICES,
        default='other',
        help_text="Type of attachment"
    )
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="File size in bytes"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='lease_attachments'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_public = models.BooleanField(
        default=True,
        help_text="Whether this attachment is visible to tenants"
    )
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Lease Attachment'
        verbose_name_plural = 'Lease Attachments'
    
    def __str__(self):
        return f"{self.lease} - {self.title}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate file size if not provided
        if not self.file_size and self.file:
            try:
                self.file_size = self.file.size
            except (OSError, IOError):
                pass
        super().save(*args, **kwargs)
    
    @property
    def file_extension(self):
        """Get the file extension"""
        if self.file:
            return self.file.name.split('.')[-1].lower()
        return ''
    
    @property
    def is_image(self):
        """Check if the file is an image"""
        image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
        return self.file_extension in image_extensions
    
    @property
    def is_pdf(self):
        """Check if the file is a PDF"""
        return self.file_extension == 'pdf'
    
    @property
    def formatted_file_size(self):
        """Get formatted file size"""
        if not self.file_size:
            return 'Unknown'
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0:
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024.0
        return f"{self.file_size:.1f} TB"


class LeaseNote(models.Model):
    """
    Model for storing individual notes for leases
    """
    NOTE_TYPE_CHOICES = [
        ('general', 'General'),
        ('important', 'Important'),
        ('maintenance', 'Maintenance'),
        ('payment', 'Payment'),
        ('inspection', 'Inspection'),
        ('renewal', 'Renewal'),
        ('termination', 'Termination'),
        ('other', 'Other'),
    ]
    
    lease = models.ForeignKey(
        Lease,
        on_delete=models.CASCADE,
        related_name='lease_notes'
    )
    title = models.CharField(max_length=255, help_text="Title of the note")
    content = models.TextField(help_text="Content of the note")
    note_type = models.CharField(
        max_length=20,
        choices=NOTE_TYPE_CHOICES,
        default='general',
        help_text="Type of note"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='lease_notes_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lease Note'
        verbose_name_plural = 'Lease Notes'
    
    def __str__(self):
        return f"{self.lease} - {self.title}"
