"""
Views for Chat
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
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
            # SuperAdmin can see all messages
            return CaseMessage.objects.all().select_related('sender', 'case')
        elif user.is_admin:
            # Admin can see messages from assigned cases
            assigned_cases = Case.objects.filter(assigned_admin=user)
            return CaseMessage.objects.filter(case__in=assigned_cases).select_related('sender', 'case')
        else:
            # Clients can see messages from their own cases
            user_cases = Case.objects.filter(client=user)
            return CaseMessage.objects.filter(case__in=user_cases).select_related('sender', 'case')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return CaseMessageSerializer
    
    def get_parsers(self):
        if self.action == 'create':
            return [MultiPartParser(), FormParser()]
        return super().get_parsers()
    
    def create(self, request, *args, **kwargs):
        """Send a message"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # Check if user has access to this case
            case_id = serializer.validated_data['case'].id
            try:
                case = Case.objects.get(id=case_id)
                
                # Verify access
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
    
    @action(detail=False, methods=['get'])
    def case_messages(self, request):
        """
        Get all messages for a specific case
        GET /api/v1/chat/case_messages/?case_id=uuid
        """
        case_id = request.query_params.get('case_id')
        
        if not case_id:
            return Response({
                'success': False,
                'error': 'case_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            case = Case.objects.get(id=case_id)
            
            # Verify access
            if not (request.user.is_superadmin or 
                    case.client == request.user or 
                    case.assigned_admin == request.user):
                return Response({
                    'success': False,
                    'error': 'You do not have access to this case'
                }, status=status.HTTP_403_FORBIDDEN)
            
            messages = CaseMessage.objects.filter(case=case).order_by('created_at')
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
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        
        if message.sender != request.user:
            message.is_read = True
            message.read_at = timezone.now()
            message.save()
            
            # Update read status
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
