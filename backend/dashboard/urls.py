from django.urls import path
from . import views

urlpatterns = [
    path('metrics/', views.dashboard_metrics, name='dashboard-metrics'),
] 