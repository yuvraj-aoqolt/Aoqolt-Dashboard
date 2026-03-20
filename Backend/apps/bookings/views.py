"""
Views for Bookings
"""
import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.utils import timezone
from apps.accounts.permissions import IsSuperAdmin, IsOwnerOrSuperAdmin
from .models import Booking, BookingDetail, BookingAttachment
from .serializers import (
    BookingSerializer, BookingListSerializer, BookingCreateSerializer,
    BookingDetailSerializer, BookingAttachmentSerializer, CorrectionRequestSerializer
)


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter bookings based on user role"""
        user = self.request.user
        
        if user.is_superadmin:
            return Booking.objects.all()
        elif user.is_admin:
            # Admins see bookings assigned to their cases
            from apps.cases.models import Case
            assigned_cases = Case.objects.filter(assigned_admin=user)
            booking_ids = assigned_cases.values_list('booking_id', flat=True)
            return Booking.objects.filter(id__in=booking_ids)
        else:
            # Clients see only their own bookings
            return Booking.objects.filter(user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        elif self.action == 'list':
            return BookingListSerializer
        return BookingSerializer
    
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
        """Add second form details after payment"""
        booking = self.get_object()
        
        # Check if booking belongs to user or user is superadmin
        if booking.user != request.user and not request.user.is_superadmin:
            return Response({
                'success': False,
                'error': 'You do not have permission to modify this booking'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Create or update booking details
        detail, created = BookingDetail.objects.get_or_create(booking=booking)
        serializer = BookingDetailSerializer(detail, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Booking details added successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'error': serializer.errors
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

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def request_correction(self, request, pk=None):
        """
        SuperAdmin flags incorrect fields on a BookingDetail and generates
        a unique token-based correction link to send to the user.
        """
        booking = self.get_object()

        serializer = CorrectionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        detail, _ = BookingDetail.objects.get_or_create(booking=booking)

        detail.flagged_fields = serializer.validated_data['flagged_fields']
        detail.flagged_field_notes = serializer.validated_data.get('flagged_field_notes', {})
        detail.correction_token = uuid.uuid4()
        detail.correction_requested_at = timezone.now()
        detail.correction_completed = False
        detail.correction_completed_at = None
        detail.save()

        correction_link = (
            f"{request.data.get('frontend_base_url', 'https://aoqolt.com')}"
            f"/form/{detail.correction_token}"
        )

        return Response({
            'success': True,
            'message': 'Correction request created successfully',
            'data': {
                'correction_link': correction_link,
                'correction_token': str(detail.correction_token),
                'flagged_fields': detail.flagged_fields,
                'flagged_field_notes': detail.flagged_field_notes,
                'booking_id': booking.booking_id,
                'user_email': booking.user.email,
                'user_phone': booking.user.phone_number or booking.phone_number,
            }
        })


class CorrectionView(APIView):
    """
    Public token-based endpoint for users to retrieve and submit
    form corrections requested by super admin.

    GET  /api/v1/correction/<token>/        — returns form data + flagged fields
    POST /api/v1/correction/<token>/submit/ — submit corrected data + attachments
    """
    permission_classes = [AllowAny]

    def _get_detail(self, token):
        try:
            return BookingDetail.objects.select_related('booking__service').get(
                correction_token=token
            )
        except BookingDetail.DoesNotExist:
            return None

    def get(self, request, token):
        detail = self._get_detail(token)
        if not detail:
            return Response({'success': False, 'error': 'Invalid or expired correction link'},
                            status=status.HTTP_404_NOT_FOUND)

        booking = detail.booking
        service_type = booking.service.service_type if booking.service else booking.selected_service

        data = {
            'booking_id': booking.booking_id,
            'service_type': service_type,
            'service_name': booking.service.name if booking.service else '',
            'flagged_fields': detail.flagged_fields,
            'flagged_field_notes': detail.flagged_field_notes,
            'correction_completed': detail.correction_completed,
            'current_data': BookingDetailSerializer(detail).data,
            # Existing attachments
            'attachments': BookingAttachmentSerializer(
                booking.attachments.all(), many=True, context={'request': request}
            ).data,
        }
        return Response({'success': True, 'data': data})

    def post(self, request, token):
        """Submit corrected form data (supports multipart for image re-uploads)."""
        detail = self._get_detail(token)
        if not detail:
            return Response({'success': False, 'error': 'Invalid or expired correction link'},
                            status=status.HTTP_404_NOT_FOUND)

        if detail.correction_completed:
            return Response({'success': False, 'error': 'Correction has already been submitted'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Update detail fields (partial)
        fields_to_update = [
            'birth_date', 'birth_time', 'birth_place',
            'family_member_count', 'family_member_details', 'additional_notes', 'custom_data',
        ]
        for field in fields_to_update:
            if field in request.data:
                setattr(detail, field, request.data[field])

        # Handle replacement image uploads
        booking = detail.booking
        for key, file in request.FILES.items():
            # key can be a description like 'main_photo' or 'family_member:0'
            # Delete old attachment with the same description, then re-create
            booking.attachments.filter(description=key).delete()
            BookingAttachment.objects.create(
                booking=booking,
                file=file,
                file_type='image',
                file_name=file.name,
                file_size=file.size,
                description=key,
            )

        detail.correction_completed = True
        detail.correction_completed_at = timezone.now()
        detail.save()

        return Response({
            'success': True,
            'message': 'Correction submitted successfully. Our team will review your updated details.',
        })
