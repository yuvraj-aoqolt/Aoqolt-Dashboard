# Aoqolt Backend - Complete Implementation Summary

## Project Overview

This document provides a comprehensive overview of the Aoqolt spiritual services platform backend implementation. The system is a production-ready Django REST Framework application designed to manage the complete lifecycle of spiritual service bookings, from initial customer registration through service delivery and billing.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React/Next.js)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS/REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      API Gateway (Nginx)                        │
│                    SSL Termination + Load Balancing             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│              Django REST Framework Application                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication Layer (JWT + OTP + Social Auth)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer (9 Django Apps)                    │  │
│  │  • accounts  • authentication  • services                │  │
│  │  • bookings  • cases          • chat                     │  │
│  │  • payments  • sales          • dashboard                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Data Access Layer (Django ORM)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  PostgreSQL   │  │     Redis       │  │  External   │
│   Database    │  │  Cache/Queue    │  │  Services   │
│               │  │                 │  │  • Stripe   │
│  Primary +    │  │  • Sessions     │  │  • Twilio   │
│  Read Replica │  │  • OTP Tracking │  │  • AWS S3   │
└───────────────┘  │  • Rate Limit   │  └─────────────┘
                   └─────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Celery Workers │
                   │  Background Jobs│
                   └─────────────────┘
```

## Implementation Details

### 1. User Management & Authentication

**Models:**
- `User` (Custom user model with UUID primary key)
  - Supports 3 roles: SUPERADMIN, ADMIN, CLIENT
  - Fields: email (username), full_name, phone_number, role, auth_provider, social_id
  - Password hashing: PBKDF2-SHA256
  
- `UserProfile` (Extended user information)
  - One-to-one with User
  - Profile data: bio, specialization, date_of_birth, gender
  - Statistics: total_bookings, total_spent, total_cases_handled

**Authentication Methods:**

1. **Manual Registration + OTP**
   - User registers with email + phone
   - OTP model tracks verification codes (6-digit, 5-min expiry)
   - Twilio sends SMS
   - Rate limiting: 60-second cooldown, max 3 attempts
   - OTPResendLog tracks resend history

2. **Social Authentication**
   - Providers: Google, Apple, Yahoo
   - django-allauth integration
   - SocialAuthToken model stores OAuth tokens
   - Auto-creates user if first login

3. **JWT Token System**
   - Access token: 60 minutes
   - Refresh token: 24 hours (blacklisted on logout)
   - Token rotation on refresh
   - Custom claims include user role

**Security Features:**
- Password validation (min 8 chars, complexity rules)
- Token blacklisting on logout
- Rate limiting on auth endpoints
- HTTPS-only cookies in production
- CSRF protection for non-API requests

### 2. Service Management

**Core Models:**
- `Service` - Service definitions (Single Aura, Family Aura, Astrology)
  - Pricing in cents for precision
  - Active/inactive flag
  - Display order for frontend
  
- `ServiceFeature` - Marketing features (displayed on service pages)
- `ServiceRequirement` - Required fields for booking
  - Field types: text, number, date, time, file, etc.
  - Mandatory/optional flags

**API Endpoints:**
- `GET /api/v1/services/active/` - List active services
- `GET /api/v1/services/{id}/details/` - Service details with features

### 3. Booking System (Two-Stage Process)

**Stage 1: Initial Booking Form**
- Client submits personal info (name, email, phone, address)
- Booking created with status "pending"
- Redirects to Stripe checkout

**Stage 2: Payment & Details**
- Stripe processes payment
- Webhook confirms payment success
- Client provides service-specific details
- Booking status → "completed"

**Models:**
- `Booking` - Main booking record
- `BookingDetail` - Service-specific data (stored as JSONB for flexibility)
- `BookingAttachment` - File uploads (photos, documents)

**Flow:**
```
Landing Page → Service Selection → Form 1 (Contact Info) 
→ Stripe Checkout → Payment Webhook → Form 2 (Service Details) 
→ Case Creation
```

### 4. Payment Processing (Stripe)

**Implementation:**
- Checkout sessions for payment UI
- Auto-generated payment numbers: PAY-YYYYMMDD-XXXXX
- Webhook handling for async payment confirmation
- Refund support through admin panel

**Models:**
- `Payment` - Payment records with Stripe IDs
- `StripeWebhookEvent` - Audit log of all webhooks
  - Prevents duplicate processing
  - Tracks event types (payment.succeeded, payment.failed, etc.)

**Security:**
- Webhook signature verification
- Idempotency keys
- PCI compliance (Stripe handles card data)

**Flow:**
```python
# Create checkout session
session = stripe.checkout.Session.create(
    payment_intent_data={
        'metadata': {'booking_id': booking.id}
    },
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'unit_amount': service.price,
            'product_data': {'name': service.name}
        },
        'quantity': 1
    }],
    mode='payment',
    success_url='...',
    cancel_url='...'
)
```

### 5. Case Management System

**Models:**
- `Case` - Core case record
  - Auto-generated case_number: CASE-YYYYMMDD-XXXX
  - Status: RECEIVED → WORKING → COMPLETED
  - Priority levels: low, medium, high, urgent
  
- `CaseAssignment` - Assignment history
  - Tracks who assigned, when, to whom
  - Assignment notes
  
- `CaseResult` - Service delivery results
  - Text results + file attachments
  - Uploaded by assigned admin
  
- `CaseResultAttachment` - Multiple files per result
  
- `CaseStatusHistory` - Audit trail
  - All status changes logged
  - Changed by, timestamp, notes

**Workflow:**

1. **Case Creation** (Automatic on payment success)
   ```python
   case = Case.objects.create(
       case_number=generate_case_number(),
       booking=booking,
       client=booking.user,
       status='received'
   )
   ```

2. **Assignment** (SuperAdmin only)
   ```python
   case.assigned_admin = admin_user
   case.status = 'working'
   case.save()
   
   CaseAssignment.objects.create(
       case=case,
       assigned_by=superadmin,
       assigned_to=admin_user
   )
   ```

3. **Result Upload** (Assigned Admin)
   ```python
   CaseResult.objects.create(
       case=case,
       result_text="Your aura reading...",
       uploaded_by=admin_user
   )
   case.status = 'completed'
   case.save()
   ```

**Permissions:**
- SuperAdmin: View all, assign, manage
- Admin: View assigned only, upload results
- Client: View own cases only

### 6. Chat System

**Features:**
- Case-based messaging (not user-to-user)
- Participants: Client + Assigned Admin + SuperAdmin
- Message types: text, image, video, voice, document
- Read status tracking
- Soft delete (is_deleted flag)

**Models:**
- `CaseMessage` - Messages with sender, case, content
- `MessageReadStatus` - Track read receipts (optional)

**Access Control:**
```python
# Who can access case chat?
if user.is_superadmin:
    return True
