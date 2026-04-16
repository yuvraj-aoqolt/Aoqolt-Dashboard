"""
Serializers for Payments
"""
from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    amount_display = serializers.ReadOnlyField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    booking_id = serializers.UUIDField(source='booking.id', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'user', 'user_email', 'booking', 'booking_id',
            'service_name', 'amount', 'amount_display', 'currency',
            'gateway', 'gateway_payment_id', 'gateway_order_id',
            'status', 'payment_method', 'description',
            'refund_amount', 'refund_reason', 'refunded_at',
            'created_at', 'updated_at', 'paid_at'
        ]
        read_only_fields = [
            'id', 'payment_number', 'user', 'gateway', 'gateway_payment_id',
            'gateway_order_id', 'status', 'created_at', 'updated_at', 'paid_at'
        ]


class PaymentCreateSerializer(serializers.Serializer):
    """Serializer for creating a checkout session (gateway-agnostic)"""
    booking_id = serializers.UUIDField()
    gateway = serializers.ChoiceField(choices=['stripe', 'razorpay', 'paypal'], default='stripe')
    success_url = serializers.URLField()
    cancel_url = serializers.URLField()


class PaymentListSerializer(serializers.ModelSerializer):
    """Full serializer for the invoice list — all details needed for invoice page"""
    amount_display = serializers.ReadOnlyField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)
    service_type = serializers.CharField(source='booking.service.service_type', read_only=True, default='')
    customer_name = serializers.CharField(source='booking.full_name', read_only=True, default='')
    booking_ref = serializers.CharField(source='booking.booking_id', read_only=True, default='')
    customer_email = serializers.EmailField(source='booking.email', read_only=True, default='')
    customer_city = serializers.CharField(source='booking.city', read_only=True, default='')
    customer_country = serializers.CharField(source='booking.country', read_only=True, default='')
    customer_phone = serializers.SerializerMethodField()
    case_number = serializers.SerializerMethodField()

    def get_customer_phone(self, obj):
        b = obj.booking
        if not b:
            return ''
        return f"{b.phone_country_code}{b.phone_number}".strip()

    def get_case_number(self, obj):
        try:
            return obj.booking.case.case_number
        except Exception:
            return ''

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number',
            'customer_name', 'customer_email', 'customer_phone',
            'customer_city', 'customer_country',
            'user_email',
            'service_name', 'service_type',
            'booking_ref', 'case_number',
            'amount', 'amount_display', 'currency',
            'gateway', 'payment_method',
            'status', 'created_at', 'paid_at',
        ]
