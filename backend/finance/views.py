from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from decimal import Decimal
from .models import Invoice, Payment, FinancialSummary
from .serializers import InvoiceSerializer, PaymentRecordSerializer, FinancialSummarySerializer
from properties.models import Property, Unit
from tenants.models import Tenant


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(is_active=True)
    serializer_class = InvoiceSerializer
    permission_classes = [AllowAny]  # Allow public access for development
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        tenant_id = self.request.query_params.get('tenant_id', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if tenant_id:
            queryset = queryset.filter(lease__tenant_id=tenant_id)
            
        return queryset.order_by('-issue_date')
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark an invoice as paid"""
        invoice = self.get_object()
        invoice.amount_paid = invoice.total_amount
        invoice.status = 'paid'
        invoice.save()
        
        # Create payment record
        Payment.objects.create(
            invoice=invoice,
            amount=invoice.total_amount,
            payment_method='bank_transfer',
            is_verified=True,
            notes='Marked as paid via API'
        )
        
        return Response({'status': 'Invoice marked as paid'})


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.filter(is_active=True)
    serializer_class = PaymentRecordSerializer
    permission_classes = [AllowAny]  # Allow public access for development
    
    def get_queryset(self):
        queryset = super().get_queryset()
        invoice_id = self.request.query_params.get('invoice_id', None)
        tenant_id = self.request.query_params.get('tenant_id', None)
        
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        if tenant_id:
            queryset = queryset.filter(invoice__lease__tenant_id=tenant_id)
            
        return queryset.order_by('-payment_date')


@api_view(['GET'])
@permission_classes([AllowAny])  # Allow public access for development
def dashboard_summary(request):
    """
    Dashboard summary endpoint providing key financial and property metrics
    """
    try:
        # Get current date
        today = timezone.now().date()
        
        # Calculate property metrics
        total_properties = Property.objects.filter(is_active=True).count()
        total_units = Unit.objects.filter(is_active=True).count()
        occupied_units = Unit.objects.filter(is_active=True, status='occupied').count()
        
        # Calculate vacancy rate
        vacancy_rate = 0
        if total_units > 0:
            vacancy_rate = ((total_units - occupied_units) / total_units) * 100
        
        # Calculate tenant count (assuming one tenant per occupied unit)
        total_tenants = Tenant.objects.filter(is_active=True).count()
        
        # Calculate financial metrics
        # Current month's invoices
        current_month_invoices = Invoice.objects.filter(
            is_active=True,
            issue_date__year=today.year,
            issue_date__month=today.month
        )
        
        rent_due = current_month_invoices.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        rent_collected = current_month_invoices.aggregate(
            total=Sum('amount_paid')
        )['total'] or Decimal('0.00')
        
        # Outstanding invoices (all unpaid amounts)
        outstanding_amount = Invoice.objects.filter(
            is_active=True,
            status__in=['sent', 'overdue', 'partial']
        ).aggregate(
            total=Sum('amount') - Sum('amount_paid')
        )['total'] or Decimal('0.00')
        
        # Prepare response data
        summary_data = {
            'rent_due': float(rent_due),
            'rent_collected': float(rent_collected),
            'vacancy_rate': round(vacancy_rate, 1),
            'total_properties': total_properties,
            'total_units': total_units,
            'occupied_units': occupied_units,
            'total_tenants': total_tenants,
            'outstanding_amount': float(outstanding_amount),
        }
        
        return Response(summary_data)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to calculate dashboard summary: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
