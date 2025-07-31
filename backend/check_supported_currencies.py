#!/usr/bin/env python3
"""
Check supported currencies for Strike account
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Configuration
API_KEY = os.getenv('STRIKE_API_KEY')
API_BASE_URL = os.getenv('STRIKE_API_BASE_URL', 'https://api.strike.me/v1')

def check_supported_currencies():
    """Check which currencies are supported by the Strike account"""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    
    # Try a few different endpoints that might give us currency info
    endpoints = [
        '/accounts',  # List all accounts
        '/currencies/available',  # Try direct currency endpoint
        '/balances',  # Check balances which should show available currencies
        '/accounts/profile'  # Try profile info
    ]
    
    for endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        print(f"\nTesting GET {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            
            # Print the response
            try:
                resp_json = response.json()
                print(json.dumps(resp_json, indent=2))
            except:
                print(response.text)
                
        except Exception as e:
            print(f"Error: {str(e)}")
            
    # Try checking a specific currency we know works for rates
    print("\nTesting supported currencies through rates API")
    currencies = ["BTC", "USD", "EUR", "GBP", "USDT", "AUD"]
    
    for currency in currencies:
        # Try creating an invoice with this currency
        try:
            test_invoice = {
                "amount": {
                    "currency": currency,
                    "amount": "10.00"
                },
                "description": f"Test Invoice in {currency}"
            }
            
            url = f"{API_BASE_URL}/invoices"
            print(f"\nTesting invoice creation with {currency}")
            response = requests.post(url, headers=headers, json=test_invoice)
            
            print(f"Status Code: {response.status_code}")
            try:
                resp_json = response.json()
                print(json.dumps(resp_json, indent=2))
            except:
                print(response.text)
                
        except Exception as e:
            print(f"Error: {str(e)}")
            
if __name__ == '__main__':
    if not API_KEY:
        print("ERROR: STRIKE_API_KEY not found in environment variables")
        exit(1)
        
    check_supported_currencies() 