"""
Django management command for automated monthly invoice generation.

This command handles:
- Monthly invoice generation for all active leases
- Late fee calculations and penalties
- Rent escalation processing
- Extra charges integration
- Configurable scheduling and manual execution

Usage:
    python manage.py generate_monthly_invoices [options]

Examples:
    # Generate invoices for current month
    python manage.py generate_monthly_invoices

    # Generate invoices for specific month
    python manage.py generate_monthly_invoices --month 2025-09-01

    # Dry run (preview without creating)
    python manage.py generate_monthly_invoices --dry-run

    # Force generation even if invoices exist
    python manage.py generate_monthly_invoices --force

    # Send invoices immediately after generation
    python manage.py generate_monthly_invoices --send-immediately
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging

from leases.models import Lease
from finance.models import (
    Invoice, InvoiceLineItem, SystemSettings, 
    RecurringCharge, RentEscalationLog, InvoiceAuditLog
)
from finance.services import InvoiceGenerationService, RentEscalationService
from tenants.models import Tenant
from properties.models import Property

# Set up logging
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate monthly invoices for all active leases with penalties and extra charges'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=str,
            help='Target month for invoice generation (YYYY-MM-DD format, e.g., 2025-09-01)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview invoice generation without creating actual invoices',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force generation even if invoices already exist for the month',
        )
        parser.add_argument(
            '--send-immediately',
            action='store_true',
            help='Send invoices immediately after generation (locks them)',
        )
        parser.add_argument(
            '--lease-id',
            type=int,
            help='Generate invoice for specific lease ID only',
        )
        parser.add_argument(
            '--property-id',
            type=str,
            help='Generate invoices for specific property only',
        )
        parser.add_argument(
            '--exclude-late-fees',
            action='store_true',
            help='Skip late fee calculations',
        )
        parser.add_argument(
            '--exclude-escalations',
            action='store_true',
            help='Skip rent escalation processing',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        self.dry_run = options['dry_run']
        self.force = options['force']
        self.send_immediately = options['send_immediately']
        self.exclude_late_fees = options['exclude_late_fees']
        self.exclude_escalations = options['exclude_escalations']

        # Determine target month
        if options['month']:
            try:
                self.target_month = datetime.strptime(options['month'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError('Invalid month format. Use YYYY-MM-DD (e.g., 2025-09-01)')
        else:
            # Default to next month
            today = timezone.now().date()
            if today.month == 12:
                self.target_month = date(today.year + 1, 1, 1)
            else:
                self.target_month = date(today.year, today.month + 1, 1)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🚀 Monthly Invoice Generation {'(DRY RUN)' if self.dry_run else ''}"
            )
        )
        self.stdout.write("=" * 60)
        self.stdout.write(f"📅 Target Month: {self.target_month.strftime('%B %Y')}")
        self.stdout.write(f"🕐 Started at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING("⚠️  DRY RUN MODE - No invoices will be created"))
        
        # Get active leases
        leases = self.get_target_leases(options)
        
        if not leases.exists():
            self.stdout.write(self.style.WARNING("⚠️  No active leases found for processing"))
            return

        self.stdout.write(f"🏠 Found {leases.count()} active lease(s) to process")
        
        # Initialize counters
        self.stats = {
            'processed': 0,
            'created': 0,
            'skipped': 0,
            'errors': 0,
            'escalations_applied': 0,
            'late_fees_added': 0,
            'total_amount': Decimal('0.00'),
            'failed_leases': []
        }

        # Process each lease
        for lease in leases:
            try:
                self.process_lease(lease)
            except Exception as e:
                self.stats['errors'] += 1
                self.stats['failed_leases'].append({
                    'lease_id': lease.id,
                    'tenant': str(lease.tenant),
                    'error': str(e)
                })
                logger.error(f"Error processing lease {lease.id}: {str(e)}")
                self.stdout.write(
                    self.style.ERROR(f"❌ Error processing lease {lease.id}: {str(e)}")
                )

        # Print summary
        self.print_summary()

    def get_target_leases(self, options):
        """Get leases to process based on filters"""
        queryset = Lease.objects.filter(status='active').select_related(
            'tenant', 'property', 'landlord'
        ).prefetch_related('recurring_charges')

        if options['lease_id']:
            queryset = queryset.filter(id=options['lease_id'])
        
        if options['property_id']:
            queryset = queryset.filter(property__id=options['property_id'])

        return queryset

    def process_lease(self, lease):
        """Process a single lease for monthly invoice generation"""
        self.stats['processed'] += 1
        
        self.stdout.write(f"\n🔄 Processing Lease #{lease.id}")
        self.stdout.write(f"   👤 Tenant: {lease.tenant.user.first_name} {lease.tenant.user.last_name}")
        self.stdout.write(f"   🏢 Property: {lease.property.name}")
        self.stdout.write(f"   💰 Monthly Rent: R{lease.monthly_rent:,.2f}")

        # Check if invoice already exists
        existing_invoice = Invoice.objects.filter(
            lease=lease,
            billing_period_start__year=self.target_month.year,
            billing_period_start__month=self.target_month.month
        ).first()

        if existing_invoice and not self.force:
            self.stdout.write(f"   ⏭️  Invoice already exists: {existing_invoice.invoice_number}")
            self.stats['skipped'] += 1
            return

        # Process rent escalation if due
        if not self.exclude_escalations:
            self.process_rent_escalation(lease)

        # Calculate billing period
        billing_start = self.target_month
        if billing_start.month == 12:
            billing_end = date(billing_start.year + 1, 1, 1) - timedelta(days=1)
        else:
            billing_end = date(billing_start.year, billing_start.month + 1, 1) - timedelta(days=1)

        # Create invoice
        if not self.dry_run:
            with transaction.atomic():
                invoice = self.create_monthly_invoice(lease, billing_start, billing_end)
                self.stats['created'] += 1
                self.stats['total_amount'] += invoice.total_amount
                
                if self.send_immediately:
                    self.send_invoice(invoice)
        else:
            # Dry run - calculate what would be created
            invoice_data = self.calculate_invoice_preview(lease, billing_start, billing_end)
            self.stats['created'] += 1
            self.stats['total_amount'] += invoice_data['total_amount']
            self.stdout.write(f"   📄 Would create invoice: R{invoice_data['total_amount']:,.2f}")

    def process_rent_escalation(self, lease):
        """Process rent escalation if due"""
        if not lease.next_escalation_date:
            return

        if lease.next_escalation_date <= self.target_month:
            escalation_service = RentEscalationService()
            
            if not self.dry_run:
                old_rent = lease.monthly_rent
                escalation_service.apply_rent_escalation(lease)
                lease.refresh_from_db()
                
                self.stdout.write(
                    f"   📈 Rent escalated: R{old_rent:,.2f} → R{lease.monthly_rent:,.2f}"
                )
                self.stats['escalations_applied'] += 1
            else:
                # Calculate escalation preview
                if lease.escalation_type == 'percentage':
                    new_rent = lease.monthly_rent * (1 + lease.escalation_percentage / 100)
                else:
                    new_rent = lease.monthly_rent + lease.escalation_amount
                
                self.stdout.write(
                    f"   📈 Would escalate rent: R{lease.monthly_rent:,.2f} → R{new_rent:,.2f}"
                )
                self.stats['escalations_applied'] += 1

    def create_monthly_invoice(self, lease, billing_start, billing_end):
        """Create monthly invoice for a lease"""
        invoice_service = InvoiceGenerationService()
        
        # Generate base invoice
        invoice = Invoice.objects.create(
            tenant=lease.tenant,
            property=lease.property,
            lease=lease,
            landlord=lease.property.landlord if hasattr(lease.property, 'landlord') else None,
            invoice_number=invoice_service.generate_invoice_number(),
            title=f"Monthly Invoice - {billing_start.strftime('%B %Y')}",
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=30),
            billing_period_start=billing_start,
            billing_period_end=billing_end,
            status='draft',
            invoice_type='regular',
            created_by=None  # System generated
        )

        # Add base rent line item
        InvoiceLineItem.objects.create(
            invoice=invoice,
            description=f"Monthly Rent - {billing_start.strftime('%B %Y')}",
            category='Rent',
            quantity=1,
            unit_price=lease.monthly_rent,
            total=lease.monthly_rent
        )

        # Add recurring charges
        self.add_recurring_charges(invoice, lease)

        # Add late fees if applicable
        if not self.exclude_late_fees:
            self.add_late_fees(invoice, lease)

        # Apply VAT if commercial property
        if lease.should_apply_vat():
            vat_rate = SystemSettings.get_vat_rate()
            invoice.vat_rate = vat_rate

        # Calculate totals
        invoice.calculate_totals()
        
        self.stdout.write(f"   ✅ Created invoice: {invoice.invoice_number} (R{invoice.total_amount:,.2f})")
        
        # Create audit log
        InvoiceAuditLog.objects.create(
            invoice=invoice,
            action='created',
            user=None,
            details=f"Monthly invoice generated automatically for {billing_start.strftime('%B %Y')}"
        )

        return invoice

    def add_recurring_charges(self, invoice, lease):
        """Add recurring charges to invoice"""
        recurring_charges = RecurringCharge.objects.filter(
            lease=lease,
            is_active=True
        )

        for charge in recurring_charges:
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=charge.description,
                category=charge.category.title(),
                quantity=1,
                unit_price=charge.amount,
                total=charge.amount
            )
            
            self.stdout.write(f"   💡 Added recurring charge: {charge.description} (R{charge.amount:,.2f})")

    def add_late_fees(self, invoice, lease):
        """Add late fees for overdue invoices"""
        # Find overdue invoices
        overdue_invoices = Invoice.objects.filter(
            lease=lease,
            status__in=['sent', 'overdue'],
            due_date__lt=timezone.now().date()
        )

        total_late_fees = Decimal('0.00')
        
        for overdue_invoice in overdue_invoices:
            if overdue_invoice.is_overdue():
                late_fee = overdue_invoice.calculate_late_fee()
                if late_fee > 0:
                    InvoiceLineItem.objects.create(
                        invoice=invoice,
                        description=f"Late Fee - Invoice {overdue_invoice.invoice_number}",
                        category='Late Fee',
                        quantity=1,
                        unit_price=late_fee,
                        total=late_fee
                    )
                    total_late_fees += late_fee

        if total_late_fees > 0:
            self.stdout.write(f"   ⚠️  Added late fees: R{total_late_fees:,.2f}")
            self.stats['late_fees_added'] += 1

    def calculate_invoice_preview(self, lease, billing_start, billing_end):
        """Calculate invoice preview for dry run"""
        total_amount = lease.monthly_rent
        
        # Add recurring charges
        recurring_charges = RecurringCharge.objects.filter(
            lease=lease,
            is_active=True
        )
        for charge in recurring_charges:
            total_amount += charge.amount

        # Add late fees if applicable
        if not self.exclude_late_fees:
            overdue_invoices = Invoice.objects.filter(
                lease=lease,
                status__in=['sent', 'overdue'],
                due_date__lt=timezone.now().date()
            )
            
            for overdue_invoice in overdue_invoices:
                if overdue_invoice.is_overdue():
                    late_fee = overdue_invoice.calculate_late_fee()
                    total_amount += late_fee

        # Apply VAT if applicable
        if lease.should_apply_vat():
            vat_rate = SystemSettings.get_vat_rate()
            vat_amount = total_amount * (vat_rate / 100)
            total_amount += vat_amount

        return {
            'total_amount': total_amount,
            'base_rent': lease.monthly_rent,
            'billing_start': billing_start,
            'billing_end': billing_end
        }

    def send_invoice(self, invoice):
        """Send invoice immediately (lock and update status)"""
        invoice.status = 'sent'
        invoice.sent_at = timezone.now()
        invoice.lock_invoice(None)  # System sent
        
        InvoiceAuditLog.objects.create(
            invoice=invoice,
            action='sent',
            user=None,
            details="Invoice sent automatically after generation"
        )
        
        self.stdout.write(f"   📤 Sent invoice: {invoice.invoice_number}")

    def print_summary(self):
        """Print job execution summary"""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("📊 MONTHLY INVOICE GENERATION SUMMARY"))
        self.stdout.write("=" * 60)
        
        self.stdout.write(f"📅 Target Month: {self.target_month.strftime('%B %Y')}")
        self.stdout.write(f"🕐 Completed: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.stdout.write(f"🏠 Leases Processed: {self.stats['processed']}")
        self.stdout.write(f"📄 Invoices {'Would Be ' if self.dry_run else ''}Created: {self.stats['created']}")
        self.stdout.write(f"⏭️  Invoices Skipped: {self.stats['skipped']}")
        self.stdout.write(f"❌ Errors: {self.stats['errors']}")
        self.stdout.write(f"📈 Rent Escalations Applied: {self.stats['escalations_applied']}")
        self.stdout.write(f"⚠️  Late Fees Added: {self.stats['late_fees_added']}")
        self.stdout.write(f"💰 Total Invoice Amount: R{self.stats['total_amount']:,.2f}")
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING("\n⚠️  DRY RUN COMPLETED - No actual invoices were created"))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✅ SUCCESS - {self.stats['created']} invoices generated"))
        
        if self.stats['failed_leases']:
            self.stdout.write(self.style.ERROR("\n❌ FAILED LEASES:"))
            for failed in self.stats['failed_leases']:
                self.stdout.write(f"   • Lease {failed['lease_id']} ({failed['tenant']}): {failed['error']}")
        
        self.stdout.write("\n🎯 NEXT STEPS:")
        if not self.dry_run and not self.send_immediately:
            self.stdout.write("   • Review generated invoices in Django Admin")
            self.stdout.write("   • Send invoices when ready via the admin interface")
        self.stdout.write("   • Monitor payment status and late fees")
        self.stdout.write("   • Schedule next month's generation")
        
        self.stdout.write("\n" + "=" * 60)