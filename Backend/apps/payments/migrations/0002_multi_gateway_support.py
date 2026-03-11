"""
Migration: Replace Stripe-specific fields with generic multi-gateway fields.
Supports Stripe, Razorpay, and PayPal.
"""
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        # 1. Remove the Stripe-specific index before removing the field
        migrations.RemoveIndex(
            model_name='payment',
            name='payments_stripe__6cb0ea_idx',
        ),

        # 2. Add gateway selector
        migrations.AddField(
            model_name='payment',
            name='gateway',
            field=models.CharField(
                choices=[('stripe', 'Stripe'), ('razorpay', 'Razorpay'), ('paypal', 'PayPal')],
                default='stripe',
                max_length=20,
            ),
        ),

        # 3. Add generic gateway fields (initially blank/nullable so existing rows are safe)
        migrations.AddField(
            model_name='payment',
            name='gateway_payment_id',
            field=models.CharField(blank=True, default='', max_length=255,
                                   help_text='Payment/Intent/Capture ID from the gateway'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='payment',
            name='gateway_order_id',
            field=models.CharField(blank=True, max_length=255,
                                   help_text='Session/Order ID from the gateway'),
        ),
        migrations.AddField(
            model_name='payment',
            name='gateway_customer_id',
            field=models.CharField(blank=True, max_length=255,
                                   help_text='Customer ID from the gateway'),
        ),
        migrations.AddField(
            model_name='payment',
            name='gateway_response',
            field=models.JSONField(blank=True, null=True,
                                   help_text='Full raw response from the gateway'),
        ),

        # 4. Remove old Stripe-specific fields
        migrations.RemoveField(
            model_name='payment',
            name='stripe_payment_intent_id',
        ),
        migrations.RemoveField(
            model_name='payment',
            name='stripe_checkout_session_id',
        ),
        migrations.RemoveField(
            model_name='payment',
            name='stripe_customer_id',
        ),

        # 5. Now enforce unique constraint on gateway_payment_id
        migrations.AlterField(
            model_name='payment',
            name='gateway_payment_id',
            field=models.CharField(
                max_length=255,
                unique=True,
                help_text='Payment/Intent/Capture ID from the gateway',
            ),
        ),

        # 6. Add new indexes
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['gateway_payment_id'], name='payments_gateway_payment_id_idx'),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['gateway', 'status'], name='payments_gateway_status_idx'),
        ),

        # 7. Drop StripeWebhookEvent table
        migrations.DeleteModel(
            name='StripeWebhookEvent',
        ),

        # 8. Create generic WebhookEvent table
        migrations.CreateModel(
            name='WebhookEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('gateway', models.CharField(
                    choices=[('stripe', 'Stripe'), ('razorpay', 'Razorpay'), ('paypal', 'PayPal')],
                    max_length=20,
                )),
                ('event_id', models.CharField(max_length=255, unique=True)),
                ('event_type', models.CharField(max_length=100)),
                ('payload', models.JSONField()),
                ('processed', models.BooleanField(default=False)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Webhook Event',
                'verbose_name_plural': 'Webhook Events',
                'db_table': 'payment_webhook_events',
                'ordering': ['-created_at'],
            },
        ),
    ]
