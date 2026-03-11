"""
Views for Cases
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db.models import Q
from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin, IsSuperAdminOrAdmin
from .models import Case, CaseAssignment, CaseResult, CaseResultAttachment, CaseStatusHistory
from .serializers import (
    CaseSerializer, CaseListSerializer, CaseAssignSerializer,
    CaseStatusUpdateSerializer, CaseResultSerializer
)


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cases
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter cases based on user role"""
        user = self.request.user
        
        if user.is_superadmin:
            # SuperAdmin can see all cases
            return Case.objects.all().select_related('client', 'assigned_admin', 'booking__service')
        elif user.is_admin:
            # Admin can only see cases assigned to them
            return Case.objects.filter(assigned_admin=user).select_related('client', 'booking__service')
        else:
            # Clients can only see their own cases
            return Case.objects.filter(client=user).select_related('assigned_admin', 'booking__service')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        return CaseSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def assign(self, request, pk=None):
        """
        Assign case to admin (Baba) - only by SuperAdmin
        POST /api/v1/cases/{id}/assign/
        {
            "admin_id": "uuid",
            "notes": "Assignment notes"
        }
        """
        case = self.get_object()
        serializer = CaseAssignSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        admin_id = serializer.validated_data['admin_id']
        notes = serializer.validated_data.get('notes', '')
        
        try:
            admin = User.objects.get(id=admin_id, role=User.ADMIN)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Admin not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Unassign previous admin if any
        if case.assigned_admin:
            CaseAssignment.objects.filter(case=case, is_active=True).update(
                is_active=False,
                unassigned_at=timezone.now()
            )
        
        # Assign new admin
        case.assigned_admin = admin
        case.assigned_at = timezone.now()
        
        # If case was RECEIVED, move to WORKING
        if case.status == Case.STATUS_RECEIVED:
            old_status = case.status
            case.status = Case.STATUS_WORKING
            case.started_at = timezone.now()
            case.save()
            
            # Record status change
            CaseStatusHistory.objects.create(
                case=case,
                from_status=old_status,
                to_status=case.status,
                changed_by=request.user,
                notes=f"Status changed automatically on assignment to {admin.full_name}"
            )
        else:
            case.save()
        
        # Create assignment record
        CaseAssignment.objects.create(
            case=case,
            admin=admin,
            assigned_by=request.user,
            notes=notes
        )
        
        return Response({
            'success': True,
            'message': f'Case assigned to {admin.full_name} successfully',
            'data': CaseSerializer(case).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdminOrAdmin])
    def update_status(self, request, pk=None):
        """
        Update case status
        POST /api/v1/cases/{id}/update_status/
        {
            "status": "working",
            "notes": "Started working on case"
        }
        """
        case = self.get_object()
        serializer = CaseStatusUpdateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')
        
        # Record status change
        old_status = case.status
        case.status = new_status
        
        if new_status == Case.STATUS_WORKING and not case.started_at:
            case.started_at = timezone.now()
        elif new_status == Case.STATUS_COMPLETED and not case.completed_at:
            case.completed_at = timezone.now()
        
        case.save()
        
        # Create history record
        CaseStatusHistory.objects.create(
            case=case,
            from_status=old_status,
            to_status=new_status,
            changed_by=request.user,
            notes=notes
        )
        
        return Response({
            'success': True,
            'message': f'Case status updated to {new_status}',
            'data': CaseSerializer(case).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdminOrAdmin],
            parser_classes=[MultiPartParser, FormParser])
    def upload_result(self, request, pk=None):
        """
        Upload case result - by assigned admin or superadmin
        POST /api/v1/cases/{id}/upload_result/
        """
        case = self.get_object()
        
        # Check if user is assigned admin or superadmin
        if not (request.user.is_superadmin or case.assigned_admin == request.user):
            return Response({
                'success': False,
                'error': 'Only assigned admin or superadmin can upload results'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Create or update result
        result, created = CaseResult.objects.get_or_create(
            case=case,
            defaults={'uploaded_by': request.user}
        )
        
        serializer = CaseResultSerializer(result, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(uploaded_by=request.user)
            
            # Mark case as completed if not already
            if case.status != Case.STATUS_COMPLETED:
                old_status = case.status
                case.status = Case.STATUS_COMPLETED
                case.completed_at = timezone.now()
                case.save()
                
                CaseStatusHistory.objects.create(
                    case=case,
                    from_status=old_status,
                    to_status=case.status,
                    changed_by=request.user,
                    notes="Result uploaded and case completed"
                )
            
            return Response({
                'success': True,
                'message': 'Result uploaded successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def result(self, request, pk=None):
        """Get case result"""
        case = self.get_object()
        
        try:
            result = case.result
            
            # Mark as viewed by client
            if request.user == case.client and not result.client_viewed:
                result.client_viewed = True
                result.client_viewed_at = timezone.now()
                result.save()
            
            serializer = CaseResultSerializer(result)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except CaseResult.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Result not available yet'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def my_cases(self, request):
        """Get cases for current user"""
        user = request.user
        
        if user.is_admin:
            cases = Case.objects.filter(assigned_admin=user)
        else:
            cases = Case.objects.filter(client=user)
        
        serializer = CaseListSerializer(cases, many=True)
        return Response({
            'success': True,
            'count': cases.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin])
    def unassigned(self, request):
        """Get unassigned cases - SuperAdmin only"""
        cases = Case.objects.filter(assigned_admin__isnull=True, status=Case.STATUS_RECEIVED)
        serializer = CaseListSerializer(cases, many=True)
        return Response({
            'success': True,
            'count': cases.count(),
            'data': serializer.data
        })
