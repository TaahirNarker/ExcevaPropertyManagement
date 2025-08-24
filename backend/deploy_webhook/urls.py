"""
Deploy Webhook URL Configuration
"""

from django.urls import path
from . import views

app_name = 'deploy_webhook'

urlpatterns = [
    path('restart/', views.restart_services, name='restart_services'),
    path('health/', views.health_check, name='health_check'),
]
