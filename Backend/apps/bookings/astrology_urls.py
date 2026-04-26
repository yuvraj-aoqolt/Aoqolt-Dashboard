"""
URL Configuration for Astrology Bookings (separate table/API)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AstrologyBookingViewSet

router = DefaultRouter()
router.register(r'', AstrologyBookingViewSet, basename='astrology-booking')

urlpatterns = [
    path('', include(router.urls)),
]
