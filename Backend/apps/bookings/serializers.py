"""
Serializers for Bookings
"""
from rest_framework import serializers
from .models import Booking, BookingDetail, BookingAttachment
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
    """Serializer for creating booking (first form)"""
    
    # Make service optional - can be auto-resolved from selected_service
    service = serializers.UUIDField(required=False, allow_null=True)
    selected_service = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'user', 'service', 'full_name', 'phone_number', 'email',
            'address', 'country', 'city', 'postal_code',
            'special_note', 'selected_service', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'booking_id', 'user', 'status', 'created_at']
    
    def validate(self, attrs):
        """Auto-fill from user data and resolve service from selected_service"""
        from apps.services.models import Service
        
        # Auto-resolve service from selected_service
        selected_service = attrs.get('selected_service')
        service = attrs.get('service')
        
        # If selected_service is provided, auto-fetch the Service object
        if selected_service and not service:
            try:
                service_obj = Service.objects.get(service_type=selected_service, is_active=True)
                attrs['service'] = service_obj
            except Service.DoesNotExist:
                raise serializers.ValidationError({
                    'selected_service': f'Service type "{selected_service}" not found or inactive'
                })
        
        # If service UUID is provided directly, fetch the Service object
        elif service and not selected_service:
            try:
                service_obj = Service.objects.get(id=service, is_active=True)
                attrs['service'] = service_obj
                attrs['selected_service'] = service_obj.service_type
            except Service.DoesNotExist:
                raise serializers.ValidationError({
                    'service': 'Service not found or inactive'
                })
        
        # If neither is provided, raise error
        elif not service and not selected_service:
            raise serializers.ValidationError({
                'service': 'Either service ID or selected_service type must be provided'
            })
        
        # Auto-fill from user data if not provided
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user = request.user
            # Prefill with user data but allow edits
            if not attrs.get('full_name'):
                attrs['full_name'] = user.full_name
            if not attrs.get('phone_number'):
                attrs['phone_number'] = user.phone_number
            if not attrs.get('email'):
                attrs['email'] = user.email
            if not attrs.get('address'):
                attrs['address'] = user.address or ''
            if not attrs.get('city'):
                attrs['city'] = user.city or ''
            if not attrs.get('country'):
                attrs['country'] = user.country or ''
            if not attrs.get('postal_code'):
                attrs['postal_code'] = user.postal_code or ''
        
        return attrs
    
    def create(self, validated_data):
        """Create booking with user"""
        request = self.context.get('request')
        booking = Booking.objects.create(
            user=request.user,
            **validated_data
        )
        return booking
    
    def to_representation(self, instance):
        """Customize response to show service name instead of UUID"""
        representation = super().to_representation(instance)
        # Replace service UUID with service name
        if instance.service:
            representation['service'] = instance.service.name
        return representation


class BookingSerializer(serializers.ModelSerializer):
    """Full booking serializer"""
    service = ServiceListSerializer(read_only=True)
    details = BookingDetailSerializer(read_only=True)
    attachments = BookingAttachmentSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'user', 'user_email', 'user_name', 'service',
            'full_name', 'phone_number', 'email', 'address',
            'country', 'city', 'postal_code', 'special_note',
            'selected_service', 'status', 'details', 'attachments',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'booking_id', 'user', 'status', 'created_at', 'updated_at', 'completed_at']


class BookingListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing bookings"""
    service_name = serializers.CharField(source='service.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'user_email', 'full_name', 'service_name',
            'status', 'created_at'
        ]
