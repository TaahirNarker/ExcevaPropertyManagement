from django.apps import AppConfig


class FinanceConfig(AppConfig):
    """AppConfig for the finance app.

    Loads Django signal handlers at startup so invoice totals and related
    aggregates are recalculated automatically whenever invoices, payments,
    adjustments, or line items change.
    """
    name = 'finance'

    def ready(self):
        # Import signal handlers. The import must be inside ready() so Django
        # app registry is fully loaded and to avoid side effects during
        # migrations.
        try:
            from . import signals  # noqa: F401
        except Exception as e:
            # Avoid crashing startup if a signal import fails; log to console.
            # In production, configure proper logging.
            print(f"[FinanceConfig.ready] Failed to import signals: {e}")

from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'finance'
