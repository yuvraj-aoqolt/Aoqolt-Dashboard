"""
Utility functions for Stripe integration
"""
import stripe
from django.conf import settings
from django.utils import timezone
from .models import Payment
from apps.bookings.models import Booking
import logging

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for Stripe payment operations"""
    
    @staticmethod
    def create_checkout_session(booking, success_url, cancel_url):
        """
        Create Stripe checkout session for booking
        """
        try:
            # Get service price
            service = booking.service
            amount = service.price
            
            # Create or get Stripe customer
            customer = None
            if booking.user.email:
                try:
                    # Search for existing customer
                    customers = stripe.Customer.list(email=booking.user.email, limit=1)
                    if customers.data:
                        customer = customers.data[0]
                    else:
                        # Create new customer
                        customer = stripe.Customer.create(
                            email=booking.user.email,
                            name=booking.full_name,
                            phone=booking.phone_number
                        )
                except Exception as e:
                    logger.error(f"Error creating Stripe customer: {str(e)}")
            
            # Build request payload (stored as raw request)
            checkout_request = {
                'customer': customer.id if customer else None,
                'payment_method_types': ['card'],
                'line_items': [{
                    'price_data': {
                        'currency': service.currency.lower(),
                        'unit_amount': amount,
                        'product_data': {
                            'name': service.name,
                            'description': service.short_description,
                        },
                    },
                    'quantity': 1,
                }],
                'mode': 'payment',
                'success_url': success_url + '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url': cancel_url,
                'metadata': {
                    'booking_id': str(booking.id),
                    'user_id': str(booking.user.id),
                    'service_type': service.service_type
                }
            }

            # Create checkout session
            session = stripe.checkout.Session.create(**checkout_request)
            
            # Create payment record
            payment = Payment.objects.create(
                user=booking.user,
                booking=booking,
                amount=amount,
                currency=service.currency,
                gateway=Payment.GATEWAY_STRIPE,
                gateway_payment_id=session.payment_intent or session.id,
                gateway_order_id=session.id,
                gateway_customer_id=customer.id if customer else '',
                gateway_request=checkout_request,
                gateway_response=dict(session),
                description=f"Payment for {service.name}",
                status=Payment.STATUS_PENDING
            )
            
            # Update booking status
            booking.status = Booking.STATUS_PAYMENT_PENDING
            booking.save()
            
            return {
                'success': True,
                'session_id': session.id,
                'session_url': session.url,
                'payment_id': str(payment.id)
            }
            
        except Exception as e:
            logger.error(f"Error creating Stripe checkout session: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def handle_payment_success(session_id):
        """
        Handle successful payment from Stripe webhook
        """
        try:
            # Retrieve session
            session = stripe.checkout.Session.retrieve(session_id)
            
            # Get payment
            payment = Payment.objects.get(gateway_order_id=session_id, gateway=Payment.GATEWAY_STRIPE)
            
            # Update payment status
            payment.status = Payment.STATUS_SUCCEEDED
            payment.paid_at = timezone.now()
            payment.payment_method = session.payment_method_types[0] if session.payment_method_types else ''
            payment.save()
            
            # Update booking
            booking = payment.booking
            booking.status = Booking.STATUS_COMPLETED
            booking.completed_at = timezone.now()
            booking.save()

            logger.info(f"Payment succeeded for booking {booking.id} ({booking.booking_id})")
            
            return True
            
        except Payment.DoesNotExist:
            logger.error(f"Payment not found for session {session_id}")
            return False
        except Exception as e:
            logger.error(f"Error handling payment success: {str(e)}")
            return False
    
    @staticmethod
    def refund_payment(payment_id, amount=None, reason=''):
        """
        Refund a payment
        """
        try:
            payment = Payment.objects.get(id=payment_id)
            
            if payment.status != Payment.STATUS_SUCCEEDED:
                return {'success': False, 'error': 'Only successful payments can be refunded'}
            
            # Create refund in Stripe
            refund_amount = amount or payment.amount
            refund = stripe.Refund.create(
                payment_intent=payment.gateway_payment_id,
                amount=refund_amount,
                reason=reason or 'requested_by_customer'
            )
            
            # Update payment
            payment.status = Payment.STATUS_REFUNDED
            payment.refund_amount = refund_amount
            payment.refund_reason = reason
            payment.refunded_at = timezone.now()
            payment.save()
            
            return {'success': True, 'refund_id': refund.id}
            
        except Payment.DoesNotExist:
            return {'success': False, 'error': 'Payment not found'}
        except Exception as e:
            logger.error(f"Error refunding payment: {str(e)}")
            return {'success': False, 'error': str(e)}
