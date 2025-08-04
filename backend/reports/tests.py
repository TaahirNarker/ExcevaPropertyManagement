"""
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from users.models import CustomUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from finance.models import Invoice, Payment
from tenants.models import Tenant
from leases.models import Lease
from properties.models import Property
import io

class ReportsViewsTestCase(TestCase):
    def setUp(self):
        # Create test user
        User = get_user_model()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            username='testuser'
        )
        
        # Create API client and authenticate
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Create sample data for reports
        self.property = Property.objects.create(
            name='Test Property',
            street_address='123 Test St',
            suburb='Test Suburb',
            city='Test City',
            province='gauteng',
            postal_code='1234',
            monthly_rental_amount=1000.00
        )
        
        self.tenant = Tenant.objects.create(
            user=self.user,
            contact_number='1234567890'
        )
        
        self.lease = Lease.objects.create(
            property=self.property,
            tenant=self.tenant,
            start_date='2024-01-01',
            end_date='2024-12-31',
            monthly_rent=1000.00,
            status='active'
        )
        
        self.invoice = Invoice.objects.create(
            lease=self.lease,
            invoice_number='INV001',
            amount_due=1000.00,
            due_date='2024-02-01',
            status='paid'
        )
        
        self.payment = Payment.objects.create(
            invoice=self.invoice,
            amount=1000.00,
            payment_date='2024-01-15',
            payment_method='bank_transfer'
        )

    def test_export_pdf_success(self):
        url = reverse('export_pdf', kwargs={'report_id': 'rental-income'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue('attachment' in response['Content-Disposition'])

    def test_export_xlsx_success(self):
        url = reverse('export_xlsx', kwargs={'report_id': 'payment-history'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertTrue('attachment' in response['Content-Disposition'])

    def test_export_invalid_report(self):
        url = reverse('export_pdf', kwargs={'report_id': 'invalid'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_access(self):
        self.client.credentials()  # Remove auth
        url = reverse('export_pdf', kwargs={'report_id': 'rental-income'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
"""
