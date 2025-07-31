#!/usr/bin/env python3
"""
Debugging script for Strike API
Tests both original API key and a fixed version (with O → 0 substitution)
"""
import requests
import json
import argparse

# API key as provided
ORIGINAL_API_KEY = "9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"

# No need for "fixed" key anymore as this one works
FIXED_API_KEY = "9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"

def test_api_key(api_key, base_url="https://api.strike.me/v1"):
    """
    Test if API key is valid by making a simple API call
    """
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    endpoints = [
        '/subscriptions',  # List webhook subscriptions
        '/accounts/me',    # Get own account (often available endpoint)
        '/rates/ticker'    # Get exchange rates
    ]
    
    print(f"\n🔑 Testing API Key: {api_key[:5]}...{api_key[-5:]}")
    print("-" * 60)
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"📡 GET {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"📊 Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Success! API key is working for this endpoint.")
                return api_key  # Return the working API key
                
            print(f"📄 Response: {response.text[:200]}")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    return None

def create_webhook_subscription(api_key, webhook_url, event_type, webhook_secret, base_url="https://api.strike.me/v1"):
    """
    Create a webhook subscription with detailed debugging
    """
    url = f"{base_url}/subscriptions"
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Fix: Using eventTypes (plural) as an array instead of eventType
    payload = {
        'webhookUrl': webhook_url,
        'eventTypes': [event_type],  # Array of event types
        'secret': webhook_secret,
        'enabled': True,
        'webhookVersion': 'v1'
    }
    
    print(f"\n📣 Creating subscription for {event_type}")
    print(f"🔗 URL: {url}")
    print(f"📦 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"📊 Status: {response.status_code}")
        
        # Print full request details for debugging
        print("\n🔍 Request Details:")
        print(f"Headers: {json.dumps(dict(response.request.headers), indent=2)}")
        
        if response.status_code in [200, 201]:
            print("✅ Success! Webhook created.")
            print(f"📄 Response: {response.text}")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Debug Strike API key and webhook setup")
    parser.add_argument("--test", action="store_true", help="Test both API key versions")
    parser.add_argument("--create", action="store_true", help="Create webhook subscription")
    parser.add_argument("--webhook-url", default="https://propman.exceva.capital/api/payments/webhook/strike/", help="Webhook URL")
    parser.add_argument("--event-type", default="invoice.paid", help="Event type to subscribe to")
    parser.add_argument("--webhook-secret", default="o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk", help="Webhook secret")
    parser.add_argument("--custom-key", help="Custom API key to test")
    args = parser.parse_args()
    
    # If no action specified, show help
    if not (args.test or args.create):
        parser.print_help()
        return 1
    
    # Keys to test
    api_keys = [ORIGINAL_API_KEY, FIXED_API_KEY]
    if args.custom_key:
        api_keys.append(args.custom_key)
    
    # Test API keys
    if args.test:
        print("\n🔐 TESTING API KEYS\n" + "="*50)
        working_key = None
        
        for key in api_keys:
            result = test_api_key(key)
            if result:
                working_key = result
                print(f"\n✅ Found working API key: {working_key[:5]}...{working_key[-5:]}")
                break
        
        if not working_key:
            print("\n❌ None of the API keys worked.")
            return 1
    
    # Create webhook with either working key or first key
    if args.create:
        print("\n📨 CREATING WEBHOOK SUBSCRIPTION\n" + "="*50)
        api_key = args.custom_key if args.custom_key else ORIGINAL_API_KEY
        
        result = create_webhook_subscription(
            api_key=api_key,
            webhook_url=args.webhook_url,
            event_type=args.event_type,
            webhook_secret=args.webhook_secret
        )
        
        if result:
            print("\n✅ Webhook subscription created successfully!")
            return 0
        else:
            print("\n❌ Failed to create webhook subscription.")
            # Try the fixed key if using original key
            if api_key == ORIGINAL_API_KEY:
                print("\n🔄 Trying with fixed API key...")
                result = create_webhook_subscription(
                    api_key=FIXED_API_KEY,
                    webhook_url=args.webhook_url,
                    event_type=args.event_type,
                    webhook_secret=args.webhook_secret
                )
                if result:
                    print("\n✅ Webhook subscription created successfully with fixed key!")
                    return 0
            return 1
    
    return 0

if __name__ == "__main__":
    main() 