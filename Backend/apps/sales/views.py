"""
Views for Sales
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
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
        if self.action in ['public_quote', 'quote_payment', 'quote_payment_success', 'confirm_payment']:
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

    # ── Public: pay quote (partial or full) via Stripe — no login required ────
    @action(detail=False, methods=['post'], permission_classes=[AllowAny],
            url_path='pay/(?P<token>[^/.]+)')
    def quote_payment(self, request, token=None):
        """
        POST /api/v1/sales/quotes/pay/{token}/
        { "payment_type": "full" | "partial" }
        Public endpoint — no authentication required.
        """
        try:
            quote = SalesQuote.objects.get(access_token=token)
        except SalesQuote.DoesNotExist:
            return Response({'success': False, 'error': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)

        if quote.status not in [SalesQuote.STATUS_PENDING, SalesQuote.STATUS_DRAFT]:
            return Response({'success': False, 'error': 'Quote is not payable'}, status=status.HTTP_400_BAD_REQUEST)

        payment_type = request.data.get('payment_type', 'full')
        total_cents = int(float(quote.amount) * 100)
        amount_cents = total_cents // 2 if payment_type == 'partial' else total_cents

        # Use the real email from the booking form, not the internal guest address
        booking_email = None
        try:
            booking_email = quote.case.booking.email
        except Exception:
            pass
        real_email = booking_email or (quote.client.email if not quote.client.is_guest else None)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        success_url = f"{frontend_url}/quote/payment/success?session_id={{CHECKOUT_SESSION_ID}}&quote_id={quote.id}&type={payment_type}&token={token}"
        cancel_url  = f"{frontend_url}/quote/{token}"

        try:
            # Create or retrieve a Stripe Customer so the email is locked (non-editable)
            stripe_customer = None
            if real_email:
                existing = stripe.Customer.list(email=real_email, limit=1)
                if existing.data:
                    stripe_customer = existing.data[0].id
                else:
                    cust = stripe.Customer.create(
                        email=real_email,
                        name=quote.client.full_name if not quote.client.is_guest else quote.client_name or real_email,
                        metadata={'quote_id': str(quote.id)},
                    )
                    stripe_customer = cust.id

            session_params = dict(
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
                    'payment_type': payment_type,
                    'access_token': token,
                },
            )
            if stripe_customer:
                session_params['customer'] = stripe_customer  # locks the email field
            elif real_email:
                session_params['customer_email'] = real_email  # fallback: pre-fill only

            session = stripe.checkout.Session.create(**session_params)
            return Response({'success': True, 'session_url': session.url, 'session_id': session.id})
        except Exception as e:
            logger.error(f"Stripe session error for quote {quote.id}: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Public: confirm quote payment after Stripe redirect ─────────────────
    @action(detail=False, methods=['post'], permission_classes=[AllowAny],
            url_path='confirm_payment')
    def confirm_payment(self, request):
        """
        POST /api/v1/sales/quotes/confirm_payment/
        { "session_id": "...", "quote_id": "...", "payment_type": "full|partial" }
        Public endpoint — called from frontend after Stripe redirect (no login needed).
        Returns client_has_account so frontend can decide whether to show login prompt.
        """
        session_id   = request.data.get('session_id')
        quote_id     = request.data.get('quote_id')
        payment_type = request.data.get('payment_type', 'full')

        try:
            quote = SalesQuote.objects.select_related('client', 'case').get(id=quote_id)
        except SalesQuote.DoesNotExist:
            return Response({'success': False, 'error': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)

        # Verify Stripe session (skip for already-accepted quotes to avoid re-processing)
        if quote.status != SalesQuote.STATUS_ACCEPTED:
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

            # Create a new treatment Case (sales-based, no booking FK)
            try:
                Case.objects.create(
                    booking=None,
                    client=quote.client,
                    source='sales',
                    status=Case.STATUS_RECEIVED,
                    admin_notes=f"Treatment case from quote {quote.quote_number}",
                )
            except Exception as exc:
                logger.warning(f"Sales case creation failed for quote {quote.id}: {exc}")

        # Create or update sales order (idempotent)
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
        if not created and order.payment_status != 'paid':
            order.payment_status = 'paid'
            order.amount_paid = float(quote.amount)
            order.save(update_fields=['payment_status', 'amount_paid'])

        # True only for real registered accounts — guests have is_guest=True
        client_has_account = bool(quote.client_id) and not quote.client.is_guest

        return Response({
            'success': True,
            'payment_type': payment_type,
            'case_number': quote.case.case_number,
            'order_number': order.order_number,
            'client_has_account': client_has_account,
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
            return SalesOrder.objects.all().select_related(
                'client', 'quote', 'quote__case', 'quote__case__booking',
                'quote__case__booking__service',
            )
        return SalesOrder.objects.filter(client=user).select_related(
            'quote', 'quote__case', 'quote__case__booking', 'quote__case__booking__service',
        )

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

    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin])
    def partial_overdue(self, request):
        """
        GET /api/v1/sales/orders/partial_overdue/
        Returns sales orders where:
          - payment_status = 'partial'
          - partial_since is at least 15 days ago
        SuperAdmin only.
        """
        threshold = timezone.now() - timedelta(days=15)
        orders = SalesOrder.objects.filter(
            payment_status='partial',
            partial_since__lte=threshold,
        ).select_related(
            'client', 'quote', 'quote__case', 'quote__case__booking',
            'quote__case__booking__service',
        ).order_by('partial_since')

        data = []
        for o in orders:
            days_overdue = (timezone.now() - o.partial_since).days
            service_name = ''
            try:
                service_name = o.quote.case.booking.service.name
            except Exception:
                pass
            if not service_name:
                try:
                    service_name = o.quote.title
                except Exception:
                    pass
            data.append({
                'id':            str(o.id),
                'order_number':  o.order_number,
                'client_name':   o.client.full_name,
                'client_email':  o.client.email,
                'service_name':  service_name,
                'total_amount':  str(o.total_amount),
                'amount_paid':   str(o.amount_paid),
                'currency':      o.currency,
                'partial_since': o.partial_since.isoformat(),
                'days_overdue':  days_overdue,
            })

        return Response({'success': True, 'count': len(data), 'data': data})
