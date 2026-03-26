"""
Serializers for Bookings
"""
from rest_framework import serializers
from .models import Booking, BookingDetail, BookingAttachment, BookingToken
from apps.services.serializers import ServiceListSerializer


class BookingAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingAttachment
        fields = ['id', 'file', 'file_type', 'file_name', 'file_size', 'description', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class BookingDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingDetail
        fields = [
            'id', 'additional_notes', 'family_member_count', 'family_member_details',
            'birth_date', 'birth_time', 'birth_place', 'custom_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new booking via a single-use BookingToken.
    The `booking_token` field is write-only and drives service resolution.
    The service is derived exclusively from the validated token — it cannot
    be supplied or overridden by the client.
    """
    booking_token = serializers.UUIDField(write_only=True, required=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'booking_token',
            'full_name', 'phone_country_code', 'phone_number',
            'email', 'address', 'country', 'state', 'city', 'postal_code',
            'special_note', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'booking_id', 'status', 'created_at']

    def validate(self, attrs):
        from django.utils import timezone

        token_value = attrs.pop('booking_token')

        try:
            booking_token = BookingToken.objects.select_related('service', 'user').get(
                token=token_value
            )
        except (BookingToken.DoesNotExist, ValueError):
            raise serializers.ValidationError({'booking_token': 'Invalid booking token.'})

        request = self.context.get('request')

        if booking_token.user_id != request.user.id:
            raise serializers.ValidationError(
                {'booking_token': 'This token does not belong to your account.'}
            )

        if booking_token.is_used:
            raise serializers.ValidationError(
                {'booking_token': 'This booking link has already been used.'}
            )

        if booking_token.expires_at < timezone.now():
            raise serializers.ValidationError(
                {'booking_token': 'This booking link has expired. Please start a new booking.'}
            )

        # Derive service from token — client cannot override this
        service = booking_token.service
        attrs['service'] = service
        attrs['selected_service'] = service.service_type

        # Store token reference so create() can consume it
        self._booking_token = booking_token

        # Pre-fill missing fields from user profile
        user = request.user
        if not attrs.get('full_name'):
            attrs['full_name'] = getattr(user, 'full_name', '') or ''
        if not attrs.get('phone_number'):
            attrs['phone_number'] = getattr(user, 'phone_number', '') or ''
        if not attrs.get('email'):
            attrs['email'] = user.email or ''
        if not attrs.get('phone_country_code'):
            attrs['phone_country_code'] = getattr(user, 'country_code', None) or '+1'
        if not attrs.get('address'):
            attrs['address'] = getattr(user, 'address', None) or ''
        if not attrs.get('city'):
            attrs['city'] = getattr(user, 'city', None) or ''
        if not attrs.get('country'):
            attrs['country'] = getattr(user, 'country', None) or ''
        if not attrs.get('state'):
            attrs['state'] = ''
        if not attrs.get('postal_code'):
            attrs['postal_code'] = getattr(user, 'postal_code', None) or ''

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        booking = Booking.objects.create(user=request.user, **validated_data)

        # Consume the token — mark as used and link to the new booking
        booking_token = getattr(self, '_booking_token', None)
        if booking_token:
            booking_token.is_used = True
            booking_token.booking = booking
            booking_token.save(update_fields=['is_used', 'booking'])

        return booking

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.service:
            rep['service'] = instance.service.name
            rep['service_id'] = str(instance.service.id)
        rep['form2_token'] = str(instance.form2_token) if instance.form2_token else None
        return rep


class BookingSerializer(serializers.ModelSerializer):
    """Full booking serializer"""
    service = ServiceListSerializer(read_only=True)
    details = BookingDetailSerializer(read_only=True)
    attachments = BookingAttachmentSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    case_id = serializers.SerializerMethodField()
    case_number = serializers.SerializerMethodField()

    def get_case_id(self, obj):
        try:
            return str(obj.case.id)
        except Exception:
            return None

    def get_case_number(self, obj):
        try:
            return obj.case.case_number
        except Exception:
            return None

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'user', 'user_email', 'user_name', 'service',
            'full_name', 'phone_country_code', 'phone_number', 'email', 'address',
            'country', 'state', 'city', 'postal_code', 'special_note',
            'selected_service', 'status', 'case_id', 'case_number',
            'form2_token', 'form2_submitted',
            'details', 'attachments',
            'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = [
            'id', 'booking_id', 'user', 'status',
            'form2_token', 'form2_submitted',
            'created_at', 'updated_at', 'completed_at',
        ]

class BookingEditForm1Serializer(serializers.ModelSerializer):
    """Serializer for superadmin directly editing Form 1 (personal/contact details)."""
    class Meta:
        model = Booking
        fields = [
            'full_name', 'phone_country_code', 'phone_number', 'email',
            'address', 'country', 'state', 'city', 'postal_code', 'special_note'
        ]


class BookingEditForm2Serializer(serializers.ModelSerializer):
    """Serializer for superadmin directly editing Form 2 (service-specific details)."""
    class Meta:
        model = BookingDetail
        fields = [
            'additional_notes', 'family_member_count', 'family_member_details',
            'birth_date', 'birth_time', 'birth_place', 'custom_data'
        ]

class BookingListSerializer(serializers.ModelSerializer):
    """Serializer for listing bookings — includes details and attachments for superadmin."""
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_type = serializers.CharField(source='service.service_type', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    case_id = serializers.SerializerMethodField()
    case_number = serializers.SerializerMethodField()
    details = BookingDetailSerializer(read_only=True)
    attachments = BookingAttachmentSerializer(many=True, read_only=True)

    def get_case_id(self, obj):
        try:
            return str(obj.case.id)
        except Exception:
            return None

    def get_case_number(self, obj):
        try:
            return obj.case.case_number
        except Exception:
            return None

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'user_email', 'full_name', 'phone_country_code', 'phone_number',
            'email', 'address', 'country', 'state', 'city', 'postal_code', 'special_note',
            'service_name', 'service_type', 'selected_service',
            'status', 'case_id', 'case_number',
            'form2_submitted',
            'details', 'attachments',
            'created_at',
        ]
