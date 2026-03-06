# Critical Production Fixes - Quick Implementation Guide

## 1. Add Rate Limiting (30 minutes)

### Update settings.py:
```python
# Add to REST_FRAMEWORK configuration
REST_FRAMEWORK = {
    # ... existing config ...
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/min',
        'register': '3/hour',
        'otp_verify': '10/min',
        'otp_resend': '3/hour',
    }
}
```

### Create custom throttles (apps/authentication/throttles.py):
```python
from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    rate = '5/min'
    scope = 'login'

class RegisterRateThrottle(AnonRateThrottle):
    rate = '3/hour'
    scope = 'register'

class OTPVerifyRateThrottle(AnonRateThrottle):
    rate = '10/min'
    scope = 'otp_verify'

class OTPResendRateThrottle(AnonRateThrottle):
    rate = '3/hour'
    scope = 'otp_resend'
```

### Apply to views:
```python
from .throttles import LoginRateThrottle, RegisterRateThrottle

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    # ... existing code ...

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_view(request):
    # ... existing code ...
```

## 2. Add Database Transactions (15 minutes)

### Update authentication/views.py:
```python
from django.db import transaction

@api_view(['POST'])
@permission_classes([AllowAny])
@transaction.atomic  # Add this decorator
def register_view(request):
    # All database operations now rollback on error
    # ... existing code ...

@api_view(['POST'])
@permission_classes([AllowAny])
@transaction.atomic  # Add this decorator
def social_auth_view(request):
    # ... existing code ...
    
@transaction.atomic
def verify_otp_view(request):
    # ... existing code ...
```

## 3. Add Database Indexes (5 minutes)

### Update accounts/models.py:
```python
class User(AbstractBaseUser):
    # ... existing fields ...
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),  # Add this
            models.Index(fields=['phone_number']),  # Add this
            models.Index(fields=['social_id', 'auth_provider']),  # Add this
            models.Index(fields=['is_active', 'is_verified']),  # Add this
        ]
```

### Run migration:
```bash
python manage.py makemigrations
python manage.py migrate
```

## 4. Secure Error Messages (10 minutes)

### Update authentication/views.py:
```python
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    
    try:
        user = User.objects.get(email=email, is_verified=True)
        # Generate and send OTP
        otp, otp_code = OTPService.create_otp(user, user.phone_number)
    except User.DoesNotExist:
        pass  # Don't reveal if user exists
    
    # ALWAYS return success (don't reveal if user exists)
    return Response({
        'success': True,
        'message': 'If an account exists with this email, an OTP has been sent.',
        'data': {}
    }, status=status.HTTP_200_OK)
```

## 5. Add Sentry Error Tracking (15 minutes)

### Install Sentry:
```bash
pip install sentry-sdk[django]
```

### Add to requirements.txt:
```
sentry-sdk[django]==1.40.0
```

### Update settings.py:
```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

# Add after DEBUG configuration
if not DEBUG:
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN', ''),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
        send_default_pii=False,  # Don't send personal data
        environment=os.getenv('ENVIRONMENT', 'production'),
    )
```

## 6. Add Health Check Endpoint (10 minutes)

### Create apps/authentication/health.py:
```python
from django.db import connection
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for load balancers
    """
    health_status = {
        'status': 'healthy',
        'checks': {}
    }
    
    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = 'unhealthy'
        health_status['status'] = 'unhealthy'
    
    # Check Redis/Cache
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health_status['checks']['cache'] = 'healthy'
        else:
            health_status['checks']['cache'] = 'unhealthy'
            health_status['status'] = 'unhealthy'
    except Exception as e:
        health_status['checks']['cache'] = 'unhealthy'
        health_status['status'] = 'unhealthy'
    
    status_code = status.HTTP_200_OK if health_status['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(health_status, status=status_code)
```

### Add to urls.py:
```python
from apps.authentication.health import health_check

urlpatterns = [
    path('health/', health_check, name='health-check'),
    # ... existing patterns ...
]
```

## 7. Add Request ID Middleware (15 minutes)

### Create core/middleware.py:
```python
import uuid
import logging

logger = logging.getLogger(__name__)

class RequestIDMiddleware:
    """Add unique request ID to each request for tracking"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        request.id = str(uuid.uuid4())
        response = self.get_response(request)
        response['X-Request-ID'] = request.id
        return response

class LoggingMiddleware:
    """Log all requests with request ID"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        logger.info(f"[{request.id}] {request.method} {request.path}")
        response = self.get_response(request)
        logger.info(f"[{request.id}] Response: {response.status_code}")
        return response
```

### Update settings.py MIDDLEWARE:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'core.middleware.RequestIDMiddleware',  # Add this
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.LoggingMiddleware',  # Add this
]
```

## 8. Add Input Validation (20 minutes)

### Update authentication/serializers.py:
```python
import re
from django.core.validators import RegexValidator

