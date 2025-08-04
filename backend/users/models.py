from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom user model that extends Django's AbstractUser.
    Includes additional fields for property management and WebAuthn support.
    """
    # User roles
    USER_ROLES = [
        ('basic_user', 'Basic User'),
        ('tenant', 'Tenant'),
        ('landlord', 'Landlord'),
        ('maintenance_operator', 'Maintenance Operator'),
        ('property_administrator', 'Property Administrator'),
        ('finance_administrator', 'Finance Administrator'),
        ('manager', 'Manager'),
        ('superuser', 'SuperUser'),
    ]
    
    # User profile fields
    phone_number = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=255, blank=True, help_text="Company or organization the user belongs to")
    role = models.CharField(max_length=50, choices=USER_ROLES, default='basic_user', help_text="User's role in the system")
    
    # Legacy fields for backward compatibility
    is_landlord = models.BooleanField(default=False)
    is_tenant = models.BooleanField(default=False)
    
    # WebAuthn/Passkeys support
    webauthn_credentials = models.TextField(blank=True, null=True, help_text="JSON data for WebAuthn credentials")
    webauthn_challenge = models.CharField(max_length=500, blank=True, null=True, help_text="Temporary challenge for WebAuthn registration/login")
    
    # Dashboard preferences
    dashboard_preferences = models.JSONField(default=dict, null=True, blank=True, help_text="User's dashboard customization preferences")
    
    # Make email required and unique
    email = models.EmailField(unique=True, blank=False, null=False)
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the user's full name."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email
    
    def get_short_name(self):
        """Return the user's short name."""
        return self.first_name or self.email
    
    @property
    def has_passkey(self):
        """Check if user has a registered passkey."""
        return bool(self.webauthn_credentials)
    
    @property
    def is_basic_user(self):
        """Check if user is a basic user."""
        return self.role == 'basic_user'
    
    @property
    def is_tenant_role(self):
        """Check if user has tenant role."""
        return self.role == 'tenant'
    
    @property
    def is_landlord_role(self):
        """Check if user has landlord role."""
        return self.role == 'landlord'
    
    @property
    def is_maintenance_operator(self):
        """Check if user is a maintenance operator."""
        return self.role == 'maintenance_operator'
    
    @property
    def is_property_administrator(self):
        """Check if user is a property administrator."""
        return self.role == 'property_administrator'
    
    @property
    def is_finance_administrator(self):
        """Check if user is a finance administrator."""
        return self.role == 'finance_administrator'
    
    @property
    def is_manager(self):
        """Check if user is a manager."""
        return self.role == 'manager'
    
    @property
    def is_superuser_role(self):
        """Check if user has superuser role."""
        return self.role == 'superuser'
    
    def has_role_permission(self, required_role):
        """Check if user has the required role or higher."""
        role_hierarchy = {
            'basic_user': 0,
            'tenant': 1,
            'landlord': 2,
            'maintenance_operator': 3,
            'property_administrator': 4,
            'finance_administrator': 4,
            'manager': 5,
            'superuser': 6,
        }
        user_level = role_hierarchy.get(self.role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        return user_level >= required_level
