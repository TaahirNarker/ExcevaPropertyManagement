from django.shortcuts import render
from django.http import HttpResponse
from django.http import Http404
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
import openpyxl
from io import BytesIO
from finance.models import Invoice, InvoicePayment
from leases.models import Lease
from properties.models import Property
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

# Helper functions to fetch data
def get_report_data(report_id):
    try:
        if report_id == 'rental-income':
            leases = Lease.objects.filter(status='active')
            data = [['Property', 'Tenant', 'Monthly Rent']]
            total = 0
            for lease in leases:
                data.append([lease.property.name, lease.tenant.user.get_full_name(), lease.monthly_rent])
                total += lease.monthly_rent
            data.append(['Total', '', total])
            return data, 'Rental Income Report'
        elif report_id == 'payment-history':
            payments = InvoicePayment.objects.all()
            data = [['Invoice', 'Amount', 'Date', 'Method']]
            for payment in payments:
                data.append([payment.invoice.invoice_number, payment.amount, payment.payment_date, payment.payment_method])
            return data, 'Payment History Report'
        # Add more report types as needed
        else:
            raise ValueError("Report not found")
    except Exception as e:
        raise Http404(f"Error generating report data: {str(e)}")

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_pdf(request, report_id):
    try:
        data, title = get_report_data(report_id)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        table = Table(data)
        style = TableStyle([('BACKGROUND', (0,0), (-1,0), colors.grey),
                            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                            ('BOTTOMPADDING', (0,0), (-1,0), 12),
                            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
                            ('GRID', (0,0), (-1,-1), 1, colors.black)])
        table.setStyle(style)
        doc.build([table])
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=\"{report_id}_report.pdf\"'
        return response
    except Http404 as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Failed to generate PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_xlsx(request, report_id):
    try:
        data, title = get_report_data(report_id)
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = title
        for row in data:
            ws.append(row)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename=\"{report_id}_report.xlsx\"'
        return response
    except Http404 as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Failed to generate XLSX: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
