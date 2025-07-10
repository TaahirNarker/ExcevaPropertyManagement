from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom user model that extends Django's AbstractUser.
    Includes additional fields for property management and WebAuthn support.
    """
    # User profile fields
    phone_number = models.CharField(max_length=20, blank=True)
    is_landlord = models.BooleanField(default=False)
    is_tenant = models.BooleanField(default=False)
    
    # WebAuthn/Passkeys support
    webauthn_credentials = models.TextField(blank=True, null=True, help_text="JSON data for WebAuthn credentials")
    
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
