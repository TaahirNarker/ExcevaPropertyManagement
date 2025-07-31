#!/usr/bin/env python3
"""
Script to set up Strike webhook subscriptions
Based on: https://docs.strike.me/webhooks/setting-up-webhooks/
"""
import os
import sys
import requests
import argparse
import secrets
import string
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Strike API configuration
STRIKE_API_BASE_URL = os.getenv('STRIKE_API_BASE_URL', 'https://api.strike.me/v1')
STRIKE_API_KEY = os.getenv('STRIKE_API_KEY', '')
WEBHOOK_URL = os.getenv('WEBHOOK_URL', 'https://propman.exceva.capital/api/payments/webhook/strike/')

# Required event types for Bitcoin payment processing
EVENT_TYPES = [
    'invoice.created',
    'invoice.updated',
    'invoice.paid',
    'invoice.canceled'
]

def generate_webhook_secret(length=40):
    """Generate a secure random webhook secret"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_webhook_subscription(api_key, webhook_url, event_type, webhook_secret):
    """
    Create a webhook subscription for a specific event type
    
    Args:
        api_key: Strike API key
        webhook_url: URL to receive webhooks
        event_type: Event type to subscribe to
        webhook_secret: Secret for signing webhooks
        
    Returns:
        Response from Strike API
    """
    url = f"{STRIKE_API_BASE_URL}/subscriptions"
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'webhookUrl': webhook_url,
        'eventType': event_type,
        'secret': webhook_secret,
        'enabled': True,
        'webhookVersion': 'v1'
    }
    
    print(f"Creating subscription for event type: {event_type}")
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code in [200, 201]:
        print(f"✅ Successfully created subscription for {event_type}")
        return response.json()
    else:
        print(f"❌ Failed to create subscription for {event_type}: {response.status_code}")
        print(f"Error: {response.text}")
        return None

def list_webhook_subscriptions(api_key):
    """
    List all existing webhook subscriptions
    
    Args:
        api_key: Strike API key
        
    Returns:
        List of webhook subscriptions
    """
    url = f"{STRIKE_API_BASE_URL}/subscriptions"
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    print("Fetching existing webhook subscriptions...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        subscriptions = response.json()
        print(f"Found {len(subscriptions)} existing subscriptions")
        return subscriptions
    else:
        print(f"❌ Failed to fetch subscriptions: {response.status_code}")
        print(f"Error: {response.text}")
        return []

def delete_webhook_subscription(api_key, subscription_id):
    """
    Delete a webhook subscription
    
    Args:
        api_key: Strike API key
        subscription_id: ID of subscription to delete
        
    Returns:
        True if successful, False otherwise
    """
    url = f"{STRIKE_API_BASE_URL}/subscriptions/{subscription_id}"
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    print(f"Deleting subscription: {subscription_id}")
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 204:
        print(f"✅ Successfully deleted subscription: {subscription_id}")
        return True
    else:
        print(f"❌ Failed to delete subscription: {response.status_code}")
        print(f"Error: {response.text}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Set up Strike webhook subscriptions")
    parser.add_argument("--list", action="store_true", help="List existing webhook subscriptions")
    parser.add_argument("--create", action="store_true", help="Create new webhook subscriptions")
    parser.add_argument("--delete-all", action="store_true", help="Delete all existing webhook subscriptions")
    parser.add_argument("--webhook-url", type=str, default=WEBHOOK_URL, help="URL for webhook endpoint")
    parser.add_argument("--webhook-secret", type=str, help="Secret for signing webhooks (will be generated if not provided)")
    parser.add_argument("--api-key", type=str, help="Strike API key (overrides environment variable)")
    args = parser.parse_args()
    
    # Use API key from command line if provided, otherwise use environment variable
    api_key = args.api_key or STRIKE_API_KEY
    
    # Check if API key is configured
    if not api_key:
        print("❌ Error: No Strike API key provided")
        print("Please set STRIKE_API_KEY in .env file or provide with --api-key")
        return 1
    
    # List existing subscriptions
    if args.list:
        subscriptions = list_webhook_subscriptions(api_key)
        if subscriptions:
            print("\nExisting Webhook Subscriptions:")
            for sub in subscriptions:
                print(f"ID: {sub.get('id')}")
                print(f"Event Type: {sub.get('eventType')}")
                print(f"Webhook URL: {sub.get('webhookUrl')}")
                print(f"Enabled: {sub.get('enabled')}")
                print(f"Created: {sub.get('created')}")
                print("---")
        return 0
    
    # Delete all existing subscriptions
    if args.delete_all:
        subscriptions = list_webhook_subscriptions(api_key)
        for sub in subscriptions:
            delete_webhook_subscription(api_key, sub.get('id'))
        return 0
    
    # Create webhook subscriptions
    if args.create:
        # Generate webhook secret if not provided
        webhook_secret = args.webhook_secret
        if not webhook_secret:
            webhook_secret = generate_webhook_secret()
            print(f"Generated webhook secret: {webhook_secret}")
            print("⚠️ IMPORTANT: Save this webhook secret in your .env file as STRIKE_WEBHOOK_SECRET")
        
        # Create subscriptions for each event type
        created = []
        for event_type in EVENT_TYPES:
            result = create_webhook_subscription(
                api_key, 
                args.webhook_url, 
                event_type,
                webhook_secret
            )
            if result:
                created.append(result)
        
        print(f"\n✅ Created {len(created)} webhook subscriptions")
        print(f"\n🔑 Webhook Secret: {webhook_secret}")
        print("⚠️ IMPORTANT: Add this to your .env file as STRIKE_WEBHOOK_SECRET")
        
        # Write instructions to update env file
        with open("webhook_setup_instructions.txt", "w") as f:
            f.write("# Strike Webhook Setup Instructions\n\n")
            f.write("Add the following to your .env file:\n\n")
            f.write(f"STRIKE_WEBHOOK_SECRET={webhook_secret}\n")
        
        print("\nInstructions saved to webhook_setup_instructions.txt")
        return 0
    
    # If no action specified, show help
    parser.print_help()
    return 0

if __name__ == "__main__":
    sys.exit(main()) 