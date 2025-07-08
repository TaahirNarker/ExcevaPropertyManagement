from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom user model that extends Django's AbstractUser.
    Can be extended with additional fields as needed.
    """
    # Add any additional fields here
    phone_number = models.CharField(max_length=20, blank=True)
    is_landlord = models.BooleanField(default=False)
    is_tenant = models.BooleanField(default=False)
    
    def __str__(self):
        return self.username
