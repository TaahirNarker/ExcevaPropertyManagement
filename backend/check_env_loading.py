#!/usr/bin/env python3
"""
Check if Django is loading environment variables correctly
"""
import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

# Now we can import from Django settings
from django.conf import settings

# Check Strike API key in .env
env_api_key = os.getenv('STRIKE_API_KEY', 'Not found in environment')
print(f"API key from direct environment: {env_api_key[:5]}...{env_api_key[-5:]}")

# Check Strike API key in Django settings
settings_api_key = getattr(settings, 'STRIKE_API_KEY', 'Not found in settings')
print(f"API key from Django settings: {settings_api_key[:5]}...{settings_api_key[-5:] if settings_api_key else ''}")

# Check if they match
if env_api_key == settings_api_key:
    print("✅ API keys match")
else:
    print("❌ API keys don't match")
    
    # Print the full key for troubleshooting
    print(f"Environment API key: {env_api_key}")
    print(f"Settings API key: {settings_api_key}")

# Check other Strike API settings
print("\nOther Strike API settings:")
print(f"Strike API Base URL: {getattr(settings, 'STRIKE_API_BASE_URL', 'Not found')}")
print(f"Strike Webhook Secret: {getattr(settings, 'STRIKE_WEBHOOK_SECRET', 'Not found')[:5]}..." 
      if getattr(settings, 'STRIKE_WEBHOOK_SECRET', None) else "Not found") 