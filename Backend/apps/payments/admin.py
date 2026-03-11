"""
Admin configuration for Payments app
"""
from django.contrib import admin
from .models import Payment, WebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_number', 'user', 'gateway', 'amount_display', 'status', 'created_at', 'paid_at']
    list_filter = ['gateway', 'status', 'currency', 'created_at']
    search_fields = ['payment_number', 'user__email', 'gateway_payment_id', 'gateway_order_id']
    readonly_fields = ['id', 'payment_number', 'created_at', 'updated_at', 'paid_at', 'refunded_at']

    fieldsets = (
        ('Payment Information', {
            'fields': ('id', 'payment_number', 'user', 'booking')
        }),
        ('Amount', {
            'fields': ('amount', 'currency', 'description')
        }),
        ('Gateway Details', {
            'fields': ('gateway', 'gateway_payment_id', 'gateway_order_id', 'gateway_customer_id', 'gateway_response')
        }),
        ('Status', {
            'fields': ('status', 'payment_method')
        }),
        ('Refund', {
            'fields': ('refund_amount', 'refund_reason', 'refunded_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'paid_at')
        }),
    )


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ['gateway', 'event_id', 'event_type', 'processed', 'created_at']
    list_filter = ['gateway', 'processed', 'event_type', 'created_at']
    search_fields = ['event_id', 'event_type']
    readonly_fields = ['created_at', 'processed_at']
