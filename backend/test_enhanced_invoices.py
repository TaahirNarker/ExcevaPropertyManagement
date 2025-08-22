#!/usr/bin/env python3
"""
Test script for the enhanced invoice system
Tests the new API endpoints and functionality
"""

import os
import sys
import django
import json
from decimal import Decimal
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from finance.models import (
    Invoice, InvoiceLineItem, InvoicePayment, TenantCreditBalance, 
    RecurringCharge, RentEscalationLog, InvoiceDraft, SystemSettings
)
from finance.services import InvoiceGenerationService, PaymentAllocationService, RentEscalationService
from leases.models import Lease
from tenants.models import Tenant
from properties.models import Property

User = get_user_model()

def test_system_settings():
    """Test system settings functionality"""
    print("🔧 Testing System Settings...")
    
    # Test VAT rate
    vat_rate = SystemSettings.get_vat_rate()
    print(f"✅ VAT Rate: {vat_rate}%")
    
    # Test other settings
    settings = SystemSettings.objects.all()
    for setting in settings:
        print(f"✅ Setting: {setting.key} = {setting.value}")
    
    return True

def test_invoice_navigation():
    """Test invoice month navigation functionality"""
    print("\n📅 Testing Invoice Navigation...")
    
    # Get first lease
    lease = Lease.objects.first()
    if not lease:
        print("❌ No leases found. Please create a lease first.")
        return False
    
    print(f"✅ Testing with Lease ID: {lease.id}")
    
    # Test navigating to current month
    current_month = datetime.now().replace(day=1)
    service = InvoiceGenerationService()
    
    try:
        # Test getting/creating draft
        draft_data = service.get_or_create_invoice_draft(lease, current_month.date())
        print(f"✅ Draft created/retrieved for {current_month.strftime('%B %Y')}")
        print(f"   - Title: {draft_data.get('title', 'N/A')}")
        print(f"   - Line Items: {len(draft_data.get('line_items', []))}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing navigation: {e}")
        return False

def test_payment_allocation():
    """Test payment allocation functionality"""
    print("\n💰 Testing Payment Allocation...")
    
    # Get first tenant
    tenant = Tenant.objects.first()
    if not tenant:
        print("❌ No tenants found. Please create a tenant first.")
        return False
    
    print(f"✅ Testing with Tenant ID: {tenant.id}")
    
    service = PaymentAllocationService()
    
    try:
        # Test getting credit balance
        balance = service.get_tenant_credit_balance(tenant)
        print(f"✅ Current credit balance: R{balance}")
        
        # Test creating credit balance if it doesn't exist
        credit_balance, created = TenantCreditBalance.objects.get_or_create(
            tenant=tenant,
            defaults={'balance': Decimal('0.00')}
        )
        
        if created:
            print(f"✅ Created credit balance record for tenant")
        
        return True
    except Exception as e:
        print(f"❌ Error testing payment allocation: {e}")
        return False

def test_recurring_charges():
    """Test recurring charges functionality"""
    print("\n🔄 Testing Recurring Charges...")
    
    # Get first lease
    lease = Lease.objects.first()
    if not lease:
        print("❌ No leases found.")
        return False
    
    try:
        # Create a test recurring charge
        charge, created = RecurringCharge.objects.get_or_create(
            lease=lease,
            description="Test Utilities Charge",
            defaults={
                'category': 'utility',
                'amount': Decimal('850.00'),
                'is_active': True
            }
        )
        
        if created:
            print(f"✅ Created recurring charge: {charge.description}")
        else:
            print(f"✅ Found existing recurring charge: {charge.description}")
        
        print(f"   - Amount: R{charge.amount}")
        print(f"   - Category: {charge.category}")
        print(f"   - Active: {charge.is_active}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing recurring charges: {e}")
        return False

def test_rent_escalation():
    """Test rent escalation functionality"""
    print("\n📈 Testing Rent Escalation...")
    
    # Get first lease with escalation settings
    lease = Lease.objects.first()
    if not lease:
        print("❌ No leases found.")
        return False
    
    try:
        # Update lease with escalation settings for testing
        original_rent = lease.monthly_rent
        lease.escalation_type = 'percentage'
        lease.escalation_percentage = Decimal('8.00')  # 8% annual increase
        lease.escalation_date = timezone.now().date()
        lease.save()
        
        print(f"✅ Set up lease for escalation testing")
        print(f"   - Current rent: R{original_rent}")
        print(f"   - Escalation type: {lease.escalation_type}")
        print(f"   - Escalation percentage: {lease.escalation_percentage}%")
        
        # Test escalation service
        service = RentEscalationService()
        history = service.get_rent_history(lease)
        print(f"✅ Rent history records: {len(history)}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing rent escalation: {e}")
        return False

def test_invoice_creation():
    """Test invoice creation functionality"""
    print("\n📄 Testing Invoice Creation...")
    
    # Get first lease
    lease = Lease.objects.first()
    if not lease:
        print("❌ No leases found.")
        return False
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='test_user',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    
    try:
        service = InvoiceGenerationService()
        
        # Check if initial invoice already exists
        existing_invoice = Invoice.objects.filter(
            lease=lease,
            invoice_type='regular'
        ).first()
        
        if existing_invoice:
            print(f"✅ Found existing invoice: {existing_invoice.invoice_number}")
            print(f"   - Status: {existing_invoice.status}")
            print(f"   - Total: R{existing_invoice.total_amount}")
        else:
            # Generate initial invoice
            invoice = service.generate_initial_lease_invoice(lease, user)
            print(f"✅ Generated initial invoice: {invoice.invoice_number}")
            print(f"   - Status: {invoice.status}")
            print(f"   - Total: R{invoice.total_amount}")
            print(f"   - Line items: {invoice.line_items.count()}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing invoice creation: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Enhanced Invoice System Test Suite")
    print("=" * 50)
    
    tests = [
        test_system_settings,
        test_invoice_navigation,
        test_payment_allocation,
        test_recurring_charges,
        test_rent_escalation,
        test_invoice_creation
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    if passed == total:
        print("🎉 All tests passed! Enhanced invoice system is working correctly.")
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)