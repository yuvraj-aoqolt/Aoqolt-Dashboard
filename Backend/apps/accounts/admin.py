"""
Admin configuration for Accounts app
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserProfile, InvitationToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User Admin"""
    
    list_display = ['email', 'full_name', 'role', 'phone_number', 'is_verified', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_verified', 'auth_provider', 'date_joined']
    search_fields = ['email', 'full_name', 'phone_number']
    ordering = ['-date_joined']
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'password')
        }),
        ('Personal Information', {
            'fields': ('full_name', 'country_code', 'phone_number', 'avatar', 
                      'address', 'city', 'country', 'postal_code')
        }),
        ('Role & Permissions', {
            'fields': ('role', 'is_active', 'is_verified', 'is_staff', 'is_superuser')
        }),
        ('Authentication Provider', {
            'fields': ('auth_provider', 'social_id')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'phone_number', 'password1', 'password2', 'role'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login']
    
    def get_queryset(self, request):
        """Filter users based on role"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(role=User.CLIENT)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """User Profile Admin"""
    
    list_display = ['user', 'get_role', 'total_cases_handled', 'total_bookings', 'rating', 'created_at']
    list_filter = ['user__role', 'notification_enabled']
    search_fields = ['user__email', 'user__full_name']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Personal Information', {
            'fields': ('date_of_birth', 'gender')
        }),
        ('Preferences', {
            'fields': ('notification_enabled', 'email_notifications', 'sms_notifications')
        }),
        ('Statistics', {
            'fields': ('total_cases_handled', 'total_bookings', 'total_spent')
        }),
        ('Admin Fields', {
            'fields': ('specialization', 'bio', 'rating', 'total_reviews')
        }),
    )
    
    readonly_fields = []
    
    def get_role(self, obj):
        return obj.user.get_role_display()
    get_role.short_description = 'Role'


@admin.register(InvitationToken)
class InvitationTokenAdmin(admin.ModelAdmin):
    """Admin panel for InvitationToken management."""

    list_display = [
        'user', 'token_type', 'short_token', 'is_used',
        'token_status', 'created_by', 'created_at', 'expires_at',
    ]
    list_filter = ['token_type', 'is_used', 'created_at']
    search_fields = ['user__email', 'user__full_name', 'token']
    ordering = ['-created_at']
    readonly_fields = [
        'token', 'created_at', 'expires_at', 'used_at',
        'created_by', 'user',
    ]

    fieldsets = (
        ('Token Info', {
            'fields': ('token', 'token_type', 'is_used', 'used_at'),
        }),
        ('Linked User', {
            'fields': ('user', 'created_by'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'expires_at'),
        }),
    )

    def short_token(self, obj):
        return f"{obj.token[:12]}…"
    short_token.short_description = 'Token (preview)'

    def token_status(self, obj):
        if obj.is_used:
            return format_html('<span style="color:grey;">Used</span>')
        if obj.is_expired():
            return format_html('<span style="color:red;">Expired</span>')
        return format_html('<span style="color:green;">Active</span>')
    token_status.short_description = 'Status'

    def has_add_permission(self, request):
        # Tokens are only created via the API, not the admin panel
        return False
