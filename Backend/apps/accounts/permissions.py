"""
Permissions for role-based access control
"""
from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Permission check for SuperAdmin role"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superadmin


class IsAdmin(permissions.BasePermission):
    """Permission check for Admin (Baba) role"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsClient(permissions.BasePermission):
    """Permission check for Client role"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_client


class IsSuperAdminOrAdmin(permissions.BasePermission):
    """Permission for SuperAdmin or Admin"""
    
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                (request.user.is_superadmin or request.user.is_admin))


class IsOwnerOrSuperAdmin(permissions.BasePermission):
    """Permission to only allow owners or superadmin to edit an object"""
    
    def has_object_permission(self, request, view, obj):
        # SuperAdmin can access anything
        if request.user.is_superadmin:
            return True
        
        # Check if obj is user or has user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return obj == request.user


class IsVerified(permissions.BasePermission):
    """Permission to check if user is verified"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified
