"""
Custom User Model with Role-Based Access Control
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
from datetime import datetime, timedelta
import random
import string
import secrets


def generate_user_id(name="USER"):
    """
    Generate readable user ID: NAME-YYYYMMDDHHMMSS-XXXX
    Example: JOHN-20260305142030-5678
    """
    # Clean name - take first part, remove spaces, uppercase
    clean_name = name.split()[0].upper()[:8] if name else "USER"
    # Remove non-alphanumeric characters
    clean_name = ''.join(c for c in clean_name if c.isalnum())
    
    # Timestamp with seconds
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    # Random 4-digit suffix for extra uniqueness
    random_suffix = ''.join(random.choices(string.digits, k=4))
    
    return f"{clean_name}-{timestamp}-{random_suffix}"


class UserManager(BaseUserManager):
    """Custom user manager"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user"""
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        
        # Generate user_id based on full_name if not provided
        if 'id' not in extra_fields and 'full_name' in extra_fields:
            extra_fields['id'] = generate_user_id(extra_fields['full_name'])
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser"""
        extra_fields.setdefault('role', User.SUPERADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        
        if extra_fields.get('role') != User.SUPERADMIN:
            raise ValueError('Superuser must have role=SUPERADMIN')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User Model with three roles:
    - SUPERADMIN: Platform owner with full control
    - ADMIN: Baba/Worker who handles cases
    - CLIENT: Customer who books services
    """
    
    # Role choices
    SUPERADMIN = 'superadmin'
    ADMIN = 'admin'
    CLIENT = 'client'
    
    ROLE_CHOICES = [
        (SUPERADMIN, 'Super Admin'),
        (ADMIN, 'Admin (Baba)'),
        (CLIENT, 'Client'),
    ]
    
    # Primary fields
    id = models.CharField(primary_key=True, max_length=30, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    
    # Phone number
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    country_code = models.CharField(max_length=5, default='+1')
    # null=True allows multiple invited users without phone numbers (PostgreSQL allows multiple NULLs in unique columns)
    phone_number = models.CharField(validators=[phone_regex], max_length=17, unique=True, null=True, blank=True)
    
    # Role and permissions
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=CLIENT)
    
    # Account status
    is_active = models.BooleanField(default=False)  # Activated after verification
    is_verified = models.BooleanField(default=False)  # Phone/email verified
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_guest = models.BooleanField(default=False)  # Temporary guest session
    requires_phone_verification = models.BooleanField(default=False)  # For social auth
    
    # Authentication method
    AUTH_MANUAL = 'manual'
    AUTH_GOOGLE = 'google'
    AUTH_APPLE = 'apple'
    AUTH_YAHOO = 'yahoo'
    
    AUTH_CHOICES = [
        (AUTH_MANUAL, 'Manual'),
        (AUTH_GOOGLE, 'Google'),
        (AUTH_APPLE, 'Apple'),
        (AUTH_YAHOO, 'Yahoo'),
    ]
    
    auth_provider = models.CharField(max_length=20, choices=AUTH_CHOICES, default=AUTH_MANUAL)
    social_id = models.CharField(max_length=255, blank=True, null=True)  # OAuth provider ID
    
    # Profile information
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    
    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Manager
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    
    def save(self, *args, **kwargs):
        # Generate ID on first save if not set
        if not self.id:
            self.id = generate_user_id(self.full_name)
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['phone_number']),
        ]
    
    def __str__(self):
        return f"{self.full_name} ({self.email})"
    
    @property
    def is_superadmin(self):
        return self.role == self.SUPERADMIN
    
    @property
    def is_admin(self):
        return self.role == self.ADMIN
    
    @property
    def is_client(self):
        return self.role == self.CLIENT
    
    @property
    def full_phone_number(self):
        return f"{self.country_code}{self.phone_number}"
    
    def get_full_name(self):
        return self.full_name
    
    def get_short_name(self):
        return self.full_name.split()[0] if self.full_name else self.email


class UserProfile(models.Model):
    """
    Extended profile information for users
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Additional information
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    
    # Preferences
    notification_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)
    
    # Statistics (for admins/clients)
    total_cases_handled = models.IntegerField(default=0)  # For admin
    total_bookings = models.IntegerField(default=0)  # For client
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # For client
    
    # Admin specific fields
    specialization = models.CharField(max_length=255, blank=True)  # e.g., "Aura Reading, Astrology"
    bio = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_reviews = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"Profile: {self.user.full_name}"


class InvitationToken(models.Model):
    """
    Secure one-time token for account activation (invite) and
    admin-generated password resets.

    Security properties:
    - Cryptographically random (secrets.token_urlsafe, 288-bit entropy)
    - Time-limited (default 24 hours)
    - Single-use (is_used flag)
    - Old tokens of same type are invalidated when a new one is issued
    """

    INVITE = 'invite'
    RESET = 'reset'
    TYPE_CHOICES = [
        (INVITE, 'Account Invitation'),
        (RESET, 'Admin Password Reset'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='invitation_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    token_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default=INVITE
    )
    is_used = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invitation_tokens',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'invitation_tokens'
        verbose_name = 'Invitation Token'
        verbose_name_plural = 'Invitation Tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'token_type', 'is_used']),
        ]

    def __str__(self):
        return f"{self.get_token_type_display()} for {self.user.email} ({'used' if self.is_used else 'active'})"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_valid(self):
        return not self.is_used and not self.is_expired()

    @staticmethod
    def generate_token():
        """288-bit cryptographically random URL-safe token."""
        return secrets.token_urlsafe(48)

    @classmethod
    def create_for_user(cls, user, token_type, created_by, expiry_hours=24):
        """
        Invalidate all existing active tokens of the same type for this user,
        then create and return a fresh token.
        """
        cls.objects.filter(
            user=user, token_type=token_type, is_used=False
        ).update(is_used=True)

        return cls.objects.create(
            user=user,
            token=cls.generate_token(),
            token_type=token_type,
            created_by=created_by,
            expires_at=timezone.now() + timedelta(hours=expiry_hours),
        )
