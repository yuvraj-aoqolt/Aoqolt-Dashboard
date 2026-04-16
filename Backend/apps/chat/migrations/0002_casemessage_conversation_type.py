from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='casemessage',
            name='conversation_type',
            field=models.CharField(
                blank=True,
                choices=[('CLIENT', 'Client Thread'), ('ADMIN', 'Admin Thread')],
                db_index=True,
                help_text='CLIENT = SuperAdmin\u2194Client thread; ADMIN = SuperAdmin\u2194Admin thread. Null = legacy.',
                max_length=10,
                null=True,
            ),
        ),
    ]
