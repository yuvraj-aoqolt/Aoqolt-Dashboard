"""
Serializers for Cases
"""
from rest_framework import serializers
from apps.accounts.serializers import UserListSerializer
from apps.bookings.serializers import BookingSerializer
from .models import Case, CaseAssignment, CaseResult, CaseResultAttachment, CaseStatusHistory


class CaseResultAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseResultAttachment
        fields = ['id', 'file', 'file_name', 'file_type', 'file_size', 'uploaded_at']


class CaseResultSerializer(serializers.ModelSerializer):
    attachments = CaseResultAttachmentSerializer(many=True, read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = CaseResult
        fields = [
            'id', 'case', 'result_text', 'result_file', 'additional_notes',
            'uploaded_by', 'uploaded_by_name', 'attachments',
            'client_viewed', 'client_viewed_at', 'client_rating', 'client_feedback',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'client_viewed', 'client_viewed_at', 'created_at', 'updated_at']


class CaseStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)
    
    class Meta:
        model = CaseStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_by_name', 'notes', 'changed_at']


class CaseAssignmentSerializer(serializers.ModelSerializer):
    admin_name = serializers.CharField(source='admin.full_name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True)
    
    class Meta:
        model = CaseAssignment
        fields = [
            'id', 'case', 'admin', 'admin_name', 'assigned_by', 'assigned_by_name',
            'notes', 'assigned_at', 'unassigned_at', 'is_active'
        ]
        read_only_fields = ['id', 'assigned_at']


class CaseSerializer(serializers.ModelSerializer):
    """Full case serializer"""
    booking = BookingSerializer(read_only=True)
    client = UserListSerializer(read_only=True)
    assigned_admin = UserListSerializer(read_only=True)
    result = CaseResultSerializer(read_only=True)
    status_history = CaseStatusHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'booking', 'client', 'assigned_admin',
            'status', 'priority', 'admin_notes', 'result', 'status_history',
            'created_at', 'updated_at', 'assigned_at', 'started_at',
            'completed_at', 'expected_completion_date'
        ]
        read_only_fields = [
            'id', 'case_number', 'client', 'created_at', 'updated_at',
            'assigned_at', 'started_at', 'completed_at'
        ]


class CaseListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing cases — uses booking form 1 data as primary source"""
    client_name  = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_phone = serializers.SerializerMethodField()
    admin_name   = serializers.CharField(source='assigned_admin.full_name', read_only=True)
    service_name = serializers.SerializerMethodField()
    booking_id   = serializers.SerializerMethodField()

    def get_client_name(self, obj):
        """Prefer booking Form 1 full_name, fall back to user account name"""
        try:
            if obj.booking and obj.booking.full_name:
                return obj.booking.full_name
        except Exception:
            pass
        return obj.client.full_name if obj.client else ''

    def get_client_email(self, obj):
        """Prefer booking Form 1 email, fall back to user account email"""
        try:
            if obj.booking and obj.booking.email:
                return obj.booking.email
        except Exception:
            pass
        return obj.client.email if obj.client else ''

    def get_client_phone(self, obj):
        try:
            if obj.booking:
                cc = obj.booking.phone_country_code or ''
                ph = obj.booking.phone_number or ''
                return f"{cc}{ph}".strip() or None
        except Exception:
            pass
        return None

    def get_service_name(self, obj):
        try:
            return obj.booking.service.name if obj.booking and obj.booking.service else None
        except Exception:
            return None

    def get_booking_id(self, obj):
        try:
            return obj.booking.booking_id if obj.booking else None
        except Exception:
            return None

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'source', 'booking_id',
            'client_name', 'client_email', 'client_phone',
            'admin_name', 'service_name', 'status', 'priority',
            'created_at', 'updated_at', 'assigned_at', 'started_at', 'completed_at',
            'expected_completion_date',
        ]


class CaseAssignSerializer(serializers.Serializer):
    """Serializer for assigning case to admin"""
    admin_id = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


class CaseStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating case status"""
    status = serializers.ChoiceField(choices=Case.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)
