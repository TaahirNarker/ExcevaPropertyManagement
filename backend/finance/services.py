"""
Invoice generation and management services for the property management system.
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum

from .models import (
    Invoice, InvoiceLineItem, InvoiceDraft, SystemSettings,
    TenantCreditBalance, RentEscalationLog, RecurringCharge
)
from leases.models import Lease
from properties.models import Property


class InvoiceGenerationService:
    """
    Service for generating and managing invoices
    """
    
    def __init__(self):
        self.vat_rate = SystemSettings.get_vat_rate()
        self.stats = {
            'invoices_created': 0,
            'credits_applied': 0,
            'total_credit_applied': Decimal('0.00')
        }
    
    def generate_invoice_number(self) -> str:
        """
        Generate a unique invoice number.
        Format: INV-YYYY-NNNNNN
        """
        from datetime import datetime
        year = datetime.now().year
        
        # Get the latest invoice number for this year
        latest_invoice = Invoice.objects.filter(
            invoice_number__startswith=f'INV-{year}-'
        ).order_by('-invoice_number').first()
        
        if latest_invoice:
            # Extract the sequence number and increment
            try:
                sequence = int(latest_invoice.invoice_number.split('-')[-1])
                next_sequence = sequence + 1
            except (ValueError, IndexError):
                next_sequence = 1
        else:
            next_sequence = 1
        
        return f'INV-{year}-{next_sequence:06d}'
    
    def generate_initial_lease_invoice(self, lease: Lease, user=None) -> Invoice:
        """
        Generate the initial invoice when a lease is created.
        Includes first month's rent, deposit, and any admin/setup fees.
        Also carries over any previous arrears to ensure first statement reflects them.
        """
        with transaction.atomic():
            try:
                print(f"[igs.initial] start lease_id={lease.id} start_date={lease.start_date} rent_due_day={getattr(lease, 'rent_due_day', None)} monthly_rent={getattr(lease, 'monthly_rent', None)} deposit={getattr(lease, 'deposit_amount', None)}")
            except Exception:
                pass
            # Calculate billing period (first month)
            start_date = lease.start_date
            if start_date.day == 1:
                # Full month
                billing_start = start_date
                billing_end = self._get_month_end(start_date)
            else:
                # Pro-rated first month
                billing_start = start_date
                billing_end = self._get_month_end(start_date)
            
            # Create the invoice
            # Resolve landlord user for invoice: prefer property.owner (CustomUser). Avoid passing Landlords.Landlord.
            try:
                landlord_user = getattr(lease.property, 'owner', None)
            except Exception:
                landlord_user = None

            # Determine correct issue date for initial invoice: prefer explicit lease.invoice_date, else month start
            try:
                desired_issue_date = getattr(lease, 'invoice_date', None) or billing_start
            except Exception:
                desired_issue_date = billing_start

            invoice = Invoice.objects.create(
                lease=lease,
                property=lease.property,
                tenant=lease.tenant,
                landlord=landlord_user,
                created_by=user,
                invoice_number=self.generate_invoice_number(),
                title=f"Initial Invoice - {lease.property.name}",
                issue_date=desired_issue_date,
                due_date=start_date,
                billing_period_start=billing_start,
                billing_period_end=billing_end,
                status='draft',
                invoice_type='regular'
            )
            
            # Add line items
            line_items = []

            # 0) Arrears carry-over from any previous invoices before this billing period
            from .models import Invoice as InvoiceModel
            previous_unpaid = InvoiceModel.objects.filter(
                tenant=lease.tenant,
                status__in=['sent', 'overdue', 'partially_paid'],
                balance_due__gt=0,
                due_date__lt=billing_start
            ).aggregate(total_due=Sum('balance_due'))['total_due'] or Decimal('0.00')
            if previous_unpaid > 0:
                line_items.append({
                    'description': 'Arrears carry-over',
                    'category': 'Arrears',
                    'quantity': 1,
                    'unit_price': previous_unpaid,
                    'total': previous_unpaid
                })
            
            # 1. Monthly rent (or pro-rated)
            if start_date.day == 1:
                # Full month rent
                line_items.append({
                    'description': 'Monthly Rent',
                    'category': 'Rent',
                    'quantity': 1,
                    'unit_price': lease.monthly_rent,
                    'total': lease.monthly_rent
                })
            else:
                # Pro-rated rent
                days_in_month = self._get_days_in_month(start_date)
                days_to_charge = (billing_end - billing_start).days + 1
                pro_rated_amount = (lease.monthly_rent / days_in_month) * days_to_charge
                
                line_items.append({
                    'description': f'Pro-rated Rent ({days_to_charge}/{days_in_month} days)',
                    'category': 'Rent',
                    'quantity': 1,
                    'unit_price': pro_rated_amount,
                    'total': pro_rated_amount
                })
            
            # 2. Security Deposit (ensure category matches analytics queries and statements)
            if lease.deposit_amount > 0:
                line_items.append({
                    'description': 'Security Deposit',
                    'category': 'Security Deposit',
                    'quantity': 1,
                    'unit_price': lease.deposit_amount,
                    'total': lease.deposit_amount
                })
            
            # 3. Pro-rata amount (if specified)
            if lease.pro_rata_amount > 0:
                line_items.append({
                    'description': 'Pro-rata Amount',
                    'category': 'Admin',
                    'quantity': 1,
                    'unit_price': lease.pro_rata_amount,
                    'total': lease.pro_rata_amount
                })
            
            # 4. Management and procurement fees
            if lease.management_fee > 0:
                fee_amount = lease.monthly_rent * (lease.management_fee / 100)
                line_items.append({
                    'description': f'Management Fee ({lease.management_fee}%)',
                    'category': 'Admin',
                    'quantity': 1,
                    'unit_price': fee_amount,
                    'total': fee_amount
                })
            
            if lease.procurement_fee > 0:
                fee_amount = lease.monthly_rent * (lease.procurement_fee / 100)
                line_items.append({
                    'description': f'Procurement Fee ({lease.procurement_fee}%)',
                    'category': 'Admin',
                    'quantity': 1,
                    'unit_price': fee_amount,
                    'total': fee_amount
                })
            
            # Create line item records
            for item_data in line_items:
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    **item_data
                )
            
            # Apply VAT if commercial property
            if lease.should_apply_vat():
                invoice.tax_rate = self.vat_rate
            
            # Calculate totals and save
            invoice.calculate_totals()
            # Auto-send the initial invoice: mark as sent and record sender/time
            invoice.status = 'sent'
            try:
                from django.utils import timezone as _tz
                invoice.sent_at = _tz.now()
            except Exception:
                pass
            try:
                # Record the user who triggered sending if available
                invoice.sent_by = user
            except Exception:
                pass
            invoice.save()
            try:
                print(f"[igs.initial] created invoice_id={invoice.id} number={invoice.invoice_number} total={invoice.total_amount} status={invoice.status}")
            except Exception:
                pass

            # Create an audit log for the send action (non-fatal if unavailable)
            try:
                from .models import InvoiceAuditLog
                if user is not None:
                    InvoiceAuditLog.objects.create(
                        invoice=invoice,
                        action='sent',
                        user=user,
                        details='Initial lease invoice auto-sent on creation'
                    )
            except Exception:
                pass
            
            return invoice
    
    def generate_monthly_invoice(self, lease: Lease, billing_month: date, user=None) -> Invoice:
        """
        Generate a regular monthly invoice for a lease.
        """
        with transaction.atomic():
            # Check if invoice already exists for this month
            existing_invoice = Invoice.objects.filter(
                lease=lease,
                billing_period_start__year=billing_month.year,
                billing_period_start__month=billing_month.month,
                invoice_type='regular'
            ).first()
            
            if existing_invoice:
                return existing_invoice
            
            # Calculate billing period
            billing_start = billing_month.replace(day=1)
            billing_end = self._get_month_end(billing_start)
            
            # Calculate due date based on lease terms
            due_date = billing_start.replace(day=lease.rent_due_day)
            if due_date < billing_start:
                # If due day is before start of month, set to next month
                due_date = self._add_months(due_date, 1)
            
            # Create the invoice
            # Resolve landlord user for invoice
            try:
                landlord_user = getattr(lease.property, 'owner', None)
            except Exception:
                landlord_user = None

            invoice = Invoice.objects.create(
                lease=lease,
                property=lease.property,
                tenant=lease.tenant,
                landlord=landlord_user,
                created_by=user,
                title=f"Monthly Invoice - {billing_month.strftime('%B %Y')}",
                issue_date=None,  # Will be set when sent
                due_date=due_date,
                billing_period_start=billing_start,
                billing_period_end=billing_end,
                status='draft',
                invoice_type='regular'
            )
            
            # Start assembling line items
            line_items = []

            # 0) Arrears carry-over from previous invoices (unpaid amounts prior to this month)
            from .models import Invoice as InvoiceModel
            previous_unpaid = InvoiceModel.objects.filter(
                lease=lease,
                status__in=['sent', 'overdue', 'partially_paid'],
                balance_due__gt=0,
                due_date__lt=billing_start
            ).aggregate(total_due=Sum('balance_due'))['total_due'] or Decimal('0.00')
            if previous_unpaid > 0:
                line_items.append({
                    'description': 'Arrears carry-over',
                    'category': 'Arrears',
                    'quantity': 1,
                    'unit_price': previous_unpaid,
                    'total': previous_unpaid
                })

            # 1) Base rent for the month
            line_items.append({
                'description': 'Monthly Rent',
                'category': 'Rent',
                'quantity': 1,
                'unit_price': lease.monthly_rent,
                'total': lease.monthly_rent
            })
            
            # Add recurring charges
            for charge in lease.recurring_charges.filter(is_active=True):
                line_items.append({
                    'description': charge.description,
                    'category': charge.category,
                    'quantity': 1,
                    'unit_price': charge.amount,
                    'total': charge.amount
                })
            
            # Check for late fees from previous invoices
            late_fee_amount = self._calculate_late_fees_for_tenant(lease.tenant, billing_month)
            if late_fee_amount > 0:
                line_items.append({
                    'description': 'Late Fee',
                    'category': 'Late Fee',
                    'quantity': 1,
                    'unit_price': late_fee_amount,
                    'total': late_fee_amount
                })
            
            # Create line item records
            for item_data in line_items:
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    **item_data
                )
            
            # Apply VAT if commercial property
            if lease.should_apply_vat():
                invoice.tax_rate = self.vat_rate
            
            # Calculate totals and save
            invoice.calculate_totals()
            invoice.save()

            # 3) If tenant has credit balance, apply it to this invoice automatically
            try:
                self._apply_credit_balance_to_invoice(invoice, user)
            except Exception:
                # Do not fail invoice creation if credit application fails
                pass
            
            return invoice
    
    def generate_invoice(self, lease, billing_start, billing_end, invoice_type='regular', 
                        user=None, apply_credits=True):
        """
        Generate invoice with automatic credit balance application.
        
        Args:
            lease: Lease object
            billing_start: Start date for billing period
            billing_end: End date for billing period
            invoice_type: Type of invoice ('regular', 'initial', 'adjustment')
            user: User creating the invoice
            apply_credits: Whether to automatically apply available credit balance
        """
        from .models import Invoice, InvoiceLineItem, TenantCreditBalance
        
        with transaction.atomic():
            # Create invoice
            # Create invoice using correct field names present on Invoice model
            invoice = Invoice.objects.create(
                lease=lease,
                property=lease.property,
                tenant=lease.tenant,
                landlord=lease.landlord,
                issue_date=timezone.now().date(),
                # Fallback to rent_due_day if payment terms not available on Lease
                due_date=billing_end,
                billing_period_start=billing_start,
                billing_period_end=billing_end,
                invoice_type=invoice_type,
                created_by=user,
                status='draft'
            )
            
            # Add base rent line item
            # Add base rent line item (InvoiceLineItem has no line_type; use category)
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=f"Rent for {billing_start.strftime('%B %Y')}",
                category='Rent',
                quantity=1,
                unit_price=lease.monthly_rent,
                total=lease.monthly_rent
            )
            
            # Add recurring charges
            recurring_charges = RecurringCharge.objects.filter(
                lease=lease,
                is_active=True
            )
            
            for charge in recurring_charges:
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    description=charge.description,
                    category=charge.category,
                    quantity=1,
                    unit_price=charge.amount,
                    total=charge.amount
                )
            
            # Calculate totals
            invoice.calculate_totals()
            invoice.save()
            
            # Apply credit balance if requested and available
            if apply_credits:
                credit_applied = self._apply_credit_balance_to_invoice(invoice, user)
                if credit_applied > 0:
                    self.stats['credits_applied'] += 1
                    self.stats['total_credit_applied'] += credit_applied
            
            self.stats['invoices_created'] += 1
            return invoice
    
    def _apply_credit_balance_to_invoice(self, invoice, user):
        """
        Automatically apply available credit balance to invoice.
        Returns the amount of credit applied.
        """
        from .models import TenantCreditBalance, InvoicePayment
        from decimal import Decimal
        
        try:
            credit_balance = TenantCreditBalance.objects.get(tenant=invoice.tenant)
        except TenantCreditBalance.DoesNotExist:
            return Decimal('0.00')
        
        if credit_balance.balance <= 0:
            return Decimal('0.00')
        
        # Calculate how much credit to apply
        credit_to_apply = min(credit_balance.balance, invoice.total_amount)
        
        if credit_to_apply > 0:
            # Create payment record for credit application
            InvoicePayment.objects.create(
                invoice=invoice,
                tenant=invoice.tenant,
                amount=credit_to_apply,
                allocated_amount=credit_to_apply,
                payment_date=timezone.now().date(),
                payment_method='credit_balance',
                reference_number=f"CREDIT-{timezone.now().strftime('%Y%m%d%H%M%S')}",
                notes=f"Automatic credit balance application to invoice {invoice.invoice_number}",
                recorded_by=user
            )
            
            # Reduce credit balance
            credit_balance.balance -= credit_to_apply
            credit_balance.save()
            
            # Update invoice totals
            invoice.calculate_totals()
            invoice.save()
            
            return credit_to_apply
        
        return Decimal('0.00')
    
    def get_or_create_invoice_draft(self, lease: Lease, billing_month: date) -> Dict:
        """
        Get or create a draft invoice for future month navigation.
        Returns the invoice data as a dictionary.
        """
        # Try to get existing invoice first
        existing_invoice = Invoice.objects.filter(
            lease=lease,
            billing_period_start__year=billing_month.year,
            billing_period_start__month=billing_month.month
        ).first()
        
        if existing_invoice:
            return self._invoice_to_dict(existing_invoice)
        
        # Try to get existing draft
        draft, created = InvoiceDraft.objects.get_or_create(
            lease=lease,
            billing_month=billing_month.replace(day=1),
            defaults={
                'draft_data': {},
                'user_modified': False
            }
        )
        
        if created or not draft.draft_data:
            # Generate default invoice data
            invoice_data = self._generate_default_invoice_data(lease, billing_month)
            draft.draft_data = invoice_data
            draft.save()
        
        return draft.draft_data
    
    def save_invoice_draft(self, lease: Lease, billing_month: date, invoice_data: Dict, user=None) -> InvoiceDraft:
        """
        Save user modifications to an invoice draft.
        """
        draft, created = InvoiceDraft.objects.get_or_create(
            lease=lease,
            billing_month=billing_month.replace(day=1),
            defaults={
                'draft_data': invoice_data,
                'user_modified': True
            }
        )
        
        if not created:
            draft.draft_data = invoice_data
            draft.user_modified = True
            draft.save()
        
        return draft
    
    def convert_draft_to_invoice(self, draft: InvoiceDraft, user=None) -> Invoice:
        """
        Convert a draft to an actual invoice when the month arrives.
        """
        with transaction.atomic():
            data = draft.draft_data
            
            # Create the invoice
            invoice = Invoice.objects.create(
                lease=draft.lease,
                property=draft.lease.property,
                tenant=draft.lease.tenant,
                landlord=draft.lease.landlord,
                created_by=user,
                title=data.get('title', f"Monthly Invoice - {draft.billing_month.strftime('%B %Y')}"),
                issue_date=None,
                due_date=datetime.strptime(data['due_date'], '%Y-%m-%d').date(),
                billing_period_start=draft.billing_month,
                billing_period_end=self._get_month_end(draft.billing_month),
                status='draft',
                invoice_type='regular',
                tax_rate=Decimal(str(data.get('tax_rate', 0)))
            )
            
            # Create line items
            for item_data in data.get('line_items', []):
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    description=item_data['description'],
                    category=item_data.get('category', ''),
                    quantity=Decimal(str(item_data['quantity'])),
                    unit_price=Decimal(str(item_data['unit_price'])),
                    total=Decimal(str(item_data['total']))
                )
            
            # Calculate totals
            invoice.calculate_totals()
            invoice.save()
            
            # Delete the draft
            draft.delete()
            
            return invoice
    
    def _calculate_late_fees_for_tenant(self, tenant, current_month: date) -> Decimal:
        """
        Calculate late fees for overdue invoices.
        """
        overdue_invoices = Invoice.objects.filter(
            tenant=tenant,
            due_date__lt=current_month,
            balance_due__gt=0,
            status__in=['sent', 'overdue', 'partially_paid']
        )
        
        total_late_fees = Decimal('0.00')
        
        for invoice in overdue_invoices:
            if invoice.is_overdue():
                late_fee = invoice.calculate_late_fee()
                total_late_fees += Decimal(str(late_fee))
        
        return total_late_fees
    
    def _generate_default_invoice_data(self, lease: Lease, billing_month: date) -> Dict:
        """
        Generate default invoice data for a draft.
        """
        billing_start = billing_month.replace(day=1)
        billing_end = self._get_month_end(billing_start)
        due_date = billing_start.replace(day=lease.rent_due_day)
        
        # Base line items
        line_items = [{
            'description': 'Monthly Rent',
            'category': 'Rent',
            'quantity': 1,
            'unit_price': float(lease.monthly_rent),
            'total': float(lease.monthly_rent)
        }]
        
        # Add recurring charges
        for charge in lease.recurring_charges.filter(is_active=True):
            line_items.append({
                'description': charge.description,
                'category': charge.category,
                'quantity': 1,
                'unit_price': float(charge.amount),
                'total': float(charge.amount)
            })
        
        # Calculate subtotal
        subtotal = sum(item['total'] for item in line_items)
        
        # Apply VAT if needed
        tax_rate = self.vat_rate if lease.should_apply_vat() else 0
        tax_amount = subtotal * (tax_rate / 100)
        total_amount = subtotal + tax_amount
        
        return {
            'title': f"Monthly Invoice - {billing_month.strftime('%B %Y')}",
            'invoice_number': '',  # Will be generated when converted to actual invoice
            'issue_date': '',
            'due_date': due_date.strftime('%Y-%m-%d'),
            'billing_period_start': billing_start.strftime('%Y-%m-%d'),
            'billing_period_end': billing_end.strftime('%Y-%m-%d'),
            'line_items': line_items,
            'subtotal': subtotal,
            'tax_rate': tax_rate,
            'tax_amount': tax_amount,
            'total_amount': total_amount,
            'status': 'draft'
        }
    
    def _invoice_to_dict(self, invoice: Invoice) -> Dict:
        """
        Convert an invoice to a dictionary format.
        """
        return {
            'id': invoice.id,
            'title': invoice.title,
            'invoice_number': invoice.invoice_number,
            'issue_date': invoice.issue_date.strftime('%Y-%m-%d') if invoice.issue_date else '',
            'due_date': invoice.due_date.strftime('%Y-%m-%d'),
            'billing_period_start': invoice.billing_period_start.strftime('%Y-%m-%d') if invoice.billing_period_start else '',
            'billing_period_end': invoice.billing_period_end.strftime('%Y-%m-%d') if invoice.billing_period_end else '',
            'line_items': [
                {
                    'id': item.id,
                    'description': item.description,
                    'category': item.category,
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'total': float(item.total)
                }
                for item in invoice.line_items.all()
            ],
            'subtotal': float(invoice.subtotal),
            'tax_rate': float(invoice.tax_rate),
            'tax_amount': float(invoice.tax_amount),
            'total_amount': float(invoice.total_amount),
            'amount_paid': float(invoice.amount_paid),
            'balance_due': float(invoice.balance_due),
            'status': invoice.status
        }
    
    def _get_month_end(self, date_obj: date) -> date:
        """Get the last day of the month for a given date."""
        if date_obj.month == 12:
            return date_obj.replace(year=date_obj.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            return date_obj.replace(month=date_obj.month + 1, day=1) - timedelta(days=1)
    
    def _get_days_in_month(self, date_obj: date) -> int:
        """Get the number of days in a month."""
        return self._get_month_end(date_obj).day
    
    def _add_months(self, date_obj: date, months: int) -> date:
        """Add months to a date."""
        year = date_obj.year
        month = date_obj.month + months
        
        while month > 12:
            year += 1
            month -= 12
        while month < 1:
            year -= 1
            month += 12
        
        # Handle day overflow
        day = date_obj.day
        max_day = self._get_days_in_month(date(year, month, 1))
        if day > max_day:
            day = max_day
        
        return date(year, month, day)


class PaymentAllocationService:
    """
    Service for handling payment allocation and tenant credit balances.
    """
    
    def allocate_payment(self, tenant, amount: Decimal, invoices: List[Invoice], 
                        payment_method: str, reference_number: str, 
                        payment_date: date, user=None, notes: str = '') -> List:
        """
        Allocate a payment across multiple invoices.
        Returns list of created payment records.
        """
        from .models import InvoicePayment
        
        with transaction.atomic():
            remaining_amount = Decimal(str(amount))
            payment_records = []
            
            # Sort invoices by due date (oldest first)
            sorted_invoices = sorted(invoices, key=lambda inv: inv.due_date)
            
            for invoice in sorted_invoices:
                if remaining_amount <= 0:
                    break
                
                # Calculate how much to allocate to this invoice
                invoice_balance = Decimal(str(invoice.balance_due))
                allocation_amount = min(remaining_amount, invoice_balance)
                
                if allocation_amount > 0:
                    # Create payment record
                    payment = InvoicePayment.objects.create(
                        invoice=invoice,
                        tenant=tenant,
                        amount=allocation_amount,            # FIX: amount must equal allocated amount
                        allocated_amount=allocation_amount,
                        payment_date=payment_date,
                        payment_method=payment_method,
                        reference_number=reference_number,
                        notes=notes,
                        recorded_by=user,
                        is_overpayment=False
                    )
                    payment_records.append(payment)
                    remaining_amount -= allocation_amount
            
            # Handle overpayment
            if remaining_amount > 0:
                credit_balance, created = TenantCreditBalance.objects.get_or_create(
                    tenant=tenant,
                    defaults={'balance': Decimal('0.00')}
                )
                credit_balance.balance += remaining_amount
                credit_balance.save()
            
            return payment_records
    
    def get_tenant_credit_balance(self, tenant) -> Decimal:
        """Get tenant's current credit balance."""
        try:
            return tenant.credit_balance.balance
        except TenantCreditBalance.DoesNotExist:
            return Decimal('0.00')


