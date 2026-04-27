"""
Serializers for Astrology Scheduling
"""
from rest_framework import serializers
from .models import SuperAdminAvailability, AstrologySchedule


DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

DEFAULT_SCHEDULE = {day: [] for day in DAYS}


class SuperAdminAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = SuperAdminAvailability
        fields = [
            'id', 'timezone', 'weekly_schedule',
            'session_duration', 'cooldown_time',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate_weekly_schedule(self, value):
        for day in DAYS:
            value.setdefault(day, [])
        for day, ranges in value.items():
            if day not in DAYS:
                raise serializers.ValidationError(f"Unknown day: {day}")
            for r in ranges:
                parts = r.split('-')
                if len(parts) != 2:
                    raise serializers.ValidationError(f"Invalid range '{r}' — use HH:MM-HH:MM")
                for t in parts:
                    h, _, m = t.partition(':')
                    if not (h.isdigit() and m.isdigit()):
                        raise serializers.ValidationError(f"Invalid time in '{r}'")
        return value


class AstrologyScheduleSerializer(serializers.ModelSerializer):
    booking_id = serializers.CharField(source='booking.booking_id', read_only=True)
    client_name = serializers.CharField(source='booking.full_name', read_only=True)

    class Meta:
        model = AstrologySchedule
        fields = [
            'id', 'booking', 'booking_id', 'client_name',
            'appointment_start', 'appointment_end',
            'client_timezone', 'status', 'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SlotSerializer(serializers.Serializer):
    """Output slot representation (client-facing)."""
    start_utc = serializers.DateTimeField()
    end_utc   = serializers.DateTimeField()
    start_local = serializers.CharField()   # formatted in client TZ
    end_local   = serializers.CharField()
    available   = serializers.BooleanField()
