"""
Admin configuration for Services app
"""
from django.contrib import admin
from .models import Service, ServiceFeature, ServiceRequirement


class ServiceFeatureInline(admin.TabularInline):
    model = ServiceFeature
    extra = 1


class ServiceRequirementInline(admin.TabularInline):
    model = ServiceRequirement
    extra = 1


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'price_display', 'duration_days', 'is_active', 'display_order']
    list_filter = ['is_active', 'service_type']
    search_fields = ['name', 'description']
    ordering = ['display_order', 'name']
    inlines = [ServiceFeatureInline, ServiceRequirementInline]
