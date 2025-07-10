"""
Django management command to create sample properties
This creates sample data that matches the design shown in the properties interface
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from properties.models import Property
from decimal import Decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample properties for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing properties before creating new ones',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creating sample properties...'))

        # Get or create a user to own the properties
        try:
            owner = User.objects.filter(is_staff=True).first()
            if not owner:
                owner = User.objects.first()
            
            if not owner:
                self.stdout.write(
                    self.style.ERROR('No users found. Please create a user first.')
                )
                return

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error getting user: {e}')
            )
            return

        # Clear existing properties if requested
        if options['clear']:
            Property.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing properties'))

        # Sample properties data that matches the screenshot
        sample_properties = [
            {
                'name': 'Fish City',
                'property_type': 'business',
                'street_address': 'Shop 9 Gatesville',
                'suburb': 'Gatesville',
                'city': 'Cape Town',
                'province': 'western_cape',
                'postal_code': '7764',
                'status': 'vacant',
                'monthly_rental_amount': Decimal('8500.00'),
                'is_active': True,
                'description': 'Commercial business space in Gatesville shopping center',
            },
            {
                'name': 'HOME',
                'property_type': 'house',
                'street_address': '20 Old Farm Road',
                'suburb': 'Rondebosch',
                'city': 'Cape Town',
                'province': 'western_cape',
                'postal_code': '7700',
                'bedrooms': 7,
                'bathrooms': 3,
                'square_meters': Decimal('250.00'),
                'status': 'vacant',
                'monthly_rental_amount': Decimal('25000.00'),
                'is_active': True,
                'description': 'Large family home in sought-after Rondebosch area',
            },
            {
                'name': '59 Rietfontein Rd',
                'property_type': 'flat',
                'street_address': '59 Rietfontein Road',
                'suburb': 'Rivonia',
                'city': 'Johannesburg',
                'province': 'gauteng',
                'postal_code': '2128',
                'bedrooms': 2,
                'bathrooms': 1,
                'square_meters': Decimal('85.00'),
                'status': 'vacant',
                'monthly_rental_amount': Decimal('12000.00'),
                'is_active': True,
                'description': 'Modern 2-bedroom flat in Rivonia business district',
            },
            {
                'name': '3800 Klipfontein Rd',
                'property_type': 'retail',
                'street_address': '3800 Klipfontein Road',
                'suburb': 'Athlone',
                'city': 'Cape Town',
                'province': 'western_cape',
                'postal_code': '7764',
                'status': 'occupied',
                'monthly_rental_amount': Decimal('15000.00'),
                'is_active': True,
                'description': 'Retail space on busy Klipfontein Road',
            },
            {
                'name': 'Ocean View Apartment',
                'property_type': 'apartment',
                'street_address': '123 Beach Road',
                'suburb': 'Sea Point',
                'city': 'Cape Town',
                'province': 'western_cape',
                'postal_code': '8005',
                'bedrooms': 3,
                'bathrooms': 2,
                'square_meters': Decimal('120.00'),
                'status': 'occupied',
                'monthly_rental_amount': Decimal('22000.00'),
                'is_active': True,
                'description': 'Stunning ocean view apartment in Sea Point',
            },
            {
                'name': 'Industrial Warehouse',
                'property_type': 'industrial',
                'street_address': '456 Factory Street',
                'suburb': 'Epping',
                'city': 'Cape Town',
                'province': 'western_cape',
                'postal_code': '7460',
                'square_meters': Decimal('2000.00'),
                'parking_spaces': 20,
                'status': 'vacant',
                'monthly_rental_amount': Decimal('35000.00'),
                'is_active': True,
                'description': 'Large industrial warehouse with ample parking',
            },
            {
                'name': 'Sandton Office Space',
                'property_type': 'office',
                'street_address': '789 Rivonia Road',
                'suburb': 'Sandton',
                'city': 'Johannesburg',
                'province': 'gauteng',
                'postal_code': '2196',
                'square_meters': Decimal('180.00'),
                'parking_spaces': 5,
                'status': 'maintenance',
                'monthly_rental_amount': Decimal('28000.00'),
                'is_active': True,
                'description': 'Premium office space in Sandton CBD',
            },
            {
                'name': 'Durban Beachfront',
                'property_type': 'apartment',
                'street_address': '321 Marine Parade',
                'suburb': 'Durban Central',
                'city': 'Durban',
                'province': 'kwazulu_natal',
                'postal_code': '4001',
                'bedrooms': 2,
                'bathrooms': 2,
                'square_meters': Decimal('95.00'),
                'status': 'occupied',
                'monthly_rental_amount': Decimal('18000.00'),
                'is_active': True,
                'description': 'Beachfront apartment with sea views',
            },
        ]

        # Create properties
        created_count = 0
        for prop_data in sample_properties:
            try:
                property_obj = Property.objects.create(
                    owner=owner,
                    **prop_data
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created property: {property_obj.property_code} - {property_obj.name}'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating property {prop_data["name"]}: {e}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} sample properties!')
        )
        
        # Display summary
        total_properties = Property.objects.count()
        active_properties = Property.objects.filter(is_active=True).count()
        vacant_properties = Property.objects.filter(status='vacant').count()
        occupied_properties = Property.objects.filter(status='occupied').count()
        
        self.stdout.write(f'\nProperty Summary:')
        self.stdout.write(f'Total Properties: {total_properties}')
        self.stdout.write(f'Active Properties: {active_properties}')
        self.stdout.write(f'Vacant Properties: {vacant_properties}')
        self.stdout.write(f'Occupied Properties: {occupied_properties}')
        
        # Show property codes for reference
        self.stdout.write(f'\nProperty Codes:')
        for prop in Property.objects.all().order_by('property_code'):
            self.stdout.write(f'  {prop.property_code} - {prop.name} ({prop.get_status_display()})') 