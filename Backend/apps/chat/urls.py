"""
URL Configuration for Chat app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CaseMessageViewSet

router = DefaultRouter()
router.register(r'messages', CaseMessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]
