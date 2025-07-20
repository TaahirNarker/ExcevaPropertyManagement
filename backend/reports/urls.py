from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('<str:report_id>/export/pdf/', views.export_pdf, name='export_pdf'),
    path('<str:report_id>/export/xlsx/', views.export_xlsx, name='export_xlsx'),
] 