#!/usr/bin/env python
"""
Test script to verify email configuration with ZOHO Mail
Run this script to test if your email settings are working correctly.

Usage:
    python test_email_setup.py your-test-email@domain.com
"""

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_control_system.settings')
django.setup()

from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from finance.models import Invoice
from finance.utils import send_invoice_email, generate_invoice_pdf
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_basic_email(recipient_email):
    """Test basic email sending functionality"""
    print("🧪 Testing basic email sending...")
    
    try:
        subject = "Test Email from RentPilot Property Management"
        message = """
        Hello!
        
        This is a test email to verify that your ZOHO Mail configuration is working correctly.
        
        If you receive this email, your email setup is functioning properly.
        
        Best regards,
        RentPilot Property Management System
        """
        
        from_email = settings.INVOICE_FROM_EMAIL
        
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        
        print(f"✅ Basic email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Basic email test failed: {e}")
        return False


def test_html_email(recipient_email):
    """Test HTML email sending"""
    print("🧪 Testing HTML email sending...")
    
    try:
        subject = "HTML Test Email from RentPilot"
        
        html_content = """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #3B82F6;">RentPilot Property Management</h1>
                <p>This is a test of HTML email functionality.</p>
                <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Test Results:</h3>
                    <ul>
                        <li>✅ ZOHO Mail SMTP connection</li>
                        <li>✅ HTML email rendering</li>
                        <li>✅ Email template system</li>
                    </ul>
                </div>
                <p>If you can see this formatted email, your configuration is working perfectly!</p>
                <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
                <p style="font-size: 12px; color: #6B7280;">
                    This is an automated test email from RentPilot Property Management System.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = """
        RentPilot Property Management
        
        This is a test of HTML email functionality.
        
        Test Results:
        - ZOHO Mail SMTP connection: Working
        - HTML email rendering: Working
        - Email template system: Working
        
        If you receive this email, your configuration is working perfectly!
        
        This is an automated test email from RentPilot Property Management System.
        """
        
        from_email = settings.INVOICE_FROM_EMAIL
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[recipient_email],
        )
        
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        print(f"✅ HTML email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ HTML email test failed: {e}")
        return False


def test_pdf_generation():
    """Test PDF generation functionality"""
    print("🧪 Testing PDF generation...")
    
    try:
        # Try to find an existing invoice, or skip if none exist
        invoice = Invoice.objects.first()
        
        if not invoice:
            print("⚠️  No invoices found in database - skipping PDF test")
            print("   Create an invoice first to test PDF generation")
            return True
        
        pdf_buffer = generate_invoice_pdf(invoice)
        pdf_size = len(pdf_buffer.getvalue())
        
        print(f"✅ PDF generated successfully for invoice {invoice.invoice_number}")
        print(f"   PDF size: {pdf_size} bytes")
        return True
        
    except Exception as e:
        print(f"❌ PDF generation test failed: {e}")
        return False


def test_invoice_email(recipient_email):
    """Test complete invoice email functionality"""
    print("🧪 Testing complete invoice email system...")
    
    try:
        # Try to find an existing invoice
        invoice = Invoice.objects.first()
        
        if not invoice:
            print("⚠️  No invoices found in database - skipping invoice email test")
            print("   Create an invoice first to test invoice email functionality")
            return True
        
        success, message = send_invoice_email(
            invoice, 
            recipient_email=recipient_email,
            include_payment_link=True
        )
        
        if success:
            print(f"✅ Invoice email sent successfully to {recipient_email}")
            print(f"   Invoice: {invoice.invoice_number}")
            print(f"   Message: {message}")
            return True
        else:
            print(f"❌ Invoice email failed: {message}")
            return False
            
    except Exception as e:
        print(f"❌ Invoice email test failed: {e}")
        return False


def display_current_settings():
    """Display current email settings"""
    print("📧 Current Email Settings:")
    print(f"   EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"   EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"   EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"   EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"   EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
    print(f"   EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"   EMAIL_HOST_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
    print(f"   DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"   INVOICE_FROM_EMAIL: {settings.INVOICE_FROM_EMAIL}")
    print()


def main():
    if len(sys.argv) != 2:
        print("Usage: python test_email_setup.py your-test-email@domain.com")
        sys.exit(1)
    
    recipient_email = sys.argv[1]
    
    print("🚀 RentPilot Email Configuration Test")
    print("=" * 50)
    
    display_current_settings()
    
    # Run all tests
    tests = [
        ("Basic Email", lambda: test_basic_email(recipient_email)),
        ("HTML Email", lambda: test_html_email(recipient_email)),
        ("PDF Generation", test_pdf_generation),
        ("Invoice Email", lambda: test_invoice_email(recipient_email)),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} test...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your email configuration is working perfectly.")
    else:
        print("⚠️  Some tests failed. Check the error messages above and your email configuration.")
        print("\nTroubleshooting tips:")
        print("1. Verify your ZOHO app password is correct")
        print("2. Check that your domain is verified in ZOHO")
        print("3. Ensure EMAIL_USE_TLS=True and EMAIL_PORT=587")
        print("4. Check Django logs for detailed error messages")


if __name__ == "__main__":
    main() 