"""
Migration: add can_manage_blogs boolean to User model.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_invitationtoken_user_phone_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='can_manage_blogs',
            field=models.BooleanField(
                default=False,
                help_text='Grants permission to create and manage blog posts.',
            ),
        ),
    ]
