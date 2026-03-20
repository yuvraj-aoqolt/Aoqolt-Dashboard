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
    
    class Meta:
        model = CaseMessage
        fields = [
            'id', 'case', 'sender', 'sender_name', 'sender_role',
            'message_type', 'message', 'file_url', 'is_read',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'created_at', 'updated_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseMessage
        fields = ['case', 'message_type', 'message', 'file_url']
    
    def create(self, validated_data):
        request = self.context.get('request')
        message = CaseMessage.objects.create(
            sender=request.user,
            **validated_data
        )
        return message


class MessageReadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReadStatus
        fields = ['id', 'message', 'user', 'is_read', 'read_at']
