from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('properties', '0001_initial'),
    ]

    operations = [
        # Add indexes for commonly queried fields
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['status', 'is_active'], name='property_status_active_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['property_type', 'status'], name='property_type_status_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['city', 'province'], name='property_location_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['created_at'], name='property_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['monthly_rental_amount'], name='property_rent_idx'),
        ),
    ] 