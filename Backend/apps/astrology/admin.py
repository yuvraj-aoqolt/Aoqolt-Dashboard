from django.contrib import admin
from .models import SuperAdminAvailability, AstrologySchedule


@admin.register(SuperAdminAvailability)
class SuperAdminAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('user', 'timezone', 'session_duration', 'cooldown_time', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AstrologySchedule)
class AstrologyScheduleAdmin(admin.ModelAdmin):
    list_display = ('booking', 'appointment_start', 'appointment_end', 'client_timezone', 'status', 'created_at')
    list_filter  = ('status',)
    search_fields = ('booking__booking_id', 'booking__full_name')
    readonly_fields = ('id', 'created_at', 'updated_at')
