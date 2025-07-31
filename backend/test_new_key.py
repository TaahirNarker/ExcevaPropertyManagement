#!/usr/bin/env python3
"""
Test the new Strike API key to make sure it works properly
"""
import requests
import json
import sys

# New API key
API_KEY = "9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"
BASE_URL = "https://api.strike.me/v1"

def test_api_key():
    """Test if the API key works for basic operations"""
    endpoints = [
        "/subscriptions",  # List webhook subscriptions
        "/rates/ticker"    # Get exchange rates
    ]
    
    print("\n🔑 Testing new API key")
    print("=" * 60)
    
    all_successful = True
    
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        
        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Accept': 'application/json'
        }
        
        print(f"\n📡 Testing endpoint: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Success! Endpoint working.")
                try:
                    data = response.json()
                    print(f"Data sample: {json.dumps(data)[:200]}...")
                except:
                    print("Response is not JSON format")
            else:
                all_successful = False
                print(f"❌ Failed! Response: {response.text}")
                
        except Exception as e:
            all_successful = False
            print(f"❌ Error: {str(e)}")
    
    return all_successful

if __name__ == "__main__":
    success = test_api_key()
    if success:
        print("\n✅ API key is working properly!")
        sys.exit(0)
    else:
        print("\n❌ API key has issues with some endpoints.")
        sys.exit(1) 