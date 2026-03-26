"""
Serializers for User and Profile models
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """User Profile Serializer"""
    
    class Meta:
        model = UserProfile
        fields = [
            'date_of_birth', 'gender', 'notification_enabled',
            'email_notifications', 'sms_notifications', 'total_cases_handled',
            'total_bookings', 'total_spent', 'specialization', 'bio',
            'rating', 'total_reviews'
        ]
        read_only_fields = ['total_cases_handled', 'total_bookings', 'total_spent', 
                           'rating', 'total_reviews']


class UserSerializer(serializers.ModelSerializer):
    """User Serializer for general use"""
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'country_code', 'phone_number',
            'role', 'is_active', 'is_verified', 'is_guest', 'auth_provider',
            'avatar', 'address', 'city', 'country', 'postal_code',
            'date_joined', 'last_login', 'profile'
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'is_guest', 'auth_provider',
                           'date_joined', 'last_login']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for manual user registration"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'full_name', 'email', 'country_code', 'phone_number',
            'password', 'confirm_password'
        ]
    
    def validate(self, attrs):
        """Validate password match and unique constraints"""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        
        # Check if verified user exists with this email
        if User.objects.filter(email=attrs['email'], is_verified=True).exists():
            raise serializers.ValidationError({
                "email": "User with this email already exists."
            })
        
        # Check if verified user exists with this phone number
        phone = attrs['phone_number']
        if User.objects.filter(phone_number=phone, is_verified=True).exists():
            raise serializers.ValidationError({
                "phone_number": "User with this phone number already exists."
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            country_code=validated_data['country_code'],
            phone_number=validated_data['phone_number'],
            role=User.CLIENT,
            auth_provider=User.AUTH_MANUAL,
            is_active=False  # Will be activated after OTP verification
        )
        return user


class AdminCreationSerializer(serializers.ModelSerializer):
    """Serializer for creating Admin (Baba) by SuperAdmin"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = [
            'full_name', 'email', 'country_code', 'phone_number',
            'password', 'specialization', 'bio'
        ]
    
    specialization = serializers.CharField(write_only=True, required=False)
    bio = serializers.CharField(write_only=True, required=False)
    
    def create(self, validated_data):
        """Create admin user (only by SuperAdmin)"""
        specialization = validated_data.pop('specialization', '')
        bio = validated_data.pop('bio', '')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            country_code=validated_data['country_code'],
            phone_number=validated_data['phone_number'],
            role=User.ADMIN,
            auth_provider=User.AUTH_MANUAL,
            is_active=True,
            is_verified=True
        )
        
        # Update profile with admin-specific fields
        if hasattr(user, 'profile'):
            user.profile.specialization = specialization
            user.profile.bio = bio
            user.profile.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information"""
    profile = UserProfileSerializer(required=False)
    
    class Meta:
        model = User
        fields = [
            'full_name', 'country_code', 'phone_number',
            'avatar', 'address', 'city', 'country', 'postal_code',
            'profile'
        ]
    
    def update(self, instance, validated_data):
        """Update user and profile"""
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update profile fields
        if profile_data and hasattr(instance, 'profile'):
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance


class UserListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing users"""
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'phone_number',
            'is_active', 'is_verified', 'date_joined'
        ]
        read_only_fields = fields
