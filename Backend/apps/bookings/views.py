"""
Views for Bookings
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin, IsOwnerOrSuperAdmin
from .models import Booking, BookingDetail, BookingAttachment, BookingToken
from .serializers import (
    BookingSerializer, BookingListSerializer, BookingCreateSerializer,
    BookingDetailSerializer, BookingAttachmentSerializer,
    BookingEditForm1Serializer, BookingEditForm2Serializer,
    AdminBookingSerializer,
)
from apps.services.serializers import ServiceSerializer


# ---------------------------------------------------------------------------
# Custom throttle classes
# ---------------------------------------------------------------------------

class BookingInitiateThrottle(UserRateThrottle):
    """Limit booking token generation to prevent spamming."""
    scope = 'booking_initiate'


class BookingCreateThrottle(UserRateThrottle):
    """Limit booking creation."""
    scope = 'booking_create'


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings
    """
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.action == 'initiate':
            return [BookingInitiateThrottle()]
        if self.action == 'create':
            return [BookingCreateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        """Filter bookings based on user role"""
        user = self.request.user
        
        if user.is_superadmin:
            return Booking.objects.all()
        elif user.is_admin:
            return Booking.objects.filter(assigned_admin=user)
        else:
            return Booking.objects.filter(user=user)
    
    def get_serializer_class(self):
        user = self.request.user
        if self.action == 'create':
            return BookingCreateSerializer
        # Regular admins see Form 2 details only — personal Form 1 data is hidden
        if getattr(user, 'is_admin', False) and not getattr(user, 'is_superadmin', False):
            return AdminBookingSerializer
        if self.action == 'list':
            return BookingListSerializer
        return BookingSerializer

    def destroy(self, request, *args, **kwargs):
        """Delete a booking — SuperAdmin only."""
        if not request.user.is_superadmin:
            return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        booking = self.get_object()
        booking.delete()
        return Response({'success': True, 'message': 'Booking deleted'}, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """Create a new booking with custom response format"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Booking created successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_details(self, request, pk=None):
        """Add second form details after payment. Blocked once already submitted."""
        booking = self.get_object()

        if booking.user != request.user and not request.user.is_superadmin:
            return Response({
                'success': False,
                'error': 'You do not have permission to modify this booking',
            }, status=status.HTTP_403_FORBIDDEN)

        # Prevent resubmission
        if booking.form2_submitted and not request.user.is_superadmin:
            return Response({
                'success': False,
                'error': 'Form 2 has already been submitted for this booking.',
                'code': 'ALREADY_SUBMITTED',
            }, status=status.HTTP_400_BAD_REQUEST)

        detail, _ = BookingDetail.objects.get_or_create(booking=booking)
        serializer = BookingDetailSerializer(detail, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            # Mark form2 as permanently submitted
            booking.form2_submitted = True
            booking.save(update_fields=['form2_submitted'])

            try:
                _send_booking_confirmation_email(booking)
            except Exception as exc:
                logger.warning(
                    'Confirmation email failed for booking %s: %s',
                    booking.booking_id, exc
                )
            return Response({
                'success': True,
                'message': 'Booking details added successfully',
                'data': serializer.data,
            }, status=status.HTTP_200_OK)

        return Response({
            'success': False,
            'error': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        """Upload attachment to booking"""
        booking = self.get_object()
        
        # Check permissions
        if booking.user != request.user and not request.user.is_superadmin:
            return Response({
                'success': False,
                'error': 'You do not have permission to upload to this booking'
            }, status=status.HTTP_403_FORBIDDEN)
        
        file = request.FILES.get('file')
        if not file:
            return Response({
                'success': False,
                'error': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create attachment
        attachment = BookingAttachment.objects.create(
            booking=booking,
            file=file,
            file_type=request.data.get('file_type', 'document'),
            file_name=file.name,
            file_size=file.size,
            description=request.data.get('description', '')
        )
        
        serializer = BookingAttachmentSerializer(attachment)
        return Response({
            'success': True,
            'message': 'File uploaded successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='delete_attachment/(?P<attachment_id>[^/.]+)')
    def delete_attachment(self, request, pk=None, attachment_id=None):
        """Delete an attachment from a booking (superadmin only)"""
        if not request.user.is_superadmin:
            return Response({
                'success': False,
                'error': 'Permission denied',
            }, status=status.HTTP_403_FORBIDDEN)
        booking = self.get_object()
        try:
            attachment = BookingAttachment.objects.get(id=attachment_id, booking=booking)
        except BookingAttachment.DoesNotExist:
            return Response({'success': False, 'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)
        attachment.file.delete(save=False)
        attachment.delete()
        return Response({'success': True, 'message': 'Attachment deleted'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def my_bookings(self, request):
        """Get current user's bookings"""
        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingListSerializer(bookings, many=True)
        return Response({
            'success': True,
            'count': bookings.count(),
            'data': serializer.data
        })

    # -----------------------------------------------------------------------
    # Token-based security endpoints are handled by dedicated APIView classes
    # below (BookingInitiateView, BookingTokenValidateView, BookingForm2InfoView).
    # -----------------------------------------------------------------------

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def start_work(self, request, pk=None):
        """
        Mark a booking as in-progress (admin starts working on it).
        POST /api/v1/bookings/{id}/start_work/
        """
        booking = self.get_object()
        if not (request.user.is_superadmin or booking.assigned_admin == request.user):
            return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        if booking.work_started:
            return Response({'success': True, 'message': 'Already started'})
        booking.work_started = True
        booking.work_started_at = timezone.now()
        booking.save(update_fields=['work_started', 'work_started_at'])
        return Response({'success': True, 'message': 'Work started'})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def complete_work(self, request, pk=None):
        """
        Mark a booking as work_completed — SuperAdmin only.
        POST /api/v1/bookings/{id}/complete_work/
        Sets work_completed=True, work_completed_at=now(), and creates a draft SalesQuote.
        """
        from django.utils import timezone
        from apps.sales.models import SalesQuote
        booking = self.get_object()
        if getattr(booking, 'work_completed', False):
            return Response({'success': False, 'error': 'Already completed'}, status=status.HTTP_400_BAD_REQUEST)
        booking.work_completed = True
        booking.work_completed_at = timezone.now()
        booking.save(update_fields=['work_completed', 'work_completed_at'])

        # Auto-create a draft Sales Quote for this booking (if one doesn't exist yet)
        if not SalesQuote.objects.filter(booking=booking).exists():
            service_name = getattr(booking.service, 'name', None) or booking.selected_service or 'Service'
            SalesQuote.objects.create(
                booking=booking,
                case=None,
                client=booking.user,
                created_by=request.user,
                title=f'Quote for {service_name} — {booking.booking_id}',
                status=SalesQuote.STATUS_DRAFT,
            )

        return Response({'success': True, 'message': 'Booking marked as completed'})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def assign(self, request, pk=None):
        """
        Assign a booking to an admin — SuperAdmin only.
        POST /api/v1/bookings/{id}/assign/
        { "admin_id": "uuid" }
        """
        booking = self.get_object()
        admin_id = request.data.get('admin_id')
        if not admin_id:
            return Response({'success': False, 'error': 'admin_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.accounts.models import User
            admin = User.objects.get(id=admin_id, role=User.ADMIN)
        except User.DoesNotExist:
            return Response({'success': False, 'error': 'Admin not found'}, status=status.HTTP_404_NOT_FOUND)
        booking.assigned_admin = admin
        booking.save(update_fields=['assigned_admin'])
        return Response({
            'success': True,
            'message': 'Booking assigned successfully',
            'data': BookingSerializer(booking).data,
        })

    @action(detail=True, methods=['patch'], permission_classes=[IsSuperAdmin])
    def edit_form1(self, request, pk=None):
        """SuperAdmin directly edits Form 1 (personal/contact details) of a booking."""
        booking = self.get_object()
        serializer = BookingEditForm1Serializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Booking details updated successfully',
                'data': serializer.data
            })
        return Response({'success': False, 'error': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], permission_classes=[IsSuperAdmin])
    def edit_form2(self, request, pk=None):
        """SuperAdmin directly edits Form 2 (service-specific details) of a booking."""
        booking = self.get_object()
        detail, _ = BookingDetail.objects.get_or_create(booking=booking)
        serializer = BookingEditForm2Serializer(detail, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Form 2 updated successfully',
                'data': serializer.data
            })
        return Response({'success': False, 'error': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Standalone APIViews for the token-based booking security endpoints.
# Registered explicitly with path() in urls.py to avoid router URL conflicts.
# ---------------------------------------------------------------------------

class BookingInitiateView(APIView):
    """
    POST /api/v1/bookings/initiate/
    Generate a single-use, time-limited BookingToken for Form 1.
    Called by the frontend before navigating to the booking page.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [BookingInitiateThrottle]

    def post(self, request):
        from apps.services.models import Service

        service_id = request.data.get('service_id')
        if not service_id:
            return Response(
                {'success': False, 'error': 'service_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = Service.objects.get(id=service_id, is_active=True)
        except (Service.DoesNotExist, ValueError):
            return Response(
                {'success': False, 'error': 'Service not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        expiry_minutes = getattr(settings, 'BOOKING_TOKEN_EXPIRY_MINUTES', 15)
        token = BookingToken.objects.create(
            user=request.user,
            service=service,
            expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
        )

        return Response({
            'success': True,
            'token': str(token.token),
            'expires_at': token.expires_at.isoformat(),
            'expiry_minutes': expiry_minutes,
        }, status=status.HTTP_201_CREATED)


class BookingTokenValidateView(APIView):
    """
    GET /api/v1/bookings/token/<token>/
    Validate a booking token and return the associated service details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        try:
            booking_token = BookingToken.objects.select_related('service', 'user').get(
                token=token
            )
        except (BookingToken.DoesNotExist, ValueError):
            return Response(
                {'success': False, 'error': 'Invalid booking link.', 'code': 'INVALID'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking_token.user_id != request.user.id:
            return Response(
                {'success': False, 'error': 'This link does not belong to your account.', 'code': 'FORBIDDEN'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking_token.is_used:
            return Response(
                {'success': False, 'error': 'This booking link has already been used.', 'code': 'USED'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking_token.expires_at < timezone.now():
            return Response(
                {
                    'success': False,
                    'error': 'This booking link has expired. Please start a new booking.',
                    'code': 'EXPIRED',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service_data = ServiceSerializer(booking_token.service).data
        return Response({
            'success': True,
            'service': service_data,
            'expires_at': booking_token.expires_at.isoformat(),
        })


# ---------------------------------------------------------------------------
# Email helper
# ---------------------------------------------------------------------------

def _send_booking_confirmation_email(booking):
    """
    Send a booking confirmation to the email address the client entered in
    Form 1.  Failures are intentionally swallowed by the caller so that a
    broken SMTP config never blocks a successful booking.
    """
    recipient = getattr(booking, 'email', None)
    if not recipient:
        return

    service_name = getattr(booking.service, 'name', 'the requested service')
    subject = f'Booking Confirmed \u2013 {service_name}'
    client_name = booking.full_name or 'valued client'
    body = (
        f'Dear {client_name},\n\n'
        f'Thank you for booking {service_name} with us.  '
        f'Your booking reference is {booking.booking_id}.\n\n'
        f'We will be in touch shortly to confirm the appointment details.\n\n'
        f'Thank you,\nThe Aoqolt Team'
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aoqolt.com')
    send_mail(subject, body, from_email, [recipient], fail_silently=False)


class BookingForm2InfoView(APIView):
    """
    GET /api/v1/bookings/form2/<token>/
    Validate a form2 token and return booking info for the Details Form page.
    Rejects the request if the form has already been submitted.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        try:
            booking = Booking.objects.select_related('service').get(form2_token=token)
        except (Booking.DoesNotExist, ValueError):
            return Response(
                {'success': False, 'error': 'Invalid form link.', 'code': 'INVALID'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.user_id != request.user.id:
            return Response(
                {'success': False, 'error': 'Forbidden.', 'code': 'FORBIDDEN'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.form2_submitted:
            return Response(
                {
                    'success': False,
                    'error': 'This form has already been submitted.',
                    'code': 'ALREADY_SUBMITTED',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingSerializer(booking, context={'request': request})
        return Response({'success': True, 'data': serializer.data})
