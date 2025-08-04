from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid

class Landlord(models.Model):
    """
    Landlord model for managing property owners and investors.
    Supports individual landlords, companies, and trusts.
    """
    
    # Landlord types
    LANDLORD_TYPES = [
        ('Individual', 'Individual'),
        ('Company', 'Company'),
        ('Trust', 'Trust'),
    ]
    
    # Status options
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended'),
    ]
    
    # South African provinces
    PROVINCE_CHOICES = [
        ('western_cape', 'Western Cape'),
        ('gauteng', 'Gauteng'),
        ('kwazulu_natal', 'KwaZulu-Natal'),
        ('eastern_cape', 'Eastern Cape'),
        ('free_state', 'Free State'),
        ('limpopo', 'Limpopo'),
        ('mpumalanga', 'Mpumalanga'),
        ('north_west', 'North West'),
        ('northern_cape', 'Northern Cape'),
    ]
    
    # Account types
    ACCOUNT_TYPES = [
        ('current', 'Current'),
        ('savings', 'Savings'),
        ('transmission', 'Transmission'),
    ]
    
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Full name for individual or contact person name for company/trust")
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Type and status
    type = models.CharField(max_length=20, choices=LANDLORD_TYPES, default='Individual')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    
    # Company/Trust specific fields
    company_name = models.CharField(max_length=255, blank=True, help_text="Company or trust name")
    vat_number = models.CharField(max_length=20, blank=True, help_text="VAT registration number")
    
    # Individual specific fields
    id_number = models.CharField(max_length=20, blank=True, help_text="South African ID number")
    tax_number = models.CharField(max_length=20, blank=True, help_text="Tax registration number")
    
    # Address fields
    street_address = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    suburb = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=20, choices=PROVINCE_CHOICES, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    country = models.CharField(max_length=100, default='South Africa')
    
    # Banking information
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    branch_code = models.CharField(max_length=10, blank=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, blank=True)
    
    # Additional information
    notes = models.TextField(blank=True, help_text="Additional notes about the landlord")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'landlords_landlord'
        verbose_name = 'Landlord'
        verbose_name_plural = 'Landlords'
        ordering = ['-created_at']
    
    def __str__(self):
        if self.company_name:
            return f"{self.company_name} ({self.name})"
        return self.name
    
    def get_display_name(self):
        """Return the appropriate display name based on type."""
        if self.type == 'Individual':
            return self.name
        elif self.company_name:
            return f"{self.company_name} - {self.name}"
        return self.name
    
    def get_full_address(self):
        """Return the complete address as a string."""
        address_parts = []
        if self.street_address:
            address_parts.append(self.street_address)
        if self.address_line_2:
            address_parts.append(self.address_line_2)
        if self.suburb:
            address_parts.append(self.suburb)
        if self.city:
            address_parts.append(self.city)
        if self.province:
            address_parts.append(self.get_province_display())
        if self.postal_code:
            address_parts.append(self.postal_code)
        if self.country:
            address_parts.append(self.country)
        
        return ', '.join(address_parts) if address_parts else 'No address provided'
    
    def get_properties_count(self):
        """Return the number of properties owned by this landlord."""
        try:
            return self.properties.count()
        except:
            # Return 0 if properties relationship doesn't exist yet
            return 0
    
    def get_total_rental_income(self):
        """Calculate total monthly rental income from all properties."""
        try:
            total = 0
            for property in self.properties.all():
                if hasattr(property, 'monthly_rental_amount') and property.monthly_rental_amount:
                    total += property.monthly_rental_amount
            return total
        except:
            # Return 0 if properties relationship doesn't exist yet
            return 0
    
    @property
    def is_active(self):
        """Check if landlord is active."""
        return self.status == 'Active'
    
    def clean(self):
        """Custom validation for the model."""
        from django.core.exceptions import ValidationError
        
        # Company/Trust validation
        if self.type in ['Company', 'Trust'] and not self.company_name:
            raise ValidationError({
                'company_name': f'{self.type} name is required for {self.type} type landlords.'
            })
        
        # VAT number validation for companies
        if self.type == 'Company' and self.vat_number:
            if not self.vat_number.isdigit() or len(self.vat_number) != 10:
                raise ValidationError({
                    'vat_number': 'VAT number must be exactly 10 digits.'
                })
        
        # ID number validation for individuals
        if self.type == 'Individual' and self.id_number:
            if not self.id_number.isdigit() or len(self.id_number) != 13:
                raise ValidationError({
                    'id_number': 'ID number must be exactly 13 digits.'
                })
        
        # Postal code validation
        if self.postal_code and not self.postal_code.isdigit():
            raise ValidationError({
                'postal_code': 'Postal code must contain only digits.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.clean()
        super().save(*args, **kwargs)
