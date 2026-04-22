"""
URL Configuration for Dashboard app
"""
from django.urls import path
from .views import (
    superadmin_dashboard, admin_dashboard, client_dashboard,
    revenue_report, service_statistics, global_search
)

urlpatterns = [
    path('superadmin/', superadmin_dashboard, name='superadmin-dashboard'),
    path('admin/', admin_dashboard, name='admin-dashboard'),
    path('client/', client_dashboard, name='client-dashboard'),
    path('revenue/', revenue_report, name='revenue-report'),
    path('services/', service_statistics, name='service-statistics'),
    path('search/', global_search, name='global-search'),
]
