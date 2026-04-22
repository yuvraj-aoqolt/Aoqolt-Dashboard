"""
WebSocket Consumers for Real-time Chat
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from apps.accounts.models import User
from apps.chat.models import CaseMessage
from apps.cases.models import Case
from apps.bookings.models import Booking


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat messages
    
    URL patterns:
    - ws://localhost:8000/ws/chat/case/<case_id>/
    - ws://localhost:8000/ws/chat/booking/<booking_id>/
    """
    
    async def connect(self):
        """Accept WebSocket connection and join room group"""
        self.user = self.scope['user']
        
        # Reject anonymous users
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Determine room type from URL
        self.room_type = self.scope['url_route']['kwargs'].get('room_type')  # 'case' or 'booking'
        self.room_id = self.scope['url_route']['kwargs'].get('room_id')
        
        # Verify user has access to this chat room
        has_access = await self.check_access()
        if not has_access:
            await self.close()
            return
        
        # Join room group
        self.room_group_name = f'chat_{self.room_type}_{self.room_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to chat'
        }))
    
    async def disconnect(self, close_code):
        """Leave room group on disconnect"""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Receive message from WebSocket and broadcast to room"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'text')
            
            if message_type == 'text':
                message_text = data.get('message', '')
                conversation_type = data.get('conversation_type')  # For cases: 'CLIENT' or 'ADMIN'
                
                if not message_text.strip():
                    return
                
                # Save message to database
                message = await self.save_message(message_text, conversation_type)
                
                # Broadcast message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': {
                            'id': str(message.id),
                            'message': message.message,
                            'sender': {
                                'id': str(message.sender.id),
                                'full_name': message.sender.full_name,
                                'role': message.sender.role,
                            },
                            'message_type': message.message_type,
                            'conversation_type': message.conversation_type,
                            'timestamp': message.created_at.isoformat(),
                            'is_read': message.is_read,
                        }
                    }
                )
            
            elif message_type == 'typing':
                # Broadcast typing indicator
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'typing_indicator',
                        'user_id': str(self.user.id),
                        'user_name': self.user.full_name,
                        'is_typing': data.get('is_typing', False)
                    }
                )
            
            elif message_type == 'mark_read':
                # Mark messages as read
                await self.mark_messages_read()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'messages_read',
                        'user_id': str(self.user.id)
                    }
                )
        
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
    
    async def chat_message(self, event):
        """Receive message from room group and send to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'data': event['message']
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send typing indicator to the user who is typing
        if str(self.user.id) != event['user_id']:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'is_typing': event['is_typing']
            }))
    
    async def messages_read(self, event):
        """Notify room that messages were read"""
        await self.send(text_data=json.dumps({
            'type': 'read',
            'user_id': event['user_id']
        }))
    
    @database_sync_to_async
    def check_access(self):
        """Verify user has permission to access this chat room"""
        try:
            if self.room_type == 'case':
                case = Case.objects.select_related('client', 'assigned_admin').get(id=self.room_id)
                # Allow client, assigned admin, or superadmin
                return (
                    self.user.id == case.client.id or
                    (case.assigned_admin and self.user.id == case.assigned_admin.id) or
                    self.user.is_superadmin
                )
            elif self.room_type == 'booking':
                booking = Booking.objects.select_related('user').get(id=self.room_id)
                # Allow booking owner or admin/superadmin
                return (
                    self.user.id == booking.user.id or
                    self.user.is_admin or
                    self.user.is_superadmin
                )
            return False
        except (Case.DoesNotExist, Booking.DoesNotExist):
            return False
    
    @database_sync_to_async
    def save_message(self, message_text, conversation_type=None):
        """Save message to database"""
        message = CaseMessage.objects.create(
            sender=self.user,
            message=message_text,
            message_type='text',
            source_type='CASE' if self.room_type == 'case' else 'BOOKING',
        )
        
        if self.room_type == 'case':
            message.case_id = self.room_id
            message.conversation_type = conversation_type or 'CLIENT'
        else:
            message.booking_id = self.room_id
        
        message.save()
        return message
    
    @database_sync_to_async
    def mark_messages_read(self):
        """Mark all messages in this room as read for current user"""
        if self.room_type == 'case':
            CaseMessage.objects.filter(
                case_id=self.room_id,
                is_read=False
            ).exclude(sender=self.user).update(is_read=True, read_at=timezone.now())
        else:
            CaseMessage.objects.filter(
                booking_id=self.room_id,
                is_read=False
            ).exclude(sender=self.user).update(is_read=True, read_at=timezone.now())
