"""
Views for Services  
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.accounts.permissions import IsSuperAdmin
from .models import Service
from .serializers import ServiceSerializer, ServiceListSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing services
    """
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsSuperAdmin()]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ServiceListSerializer
        return ServiceSerializer
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def active(self, request):
        """Get all active services for landing page"""
        services = Service.objects.filter(is_active=True)
        serializer = ServiceListSerializer(services, many=True)
        return Response({
            'success': True,
            'count': services.count(),
            'data': serializer.data
        })
    
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def details(self, request, pk=None):
        """Get detailed service information including features and requirements"""
        service = self.get_object()
        serializer = ServiceSerializer(service)
        return Response({
            'success': True,
            'data': serializer.data
        })
