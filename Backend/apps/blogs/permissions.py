"""
Blog Permissions
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsBlogManagerOrSuperAdmin(BasePermission):
    """Can create/edit blogs."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superadmin or getattr(request.user, 'can_manage_blogs', False)


class IsBlogAuthorOrSuperAdmin(BasePermission):
    """Can edit/delete a specific blog."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superadmin:
            return True
        return obj.author == request.user
