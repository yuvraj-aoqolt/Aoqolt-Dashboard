"""
Views for Sales
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from apps.accounts.permissions import IsSuperAdmin
from apps.cases.models import Case
from .models import SalesQuote, SalesQuoteItem, SalesOrder
from .serializers import (
    SalesQuoteSerializer, SalesQuoteCreateSerializer, SalesQuoteResponseSerializer,
    SalesOrderSerializer, SalesOrderListSerializer
)
import stripe
import logging

logger = logging.getLogger(__name__)
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


class SalesQuoteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing sales quotes"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superadmin:
            return SalesQuote.objects.all().select_related('client', 'case', 'created_by').prefetch_related('items')
        return SalesQuote.objects.filter(client=user).select_related('case', 'created_by').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'create':
            return SalesQuoteCreateSerializer
        return SalesQuoteSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'send_quote']:
            return [IsSuperAdmin()]
        if self.action in ['public_quote', 'quote_payment', 'quote_payment_success']:
            return [AllowAny()]
        return super().get_permissions()

    # ── SuperAdmin: save items ────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def save_items(self, request, pk=None):
        """
        Replace all line items for a quote and update total amount.
        POST /api/v1/sales/quotes/{id}/save_items/
        { "items": [{"description":"..","quantity":1,"unit_price":"100.00"}], "title":"..","valid_until":"2026-05-01" }
        """
        quote = self.get_object()
        items_data = request.data.get('items', [])
        title = request.data.get('title', quote.title)
        valid_until = request.data.get('valid_until', quote.valid_until)
        description = request.data.get('description', quote.description)

        quote.title = title
        quote.description = description
        if valid_until:
            quote.valid_until = valid_until
        quote.status = SalesQuote.STATUS_DRAFT
        quote.items.all().delete()

        total = 0
        for item_data in items_data:
            qty = int(item_data.get('quantity', 1))
            price = float(item_data.get('unit_price', 0))
            SalesQuoteItem.objects.create(
                quote=quote,
                description=item_data.get('description', ''),
                quantity=qty,
                unit_price=price,
                total_price=qty * price,
            )
            total += qty * price

        quote.amount = total
        quote.save()
        return Response({'success': True, 'data': SalesQuoteSerializer(quote).data})

    # ── SuperAdmin: send quote by email ─────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def send_quote(self, request, pk=None):
        """
        Send quote link to client email.
        POST /api/v1/sales/quotes/{id}/send_quote/
        Returns: { quote_url, email_sent }
        """
        quote = self.get_object()
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        quote_url = f"{frontend_url}/quote/{quote.access_token}"

        # Send email
        subject = f"Your Aoqolt Quote – {quote.quote_number}"
        html_message = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0d0d0d;color:#fff;padding:32px;border-radius:12px;">
          <h2 style="color:#ef4444;">Aoqolt Spiritual Insights</h2>
          <p>Dear {quote.client.full_name},</p>
          <p>Your treatment quote <strong>{quote.quote_number}</strong> is ready.</p>
          <p>Amount: <strong>${quote.amount:.2f} {quote.currency}</strong></p>
          <p>Valid until: <strong>{quote.valid_until or 'N/A'}</strong></p>
          <a href="{quote_url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
            View &amp; Pay Quote
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px;">
            If the button above doesn't work, copy this link:<br/>
            <a href="{quote_url}" style="color:#ef4444;">{quote_url}</a>
          </p>
          <p style="color:#888;font-size:12px;">Aoqolt · contact@aoqolt.com</p>
        </div>
        """
        email_sent = False
        try:
            send_mail(
                subject=subject,
                message=strip_tags(html_message),
                from_email=settings.DEFAULT_FROM_EMAIL or 'contact@aoqolt.com',
                recipient_list=[quote.client.email],
                html_message=html_message,
                fail_silently=False,
            )
            email_sent = True
        except Exception as e:
            logger.warning(f"Quote email failed: {e}")

        quote.is_sent = True
        quote.sent_at = timezone.now()
        quote.status = SalesQuote.STATUS_PENDING
        quote.save(update_fields=['is_sent', 'sent_at', 'status'])

        return Response({
            'success': True,
            'quote_url': quote_url,
            'email_sent': email_sent,
            'data': SalesQuoteSerializer(quote).data,
        })

    # ── Public: get quote by token (no auth required) ────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
            url_path='public/(?P<token>[^/.]+)')
    def public_quote(self, request, token=None):
        """
        GET /api/v1/sales/quotes/public/{token}/
        Returns quote data. Authentication checked on frontend for payment.
        """
        try:
            quote = SalesQuote.objects.get(access_token=token)
        except SalesQuote.DoesNotExist:
            return Response({'success': False, 'error': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': SalesQuoteSerializer(quote).data})

    # ── Client: pay quote (partial or full) via Stripe ───────────────────────
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated],
            url_path='pay/(?P<token>[^/.]+)')
    def quote_payment(self, request, token=None):
        """
        POST /api/v1/sales/quotes/pay/{token}/
        { "payment_type": "full" | "partial" }
        """
        try:
            quote = SalesQuote.objects.get(access_token=token)
        except SalesQuote.DoesNotExist:
            return Response({'success': False, 'error': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)

        if quote.client != request.user:
            return Response({'success': False, 'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        if quote.status not in [SalesQuote.STATUS_PENDING, SalesQuote.STATUS_DRAFT]:
            return Response({'success': False, 'error': 'Quote is not payable'}, status=status.HTTP_400_BAD_REQUEST)

        payment_type = request.data.get('payment_type', 'full')
        total_cents = int(float(quote.amount) * 100)
        amount_cents = total_cents // 2 if payment_type == 'partial' else total_cents

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        success_url = f"{frontend_url}/quote/payment/success?session_id={{CHECKOUT_SESSION_ID}}&quote_id={quote.id}&type={payment_type}"
        cancel_url  = f"{frontend_url}/quote/{token}"

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': quote.currency.lower(),
                        'unit_amount': amount_cents,
                        'product_data': {
                            'name': f"{'50% Deposit' if payment_type == 'partial' else 'Full Payment'} – {quote.title or quote.quote_number}",
                            'description': f"Quote {quote.quote_number}",
                        },
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'quote_id': str(quote.id),
                    'user_id': str(request.user.id),
                    'payment_type': payment_type,
                },
            )
            return Response({'success': True, 'session_url': session.url, 'session_id': session.id})
        except Exception as e:
            logger.error(f"Stripe session error for quote {quote.id}: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Webhook / success: confirm quote payment ─────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated],
            url_path='confirm_payment')
    def confirm_payment(self, request):
        """
        POST /api/v1/sales/quotes/confirm_payment/
        { "session_id": "...", "quote_id": "...", "payment_type": "full|partial" }
        Called from frontend after Stripe redirect.
        """
        session_id   = request.data.get('session_id')
        quote_id     = request.data.get('quote_id')
        payment_type = request.data.get('payment_type', 'full')

        try:
            quote = SalesQuote.objects.get(id=quote_id, client=request.user)
        except SalesQuote.DoesNotExist:
            return Response({'success': False, 'error': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)

        # Verify Stripe session
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.payment_status != 'paid':
                return Response({'success': False, 'error': 'Payment not confirmed'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark quote accepted
        quote.status = SalesQuote.STATUS_ACCEPTED
        quote.responded_at = timezone.now()
        quote.save(update_fields=['status', 'responded_at'])

        # Create or update sales order
        order, created = SalesOrder.objects.get_or_create(
            quote=quote,
            defaults={
                'client': quote.client,
                'total_amount': quote.amount,
                'currency': quote.currency,
                'payment_status': 'partial' if payment_type == 'partial' else 'paid',
                'amount_paid': float(quote.amount) / 2 if payment_type == 'partial' else float(quote.amount),
            }
        )
        if not created:
            order.payment_status = 'paid'
            order.amount_paid = float(quote.amount)
            order.save(update_fields=['payment_status', 'amount_paid'])

        return Response({
            'success': True,
            'payment_type': payment_type,
            'case_number': quote.case.case_number,
            'order_number': order.order_number,
        })

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Client responds to quote (accept/reject)"""
        quote = self.get_object()
        if quote.client != request.user:
            return Response({'success': False, 'error': 'Only the client can respond'}, status=status.HTTP_403_FORBIDDEN)
        if quote.status not in [SalesQuote.STATUS_PENDING, SalesQuote.STATUS_DRAFT]:
            return Response({'success': False, 'error': 'Quote already responded to'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SalesQuoteResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        action_choice = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')
        if action_choice == 'accept':
            quote.status = SalesQuote.STATUS_ACCEPTED
            quote.client_response_notes = notes
            quote.responded_at = timezone.now()
            quote.save()
            order = SalesOrder.objects.create(quote=quote, client=quote.client, total_amount=quote.amount, currency=quote.currency)
            return Response({'success': True, 'data': {'quote': SalesQuoteSerializer(quote).data, 'order': SalesOrderSerializer(order).data}})
        else:
            quote.status = SalesQuote.STATUS_REJECTED
            quote.client_response_notes = notes
            quote.responded_at = timezone.now()
            quote.save()
            return Response({'success': True, 'data': SalesQuoteSerializer(quote).data})

    @action(detail=False, methods=['get'])
    def my_quotes(self, request):
        quotes = SalesQuote.objects.filter(client=request.user).prefetch_related('items')
        serializer = SalesQuoteSerializer(quotes, many=True)
        return Response({'success': True, 'count': quotes.count(), 'data': serializer.data})


class SalesOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing sales orders"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superadmin:
            return SalesOrder.objects.all().select_related('client', 'quote__case__booking__service')
        return SalesOrder.objects.filter(client=user).select_related('quote')

    def get_serializer_class(self):
        if self.action == 'list':
            return SalesOrderListSerializer
        return SalesOrderSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return super().get_permissions()

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def mark_completed(self, request, pk=None):
        order = self.get_object()
        order.status = SalesOrder.STATUS_COMPLETED
        order.completed_at = timezone.now()
        order.save()
        return Response({'success': True, 'message': 'Order marked as completed', 'data': SalesOrderSerializer(order).data})

    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        orders = SalesOrder.objects.filter(client=request.user)
        serializer = SalesOrderListSerializer(orders, many=True)
        return Response({'success': True, 'count': orders.count(), 'data': serializer.data})
