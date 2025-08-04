from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from users.models import CustomUser


class Lead(models.Model):
    """
    Lead model for CRM functionality
    """
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('converted', 'Converted'),
        ('lost', 'Lost'),
    ]

    # Basic information
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    source = models.CharField(max_length=100, default='website')
    
    # Status and assignment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    assigned_to = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_contact = models.DateTimeField(null=True, blank=True)
    
    # Additional information
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_leads', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lead'
        verbose_name_plural = 'Leads'
    
    def __str__(self):
        return f"{self.name} - {self.status}"
    
    def update_last_contact(self):
        """Update the last contact timestamp"""
        self.last_contact = timezone.now()
        self.save(update_fields=['last_contact'])


class Contact(models.Model):
    """
    Contact model for CRM functionality
    """
    TYPE_CHOICES = [
        ('prospect', 'Prospect'),
        ('client', 'Client'),
        ('vendor', 'Vendor'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    # Basic information
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    # Classification
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='prospect')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_contact = models.DateTimeField(null=True, blank=True)
    
    # Additional information
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_contacts', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'
    
    def __str__(self):
        return f"{self.name} - {self.type}"
    
    def update_last_contact(self):
        """Update the last contact timestamp"""
        self.last_contact = timezone.now()
        self.save(update_fields=['last_contact'])


class Communication(models.Model):
    """
    Communication model for tracking interactions with contacts
    """
    TYPE_CHOICES = [
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('meeting', 'Meeting'),
        ('note', 'Note'),
    ]

    # Communication details
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date = models.DateTimeField(default=timezone.now)
    subject = models.CharField(max_length=200)
    content = models.TextField()
    
    # Relationships
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='communications')
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_communications')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name = 'Communication'
        verbose_name_plural = 'Communications'
    
    def __str__(self):
        return f"{self.type} - {self.subject}"


class Task(models.Model):
    """
    Task model for CRM task management
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    # Task details
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateTimeField()
    
    # Assignment
    assigned_to = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_tasks', null=True, blank=True)
    
    class Meta:
        ordering = ['due_date']
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'
    
    def __str__(self):
        return f"{self.title} - {self.status}"
