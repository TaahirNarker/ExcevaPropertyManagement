from django.apps import AppConfig


class LeasesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'leases'

    def ready(self):
        # Import signal handlers to ensure they are registered when app is ready
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Avoid crashing app startup if migrations not ready
            pass
