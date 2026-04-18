"""
Models for OTP verification
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User
import random
import string


class OTPVerification(models.Model):
    """
    Model for storing OTP verification codes.

    email-based OTPs (manual signup): email is set, phone_number is None.
    phone-based OTPs (update-phone, forgot-password): phone_number is set, email is None.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    # phone_number is nullable — email-based OTPs don't need it
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    otp_code = models.CharField(max_length=6)
    
    # OTP status
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'otp_verifications'
        verbose_name = 'OTP Verification'
        verbose_name_plural = 'OTP Verifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'is_verified']),
            models.Index(fields=['phone_number', 'is_verified']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        target = self.email or self.phone_number or 'unknown'
        return f"OTP for {target} - {'Verified' if self.is_verified else 'Pending'}"
    
    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    def is_expired(self):
        """Check if OTP is expired"""
        return timezone.now() > self.expires_at
    
    def save(self, *args, **kwargs):
        """Set expiry time on creation"""
        if not self.pk:  # New instance
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)


class OTPResendLog(models.Model):
    """
    Model to track OTP resend attempts for rate limiting
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_resends')
    phone_number = models.CharField(max_length=20)
    resend_count = models.IntegerField(default=1)
    last_resend_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'otp_resend_logs'
        verbose_name = 'OTP Resend Log'
        verbose_name_plural = 'OTP Resend Logs'
    
    def __str__(self):
        return f"Resend log for {self.phone_number}"
    
    def can_resend(self):
        """Check if user can resend OTP (60 seconds cooldown)"""
        cooldown = timezone.now() - timedelta(seconds=60)
        return self.last_resend_at < cooldown


class SocialAuthToken(models.Model):
    """
    Model to store social authentication tokens
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='social_tokens')
    provider = models.CharField(max_length=20)  # google, apple, yahoo
    provider_user_id = models.CharField(max_length=255)
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'social_auth_tokens'
        verbose_name = 'Social Auth Token'
        verbose_name_plural = 'Social Auth Tokens'
        unique_together = ['provider', 'provider_user_id']


class SelfPasswordResetToken(models.Model):
    """
    Secure, single-use email-based password reset token for self-registered users.

    Security properties:
    - 256-bit cryptographically random token (secrets.token_urlsafe)
    - Token is hashed (SHA-256) before storage; raw token only travels in the reset link
    - Expires in 15 minutes
    - Single-use (is_used flag)
    - Old unused tokens for the same user are invalidated on new request
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='self_reset_tokens')
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'self_password_reset_tokens'
        verbose_name = 'Self Password Reset Token'
        verbose_name_plural = 'Self Password Reset Tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['user', 'is_used']),
        ]

    def __str__(self):
        return f"PasswordReset for {self.user.email} ({'used' if self.is_used else 'active'})"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_valid(self):
        return not self.is_used and not self.is_expired()

    @staticmethod
    def hash_token(raw_token: str) -> str:
        import hashlib
        return hashlib.sha256(raw_token.encode()).hexdigest()

    @classmethod
    def create_for_user(cls, user, expiry_minutes=15):
        """
        Invalidate all existing active tokens for this user, then generate
        a fresh raw token, store its hash, and return the raw token.
        """
        import secrets as _secrets
        # Invalidate all existing unused tokens
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        raw_token = _secrets.token_urlsafe(32)  # 256-bit entropy
        token_hash = cls.hash_token(raw_token)
        cls.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
        )
        return raw_token
    
    def __str__(self):
        return f"{self.provider} token for {self.user.email}"
