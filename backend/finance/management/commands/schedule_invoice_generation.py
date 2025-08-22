"""
Django management command for scheduling automated invoice generation.

This command provides scheduling utilities and can be used with cron jobs
or task schedulers to automate the monthly invoice generation process.

Usage:
    python manage.py schedule_invoice_generation [options]

Examples:
    # Check if generation is due today
    python manage.py schedule_invoice_generation --check-due

    # Generate cron job configuration
    python manage.py schedule_invoice_generation --generate-cron

    # Run scheduled generation (for cron)
    python manage.py schedule_invoice_generation --run-scheduled
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.management import call_command
from datetime import datetime, date
import calendar

from finance.models import SystemSettings


class Command(BaseCommand):
    help = 'Schedule and manage automated invoice generation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-due',
            action='store_true',
            help='Check if invoice generation is due today',
        )
        parser.add_argument(
            '--generate-cron',
            action='store_true',
            help='Generate cron job configuration for automated scheduling',
        )
        parser.add_argument(
            '--run-scheduled',
            action='store_true',
            help='Run scheduled invoice generation (for use in cron jobs)',
        )
        parser.add_argument(
            '--generation-day',
            type=int,
            default=25,
            help='Day of month to generate invoices (default: 25)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be done without executing',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        self.generation_day = options['generation_day']
        self.dry_run = options['dry_run']

        if options['check_due']:
            self.check_generation_due()
        elif options['generate_cron']:
            self.generate_cron_config()
        elif options['run_scheduled']:
            self.run_scheduled_generation()
        else:
            self.show_help()

    def check_generation_due(self):
        """Check if invoice generation is due today"""
        today = timezone.now().date()
        
        self.stdout.write(
            self.style.SUCCESS("\n🕐 Invoice Generation Schedule Check")
        )
        self.stdout.write("=" * 50)
        self.stdout.write(f"📅 Today: {today.strftime('%Y-%m-%d (%A)')}")
        self.stdout.write(f"🎯 Generation Day: {self.generation_day} of each month")
        
        # Check if today is the generation day
        is_due = today.day == self.generation_day
        
        if is_due:
            self.stdout.write(self.style.SUCCESS("✅ Invoice generation IS DUE today!"))
            
            # Calculate target month (next month)
            if today.month == 12:
                target_month = date(today.year + 1, 1, 1)
            else:
                target_month = date(today.year, today.month + 1, 1)
            
            self.stdout.write(f"📄 Target month: {target_month.strftime('%B %Y')}")
            
            if not self.dry_run:
                self.stdout.write("\n🚀 Running invoice generation...")
                call_command('generate_monthly_invoices', month=target_month.strftime('%Y-%m-%d'))
            else:
                self.stdout.write("\n⚠️  DRY RUN - Would run invoice generation now")
        else:
            days_until_next = self.calculate_days_until_next_generation(today)
            self.stdout.write(f"⏳ Invoice generation is NOT due today")
            self.stdout.write(f"📅 Next generation in {days_until_next} days")

    def calculate_days_until_next_generation(self, today):
        """Calculate days until next generation"""
        if today.day < self.generation_day:
            # This month
            next_generation = date(today.year, today.month, self.generation_day)
        else:
            # Next month
            if today.month == 12:
                next_generation = date(today.year + 1, 1, self.generation_day)
            else:
                next_month = today.month + 1
                # Handle months with fewer days
                max_day = calendar.monthrange(today.year, next_month)[1]
                generation_day = min(self.generation_day, max_day)
                next_generation = date(today.year, next_month, generation_day)
        
        return (next_generation - today).days

    def generate_cron_config(self):
        """Generate cron job configuration"""
        self.stdout.write(
            self.style.SUCCESS("\n⚙️  Cron Job Configuration Generator")
        )
        self.stdout.write("=" * 50)
        
        # Get Django project path
        import os
        project_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        self.stdout.write("📋 Copy the following cron job configurations:\n")
        
        # Monthly invoice generation
        self.stdout.write(self.style.SUCCESS("1. Monthly Invoice Generation:"))
        cron_line = f"0 9 {self.generation_day} * * cd {project_path} && python manage.py schedule_invoice_generation --run-scheduled"
        self.stdout.write(f"   {cron_line}")
        self.stdout.write("   (Runs at 9:00 AM on the 25th of each month)\n")
        
        # Daily check (optional)
        self.stdout.write(self.style.SUCCESS("2. Daily Schedule Check (Optional):"))
        daily_cron = f"0 8 * * * cd {project_path} && python manage.py schedule_invoice_generation --check-due"
        self.stdout.write(f"   {daily_cron}")
        self.stdout.write("   (Runs daily at 8:00 AM to check if generation is due)\n")
        
        # Late fee processing (weekly)
        self.stdout.write(self.style.SUCCESS("3. Weekly Late Fee Processing:"))
        late_fee_cron = f"0 10 * * 1 cd {project_path} && python manage.py process_late_fees"
        self.stdout.write(f"   {late_fee_cron}")
        self.stdout.write("   (Runs every Monday at 10:00 AM)\n")
        
        self.stdout.write("📝 To install these cron jobs:")
        self.stdout.write("   1. Run: crontab -e")
        self.stdout.write("   2. Add the desired cron lines")
        self.stdout.write("   3. Save and exit")
        self.stdout.write("\n💡 Tips:")
        self.stdout.write("   • Test with --dry-run first")
        self.stdout.write("   • Check logs in /var/log/cron.log")
        self.stdout.write("   • Consider using Django-Q or Celery for more advanced scheduling")

    def run_scheduled_generation(self):
        """Run scheduled invoice generation (for cron jobs)"""
        today = timezone.now().date()
        
        # Only run if today is the generation day
        if today.day != self.generation_day:
            self.stdout.write(f"⏭️  Not generation day (today: {today.day}, target: {self.generation_day})")
            return
        
        self.stdout.write(
            self.style.SUCCESS(f"\n🚀 Scheduled Invoice Generation - {today.strftime('%Y-%m-%d')}")
        )
        self.stdout.write("=" * 60)
        
        # Calculate target month (next month)
        if today.month == 12:
            target_month = date(today.year + 1, 1, 1)
        else:
            target_month = date(today.year, today.month + 1, 1)
        
        self.stdout.write(f"📄 Generating invoices for: {target_month.strftime('%B %Y')}")
        
        # Run the main invoice generation command
        try:
            if self.dry_run:
                call_command(
                    'generate_monthly_invoices',
                    month=target_month.strftime('%Y-%m-%d'),
                    dry_run=True
                )
            else:
                call_command(
                    'generate_monthly_invoices',
                    month=target_month.strftime('%Y-%m-%d')
                )
            
            self.stdout.write(self.style.SUCCESS("✅ Scheduled generation completed successfully"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Scheduled generation failed: {str(e)}"))
            raise

    def show_help(self):
        """Show help information"""
        self.stdout.write(
            self.style.SUCCESS("\n📋 Invoice Generation Scheduler")
        )
        self.stdout.write("=" * 40)
        self.stdout.write("Available commands:")
        self.stdout.write("")
        self.stdout.write("🕐 --check-due")
        self.stdout.write("   Check if invoice generation is due today")
        self.stdout.write("")
        self.stdout.write("⚙️  --generate-cron")
        self.stdout.write("   Generate cron job configuration")
        self.stdout.write("")
        self.stdout.write("🚀 --run-scheduled")
        self.stdout.write("   Run scheduled generation (for cron jobs)")
        self.stdout.write("")
        self.stdout.write("Options:")
        self.stdout.write("   --generation-day N  Set generation day (default: 25)")
        self.stdout.write("   --dry-run          Preview without executing")
        self.stdout.write("")
        self.stdout.write("Examples:")
        self.stdout.write("   python manage.py schedule_invoice_generation --check-due")
        self.stdout.write("   python manage.py schedule_invoice_generation --generate-cron")
        self.stdout.write("   python manage.py schedule_invoice_generation --run-scheduled --dry-run")