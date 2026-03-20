"""
Views for Sales
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.accounts.permissions import IsSuperAdmin
from apps.cases.models import Case
from .models import SalesQuote, SalesOrder
from .serializers import (
    SalesQuoteSerializer, SalesQuoteCreateSerializer, SalesQuoteResponseSerializer,
    SalesOrderSerializer, SalesOrderListSerializer
)


class SalesQuoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing sales quotes
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter quotes based on user role"""
        user = self.request.user
        
        if user.is_superadmin:
            return SalesQuote.objects.all().select_related('client', 'case', 'created_by')
        else:
            # Clients see only their own quotes
            return SalesQuote.objects.filter(client=user).select_related('case', 'created_by')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SalesQuoteCreateSerializer
        return SalesQuoteSerializer
    
    def get_permissions(self):
        """Only SuperAdmin can create/update/delete quotes"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """
        Client responds to quote (accept/reject)
        POST /api/v1/sales/quotes/{id}/respond/
        {
            "action": "accept",
            "notes": "I accept this quote"
        }
        """
        quote = self.get_object()
        
        # Only client can respond
        if quote.client != request.user:
            return Response({
                'success': False,
                'error': 'Only the client can respond to this quote'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if already responded
        if quote.status != SalesQuote.STATUS_PENDING:
            return Response({
                'success': False,
                'error': 'Quote has already been responded to'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = SalesQuoteResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        action = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')
        
        if action == 'accept':
            quote.status = SalesQuote.STATUS_ACCEPTED
            quote.client_response_notes = notes
            quote.responded_at = timezone.now()
            quote.save()
            
            # Create sales order
            order = SalesOrder.objects.create(
                quote=quote,
                client=quote.client,
                total_amount=quote.amount,
                currency=quote.currency
            )
            
            return Response({
                'success': True,
                'message': 'Quote accepted successfully',
                'data': {
                    'quote': SalesQuoteSerializer(quote).data,
                    'order': SalesOrderSerializer(order).data
                }
            }, status=status.HTTP_200_OK)
        
        else:  # reject
            quote.status = SalesQuote.STATUS_REJECTED
            quote.client_response_notes = notes
            quote.responded_at = timezone.now()
            quote.save()
            
            return Response({
                'success': True,
                'message': 'Quote rejected',
                'data': SalesQuoteSerializer(quote).data
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def my_quotes(self, request):
        """Get quotes for current user"""
        quotes = SalesQuote.objects.filter(client=request.user)
        serializer = SalesQuoteSerializer(quotes, many=True)
        return Response({
            'success': True,
            'count': quotes.count(),
            'data': serializer.data
        })


class SalesOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing sales orders
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter orders based on user role"""
        user = self.request.user
        
        if user.is_superadmin:
            return SalesOrder.objects.all().select_related('client', 'quote')
        else:
            return SalesOrder.objects.filter(client=user).select_related('quote')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SalesOrderListSerializer
        return SalesOrderSerializer
    
    def get_permissions(self):
        """Only SuperAdmin can update/delete orders; clients can view"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def mark_completed(self, request, pk=None):
        """Mark order as completed - SuperAdmin only"""
        order = self.get_object()
        order.status = SalesOrder.STATUS_COMPLETED
        order.completed_at = timezone.now()
        order.save()
        
        return Response({
            'success': True,
            'message': 'Order marked as completed',
            'data': SalesOrderSerializer(order).data
        })
    
    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """Get orders for current user"""
        orders = SalesOrder.objects.filter(client=request.user)
        serializer = SalesOrderListSerializer(orders, many=True)
        return Response({
            'success': True,
            'count': orders.count(),
            'data': serializer.data
        })
