from django.db import migrations


class Migration(migrations.Migration):
    """
    Set database-level DEFAULT values on columns that have a Django-side
    default but no corresponding Postgres DEFAULT constraint.  Without this,
    any INSERT that omits these columns raises a NOT NULL violation.
    """

    dependencies = [
        ('bookings', '0009_booking_is_guest_default'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE bookings ALTER COLUMN form2_submitted SET DEFAULT FALSE;",
                "ALTER TABLE bookings ALTER COLUMN is_guest SET DEFAULT FALSE;",
            ],
            reverse_sql=[
                "ALTER TABLE bookings ALTER COLUMN form2_submitted DROP DEFAULT;",
                "ALTER TABLE bookings ALTER COLUMN is_guest DROP DEFAULT;",
            ],
        ),
    ]
