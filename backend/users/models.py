from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    """
    User roles for the Property Control System
    - ADMIN: Full access to everything
    - PROPERTY_MANAGER: CRUD properties, units, tenants, limited finance
    - ACCOUNTANT: Read-only properties/tenants, full finance access
    - VIEWER: Read-only dashboard and reports
    """
    ADMIN = 'admin', 'Administrator'
    PROPERTY_MANAGER = 'property_manager', 'Property Manager'
    ACCOUNTANT = 'accountant', 'Accountant'
    VIEWER = 'viewer', 'Viewer'


class CustomUser(AbstractUser):
    """
    Custom user model for Property Control System
    Extends Django's default User with role-based permissions
    """
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
        help_text="User's role determines access permissions"
    )
    
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Contact phone number"
    )
    
    company = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Company or organization name"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        """Check if user is an administrator"""
        return self.role == UserRole.ADMIN
    
    @property
    def is_property_manager(self):
        """Check if user is a property manager"""
        return self.role == UserRole.PROPERTY_MANAGER
    
    @property
    def is_accountant(self):
        """Check if user is an accountant"""
        return self.role == UserRole.ACCOUNTANT
    
    @property
    def can_manage_properties(self):
        """Check if user can manage properties"""
        return self.role in [UserRole.ADMIN, UserRole.PROPERTY_MANAGER]
    
    @property
    def can_manage_finance(self):
        """Check if user can manage financial data"""
        return self.role in [UserRole.ADMIN, UserRole.ACCOUNTANT]
    
    @property
    def can_view_reports(self):
        """Check if user can view reports"""
        return True  # All authenticated users can view reports
