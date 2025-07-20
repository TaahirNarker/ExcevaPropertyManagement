from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator
from properties.models import Property

class Tenant(models.Model):
    """
    Model representing a tenant in the property management system.
    """
    # Basic Information
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tenant_profile'
    )
    tenant_code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique identifier for the tenant"
    )
    id_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="Government ID number"
    )
    date_of_birth = models.DateField()
    
    # Contact Information
    phone = models.CharField(max_length=20)
    alternative_phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField()
    alternative_email = models.EmailField(blank=True)
    
    # Address Information
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    
    # Employment Information
    employment_status = models.CharField(
        max_length=20,
        choices=[
            ('employed', 'Employed'),
            ('self_employed', 'Self Employed'),
            ('unemployed', 'Unemployed'),
            ('retired', 'Retired'),
            ('student', 'Student')
        ]
    )
    employer_name = models.CharField(max_length=255, blank=True)
    employer_contact = models.CharField(max_length=20, blank=True)
    monthly_income = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True
    )
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=255)
    emergency_contact_phone = models.CharField(max_length=20)
    emergency_contact_relationship = models.CharField(max_length=50)
    
    # Status and Notes
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('pending', 'Pending')
        ],
        default='pending'
    )
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.tenant_code})"
    
    def save(self, *args, **kwargs):
        # Generate tenant code if not set
        if not self.tenant_code:
            last_tenant = Tenant.objects.order_by('-tenant_code').first()
            if last_tenant and last_tenant.tenant_code.startswith('TEN'):
                last_num = int(last_tenant.tenant_code[3:])
                self.tenant_code = f'TEN{str(last_num + 1).zfill(6)}'
            else:
                self.tenant_code = 'TEN000001'
        super().save(*args, **kwargs)


class TenantDocument(models.Model):
    """
    Model for storing tenant-related documents.
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    name = models.CharField(max_length=255)
    document_type = models.CharField(
        max_length=20,
        choices=[
            ('id_document', 'ID Document'),
            ('proof_of_income', 'Proof of Income'),
            ('bank_statement', 'Bank Statement'),
            ('employment_letter', 'Employment Letter'),
            ('reference', 'Reference Letter'),
            ('other', 'Other')
        ]
    )
    file = models.FileField(upload_to='tenant_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.tenant.tenant_code} - {self.name}"


class TenantCommunication(models.Model):
    """
    Model for tracking communications with tenants.
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='communications'
    )
    type = models.CharField(
        max_length=20,
        choices=[
            ('email', 'Email'),
            ('phone', 'Phone Call'),
            ('sms', 'SMS'),
            ('letter', 'Letter'),
            ('in_person', 'In Person'),
            ('other', 'Other')
        ]
    )
    subject = models.CharField(max_length=255)
    content = models.TextField()
    date = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='tenant_communications'
    )
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.tenant.tenant_code} - {self.subject}"


class Lease(models.Model):
    """Model representing a lease agreement between tenant and property."""
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='leases')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='leases')
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('expired', 'Expired'), ('terminated', 'Terminated'), ('pending', 'Pending')]
    )
    terms = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"Lease for {self.tenant} at {self.property}"
