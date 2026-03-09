"""
Admin configuration for Bookings app
"""
from django.contrib import admin
from .models import Booking, BookingDetail, BookingAttachment


class BookingDetailInline(admin.StackedInline):
    model = BookingDetail
    extra = 0


class BookingAttachmentInline(admin.TabularInline):
    model = BookingAttachment
    extra = 0
    readonly_fields = ['file_name', 'file_size', 'uploaded_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'service', 'full_name', 'status', 'created_at']
    list_filter = ['status', 'service', 'created_at']
    search_fields = ['full_name', 'email', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [BookingDetailInline, BookingAttachmentInline]
    
    fieldsets = (
        ('User & Service', {
            'fields': ('id', 'user', 'service', 'selected_service')
        }),
        ('Contact Information', {
            'fields': ('full_name', 'email', 'phone_number')
        }),
        ('Address', {
            'fields': ('address', 'city', 'country', 'postal_code')
        }),
        ('Additional Info', {
            'fields': ('special_note',)
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )
