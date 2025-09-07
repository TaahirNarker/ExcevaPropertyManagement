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

from .models import (
    Invoice, InvoiceLineItem, InvoiceTemplate, InvoicePayment, InvoiceAuditLog,
    TenantCreditBalance, RecurringCharge, RentEscalationLog, InvoiceDraft, SystemSettings,
    # Payment reconciliation models
    BankTransaction, ManualPayment, PaymentAllocation
)
from .serializers import (
    InvoiceSerializer, InvoiceCreateUpdateSerializer, InvoiceListSerializer,
    InvoiceTemplateSerializer, InvoicePaymentSerializer, InvoiceSummarySerializer,
    InvoiceDetailSerializer, InvoiceLineItemSerializer, InvoiceAuditLogSerializer,
    TenantCreditBalanceSerializer, RecurringChargeSerializer, RentEscalationLogSerializer,
    InvoiceDraftSerializer, PaymentAllocationSerializer, InvoiceNavigationSerializer, SystemSettingsSerializer,
    # Payment reconciliation serializers
    CSVImportRequestSerializer, ManualPaymentRequestSerializer, PaymentAllocationRequestSerializer,
    AdjustmentRequestSerializer, BankTransactionSerializer, ManualPaymentSerializer, UnderpaymentAlertSerializer
)
from .services import (
    InvoiceGenerationService, PaymentAllocationService, RentEscalationService,
    # Payment reconciliation service
    PaymentReconciliationService
)
from tenants.models import Tenant
from leases.models import Lease
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

    def create(self, request, *args, **kwargs):
        """
        Override create to surface validation errors in logs and return explicit messages.
        This greatly helps diagnosing 400 errors from the frontend.
        """
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Log detailed errors to server log
            try:
                print("[InvoiceViewSet.create] Validation errors:", serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = {"Location": str(serializer.instance.id)}
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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
    
    @action(detail=False, methods=['post'], url_path='navigate-month')
    def navigate_month(self, request):
        """
        Navigate to a specific month for invoice creation/editing.
        Supports the existing frontend month navigation arrows.
        """
        serializer = InvoiceNavigationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        lease_id = serializer.validated_data['lease_id']
        billing_month = serializer.validated_data['billing_month']
        
        try:
            lease = Lease.objects.get(id=lease_id)
        except Lease.DoesNotExist:
            return Response({'error': 'Lease not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has permission to access this lease
        if not request.user.is_staff and lease.created_by != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        invoice_service = InvoiceGenerationService()
        
        # Check if invoice already exists for this month
        existing_invoice = Invoice.objects.filter(
            lease=lease,
            billing_period_start__year=billing_month.year,
            billing_period_start__month=billing_month.month
        ).first()
        
        if existing_invoice:
            # Return existing invoice
            serializer = InvoiceDetailSerializer(existing_invoice)
            return Response({
                'has_invoice': True,
                'invoice': serializer.data,
                'is_draft': False
            })
        
        # Get or create draft for future months
        invoice_data = invoice_service.get_or_create_invoice_draft(lease, billing_month)
        
        return Response({
            'has_invoice': False,
            'invoice_data': invoice_data,
            'is_draft': True,
            'billing_month': billing_month.strftime('%Y-%m-%d')
        })
    
    @action(detail=False, methods=['post'], url_path='save-draft')
    def save_draft(self, request):
        """
        Save user modifications to an invoice draft.
        """
        lease_id = request.data.get('lease_id')
        billing_month_str = request.data.get('billing_month')
        invoice_data = request.data.get('invoice_data')
        
        if not all([lease_id, billing_month_str, invoice_data]):
            return Response({
                'error': 'lease_id, billing_month, and invoice_data are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lease = Lease.objects.get(id=lease_id)
            billing_month = datetime.strptime(billing_month_str, '%Y-%m-%d').date()
        except (Lease.DoesNotExist, ValueError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions
        if not request.user.is_staff and lease.created_by != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        invoice_service = InvoiceGenerationService()
        draft = invoice_service.save_invoice_draft(lease, billing_month, invoice_data, request.user)
        
        serializer = InvoiceDraftSerializer(draft)
        return Response({
            'success': True,
            'draft': serializer.data,
            'message': 'Draft saved successfully'
        })
    
    @action(detail=False, methods=['post'], url_path='generate-initial')
    def generate_initial_invoice(self, request):
        """
        Generate initial invoice when a lease is created.
        """
        lease_id = request.data.get('lease_id')
        
        if not lease_id:
            return Response({'error': 'lease_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lease = Lease.objects.get(id=lease_id)
        except Lease.DoesNotExist:
            return Response({'error': 'Lease not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if initial invoice already exists
        existing_invoice = Invoice.objects.filter(
            lease=lease,
            invoice_type='regular'
        ).first()
        
        if existing_invoice:
            return Response({
                'error': 'Initial invoice already exists for this lease',
                'invoice_id': existing_invoice.id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        invoice_service = InvoiceGenerationService()
        invoice = invoice_service.generate_initial_lease_invoice(lease, request.user)
        
        serializer = InvoiceDetailSerializer(invoice)
        return Response({
            'success': True,
            'invoice': serializer.data,
            'message': 'Initial invoice generated successfully'
        })
    
    @action(detail=True, methods=['post'], url_path='send')
    def send_invoice(self, request, pk=None):
        """
        Send an invoice (locks it and updates status).
        """
        invoice = self.get_object()
        
        if invoice.status != 'draft':
            return Response({
                'error': f'Cannot send invoice with status: {invoice.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if invoice.is_locked:
            return Response({
                'error': 'Invoice is already locked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update invoice status and lock it
        invoice.status = 'sent'
        invoice.issue_date = timezone.now().date()
        invoice.sent_at = timezone.now()
        invoice.sent_by = request.user
        invoice.lock_invoice(request.user)
        
        serializer = InvoiceDetailSerializer(invoice)
        return Response({
            'success': True,
            'invoice': serializer.data,
            'message': 'Invoice sent successfully'
        })

    @action(detail=True, methods=['post'], url_path='send_invoice')
    def send_invoice_legacy(self, request, pk=None):
        """
        Backward-compatible alias for older clients hitting /send_invoice/.
        Delegates to the canonical send endpoint logic above.
        """
        return self.send_invoice(request, pk=pk)


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


class ManualPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only access to manual payments. Supports filtering by lease and status.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ManualPaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['lease', 'status', 'payment_method']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

    def get_queryset(self):
        user = self.request.user
        qs = ManualPayment.objects.select_related('lease__tenant', 'lease__property')

        if user.is_staff:
            return qs

        # Default: show payments for leases created by the user
        return qs.filter(lease__created_by=user)

    @action(detail=False, methods=['get'])
    def by_lease(self, request):
        lease_id = request.query_params.get('lease_id') or request.query_params.get('lease')
        if not lease_id:
            return Response({'error': 'lease_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payments = self.get_queryset().filter(lease_id=lease_id)
            serializer = self.get_serializer(payments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class InvoiceAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing invoice audit logs (read-only)
    """
    queryset = InvoiceAuditLog.objects.all()
    serializer_class = InvoiceAuditLogSerializer
    permission_classes = [IsAuthenticated]


# New Finance API endpoints for the frontend
class FinanceAPIViewSet(viewsets.GenericViewSet):
    """
    ViewSet for finance dashboard data
    """
    # Temporarily allow all access for development
    # TODO: Restore authentication in production
    permission_classes = []
    
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
        """Get bank transactions for reconciliation"""
        try:
            # Get query parameters
            transaction_status = request.query_params.get('status', 'pending')
            bank_name = request.query_params.get('bank_name', '')
            date_from = request.query_params.get('date_from', '')
            date_to = request.query_params.get('date_to', '')
            
            # Build query
            queryset = BankTransaction.objects.all()
            
            if transaction_status:
                queryset = queryset.filter(status=transaction_status)
            if bank_name:
                queryset = queryset.filter(bank_name__icontains=bank_name)
            if date_from:
                queryset = queryset.filter(transaction_date__gte=date_from)
            if date_to:
                queryset = queryset.filter(transaction_date__lte=date_to)
            
            # Paginate results
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = BankTransactionSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = BankTransactionSerializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def lease_financials(self, request):
        """Get comprehensive financial data for a specific lease"""
        # Temporarily allow unauthenticated access for development
        # TODO: Remove this in production
        try:
            lease_id = request.query_params.get('lease_id')
            if not lease_id:
                return Response(
                    {'error': 'lease_id parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get lease
            try:
                lease = Lease.objects.get(id=lease_id)
            except Lease.DoesNotExist:
                return Response(
                    {'error': 'Lease not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get all invoices for this lease
            invoices = Invoice.objects.filter(lease=lease).select_related(
                'tenant', 'property'
            ).prefetch_related('line_items', 'payments', 'adjustments')
            
            # Calculate financial summary
            total_invoiced = invoices.aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            total_paid = invoices.aggregate(
                total=Sum('amount_paid')
            )['total'] or Decimal('0.00')
            
            total_outstanding = invoices.aggregate(
                total=Sum('balance_due')
            )['total'] or Decimal('0.00')
            
            # Get overdue invoices
            overdue_invoices = invoices.filter(
                status='overdue',
                balance_due__gt=0
            )
            
            # Get recent payments
            recent_payments = InvoicePayment.objects.filter(
                invoice__lease=lease
            ).select_related('invoice').order_by('-payment_date')[:10]
            
            # Get recurring charges
            recurring_charges = RecurringCharge.objects.filter(
                lease=lease,
                is_active=True
            )
            
            # Get rent escalation history
            rent_escalations = RentEscalationLog.objects.filter(
                lease=lease
            ).order_by('-effective_date')
            
            # Get invoice history with detailed breakdown
            invoice_history = []
            for invoice in invoices.order_by('-issue_date'):
                invoice_data = {
                    'id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'issue_date': invoice.issue_date,
                    'due_date': invoice.due_date,
                    'status': invoice.status,
                    'total_amount': float(invoice.total_amount),
                    'amount_paid': float(invoice.amount_paid),
                    'balance_due': float(invoice.balance_due),
                    'billing_period_start': invoice.billing_period_start,
                    'billing_period_end': invoice.billing_period_end,
                    'is_overdue': invoice.is_overdue(),
                    'days_overdue': invoice.days_overdue() if invoice.is_overdue() else 0,
                    'line_items': [
                        {
                            'description': item.description,
                            'category': item.category,
                            'quantity': float(item.quantity),
                            'unit_price': float(item.unit_price),
                            'total': float(item.total)
                        }
                        for item in invoice.line_items.all()
                    ],
                    'payments': [
                        {
                            'amount': float(payment.amount),
                            'payment_date': payment.payment_date,
                            'payment_method': payment.payment_method,
                            'reference_number': payment.reference_number
                        }
                        for payment in invoice.payments.all()
                    ],
                    'adjustments': [
                        {
                            'type': adj.adjustment_type,
                            'amount': float(adj.amount),
                            'reason': adj.reason,
                            'effective_date': adj.effective_date
                        }
                        for adj in invoice.adjustments.all()
                    ]
                }
                invoice_history.append(invoice_data)
            
            # Get payment summary by month
            payment_summary = {}
            for payment in InvoicePayment.objects.filter(invoice__lease=lease):
                month_key = payment.payment_date.strftime('%Y-%m')
                if month_key not in payment_summary:
                    payment_summary[month_key] = {
                        'month': month_key,
                        'total_payments': Decimal('0.00'),
                        'payment_count': 0
                    }
                payment_summary[month_key]['total_payments'] += payment.amount
                payment_summary[month_key]['payment_count'] += 1
            
            # Convert to list and sort by month
            payment_summary = sorted(
                payment_summary.values(), 
                key=lambda x: x['month'], 
                reverse=True
            )
            
            # Convert Decimal values to float for JSON serialization
            for month_data in payment_summary:
                month_data['total_payments'] = float(month_data['total_payments'])
            
            # Get tenant credit balance
            try:
                credit_balance = TenantCreditBalance.objects.get(tenant=lease.tenant)
                tenant_credit = float(credit_balance.balance)
            except TenantCreditBalance.DoesNotExist:
                tenant_credit = 0.00
            
            # Calculate collection rate for this lease
            collection_rate = 0
            if total_invoiced > 0:
                collection_rate = (total_paid / total_invoiced) * 100
            
            return Response({
                'lease_info': {
                    'id': lease.id,
                    'monthly_rent': float(lease.monthly_rent),
                    'deposit_amount': float(lease.deposit_amount),
                    'rental_frequency': lease.rental_frequency,
                    'rent_due_day': lease.rent_due_day,
                    'late_fee_type': lease.late_fee_type,
                    'late_fee_percentage': float(lease.late_fee_percentage) if lease.late_fee_percentage else 0,
                    'late_fee_amount': float(lease.late_fee_amount) if lease.late_fee_amount else 0,
                    'grace_period_days': lease.grace_period_days,
                    'management_fee': float(lease.management_fee) if lease.management_fee else 0,
                    'procurement_fee': float(lease.procurement_fee) if lease.procurement_fee else 0,
                },
                'financial_summary': {
                    'total_invoiced': float(total_invoiced),
                    'total_paid': float(total_paid),
                    'total_outstanding': float(total_outstanding),
                    'collection_rate': float(collection_rate),
                    'tenant_credit_balance': tenant_credit,
                    'overdue_invoices_count': overdue_invoices.count(),
                    'total_overdue_amount': float(overdue_invoices.aggregate(
                        total=Sum('balance_due')
                    )['total'] or Decimal('0.00'))
                },
                'invoice_history': invoice_history,
                'payment_summary': payment_summary,
                'recurring_charges': [
                    {
                        'id': charge.id,
                        'description': charge.description,
                        'category': charge.category,
                        'amount': float(charge.amount)
                    }
                    for charge in recurring_charges
                ],
                'rent_escalations': [
                    {
                        'id': esc.id,
                        'previous_rent': float(esc.previous_rent),
                        'new_rent': float(esc.new_rent),
                        'escalation_percentage': float(esc.escalation_percentage) if esc.escalation_percentage else 0,
                        'escalation_amount': float(esc.escalation_amount) if esc.escalation_amount else 0,
                        'effective_date': esc.effective_date,
                        'reason': esc.reason
                    }
                    for esc in rent_escalations
                ],
                'recent_payments': [
                    {
                        'id': payment.id,
                        'amount': float(payment.amount),
                        'payment_date': payment.payment_date,
                        'payment_method': payment.payment_method,
                        'reference_number': payment.reference_number,
                        'invoice_number': payment.invoice.invoice_number
                    }
                    for payment in recent_payments
                ]
            })
            
        except Exception as e:
            import traceback
            print(f"Error in lease_financials: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentAllocationViewSet(viewsets.ViewSet):
    """
    ViewSet for handling payment allocation across invoices
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='allocate')
    def allocate_payment(self, request):
        """
        Allocate a payment across multiple invoices
        """
        serializer = PaymentAllocationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            tenant = Tenant.objects.get(id=data['tenant_id'])
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get invoices to allocate payment to
        invoice_allocations = data.get('invoice_allocations', [])
        invoices = []
        
        if invoice_allocations:
            # Manual allocation
            for allocation in invoice_allocations:
                invoice_id = allocation.get('invoice_id')
                try:
                    invoice = Invoice.objects.get(id=invoice_id, tenant=tenant)
                    invoices.append(invoice)
                except Invoice.DoesNotExist:
                    return Response({
                        'error': f'Invoice {invoice_id} not found for this tenant'
                    }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Auto-allocation to oldest unpaid invoices
            invoices = Invoice.objects.filter(
                tenant=tenant,
                balance_due__gt=0
            ).order_by('due_date')
        
        # Allocate payment
        payment_service = PaymentAllocationService()
        payment_records = payment_service.allocate_payment(
            tenant=tenant,
            amount=data['amount'],
            invoices=invoices,
            payment_method=data['payment_method'],
            reference_number=data.get('reference_number', ''),
            payment_date=data['payment_date'],
            user=request.user,
            notes=data.get('notes', '')
        )
        
        # Return payment records
        serializer = InvoicePaymentSerializer(payment_records, many=True)
        return Response({
            'success': True,
            'payments': serializer.data,
            'message': f'Payment of R{data["amount"]} allocated successfully'
        })
    
    @action(detail=False, methods=['get'], url_path='credit-balance/(?P<tenant_id>[^/.]+)')
    def get_credit_balance(self, request, tenant_id=None):
        """
        Get tenant's current credit balance
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)
        
        payment_service = PaymentAllocationService()
        balance = payment_service.get_tenant_credit_balance(tenant)
        
        return Response({
            'tenant_id': tenant.id,
            'tenant_name': f"{tenant.user.first_name} {tenant.user.last_name}".strip() or tenant.user.username,
            'credit_balance': float(balance)
        })
    
    @action(detail=False, methods=['post'], url_path='apply-credit')
    def apply_credit_balance(self, request):
        """
        Apply tenant credit balance to an invoice
        """
        tenant_id = request.data.get('tenant_id')
        invoice_id = request.data.get('invoice_id')
        amount = request.data.get('amount')
        
        if not all([tenant_id, invoice_id, amount]):
            return Response({
                'error': 'tenant_id, invoice_id, and amount are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            invoice = Invoice.objects.get(id=invoice_id, tenant=tenant)
            amount = Decimal(str(amount))
        except (Tenant.DoesNotExist, Invoice.DoesNotExist, ValueError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            credit_balance = tenant.credit_balance
            payment = credit_balance.apply_credit_to_invoice(invoice, amount, request.user)
            
            serializer = InvoicePaymentSerializer(payment)
            return Response({
                'success': True,
                'payment': serializer.data,
                'remaining_credit': float(credit_balance.balance),
                'message': f'Credit of R{amount} applied to invoice'
            })
        except (TenantCreditBalance.DoesNotExist, ValueError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RecurringChargeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing recurring charges
    """
    queryset = RecurringCharge.objects.all()
    serializer_class = RecurringChargeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['lease', 'category', 'is_active']
    search_fields = ['description', 'lease__lease_code']
    ordering_fields = ['amount', 'created_at']
    ordering = ['-created_at']


class RentEscalationViewSet(viewsets.ViewSet):
    """
    ViewSet for handling rent escalations
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='process-due')
    def process_due_escalations(self, request):
        """
        Process all due rent escalations
        """
        escalation_service = RentEscalationService()
        escalated_leases = escalation_service.process_due_escalations(request.user)
        
        return Response({
            'success': True,
            'escalated_count': len(escalated_leases),
            'escalated_leases': [
                {
                    'lease_id': lease.id,
                    'lease_code': lease.lease_code if hasattr(lease, 'lease_code') else f"L-{lease.id}",
                    'property_name': lease.property.name,
                    'tenant_name': lease.tenant.name,
                    'new_rent': float(lease.monthly_rent)
                }
                for lease in escalated_leases
            ],
            'message': f'{len(escalated_leases)} rent escalations processed'
        })
    
    @action(detail=False, methods=['get'], url_path='history/(?P<lease_id>[^/.]+)')
    def get_rent_history(self, request, lease_id=None):
        """
        Get rent escalation history for a lease
        """
        try:
            lease = Lease.objects.get(id=lease_id)
        except Lease.DoesNotExist:
            return Response({'error': 'Lease not found'}, status=status.HTTP_404_NOT_FOUND)
        
        escalation_service = RentEscalationService()
        history = escalation_service.get_rent_history(lease)
        
        return Response({
            'lease_id': lease.id,
            'current_rent': float(lease.monthly_rent),
            'escalation_history': history
        })


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing system settings
    """
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['setting_type', 'key']
    
    def get_queryset(self):
        """Only staff can access system settings"""
        if not self.request.user.is_staff:
            return SystemSettings.objects.none()
        return SystemSettings.objects.all()
    
    @action(detail=False, methods=['get'], url_path='vat-rate')
    def get_vat_rate(self, request):
        """
        Get current VAT rate
        """
        vat_rate = SystemSettings.get_vat_rate()
        return Response({
            'vat_rate': vat_rate,
            'formatted': f'{vat_rate}%'
        })

# New Payment API Views
class PaymentReconciliationViewSet(viewsets.ViewSet):
    """
    ViewSet for payment reconciliation operations
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        """
        Import bank CSV for automatic payment reconciliation
        """
        try:
            serializer = CSVImportRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=400)
            
            # Get CSV file and bank name
            csv_file = request.FILES.get('csv_file')
            bank_name = serializer.validated_data['bank_name']
            
            if not csv_file:
                return Response({
                    'success': False,
                    'error': 'CSV file is required'
                }, status=400)
            
            # Import CSV using service
            service = PaymentReconciliationService()
            result = service.import_bank_csv(csv_file, bank_name, request.user)
            
            if result['success']:
                return Response(result, status=200)
            else:
                return Response(result, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'CSV import failed: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['post'], url_path='manual-payment')
    def record_manual_payment(self, request):
        """
        Record manual payment entry
        """
        try:
            serializer = ManualPaymentRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=400)
            
            # Record payment using service
            service = PaymentReconciliationService()
            result = service.record_manual_payment(
                serializer.validated_data, 
                request.user
            )
            
            if result['success']:
                return Response(result, status=201)
            else:
                return Response(result, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Payment recording failed: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['post'], url_path='allocate-payment')
    def allocate_payment(self, request):
        """
        Manually allocate payment across invoices
        """
        try:
            serializer = PaymentAllocationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=400)
            
            # Allocate payment using service
            service = PaymentReconciliationService()
            result = service.allocate_payment_manually(
                serializer.validated_data, 
                request.user
            )
            
            if result['success']:
                return Response(result, status=200)
            else:
                return Response(result, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Payment allocation failed: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['post'], url_path='create-adjustment')
    def create_adjustment(self, request):
        """
        Create manual adjustment/waiver
        """
        try:
            serializer = AdjustmentRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=400)
            
            # Create adjustment using service
            service = PaymentReconciliationService()
            result = service.create_adjustment(
                serializer.validated_data, 
                request.user
            )
            
            if result['success']:
                return Response(result, status=201)
            else:
                return Response(result, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Adjustment creation failed: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['get'], url_path='tenant-statement/(?P<tenant_id>[^/.]+)')
    def get_tenant_statement(self, request, tenant_id=None):
        """
        Get comprehensive tenant statement
        """
        try:
            # Validate tenant ID
            try:
                tenant_id = int(tenant_id)
            except ValueError:
                return Response({
                    'success': False,
                    'error': 'Invalid tenant ID'
                }, status=400)
            
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Parse dates if provided
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'success': False,
                        'error': 'Invalid start_date format. Use YYYY-MM-DD'
                    }, status=400)
            
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'success': False,
                        'error': 'Invalid end_date format. Use YYYY-MM-DD'
                    }, status=400)
            
            # Get statement using service
            service = PaymentReconciliationService()
            result = service.get_tenant_statement(tenant_id, start_date, end_date)
            
            if result['success']:
                return Response(result, status=200)
            else:
                return Response(result, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Statement generation failed: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['get'], url_path='unmatched-payments')
    def get_unmatched_payments(self, request):
        """
        Get payments requiring manual allocation
        """
        try:
            # Get unmatched bank transactions
            unmatched_transactions = BankTransaction.objects.filter(
                status='manual_review'
            ).select_related('matched_lease__tenant', 'matched_lease__property')
            
            # Get pending manual payments
            pending_payments = ManualPayment.objects.filter(
                status='pending'
            ).select_related('lease__tenant', 'lease__property')
            
            # Serialize data
            transaction_serializer = BankTransactionSerializer(unmatched_transactions, many=True)
            payment_serializer = ManualPaymentSerializer(pending_payments, many=True)
            
            return Response({
                'success': True,
                'unmatched_transactions': transaction_serializer.data,
                'pending_payments': payment_serializer.data,
                'total_unmatched': unmatched_transactions.count() + pending_payments.count()
            }, status=200)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch unmatched payments: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['get'], url_path='payment-status/(?P<payment_id>[^/.]+)')
    def get_payment_status(self, request, payment_id=None):
        """
        Get payment reconciliation status and allocation details
        """
        try:
            # Validate payment ID
            try:
                payment_id = int(payment_id)
            except ValueError:
                return Response({
                    'success': False,
                    'error': 'Invalid payment ID'
                }, status=400)
            
            # Try to find payment in different sources
            payment = None
            payment_type = None
            
            # Check manual payments
            try:
                payment = ManualPayment.objects.get(id=payment_id)
                payment_type = 'manual_payment'
            except ManualPayment.DoesNotExist:
                pass
            
            # Check bank transactions
            if not payment:
                try:
                    payment = BankTransaction.objects.get(id=payment_id)
                    payment_type = 'bank_transaction'
                except BankTransaction.DoesNotExist:
                    pass
            
            if not payment:
                return Response({
                    'success': False,
                    'error': 'Payment not found'
                }, status=404)
            
            # Get allocation details
            if payment_type == 'manual_payment':
                allocations = PaymentAllocation.objects.filter(
                    payment=payment
                ).select_related('invoice')
                serializer = ManualPaymentSerializer(payment)
            else:
                allocations = PaymentAllocation.objects.filter(
                    bank_transaction=payment
                ).select_related('invoice')
                serializer = BankTransactionSerializer(payment)
            
            allocation_serializer = PaymentAllocationSerializer(allocations, many=True)
            
            return Response({
                'success': True,
                'payment': serializer.data,
                'payment_type': payment_type,
                'allocations': allocation_serializer.data,
                'total_allocated': sum(alloc.allocated_amount for alloc in allocations),
                'allocation_count': allocations.count()
            }, status=200)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch payment status: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['get'], url_path='underpayment-alerts')
    def underpayment_alerts(self, request):
        """
        List active underpayment alerts for internal notification center.
        """
        try:
            alerts = UnderpaymentAlert.objects.filter(status='active').select_related('tenant', 'invoice')
            serializer = UnderpaymentAlertSerializer(alerts, many=True)
            return Response({
                'success': True,
                'count': alerts.count(),
                'alerts': serializer.data
            }, status=200)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch underpayment alerts: {str(e)}'
            }, status=500)
