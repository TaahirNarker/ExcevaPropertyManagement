from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('debt_management', '0001_initial'),
    ]

    operations = [
        # Add indexes for commonly queried fields
        migrations.AddIndex(
            model_name='debtor',
            index=models.Index(fields=['status'], name='debtor_status_idx'),
        ),
        migrations.AddIndex(
            model_name='debtor',
            index=models.Index(fields=['assigned_to'], name='debtor_assigned_to_idx'),
        ),
        migrations.AddIndex(
            model_name='debtor',
            index=models.Index(fields=['created_at'], name='debtor_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='debtor',
            index=models.Index(fields=['last_contact'], name='debtor_last_contact_idx'),
        ),
        migrations.AddIndex(
            model_name='debtor',
            index=models.Index(fields=['total_debt'], name='debtor_total_debt_idx'),
        ),
        # Debt document indexes
        migrations.AddIndex(
            model_name='debtdocument',
            index=models.Index(fields=['debtor'], name='debtdocument_debtor_idx'),
        ),
        migrations.AddIndex(
            model_name='debtdocument',
            index=models.Index(fields=['document_type'], name='debtdocument_type_idx'),
        ),
        migrations.AddIndex(
            model_name='debtdocument',
            index=models.Index(fields=['uploaded_at'], name='debtdocument_uploaded_at_idx'),
        ),
        # Debt payment indexes
        migrations.AddIndex(
            model_name='debtpayment',
            index=models.Index(fields=['debtor'], name='debtpayment_debtor_idx'),
        ),
        migrations.AddIndex(
            model_name='debtpayment',
            index=models.Index(fields=['payment_date'], name='debtpayment_date_idx'),
        ),
        migrations.AddIndex(
            model_name='debtpayment',
            index=models.Index(fields=['payment_method'], name='debtpayment_method_idx'),
        ),
        # Debt audit log indexes
        migrations.AddIndex(
            model_name='debtauditlog',
            index=models.Index(fields=['debtor'], name='debtauditlog_debtor_idx'),
        ),
        migrations.AddIndex(
            model_name='debtauditlog',
            index=models.Index(fields=['action'], name='debtauditlog_action_idx'),
        ),
        migrations.AddIndex(
            model_name='debtauditlog',
            index=models.Index(fields=['timestamp'], name='debtauditlog_timestamp_idx'),
        ),
    ] 