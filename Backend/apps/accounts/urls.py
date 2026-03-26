"""
URL Configuration for Accounts app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, ProfileView,
    CreateInvitedUserView, GenerateInviteLinkView, GenerateResetLinkView,
    ValidateInviteTokenView, SetPasswordViaTokenView, UserInviteStatusView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('profile/', ProfileView.as_view(), name='user-profile'),

    # ── Invitation / Account-Setup ─────────────────────────────────────────
    # SuperAdmin-only: create users & manage invite/reset tokens
    path('admin/create-user/', CreateInvitedUserView.as_view(), name='invite-create-user'),
    path('admin/generate-invite/', GenerateInviteLinkView.as_view(), name='invite-generate'),
    path('admin/generate-reset/', GenerateResetLinkView.as_view(), name='invite-generate-reset'),
    path('admin/invite-status/<str:user_id>/', UserInviteStatusView.as_view(), name='invite-status'),

    # Public: validate token & set password (no auth required)
    path('validate-token/<str:token>/', ValidateInviteTokenView.as_view(), name='invite-validate-token'),
    path('set-password/', SetPasswordViaTokenView.as_view(), name='invite-set-password'),
]
