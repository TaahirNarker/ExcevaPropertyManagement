#!/usr/bin/env python3
"""
Script to set up all required Strike webhooks
"""
import requests
import json
import sys
import time

# Corrected API key (new key)
API_KEY = "9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"

# Webhook configuration
WEBHOOK_URL = "https://propman.exceva.capital/api/payments/webhook/strike/"
WEBHOOK_SECRET = "o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk"
BASE_URL = "https://api.strike.me/v1"

# Required event types
EVENT_TYPES = [
    "invoice.created",
    "invoice.updated",
    "invoice.paid",
    "invoice.canceled"
]

def create_webhook(event_type):
    """Create a webhook subscription for a specific event type"""
    url = f"{BASE_URL}/subscriptions"
    
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    payload = {
        'webhookUrl': WEBHOOK_URL,
        'eventTypes': [event_type],
        'secret': WEBHOOK_SECRET,
        'enabled': True,
        'webhookVersion': 'v1'
    }
    
    print(f"Creating webhook for {event_type}...")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Webhook created successfully: {data.get('id')}")
            return data
        else:
            print(f"❌ Failed to create webhook: {response.status_code}")
            print(f"Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return None

def list_webhooks():
    """List all webhook subscriptions"""
    url = f"{BASE_URL}/subscriptions"
    
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Accept': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            webhooks = response.json()
            print(f"\nFound {len(webhooks)} webhook subscriptions:")
            
            for hook in webhooks:
                print(f"  - ID: {hook.get('id')}")
                print(f"    URL: {hook.get('webhookUrl')}")
                print(f"    Events: {', '.join(hook.get('eventTypes', []))}")
                print(f"    Enabled: {hook.get('enabled')}")
                print()
                
            return webhooks
        else:
            print(f"❌ Failed to list webhooks: {response.status_code}")
            print(f"Error: {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return []

def main():
    print("\n🚀 Setting up Strike webhooks for Bitcoin Lightning payments")
    print("=" * 60)
    
    # Create webhooks for all required event types
    created = []
    for event_type in EVENT_TYPES:
        result = create_webhook(event_type)
        if result:
            created.append(result)
        # Small delay between requests to avoid rate limiting
        time.sleep(1)
    
    print(f"\n✅ Created {len(created)} webhook subscriptions")
    
    # List all webhooks
    print("\n📋 Listing all webhook subscriptions:")
    list_webhooks()
    
    # Print instructions for updating .env file
    print("\n📝 Update your .env file with:")
    print(f"STRIKE_API_KEY={API_KEY}")
    print(f"STRIKE_WEBHOOK_SECRET={WEBHOOK_SECRET}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 