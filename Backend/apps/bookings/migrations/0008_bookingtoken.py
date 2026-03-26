import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0007_add_form2_security_fields'),
        ('services', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BookingToken',
            fields=[
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_used', models.BooleanField(default=False)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('booking', models.OneToOneField(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='initiation_token',
                    to='bookings.booking',
                )),
                ('service', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='booking_tokens',
                    to='services.service',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='booking_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Booking Token',
                'verbose_name_plural': 'Booking Tokens',
                'db_table': 'booking_tokens',
            },
        ),
        migrations.AddIndex(
            model_name='bookingtoken',
            index=models.Index(fields=['user', 'is_used'], name='booking_tok_user_id_is_used_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingtoken',
            index=models.Index(fields=['expires_at'], name='booking_tok_expires_at_idx'),
        ),
    ]
