"""
Admin configuration for Sales app
"""
from django.contrib import admin
from .models import SalesQuote, SalesQuoteItem, SalesOrder


class SalesQuoteItemInline(admin.TabularInline):
    model = SalesQuoteItem
    extra = 1


@admin.register(SalesQuote)
class SalesQuoteAdmin(admin.ModelAdmin):
    list_display = ['quote_number', 'client', 'amount_display', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['quote_number', 'client__email', 'title']
    readonly_fields = ['id', 'quote_number', 'created_at', 'updated_at', 'responded_at']
    inlines = [SalesQuoteItemInline]
    
    fieldsets = (
        ('Quote Information', {
            'fields': ('id', 'quote_number', 'case', 'client', 'created_by')
        }),
        ('Details', {
            'fields': ('title', 'description', 'amount', 'currency')
        }),
        ('Terms', {
            'fields': ('valid_until', 'terms_and_conditions')
        }),
        ('Status', {
            'fields': ('status', 'client_response_notes', 'responded_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'client', 'amount_display', 'payment_status', 'status', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['order_number', 'client__email']
    readonly_fields = ['id', 'order_number', 'created_at', 'updated_at', 'completed_at']
    
    fieldsets = (
        ('Order Information', {
            'fields': ('id', 'order_number', 'quote', 'client')
        }),
        ('Amount', {
            'fields': ('total_amount', 'currency')
        }),
        ('Payment', {
            'fields': ('payment_status', 'amount_paid')
        }),
        ('Status', {
            'fields': ('status', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )
