"""
Payment signals for automated notifications and integrations
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .models import PaymentTransaction

logger = logging.getLogger(__name__)

@receiver(post_save, sender=PaymentTransaction)
def payment_confirmation_handler(sender, instance, created, **kwargs):
    """
    Send notifications when payment is confirmed
    Triggered by webhook processing after payment is received
    """
    if not created:
        return
        
    if instance.status == 'confirmed':
        # Payment was successful, send notifications
        logger.info(f"Sending payment confirmation notifications for transaction {instance.id}")
        
        # Get notification recipients
        notification_emails = getattr(settings, 'PAYMENT_NOTIFICATION_EMAILS', '')
        admin_emails = [email.strip() for email in notification_emails.split(',') if email.strip()]
        
        # Extract info needed for emails
        tenant = instance.strike_invoice.tenant
        tenant_email = tenant.user.email if tenant and tenant.user else None
        invoice = instance.strike_invoice
        
        # Build URLs for admin panel
        admin_base_url = getattr(settings, 'ADMIN_BASE_URL', 'http://localhost:8000')
        tenant_admin_url = f"{admin_base_url}/admin/tenants/tenant/{tenant.id}/change/" if tenant else ""
        invoice_admin_url = f"{admin_base_url}/admin/payments/stripeinvoice/{invoice.id}/change/" if invoice else ""
        
        # 1. Send confirmation to tenant
        if tenant_email:
            try:
                context = {
                    'tenant_name': tenant.name if tenant else 'Tenant',
                    'invoice_description': invoice.description,
                    'amount_zar': invoice.amount_zar,
                    'amount_btc': instance.amount_btc,
                    'transaction_date': instance.confirmed_at.strftime('%Y-%m-%d %H:%M'),
                    'transaction_id': instance.id,
                }
                
                # Render email as HTML and plaintext
                html_message = render_to_string('payments/email/payment_confirmation.html', context)
                plain_message = strip_tags(html_message)
                
                send_mail(
                    subject=f'Payment Confirmation - {invoice.description}',
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[tenant_email],
                    html_message=html_message,
                    fail_silently=False,
                )
                logger.info(f"Payment confirmation email sent to tenant: {tenant_email}")
            except Exception as e:
                logger.error(f"Failed to send tenant payment confirmation email: {str(e)}")
        
        # 2. Send notification to admins
        if admin_emails:
            try:
                context = {
                    'tenant_name': tenant.name if tenant else 'Unknown Tenant',
                    'invoice_description': invoice.description,
                    'amount_zar': invoice.amount_zar,
                    'amount_btc': instance.amount_btc,
                    'transaction_date': instance.confirmed_at.strftime('%Y-%m-%d %H:%M'),
                    'transaction_id': instance.id,
                    'tenant_admin_url': tenant_admin_url,
                    'invoice_admin_url': invoice_admin_url,
                }
                
                # Render email as HTML and plaintext
                html_message = render_to_string('payments/email/admin_payment_notification.html', context)
                plain_message = strip_tags(html_message)
                
                send_mail(
                    subject=f'New Bitcoin Payment Received - R{invoice.amount_zar}',
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                    html_message=html_message,
                    fail_silently=False,
                )
                logger.info(f"Admin payment notification sent to: {', '.join(admin_emails)}")
            except Exception as e:
                logger.error(f"Failed to send admin payment notification email: {str(e)}") 