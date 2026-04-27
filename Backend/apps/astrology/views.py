"""
Views for Astrology Scheduling

Endpoints:
  GET  /api/v1/astrology/availability/       — fetch superadmin availability
  PUT  /api/v1/astrology/availability/       — update (superadmin only)
  GET  /api/v1/astrology/slots/              — get available slots for a date
  POST /api/v1/astrology/schedule/           — book a slot
  GET  /api/v1/astrology/schedule/           — list all schedules (superadmin)
  GET  /api/v1/astrology/schedule/my/        — client's own schedule
  DELETE /api/v1/astrology/schedule/<id>/    — cancel (superadmin)
"""
import logging
from datetime import datetime, timedelta, date as date_type, timezone as dt_timezone

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from apps.bookings.models import Booking

from .models import AstrologySchedule, SuperAdminAvailability
from .serializers import (
    AstrologyScheduleSerializer,
    SuperAdminAvailabilitySerializer,
)

logger = logging.getLogger(__name__)

# ── helpers ────────────────────────────────────────────────────────────────


def _validate_tz(tz_str: str) -> ZoneInfo | None:
    try:
        return ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, KeyError):
        return None


def _format_local(dt_utc: datetime, tz: ZoneInfo) -> str:
    """Return 'HH:MM' in the given timezone."""
    local = dt_utc.astimezone(tz)
    return local.strftime('%H:%M')


def _generate_slots(avail: SuperAdminAvailability, target_date: date_type) -> list[dict]:
    """
    Generate all (start_utc, end_utc) slot pairs for *target_date*
    according to the availability's weekly_schedule.
    """
    try:
        admin_tz = ZoneInfo(avail.timezone)
    except (ZoneInfoNotFoundError, KeyError):
        admin_tz = ZoneInfo('UTC')

    day_name = target_date.strftime('%A').lower()
    ranges = avail.weekly_schedule.get(day_name, [])

    session_td = timedelta(minutes=avail.session_duration)
    block_td   = session_td + timedelta(minutes=avail.cooldown_time)

    slots = []
    for time_range in ranges:
        try:
            start_str, end_str = time_range.split('-', 1)
            sh, sm = map(int, start_str.strip().split(':'))
            eh, em = map(int, end_str.strip().split(':'))
        except (ValueError, AttributeError):
            continue

        range_start = datetime(
            target_date.year, target_date.month, target_date.day,
            sh, sm, 0, tzinfo=admin_tz,
        )
        range_end = datetime(
            target_date.year, target_date.month, target_date.day,
            eh, em, 0, tzinfo=admin_tz,
        )

        current = range_start
        while current + session_td <= range_end:
            slots.append({
                'start_utc': current.astimezone(dt_timezone.utc),
                'end_utc':   (current + session_td).astimezone(dt_timezone.utc),
            })
            current += block_td

    return slots


def _get_global_booked_intervals(target_date: date_type) -> list[tuple]:
    """
    Return all (start_utc, end_utc) tuples for *target_date* across ALL
    session-based services (Astrology + Aura / FamilyAura).
    """
    intervals = []

    # Astrology
    for s in AstrologySchedule.objects.filter(
        appointment_start__date=target_date,
        status__in=[AstrologySchedule.STATUS_CONFIRMED, AstrologySchedule.STATUS_PENDING],
    ):
        intervals.append((s.appointment_start, s.appointment_end))

    # Aura sessions – lazy import to avoid circular dependency
    try:
        from apps.sessions.models import AuraSession
        for s in AuraSession.objects.filter(
            session_start__date=target_date,
            status=AuraSession.STATUS_BOOKED,
        ).exclude(session_start__isnull=True):
            intervals.append((s.session_start, s.session_end))
    except Exception:
        pass  # sessions app not yet available — degrade gracefully

    return intervals


def _is_overlapping(new_start, new_end, intervals: list[tuple]) -> bool:
    for start, end in intervals:
        if start < new_end and end > new_start:
            return True
    return False


# ── Availability ───────────────────────────────────────────────────────────


