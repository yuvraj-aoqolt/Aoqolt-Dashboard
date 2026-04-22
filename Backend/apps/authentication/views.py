"""
Authentication Views
"""
from datetime import timedelta

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import logout
from django.conf import settings
from apps.accounts.models import User
from apps.accounts.serializers import UserRegistrationSerializer, UserSerializer
from .serializers import (
    LoginSerializer, OTPRequestSerializer, OTPVerifySerializer,
    SocialAuthSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    SelfForgotPasswordSerializer, SelfResetPasswordSerializer,
)
from .utils import OTPService, TwilioService
from .models import SocialAuthToken, SelfPasswordResetToken
import logging

logger = logging.getLogger(__name__)


class GuestLoginThrottle(AnonRateThrottle):
    """Prevent mass guest account creation — 10 guest sessions per hour per IP."""
    scope = 'guest_login'


def get_tokens_for_user(user):
    """Generate JWT tokens for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    User registration endpoint
    POST /api/v1/auth/register/
    
    Features:
    - Creates new user account (requires OTP verification)
    - If unverified account exists (by email or phone), allows updating ALL details:
      * Email (if not taken by another verified user)
      * Phone number (if not taken by another user)
      * Full name
      * Country code
      * Password
    - Resends OTP to the (updated) phone number
    
    Request:
    {
        "full_name": "Rahul Sharma",
        "email": "[email protected]",
        "country_code": "+91",
        "phone_number": "9876543210",
        "password": "StrongPassword123",
        "confirm_password": "StrongPassword123"
    }
    """
    email = request.data.get('email')
    phone_number = request.data.get('phone_number')
    
    # Check if unverified user exists with this email or phone
    existing_user = None
    if email:
        existing_user = User.objects.filter(email=email, is_verified=False).first()
    if not existing_user and phone_number:
        existing_user = User.objects.filter(phone_number=phone_number, is_verified=False).first()
    
    # If unverified user exists, allow updating ALL registration details
    if existing_user:
        # Get all registration fields from request
        new_email = request.data.get('email')
        new_phone = request.data.get('phone_number')
        new_country_code = request.data.get('country_code')
        full_name = request.data.get('full_name')
        password = request.data.get('password')
        
        # Validate new email if changed
        if new_email and new_email != existing_user.email:
            if User.objects.filter(email=new_email, is_verified=True).exists():
                return Response({
                    'success': False,
                    'error': 'Email address already in use by another verified account.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new phone number if changed
        if new_phone and new_phone != existing_user.phone_number:
            if User.objects.filter(phone_number=new_phone).exclude(id=existing_user.id).exists():
                return Response({
                    'success': False,
                    'error': 'Phone number already in use by another account.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update all provided fields
        if new_email:
            existing_user.email = new_email
        if new_phone:
            existing_user.phone_number = new_phone
        if new_country_code:
            existing_user.country_code = new_country_code
        if full_name:
            existing_user.full_name = full_name
        if password:
            existing_user.set_password(password)
        
        existing_user.save()

        # Resend OTP to the user's email address
        otp, otp_code = OTPService.create_email_otp(existing_user)

        response_data = {
            'success': True,
            'message': 'Account details updated. A verification code has been sent to your email.',
            'data': {
                'user_id': str(existing_user.id),
                'email': existing_user.email,
                'full_name': existing_user.full_name,
                'phone_number': existing_user.phone_number,
                'country_code': existing_user.country_code,
                'otp_sent': True,
                'account_status': 'unverified',
                'details_updated': True
            }
        }

        if settings.DEBUG and otp_code:
            response_data['data']['otp_code'] = otp_code
            response_data['message'] += f' [DEV MODE - OTP: {otp_code}]'

        return Response(response_data, status=status.HTTP_200_OK)

    # Proceed with normal registration
    serializer = UserRegistrationSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        # Generate and send OTP via email (not SMS)
        otp, otp_code = OTPService.create_email_otp(user)

        response_data = {
            'success': True,
            'message': 'Registration successful. Please check your email for the verification code.',
            'data': {
                'user_id': str(user.id),
                'email': user.email,
                'otp_sent': True
            }
        }

        if settings.DEBUG and otp_code:
            response_data['data']['otp_code'] = otp_code
            response_data['message'] += f' [DEV MODE - OTP: {otp_code}]'

        return Response(response_data, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    User login endpoint
    POST /api/v1/auth/login/
    
    Request:
    {
        "email": "[email protected]",
        "password": "StrongPassword123"
    }
    """
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': tokens
            }
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """
    Verify OTP endpoint
    POST /api/v1/auth/verify-otp/

    Email-based (manual signup):
        { "email": "user@example.com", "otp_code": "123456" }

    Phone-based (update-phone / legacy flows):
        { "phone_number": "9876543210", "otp_code": "123456" }
    """
    otp_code = request.data.get('otp_code', '')
    email = request.data.get('email')
    phone_number = request.data.get('phone_number')

    if not otp_code:
        return Response({'success': False, 'error': 'otp_code is required'},
                        status=status.HTTP_400_BAD_REQUEST)

    # ── Email-based OTP (manual signup) ──────────────────────────────────────
    if email:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'success': False, 'error': 'User not found'},
                            status=status.HTTP_404_NOT_FOUND)

        success, message = OTPService.verify_email_otp(user, otp_code)

        if success:
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': message,
                'data': {
                    'user': UserSerializer(user).data,
                    'tokens': tokens
                }
            }, status=status.HTTP_200_OK)

        return Response({'success': False, 'error': message},
                        status=status.HTTP_400_BAD_REQUEST)

    # ── Phone-based OTP (update-phone / legacy flows) ────────────────────────
    if phone_number:
        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return Response({'success': False, 'error': 'User not found'},
                            status=status.HTTP_404_NOT_FOUND)

        success, message = OTPService.verify_otp(user, phone_number, otp_code)

        if success:
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': message,
                'data': {
                    'user': UserSerializer(user).data,
                    'tokens': tokens
                }
            }, status=status.HTTP_200_OK)

        return Response({'success': False, 'error': message},
                        status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {'success': False, 'error': 'Provide either "email" or "phone_number" with "otp_code".'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp_view(request):
    """
    Resend OTP endpoint
    POST /api/v1/auth/resend-otp/

    Email-based (manual signup):
        { "email": "user@example.com" }

    Phone-based (update-phone / legacy flows):
        { "phone_number": "9876543210" }
    """
    email = request.data.get('email')
    phone_number = request.data.get('phone_number')

    # ── Email-based resend (manual signup) ───────────────────────────────────
    if email:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'success': False, 'error': 'User not found'},
                            status=status.HTTP_404_NOT_FOUND)

        can_resend, error_msg = OTPService.can_resend_otp(user)
        if not can_resend:
            return Response({'success': False, 'error': error_msg},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        otp, otp_code = OTPService.create_email_otp(user)
        OTPService.mark_otp_resent(user)

        response_data = {
            'success': True,
            'message': 'Verification code resent to your email.',
            'data': {'otp_sent': True}
        }
        if settings.DEBUG and otp_code:
            response_data['data']['otp_code'] = otp_code

        return Response(response_data, status=status.HTTP_200_OK)

    # ── Phone-based resend (update-phone / legacy flows) ─────────────────────
    if phone_number:
        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return Response({'success': False, 'error': 'User not found'},
                            status=status.HTTP_404_NOT_FOUND)

        can_resend, error_msg = OTPService.can_resend_otp(user)
        if not can_resend:
            return Response({'success': False, 'error': error_msg},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        otp, otp_code = OTPService.create_otp(user, phone_number)
        OTPService.mark_otp_resent(user)

        response_data = {
            'success': True,
            'message': 'OTP sent successfully',
            'data': {'otp_sent': True}
        }
        if settings.DEBUG and otp_code:
            response_data['data']['otp_code'] = otp_code

        return Response(response_data, status=status.HTTP_200_OK)

    return Response(
        {'success': False, 'error': 'Provide either "email" or "phone_number".'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def social_auth_view(request):
    """
    Social authentication endpoint (Google)
    Social auth is sufficient verification - no phone OTP required
    POST /api/v1/auth/social-login/
    
    Request:
    {
        "provider": "google",
        "access_token": "...",
        "email": "[email protected]",
        "full_name": "John Doe",
        "social_id": "123456789",
        "phone_number": "1234567890",  // Optional
        "country_code": "+1"  // Optional
    }
    """
    serializer = SocialAuthSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    provider = serializer.validated_data['provider']
    access_token = serializer.validated_data['access_token']
    email = serializer.validated_data.get('email')
    full_name = serializer.validated_data.get('full_name', email)
    social_id = serializer.validated_data.get('social_id')
    phone_number = serializer.validated_data.get('phone_number')
    country_code = serializer.validated_data.get('country_code', '+1')
    
    # Check if user exists with this social ID
    try:
        user = User.objects.get(social_id=social_id, auth_provider=provider)
        created = False
    except User.DoesNotExist:
        # Check if user exists with email
        try:
            user = User.objects.get(email=email)
            # Link social account - social auth is sufficient verification
            user.auth_provider = provider
            user.social_id = social_id
            user.is_verified = True  # Social auth verified
            user.is_active = True  # Activate user
            user.requires_phone_verification = False  # No phone verification needed
            if phone_number:
                user.phone_number = phone_number
                user.country_code = country_code
            user.save()
            created = False
        except User.DoesNotExist:
            # Create new user - social auth is sufficient verification
            temp_phone = phone_number if phone_number else f'TEMP{social_id[:10]}'
            
            user = User.objects.create(
                email=email,
                full_name=full_name,
                phone_number=temp_phone,
                country_code=country_code,
                auth_provider=provider,
                social_id=social_id,
                role=User.CLIENT,
                is_active=True,  # Social auth is sufficient - active immediately
                is_verified=True,  # Social auth verified
                is_self_registered=True,  # User registered themselves via social auth
                requires_phone_verification=False  # No phone verification needed
            )
            created = True
    
    # Store social auth token
    SocialAuthToken.objects.update_or_create(
        user=user,
        provider=provider,
        defaults={
            'provider_user_id': social_id,
            'access_token': access_token
        }
    )
    
    # Generate tokens for user
    tokens = get_tokens_for_user(user)
    
    return Response({
        'success': True,
        'message': 'Social authentication successful',
        'data': {
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'is_new_user': created
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint
    POST /api/v1/auth/logout/
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        return Response({
            'success': True,
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change password endpoint
    POST /api/v1/auth/change-password/
    """
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_phone_view(request):
    """
    Update and verify phone number for social auth users
    POST /api/v1/auth/update-phone/
    
    Request:
    {
        "country_code": "+1",
        "phone_number": "1234567890"
    }
    """
    user = request.user
    
    phone_number = request.data.get('phone_number')
    country_code = request.data.get('country_code', '+1')
    
    if not phone_number:
        return Response({
            'success': False,
            'error': 'Phone number is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if phone already exists
    if User.objects.filter(phone_number=phone_number).exclude(id=user.id).exists():
        return Response({
            'success': False,
            'error': 'Phone number already in use'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update user phone
    user.phone_number = phone_number
    user.country_code = country_code
    user.save()
    
    # Send OTP
    otp, otp_code = OTPService.create_otp(user, phone_number)
    
    response_data = {
        'success': True,
        'message': 'Phone number updated. Please verify with OTP.',
        'data': {
            'otp_sent': True
        }
    }
    
    if settings.DEBUG and otp_code:
        response_data['data']['otp_code'] = otp_code
        response_data['message'] += f' [DEV MODE - OTP: {otp_code}]'
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """
    Request password reset - sends OTP to user's phone
    POST /api/v1/auth/forgot-password/
    
    Request:
    {
        "email": "[email protected]"
    }
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    
    try:
        user = User.objects.get(email=email, is_verified=True)
    except User.DoesNotExist:
        return Response({
            'success': False,
            'error': 'No verified account found with this email'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate and send OTP
    otp, otp_code = OTPService.create_otp(user, user.phone_number)
    
    response_data = {
        'success': True,
        'message': 'Password reset OTP has been sent to your phone number.',
        'data': {
            'email': user.email,
            'phone_number': user.phone_number,
            'otp_sent': True
        }
    }
    
    # In development, include OTP in response
    if settings.DEBUG and otp_code:
        response_data['data']['otp_code'] = otp_code
        response_data['message'] += f' [DEV MODE - OTP: {otp_code}]'
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """
    Reset password with OTP verification
    POST /api/v1/auth/reset-password/
    
    Request:
    {
        "email": "[email protected]",
        "otp_code": "123456",
        "new_password": "NewSecurePass123!",
        "confirm_password": "NewSecurePass123!"
    }
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    otp_code = serializer.validated_data['otp_code']
    new_password = serializer.validated_data['new_password']
    
    try:
        user = User.objects.get(email=email, is_verified=True)
    except User.DoesNotExist:
        return Response({
            'success': False,
            'error': 'No verified account found with this email'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Verify OTP
    success, message = OTPService.verify_otp(user, user.phone_number, otp_code)
    
    if not success:
        return Response({
            'success': False,
            'error': message
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update password
    user.set_password(new_password)
    user.save()

    return Response({
        'success': True,
        'message': 'Password has been reset successfully. You can now login with your new password.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([GuestLoginThrottle])
def guest_login_view(request):
    """
    Create a temporary guest session.
    POST /api/v1/auth/guest/

    No request body required.
    Returns short-lived JWT tokens for a temporary anonymous user.
    The guest account is single-use — tokens expire after
    GUEST_SESSION_EXPIRY_HOURS (default 2 h) and cannot be refreshed
    for a new session without calling this endpoint again.
    """
    import uuid as _uuid

    expiry_hours = getattr(settings, 'GUEST_SESSION_EXPIRY_HOURS', 2)
    guest_uuid = _uuid.uuid4()

    # Build a unique, internally-recognisable email (not a real address)
    guest_email = f'guest_{guest_uuid.hex}@aoqolt.guest'

    # 15-digit numeric string derived from the UUID — passes the phone regex,
    # is unique with overwhelming probability, and cannot be guessed.
    guest_phone = str(guest_uuid.int)[-15:]

    user = User(
        email=guest_email,
        full_name='Guest',
        phone_number=guest_phone,
        country_code='+1',
        role=User.CLIENT,
        auth_provider=User.AUTH_MANUAL,
        is_active=True,
        is_verified=True,
        is_guest=True,
    )
    user.set_unusable_password()
    user.save()

    # Issue tokens with a custom (short) expiry for the guest session
    refresh = RefreshToken.for_user(user)
    lifetime = timedelta(hours=expiry_hours)
    refresh.set_exp(lifetime=lifetime)
    refresh.access_token.set_exp(lifetime=lifetime)

    logger.info(f"Guest session created: {user.id}")

    return Response({
        'success': True,
        'message': 'Guest session started',
        'data': {
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'session_expires_in_hours': expiry_hours,
        },
    }, status=status.HTTP_201_CREATED)


# ── Self-registered user password reset (email link) ─────────────────────

class SelfForgotPasswordThrottle(AnonRateThrottle):
    """Rate-limit self-service password reset requests — 5 per hour per IP."""
    scope = 'self_forgot_password'


def _build_self_reset_link(raw_token: str) -> str:
    """Construct the frontend password reset URL containing the raw token."""
    from django.conf import settings as _settings
    frontend_url = getattr(_settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return f"{frontend_url}/reset-password?token={raw_token}"


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SelfForgotPasswordThrottle])
def self_forgot_password_view(request):
    """
    Request a password reset email for self-registered users.
    POST /api/v1/auth/self-forgot-password/

    Eligible accounts: users who registered themselves (manual signup or
    Gmail/social signup).  Accounts created by a superadmin are not eligible
    and should use the admin-reset flow.

    For security, the response is always the same success message regardless
    of whether the email exists or is eligible, so that email enumeration is
    not possible.

    Request:  { "email": "user@example.com" }
    Response: 200 + generic success message
    """
    serializer = SelfForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'error': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']

    logger.debug(f"[self_forgot_password] Request received for email: {email}")

    try:
        user = User.objects.get(email=email, is_active=True, is_verified=True,
                                is_self_registered=True)
        logger.debug(f"[self_forgot_password] Eligible user found: {user.id} ({user.email})")
    except User.DoesNotExist:
        # Log why it failed without exposing to client
        try:
            any_user = User.objects.get(email=email)
            logger.warning(
                f"[self_forgot_password] User found but NOT eligible — "
                f"is_active={any_user.is_active}, is_verified={any_user.is_verified}, "
                f"is_self_registered={any_user.is_self_registered}"
            )
        except User.DoesNotExist:
            logger.warning(f"[self_forgot_password] No user exists with email: {email}")
        return Response({
            'success': True,
            'message': 'If this email is registered, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)

    # Generate a secure single-use token (stored as hash)
    raw_token = SelfPasswordResetToken.create_for_user(user, expiry_minutes=15)
    reset_link = _build_self_reset_link(raw_token)
    logger.debug(f"[self_forgot_password] Reset link generated: {reset_link}")

    # Send email
    try:
        from django.core.mail import send_mail
        from django.conf import settings as _settings
        import traceback

        logger.debug(
            f"[self_forgot_password] Email config — "
            f"BACKEND={_settings.EMAIL_BACKEND}, "
            f"HOST={_settings.EMAIL_HOST}, "
            f"PORT={_settings.EMAIL_PORT}, "
            f"TLS={_settings.EMAIL_USE_TLS}, "
            f"USER={_settings.EMAIL_HOST_USER!r}"
        )

        subject = 'Reset Your Password – Aoqolt'
        body = (
            f"Hello {user.full_name},\n\n"
            f"You requested a password reset for your Aoqolt account.\n\n"
            f"Click the link below to set a new password (valid for 15 minutes):\n\n"
            f"  {reset_link}\n\n"
            f"If you did not request this, you can safely ignore this email.\n\n"
            f"– The Aoqolt Team"
        )
        send_mail(
            subject=subject,
            message=body,
            from_email=_settings.EMAIL_HOST_USER or 'noreply@aoqolt.com',
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f"[self_forgot_password] Email successfully sent to {user.email}")
    except Exception as exc:
        logger.error(
            f"[self_forgot_password] FAILED to send email to {user.email}: {exc}\n"
            f"{traceback.format_exc()}"
        )
        # Do not expose email delivery failures to the client
        return Response({
            'success': True,
            'message': 'If this email is registered, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)

    return Response({
        'success': True,
        'message': 'If this email is registered, a password reset link has been sent.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def self_reset_password_view(request):
    """
    Complete a self-registered user password reset using the emailed token.
    POST /api/v1/auth/self-reset-password/

    Request:
    {
        "token": "<raw token from email link>",
        "new_password": "NewSecure123!",
        "confirm_password": "NewSecure123!"
    }
    """
    serializer = SelfResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'error': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    raw_token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']

    # Hash the incoming raw token to look up the DB record
    token_hash = SelfPasswordResetToken.hash_token(raw_token)

    try:
        token_obj = SelfPasswordResetToken.objects.select_related('user').get(
            token_hash=token_hash
        )
    except SelfPasswordResetToken.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Invalid or expired reset link. Please request a new one.'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not token_obj.is_valid():
        return Response({
            'success': False,
            'error': 'This reset link has expired or has already been used. Please request a new one.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password via Django's built-in validators
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(new_password, token_obj.user)
    except DjangoValidationError as exc:
        return Response({
            'success': False,
            'error': list(exc.messages)
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update password and mark token as used
    user = token_obj.user
    user.set_password(new_password)
    user.save(update_fields=['password'])

    from django.utils import timezone as _tz
    token_obj.is_used = True
    token_obj.used_at = _tz.now()
    token_obj.save(update_fields=['is_used', 'used_at'])

    logger.info(f"Password reset completed for {user.email}")

    return Response({
        'success': True,
        'message': 'Password has been reset successfully. You can now log in with your new password.'
    }, status=status.HTTP_200_OK)
