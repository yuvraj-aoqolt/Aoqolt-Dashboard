"""
Views for User and Profile management
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db.models import Q
from django.conf import settings
from django.utils import timezone
from .models import User, UserProfile, InvitationToken
from .serializers import (
    UserSerializer, UserListSerializer, UserUpdateSerializer,
    AdminCreationSerializer, UserProfileSerializer,
    InviteCreateUserSerializer, InvitationTokenReadSerializer,
    SetPasswordViaTokenSerializer, ValidateInviteTokenSerializer,
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


# ── Invitation / Account-Setup Views ──────────────────────────────────────

def _build_invite_link(token_obj):
    """Return fully-qualified invitation URL for the frontend."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return f"{frontend_url}/invite/{token_obj.token}"


def _build_reset_link(token_obj):
    """Return fully-qualified admin-reset URL for the frontend."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return f"{frontend_url}/admin-reset/{token_obj.token}"


class CreateInvitedUserView(APIView):
    """
    POST /api/v1/accounts/admin/create-user/

    SuperAdmin creates a new Admin or Client account without a password.
    An invitation token is automatically generated and the invite link is returned.

    Permission: SuperAdmin only.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = InviteCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = InvitationToken.create_for_user(
            user=user,
            token_type=InvitationToken.INVITE,
            created_by=request.user,
        )

        return Response(
            {
                'success': True,
                'message': 'User created. Share the invite link to complete account setup.',
                'user': UserListSerializer(user).data,
                'invite': InvitationTokenReadSerializer(token).data,
                'invite_link': _build_invite_link(token),
            },
            status=status.HTTP_201_CREATED,
        )


class GenerateInviteLinkView(APIView):
    """
    POST /api/v1/accounts/admin/generate-invite/

    Regenerate (or create) an invitation link for an existing inactive user.
    Previous unused tokens of type 'invite' are invalidated.

    Body: { "user_id": "<string>" }
    Permission: SuperAdmin only.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        token = InvitationToken.create_for_user(
            user=user,
            token_type=InvitationToken.INVITE,
            created_by=request.user,
        )

        return Response(
            {
                'success': True,
                'invite': InvitationTokenReadSerializer(token).data,
                'invite_link': _build_invite_link(token),
            }
        )


class GenerateResetLinkView(APIView):
    """
    POST /api/v1/accounts/admin/generate-reset/

    Generate an admin-controlled password-reset link for any user.
    Previous unused reset tokens for that user are invalidated.

    Body: { "user_id": "<string>" }
    Permission: SuperAdmin only.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        token = InvitationToken.create_for_user(
            user=user,
            token_type=InvitationToken.RESET,
            created_by=request.user,
        )

        return Response(
            {
                'success': True,
                'reset_token': InvitationTokenReadSerializer(token).data,
                'reset_link': _build_reset_link(token),
            }
        )


class ValidateInviteTokenView(APIView):
    """
    GET /api/v1/accounts/validate-token/<token>/

    Public endpoint.  Returns token validity info so the frontend can decide
    whether to show the set-password form or an error page.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            invite = InvitationToken.objects.select_related('user').get(token=token)
        except InvitationToken.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Invalid token.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if invite.is_used:
            return Response(
                {'valid': False, 'error': 'This token has already been used.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invite.is_expired():
            return Response(
                {'valid': False, 'error': 'This token has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'valid': True,
                'token_type': invite.token_type,
                'user_name': invite.user.full_name,
                'user_email': invite.user.email,
            }
        )


class SetPasswordViaTokenView(APIView):
    """
    POST /api/v1/accounts/set-password/

    Public endpoint (no auth required).
    Validates the invite/reset token, sets the password, activates the account,
    and marks the token as used (one-time).

    Body: { "token": "...", "password": "...", "confirm_password": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordViaTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invite = serializer.validated_data['invite_token']
        user = invite.user

        # Set the password and activate the account
        user.set_password(serializer.validated_data['password'])
        user.is_active = True
        user.is_verified = True
        user.save(update_fields=['password', 'is_active', 'is_verified'])

        # Invalidate the token (one-time use)
        invite.is_used = True
        invite.used_at = timezone.now()
        invite.save(update_fields=['is_used', 'used_at'])

        return Response(
            {
                'success': True,
                'message': 'Password set successfully. You can now log in.',
            }
        )


class UserInviteStatusView(APIView):
    """
    GET /api/v1/accounts/admin/invite-status/<user_id>/

    Returns all invitation tokens for a user (latest first).
    Permission: SuperAdmin only.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        tokens = InvitationToken.objects.filter(user=user).order_by('-created_at')[:10]
        return Response(
            {
                'user_id': user.id,
                'user_email': user.email,
                'tokens': InvitationTokenReadSerializer(tokens, many=True).data,
            }
        )
