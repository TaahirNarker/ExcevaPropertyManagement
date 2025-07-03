from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal


class PropertyType(models.TextChoices):
    """Property type classifications"""
    RESIDENTIAL = 'residential', 'Residential'
    COMMERCIAL = 'commercial', 'Commercial'
    INDUSTRIAL = 'industrial', 'Industrial'
    RETAIL = 'retail', 'Retail'
    MIXED_USE = 'mixed_use', 'Mixed Use'


class Property(models.Model):
    """
    Property model representing individual real estate assets
    Each property can contain multiple units
    """
    name = models.CharField(
        max_length=200,
        help_text="Property name or identifier"
    )
    
    address = models.TextField(
        help_text="Full property address"
    )
    
    property_type = models.CharField(
        max_length=20,
        choices=PropertyType.choices,
        default=PropertyType.RESIDENTIAL,
        help_text="Type of property"
    )
    
    purchase_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Original purchase price in ZAR"
    )
    
    current_market_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Current estimated market value in ZAR"
    )
    
    total_units = models.PositiveIntegerField(
        default=1,
        help_text="Total number of units in this property"
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional property details"
    )
    
    # Document and media fields
    title_deed = models.FileField(
        upload_to='documents/title_deeds/',
        blank=True,
        null=True,
        help_text="Title deed document"
    )
    
    compliance_certificate = models.FileField(
        upload_to='documents/compliance/',
        blank=True,
        null=True,
        help_text="Compliance certificate"
    )
    
    property_image = models.ImageField(
        upload_to='images/properties/',
        blank=True,
        null=True,
        help_text="Property main image"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this property actively managed?"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'properties_property'
        verbose_name = 'Property'
        verbose_name_plural = 'Properties'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_property_type_display()})"
    
    @property
    def total_rental_income(self):
        """Calculate total monthly rental income from all units"""
        return sum(unit.monthly_rent for unit in self.units.filter(is_active=True))
    
    @property
    def occupied_units_count(self):
        """Count of currently occupied units"""
        return self.units.filter(status=UnitStatus.OCCUPIED, is_active=True).count()
    
    @property
    def vacant_units_count(self):
        """Count of currently vacant units"""
        return self.units.filter(status=UnitStatus.VACANT, is_active=True).count()
    
    @property
    def occupancy_rate(self):
        """Calculate occupancy rate as percentage"""
        active_units = self.units.filter(is_active=True).count()
        if active_units == 0:
            return 0
        return (self.occupied_units_count / active_units) * 100


class UnitType(models.TextChoices):
    """Unit type classifications"""
    BACHELOR = 'bachelor', 'Bachelor'
    ONE_BEDROOM = '1_bedroom', '1 Bedroom'
    TWO_BEDROOM = '2_bedroom', '2 Bedroom'
    THREE_BEDROOM = '3_bedroom', '3 Bedroom'
    FOUR_BEDROOM = '4_bedroom', '4+ Bedroom'
    OFFICE = 'office', 'Office'
    RETAIL = 'retail', 'Retail Space'
    WAREHOUSE = 'warehouse', 'Warehouse'
    PARKING = 'parking', 'Parking Space'
    OTHER = 'other', 'Other'


class UnitStatus(models.TextChoices):
    """Unit availability status"""
    VACANT = 'vacant', 'Vacant'
    OCCUPIED = 'occupied', 'Occupied'
    MAINTENANCE = 'maintenance', 'Under Maintenance'
    RENOVATION = 'renovation', 'Under Renovation'


class Unit(models.Model):
    """
    Unit model representing individual rentable spaces within a property
    """
    property_ref = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='units',
        help_text="Property this unit belongs to"
    )
    
    unit_number = models.CharField(
        max_length=20,
        help_text="Unit number or identifier (e.g., '101', 'A1', 'Shop 5')"
    )
    
    unit_type = models.CharField(
        max_length=20,
        choices=UnitType.choices,
        default=UnitType.ONE_BEDROOM,
        help_text="Type of unit"
    )
    
    status = models.CharField(
        max_length=20,
        choices=UnitStatus.choices,
        default=UnitStatus.VACANT,
        help_text="Current status of the unit"
    )
    
    monthly_rent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Monthly rental amount in ZAR"
    )
    
    size_sqm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Unit size in square meters"
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional unit details"
    )
    
    unit_image = models.ImageField(
        upload_to='images/units/',
        blank=True,
        null=True,
        help_text="Unit image"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this unit actively available for rent?"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'properties_unit'
        verbose_name = 'Unit'
        verbose_name_plural = 'Units'
        ordering = ['property_ref__name', 'unit_number']
        unique_together = ['property_ref', 'unit_number']
    
    def __str__(self):
        return f"{self.property_ref.name} - Unit {self.unit_number}"
    
    def get_current_tenant(self):
        """Get the current active tenant for this unit"""
        from tenants.models import Lease
        current_lease = Lease.objects.filter(
            unit=self,
            status='active',
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        ).first()
        return current_lease.tenant if current_lease else None
    
    @property
    def current_tenant(self):
        """Property wrapper for get_current_tenant method"""
        return self.get_current_tenant()
    
    @property
    def is_occupied(self):
        """Check if unit is currently occupied"""
        return self.status == UnitStatus.OCCUPIED
    
    @property
    def rent_per_sqm(self):
        """Calculate rent per square meter"""
        if self.size_sqm and self.size_sqm > 0:
            return self.monthly_rent / self.size_sqm
        return None
