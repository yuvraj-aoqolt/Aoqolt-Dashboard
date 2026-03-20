"""
Booking Models
"""
from django.db import models
from apps.accounts.models import User
from apps.services.models import Service
import uuid


class Booking(models.Model):
    """
    Main booking model - stores booking form data
    """
    STATUS_PENDING = 'pending'
    STATUS_PAYMENT_PENDING = 'payment_pending'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAYMENT_PENDING, 'Payment Pending'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_id = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    
    # Relations
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='bookings')
    
    # Booking Form Fields (First Form)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.TextField()
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    special_note = models.TextField(max_length=900, blank=True)
    
    # Selected service (stored from landing page)
    selected_service = models.CharField(max_length=50, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'bookings'
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['booking_id']),
        ]
    
    def generate_booking_id(self):
        """Generate unique booking ID like BOOK-001, BOOK-002, etc."""
        from django.db.models import Max
        import re
        
        # Get the last booking ID
        last_booking = Booking.objects.all().aggregate(Max('booking_id'))
        last_booking_id = last_booking.get('booking_id__max')
        
        if last_booking_id:
            # Extract number from last booking ID (e.g., "BOOK-001" -> 1)
            match = re.search(r'(\d+)$', last_booking_id)
            if match:
                last_number = int(match.group(1))
                new_number = last_number + 1
            else:
                new_number = 1
        else:
            new_number = 1
        
        # Generate new booking ID with zero padding
        return f"BOOK-{new_number:05d}"
    
    def save(self, *args, **kwargs):
        """Override save to auto-generate booking_id"""
        if not self.booking_id:
            self.booking_id = self.generate_booking_id()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.booking_id} - {self.user.email} - {self.service.name}"


class BookingDetail(models.Model):
    """
    Second form data - additional service-specific details
    Collected after payment is successful
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='details')
    
    # Generic fields for additional information
    additional_notes = models.TextField(blank=True)
    
    # Family members (for Family Aura)
    family_member_count = models.IntegerField(null=True, blank=True)
    family_member_details = models.JSONField(null=True, blank=True)
    
    # Birth details (for Astrology)
    birth_date = models.DateField(null=True, blank=True)
    birth_time = models.TimeField(null=True, blank=True)
    birth_place = models.CharField(max_length=255, blank=True)
    
    # Custom fields stored as JSON
    custom_data = models.JSONField(default=dict, blank=True)

    # ── Correction workflow ──────────────────────────────────────────────
    # Field names flagged as incorrect by super admin
    flagged_fields = models.JSONField(default=list, blank=True,
                                      help_text="Field names flagged as incorrect by admin")
    # Per-field notes from admin  {field_name: note_string}
    flagged_field_notes = models.JSONField(default=dict, blank=True)
    # Unique token for the correction link sent to user
    correction_token = models.UUIDField(null=True, blank=True, unique=True)
    correction_requested_at = models.DateTimeField(null=True, blank=True)
    correction_completed = models.BooleanField(default=False)
    correction_completed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'booking_details'
        verbose_name = 'Booking Detail'
        verbose_name_plural = 'Booking Details'
    
    def __str__(self):
        return f"Details for Booking {self.booking.id}"


class BookingAttachment(models.Model):
    """
    Files uploaded with booking (photos, documents, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='attachments')
    
    file = models.FileField(upload_to='booking_attachments/%Y/%m/%d/')
    file_type = models.CharField(max_length=50)  # image, document, etc.
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    
    description = models.CharField(max_length=255, blank=True)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'booking_attachments'
        verbose_name = 'Booking Attachment'
        verbose_name_plural = 'Booking Attachments'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} - {self.booking.id}"
