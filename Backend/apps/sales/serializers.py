"""
Serializers for Sales
"""
from rest_framework import serializers
from django.utils import timezone
from .models import SalesQuote, SalesQuoteItem, SalesOrder


class SalesQuoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesQuoteItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['id', 'total_price']


class SalesQuoteSerializer(serializers.ModelSerializer):
    items = SalesQuoteItemSerializer(many=True, read_only=True)
    amount_display = serializers.ReadOnlyField()
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    service_name = serializers.SerializerMethodField()

    def get_service_name(self, obj):
        try:
            return obj.case.booking.service.name
        except Exception:
            return ''

    class Meta:
        model = SalesQuote
        fields = [
            'id', 'quote_number', 'case', 'case_number', 'client', 'client_name',
            'client_email', 'created_by', 'created_by_name', 'title', 'description',
            'amount', 'amount_display', 'currency', 'valid_until',
            'terms_and_conditions', 'status', 'items', 'client_response_notes',
            'responded_at', 'created_at', 'updated_at',
            'is_sent', 'sent_at', 'service_name', 'access_token',
        ]
        read_only_fields = [
            'id', 'quote_number', 'client', 'created_by', 'status',
            'responded_at', 'created_at', 'updated_at', 'is_sent', 'sent_at', 'access_token',
        ]


class SalesQuoteCreateSerializer(serializers.ModelSerializer):
    items = SalesQuoteItemSerializer(many=True, required=False)
    
    class Meta:
        model = SalesQuote
        fields = [
            'case', 'title', 'description', 'amount', 'currency',
            'valid_until', 'terms_and_conditions', 'items'
        ]
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        
        # Get case and client
        case = validated_data['case']
        
        quote = SalesQuote.objects.create(
            client=case.client,
            created_by=request.user,
            **validated_data
        )
        
        # Create quote items
        for item_data in items_data:
            SalesQuoteItem.objects.create(quote=quote, **item_data)
        
        return quote


class SalesQuoteResponseSerializer(serializers.Serializer):
    """Serializer for client response to quote"""
    action = serializers.ChoiceField(choices=['accept', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)


class SalesOrderSerializer(serializers.ModelSerializer):
    amount_display = serializers.ReadOnlyField()
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    quote_number = serializers.CharField(source='quote.quote_number', read_only=True)
    
    class Meta:
        model = SalesOrder
        fields = [
            'id', 'order_number', 'quote', 'quote_number', 'client',
            'client_name', 'client_email', 'total_amount', 'amount_display',
            'currency', 'payment_status', 'amount_paid', 'status', 'notes',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'client', 'total_amount', 'currency',
            'created_at', 'updated_at', 'completed_at'
        ]


class SalesOrderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing orders"""
    amount_display = serializers.ReadOnlyField()
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    quote_number = serializers.CharField(source='quote.quote_number', read_only=True)
    service_name = serializers.SerializerMethodField()

    def get_service_name(self, obj):
        try:
            return obj.quote.case.booking.service.name
        except Exception:
            return ''

    class Meta:
        model = SalesOrder
        fields = [
            'id', 'order_number', 'quote_number', 'client_name', 'client_email',
            'amount_display', 'total_amount', 'currency',
            'payment_status', 'amount_paid', 'status', 'service_name', 'created_at'
        ]
