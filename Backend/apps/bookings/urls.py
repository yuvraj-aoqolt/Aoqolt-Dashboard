"""
URL Configuration for Bookings app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookingViewSet,
    BookingInitiateView,
    BookingTokenValidateView,
    BookingForm2InfoView,
)

router = DefaultRouter()
router.register(r'', BookingViewSet, basename='booking')

urlpatterns = [
    # Token-based security endpoints — registered explicitly with path() so
    # Django resolves them without any ViewSet/router URL-generation quirks.
    path('initiate/', BookingInitiateView.as_view(), name='booking-initiate'),
    path('token/<str:token>/', BookingTokenValidateView.as_view(), name='booking-validate-token'),
    path('form2/<str:token>/', BookingForm2InfoView.as_view(), name='booking-form2-info'),
    # Standard CRUD routes handled by the router
    path('', include(router.urls)),
]
