"""
Chat Models - Case-based messaging system
"""
from django.db import models
from apps.accounts.models import User
from apps.cases.models import Case
import uuid


class CaseMessage(models.Model):
    """
    Messages for case-based chat system
    Participants: Client, Assigned Admin, SuperAdmin
    """
    MESSAGE_TEXT = 'text'
    MESSAGE_IMAGE = 'image'
    MESSAGE_VIDEO = 'video'
    MESSAGE_VOICE = 'voice'
    MESSAGE_DOCUMENT = 'document'
    
    MESSAGE_TYPES = [
        (MESSAGE_TEXT, 'Text'),
        (MESSAGE_IMAGE, 'Image'),
        (MESSAGE_VIDEO, 'Video'),
        (MESSAGE_VOICE, 'Voice'),
        (MESSAGE_DOCUMENT, 'Document'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    
    # Message content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default=MESSAGE_TEXT)
    message = models.TextField(blank=True)
    file_url = models.FileField(upload_to='chat_files/%Y/%m/%d/', null=True, blank=True)
    
    # Metadata
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'case_messages'
        verbose_name = 'Case Message'
        verbose_name_plural = 'Case Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['case', 'created_at']),
            models.Index(fields=['sender', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.sender.full_name} - {self.case.case_number} - {self.message_type}"


class MessageReadStatus(models.Model):
    """
    Track message read status for each participant
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(CaseMessage, on_delete=models.CASCADE, related_name='read_status')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'message_read_status'
        unique_together = ['message', 'user']
    
    def __str__(self):
        return f"{self.user.email} - Message {self.message.id}"
