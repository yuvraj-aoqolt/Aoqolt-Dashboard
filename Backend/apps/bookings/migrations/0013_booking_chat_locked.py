from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0012_rename_booking_tok_user_id_is_used_idx_booking_tok_user_id_5e2a14_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='chat_locked',
            field=models.BooleanField(default=False),
        ),
    ]
