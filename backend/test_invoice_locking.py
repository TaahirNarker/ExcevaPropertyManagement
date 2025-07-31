#!/usr/bin/env python
"""
Test script for invoice locking system
Demonstrates the complete invoice locking workflow
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

from django.contrib.auth import get_user_model
from finance.models import Invoice, InvoiceLineItem, InvoiceAuditLog
from tenants.models import Tenant, Lease
from properties.models import Property
from users.models import CustomUser
from django.utils import timezone
from datetime import date, timedelta

User = get_user_model()


def test_invoice_locking_system():
    print("🧪 Testing Invoice Locking System")
    print("=" * 50)
    
    # Create test user if doesn't exist
    try:
        user = CustomUser.objects.get(username='testuser')
        print(f"✅ Using existing test user: {user.username}")
    except CustomUser.DoesNotExist:
        try:
            user = CustomUser.objects.create_user(
                username='testuser',
                email='test@example.com',
                password='testpass123'
            )
            print(f"✅ Created test user: {user.username}")
        except Exception as e:
            # Try to use any existing user
            user = CustomUser.objects.first()
            if user:
                print(f"✅ Using existing user: {user.username}")
            else:
                print(f"❌ Could not create or find a user: {e}")
                return
    
    # Check if we have test data
    if not Property.objects.exists():
        print("⚠️  No properties found - you may need test data to fully test the system")
        return
    
    property_obj = Property.objects.first()
    
    if not Tenant.objects.exists():
        print("⚠️  No tenants found - you may need test data to fully test the system")
        return
    
    tenant = Tenant.objects.first()
    
    if not Lease.objects.exists():
        print("⚠️  No leases found - you may need test data to fully test the system")
        return
    
    lease = Lease.objects.first()
    
    print(f"📋 Using test data:")
    print(f"   Property: {property_obj.name}")
    print(f"   Tenant: {tenant.name}")
    print(f"   Lease: {lease}")
    
    # Test 1: Create a new invoice
    print("\n🔧 Test 1: Creating new invoice...")
    
    invoice = Invoice.objects.create(
        title="Test Invoice - Locking System",
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        lease=lease,
        property=property_obj,
        tenant=tenant,
        created_by=user,
        tax_rate=15.0,
        notes="Test invoice for locking system"
    )
    
    # Add line item
    InvoiceLineItem.objects.create(
        invoice=invoice,
        description="Monthly Rent",
        category="rent",
        quantity=1,
        unit_price=5000.00
    )
    
    print(f"✅ Created invoice: {invoice.invoice_number}")
    print(f"   Status: {invoice.status}")
    print(f"   Is Locked: {invoice.is_locked}")
    print(f"   Can Edit: {invoice.can_edit()}")
    print(f"   Can Send: {invoice.can_send()}")
    
    # Test 2: Check initial state
    print("\n🔧 Test 2: Checking initial invoice state...")
    assert invoice.status == 'draft', f"Expected draft status, got {invoice.status}"
    assert not invoice.is_locked, "Invoice should not be locked initially"
    assert invoice.can_edit(), "Should be able to edit draft invoice"
    assert invoice.can_send(), "Should be able to send draft invoice"
    print("✅ Initial state checks passed")
    
    # Test 3: Lock the invoice (simulating email send)
    print("\n🔧 Test 3: Locking invoice (simulating email send)...")
    
    invoice.lock_invoice(user)
    invoice.refresh_from_db()
    
    print(f"   Status: {invoice.status}")
    print(f"   Is Locked: {invoice.is_locked}")
    print(f"   Locked At: {invoice.locked_at}")
    print(f"   Locked By: {invoice.locked_by}")
    print(f"   Can Edit: {invoice.can_edit()}")
    print(f"   Can Send: {invoice.can_send()}")
    
    # Test 4: Verify locking restrictions
    print("\n🔧 Test 4: Testing edit restrictions on locked invoice...")
    
    assert invoice.status == 'locked', f"Expected locked status, got {invoice.status}"
    assert invoice.is_locked, "Invoice should be locked"
    assert not invoice.can_edit(), "Should not be able to edit locked invoice"
    assert not invoice.can_send(), "Should not be able to send locked invoice"
    print("✅ Locking restrictions working correctly")
    
    # Test 5: Check audit trail
    print("\n🔧 Test 5: Checking audit trail...")
    
    audit_logs = invoice.audit_logs.all()
    print(f"   Number of audit entries: {audit_logs.count()}")
    
    for log in audit_logs:
        print(f"   - {log.action}: {log.details} (by {log.user}) at {log.timestamp}")
    
    assert audit_logs.filter(action='created').exists(), "Should have creation audit log"
    assert audit_logs.filter(action='locked').exists(), "Should have locking audit log"
    print("✅ Audit trail working correctly")
    
    # Test 6: Test invoice numbering
    print("\n🔧 Test 6: Testing invoice numbering system...")
    
    current_year = timezone.now().year
    expected_pattern = f"INV-{current_year}-"
    
    assert invoice.invoice_number.startswith(expected_pattern), f"Invoice number should start with {expected_pattern}"
    print(f"✅ Invoice numbering working: {invoice.invoice_number}")
    
    # Test 7: Create interim invoice
    print("\n🔧 Test 7: Testing interim invoice creation...")
    
    interim_invoice = Invoice.objects.create(
        title="Interim Invoice - Test Adjustment",
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        lease=lease,
        property=property_obj,
        tenant=tenant,
        created_by=user,
        invoice_type='interim',
        parent_invoice=invoice,
        tax_rate=15.0,
        notes="Test interim invoice"
    )
    
    # Add line item for adjustment
    InvoiceLineItem.objects.create(
        invoice=interim_invoice,
        description="Adjustment - Water bill error",
        category="utilities",
        quantity=1,
        unit_price=-200.00  # Credit adjustment
    )
    
    print(f"✅ Created interim invoice: {interim_invoice.invoice_number}")
    print(f"   Type: {interim_invoice.invoice_type}")
    print(f"   Parent: {interim_invoice.parent_invoice.invoice_number if interim_invoice.parent_invoice else 'None'}")
    print(f"   Amount: R {interim_invoice.total_amount}")
    
    # Test 8: Summary
    print("\n📊 Test Summary:")
    print(f"   Total invoices created: {Invoice.objects.count()}")
    print(f"   Regular invoices: {Invoice.objects.filter(invoice_type='regular').count()}")
    print(f"   Interim invoices: {Invoice.objects.filter(invoice_type='interim').count()}")
    print(f"   Locked invoices: {Invoice.objects.filter(is_locked=True).count()}")
    print(f"   Total audit entries: {InvoiceAuditLog.objects.count()}")
    
    print("\n🎉 All tests passed! Invoice locking system is working correctly.")
    
    # Cleanup (optional)
    # invoice.delete()
    # interim_invoice.delete()
    
    return True


if __name__ == "__main__":
    try:
        test_invoice_locking_system()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc() 