"""
Payment Models - Multi-gateway payment integration (Stripe, Razorpay, PayPal)
"""
from django.db import models
from apps.accounts.models import User
from apps.bookings.models import Booking
import uuid


class Payment(models.Model):
    """
    Payment transactions - supports multiple payment gateways
    """
    # Gateway choices
    GATEWAY_STRIPE = 'stripe'
    GATEWAY_RAZORPAY = 'razorpay'
    GATEWAY_PAYPAL = 'paypal'

    GATEWAY_CHOICES = [
        (GATEWAY_STRIPE, 'Stripe'),
        (GATEWAY_RAZORPAY, 'Razorpay'),
        (GATEWAY_PAYPAL, 'PayPal'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_SUCCEEDED = 'succeeded'
    STATUS_FAILED = 'failed'
    STATUS_REFUNDED = 'refunded'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_SUCCEEDED, 'Succeeded'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_REFUNDED, 'Refunded'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment_number = models.CharField(max_length=30, unique=True, editable=False)

    # Relations
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    booking = models.OneToOneField(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment')

    # Payment details
    amount = models.IntegerField(help_text="Amount in cents")
    currency = models.CharField(max_length=3, default='USD')

    # Gateway
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, default=GATEWAY_STRIPE)

    # Generic gateway fields — works for Stripe, Razorpay, PayPal
    # Stripe:   gateway_payment_id = PaymentIntent ID,  gateway_order_id = Checkout Session ID
    # Razorpay: gateway_payment_id = payment_id,        gateway_order_id = order_id
    # PayPal:   gateway_payment_id = capture_id,        gateway_order_id = order_id
    gateway_payment_id = models.CharField(max_length=255, unique=True, help_text="Payment/Intent/Capture ID from the gateway")
    gateway_order_id = models.CharField(max_length=255, blank=True, help_text="Session/Order ID from the gateway")
    gateway_customer_id = models.CharField(max_length=255, blank=True, help_text="Customer ID from the gateway")
    gateway_request = models.JSONField(null=True, blank=True, help_text="Raw request payload sent to the gateway")
    gateway_response = models.JSONField(null=True, blank=True, help_text="Raw response received from the gateway")

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # Transaction metadata
    payment_method = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)

    # Refund
    refund_amount = models.IntegerField(default=0, help_text="Refunded amount in cents")
    refund_reason = models.TextField(blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['gateway_payment_id']),
            models.Index(fields=['gateway', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Payment {self.payment_number} - {self.user.email} - ${self.amount/100:.2f}"

    @property
    def amount_display(self):
        """Return amount in dollars"""
        return f"${self.amount / 100:.2f}"

    def save(self, *args, **kwargs):
        """Generate payment number on creation"""
        if not self.payment_number:
            import datetime
            today = datetime.date.today().strftime('%Y%m%d')
            last_payment = Payment.objects.filter(payment_number__startswith=f'PAY-{today}').order_by('-payment_number').first()

            if last_payment:
                last_num = int(last_payment.payment_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1

            self.payment_number = f'PAY-{today}-{new_num:05d}'

        super().save(*args, **kwargs)


class WebhookEvent(models.Model):
    """
    Log webhook events from any payment gateway for debugging and audit
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    gateway = models.CharField(max_length=20, choices=Payment.GATEWAY_CHOICES)
    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)

    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_webhook_events'
        verbose_name = 'Webhook Event'
        verbose_name_plural = 'Webhook Events'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.gateway}] {self.event_type} - {self.event_id}"
