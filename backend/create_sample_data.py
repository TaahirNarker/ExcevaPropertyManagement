#!/usr/bin/env python
"""
Create sample data for Property Control System
Run this with: python manage.py shell < create_sample_data.py
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from properties.models import Property, Unit
from tenants.models import Tenant, Lease
from finance.models import Invoice, Payment

def create_sample_data():
    print("🏢 Creating sample properties...")
    
    # Create Properties
    property1, created = Property.objects.get_or_create(
        name="Sunset Apartments",
        defaults={
            "address": "123 Main Street, Cape Town, 8001",
            "property_type": "residential",
            "purchase_price": Decimal("2500000.00"),
            "current_market_value": Decimal("3200000.00"),
            "total_units": 12,
            "description": "Modern residential apartment complex with sea views"
        }
    )
    
    property2, created = Property.objects.get_or_create(
        name="Ocean View Complex",
        defaults={
            "address": "456 Beach Road, Durban, 4001",
            "property_type": "residential", 
            "purchase_price": Decimal("1800000.00"),
            "current_market_value": Decimal("2400000.00"),
            "total_units": 8,
            "description": "Luxury beachfront apartments"
        }
    )
    
    property3, created = Property.objects.get_or_create(
        name="City Center Plaza",
        defaults={
            "address": "789 Business Avenue, Johannesburg, 2001",
            "property_type": "commercial",
            "purchase_price": Decimal("4200000.00"),
            "current_market_value": Decimal("5100000.00"),
            "total_units": 15,
            "description": "Prime commercial office space in CBD"
        }
    )
    
    print("🏠 Creating sample units...")
    
    # Create Units for Property 1 (Sunset Apartments)
    units_data = [
        {"number": "101", "type": "bachelor", "rent": 8500, "size": 45, "status": "occupied"},
        {"number": "102", "type": "1_bedroom", "rent": 12000, "size": 65, "status": "occupied"},
        {"number": "103", "type": "1_bedroom", "rent": 12000, "size": 65, "status": "vacant"},
        {"number": "201", "type": "2_bedroom", "rent": 18000, "size": 85, "status": "occupied"},
        {"number": "202", "type": "2_bedroom", "rent": 18000, "size": 85, "status": "occupied"},
        {"number": "203", "type": "2_bedroom", "rent": 18000, "size": 85, "status": "maintenance"},
    ]
    
    for unit_data in units_data:
        Unit.objects.get_or_create(
            property_ref=property1,
            unit_number=unit_data["number"],
            defaults={
                "unit_type": unit_data["type"],
                "monthly_rent": Decimal(str(unit_data["rent"])),
                "size_sqm": Decimal(str(unit_data["size"])),
                "status": unit_data["status"]
            }
        )
    
    # Create Units for Property 2 (Ocean View)
    for i in range(1, 5):
        Unit.objects.get_or_create(
            property_ref=property2,
            unit_number=f"A{i}",
            defaults={
                "unit_type": "2_bedroom",
                "monthly_rent": Decimal("22000.00"),
                "size_sqm": Decimal("95.0"),
                "status": "occupied" if i <= 3 else "vacant"
            }
        )
    
    # Create Units for Property 3 (Commercial)
    for i in range(1, 6):
        Unit.objects.get_or_create(
            property_ref=property3,
            unit_number=f"Office {i}",
            defaults={
                "unit_type": "office",
                "monthly_rent": Decimal("35000.00"),
                "size_sqm": Decimal("120.0"),
                "status": "occupied" if i <= 4 else "vacant"
            }
        )
    
    print("👥 Creating sample tenants...")
    
    # Create Tenants
    tenants_data = [
        {"name": "John Smith", "email": "john.smith@email.com", "phone_number": "+27 82 123 4567", "id_number": "8001015009087"},
        {"name": "Sarah Johnson", "email": "sarah.johnson@email.com", "phone_number": "+27 83 987 6543", "id_number": "9205234567890"},
        {"name": "Michael Brown", "email": "michael.brown@email.com", "phone_number": "+27 84 555 1234", "id_number": "7809123456789"},
        {"name": "Lisa Davis", "email": "lisa.davis@email.com", "phone_number": "+27 85 777 8888", "id_number": "8512019876543"},
        {"name": "David Wilson", "email": "david.wilson@email.com", "phone_number": "+27 86 999 0000", "id_number": "7503086543210"},
    ]
    
    tenants = []
    for tenant_data in tenants_data:
        tenant, created = Tenant.objects.get_or_create(
            email=tenant_data["email"],
            defaults=tenant_data
        )
        tenants.append(tenant)
    
    print("📋 Creating sample leases...")
    
    # Create Leases (connect tenants to units)
    occupied_units = Unit.objects.filter(status="occupied")
    
    for i, unit in enumerate(occupied_units[:len(tenants)]):
        start_date = date.today() - timedelta(days=30 * (i + 1))  # Started 1-5 months ago
        end_date = start_date + timedelta(days=365)  # 1 year lease
        
        Lease.objects.get_or_create(
            tenant=tenants[i],
            unit=unit,
            defaults={
                "start_date": start_date,
                "end_date": end_date,
                "monthly_rent": unit.monthly_rent,
                "security_deposit": unit.monthly_rent * 2,  # 2 months deposit
                "status": "active",
                "rent_due_day": 1
            }
        )
    
    print("📄 Creating sample invoices...")
    
    # Create Invoices for active leases
    active_leases = Lease.objects.filter(status="active")
    
    for lease in active_leases:
        # Create current month invoice
        current_date = date.today()
        due_date = current_date.replace(day=7)  # Due on 7th of month
        
        invoice, created = Invoice.objects.get_or_create(
            lease=lease,
            issue_date=current_date.replace(day=1),
            defaults={
                "due_date": due_date,
                "amount": lease.monthly_rent,
                "invoice_type": "rent",
                "description": f"Monthly rent for {lease.unit.unit_number}",
                "status": "sent" if current_date.day > 7 else "sent",
                "billing_period_start": current_date.replace(day=1),
                "billing_period_end": (current_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            }
        )
        
        # Randomly pay some invoices
        if hash(lease.tenant.name) % 3 != 0:  # Pay ~67% of invoices
            invoice.amount_paid = invoice.amount
            invoice.status = "paid"
            invoice.save()
            
            # Create payment record
            Payment.objects.get_or_create(
                invoice=invoice,
                defaults={
                    "amount": invoice.amount,
                    "payment_date": due_date + timedelta(days=hash(lease.tenant.name) % 5),
                    "payment_method": "bank_transfer",
                    "bank_reference": f"REF{invoice.id:04d}",
                    "is_verified": True,
                    "notes": "Rent payment via bank transfer"
                }
            )
    
    print("✅ Sample data created successfully!")
    print(f"📊 Summary:")
    print(f"   Properties: {Property.objects.count()}")
    print(f"   Units: {Unit.objects.count()}")
    print(f"   Tenants: {Tenant.objects.count()}")
    print(f"   Leases: {Lease.objects.count()}")
    print(f"   Invoices: {Invoice.objects.count()}")
    print(f"   Payments: {Payment.objects.count()}")

if __name__ == "__main__":
    create_sample_data() 