from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0001_initial'),
        ('bookings', '0002_booking_booking_id_and_more'),
    ]

    operations = [
        # 1. Make booking nullable
        migrations.AlterField(
            model_name='case',
            name='booking',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='case',
                to='bookings.booking',
            ),
        ),
        # 2. Add source field
        migrations.AddField(
            model_name='case',
            name='source',
            field=models.CharField(
                choices=[('booking', 'Booking'), ('sales', 'Sales')],
                default='booking',
                max_length=20,
            ),
        ),
    ]
