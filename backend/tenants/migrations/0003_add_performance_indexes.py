from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('tenants', '0002_lease'),
    ]

    operations = [
        # Add indexes for commonly queried fields
        migrations.AddIndex(
            model_name='tenant',
            index=models.Index(fields=['status'], name='tenant_status_idx'),
        ),
        migrations.AddIndex(
            model_name='tenant',
            index=models.Index(fields=['employment_status'], name='tenant_employment_idx'),
        ),
        migrations.AddIndex(
            model_name='tenant',
            index=models.Index(fields=['created_at'], name='tenant_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='tenant',
            index=models.Index(fields=['tenant_code'], name='tenant_code_idx'),
        ),
    ] 