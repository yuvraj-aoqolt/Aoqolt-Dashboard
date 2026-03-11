"""
Views for Payments
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from apps.accounts.permissions import IsSuperAdmin
from apps.bookings.models import Booking
from .models import Payment, WebhookEvent
from .serializers import PaymentSerializer, PaymentListSerializer, PaymentCreateSerializer
from .utils import StripeService
import stripe
import logging

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing payments (read-only for users)
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter payments based on user role"""
        user = self.request.user
        
        if user.is_superadmin:
            return Payment.objects.all().select_related('user', 'booking__service')
        else:
            return Payment.objects.filter(user=user).select_related('booking__service')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer
    
    @action(detail=False, methods=['post'])
    def create_checkout_session(self, request):
        """
        Create Stripe checkout session
        POST /api/v1/payments/create_checkout_session/
        {
            "booking_id": "uuid",
            "success_url": "https://yourdomain.com/success",
            "cancel_url": "https://yourdomain.com/cancel"
        }
        """
        serializer = PaymentCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        booking_id = serializer.validated_data['booking_id']
        success_url = serializer.validated_data['success_url']
        cancel_url = serializer.validated_data['cancel_url']
        
        try:
            booking = Booking.objects.get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Booking not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if payment already exists
        if hasattr(booking, 'payment') and booking.payment.status == Payment.STATUS_SUCCEEDED:
            return Response({
                'success': False,
                'error': 'Booking already paid'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create checkout session
        result = StripeService.create_checkout_session(booking, success_url, cancel_url)
        
        if result['success']:
            return Response({
                'success': True,
                'data': result
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Failed to create checkout session')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def refund(self, request, pk=None):
        """
        Refund a payment - SuperAdmin only
        POST /api/v1/payments/{id}/refund/
        {
            "amount": 5000,  // optional, amount in cents
            "reason": "Customer request"
        }
        """
        payment = self.get_object()
        amount = request.data.get('amount')
        reason = request.data.get('reason', '')
        
        result = StripeService.refund_payment(payment.id, amount, reason)
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Payment refunded successfully',
                'data': {'refund_id': result['refund_id']}
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """
    Stripe webhook endpoint
    POST /api/v1/payments/webhook/
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid payload")
        return Response({'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature")
        return Response({'error': 'Invalid signature'}, status=400)
    
    # Log webhook event
    webhook_event = WebhookEvent.objects.create(
        gateway='stripe',
        event_id=event['id'],
        event_type=event['type'],
        payload=event
    )
    
    # Handle event
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            StripeService.handle_payment_success(session['id'])
        
        elif event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            logger.info(f"PaymentIntent succeeded: {payment_intent['id']}")
        
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            logger.error(f"PaymentIntent failed: {payment_intent['id']}")
            
            # Update payment status
            try:
                payment = Payment.objects.get(gateway_payment_id=payment_intent['id'], gateway='stripe')
                payment.status = Payment.STATUS_FAILED
                payment.save()
            except Payment.DoesNotExist:
                pass
        
        # Mark webhook as processed
        webhook_event.processed = True
        webhook_event.save()
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        webhook_event.error_message = str(e)
        webhook_event.save()
    
    return Response({'status': 'success'}, status=200)
