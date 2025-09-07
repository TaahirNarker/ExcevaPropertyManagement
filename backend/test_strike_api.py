#!/usr/bin/env python3
"""
Test script for Strike API connectivity
Tests direct API access to validate the API key and permissions
"""

import os
import requests
import json
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# API Configuration
API_KEY = os.getenv('STRIKE_API_KEY')
API_BASE_URL = os.getenv('STRIKE_API_BASE_URL', 'https://api.strike.me/v1')

def test_api_connection():
    """Test basic API connectivity and authentication"""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    
    print(f"Using API KEY: {API_KEY[:5]}...{API_KEY[-5:]}")
    print(f"API Base URL: {API_BASE_URL}")
    
    # Test endpoints
    test_endpoints = [
        # Basic account/profile endpoints
        ('/me', 'GET'),  # Get own profile
        ('/accounts/me/profile', 'GET'),  # Alternative profile endpoint
        
        # Rates endpoint for checking exchange rates
        ('/rates/ticker', 'GET'), 
        
        # Test a simple POST with minimal test data
        ('/invoices', 'POST', {
            'amount': {
                'currency': 'ZAR',
                'amount': '100.00'
            },
            'description': 'Test Invoice'
        })
    ]
    
    for endpoint_info in test_endpoints:
        endpoint = endpoint_info[0]
        method = endpoint_info[1]
        data = endpoint_info[2] if len(endpoint_info) > 2 else None
        
        url = f"{API_BASE_URL}{endpoint}"
        print(f"\n\nTesting {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                print(f"POST data: {json.dumps(data)}")
                response = requests.post(url, headers=headers, json=data)
            else:
                print(f"Unsupported method: {method}")
                continue
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200 or response.status_code == 201:
                print("SUCCESS!")
                try:
                    # Pretty print the first part of the response
                    resp_json = response.json()
                    resp_str = json.dumps(resp_json, indent=2)
                    # Print just the first 500 characters to avoid huge output
                    print(f"Response: {resp_str[:500]}")
                    if len(resp_str) > 500:
                        print("... (response truncated)")
                except:
                    print(f"Response: {response.text[:200]}")
            else:
                print(f"ERROR: {response.text}")
                
        except Exception as e:
            print(f"Exception: {str(e)}")

if __name__ == '__main__':
    if not API_KEY:
        print("ERROR: STRIKE_API_KEY not found in environment variables")
        sys.exit(1)
    
    test_api_connection() 