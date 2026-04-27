"""
Views for Aura Session Scheduling

Endpoints (all under /api/v1/sessions/):

  POST   /analysis-completed/              → SuperAdmin marks analysis done → creates AuraSession
  GET    /                                 → SuperAdmin lists all sessions
  GET    /{id}/                            → SuperAdmin retrieves a single session
  POST   /{id}/generate-link/             → SuperAdmin generates token + sends email
  GET    /public/{token}/                  → Public: validate token, return session info
  POST   /public/{token}/book/             → Public: client books a slot (no auth)
"""
import logging
from datetime import datetime, timedelta, date as date_type, timezone as dt_timezone

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from apps.bookings.models import Booking
from apps.notifications.models import Notification
from apps.accounts.models import User

from .models import AuraSession
from .serializers import AuraSessionSerializer, PublicSessionSerializer, BookSlotSerializer

logger = logging.getLogger(__name__)

# Minutes before a generated link expires.
SESSION_LINK_EXPIRY_MINUTES = 30

# Aura service types – MUST NOT include astrology.
AURA_SERVICE_TYPES = {'single_aura', 'family_aura'}


# ── Shared slot-engine helpers ──────────────────────────────────────────

def _validate_tz(tz_str: str):
    try:
        return ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, KeyError):
        return None


