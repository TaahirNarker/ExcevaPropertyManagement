from django.test import TestCase
from django.utils import timezone
from datetime import date
from decimal import Decimal

from tenants.models import Tenant
from properties.models import Property
from leases.models import Lease
from .models import Invoice, InvoiceLineItem, UnderpaymentAlert, ManualPayment
from .services import InvoiceGenerationService, PaymentReconciliationService
from users.models import CustomUser


class CarryOverArrearsTest(TestCase):
    """Verify arrears carry-over line is added to next monthly invoice."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def _create_min_tenant(self, email="john@example.com"):
        user = self._create_user(email)
        return Tenant.objects.create(
            user=user,
            id_number="8001015009087",
            date_of_birth=date(1980,1,1),
            phone="0800000000",
            email=email,
            address="1 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000001',
            emergency_contact_relationship='Friend',
            status='active'
        )

    def setUp(self):
        owner = self._create_user('owner@example.com')
        self.property = Property.objects.create(
            name="Test Property",
            street_address="1 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        self.tenant = self._create_min_tenant("john@example.com")
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=Decimal('1000.00'),
            deposit_amount=Decimal('1000.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

    def test_carry_over_line_item(self):
        # Create a previous month unpaid invoice
        prev_month = date(2025, 2, 1)
        inv_service = InvoiceGenerationService()
        prev_invoice = inv_service.generate_monthly_invoice(self.lease, prev_month)
        # Simulate sent invoice with outstanding balance
        prev_invoice.status = 'sent'
        prev_invoice.save()

        # Generate current month invoice and expect arrears carry-over line
        current_month = date(2025, 3, 1)
        current_invoice = inv_service.generate_monthly_invoice(self.lease, current_month)

        arrears_items = current_invoice.line_items.filter(description='Arrears carry-over')
        self.assertTrue(arrears_items.exists(), 'Arrears carry-over line should be present')
        self.assertEqual(arrears_items.first().total, prev_invoice.balance_due)


class UnderpaymentAlertCreationTest(TestCase):
    """Verify underpayment alert is created on partial reconciliation."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def setUp(self):
        owner = self._create_user('owner2@example.com')
        self.property = Property.objects.create(
            name="Test Property",
            street_address="1 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        # Reuse helper from first test class pattern
        user = self._create_user('jane@example.com')
        self.tenant = Tenant.objects.create(
            user=user,
            id_number="8001015009088",
            date_of_birth=date(1980,1,1),
            phone="0800000002",
            email='jane@example.com',
            address="2 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000003',
            emergency_contact_relationship='Friend',
            status='active'
        )
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=Decimal('1000.00'),
            deposit_amount=Decimal('1000.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

    def test_underpayment_alert_on_partial_csv(self):
        from .models import BankTransaction
        inv_service = InvoiceGenerationService()
        month = date(2025, 2, 1)
        invoice = inv_service.generate_monthly_invoice(self.lease, month)
        invoice.status = 'sent'
        invoice.save()

        # Create a real bank transaction with partial amount
        txn = BankTransaction.objects.create(
            import_batch='TESTBATCH',
            transaction_date=timezone.now().date(),
            description='Tenant payment',
            amount=Decimal(str(float(invoice.total_amount) - 100.0)),
            transaction_type='credit',
            reference_number='REF-1',
            bank_account='TEST',
            tenant_reference=self.tenant.tenant_code
        )

        service = PaymentReconciliationService()
        result = service._attempt_automatic_reconciliation(txn)
        self.assertIn(result.get('status'), ['reconciled', 'manual_review'])
        # Ensure alert is created when partial
        self.assertTrue(UnderpaymentAlert.objects.filter(invoice=invoice, tenant=self.tenant).exists())


class ManualAllocationIntegrationTest(TestCase):
    """Integration: allocating manual payment updates invoice totals and reflects in statement."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def setUp(self):
        owner = self._create_user('owner3@example.com')
        self.property = Property.objects.create(
            name="Test Property",
            street_address="1 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        user = self._create_user('jim@example.com')
        self.tenant = Tenant.objects.create(
            user=user,
            id_number="8001015009089",
            date_of_birth=date(1980,1,1),
            phone="0800000004",
            email='jim@example.com',
            address="3 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000005',
            emergency_contact_relationship='Friend',
            status='active'
        )
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=Decimal('1000.00'),
            deposit_amount=Decimal('1000.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

    def test_manual_allocation_updates_invoice(self):
        inv_service = InvoiceGenerationService()
        month = date(2025, 2, 1)
        invoice = inv_service.generate_monthly_invoice(self.lease, month)
        invoice.status = 'sent'
        invoice.save()

        # Record manual payment pending
        rec_service = PaymentReconciliationService()
        rec = rec_service.record_manual_payment({
            'lease_id': self.lease.id,
            'payment_method': 'cash',
            'amount': Decimal('600.00'),
            'payment_date': timezone.now().date().isoformat(),
            'reference_number': 'CASH-001'
        }, recorded_by=None)
        self.assertTrue(rec['success'])

        # Allocate payment to invoice
        result = rec_service.allocate_payment_manually({
            'payment_id': rec['payment_id'],
            'allocations': [{ 'invoice_id': invoice.id, 'amount': Decimal('600.00') }],
            'create_credit': False,
        }, allocated_by=None)
        self.assertTrue(result['success'])

        # Refresh invoice and validate
        invoice.refresh_from_db()
        self.assertEqual(invoice.amount_paid, Decimal('600.00'))
        self.assertEqual(invoice.status, 'partially_paid')
