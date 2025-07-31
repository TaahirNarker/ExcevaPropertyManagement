#!/usr/bin/env python3
"""
Verify Strike API connection using Django settings
"""
import os
import sys
import json
import logging
import requests
import django
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

# Now import from Django settings
from django.conf import settings

# Get Strike API credentials from Django settings
api_key = settings.STRIKE_API_KEY
api_base_url = settings.STRIKE_API_BASE_URL

def test_api_connection():
    """Test basic connection to Strike API"""
    logger.info(f"Testing connection to Strike API: {api_base_url}")
    logger.info(f"API key present: {bool(api_key)} (Length: {len(api_key)})")
    
    if not api_key:
        logger.error("No API key found in settings")
        return False
    
    # Create headers with API key
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    
    # Test endpoints
    endpoints = [
        '/subscriptions',  # List webhook subscriptions
        '/rates/ticker',   # Get exchange rates
    ]
    
    success = False
    
    for endpoint in endpoints:
        url = f"{api_base_url}{endpoint}"
        logger.info(f"Testing endpoint: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            
            logger.info(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info(f"Success! Response: {response.text[:500]}...")
                success = True
                break
            else:
                logger.error(f"Failed to connect: {response.text}")
                
        except Exception as e:
            logger.error(f"Exception: {str(e)}")
    
    if success:
        logger.info("✅ Strike API connection successful!")
        return True
    else:
        logger.error("❌ Strike API connection failed")
        logger.error("Please check your API key and permissions")
        return False

def verify_api_key_format():
    """Check if the API key format seems valid"""
    if not api_key:
        return False
        
    # Check API key length (typical Strike API key is 64 characters)
    if len(api_key) != 64:
        logger.warning(f"API key length ({len(api_key)}) is unusual - expected 64 characters")
    
    # Check for common issues
    if 'O' in api_key:
        logger.warning("API key contains the letter 'O' - might be confused with '0' (zero)")
    
    if api_key.startswith("your-") or "your-" in api_key:
        logger.error("API key appears to be a placeholder, not a real key")
        return False
    
    return True

if __name__ == "__main__":
    print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")
    
    # Check API key format
    if verify_api_key_format():
        logger.info("API key format appears valid")
    else:
        logger.warning("API key format may be invalid")
    
    # Test API connection
    success = test_api_connection()
    
    # Exit with appropriate status
    sys.exit(0 if success else 1) 