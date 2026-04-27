from django.contrib import admin
from .models import AuraSession


@admin.register(AuraSession)
class AuraSessionAdmin(admin.ModelAdmin):
    list_display = ('booking', 'client_email', 'status', 'session_start', 'session_end', 'created_at')
    list_filter  = ('status',)
    search_fields = ('booking__booking_id', 'client_email', 'session_link_token')
    readonly_fields = ('id', 'created_at', 'updated_at', 'session_link_token')
    ordering = ('-created_at',)
