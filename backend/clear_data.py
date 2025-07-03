#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from properties.models import Property, Unit, Tenant, Lease, Invoice, PaymentRecord

def clear_all_data():
    print("🗑️  Clearing all demo data...")
    
    print(f"Before deletion:")
    print(f"Properties: {Property.objects.count()}")
    print(f"Units: {Unit.objects.count()}")
    print(f"Tenants: {Tenant.objects.count()}")
    print(f"Leases: {Lease.objects.count()}")
    print(f"Invoices: {Invoice.objects.count()}")
    print(f"Payments: {PaymentRecord.objects.count()}")
    
    # Delete in order to avoid foreign key constraints
    PaymentRecord.objects.all().delete()
    Invoice.objects.all().delete()
    Lease.objects.all().delete()
    Unit.objects.all().delete()
    Tenant.objects.all().delete()
    Property.objects.all().delete()
    
    print(f"\nAfter deletion:")
    print(f"Properties: {Property.objects.count()}")
    print(f"Units: {Unit.objects.count()}")
    print(f"Tenants: {Tenant.objects.count()}")
    print(f"Leases: {Lease.objects.count()}")
    print(f"Invoices: {Invoice.objects.count()}")
    print(f"Payments: {PaymentRecord.objects.count()}")
    
    print("\n✅ Database cleared successfully!")
    print("📝 You can now add your real property data through:")
    print("   • Django Admin: http://localhost:8000/admin/")
    print("   • Or programmatically via the API")

if __name__ == "__main__":
    clear_all_data() 