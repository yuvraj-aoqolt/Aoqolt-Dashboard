from django.db import migrations


def mark_sales_cases(apps, schema_editor):
    """
    Cases that have an accepted SalesQuote with a SalesOrder were originally
    created from bookings but transitioned into a sales/treatment flow.
    Mark them as source='sales' so they appear in the Sales section of
    Aura Assignments.
    """
    Case = apps.get_model('cases', 'Case')
    SalesOrder = apps.get_model('sales', 'SalesOrder')

    # Collect case IDs that have at least one sales order (via quote)
    case_ids = list(
        SalesOrder.objects.values_list('quote__case_id', flat=True).distinct()
    )
    if case_ids:
        Case.objects.filter(id__in=case_ids).update(source='sales')


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0002_case_booking_nullable_source'),
        ('sales', '0002_add_quote_token_sent_draft'),
    ]

    operations = [
        migrations.RunPython(mark_sales_cases, migrations.RunPython.noop),
    ]
