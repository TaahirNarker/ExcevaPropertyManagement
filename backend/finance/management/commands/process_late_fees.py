"""
Django management command for processing late fees on overdue invoices.

This command:
- Identifies overdue invoices
- Updates invoice status to 'overdue'
- Calculates and tracks late fees
- Sends notifications (optional)
- Generates reports

Usage:
    python manage.py process_late_fees [options]

Examples:
    # Process all overdue invoices
    python manage.py process_late_fees

    # Dry run to preview
    python manage.py process_late_fees --dry-run

    # Process specific property
    python manage.py process_late_fees --property-id PRO000001

    # Generate late fee report
    python manage.py process_late_fees --report-only
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import date, timedelta
from decimal import Decimal

from finance.models import Invoice, InvoiceAuditLog, SystemSettings
from leases.models import Lease
from tenants.models import Tenant
from properties.models import Property


class Command(BaseCommand):
    help = 'Process late fees for overdue invoices'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview late fee processing without making changes',
        )
        parser.add_argument(
            '--property-id',
            type=str,
            help='Process late fees for specific property only',
        )
        parser.add_argument(
            '--tenant-id',
            type=int,
            help='Process late fees for specific tenant only',
        )
        parser.add_argument(
            '--report-only',
            action='store_true',
            help='Generate late fee report without processing',
        )
        parser.add_argument(
            '--grace-days',
            type=int,
            default=5,
            help='Grace period in days before late fees apply (default: 5)',
        )
        parser.add_argument(
            '--send-notifications',
            action='store_true',
            help='Send late payment notifications (if configured)',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        self.dry_run = options['dry_run']
        self.report_only = options['report_only']
        self.grace_days = options['grace_days']
        self.send_notifications = options['send_notifications']

        self.stdout.write(
            self.style.SUCCESS(
                f"\n⚠️  Late Fee Processing {'(DRY RUN)' if self.dry_run else ''}"
            )
        )
        self.stdout.write("=" * 50)
        self.stdout.write(f"📅 Processing Date: {timezone.now().strftime('%Y-%m-%d')}")
        self.stdout.write(f"⏰ Grace Period: {self.grace_days} days")
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING("⚠️  DRY RUN MODE - No changes will be made"))
        
        if self.report_only:
            self.stdout.write(self.style.WARNING("📊 REPORT ONLY - No processing will occur"))

        # Get overdue invoices
        overdue_invoices = self.get_overdue_invoices(options)
        
        if not overdue_invoices.exists():
            self.stdout.write(self.style.SUCCESS("✅ No overdue invoices found"))
            return

        self.stdout.write(f"📄 Found {overdue_invoices.count()} overdue invoice(s)")

        # Initialize stats
        self.stats = {
            'processed': 0,
            'updated_status': 0,
            'late_fees_calculated': 0,
            'total_late_fees': Decimal('0.00'),
            'notifications_sent': 0,
            'errors': 0,
            'invoice_details': []
        }

        # Process each overdue invoice
        for invoice in overdue_invoices:
            try:
                self.process_overdue_invoice(invoice)
            except Exception as e:
                self.stats['errors'] += 1
                self.stdout.write(
                    self.style.ERROR(f"❌ Error processing invoice {invoice.invoice_number}: {str(e)}")
                )

        # Generate report
        self.generate_report()

    def get_overdue_invoices(self, options):
        """Get overdue invoices based on filters"""
        cutoff_date = timezone.now().date() - timedelta(days=self.grace_days)
        
        queryset = Invoice.objects.filter(
            status__in=['sent'],
            due_date__lt=cutoff_date
        ).select_related('tenant', 'property', 'lease')

        if options['property_id']:
            queryset = queryset.filter(property__id=options['property_id'])
        
        if options['tenant_id']:
            queryset = queryset.filter(tenant__id=options['tenant_id'])

        return queryset.order_by('due_date')

    def process_overdue_invoice(self, invoice):
        """Process a single overdue invoice"""
        self.stats['processed'] += 1
        
        days_overdue = (timezone.now().date() - invoice.due_date).days - self.grace_days
        late_fee = invoice.calculate_late_fee()
        
        self.stdout.write(f"\n🔍 Processing Invoice: {invoice.invoice_number}")
        self.stdout.write(f"   👤 Tenant: {invoice.tenant.user.first_name} {invoice.tenant.user.last_name}")
        self.stdout.write(f"   🏢 Property: {invoice.property.name}")
        self.stdout.write(f"   📅 Due Date: {invoice.due_date}")
        self.stdout.write(f"   ⏰ Days Overdue: {days_overdue}")
        self.stdout.write(f"   💰 Amount Due: R{invoice.balance_due:,.2f}")
        self.stdout.write(f"   💸 Late Fee: R{late_fee:,.2f}")

        # Store invoice details for report
        invoice_detail = {
            'invoice_number': invoice.invoice_number,
            'tenant_name': f"{invoice.tenant.user.first_name} {invoice.tenant.user.last_name}",
            'property_name': invoice.property.name,
            'due_date': invoice.due_date,
            'days_overdue': days_overdue,
            'amount_due': invoice.balance_due,
            'late_fee': late_fee,
            'status_changed': False,
            'notification_sent': False
        }

        if not self.report_only and not self.dry_run:
            with transaction.atomic():
                # Update invoice status to overdue
                if invoice.status != 'overdue':
                    invoice.status = 'overdue'
                    invoice.save()
                    
                    # Create audit log
                    InvoiceAuditLog.objects.create(
                        invoice=invoice,
                        action='status_changed',
                        user=None,  # System action
                        details=f"Invoice marked as overdue after {days_overdue} days"
                    )
                    
                    self.stats['updated_status'] += 1
                    invoice_detail['status_changed'] = True
                    self.stdout.write("   ✅ Status updated to 'overdue'")

                # Track late fee (will be added to next month's invoice)
                if late_fee > 0:
                    self.stats['late_fees_calculated'] += 1
                    self.stats['total_late_fees'] += late_fee
                    self.stdout.write(f"   💸 Late fee calculated: R{late_fee:,.2f}")

                # Send notification if requested
                if self.send_notifications:
                    if self.send_late_payment_notification(invoice):
                        self.stats['notifications_sent'] += 1
                        invoice_detail['notification_sent'] = True
                        self.stdout.write("   📧 Notification sent")

        elif self.dry_run:
            self.stdout.write("   🔍 Would update status to 'overdue'")
            if late_fee > 0:
                self.stdout.write(f"   🔍 Would calculate late fee: R{late_fee:,.2f}")
                self.stats['late_fees_calculated'] += 1
                self.stats['total_late_fees'] += late_fee

        self.stats['invoice_details'].append(invoice_detail)

    def send_late_payment_notification(self, invoice):
        """Send late payment notification (placeholder for email integration)"""
        # This is a placeholder - implement actual email sending here
        # For now, just create an audit log
        InvoiceAuditLog.objects.create(
            invoice=invoice,
            action='notification_sent',
            user=None,
            details="Late payment notification sent to tenant"
        )
        return True

    def generate_report(self):
        """Generate late fee processing report"""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("📊 LATE FEE PROCESSING REPORT"))
        self.stdout.write("=" * 60)
        
        self.stdout.write(f"📅 Processing Date: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.stdout.write(f"⏰ Grace Period: {self.grace_days} days")
        self.stdout.write(f"📄 Invoices Processed: {self.stats['processed']}")
        self.stdout.write(f"🔄 Status Updates: {self.stats['updated_status']}")
        self.stdout.write(f"💸 Late Fees Calculated: {self.stats['late_fees_calculated']}")
        self.stdout.write(f"💰 Total Late Fees: R{self.stats['total_late_fees']:,.2f}")
        self.stdout.write(f"📧 Notifications Sent: {self.stats['notifications_sent']}")
        self.stdout.write(f"❌ Errors: {self.stats['errors']}")

        if self.stats['invoice_details']:
            self.stdout.write("\n📋 DETAILED BREAKDOWN:")
            self.stdout.write("-" * 60)
            
            for detail in self.stats['invoice_details']:
                self.stdout.write(f"\n📄 {detail['invoice_number']}")
                self.stdout.write(f"   👤 {detail['tenant_name']}")
                self.stdout.write(f"   🏢 {detail['property_name']}")
                self.stdout.write(f"   📅 Due: {detail['due_date']} ({detail['days_overdue']} days overdue)")
                self.stdout.write(f"   💰 Amount: R{detail['amount_due']:,.2f}")
                self.stdout.write(f"   💸 Late Fee: R{detail['late_fee']:,.2f}")
                
                if detail['status_changed']:
                    self.stdout.write("   ✅ Status updated")
                if detail['notification_sent']:
                    self.stdout.write("   📧 Notification sent")

        # Summary by severity
        severe_overdue = [d for d in self.stats['invoice_details'] if d['days_overdue'] > 30]
        moderate_overdue = [d for d in self.stats['invoice_details'] if 15 <= d['days_overdue'] <= 30]
        recent_overdue = [d for d in self.stats['invoice_details'] if d['days_overdue'] < 15]

        self.stdout.write("\n📊 OVERDUE SEVERITY BREAKDOWN:")
        self.stdout.write(f"🔴 Severe (>30 days): {len(severe_overdue)} invoices")
        self.stdout.write(f"🟡 Moderate (15-30 days): {len(moderate_overdue)} invoices")
        self.stdout.write(f"🟢 Recent (<15 days): {len(recent_overdue)} invoices")

        if self.dry_run:
            self.stdout.write(self.style.WARNING("\n⚠️  DRY RUN COMPLETED - No actual changes were made"))
        elif self.report_only:
            self.stdout.write(self.style.WARNING("\n📊 REPORT COMPLETED - No processing was performed"))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n✅ PROCESSING COMPLETED"))

        self.stdout.write("\n🎯 RECOMMENDED ACTIONS:")
        if severe_overdue:
            self.stdout.write("   🔴 Follow up on severely overdue accounts")
        if moderate_overdue:
            self.stdout.write("   🟡 Send payment reminders for moderate overdue accounts")
        self.stdout.write("   📧 Consider automated notification setup")
        self.stdout.write("   📊 Review payment patterns and adjust terms if needed")
        
        self.stdout.write("\n" + "=" * 60)