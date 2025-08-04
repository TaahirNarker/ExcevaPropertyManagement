from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('leases', '0006_add_lease_notes'),
    ]

    operations = [
        # Add indexes for commonly queried fields
        migrations.AddIndex(
            model_name='lease',
            index=models.Index(fields=['status'], name='lease_status_idx'),
        ),
        migrations.AddIndex(
            model_name='lease',
            index=models.Index(fields=['start_date', 'end_date'], name='lease_dates_idx'),
        ),
        migrations.AddIndex(
            model_name='lease',
            index=models.Index(fields=['property', 'status'], name='lease_property_status_idx'),
        ),
        migrations.AddIndex(
            model_name='lease',
            index=models.Index(fields=['tenant', 'status'], name='lease_tenant_status_idx'),
        ),
        migrations.AddIndex(
            model_name='lease',
            index=models.Index(fields=['created_at'], name='lease_created_at_idx'),
        ),
    ] 