def _generate_slots(avail, target_date: date_type) -> list[dict]:
    """
    Generate all (start_utc, end_utc) slot dicts for *target_date* using
    the given SuperAdminAvailability config.
    """
    try:
        admin_tz = ZoneInfo(avail.timezone)
    except (ZoneInfoNotFoundError, KeyError):
        admin_tz = ZoneInfo('UTC')

    day_name   = target_date.strftime('%A').lower()
    ranges     = avail.weekly_schedule.get(day_name, [])
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
    Return all (start_utc, end_utc) intervals for *target_date* across
    ALL session-based services (Astrology + Aura).
    """
    from apps.astrology.models import AstrologySchedule
    intervals = []
    for s in AstrologySchedule.objects.filter(
        appointment_start__date=target_date,
        status__in=[AstrologySchedule.STATUS_CONFIRMED, AstrologySchedule.STATUS_PENDING],
    ):
        intervals.append((s.appointment_start, s.appointment_end))
    for s in AuraSession.objects.filter(
        session_start__date=target_date,
        status=AuraSession.STATUS_BOOKED,
    ).exclude(session_start__isnull=True):
        intervals.append((s.session_start, s.session_end))
    return intervals


def _is_slot_taken(new_start, new_end, intervals: list[tuple]) -> bool:
    for start, end in intervals:
        if start < new_end and end > new_start:
            return True
    return False


# ── Helper ─────────────────────────────────────────────────────────────────

def _notify_superadmin(title: str, message: str, booking_id=None, session_id=None):
    """Push an in-app notification to every superadmin."""
    superadmins = User.objects.filter(role=User.SUPERADMIN, is_active=True)
    for sa in superadmins:
        Notification.objects.create(
            recipient=sa,
            notification_type='BOOKING',
            title=title,
            message=message,
            booking_id=booking_id,
            metadata={'session_id': str(session_id)} if session_id else {},
        )


# ── SuperAdmin: mark analysis completed ────────────────────────────────────

class MarkAnalysisCompletedView(APIView):
    """
    POST /api/v1/sessions/analysis-completed/
    Body: { "booking_id": "<uuid>" }

    Creates an AuraSession for the given aura/family_aura booking.
    Idempotent – calling twice returns the existing session.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({'success': False, 'error': 'booking_id is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.select_related('service').get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({'success': False, 'error': 'Booking not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        # Guard: only aura bookings
        if booking.service.service_type not in AURA_SERVICE_TYPES:
            return Response(
                {'success': False, 'error': 'Only aura or family_aura bookings can have sessions.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Idempotent
        session, created = AuraSession.objects.get_or_create(
            booking=booking,
            defaults={'client_email': booking.email},
        )

        serializer = AuraSessionSerializer(session)
        return Response(
            {
                'success': True,
                'created': created,
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ── SuperAdmin: list & retrieve ────────────────────────────────────────────

class AuraSessionListView(APIView):
    """GET /api/v1/sessions/ — returns all sessions, newest first."""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        sessions = AuraSession.objects.select_related(
            'booking', 'booking__service'
        ).all()
        serializer = AuraSessionSerializer(sessions, many=True)
        return Response({'success': True, 'data': serializer.data})


class AuraSessionDetailView(APIView):
    """GET /api/v1/sessions/{id}/ — single session."""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        try:
            session = AuraSession.objects.select_related(
                'booking', 'booking__service'
            ).get(pk=pk)
        except AuraSession.DoesNotExist:
            return Response({'success': False, 'error': 'Session not found.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': AuraSessionSerializer(session).data})


# ── SuperAdmin: generate link ──────────────────────────────────────────────

class GenerateSessionLinkView(APIView):
    """
    POST /api/v1/sessions/{id}/generate-link/

    1. Generates a secure token
    2. Sets expiry = now + 30 minutes
    3. Updates status to link_sent
    4. Sends email to client with the booking link
    Returns the updated session.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            session = AuraSession.objects.select_related(
                'booking', 'booking__service'
            ).get(pk=pk)
        except AuraSession.DoesNotExist:
            return Response({'success': False, 'error': 'Session not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        if session.status == AuraSession.STATUS_BOOKED:
            return Response(
                {'success': False, 'error': 'This session has already been booked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate fresh token + expiry
        token  = session.generate_token()
        expiry = timezone.now() + timedelta(minutes=SESSION_LINK_EXPIRY_MINUTES)

        session.session_link_token = token
        session.link_expiry        = expiry
        session.status             = AuraSession.STATUS_LINK_SENT
        session.save(update_fields=['session_link_token', 'link_expiry', 'status', 'updated_at'])

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        booking_link = f"{frontend_url}/session-booking/{token}"

        # Send email
        try:
            send_mail(
                subject='Your Aura Session Booking Link',
                message=(
                    f"Dear {session.booking.full_name},\n\n"
                    f"Your Aura analysis has been completed. "
                    f"Please use the link below to book your session slot.\n\n"
                    f"{booking_link}\n\n"
                    f"This link is valid for {SESSION_LINK_EXPIRY_MINUTES} minutes.\n\n"
                    f"Best regards,\nAoqolt Team"
                ),
                html_message=(
                    f"<p>Dear <strong>{session.booking.full_name}</strong>,</p>"
                    f"<p>Your Aura analysis has been completed. "
                    f"Please use the button below to book your session slot.</p>"
                    f"<p><a href='{booking_link}' style='background:#F20000;color:#fff;"
                    f"padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;'>"
                    f"Book Your Session</a></p>"
                    f"<p>Or copy this link: <code>{booking_link}</code></p>"
                    f"<p><em>This link expires in {SESSION_LINK_EXPIRY_MINUTES} minutes.</em></p>"
                    f"<p>Best regards,<br>Aoqolt Team</p>"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[session.client_email],
                fail_silently=True,
            )
        except Exception as exc:
            logger.warning("Session link email failed: %s", exc)

        serializer = AuraSessionSerializer(session)
        return Response({
            'success': True,
            'data': serializer.data,
            'booking_link': booking_link,
        })


# ── Public: available slots ────────────────────────────────────────────────

class PublicSlotsView(APIView):
    """
    GET /api/v1/sessions/public/<token>/slots/?date=YYYY-MM-DD&client_timezone=...

    No authentication required.
    Returns available slots for the given date using the global availability
    engine, blocking times already taken by ANY service (Astrology or Aura).
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            session = AuraSession.objects.get(session_link_token=token)
        except AuraSession.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Invalid or expired link.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if session.status == AuraSession.STATUS_BOOKED:
            return Response(
                {'success': False, 'error': 'This link has already been used.'},
                status=status.HTTP_410_GONE,
            )

        if session.link_expiry and timezone.now() > session.link_expiry:
            return Response(
                {'success': False, 'error': 'This link has expired.'},
                status=status.HTTP_410_GONE,
            )

        date_str      = request.query_params.get('date', '')
        client_tz_str = request.query_params.get('client_timezone', 'UTC')

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_tz = _validate_tz(client_tz_str) or ZoneInfo('UTC')

        superadmin = User.objects.filter(role=User.SUPERADMIN).first()
        if not superadmin:
            return Response(
                {'error': 'Scheduling not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from apps.astrology.models import SuperAdminAvailability
        avail, _ = SuperAdminAvailability.objects.get_or_create(user=superadmin)

        all_slots = _generate_slots(avail, target_date)
        booked    = _get_global_booked_intervals(target_date)
        now_utc   = timezone.now()

        result = []
        for slot in all_slots:
            is_past  = slot['start_utc'] <= now_utc
            is_taken = _is_slot_taken(slot['start_utc'], slot['end_utc'], booked)
            local_s  = slot['start_utc'].astimezone(client_tz)
            local_e  = slot['end_utc'].astimezone(client_tz)
            result.append({
                'start_utc':   slot['start_utc'].isoformat(),
                'end_utc':     slot['end_utc'].isoformat(),
                'start_local': local_s.strftime('%H:%M'),
                'end_local':   local_e.strftime('%H:%M'),
                'available':   not is_past and not is_taken,
            })

        return Response({'success': True, 'date': date_str, 'slots': result})


# ── Public: validate token ─────────────────────────────────────────────────

class PublicSessionValidateView(APIView):
    """
    GET /api/v1/sessions/public/{token}/

    No authentication required.
    Returns session info so the frontend can render the booking page.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            session = AuraSession.objects.select_related(
                'booking', 'booking__service'
            ).get(session_link_token=token)
        except AuraSession.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Invalid or expired link.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()

        if session.status == AuraSession.STATUS_BOOKED:
            return Response(
                {'success': False, 'error': 'This link has already been used to book a session.'},
                status=status.HTTP_410_GONE,
            )

        if session.link_expiry and now > session.link_expiry:
            return Response(
                {'success': False, 'error': 'This link has expired. Please contact support for a new link.'},
                status=status.HTTP_410_GONE,
            )

        serializer = PublicSessionSerializer(session)
        return Response({'success': True, 'data': serializer.data})


# ── Public: book a slot ────────────────────────────────────────────────────

class PublicBookSlotView(APIView):
    """
    POST /api/v1/sessions/public/{token}/book/
    Body: { "session_start": "...", "session_end": "..." }

    No authentication required.
    Validates token, checks expiry, saves the slot, invalidates the token.
    """
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            session = AuraSession.objects.select_related(
                'booking', 'booking__service'
            ).get(session_link_token=token)
        except AuraSession.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Invalid or expired link.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()

        if session.status == AuraSession.STATUS_BOOKED:
            return Response(
                {'success': False, 'error': 'This link has already been used.'},
                status=status.HTTP_410_GONE,
            )

        if session.link_expiry and now > session.link_expiry:
            return Response(
                {'success': False, 'error': 'This link has expired. Please request a new link.'},
                status=status.HTTP_410_GONE,
            )

        serializer = BookSlotSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        new_start = serializer.validated_data['session_start']
        new_end   = serializer.validated_data['session_end']

        # Guard against cross-service conflicts at booking time
        conflicts = _get_global_booked_intervals(new_start.date())
        if _is_slot_taken(new_start, new_end, conflicts):
            return Response(
                {'success': False, 'error': 'This slot is no longer available. Please choose another.'},
                status=status.HTTP_409_CONFLICT,
            )

        session.session_start      = new_start
        session.session_end        = new_end
        session.client_timezone    = serializer.validated_data.get('client_timezone', 'UTC') or 'UTC'
        session.status             = AuraSession.STATUS_BOOKED
        # Invalidate token so it cannot be reused
        session.session_link_token = None
        session.link_expiry        = None
        session.save(update_fields=[
            'session_start', 'session_end', 'client_timezone', 'status',
            'session_link_token', 'link_expiry', 'updated_at',
        ])

        # Notify superadmins
        try:
            _notify_superadmin(
                title='Aura Session Booked',
                message=(
                    f"Client {session.booking.full_name} ({session.client_email}) "
                    f"has booked a session for booking {session.booking.booking_id}."
                ),
                booking_id=session.booking.id,
                session_id=session.id,
            )
        except Exception as exc:
            logger.warning("Session notification failed: %s", exc)

        return Response({
            'success': True,
            'message': 'Your session has been booked successfully.',
            'data': PublicSessionSerializer(session).data,
        })
