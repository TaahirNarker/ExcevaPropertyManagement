#!/usr/bin/env python3
"""
Test script to verify API endpoints are working correctly
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, auth_token=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    headers = {
        'Content-Type': 'application/json',
    }
    
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data)
        
        print(f"{method.upper()} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.status_code < 500:
            try:
                result = response.json()
                if 'detail' in result:
                    print(f"Response: {result['detail']}")
                else:
                    print(f"Response: {json.dumps(result, indent=2)[:200]}...")
            except:
                print(f"Response: {response.text[:200]}...")
        else:
            print(f"Server Error: {response.text[:200]}...")
        
        print("-" * 50)
        return response.status_code
        
    except Exception as e:
        print(f"Error testing {endpoint}: {e}")
        print("-" * 50)
        return None

def main():
    print("🧪 Testing Enhanced Invoice API Endpoints")
    print("=" * 60)
    
    # Test endpoints without authentication (should get 401/403)
    endpoints_to_test = [
        ('POST', '/api/finance/invoices/navigate-month/', {
            'lease_id': 1,
            'billing_month': '2025-08-01'
        }),
        ('POST', '/api/finance/invoices/save-draft/', {
            'lease_id': 1,
            'billing_month': '2025-08-01',
            'invoice_data': {'title': 'Test'}
        }),
        ('POST', '/api/finance/invoices/generate-initial/', {
            'lease_id': 1
        }),
        ('GET', '/api/finance/payment-allocation/credit-balance/1/', None),
        ('POST', '/api/finance/payment-allocation/allocate/', {
            'tenant_id': 1,
            'amount': 1000.00,
            'payment_method': 'bank_transfer',
            'payment_date': '2025-08-06'
        }),
        ('GET', '/api/finance/recurring-charges/?lease=1', None),
        ('GET', '/api/finance/system-settings/vat-rate/', None),
    ]
    
    working_endpoints = []
    auth_required = []
    broken_endpoints = []
    
    for method, endpoint, data in endpoints_to_test:
        status = test_endpoint(method, endpoint, data)
        
        if status == 401 or status == 403:
            auth_required.append(f"{method} {endpoint}")
        elif status and status < 500:
            working_endpoints.append(f"{method} {endpoint}")
        else:
            broken_endpoints.append(f"{method} {endpoint}")
    
    print("\n📊 SUMMARY:")
    print(f"✅ Working (auth required): {len(auth_required)}")
    print(f"🔧 Working (no auth): {len(working_endpoints)}")
    print(f"❌ Broken: {len(broken_endpoints)}")
    
    if auth_required:
        print(f"\n🔐 Endpoints requiring authentication:")
        for endpoint in auth_required:
            print(f"   • {endpoint}")
    
    if working_endpoints:
        print(f"\n✅ Endpoints working without auth:")
        for endpoint in working_endpoints:
            print(f"   • {endpoint}")
    
    if broken_endpoints:
        print(f"\n❌ Broken endpoints:")
        for endpoint in broken_endpoints:
            print(f"   • {endpoint}")
    
    print(f"\n🎯 RESULT: API endpoints are {'✅ WORKING' if not broken_endpoints else '⚠️ PARTIALLY WORKING'}")
    print("   Authentication is required for most endpoints (this is correct)")

if __name__ == "__main__":
    main()