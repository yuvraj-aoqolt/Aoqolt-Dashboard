from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0013_booking_chat_locked'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='work_started',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='booking',
            name='work_started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
