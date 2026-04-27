"""
Aura Session Models

Completely separate from AstrologySchedule.
Only applies to single_aura and family_aura bookings.
"""
import uuid
import secrets
from django.db import models
from apps.bookings.models import Booking


class AuraSession(models.Model):
    """
    Represents a scheduling session created after an Aura booking's
    analysis is completed.  The SuperAdmin generates a one-time link
    that the client uses to pick a slot.

    Lifecycle:
      pending   → SuperAdmin clicks "Analysis Completed" (session row created)
      link_sent → SuperAdmin generates & sends the booking link
      booked    → Client picks a slot via the public link
    """
    STATUS_PENDING   = 'pending'
    STATUS_LINK_SENT = 'link_sent'
    STATUS_BOOKED    = 'booked'

    STATUS_CHOICES = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_LINK_SENT, 'Link Sent'),
        (STATUS_BOOKED,    'Booked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='aura_session',
        help_text='The aura/family-aura booking this session belongs to.',
    )

    client_email = models.EmailField(
        help_text='Client email address – copied from booking at creation time.',
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    # ── Token / link ────────────────────────────────────────────────────
    session_link_token = models.CharField(
        max_length=128,
        unique=True,
        blank=True,
        null=True,
        help_text='Secure token for the public scheduling link.',
    )
    link_expiry = models.DateTimeField(
        null=True,
        blank=True,
        help_text='UTC datetime after which the link is considered expired.',
    )

    # ── Booked slot ─────────────────────────────────────────────────────
    session_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text='UTC start time of the confirmed session slot.',
    )
    session_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text='UTC end time of the confirmed session slot.',
    )
    client_timezone = models.CharField(
        max_length=100,
        default='UTC',
        help_text='IANA timezone string auto-detected from client browser (e.g. "America/New_York").',
    )

    # ── Meta ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aura_sessions'
        verbose_name = 'Aura Session'
        verbose_name_plural = 'Aura Sessions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['session_link_token']),
        ]

    def __str__(self):
        return f"AuraSession [{self.booking.booking_id}] – {self.status}"

    def generate_token(self):
        """Create a cryptographically secure URL-safe token."""
        return secrets.token_urlsafe(48)
