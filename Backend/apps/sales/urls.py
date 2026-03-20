"""
URL Configuration for Sales app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesQuoteViewSet, SalesOrderViewSet

router = DefaultRouter()
router.register(r'quotes', SalesQuoteViewSet, basename='quote')
router.register(r'orders', SalesOrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
