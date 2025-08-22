# 🚀 Monthly Invoice Job System Guide

## Overview

The Monthly Invoice Job System provides automated invoice generation, late fee processing, and scheduling capabilities for the property management system. This comprehensive system handles all aspects of monthly billing automation.

## 📋 System Components

### 1. **Monthly Invoice Generation** (`generate_monthly_invoices.py`)
- Automated monthly invoice creation for all active leases
- Rent escalation processing
- Late fee calculations and penalties
- Recurring charges integration
- VAT calculations for commercial properties
- Configurable scheduling and manual execution

### 2. **Invoice Scheduling** (`schedule_invoice_generation.py`)
- Automated scheduling utilities
- Cron job configuration generation
- Due date checking
- Scheduled execution management

### 3. **Late Fee Processing** (`process_late_fees.py`)
- Overdue invoice identification
- Late fee calculation and tracking
- Status updates (sent → overdue)
- Payment reminder notifications
- Detailed reporting

## 🛠️ Installation & Setup

### Prerequisites
- Django project with finance app installed
- All invoice system models migrated
- System settings configured (VAT rate, etc.)

### Initial Setup
```bash
# Navigate to your Django project
cd /path/to/your/project

# Test the commands
python manage.py generate_monthly_invoices --help
python manage.py schedule_invoice_generation --help
python manage.py process_late_fees --help
```

## 📊 Command Usage

### Monthly Invoice Generation

#### Basic Usage
```bash
# Generate invoices for next month (default)
python manage.py generate_monthly_invoices

# Generate for specific month
python manage.py generate_monthly_invoices --month 2025-09-01

# Preview without creating (dry run)
python manage.py generate_monthly_invoices --dry-run

# Force generation even if invoices exist
python manage.py generate_monthly_invoices --force

# Send invoices immediately after creation
python manage.py generate_monthly_invoices --send-immediately
```

#### Advanced Options
```bash
# Generate for specific lease only
python manage.py generate_monthly_invoices --lease-id 123

# Generate for specific property
python manage.py generate_monthly_invoices --property-id PRO000001

# Skip late fee calculations
python manage.py generate_monthly_invoices --exclude-late-fees

# Skip rent escalation processing
python manage.py generate_monthly_invoices --exclude-escalations
```

### Invoice Scheduling

#### Check if Generation is Due
```bash
# Check if today is generation day
python manage.py schedule_invoice_generation --check-due

# Set custom generation day (default: 25th)
python manage.py schedule_invoice_generation --check-due --generation-day 20
```

#### Generate Cron Configuration
```bash
# Generate cron job setup
python manage.py schedule_invoice_generation --generate-cron
```

#### Automated Execution
```bash
# Run scheduled generation (for cron jobs)
python manage.py schedule_invoice_generation --run-scheduled
```

### Late Fee Processing

#### Basic Processing
```bash
# Process all overdue invoices
python manage.py process_late_fees

# Preview without making changes
python manage.py process_late_fees --dry-run

# Generate report only
python manage.py process_late_fees --report-only
```

#### Targeted Processing
```bash
# Process specific property
python manage.py process_late_fees --property-id PRO000001

# Process specific tenant
python manage.py process_late_fees --tenant-id 123

# Custom grace period
python manage.py process_late_fees --grace-days 7

# Send notifications
python manage.py process_late_fees --send-notifications
```

## ⚙️ Automation Setup

### Cron Job Configuration

#### Generate Configuration
```bash
python manage.py schedule_invoice_generation --generate-cron
```

#### Example Cron Jobs
```bash
# Monthly invoice generation (25th of each month at 9:00 AM)
0 9 25 * * cd /path/to/project && python manage.py schedule_invoice_generation --run-scheduled

# Daily schedule check (8:00 AM daily)
0 8 * * * cd /path/to/project && python manage.py schedule_invoice_generation --check-due

# Weekly late fee processing (Mondays at 10:00 AM)
0 10 * * 1 cd /path/to/project && python manage.py process_late_fees

# Monthly overdue report (1st of each month at 9:00 AM)
0 9 1 * * cd /path/to/project && python manage.py process_late_fees --report-only
```

#### Installing Cron Jobs
```bash
# Edit crontab
crontab -e

# Add the desired cron lines
# Save and exit

# Verify installation
crontab -l
```

### Alternative Scheduling Solutions

#### Django-Q (Recommended for Production)
```python
# In Django settings
INSTALLED_APPS = [
    # ... other apps
    'django_q',
]

# Schedule tasks
from django_q.tasks import schedule
from django_q.models import Schedule

# Monthly invoice generation
schedule(
    'django.core.management.call_command',
    'generate_monthly_invoices',
    schedule_type=Schedule.MONTHLY,
    next_run=datetime(2025, 8, 25, 9, 0)  # 25th at 9:00 AM
)
```

