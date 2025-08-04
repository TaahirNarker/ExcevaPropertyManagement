from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Sum, Case, When, IntegerField
from django.utils import timezone
from datetime import datetime, timedelta
from properties.models import Property
from tenants.models import Tenant
from leases.models import Lease
from finance.models import Invoice
from payments.models import StripeInvoice, PaymentTransaction
from landlords.models import Landlord


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_metrics(request):
    """
    Get dashboard metrics for the property management system
    Optimized with bulk queries and annotations
    """
    try:
        # Get current date and calculate date ranges
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        # Bulk query for invoices with annotations
        invoices_data = Invoice.objects.aggregate(
            total_due=Count('id', filter=Q(due_date__gte=now, status__in=['sent', 'pending'])),
            sent_count=Count('id', filter=Q(due_date__gte=now, status='sent')),
            pending_count=Count('id', filter=Q(due_date__gte=now, status='pending')),
            current_period_count=Count('id', filter=Q(
                due_date__gte=current_month_start,
                due_date__lte=current_month_end,
                status__in=['sent', 'pending']
            )),
            dismissed_count=Count('id', filter=Q(status='cancelled')),
            bills_due_count=Count('id', filter=Q(due_date__gte=now, invoice_type='bill')),
            fees_due_count=Count('id', filter=Q(due_date__gte=now, invoice_type='fee'))
        )
        
        # Bulk query for leases with annotations
        leases_data = Lease.objects.aggregate(
            total_leases=Count('id'),
            active_leases=Count('id', filter=Q(status='active')),
            expired_leases=Count('id', filter=Q(end_date__lt=now, status='active')),
            renewals_90_days=Count('id', filter=Q(
                end_date__gte=now,
                end_date__lte=now + timedelta(days=90),
                status='active'
            )),
            renewals_60_days=Count('id', filter=Q(
                end_date__gte=now,
                end_date__lte=now + timedelta(days=60),
                status='active'
            )),
            renewals_30_days=Count('id', filter=Q(
                end_date__gte=now,
                end_date__lte=now + timedelta(days=30),
                status='active'
            )),
            deposits_due=Count('id', filter=Q(status='active', deposit_amount__gt=0)),
            without_deposit=Count('id', filter=Q(status='active', deposit_amount=0))
        )
        
        # Bulk query for properties
        properties_data = Property.objects.filter(is_active=True).aggregate(
            total_properties=Count('id'),
            occupied_properties=Count('id', filter=Q(leases__status='active'), distinct=True)
        )
        
        # Bulk query for payments
        payments_data = PaymentTransaction.objects.filter(
            created_at__gte=current_month_start,
            created_at__lte=current_month_end
        ).aggregate(
            total_payments=Count('id'),
            confirmed_payments=Count('id', filter=Q(status='confirmed'))
        )
        
        # Bulk query for pending invoices
        pending_invoices_count = StripeInvoice.objects.filter(
            status='pending',
            expires_at__gte=now
        ).count()
        
        # Calculate derived values
        properties_data['vacant_properties'] = properties_data['total_properties'] - properties_data['occupied_properties']
        rent_outstanding = leases_data['active_leases'] - payments_data['confirmed_payments']
        
        # Build metrics response
        metrics = {
            'invoicesDue': {
                'count': invoices_data['total_due'],
                'breakdown': {
                    'sent': invoices_data['sent_count'],
                    'readyToSend': invoices_data['pending_count'],
                    'currentPeriod': invoices_data['current_period_count'],
                    'dismissed': invoices_data['dismissed_count']
                }
            },
            'rentDue': {
                'count': leases_data['active_leases'],
                'breakdown': {
                    'collected': payments_data['confirmed_payments'],
                    'outstanding': max(0, rent_outstanding)
                }
            },
            'billsDue': {
                'count': invoices_data['bills_due_count'],
                'breakdown': {
                    'toVendors': invoices_data['bills_due_count'],
                    'withCashflow': invoices_data['bills_due_count']
                }
            },
            'feesDue': {
                'count': invoices_data['fees_due_count'],
                'breakdown': {
                    'dueToYou': invoices_data['fees_due_count'],
                    'withCashflow': invoices_data['fees_due_count']
                }
            },
            'payments': {
                'count': payments_data['total_payments'],
                'breakdown': {
                    'landlords': payments_data['total_payments'],
                    'paymentDue': pending_invoices_count
                }
            },
            'properties': {
                'count': properties_data['total_properties'],
                'breakdown': {
                    'occupied': properties_data['occupied_properties'],
                    'vacant': properties_data['vacant_properties']
                }
            },
            'leases': {
                'count': leases_data['total_leases'],
                'breakdown': {
                    'active': leases_data['active_leases'],
                    'expired': leases_data['expired_leases']
                }
            },
            'renewals': {
                'count': leases_data['renewals_90_days'],
                'breakdown': {
                    'dueIn': leases_data['renewals_90_days'],
                    'days90': leases_data['renewals_90_days'],
                    'days60': leases_data['renewals_60_days'],
                    'days30': leases_data['renewals_30_days']
                }
            },
            'depositsDue': {
                'count': leases_data['deposits_due'],
                'breakdown': {
                    'partialHeld': 0,  # Would need more complex logic
                    'withoutDeposit': leases_data['without_deposit']
                }
            },
            'depositsHeld': {
                'count': leases_data['deposits_due'],
                'breakdown': {
                    'byLandlord': leases_data['deposits_due'],
                    'byAgent': 0
                }
            }
        }
        
        return Response(metrics, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch dashboard metrics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
