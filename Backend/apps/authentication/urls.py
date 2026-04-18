"""
URL Configuration for Authentication app
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    register_view, login_view, verify_otp_view, resend_otp_view,
    social_auth_view, logout_view, change_password_view, update_phone_view,
    forgot_password_view, reset_password_view, guest_login_view,
    self_forgot_password_view, self_reset_password_view,
)

urlpatterns = [
    # Registration & Login
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('guest/', guest_login_view, name='guest-login'),

    # OTP Verification
    path('verify-otp/', verify_otp_view, name='verify-otp'),
    path('resend-otp/', resend_otp_view, name='resend-otp'),

    # Social Authentication
    path('social-login/', social_auth_view, name='social-login'),
    path('update-phone/', update_phone_view, name='update-phone'),

    # JWT Token
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Password Management (admin/OTP-based — existing flow, do not remove)
    path('change-password/', change_password_view, name='change-password'),
    path('forgot-password/', forgot_password_view, name='forgot-password'),
    path('reset-password/', reset_password_view, name='reset-password'),

    # Password Reset for self-registered users (email link-based)
    path('self-forgot-password/', self_forgot_password_view, name='self-forgot-password'),
    path('self-reset-password/', self_reset_password_view, name='self-reset-password'),
]
