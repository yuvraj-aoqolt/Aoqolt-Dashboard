"""
Admin configuration for Authentication app
"""
from django.contrib import admin
from .models import OTPVerification, OTPResendLog, SocialAuthToken


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number', 'otp_code', 'is_verified', 'attempts', 'created_at', 'expires_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['user__email', 'phone_number', 'otp_code']
    readonly_fields = ['created_at', 'verified_at']
    ordering = ['-created_at']


@admin.register(OTPResendLog)
class OTPResendLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone_number', 'resend_count', 'last_resend_at', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'phone_number']
    readonly_fields = ['created_at', 'last_resend_at']


@admin.register(SocialAuthToken)
class SocialAuthTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'provider', 'provider_user_id', 'created_at']
    list_filter = ['provider', 'created_at']
    search_fields = ['user__email', 'provider_user_id']
    readonly_fields = ['created_at', 'updated_at']
