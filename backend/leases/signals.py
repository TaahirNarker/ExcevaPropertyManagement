from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Lease


@receiver(post_save, sender=Lease)
def create_initial_invoice_on_lease_create(sender, instance: Lease, created: bool, **kwargs):
    """Ensure an initial invoice exists exactly once for a newly created lease.

    Idempotency rule:
      - Only create if no existing invoice for the lease with invoice_type='regular'
        whose billing_period_start month equals lease.start_date month and year.
    """
    if not created:
        return

    try:
        from finance.models import Invoice
        # Check for existing invoice for the lease's start month
        start = instance.start_date
        exists = Invoice.objects.filter(
            lease=instance,
            invoice_type='regular',
            billing_period_start__year=start.year,
            billing_period_start__month=start.month
        ).exists()
        if exists:
            print(f"[leases.signal] skip_initial_invoice lease_id={instance.id} reason=exists_for_start_month {start}")
            return

        # Generate initial invoice without a user context (system)
        from finance.services import InvoiceGenerationService
        inv = InvoiceGenerationService().generate_initial_lease_invoice(instance, user=None)
        print(f"[leases.signal] initial_invoice_created lease_id={instance.id} invoice_id={getattr(inv, 'id', None)}")
    except Exception as e:
        # Non-fatal: avoid breaking save if finance subsystem not ready
        print(f"[leases.signal] initial_invoice_error lease_id={instance.id} error={str(e)}")
        pass


