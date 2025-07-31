from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment, InvoiceAuditLog
from .serializers import (
    InvoiceSerializer, InvoiceCreateUpdateSerializer, InvoiceListSerializer,
    InvoiceTemplateSerializer, InvoicePaymentSerializer, InvoiceSummarySerializer,
    InvoiceDetailSerializer, InvoiceLineItemSerializer, InvoiceAuditLogSerializer
)
from tenants.models import Lease, Tenant
from properties.models import Property
from users.models import CustomUser


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices with full CRUD operations
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'lease', 'property', 'tenant', 'landlord', 'is_locked', 'invoice_type']
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
        elif self.action == 'retrieve':
            return InvoiceDetailSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        """Set created_by to current user and create audit log"""
        invoice = serializer.save(created_by=self.request.user)
        
        # Create audit log entry
        InvoiceAuditLog.objects.create(
            invoice=invoice,
            action='created',
            user=self.request.user,
            details=f"Invoice {invoice.invoice_number} created"
        )

    def perform_update(self, serializer):
        """Check if invoice can be updated and create audit log"""
        invoice = self.get_object()
        
        # Check if invoice is locked
        if invoice.is_locked:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot edit locked invoice. Invoice was locked when sent.")
        
        # Check if user has permission to edit this status
        if not invoice.can_edit():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"Cannot edit invoice with status '{invoice.get_status_display()}'")
        
        # Store original data for audit
        original_data = {
            'total_amount': str(invoice.total_amount),
            'status': invoice.status,
            'due_date': str(invoice.due_date),
        }
        
        # Save the updated invoice
        updated_invoice = serializer.save()
        
        # Create audit log entry
        InvoiceAuditLog.objects.create(
            invoice=updated_invoice,
            action='updated',
            user=self.request.user,
            details=f"Invoice {updated_invoice.invoice_number} updated",
            old_value=str(original_data),
            new_value=str({
                'total_amount': str(updated_invoice.total_amount),
                'status': updated_invoice.status,
                'due_date': str(updated_invoice.due_date),
            })
        )

    def perform_destroy(self, instance):
        """Check if invoice can be deleted and create audit log"""
        # Check if invoice is locked
        if instance.is_locked:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cannot delete locked invoice.")
        
        # Check if user has permission to delete this status
        if not instance.can_delete():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"Cannot delete invoice with status '{instance.get_status_display()}'")
        
        # Create audit log entry before deletion
        InvoiceAuditLog.objects.create(
            invoice=instance,
            action='deleted',
            user=self.request.user,
            details=f"Invoice {instance.invoice_number} deleted"
        )
        
        # Perform the deletion
        super().perform_destroy(instance)

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
        """Send invoice via email, mark as sent, and lock it"""
        from .utils import send_invoice_email
        
        invoice = self.get_object()
        method = request.data.get('method', 'email')
        recipient_email = request.data.get('recipient_email')
        
        # Check if invoice can be sent
        if not invoice.can_send():
            return Response({
                'success': False,
                'message': f'Cannot send invoice with status "{invoice.get_status_display()}" or if already locked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if method == 'email':
            try:
                success, message = send_invoice_email(
                    invoice, 
                    recipient_email=recipient_email,
                    include_payment_link=True
                )
                
                if success:
                    # Mark as sent and record audit
                    invoice.sent_at = timezone.now()
                    invoice.sent_by = request.user
                    invoice.status = 'sent'
                    invoice.save()
                    
                    # Create sent audit log
                    InvoiceAuditLog.objects.create(
                        invoice=invoice,
                        action='sent',
                        user=request.user,
                        details=f"Invoice {invoice.invoice_number} sent via {method} to {recipient_email or 'default recipient'}"
                    )
                    
                    # Lock the invoice immediately after sending
                    invoice.lock_invoice(request.user)
                    
                    return Response({
                        'success': True,
                        'message': message,
                        'status': invoice.status,
                        'is_locked': invoice.is_locked
                    })
                else:
                    return Response({
                        'success': False,
                        'message': message
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                return Response({
                    'success': False,
                    'message': f'Failed to send invoice: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                'success': False,
                'message': f'Method {method} not yet implemented'
            }, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=True, methods=['post'])
    def create_interim_invoice(self, request, pk=None):
        """Create an interim invoice for adjustments or disputes"""
        parent_invoice = self.get_object()
        
        # Get interim invoice data
        invoice_type = request.data.get('invoice_type', 'interim')
        description = request.data.get('description', 'Interim adjustment')
        line_items = request.data.get('line_items', [])
        
        if not line_items:
            return Response({
                'success': False,
                'message': 'Line items are required for interim invoice'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create interim invoice
            interim_invoice = Invoice.objects.create(
                title=f"Interim Invoice - {description}",
                issue_date=timezone.now().date(),
                due_date=timezone.now().date() + timedelta(days=30),
                status='draft',
                lease=parent_invoice.lease,
                property=parent_invoice.property,
                tenant=parent_invoice.tenant,
                landlord=parent_invoice.landlord,
                created_by=request.user,
                invoice_type=invoice_type,
                parent_invoice=parent_invoice,
                tax_rate=parent_invoice.tax_rate,
                bank_info=parent_invoice.bank_info,
                notes=f"Interim invoice related to {parent_invoice.invoice_number}"
            )
            
            # Create line items
            for item_data in line_items:
                InvoiceLineItem.objects.create(
                    invoice=interim_invoice,
                    description=item_data.get('description', ''),
                    category=item_data.get('category', ''),
                    quantity=item_data.get('quantity', 1),
                    unit_price=item_data.get('unit_price', 0),
                )
            
            # Create audit log
            InvoiceAuditLog.objects.create(
                invoice=interim_invoice,
                action='created',
                user=request.user,
                details=f"Interim invoice {interim_invoice.invoice_number} created from {parent_invoice.invoice_number}"
            )
            
            # Also log on parent invoice
            InvoiceAuditLog.objects.create(
                invoice=parent_invoice,
                action='updated',
                user=request.user,
                details=f"Interim invoice {interim_invoice.invoice_number} created for adjustments"
            )
            
            serializer = InvoiceSerializer(interim_invoice)
            return Response({
                'success': True,
                'message': 'Interim invoice created successfully',
                'invoice': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Failed to create interim invoice: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """Generate and download invoice PDF"""
        from .utils import generate_invoice_pdf
        from django.http import HttpResponse
        
        invoice = self.get_object()
        
        try:
            pdf_buffer = generate_invoice_pdf(invoice)
            
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'
            
            return response
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Failed to generate PDF: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def send_bulk_reminders(self, request):
        """Send email reminders for multiple invoices"""
        from .utils import send_bulk_invoice_reminders
        
        invoice_ids = request.data.get('invoice_ids', [])
        method = request.data.get('method', 'email')
        
        if not invoice_ids:
            return Response({
                'success': False,
                'message': 'No invoice IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get invoices for the current user
        queryset = self.get_queryset()
        invoices = queryset.filter(id__in=invoice_ids)
        
        if not invoices.exists():
            return Response({
                'success': False,
                'message': 'No valid invoices found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            results = send_bulk_invoice_reminders(invoices, method=method)
            
            return Response({
                'success': True,
                'results': results,
                'message': f'Processed {len(invoices)} invoices. '
                          f'Success: {results["success"]}, Failed: {results["failed"]}'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Failed to send bulk reminders: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def audit_trail(self, request, pk=None):
        """Get audit trail for an invoice"""
        invoice = self.get_object()
        
        audit_logs = invoice.audit_logs.all()
        
        audit_data = []
        for log in audit_logs:
            audit_data.append({
                'id': log.id,
                'action': log.action,
                'action_display': log.get_action_display(),
                'user': log.user.get_full_name() if log.user else 'System',
                'timestamp': log.timestamp,
                'details': log.details,
                'field_changed': log.field_changed,
                'old_value': log.old_value,
                'new_value': log.new_value,
            })
        
        return Response({
            'invoice_number': invoice.invoice_number,
            'audit_trail': audit_data
        })

    @action(detail=True, methods=['post'])
    def admin_unlock(self, request, pk=None):
        """Admin override to unlock an invoice (with proper audit trail)"""
        if not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can unlock invoices")
        
        invoice = self.get_object()
        reason = request.data.get('reason', 'Administrative override')
        
        if not invoice.is_locked:
            return Response({
                'success': False,
                'message': 'Invoice is not locked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Unlock the invoice
        invoice.is_locked = False
        invoice.status = 'draft'  # Reset to draft for editing
        invoice.save()
        
        # Create audit log
        InvoiceAuditLog.objects.create(
            invoice=invoice,
            action='unlocked',
            user=request.user,
            details=f"Invoice {invoice.invoice_number} unlocked by admin. Reason: {reason}"
        )
        
        return Response({
            'success': True,
            'message': 'Invoice unlocked successfully',
            'status': invoice.status,
            'is_locked': invoice.is_locked
        })


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoice line items
    """
    queryset = InvoiceLineItem.objects.all()
    serializer_class = InvoiceLineItemSerializer
    permission_classes = [IsAuthenticated]


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


class InvoiceAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing invoice audit logs (read-only)
    """
    queryset = InvoiceAuditLog.objects.all()
    serializer_class = InvoiceAuditLogSerializer
    permission_classes = [IsAuthenticated]


# New Finance API endpoints for the frontend
class FinanceAPIViewSet(viewsets.ViewSet):
    """
    ViewSet for finance dashboard data
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        """Get financial summary for dashboard"""
        try:
            # Calculate total rental income (from paid invoices)
            total_rental_income = Invoice.objects.filter(
                status='paid'
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate outstanding amounts (from unpaid invoices)
            total_outstanding = Invoice.objects.filter(
                status__in=['sent', 'overdue']
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate collection rate
            total_invoiced = Invoice.objects.filter(
                status__in=['paid', 'sent', 'overdue']
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            collection_rate = 0
            if total_invoiced > 0:
                collection_rate = (total_rental_income / total_invoiced) * 100
            
            # Calculate deposits held (from security deposits)
            deposits_held = Invoice.objects.filter(
                line_items__category='Security Deposit',
                status='paid'
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate monthly revenue (current month) - from payments
            current_month = timezone.now().month
            current_year = timezone.now().year
            monthly_revenue = InvoicePayment.objects.filter(
                payment_date__month=current_month,
                payment_date__year=current_year
            ).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Calculate monthly expenses (from maintenance invoices) - simplified
            monthly_expenses = Invoice.objects.filter(
                line_items__category__in=['Maintenance', 'Repairs', 'Utilities'],
                status='paid'
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate net profit
            net_profit = monthly_revenue - monthly_expenses
            
            # Calculate cash flow (simplified)
            cash_flow = total_rental_income - total_outstanding
            
            # Calculate payments due to landlords (simplified - 10% management fee)
            payments_due_landlords = total_rental_income * Decimal('0.90')
            
            # Calculate payments due to suppliers (simplified)
            payments_due_suppliers = monthly_expenses
            
            return Response({
                'total_rental_income': float(total_rental_income),
                'total_outstanding': float(total_outstanding),
                'collection_rate': float(collection_rate),
                'deposits_held': float(deposits_held),
                'payments_due_landlords': float(payments_due_landlords),
                'payments_due_suppliers': float(payments_due_suppliers),
                'monthly_revenue': float(monthly_revenue),
                'monthly_expenses': float(monthly_expenses),
                'net_profit': float(net_profit),
                'cash_flow': float(cash_flow),
            })
        except Exception as e:
            import traceback
            print(f"Error in financial_summary: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def rental_outstanding(self, request):
        """Get outstanding rental payments"""
        try:
            outstanding_invoices = Invoice.objects.filter(
                status__in=['sent', 'overdue']
            ).select_related('tenant', 'property', 'lease')
            
            rental_outstanding = []
            for invoice in outstanding_invoices:
                # Calculate days overdue
                days_overdue = 0
                if invoice.due_date:
                    days_overdue = (timezone.now().date() - invoice.due_date).days
                
                # Determine status
                if days_overdue > 30:
                    status = 'delinquent'
                elif days_overdue > 15:
                    status = 'overdue'
                elif days_overdue > 5:
                    status = 'late'
                else:
                    status = 'current'
                
                # Get last payment date
                last_payment = InvoicePayment.objects.filter(
                    invoice=invoice
                ).order_by('-payment_date').first()
                
                last_payment_date = last_payment.payment_date if last_payment else None
                
                rental_outstanding.append({
                    'id': str(invoice.id),
                    'tenant_name': invoice.tenant.name,
                    'property_name': invoice.property.name,
                    'unit_number': 'N/A',  # Lease doesn't have unit relationship
                    'amount_due': float(invoice.total_amount),
                    'days_overdue': max(0, days_overdue),
                    'last_payment_date': last_payment_date.isoformat() if last_payment_date else None,
                    'status': status,
                })
            
            return Response(rental_outstanding)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def payments(self, request):
        """Get recent payments"""
        try:
            recent_payments = InvoicePayment.objects.filter(
                invoice__status='paid'
            ).select_related('invoice', 'invoice__tenant', 'invoice__property').order_by('-payment_date')[:20]
            
            payments = []
            for payment in recent_payments:
                payments.append({
                    'id': str(payment.id),
                    'type': 'rental',  # Simplified
                    'tenant_name': payment.invoice.tenant.name,
                    'property_name': payment.invoice.property.name,
                    'amount': float(payment.amount),
                    'date': payment.payment_date.isoformat(),
                    'status': 'completed',
                    'payment_method': payment.payment_method,
                    'reference': payment.reference_number,
                })
            
            return Response(payments)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def landlord_payments(self, request):
        """Get landlord payment data"""
        try:
            # Simplified landlord payments based on invoices
            landlord_payments = []
            
            # Group invoices by property/landlord
            properties = Property.objects.all()
            for property in properties:
                # Calculate rent collected for this property
                rent_collected = Invoice.objects.filter(
                    property=property,
                    status='paid'
                ).aggregate(
                    total=Sum('total_amount')
                )['total'] or Decimal('0.00')
                
                if rent_collected > 0:
                    # Calculate management fee (10%)
                    management_fee = rent_collected * Decimal('0.10')
                    
                    # Calculate expenses (simplified)
                    expenses = rent_collected * Decimal('0.05')
                    
                    # Calculate amount due to landlord
                    amount_due = rent_collected - management_fee - expenses
                    
                    landlord_payments.append({
                        'id': str(property.id),
                        'landlord_name': f"{property.name} Owner",  # Simplified
                        'property_name': property.name,
                        'amount_due': float(amount_due),
                        'due_date': (timezone.now().date() + timedelta(days=30)).isoformat(),
                        'status': 'pending',
                        'rent_collected': float(rent_collected),
                        'management_fee': float(management_fee),
                        'expenses': float(expenses),
                        'contact_email': 'landlord@example.com',  # Placeholder
                        'contact_phone': '(555) 123-4567',  # Placeholder
                    })
            
            return Response(landlord_payments)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def supplier_payments(self, request):
        """Get supplier payment data"""
        try:
            # Simplified supplier payments based on maintenance invoices
            supplier_payments = []
            
            # Get maintenance-related invoices
            maintenance_invoices = Invoice.objects.filter(
                line_items__category__in=['Maintenance', 'Repairs', 'Utilities'],
                status__in=['sent', 'overdue']
            ).distinct()
            
            for invoice in maintenance_invoices:
                for line_item in invoice.line_items.filter(
                    category__in=['Maintenance', 'Repairs', 'Utilities']
                ):
                    supplier_payments.append({
                        'id': f"{invoice.id}_{line_item.id}",
                        'supplier_name': f"{line_item.category} Supplier",
                        'description': line_item.description,
                        'amount': float(line_item.total),
                        'due_date': invoice.due_date.isoformat(),
                        'status': invoice.status,
                        'category': line_item.category,
                        'invoice_number': invoice.invoice_number,
                        'contact_person': 'Supplier Contact',
                        'contact_phone': '(555) 987-6543',
                    })
            
            return Response(supplier_payments)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def bank_transactions(self, request):
        """Get bank transaction data"""
        try:
            # Simplified bank transactions based on invoice payments
            bank_transactions = []
            
            payments = InvoicePayment.objects.all().order_by('-payment_date')[:50]
            balance = Decimal('0.00')
            
            for payment in payments:
                # Calculate running balance
                balance += payment.amount
                
                bank_transactions.append({
                    'id': str(payment.id),
                    'date': payment.payment_date.isoformat(),
                    'description': f"Payment - {payment.invoice.tenant.name}",
                    'amount': float(payment.amount),
                    'type': 'credit',
                    'category': 'Rental Income',
                    'balance': float(balance),
                    'reference': payment.reference_number or f"TXN{payment.id}",
                    'reconciled': True,
                })
            
            return Response(bank_transactions)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
