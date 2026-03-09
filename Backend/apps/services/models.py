"""
Service Models
"""
from django.db import models
from django.core.validators import MinValueValidator
import uuid


class Service(models.Model):
    """
    Model for spiritual services offered on the platform
    """
    SINGLE_AURA = 'single_aura'
    FAMILY_AURA = 'family_aura'
    ASTROLOGY = 'astrology'
    
    SERVICE_TYPES = [
        (SINGLE_AURA, 'Single Aura'),
        (FAMILY_AURA, 'Family Aura'),
        (ASTROLOGY, 'Astrology'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_type = models.CharField(max_length=50, choices=SERVICE_TYPES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    short_description = models.CharField(max_length=255, blank=True)
    
    # Pricing (in cents to avoid decimal issues)
    price = models.IntegerField(validators=[MinValueValidator(0)], help_text="Price in cents")
    currency = models.CharField(max_length=3, default='USD')
    
    # Service details
    duration_days = models.IntegerField(default=7, help_text="Expected delivery time in days")
    is_active = models.BooleanField(default=True)
    
    # Display
    icon = models.ImageField(upload_to='service_icons/', blank=True, null=True)
    display_order = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services'
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return self.name
    
    @property
    def price_display(self):
        """Return price in dollars"""
        return f"${self.price / 100:.2f}"


class ServiceFeature(models.Model):
    """
    Features included in each service
    """
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='features')
    feature_text = models.CharField(max_length=255)
    display_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'service_features'
        ordering = ['display_order']
    
    def __str__(self):
        return f"{self.service.name} - {self.feature_text}"


class ServiceRequirement(models.Model):
    """
    Requirements/information needed for each service
    """
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='requirements')
    requirement_text = models.CharField(max_length=255)
    is_mandatory = models.BooleanField(default=True)
    field_type = models.CharField(
        max_length=20,
        choices=[
            ('text', 'Text'),
            ('textarea', 'Text Area'),
            ('date', 'Date'),
            ('file', 'File Upload'),
            ('number', 'Number'),
        ],
        default='text'
    )
    display_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'service_requirements'
        ordering = ['display_order']
    
    def __str__(self):
        return f"{self.service.name} - {self.requirement_text}"
