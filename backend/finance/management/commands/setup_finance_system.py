"""
Management command to set up initial finance system settings and configurations.
"""
from django.core.management.base import BaseCommand
from finance.models import SystemSettings, ExpenseCategory


class Command(BaseCommand):
    help = 'Set up initial finance system settings'
    
    def handle(self, *args, **options):
        """Set up default system settings"""
        
        settings_to_create = [
            {
                'key': 'vat_rate',
                'value': '15.0',
                'setting_type': 'vat_rate',
                'description': 'VAT rate percentage for commercial properties (South Africa standard)'
            },
            {
                'key': 'invoice_terms',
                'value': 'Payment is due within 30 days of invoice date. Late fees may apply after the grace period.',
                'setting_type': 'invoice_terms',
                'description': 'Default terms and conditions for invoices'
            },
            {
                'key': 'late_fee_compound',
                'value': 'true',
                'setting_type': 'late_fee_compound',
                'description': 'Whether late fees should compound (apply to previous late fees)'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for setting_data in settings_to_create:
            setting, created = SystemSettings.objects.get_or_create(
                key=setting_data['key'],
                defaults=setting_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created setting: {setting_data["key"]} = {setting_data["value"]}')
                )
            else:
                # Update existing setting if needed
                if setting.value != setting_data['value']:
                    setting.value = setting_data['value']
                    setting.description = setting_data['description']
                    setting.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated setting: {setting_data["key"]} = {setting_data["value"]}')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'Setting already exists: {setting_data["key"]} = {setting.value}')
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nFinance system setup complete!\n'
                f'Created: {created_count} settings\n'
                f'Updated: {updated_count} settings\n'
                f'Total settings: {SystemSettings.objects.count()}'
            )
        )

        # Seed default expense categories if not present
        self.stdout.write(self.style.WARNING('\nChecking default expense categories...'))
        default_categories = [
            ('Maintenance & Repairs', ''),
            ('Utilities', ''),
            ('Insurance', ''),
            ('Property Management', ''),
            ('Supplies & Materials', ''),
            ('Professional Services', ''),
            ('Banking & Finance', ''),
            ('Other Operating Expenses', ''),
        ]

        cat_created = 0
        for name, desc in default_categories:
            obj, created = ExpenseCategory.objects.get_or_create(
                name=name,
                defaults={'description': desc, 'is_active': True}
            )
            if created:
                cat_created += 1
        self.stdout.write(self.style.SUCCESS(f'Expense categories created: {cat_created}'))