class PhoneNumberValidator:
    """Validate phone number format"""
    
    def __call__(self, value):
        # Remove any non-digit characters
        digits = re.sub(r'\D', '', value)
        
        # Check length (between 9 and 15 digits)
        if len(digits) < 9 or len(digits) > 15:
            raise serializers.ValidationError(
                "Phone number must be between 9 and 15 digits"
            )
        
        return value

class OTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(
        max_length=20,
        validators=[PhoneNumberValidator()]  # Add validator
    )
    country_code = serializers.CharField(
        max_length=5,
        default='+1',
        validators=[
            RegexValidator(
                regex=r'^\+\d{1,4}$',
                message='Country code must start with + and contain 1-4 digits'
            )
        ]
    )
```

## 9. Add Account Lockout (30 minutes)

### Create authentication/lockout.py:
```python
from django.core.cache import cache
from datetime import timedelta

class AccountLockout:
    """Prevent brute force attacks by locking accounts temporarily"""
    
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION = 900  # 15 minutes in seconds
    
    @classmethod
    def get_cache_key(cls, identifier):
        """Get cache key for tracking failed attempts"""
        return f"login_attempts:{identifier}"
    
    @classmethod
    def record_failed_attempt(cls, identifier):
        """Record a failed login attempt"""
        cache_key = cls.get_cache_key(identifier)
        attempts = cache.get(cache_key, 0)
        attempts += 1
        cache.set(cache_key, attempts, cls.LOCKOUT_DURATION)
        return attempts
    
    @classmethod
    def is_locked_out(cls, identifier):
        """Check if account is locked out"""
        cache_key = cls.get_cache_key(identifier)
        attempts = cache.get(cache_key, 0)
        return attempts >= cls.MAX_FAILED_ATTEMPTS
    
    @classmethod
    def reset_attempts(cls, identifier):
        """Reset failed attempts on successful login"""
        cache_key = cls.get_cache_key(identifier)
        cache.delete(cache_key)
    
    @classmethod
    def get_remaining_lockout_time(cls, identifier):
        """Get remaining lockout time in seconds"""
        cache_key = cls.get_cache_key(identifier)
        ttl = cache.ttl(cache_key)
        return max(0, ttl)
```

### Update login view:
```python
from .lockout import AccountLockout

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    email = request.data.get('email')
    
    # Check if account is locked out
    if AccountLockout.is_locked_out(email):
        remaining_time = AccountLockout.get_remaining_lockout_time(email)
        return Response({
            'success': False,
            'error': f'Account temporarily locked due to too many failed attempts. Try again in {remaining_time // 60} minutes.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Reset failed attempts on successful login
        AccountLockout.reset_attempts(email)
        
        tokens = get_tokens_for_user(user)
        return Response({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': tokens
            }
        }, status=status.HTTP_200_OK)
    
    # Record failed attempt
    attempts = AccountLockout.record_failed_attempt(email)
    remaining = AccountLockout.MAX_FAILED_ATTEMPTS - attempts
    
    error_message = 'Invalid credentials'
    if remaining > 0 and remaining <= 2:
        error_message += f'. {remaining} attempts remaining before lockout.'
    
    return Response({
        'success': False,
        'error': error_message
    }, status=status.HTTP_401_UNAUTHORIZED)
```

## 10. Update Requirements (5 minutes)

### Add to requirements.txt:
```
# Security & Monitoring
sentry-sdk[django]==1.40.0

# Already should be there
django-redis==5.4.0
redis==5.0.1
```

## Quick Deploy Script

### Create scripts/quick_security_fixes.sh:
```bash
#!/bin/bash
set -e

echo "Applying critical security fixes..."

# Apply database indexes
python manage.py makemigrations
python manage.py migrate

# Install new dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run system check
python manage.py check --deploy

echo "✅ Security fixes applied successfully"
echo "⚠️  Remember to:"
echo "   1. Set SENTRY_DSN environment variable"
echo "   2. Review and test rate limits"
echo "   3. Run comprehensive tests"
echo "   4. Update deployment documentation"
```

## Priority Order

**Do these first** (2-3 hours total):
1. Rate limiting (prevents API abuse)
2. Database transactions (prevents data corruption)
3. Health check endpoint (enables monitoring)
4. Secure error messages (prevents information leakage)
5. Account lockout (prevents brute force)

**Do next** (1-2 hours):
6. Database indexes (improves performance)
7. Sentry integration (error tracking)
8. Request ID middleware (debugging)
9. Input validation (data integrity)

**After that** (start writing tests):
- Unit tests for all views
- Integration tests for auth flows
- Load testing

---

**Total time for critical fixes: ~4-5 hours**

This gets you from "development code" to "production-ready" for the authentication system.
