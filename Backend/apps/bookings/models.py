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
    assigned_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_assignments',
        limit_choices_to={'role': 'admin'},
        help_text='Admin responsible for this booking (used for booking-level chat).',
    )
    
    # Booking Form Fields (First Form)
    full_name = models.CharField(max_length=255)
    phone_country_code = models.CharField(max_length=5, default='+1')
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.TextField()
    country = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    special_note = models.TextField(max_length=900, blank=True)
    
    # Selected service (stored from landing page)
    selected_service = models.CharField(max_length=50, blank=True)

    # Guest flag — always False for authenticated users; kept for DB compatibility
    is_guest = models.BooleanField(default=False)

    # Form 2 single-use token (generated at payment, consumed on submission)
    form2_token = models.UUIDField(default=uuid.uuid4, editable=False, null=True, blank=True)
    form2_submitted = models.BooleanField(default=False)

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


class BookingToken(models.Model):
    """
    Single-use, time-limited token for initiating Booking Form 1.
    Generated when a user clicks 'Book Now' on a service page.
    Consumed (marked used) when the booking is successfully created.
    """
    token = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='booking_tokens')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='booking_tokens')
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    booking = models.OneToOneField(
        Booking, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='initiation_token'
    )

    class Meta:
        db_table = 'booking_tokens'
        verbose_name = 'Booking Token'
        verbose_name_plural = 'Booking Tokens'
        indexes = [
            models.Index(fields=['user', 'is_used']),
            models.Index(fields=['expires_at']),
        ]

    @property
    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f"BookingToken {self.token} - {self.user.email}"
