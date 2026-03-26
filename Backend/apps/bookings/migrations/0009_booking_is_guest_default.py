from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Re-adds is_guest to the Django model state (it already exists in the DB
    from migration 0006) and sets a database-level default of False so that
    any INSERT that omits the column won't violate the NOT NULL constraint.
    """

    dependencies = [
        ('bookings', '0008_bookingtoken'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='is_guest',
            field=models.BooleanField(default=False),
        ),
    ]
