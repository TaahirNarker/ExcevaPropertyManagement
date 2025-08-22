"""
Invoice generation and management services for the property management system.
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from django.utils import timezone
from django.db import transaction

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
        """
        with transaction.atomic():
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
            invoice = Invoice.objects.create(
                lease=lease,
                property=lease.property,
                tenant=lease.tenant,
                landlord=lease.landlord,
                created_by=user,
                invoice_number=self.generate_invoice_number(),
                title=f"Initial Invoice - {lease.property.name}",
                issue_date=timezone.now().date(),
                due_date=start_date,
                billing_period_start=billing_start,
                billing_period_end=billing_end,
                status='draft',
                invoice_type='regular'
            )
            
            # Add line items
            line_items = []
            
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
            
            # 2. Deposit
            if lease.deposit_amount > 0:
                line_items.append({
                    'description': 'Security Deposit',
                    'category': 'Deposit',
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
            invoice.save()
            
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
            invoice = Invoice.objects.create(
                lease=lease,
                property=lease.property,
                tenant=lease.tenant,
                landlord=lease.landlord,
                created_by=user,
                title=f"Monthly Invoice - {billing_month.strftime('%B %Y')}",
                issue_date=None,  # Will be set when sent
                due_date=due_date,
                billing_period_start=billing_start,
                billing_period_end=billing_end,
                status='draft',
                invoice_type='regular'
            )
            
            # Add base rent
            line_items = [{
                'description': 'Monthly Rent',
                'category': 'Rent',
                'quantity': 1,
                'unit_price': lease.monthly_rent,
                'total': lease.monthly_rent
            }]
            
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
            
            return invoice
    
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
            remaining_amount = amount
            payment_records = []
            
            # Sort invoices by due date (oldest first)
            sorted_invoices = sorted(invoices, key=lambda inv: inv.due_date)
            
            for invoice in sorted_invoices:
                if remaining_amount <= 0:
                    break
                
                # Calculate how much to allocate to this invoice
                invoice_balance = invoice.balance_due
                allocation_amount = min(remaining_amount, invoice_balance)
                
                if allocation_amount > 0:
                    # Create payment record
                    payment = InvoicePayment.objects.create(
                        invoice=invoice,
                        tenant=tenant,
                        amount=amount,  # Full payment amount
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