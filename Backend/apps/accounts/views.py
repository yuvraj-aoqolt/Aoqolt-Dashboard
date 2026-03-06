"""
Views for User and Profile management
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from .models import User, UserProfile
from .serializers import (
    UserSerializer, UserListSerializer, UserUpdateSerializer,
    AdminCreationSerializer, UserProfileSerializer
)
from .permissions import IsSuperAdmin, IsOwnerOrSuperAdmin


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User management
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'create_admin':
            return AdminCreationSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter users based on role"""
        user = self.request.user
        
        if user.is_superadmin:
            # SuperAdmin can see all users
            return User.objects.all()
        elif user.is_admin:
            # Admin can only see clients and themselves
            return User.objects.filter(
                Q(role=User.CLIENT) | Q(id=user.id)
            )
        else:
            # Clients can only see themselves
            return User.objects.filter(id=user.id)
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action == 'create_admin':
            return [IsSuperAdmin()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrSuperAdmin()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def create_admin(self, request):
        """Create Admin (Baba) account - only by SuperAdmin"""
        serializer = AdminCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Admin account created successfully',
            'data': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsSuperAdmin])
    def toggle_active(self, request, pk=None):
        """Toggle user active status - only by SuperAdmin"""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        return Response({
            'success': True,
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'data': {'is_active': user.is_active}
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin])
    def admins(self, request):
        """List all admin (Baba) users"""
        admins = User.objects.filter(role=User.ADMIN)
        serializer = UserListSerializer(admins, many=True)
        return Response({
            'success': True,
            'count': admins.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin])
    def clients(self, request):
        """List all client users"""
        clients = User.objects.filter(role=User.CLIENT)
        serializer = UserListSerializer(clients, many=True)
        return Response({
            'success': True,
            'count': clients.count(),
            'data': serializer.data
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """View for managing user profile"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Get profile of current user"""
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile
