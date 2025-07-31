"""
Bitcoin Lightning Payment API Views
Handles invoice creation, quote generation, and payment processing
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
import json
import logging
from decimal import Decimal
from django.utils import timezone

from tenants.models import Tenant
from .models import StripeInvoice, LightningQuote, PaymentTransaction
from .services import PaymentService, StrikeAPIException
from .serializers import (
    StripeInvoiceSerializer, 
    LightningQuoteSerializer,
    PaymentTransactionSerializer
)

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lightning_invoice(request):
    """
    Create a new Bitcoin Lightning invoice for rent payment
    
    POST /api/payments/create-invoice/
    {
        "tenant_id": "uuid",
        "amount": "0.0001",
        "invoice_month": "2024-07",
        "description": "Rent for July 2024"
    }
    """
    try:
        logger.info("Starting create_lightning_invoice API call")
        
        # Parse request data
        tenant_id = request.data.get('tenant_id')
        
        # Use amount directly as BTC value now
        amount_btc = Decimal(str(request.data.get('amount', 0)))
        invoice_month = request.data.get('invoice_month')
        description = request.data.get('description', '')
        
        logger.debug(f"Invoice request: tenant={tenant_id}, amount_btc={amount_btc}, month={invoice_month}")
        
        # Validate required fields
        if not all([tenant_id, amount_btc, invoice_month]):
            missing_fields = []
            if not tenant_id:
                missing_fields.append('tenant_id')
            if not amount_btc:
                missing_fields.append('amount')
            if not invoice_month:
                missing_fields.append('invoice_month')
                
            logger.warning(f"Missing fields in invoice creation: {', '.join(missing_fields)}")
            return Response({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if amount_btc <= 0:
            logger.warning(f"Invalid amount for invoice: {amount_btc}")
            return Response({
                'error': 'Amount must be greater than zero'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get tenant by tenant_code
        try:
            tenant = Tenant.objects.get(tenant_code=tenant_id)
            logger.info(f"Found tenant: {tenant.user.get_full_name()} (ID: {tenant.id})")
        except Tenant.DoesNotExist:
            logger.warning(f"Tenant not found with code: {tenant_id}")
            return Response({
                'error': 'Tenant not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get optional Strike API settings from request
        strike_api_key = request.data.get('strike_api_key')
        strike_webhook_secret = request.data.get('strike_webhook_secret')
        payment_notification_email = request.data.get('payment_notification_email')
        
        logger.debug(f"Using custom Strike API key: {bool(strike_api_key)}")
        logger.debug(f"Using custom webhook secret: {bool(strike_webhook_secret)}")
        
        # Create invoice via service
        try:
            logger.info("Initializing PaymentService")
            payment_service = PaymentService(
                api_key=strike_api_key,
                webhook_secret=strike_webhook_secret,
                notification_email=payment_notification_email
            )
            
            logger.info(f"Creating BTC invoice for {amount_btc} BTC...")
            invoice = payment_service.create_rent_invoice(
                tenant=tenant,
                amount_zar=amount_btc,  # Using same parameter name but passing BTC amount
                invoice_month=invoice_month,
                description=description
            )
            
            # Serialize and return
            serializer = StripeInvoiceSerializer(invoice)
            
            logger.info(f"Created Lightning invoice {invoice.id} for tenant {tenant.user.get_full_name()}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except StrikeAPIException as e:
            error_msg = str(e)
            logger.error(f"Strike API error creating invoice: {error_msg}")
            
            # Check for specific error types
            if "401" in error_msg or "UNAUTHORIZED" in error_msg:
                logger.error("API key authorization failed - check permissions")
                return Response({
                    'error': 'Strike API key authentication failed. Please check your API key and permissions.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            elif "403" in error_msg or "FORBIDDEN" in error_msg:
                logger.error("API key lacks required permissions")
                return Response({
                    'error': 'Strike API key lacks required permissions for invoice creation.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            else:
                return Response({
                    'error': f'Payment system error: {error_msg}'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            logger.error(f"Error in payment service: {str(e)}", exc_info=True)
            return Response({
                'error': 'Payment processing error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Unhandled exception in create_lightning_invoice: {str(e)}", exc_info=True)
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint for tenants
def generate_payment_quote(request):
    """
    Generate a new Lightning payment quote with real-time BTC conversion
    
    POST /api/payments/generate-quote/
    {
        "invoice_id": "uuid"
    }
    """
    try:
        invoice_id = request.data.get('invoice_id')
        
        if not invoice_id:
            return Response({
                'error': 'Missing invoice_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate quote via service
        payment_service = PaymentService()
        quote = payment_service.generate_payment_quote(invoice_id)
        
        # Serialize and return
        serializer = LightningQuoteSerializer(quote)
        
        logger.info(f"Generated payment quote {quote.id} for invoice {invoice_id}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except StripeInvoice.DoesNotExist:
        return Response({
            'error': 'Invoice not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except ValueError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except StrikeAPIException as e:
        logger.error(f"Strike API error generating quote: {str(e)}")
        return Response({
            'error': f'Payment system error: {str(e)}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
    except Exception as e:
        logger.error(f"Error generating payment quote: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint for tenants
def get_payment_status(request, invoice_id):
    """
    Get payment status for an invoice
    
    GET /api/payments/status/{invoice_id}/
    """
    try:
        invoice = get_object_or_404(StripeInvoice, id=invoice_id)
        
        # Get latest quote if exists
        latest_quote = invoice.quotes.filter(status='active').first()
        
        response_data = {
            'invoice': StripeInvoiceSerializer(invoice).data,
            'latest_quote': LightningQuoteSerializer(latest_quote).data if latest_quote else None,
            'transaction': None
        }
        
        # Include transaction details if paid
        if invoice.is_paid and hasattr(invoice, 'transaction'):
            response_data['transaction'] = PaymentTransactionSerializer(invoice.transaction).data
        
        return Response(response_data)
        
    except StripeInvoice.DoesNotExist:
        return Response({
            'error': 'Invoice not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"Error getting payment status: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_tenant_invoices(request, tenant_id):
    """
    List all Lightning invoices for a specific tenant
    
    GET /api/payments/tenant/{tenant_id}/invoices/
    """
    try:
        tenant = get_object_or_404(Tenant, id=tenant_id)
        invoices = StripeInvoice.objects.filter(tenant=tenant).order_by('-created_at')
        
        serializer = StripeInvoiceSerializer(invoices, many=True)
        
        return Response({
            'tenant': {
                'id': str(tenant.id),
                'name': tenant.user.get_full_name(),
                'email': tenant.email
            },
            'invoices': serializer.data
        })
        
    except Tenant.DoesNotExist:
        return Response({
            'error': 'Tenant not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"Error listing tenant invoices: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@require_http_methods(["POST"])
def strike_webhook(request):
    """
    Handle Strike webhook events for payment confirmations
    
    POST /api/payments/webhook/strike/
    """
    try:
        # Get raw payload for signature verification
        payload = request.body
        signature = request.headers.get('Strike-Signature', '')
        
        # Log headers for debugging
        headers = {k: v for k, v in request.headers.items() if k.lower().startswith('strike')}
        logger.debug(f"Strike webhook headers: {headers}")
        
        # Parse JSON data
        webhook_data = json.loads(payload.decode('utf-8'))
        event_type = webhook_data.get('eventType', 'unknown')
        event_id = webhook_data.get('id', 'unknown')
        
        logger.info(f"Received Strike webhook: {event_type} - {event_id}")
        
        # Verify webhook signature
        payment_service = PaymentService()
        if not payment_service.strike_api.verify_webhook_signature(payload, signature):
            logger.warning(f"Invalid Strike webhook signature for event {event_id}")
            # Return 401 for invalid signature
            return HttpResponse("Invalid signature", status=401)
        
        # Check if this is a duplicate webhook (we've already processed this event)
        from .models import WebhookEvent
        if WebhookEvent.objects.filter(event_id=event_id).exists():
            logger.info(f"Duplicate webhook event {event_id} - already processed")
            # Return 200 OK for duplicates to prevent retries
            return HttpResponse("Already processed", status=200)
        
        # Process webhook
        success = payment_service.process_payment_webhook(webhook_data)
        
        if success:
            # Return 200 OK with a response within 5 seconds as per Strike docs
            return HttpResponse("Webhook processed successfully", status=200)
        else:
            # Return 500 for processing errors
            return HttpResponse("Error processing webhook", status=500)
            
    except json.JSONDecodeError:
        logger.error("Invalid JSON in Strike webhook payload")
        return HttpResponse("Invalid JSON", status=400)
        
    except Exception as e:
        logger.error(f"Error processing Strike webhook: {str(e)}")
        return HttpResponse("Internal server error", status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_invoice(request, invoice_id):
    """
    Cancel a Lightning invoice
    
    POST /api/payments/cancel/{invoice_id}/
    """
    try:
        invoice = get_object_or_404(StripeInvoice, id=invoice_id)
        
        if invoice.is_paid:
            return Response({
                'error': 'Cannot cancel a paid invoice'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Cancel via Strike API
        payment_service = PaymentService()
        payment_service.strike_api.cancel_invoice(invoice.strike_invoice_id)
        
        # Update local status
        invoice.status = 'canceled'
        invoice.save()
        
        # Cancel active quotes
        invoice.quotes.filter(status='active').update(status='canceled')
        
        logger.info(f"Canceled Lightning invoice {invoice.id}")
        
        return Response({
            'message': 'Invoice canceled successfully',
            'invoice': StripeInvoiceSerializer(invoice).data
        })
        
    except StripeInvoice.DoesNotExist:
        return Response({
            'error': 'Invoice not found'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except StrikeAPIException as e:
        logger.error(f"Strike API error canceling invoice: {str(e)}")
        return Response({
            'error': f'Payment system error: {str(e)}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
    except Exception as e:
        logger.error(f"Error canceling invoice: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # Public endpoint
def get_exchange_rate(request):
    """
    Get current BTC exchange rate
    
    GET /api/payments/exchange-rate/
    POST /api/payments/exchange-rate/ (with strike_api_key for testing)
    """
    try:
        # For POST requests, get optional API credentials for testing
        if request.method == 'POST':
            strike_api_key = request.data.get('strike_api_key')
            strike_webhook_secret = request.data.get('strike_webhook_secret')
            payment_service = PaymentService(
                api_key=strike_api_key,
                webhook_secret=strike_webhook_secret
            )
        else:
            payment_service = PaymentService()
        
        # Default to BTC-to-BTC (1:1)
        from_currency = request.data.get('from_currency', 'BTC') if request.method == 'POST' else 'BTC'
        to_currency = request.data.get('to_currency', 'BTC') if request.method == 'POST' else 'BTC'
            
        rate = payment_service.strike_api.get_exchange_rate(from_currency, to_currency)
        
        return Response({
            'from_currency': from_currency,
            'to_currency': to_currency,
            'rate': str(rate),
            'timestamp': timezone.now().isoformat()
        })
        
    except StrikeAPIException as e:
        logger.error(f"Strike API error getting exchange rate: {str(e)}")
        return Response({
            'error': f'Unable to get current exchange rate: {str(e)}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
    except Exception as e:
        logger.error(f"Error getting exchange rate: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 