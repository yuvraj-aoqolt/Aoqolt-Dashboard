from django.db import migrations, models
import secrets


def populate_access_tokens(apps, schema_editor):
    SalesQuote = apps.get_model('sales', 'SalesQuote')
    for quote in SalesQuote.objects.filter(access_token=''):
        quote.access_token = secrets.token_urlsafe(48)
        quote.save(update_fields=['access_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='salesquote',
            name='access_token',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='salesquote',
            name='is_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='salesquote',
            name='sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='salesquote',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('pending', 'Pending'),
                    ('accepted', 'Accepted'),
                    ('rejected', 'Rejected'),
                    ('expired', 'Expired'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='salesquote',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='salesquote',
            name='amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.RunPython(populate_access_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='salesquote',
            name='access_token',
            field=models.CharField(blank=True, max_length=64, unique=True),
        ),
        migrations.AddIndex(
            model_name='salesquote',
            index=models.Index(fields=['access_token'], name='sales_quote_access_token_idx'),
        ),
    ]
