"""
Signal handlers to auto-create notifications when events occur
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


def get_superadmins():
    """Get all superadmin users to notify"""
    return User.objects.filter(role='superadmin', is_active=True)


def create_notification_for_admins(notification_type, title, message, **kwargs):
    """Helper to create notifications for all superadmins"""
    from .models import Notification
    
    superadmins = get_superadmins()
    notifications = []
    
    for admin in superadmins:
        notifications.append(
            Notification(
                recipient=admin,
                notification_type=notification_type,
                title=title,
                message=message,
                **kwargs
            )
        )
    
    if notifications:
        Notification.objects.bulk_create(notifications)


# ── Chat message notifications ───────────────────────────────────────────
@receiver(post_save, sender='chat.CaseMessage')
def notify_new_message(sender, instance, created, **kwargs):
    """Notify superadmins when client sends a message"""
    if not created:
        return
    
    # Only notify if message is from a client (not from admin)
    if instance.sender.role in ['superadmin', 'admin']:
        return
    
    # Get case or booking info
    case_id = instance.case_id
    booking_id = instance.booking_id
    
    metadata = {
        'sender_name': instance.sender.full_name,
        'sender_email': instance.sender.email,
    }
    
    if case_id:
        try:
            from apps.cases.models import Case
            case = Case.objects.select_related('service', 'booking').get(id=case_id)
            title = f"New message from {instance.sender.full_name}"
            message = f"Case #{case.id} - {case.service.name}"
            metadata['service_name'] = case.service.name
        except:
            title = f"New message from {instance.sender.full_name}"
            message = f"Case #{case_id}"
    elif booking_id:
        try:
            from apps.bookings.models import Booking
            booking = Booking.objects.select_related('service').get(id=booking_id)
            title = f"New message from {instance.sender.full_name}"
            message = f"Booking #{booking.id} - {booking.service.name}"
            metadata['service_name'] = booking.service.name
        except:
            title = f"New message from {instance.sender.full_name}"
            message = f"Booking #{booking_id}"
    else:
        title = f"New message from {instance.sender.full_name}"
        message = instance.message[:100]
    
    create_notification_for_admins(
        notification_type='CHAT',
        title=title,
        message=message,
        case_id=case_id,
        booking_id=booking_id,
        metadata=metadata
    )


# ── Payment notifications ────────────────────────────────────────────────
@receiver(post_save, sender='payments.Payment')
def notify_new_payment(sender, instance, created, **kwargs):
    """Notify superadmins when payment is received"""
    if not created:
        return
    
    # Only notify for succeeded payments
    if instance.status != 'succeeded':
        return
    
    metadata = {
        'amount': str(instance.amount),
        'currency': instance.currency,
        'user_name': instance.user.full_name,
        'user_email': instance.user.email,
    }
    
    # Get service name if available
    service_name = 'Service'
    if instance.booking:
        service_name = instance.booking.service.name
        metadata['service_name'] = service_name
    elif instance.case:
        service_name = instance.case.service.name
        metadata['service_name'] = service_name
    
    amount_display = f"${float(instance.amount):,.2f}" if instance.currency == 'USD' else f"{instance.amount} {instance.currency}"
    
    create_notification_for_admins(
        notification_type='PAYMENT',
        title=f"Payment received: {amount_display}",
        message=f"{instance.user.full_name} - {service_name}",
        payment_id=instance.id,
        case_id=instance.case_id,
        booking_id=instance.booking_id,
        metadata=metadata
    )


# ── Booking notifications ────────────────────────────────────────────────
@receiver(post_save, sender='bookings.Booking')
def notify_new_booking(sender, instance, created, **kwargs):
    """Notify superadmins of new bookings"""
    if not created:
        return
    
    metadata = {
        'service_name': instance.service.name,
        'client_name': instance.user.full_name,
        'client_email': instance.user.email,
    }
    
    create_notification_for_admins(
        notification_type='BOOKING',
        title=f"New booking: {instance.service.name}",
        message=f"From {instance.user.full_name}",
        booking_id=instance.id,
        metadata=metadata
    )


# ── Case status notifications ────────────────────────────────────────────
@receiver(post_save, sender='cases.Case')
def notify_case_changes(sender, instance, created, **kwargs):
    """Notify on important case status changes"""
    if created:
        # New case created
        metadata = {
            'service_name': instance.service.name,
            'client_name': instance.booking.user.full_name if instance.booking else 'Unknown',
        }
        
        create_notification_for_admins(
            notification_type='CASE_UPDATE',
            title=f"New case created",
            message=f"Case #{instance.id} - {instance.service.name}",
            case_id=instance.id,
            metadata=metadata
        )
