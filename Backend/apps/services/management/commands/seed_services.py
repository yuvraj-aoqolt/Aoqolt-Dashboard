"""
Management command to seed initial services
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.services.models import Service


class Command(BaseCommand):
    help = 'Seed initial services (Single Aura, Family Aura, Astrology)'

    def handle(self, *args, **kwargs):
        services_data = [
            {
                'service_type': 'single_aura',
                'name': 'Single Aura Scan',
                'description': 'Comprehensive aura reading for one person. Get insights into your energy field, spiritual state, and life path.',
                'short_description': 'Personal aura analysis and spiritual guidance',
                'price': settings.SERVICE_PRICES.get('single_aura', 9900),
                'duration_days': 7,
                'is_active': True,
                'display_order': 1,
            },
            {
                'service_type': 'family_aura',
                'name': 'Family Aura Scan',
                'description': 'Complete aura reading for your entire family. Understand family dynamics, energy connections, and collective spiritual guidance.',
                'short_description': 'Family energy analysis and harmony guidance',
                'price': settings.SERVICE_PRICES.get('family_aura', 19900),
                'duration_days': 10,
                'is_active': True,
                'display_order': 2,
            },
            {
                'service_type': 'astrology',
                'name': 'Astrology Session',
                'description': 'Detailed astrological chart reading based on your birth details. Discover your life purpose, strengths, and future predictions.',
                'short_description': 'Personalized birth chart and life path analysis',
                'price': settings.SERVICE_PRICES.get('astrology', 14900),
                'duration_days': 7,
                'is_active': True,
                'display_order': 3,
            },
        ]

        created_count = 0
        updated_count = 0

        for service_data in services_data:
            service, created = Service.objects.update_or_create(
                service_type=service_data['service_type'],
                defaults=service_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {service.name} (${service.price/100:.2f})')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Updated: {service.name} (${service.price/100:.2f})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Seeding complete: {created_count} created, {updated_count} updated'
            )
        )
