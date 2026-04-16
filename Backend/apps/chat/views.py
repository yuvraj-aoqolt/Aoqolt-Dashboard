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
from apps.bookings.models import Booking
from .models import CaseMessage, MessageReadStatus
from .serializers import CaseMessageSerializer, MessageCreateSerializer


class CaseMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for case-based chat
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CaseMessageSerializer
    
    def get_queryset(self):
        """Filter messages based on access rights"""
        user = self.request.user

        if user.is_superadmin:
            return CaseMessage.objects.filter(is_deleted=False).select_related('sender', 'case', 'booking')
        elif user.is_admin:
            assigned_cases = Case.objects.filter(assigned_admin=user)
            assigned_bookings = Booking.objects.filter(assigned_admin=user)
            return CaseMessage.objects.filter(
                Q(case__in=assigned_cases) | Q(booking__in=assigned_bookings),
                is_deleted=False,
            ).select_related('sender', 'case', 'booking')
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
        """Send a message (case thread or booking thread)"""
        serializer = self.get_serializer(data=request.data, context={'request': request})

        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        src_type = serializer.validated_data.get('source_type', 'CASE')

        if src_type == 'BOOKING':
            booking = serializer.validated_data.get('booking')
            if not booking:
                return Response({'success': False, 'error': 'booking required'}, status=status.HTTP_400_BAD_REQUEST)
            if not (request.user.is_superadmin or booking.assigned_admin == request.user):
                return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        else:
            case = serializer.validated_data.get('case')
            if not case:
                return Response({'success': False, 'error': 'case required'}, status=status.HTTP_400_BAD_REQUEST)
            if not (request.user.is_superadmin or case.client == request.user or case.assigned_admin == request.user):
                return Response({'success': False, 'error': 'You do not have access to this case'}, status=status.HTTP_403_FORBIDDEN)

        message = serializer.save()
        return Response({
            'success': True,
            'message': 'Message sent successfully',
            'data': CaseMessageSerializer(message).data,
        }, status=status.HTTP_201_CREATED)

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
        Get messages for a case thread or booking thread.
        CASE:    GET /api/v1/chat/messages/case_messages/?case_id=uuid&conversation_type=CLIENT|ADMIN
        BOOKING: GET /api/v1/chat/messages/case_messages/?source_type=BOOKING&booking_id=uuid
        """
        src_type  = request.query_params.get('source_type', 'CASE').upper()
        conv_type = request.query_params.get('conversation_type')

        if src_type == 'BOOKING':
            booking_id = request.query_params.get('booking_id')
            if not booking_id:
                return Response({'success': False, 'error': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                booking = Booking.objects.get(id=booking_id)
            except Booking.DoesNotExist:
                return Response({'success': False, 'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
            if not (request.user.is_superadmin or booking.assigned_admin == request.user):
                return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            messages = CaseMessage.objects.filter(
                booking=booking, source_type='BOOKING', is_deleted=False
            ).order_by('created_at')
            return Response({'success': True, 'count': messages.count(), 'data': CaseMessageSerializer(messages, many=True).data})

        # ── CASE path ──────────────────────────────────────────────────────
        case_id = request.query_params.get('case_id')
        if not case_id:
            return Response({'success': False, 'error': 'case_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response({'success': False, 'error': 'Case not found'}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_superadmin or case.client == request.user or case.assigned_admin == request.user):
            return Response({'success': False, 'error': 'You do not have access to this case'}, status=status.HTTP_403_FORBIDDEN)

        qs = CaseMessage.objects.filter(case=case, source_type='CASE', is_deleted=False)
        if request.user.is_superadmin and conv_type in ('CLIENT', 'ADMIN'):
            qs = qs.filter(Q(conversation_type=conv_type) | Q(conversation_type__isnull=True))
        elif case.client == request.user:
            qs = qs.filter(Q(conversation_type='CLIENT') | Q(conversation_type__isnull=True))
        elif case.assigned_admin == request.user:
            qs = qs.filter(Q(conversation_type='ADMIN') | Q(conversation_type__isnull=True))

        messages = qs.order_by('created_at')
        return Response({'success': True, 'count': messages.count(), 'data': CaseMessageSerializer(messages, many=True).data})
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """
        Get list of active conversations with last message & unread count.
        SuperAdmin: returns unified list of CASE items + BOOKING items.
        Admin: returns only cases assigned to this admin.
        GET /api/v1/chat/messages/conversations/
        """
        user = request.user

        if user.is_superadmin:
            cases = list(
                Case.objects
                .filter(assigned_admin__isnull=False)
                .select_related('assigned_admin', 'client', 'booking__service')
                .order_by('-updated_at')
            )
            bookings = list(
                Booking.objects
                .filter(assigned_admin__isnull=False)
                .select_related('assigned_admin', 'user', 'service', 'case__assigned_admin')
                .order_by('-updated_at')
            )

        elif user.is_admin:
            cases = list(
                Case.objects
                .filter(assigned_admin=user, status__in=['working', 'completed'])
                .select_related('assigned_admin', 'client', 'booking__service')
                .order_by('-updated_at')
            )
            bookings = []
        else:
            return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # ── Case messages (CASE source_type) ──────────────────────────────
        case_ids = [c.id for c in cases]
        case_messages = list(
            CaseMessage.objects
            .filter(case_id__in=case_ids, source_type='CASE', is_deleted=False)
            .select_related('sender')
            .order_by('case_id', '-created_at')
        )
        # ── Booking messages (BOOKING source_type) ─────────────────────────
        booking_ids = [b.id for b in bookings]
        booking_messages = list(
            CaseMessage.objects
            .filter(booking_id__in=booking_ids, source_type='BOOKING', is_deleted=False)
            .select_related('sender')
            .order_by('booking_id', '-created_at')
        )

        if user.is_superadmin:
            # ── Build CASE items ───────────────────────────────────────────
            thread_last_msg = {}
            thread_unread   = {}
            for msg in case_messages:
                cid   = str(msg.case_id)
                ctype = msg.conversation_type or 'CLIENT'
                key   = (cid, ctype)
                if key not in thread_last_msg:
                    thread_last_msg[key] = msg
                if not msg.is_read and str(msg.sender_id) != str(user.id):
                    thread_unread[key] = thread_unread.get(key, 0) + 1

            result = []
            for case in cases:
                cid = str(case.id)
                try:
                    service_name = case.booking.service.name
                except Exception:
                    service_name = ''
                try:
                    booking_ref = case.booking.booking_id or str(case.booking.id)[:8]
                except Exception:
                    booking_ref = ''
                try:
                    client_name  = case.booking.full_name or case.client.full_name
                    client_email = case.booking.email or case.client.email
                except Exception:
                    client_name  = case.client.full_name if case.client else ''
                    client_email = case.client.email if case.client else ''
                fallback_time = (
                    case.assigned_at.isoformat() if case.assigned_at
                    else case.created_at.isoformat()
                )

                def _thread(ctype, cid=cid, fallback=fallback_time):
                    msg = thread_last_msg.get((cid, ctype))
                    return {
                        'last_message':    msg.message if msg else '',
                        'last_message_at': msg.created_at.isoformat() if msg else fallback,
                        'unread_count':    thread_unread.get((cid, ctype), 0),
                    }

                ct = _thread('CLIENT')
                at = _thread('ADMIN')
                result.append({
                    'item_type':    'CASE',
                    'case_id':      cid,
                    'case_number':  case.case_number,
                    'case_status':  case.status,
                    'source':       case.source,
                    'booking_ref':  booking_ref,
                    'client_name':  client_name,
                    'client_email': client_email,
                    'admin_id':     str(case.assigned_admin.id),
                    'admin_name':   case.assigned_admin.full_name,
                    'admin_email':  case.assigned_admin.email,
                    'service_name': service_name,
                    'client_thread': ct,
                    'admin_thread':  at,
                    'last_activity': max(ct['last_message_at'], at['last_message_at']),
                })

            # ── Build BOOKING items ────────────────────────────────────────
            bk_last_msg = {}
            bk_unread   = {}
            for msg in booking_messages:
                bid = str(msg.booking_id)
                if bid not in bk_last_msg:
                    bk_last_msg[bid] = msg
                if not msg.is_read and str(msg.sender_id) != str(user.id):
                    bk_unread[bid] = bk_unread.get(bid, 0) + 1

            for booking in bookings:
                bid      = str(booking.id)
                last_msg = bk_last_msg.get(bid)
                unread   = bk_unread.get(bid, 0)
                fallback = booking.created_at.isoformat()
                client_name  = booking.full_name or (booking.user.full_name if booking.user else '')
                client_email = booking.email or (booking.user.email if booking.user else '')
                # Prefer Booking.assigned_admin; fall back to the related Case.assigned_admin
                case_obj     = getattr(booking, 'case', None)
                case_admin   = getattr(case_obj, 'assigned_admin', None) if case_obj else None
                admin        = booking.assigned_admin if booking.assigned_admin_id else case_admin
                result.append({
                    'item_type':    'BOOKING',
                    'booking_id':   bid,
                    'booking_ref':  booking.booking_id or bid[:8],
                    'booking_status': booking.status,
                    'service_name': booking.service.name if booking.service else '',
                    'client_name':  client_name,
                    'client_email': client_email,
                    'admin_id':     str(booking.assigned_admin_id) if booking.assigned_admin_id else '',
                    'admin_name':   getattr(admin, 'full_name', '') or '',
                    'admin_email':  getattr(admin, 'email', '') or '',
                    'admin_thread': {
                        'last_message':    last_msg.message if last_msg else '',
                        'last_message_at': last_msg.created_at.isoformat() if last_msg else fallback,
                        'unread_count':    unread,
                    },
                    'last_activity': last_msg.created_at.isoformat() if last_msg else fallback,
                })

            result.sort(key=lambda x: x['last_activity'], reverse=True)
            return Response({'success': True, 'count': len(result), 'data': result})

        # ── Admin path (single-thread, cases only) ─────────────────────────
        last_msg_map = {}
        unread_map   = {}
        for msg in case_messages:
            cid = str(msg.case_id)
            if msg.conversation_type not in ('ADMIN', None):
                continue
            if cid not in last_msg_map:
                last_msg_map[cid] = msg
            if not msg.is_read and str(msg.sender_id) != str(user.id):
                unread_map[cid] = unread_map.get(cid, 0) + 1

        result = []
        for case in cases:
            cid      = str(case.id)
            last_msg = last_msg_map.get(cid)
            unread   = unread_map.get(cid, 0)
            try:
                service_name = case.booking.service.name
            except Exception:
                service_name = ''
            try:
                booking_ref = case.booking.booking_id or str(case.booking.id)[:8]
            except Exception:
                booking_ref = ''
            try:
                client_name  = case.booking.full_name or case.client.full_name
                client_email = case.booking.email or case.client.email
            except Exception:
                client_name  = case.client.full_name if case.client else ''
                client_email = case.client.email if case.client else ''
            fallback_time = case.assigned_at.isoformat() if case.assigned_at else case.created_at.isoformat()
            result.append({
                'item_type':           'CASE',
                'case_id':             cid,
                'case_number':         case.case_number,
                'case_status':         case.status,
                'source':              case.source,
                'booking_ref':         booking_ref,
                'client_name':         client_name,
                'client_email':        client_email,
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
        Mark unread messages as read.
        Body: {
          "source_type": "CASE" | "BOOKING",   # optional, default CASE
          "case_id": "uuid",                    # required for CASE
          "booking_id": "uuid",                 # required for BOOKING
          "conversation_type": "CLIENT"|"ADMIN" # optional for CASE
        }
        """
        src_type  = request.data.get('source_type', 'CASE').upper()
        conv_type = request.data.get('conversation_type')

        if src_type == 'BOOKING':
            booking_id = request.data.get('booking_id')
            if not booking_id:
                return Response({'success': False, 'error': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                booking = Booking.objects.get(id=booking_id)
            except Booking.DoesNotExist:
                return Response({'success': False, 'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
            if not (request.user.is_superadmin or booking.assigned_admin == request.user):
                return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            updated = (
                CaseMessage.objects
                .filter(booking=booking, source_type='BOOKING', is_read=False)
                .exclude(sender=request.user)
                .update(is_read=True, read_at=timezone.now())
            )
            return Response({'success': True, 'marked_read': updated})

        # ── CASE path ──────────────────────────────────────────────────────
        case_id = request.data.get('case_id')
        if not case_id:
            return Response({'success': False, 'error': 'case_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response({'success': False, 'error': 'Case not found'}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_superadmin or case.assigned_admin == request.user or case.client == request.user):
            return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        updated_qs = (
            CaseMessage.objects
            .filter(case=case, source_type='CASE', is_read=False)
            .exclude(sender=request.user)
        )
        if request.user.is_superadmin and conv_type in ('CLIENT', 'ADMIN'):
            updated_qs = updated_qs.filter(Q(conversation_type=conv_type) | Q(conversation_type__isnull=True))

        updated = updated_qs.update(is_read=True, read_at=timezone.now())
        return Response({'success': True, 'marked_read': updated})

    @action(detail=False, methods=['delete'])
    def delete_thread(self, request):
        """
        Hard-delete all messages in a thread — SuperAdmin only.
        Body: { "source_type": "CASE"|"BOOKING", "case_id": "...", "booking_id": "...",
                "conversation_type": "CLIENT"|"ADMIN" }
        DELETE /api/v1/chat/messages/delete_thread/
        """
        if not request.user.is_superadmin:
            return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        src_type  = request.data.get('source_type', 'CASE').upper()
        conv_type = request.data.get('conversation_type')

        if src_type == 'BOOKING':
            booking_id = request.data.get('booking_id')
            if not booking_id:
                return Response({'success': False, 'error': 'booking_id required'}, status=status.HTTP_400_BAD_REQUEST)
            deleted, _ = CaseMessage.objects.filter(booking_id=booking_id, source_type='BOOKING').delete()
        else:
            case_id = request.data.get('case_id')
            if not case_id:
                return Response({'success': False, 'error': 'case_id required'}, status=status.HTTP_400_BAD_REQUEST)
            qs = CaseMessage.objects.filter(case_id=case_id, source_type='CASE')
            if conv_type in ('CLIENT', 'ADMIN'):
                qs = qs.filter(Q(conversation_type=conv_type) | Q(conversation_type__isnull=True) if conv_type == 'CLIENT' else Q(conversation_type=conv_type))
            deleted, _ = qs.delete()

        return Response({'success': True, 'deleted': deleted})

    @action(detail=False, methods=['get'])
    def client_conversations(self, request):
        """
        GET /api/v1/chat/messages/client_conversations/
        Returns all cases the logged-in client is the owner of (for client chat UI).
        Only returns cases that have an assigned admin (i.e. chat is active).
        """
        user = request.user
        cases = list(
            Case.objects
            .filter(client=user, assigned_admin__isnull=False)
            .select_related('assigned_admin', 'booking__service')
            .order_by('-updated_at')
        )

        case_ids = [c.id for c in cases]
        all_messages = list(
            CaseMessage.objects
            .filter(case_id__in=case_ids, is_deleted=False)
            .select_related('sender')
            .order_by('case_id', '-created_at')
        )
        last_msg_map = {}
        unread_map   = {}
        for msg in all_messages:
            cid = str(msg.case_id)
            if cid not in last_msg_map:
                last_msg_map[cid] = msg
            if not msg.is_read and str(msg.sender_id) != str(user.id):
                unread_map[cid] = unread_map.get(cid, 0) + 1

        result = []
        for case in cases:
            cid      = str(case.id)
            last_msg = last_msg_map.get(cid)
            unread   = unread_map.get(cid, 0)
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
                'service_name':        service_name,
                'last_message':        last_msg.message if last_msg else '',
                'last_message_at':     last_msg.created_at.isoformat() if last_msg else fallback_time,
                'last_message_sender': last_msg.sender.full_name if last_msg else '',
                'unread_count':        unread,
            })

        result.sort(key=lambda x: x['last_message_at'], reverse=True)
        return Response({'success': True, 'count': len(result), 'data': result})

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
