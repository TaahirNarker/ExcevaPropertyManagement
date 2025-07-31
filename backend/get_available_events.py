#!/usr/bin/env python3
"""
Script to fetch available Strike webhook event types
"""
import requests
import json
import sys

# Corrected API key (new key)
API_KEY = "9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"
BASE_URL = "https://api.strike.me/v1"

def get_available_event_types():
    """Fetch available event types for webhooks"""
    url = f"{BASE_URL}/event-types"  # Assuming this endpoint exists
    
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Accept': 'application/json'
    }
    
    try:
        print(f"Fetching available event types from: {url}")
        response = requests.get(url, headers=headers)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            return None
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def try_alternative_endpoints():
    """Try several possible endpoints to find event types"""
    endpoints = [
        "/event-types",
        "/events/types",
        "/webhook-events",
        "/subscriptions/event-types",
        "/documentation/webhook-events",
        "/docs/webhook-events"
    ]
    
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        
        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Accept': 'application/json'
        }
        
        try:
            print(f"\nTrying: {url}")
            response = requests.get(url, headers=headers)
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"Response: {response.text[:500]}")
                print("✅ Success! This endpoint might have event type information.")
            elif response.status_code == 404:
                print("❌ Endpoint not found.")
            else:
                print(f"Response: {response.text[:500]}")
                
        except Exception as e:
            print(f"Error: {str(e)}")

def main():
    print("\n🔍 Searching for available Strike webhook event types")
    print("=" * 60)
    
    # Try to get event types from standard endpoint
    event_types = get_available_event_types()
    
    if event_types:
        print("\n✅ Found available event types:")
        print(json.dumps(event_types, indent=2))
    else:
        print("\n❌ Could not find event types through standard endpoint.")
        print("\nTrying alternative endpoints...")
        try_alternative_endpoints()
        
        print("\n⚠️ Based on errors when creating webhooks, it seems:")
        print("- 'invoice.created' is a valid event type")
        print("- 'invoice.updated' is a valid event type")
        print("- 'invoice.paid' appears NOT to be a valid event type")
        print("- 'invoice.canceled' appears NOT to be a valid event type")
        
        print("\nPossible alternatives to try:")
        print("- 'invoice.payment'")
        print("- 'invoice.completed'")
        print("- 'invoice.settlement'")
        print("- 'invoice.cancelled' (different spelling)")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 