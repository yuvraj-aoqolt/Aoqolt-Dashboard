"""
Core URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# API Documentation Schema
schema_view = get_schema_view(
    openapi.Info(
        title="Aoqolt Spiritual Services API",
        default_version='v1',
        description="Production-ready REST API for spiritual service bookings",
        terms_of_service="https://www.aoqolt.com/terms/",
        contact=openapi.Contact(email="[email protected]"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/schema/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # API Routes
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/accounts/', include('apps.accounts.urls')),
    path('api/v1/services/', include('apps.services.urls')),
    path('api/v1/bookings/', include('apps.bookings.urls')),
    path('api/v1/astrology/', include('apps.astrology.urls')),
    path('api/v1/cases/', include('apps.cases.urls')),
    path('api/v1/chat/', include('apps.chat.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/sales/', include('apps.sales.urls')),
    path('api/v1/dashboard/', include('apps.dashboard.urls')),
    path('api/v1/blogs/', include('apps.blogs.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/sessions/', include('apps.sessions.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Custom Admin Site Configuration
admin.site.site_header = "Aoqolt Administration"
admin.site.site_title = "Aoqolt Admin Portal"
admin.site.index_title = "Welcome to Aoqolt Administration"
