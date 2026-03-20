"""
Sales Models - Quotes and Orders
"""
from django.db import models
from apps.accounts.models import User
from apps.cases.models import Case
import uuid


class SalesQuote(models.Model):
    """
    Sales quotes generated after case completion
    """
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_EXPIRED = 'expired'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_EXPIRED, 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote_number = models.CharField(max_length=30, unique=True, editable=False)
    
    # Relations
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='quotes')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quotes')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='quotes_created')
    
    # Quote details
    title = models.CharField(max_length=255)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Terms
    valid_until = models.DateField(null=True, blank=True)
    terms_and_conditions = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Client response
    client_response_notes = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales_quotes'
        verbose_name = 'Sales Quote'
        verbose_name_plural = 'Sales Quotes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['quote_number']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Quote {self.quote_number} - {self.client.email}"
    
    @property
    def amount_display(self):
        return f"${self.amount:.2f}"
    
    def save(self, *args, **kwargs):
        """Generate quote number on creation"""
        if not self.quote_number:
            import datetime
            today = datetime.date.today().strftime('%Y%m%d')
            last_quote = SalesQuote.objects.filter(quote_number__startswith=f'QT-{today}').order_by('-quote_number').first()
            
            if last_quote:
                last_num = int(last_quote.quote_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.quote_number = f'QT-{today}-{new_num:05d}'
        
        super().save(*args, **kwargs)


class SalesQuoteItem(models.Model):
    """
    Line items in a quote
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote = models.ForeignKey(SalesQuote, on_delete=models.CASCADE, related_name='items')
    
    description = models.CharField(max_length=500)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'sales_quote_items'
        verbose_name = 'Sales Quote Item'
        verbose_name_plural = 'Sales Quote Items'
    
    def __str__(self):
        return f"{self.description} - {self.quote.quote_number}"
    
    def save(self, *args, **kwargs):
        """Calculate total price"""
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class SalesOrder(models.Model):
    """
    Sales orders created from accepted quotes
    """
    STATUS_PENDING = 'pending'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=30, unique=True, editable=False)
    
    # Relations
    quote = models.OneToOneField(SalesQuote, on_delete=models.CASCADE, related_name='order')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    
    # Order details
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Payment details
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('unpaid', 'Unpaid'),
            ('paid', 'Paid'),
            ('partial', 'Partially Paid'),
        ],
        default='unpaid'
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'sales_orders'
        verbose_name = 'Sales Order'
        verbose_name_plural = 'Sales Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Order {self.order_number} - {self.client.email}"
    
    @property
    def amount_display(self):
        return f"${self.total_amount:.2f}"
    
    def save(self, *args, **kwargs):
        """Generate order number on creation"""
        if not self.order_number:
            import datetime
            today = datetime.date.today().strftime('%Y%m%d')
            last_order = SalesOrder.objects.filter(order_number__startswith=f'ORD-{today}').order_by('-order_number').first()
            
            if last_order:
                last_num = int(last_order.order_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.order_number = f'ORD-{today}-{new_num:05d}'
        
        super().save(*args, **kwargs)
