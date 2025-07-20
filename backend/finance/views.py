from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import datetime, timedelta

from .models import Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment
from .serializers import (
    InvoiceSerializer, InvoiceCreateUpdateSerializer, InvoiceListSerializer,
    InvoiceTemplateSerializer, InvoicePaymentSerializer, InvoiceSummarySerializer
)
from tenants.models import Lease, Tenant


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices with full CRUD operations
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'lease', 'property', 'tenant', 'landlord']
    search_fields = ['invoice_number', 'title', 'tenant__name', 'property__name']
    ordering_fields = ['issue_date', 'due_date', 'total_amount', 'created_at']
    ordering = ['-issue_date']

    def get_queryset(self):
        """Filter invoices based on user permissions"""
        user = self.request.user
        
        # If user is a landlord, show only their invoices
        if hasattr(user, 'is_landlord') and user.is_landlord:
            return Invoice.objects.filter(landlord=user)
        
        # If user is staff/admin, show all invoices
        if user.is_staff:
            return Invoice.objects.all()
        
        # Default: show invoices created by the user
        return Invoice.objects.filter(created_by=user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return InvoiceCreateUpdateSerializer
        elif self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def by_lease(self, request):
        """Get invoices for a specific lease"""
        lease_id = request.query_params.get('lease_id')
        if not lease_id:
            return Response(
                {'error': 'lease_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lease = Lease.objects.get(id=lease_id)
            invoices = self.get_queryset().filter(lease=lease)
            serializer = InvoiceListSerializer(invoices, many=True)
            return Response(serializer.data)
        except Lease.DoesNotExist:
            return Response(
                {'error': 'Lease not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def by_month(self, request):
        """Get invoices for a specific month"""
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not year or not month:
            return Response(
                {'error': 'year and month parameters are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            year = int(year)
            month = int(month)
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date()
            else:
                end_date = datetime(year, month + 1, 1).date()
            
            invoices = self.get_queryset().filter(
                issue_date__gte=start_date,
                issue_date__lt=end_date
            )
            serializer = InvoiceListSerializer(invoices, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {'error': 'Invalid year or month format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue invoices"""
        today = timezone.now().date()
        overdue_invoices = self.get_queryset().filter(
            due_date__lt=today,
            status__in=['draft', 'sent']
        )
        serializer = InvoiceListSerializer(overdue_invoices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get invoice summary statistics"""
        queryset = self.get_queryset()
        
        # Calculate statistics
        total_invoices = queryset.count()
        total_amount = queryset.aggregate(total=Sum('total_amount'))['total'] or 0
        paid_invoices = queryset.filter(status='paid').count()
        overdue_invoices = queryset.filter(
            due_date__lt=timezone.now().date(),
            status__in=['draft', 'sent']
        ).count()
        
        # Monthly breakdown
        current_month = timezone.now().replace(day=1)
        monthly_invoices = queryset.filter(
            issue_date__gte=current_month
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        return Response({
            'total_invoices': total_invoices,
            'total_amount': total_amount,
            'paid_invoices': paid_invoices,
            'overdue_invoices': overdue_invoices,
            'monthly_amount': monthly_invoices,
        })

    @action(detail=True, methods=['post'])
    def send_invoice(self, request, pk=None):
        """Mark invoice as sent"""
        invoice = self.get_object()
        invoice.status = 'sent'
        invoice.save()
        return Response({'status': 'Invoice sent successfully'})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save()
        return Response({'status': 'Invoice marked as paid'})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate an existing invoice"""
        original_invoice = self.get_object()
        
        # Create new invoice with same data but new dates
        new_invoice = Invoice.objects.create(
            title=f"Copy of {original_invoice.title}",
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=30),
            status='draft',
            lease=original_invoice.lease,
            property=original_invoice.property,
            tenant=original_invoice.tenant,
            landlord=original_invoice.landlord,
            created_by=request.user,
            tax_rate=original_invoice.tax_rate,
            notes=original_invoice.notes,
            email_subject=original_invoice.email_subject,
            email_recipient=original_invoice.email_recipient,
            bank_info=original_invoice.bank_info,
            extra_notes=original_invoice.extra_notes,
        )
        
        # Copy line items
        for line_item in original_invoice.line_items.all():
            InvoiceLineItem.objects.create(
                invoice=new_invoice,
                description=line_item.description,
                category=line_item.category,
                quantity=line_item.quantity,
                unit_price=line_item.unit_price,
            )
        
        serializer = InvoiceSerializer(new_invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InvoiceTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoice templates
    """
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        """Filter templates based on user"""
        user = self.request.user
        if user.is_staff:
            return InvoiceTemplate.objects.all()
        return InvoiceTemplate.objects.filter(created_by=user)

    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def apply_to_invoice(self, request, pk=None):
        """Apply template to an existing invoice"""
        template = self.get_object()
        invoice_id = request.data.get('invoice_id')
        
        if not invoice_id:
            return Response(
                {'error': 'invoice_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            
            # Apply template data
            if template.from_details:
                invoice.from_details = template.from_details
            if template.to_details:
                invoice.to_details = template.to_details
            if template.default_notes:
                invoice.notes = template.default_notes
            if template.bank_info:
                invoice.bank_info = template.bank_info
            
            invoice.save()
            
            # Apply default line items if any
            if template.default_line_items:
                # Clear existing line items
                invoice.line_items.all().delete()
                
                # Add template line items
                for item_data in template.default_line_items:
                    InvoiceLineItem.objects.create(
                        invoice=invoice,
                        description=item_data.get('description', ''),
                        category=item_data.get('category', ''),
                        quantity=item_data.get('quantity', 1),
                        unit_price=item_data.get('unit_price', 0),
                    )
            
            serializer = InvoiceSerializer(invoice)
            return Response(serializer.data)
            
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class InvoicePaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoice payments
    """
    permission_classes = [IsAuthenticated]
    serializer_class = InvoicePaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['invoice', 'payment_method']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

    def get_queryset(self):
        """Filter payments based on user permissions"""
        user = self.request.user
        
        if user.is_staff:
            return InvoicePayment.objects.all()
        
        # For landlords, show payments for their invoices
        if hasattr(user, 'is_landlord') and user.is_landlord:
            return InvoicePayment.objects.filter(invoice__landlord=user)
        
        # For other users, show payments for invoices they created
        return InvoicePayment.objects.filter(invoice__created_by=user)

    @action(detail=False, methods=['get'])
    def by_invoice(self, request):
        """Get payments for a specific invoice"""
        invoice_id = request.query_params.get('invoice_id')
        if not invoice_id:
            return Response(
                {'error': 'invoice_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = self.get_queryset().filter(invoice_id=invoice_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