class RentEscalationService:
    """
    Service for handling rent escalations.
    """
    
    def process_due_escalations(self, user=None) -> List[Lease]:
        """
        Process all due rent escalations.
        Returns list of leases that had escalations applied.
        """
        escalated_leases = []
        
        # Find leases with due escalations
        due_leases = Lease.objects.filter(
            escalation_type__in=['percentage', 'amount'],
            next_escalation_date__lte=timezone.now().date(),
            status='active'
        )
        
        for lease in due_leases:
            if lease.apply_rent_escalation(user):
                escalated_leases.append(lease)
        
        return escalated_leases
    
    def get_rent_history(self, lease: Lease) -> List[Dict]:
        """
        Get rent escalation history for a lease.
        """
        escalations = RentEscalationLog.objects.filter(lease=lease).order_by('-effective_date')
        
        return [
            {
                'effective_date': log.effective_date,
                'previous_rent': float(log.previous_rent),
                'new_rent': float(log.new_rent),
                'escalation_percentage': float(log.escalation_percentage) if log.escalation_percentage else None,
                'escalation_amount': float(log.escalation_amount) if log.escalation_amount else None,
                'reason': log.reason,
                'applied_by': log.applied_by.get_full_name() if log.applied_by else 'System'
            }
            for log in escalations
        ]


