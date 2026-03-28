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
    """Simplified serializer for listing cases"""
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    admin_name = serializers.CharField(source='assigned_admin.full_name', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)
    
    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'client_name', 'client_email',
            'admin_name', 'service_name', 'status', 'priority',
            'created_at', 'expected_completion_date'
        ]


class CaseAssignSerializer(serializers.Serializer):
    """Serializer for assigning case to admin"""
    admin_id = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


class CaseStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating case status"""
    status = serializers.ChoiceField(choices=Case.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)
