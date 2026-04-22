"""
WebSocket Consumer for Real-time Notifications
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from apps.notifications.models import Notification


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time user notifications
    
    URL: ws://localhost:8000/ws/notifications/
    """
    
    async def connect(self):
        """Accept WebSocket connection and join user's notification group"""
        self.user = self.scope['user']
        
        # Reject anonymous users
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Create unique group name for this user
        self.group_name = f'notifications_{self.user.id}'
        
        # Join notification group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation with unread count
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to notifications',
            'unread_count': unread_count
        }))
    
    async def disconnect(self, close_code):
        """Leave notification group on disconnect"""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'mark_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self.mark_notification_read(notification_id)
                    await self.send(text_data=json.dumps({
                        'type': 'notification_read',
                        'notification_id': notification_id
                    }))
            
            elif action == 'mark_all_read':
                await self.mark_all_read()
                await self.send(text_data=json.dumps({
                    'type': 'all_read',
                    'message': 'All notifications marked as read'
                }))
            
            elif action == 'get_unread_count':
                count = await self.get_unread_count()
                await self.send(text_data=json.dumps({
                    'type': 'unread_count',
                    'count': count
                }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def notification_message(self, event):
        """
        Receive notification from group and send to WebSocket
        Called when a new notification is created
        """
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['notification']
        }))
    
    async def notification_update(self, event):
        """
        Send notification update to WebSocket
        Called when notification status changes
        """
        await self.send(text_data=json.dumps({
            'type': 'notification_updated',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a single notification as read"""
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.is_read = True
            notification.save(update_fields=['is_read'])
            return True
        except Notification.DoesNotExist:
            return False
    
    @database_sync_to_async
    def mark_all_read(self):
        """Mark all user's notifications as read"""
        Notification.objects.filter(
            recipient=self.user,
            is_read=False
        ).update(is_read=True)
    
    @database_sync_to_async
    def get_unread_count(self):
        """Get count of unread notifications"""
        return Notification.objects.filter(
            recipient=self.user,
            is_read=False
        ).count()


# Utility function to send notifications via WebSocket
async def send_notification_to_user(user_id, notification_data):
    """
    Send notification to a specific user via WebSocket
    Can be called from anywhere in the app
    
    Usage:
        from apps.notifications.consumers import send_notification_to_user
        await send_notification_to_user(user.id, {
            'id': str(notification.id),
            'title': 'New Message',
            'message': 'You have a new message',
            'type': 'chat',
            'created_at': notification.created_at.isoformat(),
        })
    """
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    group_name = f'notifications_{user_id}'
    
    await channel_layer.group_send(
        group_name,
        {
            'type': 'notification_message',
            'notification': notification_data
        }
    )
