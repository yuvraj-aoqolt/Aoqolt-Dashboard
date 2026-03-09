"""
Serializers for Services
"""
from rest_framework import serializers
from .models import Service, ServiceFeature, ServiceRequirement


class ServiceFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceFeature
        fields = ['id', 'feature_text', 'display_order']


class ServiceRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequirement
        fields = ['id', 'requirement_text', 'is_mandatory', 'field_type', 'display_order']


class ServiceSerializer(serializers.ModelSerializer):
    features = ServiceFeatureSerializer(many=True, read_only=True)
    requirements = ServiceRequirementSerializer(many=True, read_only=True)
    price_display = serializers.ReadOnlyField()
    
    class Meta:
        model = Service
        fields = [
            'id', 'service_type', 'name', 'description', 'short_description',
            'price', 'price_display', 'currency', 'duration_days',
            'is_active', 'icon', 'display_order', 'features', 'requirements',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ServiceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for service listing"""
    price_display = serializers.ReadOnlyField()
    
    class Meta:
        model = Service
        fields = [
            'id', 'service_type', 'name', 'short_description',
            'price', 'price_display', 'currency', 'icon', 'is_active'
        ]
