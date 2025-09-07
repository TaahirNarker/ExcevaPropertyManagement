"""
Signal handlers to keep invoice and lease financials consistent automatically.

This centralizes recalculation so UI totals remain accurate after any create,
update, or delete to invoice line items, payments, and adjustments.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone

from .models import Invoice, InvoiceLineItem, InvoicePayment, Adjustment


def _recalc_invoice_and_touch_lease(invoice: Invoice) -> None:
    """Recalculate invoice totals and touch the related lease.

    Wrapped in transaction.on_commit to avoid redundant recalculation during
    nested saves. Uses model's calculate_totals for a single source of truth.
    """
    if not isinstance(invoice, Invoice):
        return

    def _do_update():
        try:
            invoice.calculate_totals()
            # Update status based on balance and due date
            if invoice.balance_due <= 0 and invoice.amount_paid > 0:
                invoice.status = 'paid'
            elif invoice.amount_paid > 0 and invoice.balance_due > 0:
                invoice.status = 'partially_paid'
            elif invoice.due_date and invoice.due_date < timezone.now().date() and invoice.balance_due > 0:
                invoice.status = 'overdue'
            invoice.save()

            # Touch the lease to invalidate any cache layers that watch updated_at
            try:
                lease = invoice.lease
                if lease:
                    lease.save()
            except Exception:
                pass
        except Exception as e:
            # Soft-fail; log to console to avoid interrupting user flows
            print(f"[finance.signals] Failed invoice recalc: {e}")

    transaction.on_commit(_do_update)


@receiver(post_save, sender=InvoiceLineItem)
@receiver(post_delete, sender=InvoiceLineItem)
def _line_item_changed(sender, instance: InvoiceLineItem, **kwargs):
    _recalc_invoice_and_touch_lease(instance.invoice)


@receiver(post_save, sender=InvoicePayment)
@receiver(post_delete, sender=InvoicePayment)
def _payment_changed(sender, instance: InvoicePayment, **kwargs):
    _recalc_invoice_and_touch_lease(instance.invoice)


@receiver(post_save, sender=Adjustment)
@receiver(post_delete, sender=Adjustment)
def _adjustment_changed(sender, instance: Adjustment, **kwargs):
    _recalc_invoice_and_touch_lease(instance.invoice)


@receiver(post_save, sender=Invoice)
def _invoice_saved(sender, instance: Invoice, created: bool, **kwargs):
    # For newly created invoices we may be building line items afterwards. Let
    # line item handlers finalize totals. For updates, ensure fields are
    # consistent.
    if created:
        return
    _recalc_invoice_and_touch_lease(instance)


