#!/usr/bin/env python
"""
Quick test script to verify ZOHO Mail setup
Run this after adding your app password to .env file

Usage: python quick_email_test.py
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

from django.core.mail import send_mail

def test_zoho_connection():
    print("🧪 Testing ZOHO Mail connection...")
    print(f"📧 From: {settings.EMAIL_HOST_USER}")
    print(f"🔐 Host: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
    print(f"🔒 TLS: {settings.EMAIL_USE_TLS}")
    
    # Test email - replace with your actual email
    test_email = input("Enter your email address to test: ").strip()
    
    if not test_email:
        print("❌ No email provided")
        return
    
    try:
        send_mail(
            subject='✅ ZOHO Mail Test - RentPilot',
            message='Success! Your ZOHO Mail integration is working correctly.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[test_email],
            fail_silently=False,
        )
        print(f"✅ Test email sent successfully to {test_email}")
        print("🎉 ZOHO Mail setup is working!")
        
    except Exception as e:
        print(f"❌ Email test failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check your app password in .env file")
        print("2. Verify noreply@rentpilot.co.za exists in ZOHO")
        print("3. Ensure your domain is verified in ZOHO")

if __name__ == "__main__":
    test_zoho_connection() 