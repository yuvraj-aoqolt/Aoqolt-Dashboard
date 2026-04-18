from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Centralized notification system for superadmin.
    Tracks all important events: messages, payments, bookings, cases, etc.
    """
    
    NOTIFICATION_TYPES = (
        ('CHAT', 'Chat Message'),
        ('PAYMENT', 'Payment Received'),
        ('BOOKING', 'New Booking'),
        ('CASE_UPDATE', 'Case Status Update'),
        ('PARTIAL_OVERDUE', 'Partial Payment Overdue'),
        ('ADMIN_ACTION', 'Admin Action Required'),
        ('SYSTEM', 'System Notification'),
    )
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text='User who should receive this notification'
    )
    
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        db_index=True
    )
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Optional: link to related object
    case_id = models.UUIDField(null=True, blank=True, db_index=True)
    booking_id = models.UUIDField(null=True, blank=True, db_index=True)
    payment_id = models.UUIDField(null=True, blank=True, db_index=True)
    order_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    # Additional metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional data like amount, service name, etc.'
    )
    
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.notification_type}: {self.title} for {self.recipient.email}"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
