"""
Astrology Scheduling Models

Completely separate from the Booking model — the Booking model is
untouched.  Only astrology-type bookings get a linked AstrologySchedule.
"""
import uuid
from django.db import models
from apps.accounts.models import User
from apps.bookings.models import Booking


class SuperAdminAvailability(models.Model):
    """
    Stores the super admin's working schedule, timezone, session length,
    and cooldown gap between sessions.

    weekly_schedule format:
    {
        "monday":    ["09:00-12:00", "14:00-17:00"],
        "tuesday":   ["10:00-15:00"],
        "wednesday": [],
        ...
    }
    All times are in the admin's own timezone (stored in `timezone`).
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='astrology_availability',
        limit_choices_to={'role': User.SUPERADMIN},
    )
    timezone = models.CharField(
        max_length=100,
        default='UTC',
        help_text='IANA timezone string, e.g. "Asia/Kolkata"',
    )
    weekly_schedule = models.JSONField(
        default=dict,
        help_text='Dict keyed by lowercase weekday name, value = list of "HH:MM-HH:MM" strings',
    )
    session_duration = models.PositiveIntegerField(
        default=30,
        help_text='Session length in minutes',
    )
    cooldown_time = models.PositiveIntegerField(
        default=10,
        help_text='Gap between sessions in minutes',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'astrology_superadmin_availability'
        verbose_name = 'SuperAdmin Availability'

    def __str__(self):
        return f"Availability for {self.user.full_name} ({self.timezone})"


class AstrologySchedule(models.Model):
    """
    One-to-one link between an astrology Booking and its confirmed
    appointment slot.  All times are stored as UTC.
    """
    STATUS_PENDING   = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='astrology_schedule',
    )
    appointment_start = models.DateTimeField(help_text='UTC')
    appointment_end   = models.DateTimeField(help_text='UTC')
    client_timezone   = models.CharField(
        max_length=100,
        help_text='IANA timezone string provided by the client',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_CONFIRMED,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'astrology_schedule'
        verbose_name = 'Astrology Schedule'
        indexes = [
            models.Index(fields=['appointment_start']),
            models.Index(fields=['appointment_end']),
        ]

    def __str__(self):
        return f"Schedule for {self.booking.booking_id} @ {self.appointment_start}"