class PaymentReconciliationService:
    """
    Service for handling payment reconciliation including CSV import and manual allocation
    """
    
    def __init__(self):
        import logging
        self.logger = logging.getLogger(__name__)
    
    def import_bank_csv(self, csv_file, bank_name, imported_by):
        """
        Import bank CSV and attempt automatic reconciliation
        
        Args:
            csv_file: Uploaded CSV file
            bank_name: Name of the bank
            imported_by: User performing the import
            
        Returns:
            dict: Import results and statistics
        """
        try:
            # Generate unique batch ID
            batch_id = f"CSV_{bank_name}_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create import batch record
            from .models import CSVImportBatch
            import_batch = CSVImportBatch.objects.create(
                batch_id=batch_id,
                filename=csv_file.name,
                bank_name=bank_name,
                imported_by=imported_by,
                status='processing'
            )
            
            # Parse CSV file
            transactions = self._parse_csv_file(csv_file)
            
            # Process each transaction
            successful_reconciliations = 0
            manual_review_required = 0
            failed_transactions = 0
            
            for transaction_data in transactions:
                try:
                    # Create bank transaction record
                    from .models import BankTransaction
                    bank_transaction = BankTransaction.objects.create(
                        import_batch=batch_id,
                        transaction_date=transaction_data['date'],
                        description=transaction_data['description'],
                        amount=transaction_data['amount'],
                        transaction_type=transaction_data['type'],
                        reference_number=transaction_data.get('reference', ''),
                        bank_account=transaction_data.get('account', ''),
                        tenant_reference=self._extract_tenant_reference(transaction_data['description'])
                    )
                    
                    # Attempt automatic reconciliation
                    reconciliation_result = self._attempt_automatic_reconciliation(bank_transaction)
                    
                    if reconciliation_result['status'] == 'reconciled':
                        successful_reconciliations += 1
                        bank_transaction.status = 'reconciled'
                    elif reconciliation_result['status'] == 'manual_review':
                        manual_review_required += 1
                        bank_transaction.status = 'manual_review'
                    else:
                        failed_transactions += 1
                        bank_transaction.status = 'failed'
                    
                    bank_transaction.save()
                    
                except Exception as e:
                    failed_transactions += 1
                    self.logger.error(f"Failed to process transaction: {e}")
                    continue
            
            # Update import batch status
            import_batch.total_transactions = len(transactions)
            import_batch.successful_reconciliations = successful_reconciliations
            import_batch.manual_review_required = manual_review_required
            import_batch.failed_transactions = failed_transactions
            import_batch.status = 'completed' if failed_transactions == 0 else 'partial'
            import_batch.save()
            
            return {
                'success': True,
                'batch_id': batch_id,
                'total_transactions': len(transactions),
                'successful_reconciliations': successful_reconciliations,
                'manual_review_required': manual_review_required,
                'failed_transactions': failed_transactions
            }
            
        except Exception as e:
            self.logger.error(f"CSV import failed: {e}")
            if 'import_batch' in locals():
                import_batch.status = 'failed'
                import_batch.error_log = str(e)
                import_batch.save()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def _parse_csv_file(self, csv_file):
        """
        Parse CSV file and extract transaction data
        
        Expected CSV format:
        Date,Description,Amount,Type,Reference,Account
        """
        import csv
        import io
        from datetime import datetime
        
        transactions = []
        
        # Read CSV content
        content = csv_file.read().decode('utf-8')
        csv_file.seek(0)  # Reset file pointer
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(content))
        
        for row in reader:
            try:
                # Parse amount (handle negative/positive for credits/debits)
                amount_str = row.get('Amount', '0').replace(',', '').replace('R', '').strip()
                amount = abs(float(amount_str))
                
                # Determine transaction type
                if amount_str.startswith('-') or float(amount_str) < 0:
                    transaction_type = 'debit'
                else:
                    transaction_type = 'credit'
                
                transactions.append({
                    'date': datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                    'description': row.get('Description', ''),
                    'amount': amount,
                    'type': transaction_type,
                    'reference': row.get('Reference', ''),
                    'account': row.get('Account', '')
                })
                
            except Exception as e:
                self.logger.warning(f"Failed to parse CSV row: {row}, error: {e}")
                continue
        
        return transactions
    
    def _extract_tenant_reference(self, description):
        """
        Extract tenant reference from transaction description
        This is a simple implementation - can be enhanced with regex patterns
        """
        # Common patterns for tenant references
        import re
        
        # Look for patterns like "TENANT123", "T-123", "Tenant Name"
        patterns = [
            r'[Tt]enant\s+(\w+)',  # "Tenant Smith"
            r'[Tt]enant\s*[-_]\s*(\w+)',  # "Tenant-Smith"
            r'(\w+)\s*[-_]\s*[Rr]ent',  # "Smith-Rent"
            r'(\w+)\s*[-_]\s*[Pp]ayment',  # "Smith-Payment"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, description)
            if match:
                return match.group(1)
        
        return ''
    
    def _attempt_automatic_reconciliation(self, bank_transaction):
        """
        Attempt automatic reconciliation of bank transaction
        
        Returns:
            dict: Reconciliation result
        """
        try:
            # Skip if no tenant reference
            if not bank_transaction.tenant_reference:
                return {'status': 'manual_review', 'reason': 'No tenant reference found'}
            
            # Find matching lease by tenant reference
            lease = self._find_lease_by_reference(bank_transaction.tenant_reference)
            if not lease:
                return {'status': 'manual_review', 'reason': 'No matching lease found'}
            
            # Find outstanding invoices for this lease
            outstanding_invoices = self._get_outstanding_invoices(lease)
            if not outstanding_invoices:
                return {'status': 'manual_review', 'reason': 'No outstanding invoices found'}
            
            # Sort invoices by due date (oldest first)
            outstanding_invoices = sorted(outstanding_invoices, key=lambda x: x.due_date)
            
            # Check for exact match
            exact_match = self._find_exact_match(bank_transaction, outstanding_invoices)
            if exact_match:
                return self._reconcile_exact_match(bank_transaction, exact_match, lease)
            
            # Check for partial payment
            if bank_transaction.amount < sum(inv.balance_due for inv in outstanding_invoices):
                return self._reconcile_partial_payment(bank_transaction, outstanding_invoices, lease)
            
            # Check for overpayment
            if bank_transaction.amount > sum(inv.balance_due for inv in outstanding_invoices):
                return self._reconcile_overpayment(bank_transaction, outstanding_invoices, lease)
            
            return {'status': 'manual_review', 'reason': 'Unable to determine payment type'}
            
        except Exception as e:
            self.logger.error(f"Automatic reconciliation failed: {e}")
            return {'status': 'failed', 'reason': str(e)}
    
    def _find_lease_by_reference(self, tenant_reference):
        """Find lease by tenant reference"""
        from leases.models import Lease
        
        # Try to find by tenant name or code
        try:
            # First try exact match on tenant code
            lease = Lease.objects.filter(
                tenant__tenant_code__iexact=tenant_reference,
                status='active'
            ).first()
            
            if lease:
                return lease
            
            # Try partial match on tenant name
            lease = Lease.objects.filter(
                tenant__name__icontains=tenant_reference,
                status='active'
            ).first()
            
            return lease
            
        except Exception as e:
            self.logger.error(f"Error finding lease: {e}")
            return None
    
    def _get_outstanding_invoices(self, lease):
        """Get outstanding invoices for a lease"""
        from .models import Invoice
        return Invoice.objects.filter(
            lease=lease,
            status__in=['sent', 'overdue', 'partially_paid', 'locked'],
            balance_due__gt=0
        ).order_by('due_date')
    
    def _find_exact_match(self, bank_transaction, outstanding_invoices):
        """Find exact amount match"""
        for invoice in outstanding_invoices:
            if abs(bank_transaction.amount - invoice.balance_due) < 0.01:  # Allow for rounding
                return invoice
        return None
    
    def _reconcile_exact_match(self, bank_transaction, invoice, lease):
        """Reconcile exact amount match

        IMPORTANT: Create an InvoicePayment record so UI sections that rely on
        InvoicePayment (e.g., recent payments and monthly summaries) get data.
        Always recalculate invoice totals using model methods rather than
        mutating numeric fields directly.
        """
        try:
            # Create payment allocation entry for traceability
            from .models import PaymentAllocation, InvoicePayment
            PaymentAllocation.objects.create(
                bank_transaction=bank_transaction,
                invoice=invoice,
                allocated_amount=bank_transaction.amount,
                allocation_type='csv_import',
                notes='Automatic reconciliation via CSV import'
            )

            # Create the canonical payment record tied to the invoice
            InvoicePayment.objects.create(
                invoice=invoice,
                tenant=invoice.tenant,
                amount=bank_transaction.amount,
                allocated_amount=bank_transaction.amount,
                payment_date=bank_transaction.transaction_date,
                payment_method='bank_transfer',
                reference_number=str(bank_transaction.id) or bank_transaction.reference_number,
                notes='CSV import: exact match',
                recorded_by=bank_transaction.imported_by if hasattr(bank_transaction, 'imported_by') else None,
                is_overpayment=False
            )

            # Recalculate invoice totals safely
            invoice.calculate_totals()
            invoice.status = 'paid'
            invoice.save()

            # Update bank transaction
            bank_transaction.matched_lease = lease
            bank_transaction.matched_invoice = invoice
            bank_transaction.status = 'reconciled'
            bank_transaction.save()

            return {'status': 'reconciled', 'invoice_id': invoice.id}

        except Exception as e:
            self.logger.error(f"Exact match reconciliation failed: {e}")
            return {'status': 'failed', 'reason': str(e)}
    
    def _reconcile_partial_payment(self, bank_transaction, outstanding_invoices, lease):
        """Reconcile partial payment and create underpayment alert

        Ensures an InvoicePayment entry is created and invoice totals are
        recalculated so frontend financials update instantly.
        """
        try:
            # Find the oldest outstanding invoice
            oldest_invoice = min(outstanding_invoices, key=lambda inv: inv.due_date)

            # Calculate shortfall
            shortfall = oldest_invoice.balance_due - bank_transaction.amount

            # Create payment allocation and payment record
            from .models import PaymentAllocation, InvoicePayment, UnderpaymentAlert
            PaymentAllocation.objects.create(
                bank_transaction=bank_transaction,
                invoice=oldest_invoice,
                allocated_amount=bank_transaction.amount,
                allocation_type='csv_import',
                notes='Partial payment allocation'
            )

            InvoicePayment.objects.create(
                invoice=oldest_invoice,
                tenant=oldest_invoice.tenant,
                amount=bank_transaction.amount,
                allocated_amount=bank_transaction.amount,
                payment_date=bank_transaction.transaction_date,
                payment_method='bank_transfer',
                reference_number=str(bank_transaction.id) or bank_transaction.reference_number,
                notes='CSV import: partial match',
                recorded_by=bank_transaction.imported_by if hasattr(bank_transaction, 'imported_by') else None,
                is_overpayment=False
            )

            # Recalculate invoice totals and set status
            oldest_invoice.calculate_totals()
            oldest_invoice.status = 'partially_paid'
            oldest_invoice.save()

            # Create underpayment alert for visibility
            UnderpaymentAlert.objects.create(
                tenant=lease.tenant,
                invoice=oldest_invoice,
                bank_transaction=bank_transaction,
                expected_amount=oldest_invoice.total_amount,
                actual_amount=bank_transaction.amount,
                shortfall_amount=shortfall,
                alert_message=f"Underpayment detected: Expected R{oldest_invoice.total_amount}, received R{bank_transaction.amount}. Shortfall: R{shortfall}"
            )

            # Update bank transaction
            bank_transaction.matched_lease = lease
            bank_transaction.status = 'reconciled'
            bank_transaction.save()

            return {'status': 'reconciled', 'partial': True, 'shortfall': float(shortfall)}

        except Exception as e:
            return {'status': 'failed', 'reason': str(e)}
    
    def _reconcile_overpayment(self, bank_transaction, outstanding_invoices, lease):
        """Reconcile overpayment (create credit for next invoice)

        Creates InvoicePayment records for each settled invoice and credits any
        remainder to the tenant's credit balance so future invoices can apply it.
        """
        try:
            from .models import PaymentAllocation, InvoicePayment, TenantCreditBalance

            # Allocate to all outstanding invoices (oldest first)
            total_outstanding = sum(inv.balance_due for inv in outstanding_invoices)
            remaining = bank_transaction.amount
            for invoice in outstanding_invoices:
                allocate = min(remaining, invoice.balance_due)
                if allocate <= 0:
                    break

                PaymentAllocation.objects.create(
                    bank_transaction=bank_transaction,
                    invoice=invoice,
                    allocated_amount=allocate,
                    allocation_type='csv_import',
                    notes='Full/partial payment allocation from CSV import'
                )

                InvoicePayment.objects.create(
                    invoice=invoice,
                    tenant=invoice.tenant,
                    amount=allocate,
                    allocated_amount=allocate,
                    payment_date=bank_transaction.transaction_date,
                    payment_method='bank_transfer',
                    reference_number=str(bank_transaction.id) or bank_transaction.reference_number,
                    notes='CSV import allocation',
                    recorded_by=bank_transaction.imported_by if hasattr(bank_transaction, 'imported_by') else None,
                    is_overpayment=False
                )

                # Recalculate and save invoice
                invoice.calculate_totals()
                if invoice.balance_due <= 0:
                    invoice.status = 'paid'
                else:
                    invoice.status = 'partially_paid'
                invoice.save()

                remaining -= allocate

            # Handle any true overpayment by crediting tenant balance
            if remaining > 0:
                credit_balance, _ = TenantCreditBalance.objects.get_or_create(
                    tenant=lease.tenant,
                    defaults={'balance': Decimal('0.00')}
                )
                credit_balance.balance += Decimal(str(remaining))
                credit_balance.save()

            # Update bank transaction
            bank_transaction.matched_lease = lease
            bank_transaction.status = 'reconciled'
            bank_transaction.save()

            return {'status': 'reconciled', 'overpayment': remaining > 0, 'credit_amount': float(max(0, remaining))}

        except Exception as e:
            self.logger.error(f"Overpayment reconciliation failed: {e}")
            return {'status': 'failed', 'reason': str(e)}
    
    def record_manual_payment(self, payment_data, recorded_by):
        """
        Record manual payment entry and automatically allocate to outstanding invoices.
        
        Behavior:
        - Creates a ManualPayment bound to the lease.
        - Automatically allocates the payment to the lease's oldest outstanding invoices.
        - For each allocation, creates a matching InvoicePayment so invoice totals and lease financials update.
        - Updates ManualPayment.status to 'allocated' when fully allocated; otherwise remains 'pending'.
        - Any remaining amount after allocations is credited to TenantCreditBalance.
        
        Returns:
            dict: { success, payment_id, status, allocations: [...], remaining_amount, message }
        """
        try:
            from leases.models import Lease
            from .models import ManualPayment, InvoicePayment, PaymentAllocation, Invoice
            
            # Validate and normalize input
            lease = Lease.objects.get(id=payment_data['lease_id'])
            amount = Decimal(str(payment_data['amount']))
            if amount <= 0:
                return {'success': False, 'error': 'Amount must be greater than zero'}
            
            payment_date = payment_data['payment_date']
            payment_method = payment_data['payment_method']
            reference_number = payment_data.get('reference_number', '')
            notes = payment_data.get('notes', '')
            
            with transaction.atomic():
                # 1) Create manual payment record
                manual_payment = ManualPayment.objects.create(
                    lease=lease,
                    payment_method=payment_method,
                    amount=amount,
                    payment_date=payment_date,
                    reference_number=reference_number,
                    notes=notes,
                    recorded_by=recorded_by
                )
                
                # 2) Find outstanding invoices for this lease
                outstanding_invoices = Invoice.objects.filter(
                    lease=lease,
                    status__in=['sent', 'overdue', 'partially_paid', 'locked'],
                    balance_due__gt=0
                ).order_by('due_date', 'created_at')
                
                remaining = Decimal(str(amount))
                allocations = []
                
                # 3) Allocate to oldest invoices first
                for inv in outstanding_invoices:
                    if remaining <= 0:
                        break
                    inv_balance = Decimal(str(inv.balance_due))
                    if inv_balance <= 0:
                        continue
                    
                    allocation_amount = min(remaining, inv_balance)
                    
                    # Link manual payment to invoice via PaymentAllocation
                    alloc = PaymentAllocation.objects.create(
                        payment=manual_payment,
                        invoice=inv,
                        allocated_amount=allocation_amount,
                        allocation_type='manual',
                        notes='Auto-allocation on manual payment record',
                        allocated_by=recorded_by
                    )
                    allocations.append({
                        'invoice_id': inv.id,
                        'invoice_number': inv.invoice_number,
                        'allocated_amount': float(allocation_amount)
                    })
                    
                    # Create InvoicePayment so invoice totals update and appear in lease financials
                    InvoicePayment.objects.create(
                        invoice=inv,
                        tenant=inv.tenant,
                        amount=allocation_amount,
                        allocated_amount=allocation_amount,
                        payment_date=payment_date,
                        payment_method=payment_method,
                        reference_number=reference_number,
                        notes=notes,
                        recorded_by=recorded_by,
                        is_overpayment=False
                    )
                    
                    inv.calculate_totals()
                    inv.save()
                    remaining -= allocation_amount
                
                # 4) Update manual payment status and credit any remainder
                from .models import TenantCreditBalance
                if remaining > 0:
                    credit_balance, _ = TenantCreditBalance.objects.get_or_create(
                        tenant=lease.tenant,
                        defaults={'balance': Decimal('0.00')}
                    )
                    credit_balance.balance += remaining
                    credit_balance.save()
                
                manual_payment.allocated_amount = amount - remaining
                manual_payment.remaining_amount = remaining
                if manual_payment.remaining_amount <= 0:
                    manual_payment.status = 'allocated'
                manual_payment.save()
                
                return {
                    'success': True,
                    'payment_id': manual_payment.id,
                    'status': manual_payment.status,
                    'allocations': allocations,
                    'remaining_amount': float(remaining),
                    'message': 'Payment recorded and allocated successfully' if allocations else 'Payment recorded. No outstanding invoices; credited remaining to tenant.'
                }
            
        except Lease.DoesNotExist:
            return {
                'success': False,
                'error': 'Lease not found'
            }
        except Exception as e:
            self.logger.error(f"Manual payment recording failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def allocate_payment_manually(self, allocation_data, allocated_by):
        """
        Manually allocate payment across invoices
        
        Args:
            allocation_data: Allocation information
            allocated_by: User performing allocation
            
        Returns:
            dict: Allocation results
        """
        try:
            # Get payment source
            if allocation_data.get('payment_id'):
                from .models import ManualPayment
                payment_source = ManualPayment.objects.get(id=allocation_data['payment_id'])
                source_type = 'payment'
            elif allocation_data.get('bank_transaction_id'):
                from .models import BankTransaction
                payment_source = BankTransaction.objects.get(id=allocation_data['bank_transaction_id'])
                source_type = 'bank_transaction'
            else:
                return {'success': False, 'error': 'No payment source specified'}
            
            # Process allocations
            total_allocated = 0
            allocations_created = []
            
            for allocation in allocation_data['allocations']:
                from .models import Invoice, PaymentAllocation, InvoicePayment
                invoice = Invoice.objects.get(id=allocation['invoice_id'])
                amount = allocation['amount']
                
                # Create payment allocation
                payment_allocation = PaymentAllocation.objects.create(
                    payment=payment_source if source_type == 'payment' else None,
                    bank_transaction=payment_source if source_type == 'bank_transaction' else None,
                    invoice=invoice,
                    allocated_amount=amount,
                    allocation_type='manual',
                    notes=allocation.get('notes', ''),
                    allocated_by=allocated_by
                )
                
                # Create a corresponding payment record so totals recalc correctly
                payment_method = 'cash' if (source_type == 'payment' and getattr(payment_source, 'payment_method', None) == 'cash') else 'bank_transfer'
                payment_date = getattr(payment_source, 'payment_date', None) or getattr(payment_source, 'transaction_date', timezone.now().date())
                InvoicePayment.objects.create(
                    invoice=invoice,
                    tenant=invoice.tenant,
                    amount=amount,
                    allocated_amount=amount,
                    payment_date=payment_date,
                    payment_method=payment_method,
                    reference_number=getattr(payment_source, 'reference_number', '') or getattr(payment_source, 'id', ''),
                    notes=allocation.get('notes', ''),
                    recorded_by=allocated_by,
                    is_overpayment=False
                )
                
                # Recalculate invoice totals via model method
                invoice.calculate_totals()
                invoice.save()
                
                allocations_created.append(payment_allocation)
                total_allocated += amount
            
            # Update payment source status and optionally create credit for remainder
            if source_type == 'payment':
                payment_source.allocated_amount = total_allocated
                payment_source.remaining_amount = payment_source.amount - total_allocated
                
                # Valid statuses are: pending | allocated | cancelled
                # Keep 'pending' if there is a remaining amount; mark 'allocated' when fully consumed
                if payment_source.remaining_amount <= 0:
                    payment_source.status = 'allocated'
                
                payment_source.save()
            
            elif source_type == 'bank_transaction':
                payment_source.manually_allocated = True
                payment_source.allocation_notes = allocation_data.get('notes', '')
                payment_source.save()

            # Handle optional credit creation for any remainder
            try:
                create_credit = allocation_data.get('create_credit', False)
                if create_credit:
                    # Determine remaining amount
                    if source_type == 'payment':
                        remaining = payment_source.amount - total_allocated
                        tenant = payment_source.lease.tenant
                    else:
                        remaining = payment_source.amount - total_allocated
                        # Prefer matched lease tenant if available
                        tenant = payment_source.matched_lease.tenant if payment_source.matched_lease else None
                    if tenant and remaining and remaining > 0:
                        credit_balance, _ = TenantCreditBalance.objects.get_or_create(
                            tenant=tenant,
                            defaults={'balance': Decimal('0.00')}
                        )
                        credit_balance.balance += Decimal(str(remaining))
                        credit_balance.save()
            except Exception:
                # Non-fatal; continue returning allocation results
                pass
            
            return {
                'success': True,
                'total_allocated': total_allocated,
                'allocations_created': len(allocations_created),
                'message': 'Payment allocated successfully'
            }
            
        except Exception as e:
            self.logger.error(f"Manual payment allocation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_adjustment(self, adjustment_data, applied_by):
        """
        Create manual adjustment/waiver
        
        Args:
            adjustment_data: Adjustment information
            applied_by: User applying adjustment
            
        Returns:
            dict: Adjustment result
        """
        try:
            from .models import Invoice, Adjustment
            invoice = Invoice.objects.get(id=adjustment_data['invoice_id'])
            
            # Create adjustment
            adjustment = Adjustment.objects.create(
                invoice=invoice,
                adjustment_type=adjustment_data['adjustment_type'],
                amount=adjustment_data['amount'],
                reason=adjustment_data['reason'],
                notes=adjustment_data.get('notes', ''),
                effective_date=adjustment_data['effective_date'],
                applied_by=applied_by
            )
            
            # Update invoice totals
            invoice.subtotal += adjustment.amount
            invoice.total_amount = invoice.subtotal + invoice.tax_amount
            invoice.balance_due = invoice.total_amount - invoice.amount_paid
            invoice.save()
            
            return {
                'success': True,
                'adjustment_id': adjustment.id,
                'new_invoice_total': float(invoice.total_amount),
                'new_balance_due': float(invoice.balance_due),
                'message': 'Adjustment created successfully'
            }
            
        except Invoice.DoesNotExist:
            return {
                'success': False,
                'error': 'Invoice not found'
            }
        except Exception as e:
            self.logger.error(f"Adjustment creation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_tenant_statement(self, tenant_id, start_date=None, end_date=None, lease_id=None):
        """
        Generate comprehensive tenant statement
        
        Args:
            tenant_id: Tenant ID
            start_date: Start date for statement period
            end_date: End date for statement period
            
        Returns:
            dict: Complete tenant statement
        """
        try:
            import logging
            logger = logging.getLogger(__name__)
            try:
                logger.setLevel(logging.INFO)
            except Exception:
                pass
            from tenants.models import Tenant
            from leases.models import Lease
            from .models import Invoice, ManualPayment, Adjustment
            
            tenant = Tenant.objects.get(id=tenant_id)
            # Safely derive a displayable tenant name without changing response keys
            try:
                tenant_name = getattr(tenant, 'name', None) or tenant.user.get_full_name() or tenant.user.username
            except Exception:
                tenant_name = str(getattr(tenant.user, 'username', tenant_id))
            resolved = {'input_tenant_id': tenant_id, 'input_lease_id': lease_id}
            
            # Resolve lease: prefer explicit lease_id, else active, else latest lease by start_date
            lease = None
            if lease_id:
                try:
                    lease = Lease.objects.get(id=lease_id)
                except Lease.DoesNotExist:
                    return {'success': False, 'error': 'Lease not found'}
                # Optional safety: ensure tenant matches
                if lease.tenant_id != tenant.id:
                    return {'success': False, 'error': 'Lease does not belong to tenant'}
            else:
                lease = Lease.objects.filter(tenant=tenant, status='active').first()
                if not lease:
                    lease = Lease.objects.filter(tenant=tenant).order_by('-start_date').first()
                    if not lease:
                        return {'success': False, 'error': 'No lease found for tenant'}
            # Update resolution debug info
            try:
                resolved.update({'resolved_lease_id': lease.id, 'lease_status': getattr(lease, 'status', None)})
            except Exception:
                pass
            
            # Set default date range if not provided and normalize to date objects
            if not start_date:
                start_date = timezone.now().date().replace(day=1)
            if not end_date:
                end_date = timezone.now().date()
            
            # Compute opening balance (everything prior to period start)
            from .models import InvoicePayment as _InvoicePayment
            opening_invoices = Invoice.objects.filter(
                lease=lease,
                issue_date__isnull=False,
                issue_date__lt=start_date
            )
            opening_payments = _InvoicePayment.objects.filter(
                invoice__lease=lease,
                payment_date__lt=start_date
            )
            opening_adjustments = Adjustment.objects.filter(
                invoice__lease=lease,
                effective_date__lt=start_date
            )

            opening_balance = (
                sum((inv.total_amount for inv in opening_invoices), Decimal('0.00'))
                - sum((p.amount for p in opening_payments), Decimal('0.00'))
                + sum((adj.amount for adj in opening_adjustments), Decimal('0.00'))
            )

            # Get invoices for period. Primary filter is issue_date within window.
            # As a robustness enhancement, also include invoices whose billing_period_start
            # falls within the window in case issue_date was not set at creation time.
            from django.db.models import Q
            invoices = Invoice.objects.filter(
                lease=lease
            ).filter(
                Q(issue_date__isnull=False, issue_date__gte=start_date, issue_date__lte=end_date)
                |
                Q(billing_period_start__isnull=False, billing_period_start__gte=start_date, billing_period_start__lte=end_date)
            ).order_by('issue_date')
            
            # Get manual payments for period (source entries)
            payments = ManualPayment.objects.filter(
                lease=lease,
                payment_date__gte=start_date,
                payment_date__lte=end_date
            ).order_by('payment_date')

            # Get allocated invoice payments for period (canonical entries used in financial views)
            invoice_payments = _InvoicePayment.objects.filter(
                invoice__lease=lease,
                payment_date__gte=start_date,
                payment_date__lte=end_date
            ).order_by('payment_date')
            
            # Get adjustments for period
            adjustments = Adjustment.objects.filter(
                invoice__lease=lease,
                effective_date__gte=start_date,
                effective_date__lte=end_date
            ).order_by('effective_date')

            # Structured count log for diagnostics
            try:
                logger.warning(
                    "[statement] tenant_id=%s lease_id=%s period=%s..%s counts invoices=%s payments=%s adjustments=%s opening=%s",
                    tenant_id, lease.id, start_date, end_date,
                    invoices.count(), invoice_payments.count(), adjustments.count(),
                    float(opening_balance)
                )
            except Exception:
                pass
            
            # Calculate period totals
            total_charges = sum((inv.total_amount for inv in invoices), Decimal('0.00'))
            # Use InvoicePayment totals for accuracy (allocations reflect true application of funds)
            total_payments = sum((p.amount for p in invoice_payments), Decimal('0.00'))
            total_adjustments = sum((adj.amount for adj in adjustments), Decimal('0.00'))
            
            # Get outstanding invoices
            outstanding_invoices = Invoice.objects.filter(
                lease=lease,
                status__in=['sent', 'overdue', 'partially_paid'],
                balance_due__gt=0
            ).order_by('due_date')
            
            overdue_amount = sum(inv.balance_due for inv in outstanding_invoices if inv.due_date < timezone.now().date())
            
            # Build transaction history
            transactions = []

            # Add opening balance row first (synthetic)
            transactions.append({
                'date': start_date,
                'type': 'opening_balance',
                'description': 'Opening balance',
                'reference': '',
                'charges': 0.0,
                'payments': 0.0,
                'adjustments': 0.0,
                'payment_method': '',
                'balance': float(opening_balance)
            })
            
            # Add invoices with individual line items
            for invoice in invoices:
                # Get all line items for this invoice
                line_items = invoice.line_items.all().order_by('created_at')
                
                if line_items.exists():
                    # Add each line item as a separate transaction
                    for line_item in line_items:
                        transactions.append({
                            'date': invoice.issue_date,
                            'type': 'invoice_line_item',
                            'description': line_item.description,
                            'reference': invoice.invoice_number,
                            'charges': float(line_item.total),
                            'payments': 0,
                            'adjustments': 0,
                            'category': line_item.category,
                            'balance': 0  # running balance will be computed after sorting
                        })
                else:
                    # Fallback to invoice total if no line items (shouldn't happen)
                    transactions.append({
                        'date': invoice.issue_date,
                        'type': 'invoice',
                        'description': f"{invoice.title or 'Invoice'} - {invoice.invoice_number}",
                        'reference': invoice.invoice_number,
                        'charges': float(invoice.total_amount),
                        'payments': 0,
                        'adjustments': 0,
                        'balance': 0
                    })
            
            # Add allocated invoice payments (reflected in financial sections and balances)
            for pay in invoice_payments:
                transactions.append({
                    'date': pay.payment_date,
                    'type': 'payment',
                    'description': f"Payment - {pay.payment_method}",
                    'reference': pay.reference_number or f"PAY-{pay.id}",
                    'charges': 0,
                    'payments': float(pay.amount),
                    'adjustments': 0,
                    'payment_method': pay.payment_method,
                    'balance': 0
                })

            # Optionally also list manual payment source entries for traceability (marked as source)
            for payment in payments:
                transactions.append({
                    'date': payment.payment_date,
                    'type': 'payment_source',
                    'description': f"Manual Payment Recorded - {payment.payment_method}",
                    'reference': payment.reference_number or f"MP-{payment.id}",
                    'charges': 0,
                    'payments': float(payment.amount),
                    'adjustments': 0,
                    'balance': 0
                })
            
            # Add adjustments
            for adjustment in adjustments:
                transactions.append({
                    'date': adjustment.effective_date,
                    'type': 'adjustment',
                    'description': f"{adjustment.get_adjustment_type_display()} - {adjustment.reason}",
                    'reference': f"ADJ-{adjustment.id}",
                    'charges': 0,
                    'payments': 0,
                    'adjustments': float(adjustment.amount),
                    'balance': 0  # Will be calculated
                })
            
            # Sort transactions by date
            transactions.sort(key=lambda x: x['date'])

            # Calculate running balance starting from opening balance
            balance = float(opening_balance)
            for transaction in transactions:
                balance += transaction['charges'] - transaction['payments'] + transaction['adjustments']
                transaction['balance'] = balance
            
            # Compute closing/outstanding/credit
            closing_balance = Decimal(str(opening_balance)) + Decimal(str(total_charges)) - Decimal(str(total_payments)) + Decimal(str(total_adjustments))
            outstanding_balance = max(Decimal('0.00'), closing_balance)
            overpayment_credit = max(Decimal('0.00'), -closing_balance)

            # Deposit details
            deposit_held = Decimal(str(lease.deposit_amount or 0))
            deposit_deductions = sum((adj.amount for adj in adjustments if getattr(adj, 'adjustment_type', '') == 'deposit_deduction'), Decimal('0.00'))

            return {
                'success': True,
                'tenant': {
                    'id': tenant.id,
                    'name': tenant_name,
                    'email': tenant.email
                },
                'property': {
                    'name': getattr(lease.property, 'name', 'N/A') or 'N/A',
                    'address': getattr(lease.property, 'address', '') or ''
                },
                'lease': {
                    'id': lease.id,
                    # Use a safe attribute for display: prefer property name; avoid non-existent unit_number
                    'unit': (getattr(lease.property, 'name', None) or 'N/A'),
                    'monthly_rent': float(lease.monthly_rent),
                    'start_date': lease.start_date,
                    'end_date': lease.end_date
                },
                'statement_period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'generated_date': timezone.now()
                },
                'notes': [
                    'Draft invoices (without an issue_date) may be excluded from date-bound summaries.',
                    'Payments reflect allocations (InvoicePayment) to ensure balances match lease financials.',
                    'Opening balance includes activity prior to the selected period.'
                ],
                'summary': {
                    'opening_balance': float(opening_balance),
                    'total_charges': float(total_charges),
                    'total_rent_due': float(total_charges),
                    'total_payments': float(total_payments),
                    'total_adjustments': float(total_adjustments),
                    'closing_balance': float(closing_balance),
                    'outstanding_balance': float(outstanding_balance),
                    'overpayment_credit': float(overpayment_credit),
                    'credit_balance': float(overpayment_credit),
                    'overdue_amount': float(sum((inv.balance_due for inv in outstanding_invoices if inv.due_date < timezone.now().date()), Decimal('0.00')))
                },
                'transactions': transactions,
                'deposit': {
                    'held': float(deposit_held),
                    'deductions': float(deposit_deductions)
                },
                'outstanding_invoices': [
                    {
                        'invoice_id': inv.id,
                        'invoice_number': inv.invoice_number,
                        'due_date': inv.due_date,
                        'amount': float(inv.balance_due),
                        'days_overdue': (timezone.now().date() - inv.due_date).days if inv.due_date < timezone.now().date() else 0
                    }
                    for inv in outstanding_invoices
                ],
                'debug': resolved
            }
            
        except Tenant.DoesNotExist:
            return {'success': False, 'error': 'Tenant not found'}
        except Exception as e:
            self.logger.error("[statement] exception=%s", str(e))
            return {'success': False, 'error': str(e)}