"""
Migration:
- Makes User.phone_number nullable (supports invited users created without a phone number)
- Creates the InvitationToken model for admin-controlled account activation and password resets
"""
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_is_guest'),
    ]

    operations = [
        # Allow phone_number to be NULL so SuperAdmin can create users without it
        migrations.AlterField(
            model_name='user',
            name='phone_number',
            field=models.CharField(
                blank=True,
                max_length=17,
                null=True,
                unique=True,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed.",
                        regex='^\\+?1?\\d{9,15}$',
                    )
                ],
            ),
        ),
        # Create InvitationToken table
        migrations.CreateModel(
            name='InvitationToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(db_index=True, max_length=64, unique=True)),
                ('token_type', models.CharField(
                    choices=[('invite', 'Account Invitation'), ('reset', 'Admin Password Reset')],
                    default='invite',
                    max_length=10,
                )),
                ('is_used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='invitation_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_invitation_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Invitation Token',
                'verbose_name_plural': 'Invitation Tokens',
                'db_table': 'invitation_tokens',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='invitationtoken',
            index=models.Index(fields=['token'], name='invitation_token_idx'),
        ),
        migrations.AddIndex(
            model_name='invitationtoken',
            index=models.Index(fields=['user', 'token_type', 'is_used'], name='invitation_user_type_idx'),
        ),
    ]
