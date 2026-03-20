"""
Admin configuration for Chat app
"""
from django.contrib import admin
from .models import CaseMessage, MessageReadStatus


@admin.register(CaseMessage)
class CaseMessageAdmin(admin.ModelAdmin):
    list_display = ['case', 'sender', 'message_type', 'is_read', 'created_at']
    list_filter = ['message_type', 'is_read', 'created_at']
    search_fields = ['case__case_number', 'sender__email', 'message']
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    ordering = ['-created_at']


@admin.register(MessageReadStatus)
class MessageReadStatusAdmin(admin.ModelAdmin):
    list_display = ['message', 'user', 'is_read', 'read_at']
    list_filter = ['is_read']
    search_fields = ['user__email', 'message__case__case_number']
