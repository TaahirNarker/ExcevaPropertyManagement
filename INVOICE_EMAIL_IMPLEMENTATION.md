# Invoice Email Implementation Guide

## Overview

This implementation adds complete email functionality to your property management system, allowing you to send professional invoices via email using ZOHO Mail with the "noreply@rentpilot.co.za" address.

## Features Implemented

### ✅ Backend Features
- **Email Configuration**: Full ZOHO Mail integration with Django
- **PDF Generation**: Professional invoice PDFs using ReportLab
- **Email Templates**: HTML and plain text email templates
- **Send Invoice API**: Enhanced endpoint to actually send emails
- **Bulk Email**: Send reminders to multiple invoices at once
- **Error Handling**: Comprehensive error handling and logging

### ✅ Frontend Features
- **Complete Invoice API**: All CRUD operations and email functionality
- **Send Invoice Button**: Working "Send Invoice" functionality
- **TypeScript Support**: Full type definitions for invoices
- **Error Feedback**: User-friendly error messages

## Files Created/Modified

### Backend Files
- `backend/property_control_system/settings.py` - Added ZOHO Mail configuration
- `backend/requirements.txt` - Added PDF generation libraries
- `backend/templates/finance/email/invoice_email.html` - Professional HTML email template
- `backend/templates/finance/email/invoice_email.txt` - Plain text email template
- `backend/finance/utils.py` - PDF generation and email sending utilities
- `backend/finance/views.py` - Enhanced send_invoice endpoint
- `backend/email_setup_template.txt` - ZOHO Mail setup instructions
- `backend/test_email_setup.py` - Email testing script

### Frontend Files
- `frontend/src/lib/api.ts` - Added complete invoiceApi implementation

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure ZOHO Mail

1. **Generate App Password**:
   - Login to your ZOHO Mail account at https://mail.zoho.com
   - Go to Settings > Security > App Passwords
   - Generate a new app password for "Property Management System"
   - Copy the generated password

2. **Update .env File**:
   Add these settings to your `backend/.env` file:

```env
# ZOHO Mail SMTP Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False

# Your ZOHO Mail credentials
EMAIL_HOST_USER=noreply@rentpilot.co.za
EMAIL_HOST_PASSWORD=your-zoho-app-password-here

# Default email addresses
DEFAULT_FROM_EMAIL=noreply@rentpilot.co.za
SERVER_EMAIL=noreply@rentpilot.co.za

# Invoice-specific email settings
INVOICE_FROM_EMAIL=noreply@rentpilot.co.za
INVOICE_REPLY_TO_EMAIL=admin@rentpilot.co.za

# Admin notification emails
PAYMENT_NOTIFICATION_EMAILS=admin@rentpilot.co.za
ADMIN_BASE_URL=http://localhost:8000
```

### 3. Test Email Configuration

Run the test script to verify everything is working:

```bash
cd backend
python test_email_setup.py your-test-email@domain.com
```

This will test:
- Basic email sending
- HTML email rendering
- PDF generation
- Complete invoice email functionality

### 4. Start the Servers

```bash
# Backend
cd backend
python manage.py runserver 8000

# Frontend
cd frontend
npm run dev
```

## How to Use

### Sending Invoices via Email

1. **From the Invoice Manager**:
   - Navigate to the Finance dashboard
   - Click the "Send Invoice" button next to any invoice
   - The system will automatically send the email with PDF attachment

2. **From the Lease Details Page**:
   - Go to a specific lease
   - Create or view an invoice
   - Click "Send Invoice" to email it to the tenant

3. **Bulk Sending**:
   - Select multiple invoices in the invoice manager
   - Click "Send Bulk Reminders"
   - All selected invoices will be emailed

### API Endpoints

- `POST /api/finance/invoices/{id}/send_invoice/` - Send single invoice
- `GET /api/finance/invoices/{id}/generate_pdf/` - Download PDF
- `POST /api/finance/invoices/send_bulk_reminders/` - Send bulk reminders

## Email Features

### Professional Email Template
- Responsive design that works on all devices
- Company branding with RentPilot colors
- Clear invoice details and payment instructions
- Payment due date warnings for overdue invoices
- Bitcoin payment integration (if enabled)

### PDF Attachment
- Professional invoice layout
- Company header and contact information
- Detailed line items with categories
- Tax calculations and totals
- Payment instructions and bank details
- Modern styling with proper formatting

### Smart Features
- Automatic status updates (draft → sent)
- Tenant email detection from multiple sources
- Payment URL generation for Bitcoin payments
- Days until due calculations
- Error handling and retry logic

## Troubleshooting

### Common Issues

1. **Emails not sending**:
   - Verify ZOHO app password is correct
   - Check that your domain is verified in ZOHO
   - Ensure EMAIL_USE_TLS=True and EMAIL_PORT=587
   - Run the test script for detailed error messages

2. **PDF generation errors**:
   - Make sure reportlab is installed
   - Check that invoice has required data (tenant, property, etc.)
   - Verify template permissions

3. **Permission errors**:
   - Ensure user has access to the invoice
   - Check Django permissions and authentication

### Debugging

1. **Check Django logs**:
   ```bash
   tail -f backend/logs/django.log
   ```

2. **Test email manually**:
   ```python
   python manage.py shell
   from django.core.mail import send_mail
   send_mail('Test', 'Test message', 'noreply@rentpilot.co.za', ['your-email@domain.com'])
   ```

3. **Test PDF generation**:
   ```python
   python manage.py shell
   from finance.models import Invoice
   from finance.utils import generate_invoice_pdf
   invoice = Invoice.objects.first()
   pdf = generate_invoice_pdf(invoice)
   ```

## Security Considerations

- Never commit real passwords to git
- Use app-specific passwords, not your ZOHO login password
- Keep email credentials secure in environment variables
- Monitor email sending for abuse
- Implement rate limiting for production use

## Next Steps

1. **Test the implementation** with real invoices
2. **Customize email templates** with your branding
3. **Set up monitoring** for email delivery
4. **Configure production settings** for your live environment
5. **Add email tracking** (optional) to monitor open rates

## Support

If you need help with the implementation:

1. Run the test script first to identify issues
2. Check the Django logs for detailed error messages
3. Verify your ZOHO Mail configuration
4. Ensure all dependencies are installed correctly

The system is now ready to send professional invoices via email! 🎉 