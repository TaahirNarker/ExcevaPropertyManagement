from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum, Q

from .models import Debtor, DebtDocument, DebtAuditLog, DebtPayment
from .serializers import (
    DebtorSerializer, DebtorListSerializer, DebtorDetailSerializer,
    DebtDocumentSerializer, DebtAuditLogSerializer, DebtPaymentSerializer
)


class DebtorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing debtors
    """
    queryset = Debtor.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'assigned_to']
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'total_debt', 'created_at', 'last_contact']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DebtorListSerializer
        elif self.action == 'retrieve':
            return DebtorDetailSerializer
        return DebtorSerializer
    
    def perform_create(self, serializer):
        debtor = serializer.save()
        # Create audit log entry
        DebtAuditLog.objects.create(
            debtor=debtor,
            action='created',
            description=f'Debt case created for {debtor.name} with amount ${debtor.total_debt}',
            performed_by=self.request.user
        )
    
    def perform_update(self, serializer):
        old_status = self.get_object().status
        debtor = serializer.save()
        new_status = debtor.status
        
        # Create audit log entry for status changes
        if old_status != new_status:
            DebtAuditLog.objects.create(
                debtor=debtor,
                action='status_changed',
                description=f'Status changed from {old_status} to {new_status}',
                performed_by=self.request.user,
                details={'old_status': old_status, 'new_status': new_status}
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update debtor status and create audit log"""
        debtor = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Debtor.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = debtor.status
        debtor.status = new_status
        debtor.save()
        
        # Create audit log entry
        DebtAuditLog.objects.create(
            debtor=debtor,
            action='status_changed',
            description=f'Status changed from {old_status} to {new_status}',
            performed_by=request.user,
            details={'old_status': old_status, 'new_status': new_status}
        )
        
        return Response({'status': 'updated'})
    
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Add a note to the debtor and create audit log"""
        debtor = self.get_object()
        note = request.data.get('note')
        
        if not note:
            return Response(
                {'error': 'Note is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update debtor notes
        current_notes = debtor.notes or ''
        debtor.notes = f"{current_notes}\n\n{timezone.now().strftime('%Y-%m-%d %H:%M')}: {note}"
        debtor.save()
        
        # Create audit log entry
        DebtAuditLog.objects.create(
            debtor=debtor,
            action='note_added',
            description=f'Note added: {note[:100]}{"..." if len(note) > 100 else ""}',
            performed_by=request.user,
            details={'note': note}
        )
        
        return Response({'status': 'note_added'})
    
    @action(detail=True, methods=['post'])
    def record_contact(self, request, pk=None):
        """Record contact with debtor"""
        debtor = self.get_object()
        contact_type = request.data.get('contact_type', 'general')
        notes = request.data.get('notes', '')
        
        # Update last contact
        debtor.last_contact = timezone.now()
        debtor.save()
        
        # Create audit log entry
        DebtAuditLog.objects.create(
            debtor=debtor,
            action='contacted',
            description=f'Contact made via {contact_type}: {notes}',
            performed_by=request.user,
            details={'contact_type': contact_type, 'notes': notes}
        )
        
        return Response({'status': 'contact_recorded'})
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get debt management statistics"""
        total_debt = Debtor.objects.aggregate(
            total=Sum('total_debt')
        )['total'] or 0
        
        status_counts = {}
        for status_choice in Debtor.STATUS_CHOICES:
            status_counts[status_choice[0]] = Debtor.objects.filter(
                status=status_choice[0]
            ).count()
        
        total_debtors = Debtor.objects.count()
        
        return Response({
            'total_debt': float(total_debt),
            'total_debtors': total_debtors,
            'status_counts': status_counts
        })


class DebtDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing debt documents
    """
    queryset = DebtDocument.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = DebtDocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['debtor', 'document_type']
    
    def perform_create(self, serializer):
        document = serializer.save()
        # Create audit log entry
        DebtAuditLog.objects.create(
            debtor=document.debtor,
            action='document_uploaded',
            description=f'Document uploaded: {document.name}',
            performed_by=self.request.user,
            details={'document_name': document.name, 'document_type': document.document_type}
        )


class DebtPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing debt payments
    """
    queryset = DebtPayment.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = DebtPaymentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['debtor', 'payment_method']
    
    def perform_create(self, serializer):
        payment = serializer.save()
        # Create audit log entry
        DebtAuditLog.objects.create(
            debtor=payment.debtor,
            action='payment_received',
            description=f'Payment received: ${payment.amount} via {payment.payment_method}',
            performed_by=self.request.user,
            details={
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number
            }
        )


class DebtAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing debt audit logs (read-only)
    """
    queryset = DebtAuditLog.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = DebtAuditLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['debtor', 'action']
    ordering = ['-timestamp'] 