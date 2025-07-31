from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'
    
    def ready(self):
        """
        Check if Strike API credentials are configured at startup
        """
        from django.conf import settings
        
        # Register signal handlers
        import payments.signals
        
        # Check if Strike API credentials are configured
        api_key = getattr(settings, 'STRIKE_API_KEY', None)
        webhook_secret = getattr(settings, 'STRIKE_WEBHOOK_SECRET', None)
        
        if not api_key or api_key == 'your-strike-api-key-here':
            logger.warning("⚠️ Strike API key not configured. Bitcoin payments will run in DEMO MODE.")
        else:
            logger.info("✅ Strike API key configured successfully.")
            
        if not webhook_secret or webhook_secret == 'your-strike-webhook-secret-here':
            logger.warning("⚠️ Strike webhook secret not configured. Webhook signature verification will be skipped.")
        else:
            logger.info("✅ Strike webhook secret configured successfully.")
            
        # Log payment base URL
        payment_base_url = getattr(settings, 'PAYMENT_BASE_URL', None)
        if payment_base_url:
            logger.info(f"📌 Payment base URL: {payment_base_url}")
        else:
            logger.warning("⚠️ Payment base URL not configured. Using default URL.") 