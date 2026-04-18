from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'case_id', 'booking_id', 'payment_id', 'order_id',
            'metadata', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['created_at', 'read_at']
    
    def to_representation(self, instance):
        """Add computed fields for frontend convenience"""
        data = super().to_representation(instance)
        
        # Add time_ago helper
        from django.utils.timezone import now
        diff = (now() - instance.created_at).total_seconds()
        if diff < 60:
            data['time_ago'] = 'just now'
        elif diff < 3600:
            data['time_ago'] = f'{int(diff / 60)}m ago'
        elif diff < 86400:
            data['time_ago'] = f'{int(diff / 3600)}h ago'
        else:
            data['time_ago'] = instance.created_at.strftime('%b %d')
        
        return data


class NotificationStatsSerializer(serializers.Serializer):
    """Stats about notifications"""
    total_unread = serializers.IntegerField()
    unread_by_type = serializers.DictField()
    recent_count = serializers.IntegerField()