#### Celery Integration
```python
# In celery tasks
from celery import shared_task
from django.core.management import call_command

@shared_task
def generate_monthly_invoices():
    call_command('generate_monthly_invoices')

@shared_task
def process_late_fees():
    call_command('process_late_fees')
```

## 📈 System Features

### Invoice Generation Features
- ✅ **Automatic Base Rent**: Monthly rent from lease
- ✅ **Recurring Charges**: Utilities, maintenance, etc.
- ✅ **Late Fee Integration**: Penalties from overdue invoices
- ✅ **Rent Escalation**: Automatic annual increases
- ✅ **VAT Calculations**: Commercial property tax
- ✅ **Draft Management**: User modifications preserved
- ✅ **Audit Logging**: Complete activity tracking
- ✅ **Bulk Processing**: All leases at once
- ✅ **Selective Processing**: By lease/property
- ✅ **Error Handling**: Graceful failure recovery

### Scheduling Features
- ✅ **Flexible Timing**: Configurable generation day
- ✅ **Due Date Checking**: Smart scheduling logic
- ✅ **Cron Integration**: Production-ready automation
- ✅ **Dry Run Support**: Safe testing
- ✅ **Status Monitoring**: Generation tracking

### Late Fee Features
- ✅ **Grace Period**: Configurable delay
- ✅ **Compounding Fees**: Escalating penalties
- ✅ **Status Updates**: Automatic overdue marking
- ✅ **Notification System**: Payment reminders
- ✅ **Detailed Reporting**: Comprehensive analytics
- ✅ **Severity Classification**: Risk assessment

## 🎯 Business Logic

### Invoice Generation Flow
1. **Lease Validation**: Check active status
2. **Escalation Check**: Apply rent increases if due
3. **Base Invoice Creation**: Monthly rent + recurring charges
4. **Late Fee Calculation**: Add penalties from overdue invoices
5. **VAT Application**: Commercial property tax
6. **Total Calculation**: Final invoice amount
7. **Audit Logging**: Record generation activity
8. **Optional Sending**: Immediate dispatch if requested

### Late Fee Calculation
```python
# Late fee formula (configurable)
days_overdue = (current_date - due_date).days - grace_period
if days_overdue > 0:
    # Percentage-based with compounding
    late_fee = outstanding_amount * (late_fee_rate / 100) * days_overdue
    # Or fixed amount per day
    late_fee = fixed_daily_rate * days_overdue
```

### Rent Escalation Logic
```python
# Annual escalation check
if lease.next_escalation_date <= target_month:
    if lease.escalation_type == 'percentage':
        new_rent = current_rent * (1 + escalation_percentage / 100)
    else:
        new_rent = current_rent + escalation_amount
    
    # Update lease and log change
    lease.monthly_rent = new_rent
    lease.next_escalation_date = calculate_next_escalation_date()
```

## 📊 Monitoring & Reports

### Command Output Examples

#### Successful Generation
```
🚀 Monthly Invoice Generation
============================================================
📅 Target Month: September 2025
🕐 Started at: 2025-08-25 09:00:00
🏠 Found 15 active lease(s) to process

🔄 Processing Lease #1
   👤 Tenant: John Smith
   🏢 Property: Sunset Apartments - Unit 101
   💰 Monthly Rent: R12,500.00
   📈 Rent escalated: R12,500.00 → R13,500.00
   💡 Added recurring charge: Utilities (R850.00)
   ⚠️  Added late fees: R125.00
   ✅ Created invoice: INV-2025-001234 (R14,475.00)

📊 MONTHLY INVOICE GENERATION SUMMARY
============================================================
🏠 Leases Processed: 15
📄 Invoices Created: 15
⏭️  Invoices Skipped: 0
❌ Errors: 0
📈 Rent Escalations Applied: 3
⚠️  Late Fees Added: 5
💰 Total Invoice Amount: R187,350.00

✅ SUCCESS - 15 invoices generated
```

#### Late Fee Report
```
⚠️  Late Fee Processing
==================================================
📅 Processing Date: 2025-08-25
⏰ Grace Period: 5 days
📄 Found 8 overdue invoice(s)

📊 LATE FEE PROCESSING REPORT
==================================================
📄 Invoices Processed: 8
🔄 Status Updates: 8
💸 Late Fees Calculated: 6
💰 Total Late Fees: R2,450.00
📧 Notifications Sent: 8

📊 OVERDUE SEVERITY BREAKDOWN:
🔴 Severe (>30 days): 2 invoices
🟡 Moderate (15-30 days): 3 invoices
🟢 Recent (<15 days): 3 invoices
```

