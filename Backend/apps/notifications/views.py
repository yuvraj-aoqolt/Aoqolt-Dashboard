from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer, NotificationStatsSerializer
from apps.accounts.permissions import IsSuperAdmin


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications.
    - list: Get all notifications for current user
    - retrieve: Get single notification
    - mark_read: Mark notification(s) as read
    - mark_all_read: Mark all notifications as read
    - stats: Get notification statistics
    - clear_read: Delete all read notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        """Only show notifications for current user"""
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('recipient')
    
    def list(self, request, *args, **kwargs):
        """
        Get paginated list of notifications.
        Query params:
        - unread_only: if 'true', only return unread notifications
        - type: filter by notification_type
        - limit: number of recent notifications (default: 50)
        """
        queryset = self.get_queryset()
        
        # Filter by read status
        if request.query_params.get('unread_only') == 'true':
            queryset = queryset.filter(is_read=False)
        
        # Filter by type
        notif_type = request.query_params.get('type')
        if notif_type:
            queryset = queryset.filter(notification_type=notif_type)
        
        # Limit results
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'data': serializer.data,
            'count': queryset.count()
        })
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        updated = self.get_queryset().filter(
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'Marked {updated} notifications as read',
            'count': updated
        })
    
    @action(detail=False, methods=['post'])
    def mark_multiple_read(self, request):
        """
        Mark multiple notifications as read
        Body: { "ids": [1, 2, 3] }
        """
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'No notification IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = self.get_queryset().filter(
            id__in=ids,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'Marked {updated} notifications as read',
            'count': updated
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification statistics"""
        queryset = self.get_queryset()
        
        # Count unread by type
        unread_by_type = queryset.filter(
            is_read=False
        ).values('notification_type').annotate(
            count=Count('id')
        )
        
        unread_dict = {
            item['notification_type']: item['count']
            for item in unread_by_type
        }
        
        stats = {
            'total_unread': queryset.filter(is_read=False).count(),
            'unread_by_type': unread_dict,
            'recent_count': queryset.count(),
        }
        
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        """Delete all read notifications"""
        deleted, _ = self.get_queryset().filter(
            is_read=True
        ).delete()
        
        return Response({
            'message': f'Deleted {deleted} read notifications',
            'count': deleted
        })
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent unread notifications (for notification panel)
        Returns up to 20 most recent unread notifications
        """
        queryset = self.get_queryset().filter(
            is_read=False
        ).order_by('-created_at')[:20]
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'data': serializer.data,
            'count': queryset.count(),
            'total_unread': self.get_queryset().filter(is_read=False).count()
        })
