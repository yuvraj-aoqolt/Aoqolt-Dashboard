"""
Views for Chat
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from apps.cases.models import Case
from .models import CaseMessage, MessageReadStatus
from .serializers import CaseMessageSerializer, MessageCreateSerializer


class CaseMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for case-based chat
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CaseMessageSerializer
    
    def get_queryset(self):
        """Filter messages based on case access"""
        user = self.request.user
        
        if user.is_superadmin:
            return CaseMessage.objects.filter(is_deleted=False).select_related('sender', 'case')
        elif user.is_admin:
            assigned_cases = Case.objects.filter(assigned_admin=user)
            return CaseMessage.objects.filter(case__in=assigned_cases, is_deleted=False).select_related('sender', 'case')
        else:
            user_cases = Case.objects.filter(client=user)
            return CaseMessage.objects.filter(case__in=user_cases, is_deleted=False).select_related('sender', 'case')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return CaseMessageSerializer
    
    def get_parsers(self):
        if getattr(self, 'action', None) == 'create':
            return [MultiPartParser(), FormParser()]
        return super().get_parsers()
    
    def create(self, request, *args, **kwargs):
        """Send a message"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            case_id = serializer.validated_data['case'].id
            try:
                case = Case.objects.get(id=case_id)
                
                if not (request.user.is_superadmin or 
                        case.client == request.user or 
                        case.assigned_admin == request.user):
                    return Response({
                        'success': False,
                        'error': 'You do not have access to this case'
                    }, status=status.HTTP_403_FORBIDDEN)
                
                message = serializer.save()
                response_serializer = CaseMessageSerializer(message)
                
                return Response({
                    'success': True,
                    'message': 'Message sent successfully',
                    'data': response_serializer.data
                }, status=status.HTTP_201_CREATED)
                
            except Case.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Case not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Edit a text message – sender only, within 12 hours"""
        message = self.get_object()
        if message.sender != request.user:
            return Response({'success': False, 'error': 'You can only edit your own messages'}, status=status.HTTP_403_FORBIDDEN)
        if message.message_type != CaseMessage.MESSAGE_TEXT:
            return Response({'success': False, 'error': 'Only text messages can be edited'}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.now() - message.created_at > timedelta(hours=12):
            return Response({'success': False, 'error': 'Messages can only be edited within 12 hours'}, status=status.HTTP_400_BAD_REQUEST)
        new_text = request.data.get('message', '').strip()
        if not new_text:
            return Response({'success': False, 'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        message.message = new_text
        message.save()
        return Response({'success': True, 'data': CaseMessageSerializer(message).data})

    def destroy(self, request, *args, **kwargs):
        """Soft-delete a message – sender only, within 12 hours"""
        message = self.get_object()
        if message.sender != request.user:
            return Response({'success': False, 'error': 'You can only delete your own messages'}, status=status.HTTP_403_FORBIDDEN)
        if timezone.now() - message.created_at > timedelta(hours=12):
            return Response({'success': False, 'error': 'Messages can only be deleted within 12 hours'}, status=status.HTTP_400_BAD_REQUEST)
        message.is_deleted = True
        message.save(update_fields=['is_deleted'])
        return Response({'success': True})

    @action(detail=False, methods=['get'])
    def case_messages(self, request):
        """
        Get all messages for a specific case
        GET /api/v1/chat/messages/case_messages/?case_id=uuid
        """
        case_id = request.query_params.get('case_id')
        
        if not case_id:
            return Response({
                'success': False,
                'error': 'case_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            case = Case.objects.get(id=case_id)
            
            if not (request.user.is_superadmin or 
                    case.client == request.user or 
                    case.assigned_admin == request.user):
                return Response({
                    'success': False,
                    'error': 'You do not have access to this case'
                }, status=status.HTTP_403_FORBIDDEN)
            
            messages = CaseMessage.objects.filter(case=case, is_deleted=False).order_by('created_at')
            serializer = CaseMessageSerializer(messages, many=True)
            
            return Response({
                'success': True,
                'count': messages.count(),
                'data': serializer.data
            })
            
        except Case.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Case not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """
        Get list of active conversations (assigned cases) with last message & unread count.
        SuperAdmin: all cases with an assigned admin.
        Admin: only cases assigned to this admin.
        GET /api/v1/chat/messages/conversations/
        """
        user = request.user

        if user.is_superadmin:
            cases = list(
                Case.objects
                .filter(assigned_admin__isnull=False)
                .select_related('assigned_admin', 'booking__service')
                .order_by('-updated_at')
            )
        elif user.is_admin:
            cases = list(
                Case.objects
                .filter(assigned_admin=user)
                .select_related('assigned_admin', 'booking__service')
                .order_by('-updated_at')
            )
        else:
            return Response(
                {'success': False, 'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Batch-fetch last message per case to avoid N+1
        case_ids = [c.id for c in cases]

        # Latest message per case via subquery
        from django.db.models import OuterRef, Subquery
        latest_msg_qs = (
            CaseMessage.objects
            .filter(case=OuterRef('pk'))
            .order_by('-created_at')
        )

        # Fetch all messages for these cases in one query, then group in Python
        all_messages = list(
            CaseMessage.objects
            .filter(case_id__in=case_ids, is_deleted=False)
            .select_related('sender')
            .order_by('case_id', '-created_at')
        )
        # Group: last message per case
        last_msg_map = {}
        unread_map = {}
        for msg in all_messages:
            cid = str(msg.case_id)
            if cid not in last_msg_map:
                last_msg_map[cid] = msg
            if not msg.is_read and str(msg.sender_id) != str(user.id):
                unread_map[cid] = unread_map.get(cid, 0) + 1

        result = []
        for case in cases:
            cid = str(case.id)
            last_msg = last_msg_map.get(cid)
            unread   = unread_map.get(cid, 0)

            # Safely get service name
            try:
                service_name = case.booking.service.name
            except Exception:
                service_name = ''

            fallback_time = (
                case.assigned_at.isoformat() if case.assigned_at
                else case.created_at.isoformat()
            )

            result.append({
                'case_id':             cid,
                'case_number':         case.case_number,
                'case_status':         case.status,
                'admin_id':            str(case.assigned_admin.id),
                'admin_name':          case.assigned_admin.full_name,
                'admin_email':         case.assigned_admin.email,
                'service_name':        service_name,
                'last_message':        last_msg.message if last_msg else '',
                'last_message_at':     last_msg.created_at.isoformat() if last_msg else fallback_time,
                'last_message_sender': last_msg.sender.full_name if last_msg else '',
                'unread_count':        unread,
            })

        result.sort(key=lambda x: x['last_message_at'], reverse=True)

        return Response({'success': True, 'count': len(result), 'data': result})

    @action(detail=False, methods=['post'])
    def mark_conversation_read(self, request):
        """
        Mark all unread messages in a case conversation as read for the current user.
        POST /api/v1/chat/messages/mark_conversation_read/
        Body: { "case_id": "uuid" }
        """
        case_id = request.data.get('case_id')
        if not case_id:
            return Response(
                {'success': False, 'error': 'case_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not (request.user.is_superadmin or case.assigned_admin == request.user):
            return Response(
                {'success': False, 'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        updated = (
            CaseMessage.objects
            .filter(case=case, is_read=False)
            .exclude(sender=request.user)
            .update(is_read=True, read_at=timezone.now())
        )

        return Response({'success': True, 'marked_read': updated})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single message as read"""
        message = self.get_object()
        
        if message.sender != request.user:
            message.is_read = True
            message.read_at = timezone.now()
            message.save()
            
            MessageReadStatus.objects.update_or_create(
                message=message,
                user=request.user,
                defaults={
                    'is_read': True,
                    'read_at': timezone.now()
                }
            )
        
        return Response({
            'success': True,
            'message': 'Message marked as read'
        })
