"""
Dashboard Views - Analytics and Statistics
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Q, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin, IsSuperAdminOrAdmin
from apps.cases.models import Case
from apps.bookings.models import Booking
from apps.payments.models import Payment
from apps.sales.models import SalesQuote, SalesOrder
from apps.services.models import Service


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def superadmin_dashboard(request):
    """
    SuperAdmin dashboard with comprehensive statistics
    GET /api/v1/dashboard/superadmin/
    """
    # User statistics
    total_users = User.objects.count()
    total_clients = User.objects.filter(role=User.CLIENT).count()
    total_admins = User.objects.filter(role=User.ADMIN).count()
    active_users = User.objects.filter(is_active=True).count()
    
    # Case statistics
    total_cases = Case.objects.count()
    cases_received = Case.objects.filter(status=Case.STATUS_RECEIVED).count()
    cases_working = Case.objects.filter(status=Case.STATUS_WORKING).count()
    cases_completed = Case.objects.filter(status=Case.STATUS_COMPLETED).count()
    
    # Cases by service
    cases_by_service = Booking.objects.values('service__name').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Revenue statistics
    total_revenue = Payment.objects.filter(
        status=Payment.STATUS_SUCCEEDED
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    monthly_revenue = Payment.objects.filter(
        status=Payment.STATUS_SUCCEEDED,
        paid_at__isnull=False
    ).annotate(
        month=TruncMonth('paid_at')
    ).values('month').annotate(
        revenue=Sum('amount'),
        count=Count('id')
    ).order_by('-month')[:12]
    
    # Format monthly revenue to dollars
    formatted_monthly_revenue = [
        {
            'month': item['month'].strftime('%Y-%m'),
            'revenue': float(item['revenue'] / 100),
            'count': item['count']
        }
        for item in monthly_revenue
    ]
    
    # Bookings statistics
    total_bookings = Booking.objects.count()
    pending_bookings = Booking.objects.filter(status=Booking.STATUS_PENDING).count()
    completed_bookings = Booking.objects.filter(status=Booking.STATUS_COMPLETED).count()
    
    # City distribution
    city_distribution = Booking.objects.values('city').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    # Country distribution
    country_distribution = Booking.objects.values('country').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    # Recent activity (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_bookings = Booking.objects.filter(created_at__gte=thirty_days_ago).count()
    recent_revenue = Payment.objects.filter(
        status=Payment.STATUS_SUCCEEDED,
        paid_at__gte=thirty_days_ago
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Sales statistics
    total_quotes = SalesQuote.objects.count()
    pending_quotes = SalesQuote.objects.filter(status=SalesQuote.STATUS_PENDING).count()
    accepted_quotes = SalesQuote.objects.filter(status=SalesQuote.STATUS_ACCEPTED).count()
    total_orders = SalesOrder.objects.count()
    
    # Admin performance
    admin_performance = User.objects.filter(role=User.ADMIN).annotate(
        total_cases=Count('cases_as_admin'),
        completed_cases=Count('cases_as_admin', filter=Q(cases_as_admin__status=Case.STATUS_COMPLETED))
    ).values('id', 'full_name', 'email', 'total_cases', 'completed_cases')
    
    return Response({
        'success': True,
        'data': {
            'users': {
                'total': total_users,
                'clients': total_clients,
                'admins': total_admins,
                'active': active_users
            },
            'cases': {
                'total': total_cases,
                'received': cases_received,
                'working': cases_working,
                'completed': cases_completed,
                'by_service': list(cases_by_service)
            },
            'revenue': {
                'total': float(total_revenue / 100),
                'currency': 'USD',
                'monthly': formatted_monthly_revenue,
                'last_30_days': float(recent_revenue / 100)
            },
            'bookings': {
                'total': total_bookings,
                'pending': pending_bookings,
                'completed': completed_bookings,
                'last_30_days': recent_bookings
            },
            'geography': {
                'cities': list(city_distribution),
                'countries': list(country_distribution)
            },
            'sales': {
                'total_quotes': total_quotes,
                'pending_quotes': pending_quotes,
                'accepted_quotes': accepted_quotes,
                'total_orders': total_orders
            },
            'admin_performance': list(admin_performance)
        }
    })


@api_view(['GET'])
@permission_classes([IsSuperAdminOrAdmin])
def admin_dashboard(request):
    """
    Admin (Baba) dashboard with assigned cases
    GET /api/v1/dashboard/admin/
    """
    user = request.user
    
    # Cases assigned to this admin
    assigned_cases = Case.objects.filter(assigned_admin=user)
    total_assigned = assigned_cases.count()
    working_cases = assigned_cases.filter(status=Case.STATUS_WORKING).count()
    completed_cases = assigned_cases.filter(status=Case.STATUS_COMPLETED).count()
    
    # Recent cases
    recent_cases = assigned_cases.order_by('-created_at')[:10].values(
        'id', 'case_number', 'status', 'priority', 'created_at',
        'client__full_name', 'client__email', 'booking__service__name'
    )
    
    # Performance metrics
    avg_completion_time = assigned_cases.filter(
        status=Case.STATUS_COMPLETED,
        completed_at__isnull=False
    ).extra(
        select={'days': '(EXTRACT(EPOCH FROM completed_at - started_at) / 86400)'}
    ).aggregate(avg_days=Avg('days'))
    
    return Response({
        'success': True,
        'data': {
            'cases': {
                'total_assigned': total_assigned,
                'working': working_cases,
                'completed': completed_cases
            },
            'recent_cases': list(recent_cases),
            'performance': {
                'avg_completion_days': avg_completion_time['avg_days'] or 0
            }
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_dashboard(request):
    """
    Client dashboard with personal statistics
    GET /api/v1/dashboard/client/
    """
    user = request.user
    
    # Client's bookings and cases
    total_bookings = Booking.objects.filter(user=user).count()
    total_cases = Case.objects.filter(client=user).count()
    active_cases = Case.objects.filter(
        client=user,
        status__in=[Case.STATUS_RECEIVED, Case.STATUS_WORKING]
    ).count()
    completed_cases = Case.objects.filter(
        client=user,
        status=Case.STATUS_COMPLETED
    ).count()
    
    # Payment history
    total_spent = Payment.objects.filter(
        user=user,
        status=Payment.STATUS_SUCCEEDED
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Recent cases
    recent_cases = Case.objects.filter(client=user).order_by('-created_at')[:5].values(
        'id', 'case_number', 'status', 'created_at',
        'booking__service__name', 'assigned_admin__full_name'
    )
    
    # Pending quotes
    pending_quotes = SalesQuote.objects.filter(
        client=user,
        status=SalesQuote.STATUS_PENDING
    ).count()
    
    # Active orders
    active_orders = SalesOrder.objects.filter(
        client=user,
        status__in=[SalesOrder.STATUS_PENDING, SalesOrder.STATUS_IN_PROGRESS]
    ).count()
    
    return Response({
        'success': True,
        'data': {
            'bookings': {
                'total': total_bookings
            },
            'cases': {
                'total': total_cases,
                'active': active_cases,
                'completed': completed_cases
            },
            'spending': {
                'total': float(total_spent / 100),
                'currency': 'USD'
            },
            'recent_cases': list(recent_cases),
            'sales': {
                'pending_quotes': pending_quotes,
                'active_orders': active_orders
            }
        }
    })


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def revenue_report(request):
    """
    Detailed revenue report
    GET /api/v1/dashboard/revenue/
    Query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    payments = Payment.objects.filter(status=Payment.STATUS_SUCCEEDED)
    
    if start_date:
        payments = payments.filter(paid_at__gte=start_date)
    if end_date:
        payments = payments.filter(paid_at__lte=end_date)
    
    total_revenue = payments.aggregate(total=Sum('amount'))['total'] or 0
    total_transactions = payments.count()
    
    # Revenue by service
    revenue_by_service = Booking.objects.filter(
        payment__status=Payment.STATUS_SUCCEEDED
    ).values('service__name').annotate(
        revenue=Sum('payment__amount'),
        count=Count('id')
    ).order_by('-revenue')
    
    formatted_revenue_by_service = [
        {
            'service': item['service__name'],
            'revenue': float(item['revenue'] / 100),
            'bookings': item['count']
        }
        for item in revenue_by_service
    ]
    
    return Response({
        'success': True,
        'data': {
            'total_revenue': float(total_revenue / 100),
            'total_transactions': total_transactions,
            'average_transaction': float((total_revenue / total_transactions / 100) if total_transactions > 0 else 0),
            'by_service': formatted_revenue_by_service
        }
    })


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def service_statistics(request):
    """
    Statistics for each service
    GET /api/v1/dashboard/services/
    """
    services = Service.objects.all()
    
    service_stats = []
    for service in services:
        bookings = Booking.objects.filter(service=service)
        completed = bookings.filter(status=Booking.STATUS_COMPLETED)
        revenue = Payment.objects.filter(
            booking__service=service,
            status=Payment.STATUS_SUCCEEDED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        service_stats.append({
            'service_id': str(service.id),
            'service_name': service.name,
            'service_type': service.service_type,
            'total_bookings': bookings.count(),
            'completed_bookings': completed.count(),
            'revenue': float(revenue / 100),
            'price': float(service.price / 100)
        })
    
    return Response({
        'success': True,
        'data': service_stats
    })