### Error Handling
- **Lease Issues**: Skip problematic leases, continue processing
- **Calculation Errors**: Log errors, use fallback values
- **Database Issues**: Transaction rollback, preserve data integrity
- **Permission Issues**: Graceful handling, detailed logging

## 🔧 Configuration

### System Settings
Configure via Django Admin or SystemSettings model:

```python
# VAT Rate (for commercial properties)
SystemSettings.objects.update_or_create(
    key='vat_rate',
    defaults={'value': '15.0', 'setting_type': 'decimal'}
)

# Late Fee Rate (percentage per day)
SystemSettings.objects.update_or_create(
    key='late_fee_rate',
    defaults={'value': '2.0', 'setting_type': 'decimal'}
)

# Grace Period (days)
SystemSettings.objects.update_or_create(
    key='grace_period_days',
    defaults={'value': '5', 'setting_type': 'integer'}
)
```

### Environment Variables
```bash
# Email settings (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-app-password

# Logging
DJANGO_LOG_LEVEL=INFO
```

## 🚨 Troubleshooting

### Common Issues

#### "No leases found"
- Check lease status (must be 'active')
- Verify date filters
- Check database connectivity

#### "Invoice already exists"
- Use `--force` to regenerate
- Check for duplicate generation
- Verify month parameter format

#### "Permission denied"
- Check Django user permissions
- Verify database access
- Check file system permissions

#### "Cron job not running"
- Verify cron service status: `sudo service cron status`
- Check cron logs: `tail -f /var/log/cron.log`
- Test command manually first
- Verify file paths in cron jobs

### Debug Commands
```bash
# Test with dry run
python manage.py generate_monthly_invoices --dry-run

# Check specific lease
python manage.py generate_monthly_invoices --lease-id 123 --dry-run

# Verbose output
python manage.py generate_monthly_invoices --verbosity 2

# Check system settings
python manage.py shell -c "from finance.models import SystemSettings; print(SystemSettings.objects.all().values())"
```

## 📚 Best Practices

### 1. **Testing Strategy**
- Always test with `--dry-run` first
- Test on staging environment
- Verify calculations manually
- Check edge cases (month-end, leap years)

### 2. **Monitoring**
- Set up log monitoring
- Create alerts for failures
- Monitor invoice generation metrics
- Track late fee trends

### 3. **Backup Strategy**
- Backup database before major runs
- Keep audit logs
- Version control configuration
- Document manual interventions

### 4. **Performance**
- Run during off-peak hours
- Monitor database performance
- Consider batch processing for large datasets
- Optimize queries if needed

### 5. **Security**
- Restrict command access
- Secure cron job files
- Monitor system access
- Regular security audits

## 🎉 Success Metrics

### Key Performance Indicators
- **Invoice Generation Rate**: Successful vs. failed generations
- **Processing Time**: Time to complete monthly run
- **Late Fee Recovery**: Effectiveness of penalty system
- **Automation Reliability**: Scheduled job success rate
- **Error Rate**: Percentage of failed processing attempts

### Monthly Review Checklist
- [ ] All invoices generated successfully
- [ ] Rent escalations applied correctly
- [ ] Late fees calculated accurately
- [ ] VAT applied to commercial properties
- [ ] Recurring charges included
- [ ] Audit logs complete
- [ ] No failed lease processing
- [ ] Scheduled jobs running properly

## 🚀 Future Enhancements

### Planned Features
- **Email Integration**: Automated invoice delivery
- **SMS Notifications**: Payment reminders
- **Dashboard Integration**: Real-time monitoring
- **API Endpoints**: External system integration
- **Advanced Reporting**: Analytics and insights
- **Multi-currency Support**: International properties
- **Custom Templates**: Branded invoice designs
- **Payment Integration**: Online payment processing

### Scalability Considerations
- **Queue System**: Background job processing
- **Database Optimization**: Index optimization
- **Caching**: Reduce calculation overhead
- **Microservices**: Separate billing service
- **Load Balancing**: Multiple processing nodes

---

## 📞 Support

For technical support or questions about the Monthly Invoice Job System:

1. **Documentation**: Review this guide thoroughly
2. **Testing**: Use `--dry-run` for safe testing
3. **Logs**: Check Django logs for detailed error information
4. **Community**: Consult Django and property management forums
5. **Professional Support**: Contact system administrators

---

**🎯 The Monthly Invoice Job System provides enterprise-level automation for property management billing, ensuring accurate, timely, and comprehensive invoice generation with full audit trails and error handling.**