elif case.client == user:
    return True
elif case.assigned_admin == user:
    return True
else:
    return False
```

**API:**
- `POST /api/v1/chat/messages/` - Send message
- `GET /api/v1/chat/messages/case_messages/?case_id=X` - List messages
- `POST /api/v1/chat/messages/{id}/mark_read/` - Mark as read

### 7. Sales Management (Quotes & Orders)

**Business Logic:**
1. After case completion, SuperAdmin generates quote
2. Client receives notification
3. Client reviews and accepts/rejects
4. On acceptance, SalesOrder auto-created
5. Payment processing for order

**Models:**
- `SalesQuote`
  - Quote number: QT-YYYYMMDD-XXXXX
  - Status: pending, accepted, rejected, expired
  - Valid until date
  - Terms and conditions
  
- `SalesQuoteItem` - Line items (allows multiple services)
- `SalesOrder`
  - Order number: ORD-YYYYMMDD-XXXXX
  - Auto-created from accepted quote
  - Payment tracking

**API:**
```python
# SuperAdmin creates quote
POST /api/v1/sales/quotes/
{
    "case": "case_uuid",
    "title": "Advanced Healing Package",
    "amount": 299.00,
    "valid_until": "2024-04-15"
}

# Client responds
POST /api/v1/sales/quotes/{id}/respond/
{
    "action": "accept",
    "notes": "I agree to proceed"
}

