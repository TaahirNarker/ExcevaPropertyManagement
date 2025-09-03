#!/usr/bin/env python3
"""
Test script for tenant assignment functionality
"""

import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
PROPERTY_CODE = "PRO000001"  # Use an existing property code

def test_get_available_tenants():
    """Test getting available tenants for a property"""
    print("Testing GET /properties/{property_code}/assign-tenant/")
    
    url = f"{BASE_URL}/properties/{PROPERTY_CODE}/assign-tenant/"
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Available tenants:")
            print(f"Property: {data['property']['name']} ({data['property']['property_code']})")
            print(f"Available tenants: {len(data['available_tenants'])}")
            
            for tenant in data['available_tenants']:
                print(f"  - {tenant['name']} ({tenant['tenant_code']}) - {tenant['employment_status']}")
        else:
            print(f"❌ Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

def test_assign_tenant():
    """Test assigning a tenant to a property"""
    print("\nTesting POST /properties/{property_code}/assign-tenant/")
    
    url = f"{BASE_URL}/properties/{PROPERTY_CODE}/assign-tenant/"
    
    # Sample data for tenant assignment
    data = {
        "tenant_id": 1,  # This would need to be a real tenant ID
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "monthly_rent": 5000.00,
        "deposit_amount": 5000.00
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("✅ Success! Tenant assigned:")
            print(f"Message: {result['message']}")
            print(f"Lease ID: {result['lease_id']}")
            print(f"Property Status: {result['property_status']}")
        else:
            print(f"❌ Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("🧪 Testing Tenant Assignment API Endpoints")
    print("=" * 50)
    
    test_get_available_tenants()
    test_assign_tenant()
    
    print("\n" + "=" * 50)
    print("Test completed!")
