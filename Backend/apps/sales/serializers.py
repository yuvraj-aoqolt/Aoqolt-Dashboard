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
    case_number = serializers.SerializerMethodField()
    booking_ref = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    service_name = serializers.SerializerMethodField()

    def get_case_number(self, obj):
        try:
            return obj.case.case_number if obj.case else None
        except Exception:
            return None

    def get_booking_ref(self, obj):
        try:
            return obj.booking.booking_id if obj.booking else None
        except Exception:
            return None

    def get_service_name(self, obj):
        try:
            if obj.booking:
                return getattr(obj.booking.service, 'name', None) or obj.booking.selected_service or ''
            return obj.case.booking.service.name
        except Exception:
            return ''

    class Meta:
        model = SalesQuote
        fields = [
            'id', 'quote_number', 'case', 'case_number', 'booking', 'booking_ref',
            'client', 'client_name', 'client_email', 'created_by', 'created_by_name',
            'title', 'description', 'amount', 'amount_display', 'currency', 'valid_until',
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


class SalesOrderListSerializer(serializers.ModelSerializer):
    """Full serializer for the invoice page — mirrors PaymentListSerializer fields"""
    amount_display = serializers.ReadOnlyField()
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    quote_number = serializers.CharField(source='quote.quote_number', read_only=True)
    quote_title = serializers.CharField(source='quote.title', read_only=True, default='')
    case_number = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    customer_city = serializers.SerializerMethodField()
    customer_country = serializers.SerializerMethodField()
    booking_ref = serializers.SerializerMethodField()

    def get_case_number(self, obj):
        try:
            return obj.quote.case.case_number
        except Exception:
            return ''

    def get_service_name(self, obj):
        try:
            q = obj.quote
            if q.booking:
                return getattr(q.booking.service, 'name', None) or q.booking.selected_service or q.title or ''
            return q.case.booking.service.name
        except Exception:
            return obj.quote.title or ''

    def get_customer_phone(self, obj):
        try:
            q = obj.quote
            b = q.booking if q.booking else q.case.booking
            return f"{b.phone_country_code}{b.phone_number}".strip()
        except Exception:
            return ''

    def get_customer_city(self, obj):
        try:
            q = obj.quote
            b = q.booking if q.booking else q.case.booking
            return b.city
        except Exception:
            return ''

    def get_customer_country(self, obj):
        try:
            q = obj.quote
            b = q.booking if q.booking else q.case.booking
            return b.country
        except Exception:
            return ''

    def get_booking_ref(self, obj):
        try:
            q = obj.quote
            if q.booking:
                return q.booking.booking_id or ''
            return q.case.booking.booking_id or ''
        except Exception:
            return ''

    class Meta:
        model = SalesOrder
        fields = [
            'id', 'order_number', 'quote_number', 'quote_title',
            'client_name', 'client_email', 'customer_phone',
            'customer_city', 'customer_country', 'booking_ref', 'case_number',
            'service_name',
            'total_amount', 'amount_display', 'amount_paid', 'currency',
            'payment_status', 'status', 'notes',
            'created_at', 'updated_at', 'completed_at',
        ]


class SalesOrderSerializer(SalesOrderListSerializer):
    """Detail serializer — same as list for now, extended with quote relation"""
    quote = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta(SalesOrderListSerializer.Meta):
        fields = SalesOrderListSerializer.Meta.fields + ['quote']
        read_only_fields = [
            'id', 'order_number', 'client', 'total_amount', 'currency',
            'created_at', 'updated_at', 'completed_at',
        ]



