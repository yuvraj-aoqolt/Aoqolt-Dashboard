from rest_framework import serializers
from .models import AuraSession
from apps.bookings.models import Booking


class AuraSessionSerializer(serializers.ModelSerializer):
    booking_ref     = serializers.CharField(source='booking.booking_id', read_only=True)
    client_name     = serializers.SerializerMethodField()
    service_type    = serializers.CharField(source='booking.service.service_type', read_only=True)
    service_name    = serializers.CharField(source='booking.service.name', read_only=True)
    link_expired    = serializers.SerializerMethodField()

    class Meta:
        model  = AuraSession
        fields = [
            'id',
            'booking_ref',
            'client_name',
            'client_email',
            'service_type',
            'service_name',
            'status',
            'session_link_token',
            'link_expiry',
            'link_expired',
            'session_start',
            'session_end',
            'client_timezone',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'booking_ref', 'client_name', 'service_type', 'service_name',
            'session_link_token', 'link_expiry', 'link_expired',
            'created_at', 'updated_at',
        ]

    def get_client_name(self, obj):
        return obj.booking.full_name or ''

    def get_link_expired(self, obj):
        from django.utils import timezone
        if obj.link_expiry is None:
            return None
        return timezone.now() > obj.link_expiry


class PublicSessionSerializer(serializers.ModelSerializer):
    """Minimal read-only serializer for the public slot-booking page."""
    booking_ref  = serializers.CharField(source='booking.booking_id', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)
    link_expired = serializers.SerializerMethodField()

    class Meta:
        model  = AuraSession
        fields = [
            'id',
            'booking_ref',
            'service_name',
            'status',
            'link_expiry',
            'link_expired',
            'session_start',
            'session_end',
            'client_timezone',
        ]

    def get_link_expired(self, obj):
        from django.utils import timezone
        if obj.link_expiry is None:
            return None
        return timezone.now() > obj.link_expiry


class BookSlotSerializer(serializers.Serializer):
    """Payload for the client's slot-booking action."""
    session_start   = serializers.DateTimeField()
    session_end     = serializers.DateTimeField()
    client_timezone = serializers.CharField(
        max_length=100,
        default='UTC',
        required=False,
        help_text='IANA timezone string auto-detected from client browser.',
    )

    def validate_client_timezone(self, value):
        """Accept any string; invalid zones fall back to UTC server-side."""
        return value or 'UTC'

    def validate(self, data):
        from django.utils import timezone
        if data['session_start'] >= data['session_end']:
            raise serializers.ValidationError('session_start must be before session_end.')
        if data['session_start'] < timezone.now():
            raise serializers.ValidationError('Cannot book a slot in the past.')
        return data