# System auto-creates order
order = SalesOrder.objects.create(
    order_number=generate_order_number(),
    quote=quote,
    client=quote.client,
    total_amount=quote.amount,
    status='pending'
)
```

### 8. Dashboard & Analytics

**SuperAdmin Dashboard:**
```python
{
    "users": {
        "total": 1500,
        "clients": 1400,
        "admins": 99,
        "superadmins": 1,
        "active_users": 1450
    },
    "cases": {
        "total": 5000,
        "received": 120,
        "working": 380,
        "completed": 4500,
        "by_service": {
            "single_aura": 2500,
            "family_aura": 1800,
            "astrology": 700
        }
    },
    "revenue": {
        "total": 495000.00,
        "this_month": 45000.00,
        "last_30_days": 52000.00,
        "by_service": { /* breakdown */ }
    },
    "geography": {
        "countries": { "USA": 2800, "India": 1500, ... },
        "cities": { "New York": 450, "Mumbai": 380, ... }
    },
    "admin_performance": [
        {
            "admin": "Baba Ji",
            "cases_assigned": 150,
            "cases_completed": 140,
            "completion_rate": 93.33
        }
    ]
}
```

**Admin Dashboard:**
- Assigned cases (current + completed)
- Personal performance metrics
- Case statistics

**Client Dashboard:**
- Total bookings and spending
- Active cases
- Order history

## Database Design

### Key Design Decisions

1. **UUID Primary Keys** for sensitive entities (User, Case, Quote, Order)
   - Security: Non-sequential, unpredictable
   - Distribution: Better for distributed systems
   - Privacy: Harder to enumerate resources

2. **Pricing in Cents (Integer)**
   - Avoids floating-point errors
   - Standard practice for financial data
   - Easy conversion to display format

3. **JSONB for Flexible Data**
   - `BookingDetail.custom_data` - Service-specific fields vary
   - `BookingDetail.family_member_details` - Array of objects
   - Allows schema evolution without migrations

4. **Audit Trails**
   - `CaseStatusHistory` - All status changes
   - `CaseAssignment` - Complete assignment history
   - `StripeWebhookEvent` - Payment event log
   - Immutable records (no updates/deletes)

5. **Soft Deletes** where appropriate
   - `CaseMessage.is_deleted` - Hide but preserve
   - Maintains data integrity for audits

6. **Strategic Indexes**
   ```sql
   -- High-frequency queries
   idx_cases_client_status (client_id, status)
   idx_cases_admin_status (assigned_admin_id, status)
   idx_payments_user_status (user_id, status)
   
   -- Lookup optimization
   idx_cases_number (case_number)
   idx_payments_stripe (stripe_payment_intent_id)
   
   -- Time-series queries
   idx_bookings_created (created_at)
   idx_payments_created (created_at)
   ```

### Relationships Summary

```
User (1) ─ (M) Booking
Booking (1) ─ (1) Payment
Payment (1) ─ (1) Case (via booking)
Case (1) ─ (M) CaseMessage
Case (1) ─ (M) SalesQuote
SalesQuote (1) ─ (1) SalesOrder
```

## API Design Principles

### 1. RESTful Conventions
- `GET /resource/` - List
- `GET /resource/{id}/` - Detail
- `POST /resource/` - Create
- `PUT /resource/{id}/` - Full update
- `PATCH /resource/{id}/` - Partial update
- `DELETE /resource/{id}/` - Delete

### 2. Custom Actions
- `POST /cases/{id}/assign/` - Assignment
- `POST /cases/{id}/update_status/` - Status change
- `GET /bookings/my_bookings/` - User-specific list
- `POST /quotes/{id}/respond/` - Accept/reject

### 3. Response Format
```json
{
    "success": true,
    "message": "Operation successful",
    "data": { /* response data */ },
    "errors": null
}
```

### 4. Pagination
```json
{
    "count": 1000,
    "next": "http://api.example.com/resource/?page=3",
    "previous": "http://api.example.com/resource/?page=1",
    "results": [ /* items */ ]
}
```

### 5. Filtering & Search
- `?status=working` - Filter by field
- `?search=john` - Full-text search
- `?ordering=-created_at` - Sort descending
- `?page_size=50` - Custom page size

## Security Implementation

### 1. Authentication Security
- bcrypt-like hashing (PBKDF2-SHA256)
- Token blacklisting on logout
- Refresh token rotation
- Rate limiting: 5 login attempts per 15 minutes

### 2. Authorization
```python
# Role-based permissions
class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               request.user.role == 'superadmin'

# Object-level permissions
class IsOwnerOrSuperAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user or \
               request.user.role == 'superadmin'
