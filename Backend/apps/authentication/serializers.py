"""
Serializers for Authentication
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from .models import OTPVerification


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(email=email, password=password)
            
            if not user:
                raise serializers.ValidationError({
                    'error': 'Unable to log in with provided credentials.'
                })
            
            if not user.is_active:
                raise serializers.ValidationError({
                    'error': 'User account is not active.'
                })
            
            if not user.is_verified:
                raise serializers.ValidationError({
                    'error': 'Phone number is not verified. Please complete OTP verification.'
                })
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError({
                'error': 'Must include "email" and "password".'
            })


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for requesting OTP"""
    phone_number = serializers.CharField(max_length=20)
    country_code = serializers.CharField(max_length=5, default='+1')
    
    def validate_phone_number(self, value):
        """Validate phone number format"""
        # Basic validation - can be enhanced
        if not value.isdigit() or len(value) < 9:
            raise serializers.ValidationError("Invalid phone number format")
        return value


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for verifying OTP"""
    phone_number = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=6)
    
    def validate_otp_code(self, value):
        """Validate OTP format"""
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP must be 6 digits")
        return value


class SocialAuthSerializer(serializers.Serializer):
    """Serializer for social authentication"""
    provider = serializers.ChoiceField(choices=['google', 'apple', 'yahoo'])
    access_token = serializers.CharField()
    email = serializers.EmailField(required=False)
    full_name = serializers.CharField(required=False)
    social_id = serializers.CharField(required=False)
    phone_number = serializers.CharField(required=False)
    country_code = serializers.CharField(default='+1', required=False)


class TokenSerializer(serializers.Serializer):
    """Serializer for JWT tokens"""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs
