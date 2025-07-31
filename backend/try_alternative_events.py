#!/usr/bin/env python3
"""
Try different event names for webhook subscriptions
"""
import requests
import json
import time
import sys

# API key
API_KEY = "9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"
BASE_URL = "https://api.strike.me/v1"
WEBHOOK_URL = "https://propman.exceva.capital/api/payments/webhook/strike/"
WEBHOOK_SECRET = "o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk"

# List of possible event types to try
POSSIBLE_EVENTS = [
    "invoice.paid",
    "invoice.payment",
    "invoice.completed",
    "invoice.settlement",
    "invoice.cancelled",  # UK spelling
    "invoice.settled",
    "invoice.received"
]

def create_webhook(event_type):
    """Try to create a webhook subscription with a specific event type"""
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
    
    print(f"Trying to create webhook for: {event_type}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            print(f"✅ SUCCESS! '{event_type}' is a valid event type")
            print(f"Response: {response.text}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            error = response.json() if response.text else {}
            print(f"Error: {json.dumps(error)[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def main():
    """Try each possible event type"""
    print("\n🔍 Finding valid Strike webhook event types")
    print("=" * 60)
    
    valid_events = []
    
    for event in POSSIBLE_EVENTS:
        success = create_webhook(event)
        if success:
            valid_events.append(event)
        
        # Sleep to avoid rate limiting
        time.sleep(1)
    
    print("\n📋 Summary of valid event types:")
    if valid_events:
        for event in valid_events:
            print(f"✅ {event}")
    else:
        print("❌ No valid event types found from our test list")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 