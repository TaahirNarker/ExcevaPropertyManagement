from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal


class TenantType(models.TextChoices):
    """Tenant type classifications"""
    INDIVIDUAL = 'individual', 'Individual'
    COMPANY = 'company', 'Company'
    TRUST = 'trust', 'Trust'
    OTHER = 'other', 'Other'


class Tenant(models.Model):
    """
    Tenant model representing individuals or entities renting units
    """
    # Personal/Company Information
    name = models.CharField(
        max_length=200,
        help_text="Full name or company name"
    )
    
    tenant_type = models.CharField(
        max_length=20,
        choices=TenantType.choices,
        default=TenantType.INDIVIDUAL,
        help_text="Type of tenant"
    )
    
    id_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="ID number or passport number"
    )
    
    company_registration = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Company registration number (if applicable)"
    )
    
    # Contact Information
    email = models.EmailField(
        help_text="Primary email address"
    )
    
    phone_number = models.CharField(
        max_length=20,
        help_text="Primary phone number"
    )
    
    alternative_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Alternative phone number"
    )
    
    postal_address = models.TextField(
        blank=True,
        null=True,
        help_text="Postal address"
    )
    
    # Employment/Business Information
    employer = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Employer name"
    )
    
    monthly_income = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Declared monthly income"
    )
    
    # Emergency Contact
    emergency_contact_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Emergency contact full name"
    )
    
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Emergency contact phone number"
    )
    
    # Documents
    id_document = models.FileField(
        upload_to='documents/tenants/id/',
        blank=True,
        null=True,
        help_text="Copy of ID or passport"
    )
    
    proof_of_income = models.FileField(
        upload_to='documents/tenants/income/',
        blank=True,
        null=True,
        help_text="Proof of income document"
    )
    
    # Additional Information
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about the tenant"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this tenant actively renting?"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenants_tenant'
        verbose_name = 'Tenant'
        verbose_name_plural = 'Tenants'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_tenant_type_display()})"
    
    @property
    def current_leases(self):
        """Get all current active leases for this tenant"""
        return self.leases.filter(
            status='active',
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        )
    
    @property
    def total_monthly_rent(self):
        """Calculate total monthly rent across all current leases"""
        return sum(lease.monthly_rent for lease in self.current_leases)
    
    @property
    def has_outstanding_payments(self):
        """Check if tenant has any outstanding payments"""
        from finance.models import Invoice
        return Invoice.objects.filter(
            lease__tenant=self,
            status__in=['unpaid', 'partial', 'overdue']
        ).exists()


class LeaseStatus(models.TextChoices):
    """Lease status classifications"""
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    EXPIRED = 'expired', 'Expired'
    TERMINATED = 'terminated', 'Terminated'
    CANCELLED = 'cancelled', 'Cancelled'


class Lease(models.Model):
    """
    Lease model representing rental agreements between tenants and units
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='leases',
        help_text="Tenant for this lease"
    )
    
    unit = models.ForeignKey(
        'properties.Unit',
        on_delete=models.CASCADE,
        related_name='leases',
        help_text="Unit being leased"
    )
    
    # Lease Terms
    start_date = models.DateField(
        help_text="Lease start date"
    )
    
    end_date = models.DateField(
        help_text="Lease end date"
    )
    
    monthly_rent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monthly rental amount in ZAR"
    )
    
    security_deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        default=Decimal('0.00'),
        help_text="Security deposit amount in ZAR"
    )
    
    # Escalation Terms
    annual_escalation_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('8.00'),
        help_text="Annual rent escalation percentage"
    )
    
    escalation_date = models.DateField(
        blank=True,
        null=True,
        help_text="Date of next rent escalation"
    )
    
    # Payment Terms
    rent_due_day = models.PositiveIntegerField(
        default=1,
        help_text="Day of month when rent is due (1-31)"
    )
    
    payment_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annually', 'Annually'),
        ],
        default='monthly',
        help_text="Payment frequency"
    )
    
    status = models.CharField(
        max_length=20,
        choices=LeaseStatus.choices,
        default=LeaseStatus.DRAFT,
        help_text="Current status of the lease"
    )
    
    # Documents
    signed_lease = models.FileField(
        upload_to='documents/leases/',
        blank=True,
        null=True,
        help_text="Signed lease agreement"
    )
    
    # Additional Terms
    special_terms = models.TextField(
        blank=True,
        null=True,
        help_text="Special terms and conditions"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about this lease"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this lease record active?"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenants_lease'
        verbose_name = 'Lease'
        verbose_name_plural = 'Leases'
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.tenant.name} - {self.unit} ({self.start_date} to {self.end_date})"
    
    @property
    def is_current(self):
        """Check if lease is currently active based on dates"""
        today = timezone.now().date()
        return (
            self.status == LeaseStatus.ACTIVE and
            self.start_date <= today <= self.end_date
        )
    
    @property
    def days_remaining(self):
        """Calculate days remaining in lease"""
        today = timezone.now().date()
        if self.end_date > today:
            return (self.end_date - today).days
        return 0
    
    @property
    def is_expiring_soon(self, days=30):
        """Check if lease expires within specified days"""
        return 0 < self.days_remaining <= days
    
    @property
    def total_rent_due(self):
        """Calculate total rent that should have been paid to date"""
        from finance.models import Invoice
        return Invoice.objects.filter(
            lease=self,
            due_date__lte=timezone.now().date()
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
    
    @property
    def total_rent_paid(self):
        """Calculate total rent actually paid"""
        from finance.models import Payment
        return Payment.objects.filter(
            invoice__lease=self
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
    
    @property
    def outstanding_amount(self):
        """Calculate outstanding rent amount"""
        return self.total_rent_due - self.total_rent_paid
    
    def save(self, *args, **kwargs):
        """Override save to update unit status when lease becomes active"""
        super().save(*args, **kwargs)
        
        # Update unit status based on lease status
        if self.status == LeaseStatus.ACTIVE and self.is_current:
            from properties.models import UnitStatus
            self.unit.status = UnitStatus.OCCUPIED
            self.unit.save()
        elif self.status in [LeaseStatus.EXPIRED, LeaseStatus.TERMINATED, LeaseStatus.CANCELLED]:
            from properties.models import UnitStatus
            self.unit.status = UnitStatus.VACANT
            self.unit.save()
