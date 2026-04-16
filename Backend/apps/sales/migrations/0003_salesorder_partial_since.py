from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0002_add_quote_token_sent_draft'),
    ]

    operations = [
        migrations.AddField(
            model_name='salesorder',
            name='partial_since',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Timestamp of the first partial payment; used for 15-day overdue alerts.',
            ),
        ),
    ]
