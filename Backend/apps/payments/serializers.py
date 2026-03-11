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
    """Simplified serializer for listing payments"""
    amount_display = serializers.ReadOnlyField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'user_email', 'service_name',
            'amount_display', 'status', 'created_at', 'paid_at'
        ]
