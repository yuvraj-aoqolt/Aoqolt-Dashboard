"""
Serializers for Chat
"""
from rest_framework import serializers
from .models import CaseMessage, MessageReadStatus
from apps.accounts.serializers import UserListSerializer


class CaseMessageSerializer(serializers.ModelSerializer):
    sender = UserListSerializer(read_only=True)
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    is_edited = serializers.SerializerMethodField()

    def get_is_edited(self, obj):
        return (obj.updated_at - obj.created_at).total_seconds() > 5

    class Meta:
        model = CaseMessage
        fields = [
            'id', 'case', 'booking', 'source_type', 'sender', 'sender_name', 'sender_role',
            'message_type', 'message', 'file_url', 'is_read', 'is_edited',
            'conversation_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'created_at', 'updated_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    message = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = CaseMessage
        fields = ['case', 'booking', 'source_type', 'message_type', 'message', 'file_url', 'conversation_type']

    def validate(self, data):
        src = data.get('source_type', 'CASE')
        if src == 'BOOKING':
            if not data.get('booking'):
                raise serializers.ValidationError('booking is required for source_type=BOOKING')
            # Booking chats are always admin-only
            data['conversation_type'] = 'ADMIN'
            data['case'] = None
        else:
            if not data.get('case'):
                raise serializers.ValidationError('case is required for source_type=CASE')
            data['booking'] = None
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        src = validated_data.get('source_type', 'CASE')
        # Auto-set conversation_type for CASE threads based on sender role
        if src == 'CASE' and not validated_data.get('conversation_type'):
            case = validated_data.get('case')
            # For guest cases, prevent CLIENT thread - only allow ADMIN thread
            if case and hasattr(case, 'client') and case.client and getattr(case.client, 'is_guest', False):
                # Guest clients cannot send messages to their cases
                if request.user == case.client:
                    raise serializers.ValidationError({
                        'error': 'Guest users cannot send messages. Please contact support for assistance.'
                    })
                # Admins/superadmins can only use ADMIN thread for guest cases
                validated_data['conversation_type'] = 'ADMIN'
            elif request.user.is_admin:
                validated_data['conversation_type'] = 'ADMIN'
            else:
                validated_data.setdefault('conversation_type', 'CLIENT')
        return CaseMessage.objects.create(sender=request.user, **validated_data)


class MessageReadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReadStatus
        fields = ['id', 'message', 'user', 'is_read', 'read_at']