```

### 3. Input Validation
- Serializer validation for all inputs
- Custom validators for phone, email
- File type and size validation
- SQL injection prevention (ORM)
- XSS prevention (auto-escaping)

### 4. API Security
- CORS: Configured allowed origins
- HTTPS only in production
- CSRF tokens for non-API requests
- Rate limiting per endpoint
- API versioning (/api/v1/)

## Scalability Strategies

### 1. Database Optimization
- **Connection Pooling**: PgBouncer (100→10 connections)
- **Query Optimization**: select_related(), prefetch_related()
- **Read Replicas**: Route GET requests to replicas
- **Partitioning**: Time-based partitioning for logs/messages

### 2. Caching
```python
# Redis cache examples
@cache_page(60 * 15)  # Cache view for 15 minutes
def list_active_services(request):
    ...

# Cache expensive queries
services = cache.get('active_services')
if not services:
    services = Service.objects.filter(is_active=True)
    cache.set('active_services', services, 3600)
```

### 3. Async Processing
```python
# Celery tasks
@shared_task
def send_otp_sms(phone_number, otp_code):
    twilio_client.messages.create(
        to=phone_number,
        from_=settings.TWILIO_PHONE_NUMBER,
        body=f"Your OTP is: {otp_code}"
    )

@shared_task
def generate_monthly_report():
    # Long-running report generation
    ...
```

### 4. Load Balancing
```nginx
upstream django_backend {
    least_conn;
    server 10.0.1.10:8000;
    server 10.0.1.11:8000;
    server 10.0.1.12:8000;
}
```

### 5. CDN for Static/Media Files
- Static files: CloudFront + S3
- User uploads: S3 with signed URLs
- Reduces application server load

## Testing Strategy

### 1. Unit Tests
```python
class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            email='[email protected]',
            phone_number='1234567890',
            password='test123'
        )
        self.assertEqual(user.email, '[email protected]')
        self.assertTrue(user.check_password('test123'))
```

### 2. Integration Tests
```python
class BookingFlowTest(APITestCase):
    def test_complete_booking_flow(self):
        # Create booking
        response = self.client.post('/api/v1/bookings/', data)
        booking_id = response.data['id']
        
        # Simulate payment
        payment = Payment.objects.create(...)
        
        # Add booking details
        response = self.client.post(
            f'/api/v1/bookings/{booking_id}/add_details/',
            details
        )
        
        # Verify case created
        self.assertTrue(Case.objects.filter(booking_id=booking_id).exists())
```

### 3. API Tests
```python
def test_authentication_required():
    response = self.client.get('/api/v1/cases/')
    self.assertEqual(response.status_code, 401)

def test_role_permissions():
    # Client can't access admin endpoints
    self.client.force_authenticate(user=self.client_user)
    response = self.client.get('/api/v1/dashboard/superadmin/')
    self.assertEqual(response.status_code, 403)
```

## Deployment Checklist

- [ ] PostgreSQL 15+ installed and configured
- [ ] Redis installed for cache and Celery
- [ ] Environment variables configured (.env)
- [ ] Database migrations run
- [ ] Static files collected
- [ ] Superuser created
- [ ] Nginx configured with SSL
- [ ] Gunicorn systemd service setup
- [ ] Celery workers running
- [ ] Stripe webhook endpoint configured
- [ ] Twilio credentials verified
- [ ] Social OAuth apps configured
- [ ] Monitoring setup (Sentry, logs)
- [ ] Backup cron jobs configured
- [ ] Firewall rules applied

## Maintenance & Monitoring

### Log Files
```
logs/django.log - Application logs
logs/celery.log - Background task logs
/var/log/nginx/access.log - Web server access
/var/log/nginx/error.log - Web server errors
```

### Health Checks
```python
# /api/v1/health/
{
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "celery": "running"
}
```

### Monitoring Metrics
- Request rate and latency
- Error rates (4xx, 5xx)
- Database connection pool usage
- Redis memory usage
- Celery queue lengths
- Disk space and CPU usage

## Conclusion

This backend provides a robust, scalable foundation for the Aoqolt spiritual services platform. Key strengths:

1. **Comprehensive**: All business requirements implemented
2. **Secure**: Multiple authentication methods, role-based access, audit trails
3. **Scalable**: Caching, async processing, optimized queries
4. **Maintainable**: Clean code structure, comprehensive documentation
5. **Production-Ready**: Error handling, logging, monitoring hooks

For questions or support, refer to:
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production setup
- [API_REFERENCE.md](API_REFERENCE.md) - API examples
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database design