class AvailabilityView(APIView):
    """
    GET  — anyone authenticated can read (needed to generate slots)
    PUT  — superadmin only
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create(self):
        from apps.accounts.models import User
        superadmin = User.objects.filter(role=User.SUPERADMIN).first()
        if not superadmin:
            return None
        avail, _ = SuperAdminAvailability.objects.get_or_create(user=superadmin)
        return avail

    def get(self, request):
        avail = self._get_or_create()
        if not avail:
            return Response({'error': 'No superadmin found'}, status=status.HTTP_404_NOT_FOUND)
        ser = SuperAdminAvailabilitySerializer(avail)
        return Response({'success': True, 'data': ser.data})

    def put(self, request):
        if not request.user.is_superadmin:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        avail, _ = SuperAdminAvailability.objects.get_or_create(user=request.user)
        ser = SuperAdminAvailabilitySerializer(avail, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response({'success': True, 'data': ser.data})
        return Response({'success': False, 'error': ser.errors}, status=status.HTTP_400_BAD_REQUEST)


# ── Slot generation ────────────────────────────────────────────────────────


class SlotsView(APIView):
    """
    GET /api/v1/astrology/slots/?date=YYYY-MM-DD&client_timezone=America/New_York

    Returns available slots for the given date, times expressed in the
    client's timezone for display but start_utc/end_utc stored as ISO UTC strings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str  = request.query_params.get('date', '')
        client_tz_str = request.query_params.get('client_timezone', 'UTC')

        # Parse date
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate client timezone
        client_tz = _validate_tz(client_tz_str)
        if not client_tz:
            return Response(
                {'error': f'Unknown timezone: {client_tz_str}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch availability
        from apps.accounts.models import User
        superadmin = User.objects.filter(role=User.SUPERADMIN).first()
        if not superadmin:
            return Response({'error': 'Scheduling not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        avail, _ = SuperAdminAvailability.objects.get_or_create(user=superadmin)

        # Generate all candidate slots
        all_slots  = _generate_slots(avail, target_date)
        booked     = _get_global_booked_intervals(target_date)
        now_utc    = timezone.now()

        result = []
        for slot in all_slots:
            is_past      = slot['start_utc'] <= now_utc
            is_taken     = _is_overlapping(slot['start_utc'], slot['end_utc'], booked)
            result.append({
                'start_utc':   slot['start_utc'].isoformat(),
                'end_utc':     slot['end_utc'].isoformat(),
                'start_local': _format_local(slot['start_utc'], client_tz),
                'end_local':   _format_local(slot['end_utc'],   client_tz),
                'available':   not is_past and not is_taken,
            })

        return Response({'success': True, 'date': date_str, 'slots': result})


# ── Schedule booking ───────────────────────────────────────────────────────


class ScheduleView(APIView):
    """
    POST — client books a slot
    GET  — superadmin lists all; client sees their own
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id     = request.data.get('booking_id')
        start_utc_str  = request.data.get('start_utc')       # ISO string in UTC
        client_tz_str  = request.data.get('client_timezone', 'UTC')

        if not booking_id or not start_utc_str:
            return Response(
                {'error': 'booking_id and start_utc are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate timezone
        if not _validate_tz(client_tz_str):
            return Response(
                {'error': f'Unknown timezone: {client_tz_str}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch booking
        try:
            booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce astrology only
        svc_type = (
            booking.service.service_type
            if hasattr(booking.service, 'service_type')
            else booking.selected_service
        )
        if svc_type != 'astrology':
            return Response(
                {'error': 'Scheduling is only available for astrology bookings'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse start time
        try:
            start_utc = datetime.fromisoformat(start_utc_str.replace('Z', '+00:00'))
            if start_utc.tzinfo is None:
                start_utc = start_utc.replace(tzinfo=dt_timezone.utc)
        except ValueError:
            return Response({'error': 'Invalid start_utc format'}, status=status.HTTP_400_BAD_REQUEST)

        if start_utc <= timezone.now():
            return Response({'error': 'Cannot book a slot in the past'}, status=status.HTTP_400_BAD_REQUEST)

        # Get session duration from availability
        from apps.accounts.models import User
        superadmin = User.objects.filter(role=User.SUPERADMIN).first()
        avail, _ = SuperAdminAvailability.objects.get_or_create(user=superadmin)
        end_utc = start_utc + timedelta(minutes=avail.session_duration)

        # Check overlap across all services
        booked = _get_global_booked_intervals(start_utc.date())
        if _is_overlapping(start_utc, end_utc, booked):
            return Response(
                {'error': 'This slot is no longer available. Please choose another.'},
                status=status.HTTP_409_CONFLICT,
            )

        # Upsert (allow re-scheduling)
        schedule, created = AstrologySchedule.objects.update_or_create(
            booking=booking,
            defaults={
                'appointment_start': start_utc,
                'appointment_end':   end_utc,
                'client_timezone':   client_tz_str,
                'status':            AstrologySchedule.STATUS_CONFIRMED,
            },
        )

        ser = AstrologyScheduleSerializer(schedule)
        msg = 'Appointment scheduled' if created else 'Appointment rescheduled'
        return Response({'success': True, 'message': msg, 'data': ser.data}, status=status.HTTP_201_CREATED)

    def get(self, request):
        if request.user.is_superadmin:
            qs = AstrologySchedule.objects.select_related('booking').order_by('appointment_start')
        else:
            qs = AstrologySchedule.objects.filter(
                booking__user=request.user
            ).select_related('booking').order_by('appointment_start')

        ser = AstrologyScheduleSerializer(qs, many=True)
        return Response({'success': True, 'count': qs.count(), 'results': ser.data})


class ScheduleDetailView(APIView):
    """
    GET    /api/v1/astrology/schedule/<id>/  — single schedule
    DELETE /api/v1/astrology/schedule/<id>/  — cancel (superadmin only)
    """
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            if user.is_superadmin:
                return AstrologySchedule.objects.select_related('booking').get(id=pk)
            return AstrologySchedule.objects.select_related('booking').get(id=pk, booking__user=user)
        except AstrologySchedule.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk, request.user)
        if not obj:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': AstrologyScheduleSerializer(obj).data})

    def delete(self, request, pk):
        if not request.user.is_superadmin:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        obj = self._get(pk, request.user)
        if not obj:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        obj.status = AstrologySchedule.STATUS_CANCELLED
        obj.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'message': 'Appointment cancelled'})
