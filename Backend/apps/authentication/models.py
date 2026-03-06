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
    Model for storing OTP verification codes
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    phone_number = models.CharField(max_length=20)
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
            models.Index(fields=['phone_number', 'is_verified']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"OTP for {self.phone_number} - {'Verified' if self.is_verified else 'Pending'}"
    
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
    
    def __str__(self):
        return f"{self.provider} token for {self.user.email}"
