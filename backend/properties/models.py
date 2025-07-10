from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

User = get_user_model()

class Property(models.Model):
    """
    Property model for managing real estate properties
    """
    
    # Property Types
    PROPERTY_TYPE_CHOICES = [
        ('house', 'House'),
        ('flat', 'Flat'),
        ('apartment', 'Apartment'),
        ('business', 'Business'),
        ('retail', 'Retail'),
        ('office', 'Office'),
        ('industrial', 'Industrial'),
        ('commercial', 'Commercial'),
        ('land', 'Land'),
        ('other', 'Other'),
    ]
    
    # Property Status
    STATUS_CHOICES = [
        ('vacant', 'Vacant'),
        ('occupied', 'Occupied'),
        ('maintenance', 'Under Maintenance'),
        ('reserved', 'Reserved'),
        ('sold', 'Sold'),
        ('inactive', 'Inactive'),
    ]
    
    # Province/State choices for South Africa
    PROVINCE_CHOICES = [
        ('western_cape', 'Western Cape'),
        ('eastern_cape', 'Eastern Cape'),
        ('northern_cape', 'Northern Cape'),
        ('free_state', 'Free State'),
        ('kwazulu_natal', 'KwaZulu-Natal'),
        ('north_west', 'North West'),
        ('gauteng', 'Gauteng'),
        ('mpumalanga', 'Mpumalanga'),
        ('limpopo', 'Limpopo'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property_code = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=200, help_text="Property name or title")
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES, default='house')
    description = models.TextField(blank=True, help_text="Property description")
    
    # Address Information
    street_address = models.CharField(max_length=255, help_text="Street address")
    suburb = models.CharField(max_length=100, blank=True, help_text="Suburb/Area")
    city = models.CharField(max_length=100, help_text="City")
    province = models.CharField(max_length=20, choices=PROVINCE_CHOICES, help_text="Province/State")
    postal_code = models.CharField(max_length=10, blank=True, help_text="Postal/ZIP code")
    country = models.CharField(max_length=50, default='South Africa')
    
    # Property Details
    bedrooms = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Number of bedrooms"
    )
    bathrooms = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Number of bathrooms"
    )
    square_meters = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Property size in square meters"
    )
    parking_spaces = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(0), MaxValueValidator(50)],
        help_text="Number of parking spaces"
    )
    
    # Financial Information
    purchase_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Purchase price of the property"
    )
    current_market_value = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Current estimated market value"
    )
    monthly_rental_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Monthly rental amount"
    )
    
    # Status and Occupancy
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='vacant')
    is_active = models.BooleanField(default=True, help_text="Is this property active in the system?")
    
    # Ownership and Management
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='owned_properties',
        help_text="Property owner"
    )
    property_manager = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='managed_properties',
        help_text="Property manager (if different from owner)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional Features
    features = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Additional property features (pool, garden, etc.)"
    )
    
    # Images and Documents
    primary_image = models.URLField(blank=True, help_text="URL to primary property image")
    images = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of property image URLs"
    )
    documents = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of property document URLs"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Property'
        verbose_name_plural = 'Properties'
        indexes = [
            models.Index(fields=['property_code']),
            models.Index(fields=['status']),
            models.Index(fields=['property_type']),
            models.Index(fields=['city', 'province']),
            models.Index(fields=['owner']),
        ]
    
    def __str__(self):
        return f"{self.property_code} - {self.name}"
    
    def save(self, *args, **kwargs):
        # Generate property code if not exists
        if not self.property_code:
            self.property_code = self.generate_property_code()
        super().save(*args, **kwargs)
    
    def generate_property_code(self):
        """Generate a unique property code like PRO000001"""
        # Get the last property code
        last_property = Property.objects.filter(
            property_code__startswith='PRO'
        ).order_by('-property_code').first()
        
        if last_property:
            # Extract the number and increment
            last_number = int(last_property.property_code[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"PRO{new_number:06d}"
    
    @property
    def full_address(self):
        """Get the full formatted address"""
        address_parts = [
            self.street_address,
            self.suburb,
            self.city,
            self.get_province_display(),
            self.postal_code
        ]
        return ', '.join(filter(None, address_parts))
    
    @property
    def display_name(self):
        """Get display name with property type and size info"""
        type_display = self.get_property_type_display()
        size_info = []
        
        if self.bedrooms:
            size_info.append(f"{self.bedrooms} bed")
        if self.bathrooms:
            size_info.append(f"{self.bathrooms} bath")
        if self.square_meters:
            size_info.append(f"{self.square_meters}m²")
        
        size_str = ', '.join(size_info)
        if size_str:
            return f"{self.name} [{type_display}, {size_str}]"
        else:
            return f"{self.name} [{type_display}]"
    
    @property
    def current_tenant(self):
        """Get current tenant if property is occupied"""
        if self.status == 'occupied':
            from tenants.models import Lease  # Import here to avoid circular import
            current_lease = Lease.objects.filter(
                property=self,
                status='active',
                start_date__lte=timezone.now().date(),
                end_date__gte=timezone.now().date()
            ).first()
            return current_lease.tenant if current_lease else None
        return None
    
    @property
    def current_lease(self):
        """Get current lease if property is occupied"""
        if self.status == 'occupied':
            from tenants.models import Lease  # Import here to avoid circular import
            return Lease.objects.filter(
                property=self,
                status='active',
                start_date__lte=timezone.now().date(),
                end_date__gte=timezone.now().date()
            ).first()
        return None
    
    @property
    def occupancy_info(self):
        """Get occupancy information for display"""
        if self.status == 'vacant':
            return {'status': 'Vacant', 'details': None}
        elif self.status == 'occupied':
            lease = self.current_lease
            if lease:
                return {
                    'status': 'Occupied',
                    'tenant_name': lease.tenant.get_full_name(),
                    'lease_end': lease.end_date,
                    'details': f"Occupied by {lease.tenant.get_full_name()}"
                }
        return {'status': self.get_status_display(), 'details': None}


class PropertyImage(models.Model):
    """
    Property images model for storing multiple images per property
    """
    property = models.ForeignKey(
        Property, 
        on_delete=models.CASCADE, 
        related_name='property_images'
    )
    image_url = models.URLField(help_text="URL to the image")
    image_file = models.ImageField(
        upload_to='property_images/', 
        null=True, 
        blank=True,
        help_text="Upload image file"
    )
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False, help_text="Is this the primary image?")
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Property Image'
        verbose_name_plural = 'Property Images'
    
    def __str__(self):
        return f"Image for {self.property.name} - {self.title or 'Untitled'}"


class PropertyDocument(models.Model):
    """
    Property documents model for storing property-related documents
    """
    
    DOCUMENT_TYPE_CHOICES = [
        ('deed', 'Title Deed'),
        ('lease', 'Lease Agreement'),
        ('insurance', 'Insurance Policy'),
        ('inspection', 'Inspection Report'),
        ('maintenance', 'Maintenance Record'),
        ('tax', 'Tax Document'),
        ('certificate', 'Certificate'),
        ('other', 'Other'),
    ]
    
    property = models.ForeignKey(
        Property, 
        on_delete=models.CASCADE, 
        related_name='property_documents'
    )
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file_url = models.URLField(blank=True, help_text="URL to the document")
    file_upload = models.FileField(
        upload_to='property_documents/', 
        null=True, 
        blank=True,
        help_text="Upload document file"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    uploaded_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='uploaded_property_documents'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Property Document'
        verbose_name_plural = 'Property Documents'
    
    def __str__(self):
        return f"{self.title} - {self.property.name}"
