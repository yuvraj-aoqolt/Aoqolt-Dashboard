"""
Views for Bookings
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from apps.accounts.permissions import IsSuperAdmin, IsOwnerOrSuperAdmin
from .models import Booking, BookingDetail, BookingAttachment
from .serializers import (
    BookingSerializer, BookingListSerializer, BookingCreateSerializer,
    BookingDetailSerializer, BookingAttachmentSerializer
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
