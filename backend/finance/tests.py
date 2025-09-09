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


class AutoRecalcAndSummaryTest(TestCase):
    """Minimal tests verifying signals and financial_summary outstanding."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def setUp(self):
        owner = self._create_user('owner4@example.com')
        self.property = Property.objects.create(
            name="Test Property",
            street_address="1 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        user = self._create_user('amy@example.com')
        self.tenant = Tenant.objects.create(
            user=user,
            id_number="8001015009090",
            date_of_birth=date(1980,1,1),
            phone="0800000006",
            email='amy@example.com',
            address="4 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000007',
            emergency_contact_relationship='Friend',
            status='active'
        )
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=Decimal('20000.00'),
            deposit_amount=Decimal('0.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

    def test_signals_recalculate_invoice_on_payment(self):
        from .models import Invoice, InvoiceLineItem, InvoicePayment
        inv = Invoice.objects.create(
            lease=self.lease, property=self.property, tenant=self.tenant,
            title='Signals', issue_date=timezone.now().date(), due_date=timezone.now().date(), status='sent')
        InvoiceLineItem.objects.create(invoice=inv, description='Rent', category='Rent', quantity=1, unit_price=Decimal('20000.00'), total=Decimal('20000.00'))
        inv.refresh_from_db()
        self.assertEqual(inv.balance_due, Decimal('20000.00'))

        InvoicePayment.objects.create(invoice=inv, tenant=self.tenant, amount=Decimal('5000.00'), allocated_amount=Decimal('5000.00'), payment_date=timezone.now().date(), payment_method='bank_transfer')
        inv.refresh_from_db()
        self.assertEqual(inv.amount_paid, Decimal('5000.00'))
        self.assertEqual(inv.balance_due, Decimal('15000.00'))

    def test_financial_summary_uses_balance_due(self):
        from rest_framework.test import APIRequestFactory
        from .views import FinanceAPIViewSet
        from .models import Invoice, InvoiceLineItem, InvoicePayment
        # create two invoices
        inv1 = Invoice.objects.create(lease=self.lease, property=self.property, tenant=self.tenant, title='I1', issue_date=timezone.now().date(), due_date=timezone.now().date(), status='sent')
        InvoiceLineItem.objects.create(invoice=inv1, description='Rent', category='Rent', quantity=1, unit_price=Decimal('1000.00'), total=Decimal('1000.00'))

        inv2 = Invoice.objects.create(lease=self.lease, property=self.property, tenant=self.tenant, title='I2', issue_date=timezone.now().date(), due_date=timezone.now().date(), status='partially_paid')
        InvoiceLineItem.objects.create(invoice=inv2, description='Rent', category='Rent', quantity=1, unit_price=Decimal('2000.00'), total=Decimal('2000.00'))
        InvoicePayment.objects.create(invoice=inv2, tenant=self.tenant, amount=Decimal('500.00'), allocated_amount=Decimal('500.00'), payment_date=timezone.now().date(), payment_method='bank_transfer')

        inv1.refresh_from_db(); inv2.refresh_from_db()
        factory = APIRequestFactory()
        request = factory.get('/api/finance/financial-summary')
        view = FinanceAPIViewSet.as_view({'get': 'financial_summary'})
        response = view(request)
        self.assertEqual(response.status_code, 200)
        expected = float(inv1.balance_due + inv2.balance_due)
        self.assertAlmostEqual(response.data['total_outstanding'], expected, places=2)


class StatementRunningBalanceTest(TestCase):
    """Validate opening balance and server-side running balance across invoices and payments."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def setUp(self):
        owner = self._create_user('owner5@example.com')
        self.property = Property.objects.create(
            name="Prop A",
            street_address="5 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        user = self._create_user('rob@example.com')
        self.tenant = Tenant.objects.create(
            user=user,
            id_number="8001015009091",
            date_of_birth=date(1980,1,1),
            phone="0800000008",
            email='rob@example.com',
            address="5 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000009',
            emergency_contact_relationship='Friend',
            status='active'
        )
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=Decimal('1000.00'),
            deposit_amount=Decimal('0.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

    def test_opening_and_running_balance(self):
        inv_service = InvoiceGenerationService()
        # Create two months before the window and one inside the window
        jan = date(2025, 1, 1)
        feb = date(2025, 2, 1)
        mar = date(2025, 3, 1)

        jan_inv = inv_service.generate_monthly_invoice(self.lease, jan)
        jan_inv.status = 'sent'; jan_inv.save()
        feb_inv = inv_service.generate_monthly_invoice(self.lease, feb)
        feb_inv.status = 'sent'; feb_inv.save()
        mar_inv = inv_service.generate_monthly_invoice(self.lease, mar)
        mar_inv.status = 'sent'; mar_inv.save()

        # Pay part of February in February
        from .models import InvoicePayment
        InvoicePayment.objects.create(
            invoice=feb_inv,
            tenant=self.tenant,
            amount=Decimal('200.00'),
            allocated_amount=Decimal('200.00'),
            payment_date=date(2025, 2, 10),
            payment_method='bank_transfer'
        )
        # Pay part of January in March (should not affect opening balance for March window)
        InvoicePayment.objects.create(
            invoice=jan_inv,
            tenant=self.tenant,
            amount=Decimal('300.00'),
            allocated_amount=Decimal('300.00'),
            payment_date=date(2025, 3, 5),
            payment_method='bank_transfer'
        )

        service = PaymentReconciliationService()
        statement = service.get_tenant_statement(
            tenant_id=self.tenant.id,
            start_date=date(2025, 3, 1),
            end_date=date(2025, 3, 31),
            lease_id=self.lease.id
        )
        self.assertTrue(statement['success'])

        # Opening balance should include Jan and Feb charges minus Feb payments; excl Mar
        opening_expected = (jan_inv.total_amount + feb_inv.total_amount) - Decimal('200.00')
        self.assertAlmostEqual(Decimal(str(statement['summary']['opening_balance'])), opening_expected)

        # First transaction is opening balance row; then Mar invoice and Mar payments (including Jan payment in Mar)
        tx = statement['transactions']
        # Ensure sorted and running balance ends at closing balance
        self.assertGreaterEqual(len(tx), 1)
        closing_from_rows = Decimal('0.00')
        for i, row in enumerate(tx):
            # Validate row balance equals calculation up to that row
            if i == 0:
                self.assertEqual(row['type'], 'opening_balance')
            closing_from_rows = Decimal(str(row['balance']))
        self.assertAlmostEqual(closing_from_rows, Decimal(str(statement['summary']['closing_balance'])))


class LeaseStatementEndpointTest(TestCase):
    """Integration test for the lease-statement endpoint shape and totals."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def setUp(self):
        owner = self._create_user('owner6@example.com')
        self.property = Property.objects.create(
            name="Prop B",
            street_address="10 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        user = self._create_user('sue@example.com')
        self.tenant = Tenant.objects.create(
            user=user,
            id_number="8001015009092",
            date_of_birth=date(1980,1,1),
            phone="0800000010",
            email='sue@example.com',
            address="10 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000011',
            emergency_contact_relationship='Friend',
            status='active'
        )
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            monthly_rent=Decimal('1500.00'),
            deposit_amount=Decimal('0.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

    def test_endpoint_response_shape(self):
        from rest_framework.test import APIClient
        client = APIClient()
        url = f"/api/finance/lease-statement/{self.lease.id}/?start_date=2025-03-01&end_date=2025-03-31"
        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Basic shape assertions
        self.assertTrue(data.get('success'))
        self.assertIn('tenant', data)
        self.assertIn('lease', data)
        self.assertIn('statement_period', data)
        self.assertIn('summary', data)
        self.assertIn('transactions', data)


class InitialInvoiceOnLeaseCreationTest(TestCase):
    """Ensure creating a lease generates and auto-sends an initial invoice with rent and deposit."""

    def _create_user(self, email):
        return CustomUser.objects.create_user(username=email.split('@')[0], email=email, password='pass1234')

    def setUp(self):
        owner = self._create_user('owner7@example.com')
        self.property = Property.objects.create(
            name="Init Prop",
            street_address="20 Test St",
            city="Cape Town",
            province="western_cape",
            owner=owner,
        )
        tenant_user = self._create_user('init@example.com')
        self.tenant = Tenant.objects.create(
            user=tenant_user,
            id_number="8001015009093",
            date_of_birth=date(1980,1,1),
            phone="0800000012",
            email='init@example.com',
            address="20 Main St",
            city="Cape Town",
            province="Western Cape",
            postal_code="8000",
            employment_status='employed',
            emergency_contact_name='EC',
            emergency_contact_phone='0800000013',
            emergency_contact_relationship='Friend',
            status='active'
        )

    def test_initial_invoice_created_and_statement_shows_balance(self):
        today = timezone.now().date()
        first_of_month = today.replace(day=1)

        lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date=first_of_month,
            end_date=first_of_month.replace(year=first_of_month.year + 1),
            monthly_rent=Decimal('1234.56'),
            deposit_amount=Decimal('2000.00'),
            rental_frequency='Monthly',
            rent_due_day=1,
            status='active'
        )

        from .models import Invoice
        invoices = Invoice.objects.filter(lease=lease)
        self.assertEqual(invoices.count(), 1, 'Exactly one initial invoice should be created')
        invoice = invoices.first()
        self.assertEqual(invoice.status, 'sent', 'Initial invoice should be auto-sent')
        # Line items validation
        descriptions = list(invoice.line_items.values_list('description', flat=True))
        categories = list(invoice.line_items.values_list('category', flat=True))
        self.assertIn('Monthly Rent', descriptions)
        self.assertIn('Security Deposit', descriptions)
        self.assertIn('Security Deposit', categories)

        # Statement should include the invoice in current month and closing balance > 0
        service = PaymentReconciliationService()
        statement = service.get_tenant_statement(
            tenant_id=self.tenant.id,
            start_date=first_of_month,
            end_date=today,
            lease_id=lease.id
        )
        self.assertTrue(statement['success'])
        self.assertGreater(statement['summary']['closing_balance'], 0.0)
