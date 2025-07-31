"""
Utility functions for finance app including PDF generation and email sending
"""
import io
import logging
from datetime import datetime, date
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)


def generate_invoice_pdf(invoice):
    """
    Generate a PDF for the given invoice using ReportLab
    Returns a BytesIO buffer containing the PDF data
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, 
                          topMargin=72, bottomMargin=18)
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#3B82F6'),
        alignment=TA_CENTER,
        spaceAfter=30,
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#374151'),
        spaceAfter=6,
    )
    
    normal_style = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1F2937'),
    )
    
    # Build story
    story = []
    
    # Header with company info
    story.append(Paragraph("RentPilot Property Management", title_style))
    story.append(Paragraph("Email: admin@rentpilot.co.za", header_style))
    story.append(Spacer(1, 20))
    
    # Invoice title and number
    invoice_title = f"INVOICE {invoice.invoice_number}"
    story.append(Paragraph(invoice_title, title_style))
    story.append(Spacer(1, 20))
    
    # Invoice details table
    invoice_data = [
        ['Invoice Number:', invoice.invoice_number],
        ['Issue Date:', invoice.issue_date.strftime('%B %d, %Y') if invoice.issue_date else 'N/A'],
        ['Due Date:', invoice.due_date.strftime('%B %d, %Y')],
        ['Status:', invoice.get_status_display()],
    ]
    
    invoice_table = Table(invoice_data, colWidths=[2*inch, 3*inch])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    story.append(invoice_table)
    story.append(Spacer(1, 20))
    
    # Tenant and property information
    story.append(Paragraph("BILL TO:", ParagraphStyle('BillTo', parent=styles['Heading2'])))
    story.append(Paragraph(f"<b>{invoice.tenant.name}</b>", normal_style))
    if hasattr(invoice.tenant, 'email') and invoice.tenant.email:
        story.append(Paragraph(f"Email: {invoice.tenant.email}", normal_style))
    if hasattr(invoice.tenant, 'phone') and invoice.tenant.phone:
        story.append(Paragraph(f"Phone: {invoice.tenant.phone}", normal_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("PROPERTY:", ParagraphStyle('Property', parent=styles['Heading2'])))
    story.append(Paragraph(f"<b>{invoice.property.name}</b>", normal_style))
    story.append(Paragraph(invoice.property.address, normal_style))
    if hasattr(invoice.lease, 'unit') and invoice.lease.unit:
        story.append(Paragraph(f"Unit: {invoice.lease.unit.unit_number}", normal_style))
    story.append(Spacer(1, 20))
    
    # Line items table
    line_items_data = [['Description', 'Category', 'Qty', 'Unit Price', 'Total']]
    
    for item in invoice.line_items.all():
        line_items_data.append([
            item.description,
            item.get_category_display() if item.category else '',
            str(item.quantity),
            f"R {item.unit_price:,.2f}",
            f"R {item.total:,.2f}"
        ])
    
    # Add subtotal, tax, and total rows
    line_items_data.extend([
        ['', '', '', 'Subtotal:', f"R {invoice.subtotal:,.2f}"],
        ['', '', '', f'Tax ({invoice.tax_rate}%):', f"R {invoice.tax_amount:,.2f}"],
        ['', '', '', 'TOTAL:', f"R {invoice.total_amount:,.2f}"],
    ])
    
    line_items_table = Table(line_items_data, colWidths=[2.5*inch, 1*inch, 0.5*inch, 1*inch, 1*inch])
    line_items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        
        # Data rows
        ('ALIGN', (2, 1), (-1, -4), 'RIGHT'),  # Quantity, price, total columns
        ('FONTNAME', (0, 1), (-1, -4), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -4), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -4), [colors.white, colors.HexColor('#F9FAFB')]),
        
        # Summary rows (last 3 rows)
        ('ALIGN', (0, -3), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -3), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -3), (-1, -1), 10),
        ('LINEABOVE', (0, -3), (-1, -3), 1, colors.HexColor('#E5E7EB')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#374151')),
        
        # Grid
        ('GRID', (0, 0), (-1, -4), 1, colors.HexColor('#E5E7EB')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    story.append(line_items_table)
    story.append(Spacer(1, 30))
    
    # Payment instructions
    if invoice.bank_info:
        story.append(Paragraph("PAYMENT INSTRUCTIONS:", ParagraphStyle('PaymentHeader', parent=styles['Heading2'])))
        story.append(Paragraph(invoice.bank_info.replace('\n', '<br/>'), normal_style))
        story.append(Spacer(1, 10))
    
    story.append(Paragraph(f"Payment Reference: <b>{invoice.invoice_number}</b>", normal_style))
    story.append(Spacer(1, 20))
    
    # Notes
    if invoice.notes:
        story.append(Paragraph("NOTES:", ParagraphStyle('NotesHeader', parent=styles['Heading2'])))
        story.append(Paragraph(invoice.notes.replace('\n', '<br/>'), normal_style))
        story.append(Spacer(1, 20))
    
    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E5E7EB')))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Thank you for your business!", 
                          ParagraphStyle('Footer', parent=styles['Normal'], 
                                       fontSize=10, alignment=TA_CENTER,
                                       textColor=colors.HexColor('#6B7280'))))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def send_invoice_email(invoice, recipient_email=None, include_payment_link=True):
    """
    Send invoice via email with PDF attachment
    Returns True if successful, False otherwise
    """
    try:
        # Determine recipient email
        if not recipient_email:
            recipient_email = invoice.email_recipient or (
                invoice.tenant.user.email if hasattr(invoice.tenant, 'user') and invoice.tenant.user else None
            )
        
        if not recipient_email:
            logger.error(f"No recipient email found for invoice {invoice.invoice_number}")
            return False, "No recipient email address found"
        
        # Calculate days until due
        days_until_due = None
        if invoice.due_date:
            today = date.today()
            days_until_due = (invoice.due_date - today).days
        
        # Generate payment URL if bitcoin payments are enabled
        payment_url = None
        if include_payment_link and hasattr(invoice, 'tenant'):
            try:
                from payments.services import PaymentService
                payment_service = PaymentService()
                # Create or get existing payment URL
                payment_url = f"{settings.PAYMENT_BASE_URL}/{invoice.tenant.id}/invoice/{invoice.id}/"
            except Exception as e:
                logger.warning(f"Could not generate payment URL for invoice {invoice.invoice_number}: {e}")
        
        # Prepare email context
        context = {
            'invoice': invoice,
            'payment_url': payment_url,
            'days_until_due': days_until_due,
        }
        
        # Render email templates
        html_content = render_to_string('finance/email/invoice_email.html', context)
        text_content = render_to_string('finance/email/invoice_email.txt', context)
        
        # Create email subject
        subject = invoice.email_subject or f"Invoice {invoice.invoice_number} - {invoice.property.name}"
        
        # Create email
        from_email = settings.INVOICE_FROM_EMAIL
        reply_to = [settings.INVOICE_REPLY_TO_EMAIL] if hasattr(settings, 'INVOICE_REPLY_TO_EMAIL') else None
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[recipient_email],
            reply_to=reply_to,
        )
        
        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        
        # Generate and attach PDF
        try:
            pdf_buffer = generate_invoice_pdf(invoice)
            email.attach(
                f"Invoice_{invoice.invoice_number}.pdf",
                pdf_buffer.getvalue(),
                'application/pdf'
            )
        except Exception as e:
            logger.error(f"Failed to generate PDF for invoice {invoice.invoice_number}: {e}")
            # Continue without PDF attachment
        
        # Send email
        email.send()
        
        # Update invoice status to 'sent' if it was 'draft'
        if invoice.status == 'draft':
            invoice.status = 'sent'
            invoice.save(update_fields=['status'])
        
        logger.info(f"Invoice {invoice.invoice_number} sent successfully to {recipient_email}")
        return True, "Invoice sent successfully"
        
    except Exception as e:
        error_msg = f"Failed to send invoice {invoice.invoice_number}: {str(e)}"
        logger.error(error_msg)
        return False, str(e)


def send_bulk_invoice_reminders(invoices, method='email'):
    """
    Send reminders for multiple invoices
    Returns dict with success/failure counts
    """
    results = {
        'success': 0,
        'failed': 0,
        'errors': []
    }
    
    for invoice in invoices:
        try:
            if method == 'email':
                success, message = send_invoice_email(invoice)
                if success:
                    results['success'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f"Invoice {invoice.invoice_number}: {message}")
            else:
                # Future: implement SMS/WhatsApp reminders
                results['failed'] += 1
                results['errors'].append(f"Invoice {invoice.invoice_number}: Method {method} not implemented")
                
        except Exception as e:
            results['failed'] += 1
            results['errors'].append(f"Invoice {invoice.invoice_number}: {str(e)}")
    
    return results 