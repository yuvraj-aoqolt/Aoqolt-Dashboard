"""
URL Configuration for Bookings app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet, CorrectionView

router = DefaultRouter()
router.register(r'', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
    # Public correction endpoints (token-based, no auth required)
    path('correction/<uuid:token>/', CorrectionView.as_view(), name='correction-detail'),
    path('correction/<uuid:token>/submit/', CorrectionView.as_view(), name='correction-submit'),
]
