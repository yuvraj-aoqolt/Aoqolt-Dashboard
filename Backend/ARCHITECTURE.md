# AOQOLT - BACKEND ARCHITECTURE DOCUMENTATION

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Authentication Flow](#authentication-flow)
5. [Request/Response Examples](#request-response-examples)
6. [Security Considerations](#security-considerations)
7. [Scalability Best Practices](#scalability-best-practices)

---

## System Overview

### Technology Stack
- **Framework**: Django 5.0 + Django REST Framework 3.15
- **Database**: PostgreSQL 15+
- **Authentication**: JWT (Simple JWT)
- **SMS**: Twilio (OTP verification)
- **Payments**: Stripe
- **Caching**: Redis
- **Task Queue**: Celery + Redis
- **File Storage**: Django Storages (AWS S3 ready)

### Role-Based Access Control

#### 1. SuperAdmin (Platform Owner)
- Full system access
- Create/manage Admin accounts
- Assign cases to Admins
- Generate sales quotes
- View all analytics and reports
- Manage all users and data

#### 2. Admin (Baba - Service Worker)
- View assigned cases only
- Communicate with clients via case chat
- Upload service results
- Mark cases as completed
- Cannot see other admins' cases
- Cannot access financial reports

#### 3. Client (Customer)
- Register and book services
- View own bookings and cases
- Chat with assigned admin
- View results
- Accept/reject sales quotes
- Cannot see other clients' data

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(5) DEFAULT '+1',
    phone_number VARCHAR(17) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'superadmin', 'admin', 'client'
    auth_provider VARCHAR(20) DEFAULT 'manual', -- 'manual', 'google', 'apple', 'yahoo'
    social_id VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_staff BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,
    avatar VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'client')),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_phone (phone_number)
);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20),
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    total_cases_handled INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    specialization VARCHAR(255),
    bio TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### otp_verifications
```sql
CREATE TABLE otp_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    INDEX idx_otp_phone_verified (phone_number, is_verified),
    INDEX idx_otp_created (created_at)
);
```

#### services
```sql
CREATE TABLE services (
    id UUID PRIMARY KEY,
    service_type VARCHAR(50) UNIQUE NOT NULL, -- 'single_aura', 'family_aura', 'astrology'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    price INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    duration_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    icon VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### bookings
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE PROTECT,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    special_note TEXT,
    selected_service VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'payment_pending', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    INDEX idx_bookings_user_status (user_id, status),
    INDEX idx_bookings_created (created_at)
);
```

#### booking_details
```sql
CREATE TABLE booking_details (
    id UUID PRIMARY KEY,
    booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    additional_notes TEXT,
    family_member_count INTEGER,
    family_member_details JSONB,
    birth_date DATE,
    birth_time TIME,
    birth_place VARCHAR(255),
    custom_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### cases
```sql
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    case_number VARCHAR(20) UNIQUE NOT NULL,
    booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'received', -- 'received', 'working', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expected_completion_date DATE,
    INDEX idx_cases_number (case_number),
    INDEX idx_cases_client_status (client_id, status),
    INDEX idx_cases_admin_status (assigned_admin_id, status),
    INDEX idx_cases_status_created (status, created_at)
);
```

#### case_messages
```sql
CREATE TABLE case_messages (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'video', 'voice', 'document'
    message TEXT,
    file_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messages_case_created (case_id, created_at),
    INDEX idx_messages_sender_read (sender_id, is_read)
);
```

#### payments
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    payment_number VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_checkout_session_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'succeeded', 'failed', 'refunded'
    payment_method VARCHAR(50),
    description TEXT,
    refund_amount INTEGER DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    INDEX idx_payments_user_status (user_id, status),
    INDEX idx_payments_stripe (stripe_payment_intent_id),
    INDEX idx_payments_created (created_at)
);
```

#### sales_quotes
```sql
CREATE TABLE sales_quotes (
    id UUID PRIMARY KEY,
    quote_number VARCHAR(30) UNIQUE NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    valid_until DATE,
    terms_and_conditions TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
    client_response_notes TEXT,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quotes_number (quote_number),
    INDEX idx_quotes_client_status (client_id, status),
    INDEX idx_quotes_created (created_at)
);
```

#### sales_orders
```sql
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY,
    order_number VARCHAR(30) UNIQUE NOT NULL,
    quote_id UUID UNIQUE REFERENCES sales_quotes(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'partial'
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    INDEX idx_orders_number (order_number),
    INDEX idx_orders_client_status (client_id, status),
    INDEX idx_orders_created (created_at)
);
```

### Model Relationships

```
User (1) ─── (M) Booking
User (1) ─── (M) Case (as client)
User (1) ─── (M) Case (as assigned_admin)
User (1) ─── (M) Payment
User (1) ─── (M) SalesQuote
User (1) ─── (M) SalesOrder
User (1) ─── (M) CaseMessage
User (1) ─── (1) UserProfile

Service (1) ─── (M) Booking

Booking (1) ─── (1) BookingDetail
Booking (1) ─── (M) BookingAttachment
Booking (1) ─── (1) Case
Booking (1) ─── (1) Payment

Case (1) ─── (M) CaseMessage
Case (1) ─── (M) CaseAssignment
Case (1) ─── (1) CaseResult
Case (1) ─── (M) CaseStatusHistory
Case (1) ─── (M) SalesQuote

CaseResult (1) ─── (M) CaseResultAttachment

SalesQuote (1) ─── (M) SalesQuoteItem
SalesQuote (1) ─── (1) SalesOrder
```

---

## API Endpoints

### Base URL
```
Production: https://api.aoqolt.com/api/v1/
Development: http://localhost:8000/api/v1/
```

### Authentication Endpoints

#### 1. Register User
```http
POST /auth/register/
Content-Type: application/json

Request:
{
    "full_name": "Rahul Sharma",
    "email": "[email protected]",
    "country_code": "+91",
    "phone_number": "9876543210",
    "password": "StrongPassword123",
    "confirm_password": "StrongPassword123"
}

Response (201 Created):
{
    "success": true,
    "message": "Registration successful. Please verify your phone number with the OTP sent.",
    "data": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "[email protected]",
        "phone_number": "9876543210",
        "otp_sent": true
    }
}
```

#### 2. Verify OTP
```http
POST /auth/verify-otp/
Content-Type: application/json

Request:
{
    "phone_number": "9876543210",
    "otp_code": "123456"
}

Response (200 OK):
{
    "success": true,
    "message": "Phone number verified successfully",
    "data": {
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "[email protected]",
            "full_name": "Rahul Sharma",
            "role": "client",
            "is_verified": true
        },
        "tokens": {
            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        }
    }
}
```

#### 3. Login
```http
POST /auth/login/
Content-Type: application/json

Request:
{
    "email": "[email protected]",
    "password": "StrongPassword123"
}

Response (200 OK):
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": { /* user object */ },
        "tokens": {
            "access": "...",
            "refresh": "..."
        }
    }
}
```

#### 4. Social Login
```http
POST /auth/social-login/
Content-Type: application/json

Request:
{
    "provider": "google",
    "access_token": "google_oauth_token",
    "email": "[email protected]",
    "full_name": "John Doe",
    "social_id": "123456789"
}

Response (200 OK):
{
    "success": true,
    "message": "Social authentication successful",
    "data": {
        "user": { /* user object */ },
        "tokens": { /* JWT tokens */ },
        "is_new_user": true
    }
}
```

#### 5. Resend OTP
```http
POST /auth/resend-otp/
Content-Type: application/json

Request:
{
    "phone_number": "9876543210"
}

Response (200 OK):
{
    "success": true,
    "message": "OTP sent successfully",
    "data": {
        "otp_sent": true
    }
}
```

#### 6. Refresh Token
```http
POST /auth/token/refresh/
Content-Type: application/json

Request:
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}

Response (200 OK):
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### 7. Logout
```http
POST /auth/logout/
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
    "refresh_token": "..."
}

Response (200 OK):
{
    "success": true,
    "message": "Logout successful"
}
```

### Service Endpoints

#### 1. List Active Services
```http
GET /services/active/

Response (200 OK):
{
    "success": true,
    "count": 3,
    "data": [
        {
            "id": "uuid",
            "service_type": "single_aura",
            "name": "Single Aura Reading",
            "short_description": "Personal aura analysis",
            "price": 9900,
            "price_display": "$99.00",
            "currency": "USD",
            "icon": "/media/service_icons/aura.png",
            "is_active": true
        },
        // ... more services
    ]
}
```

#### 2. Get Service Details
```http
GET /services/{service_id}/details/

Response (200 OK):
{
    "success": true,
    "data": {
        "id": "uuid",
        "service_type": "single_aura",
        "name": "Single Aura Reading",
        "description": "Complete description...",
        "price": 9900,
        "price_display": "$99.00",
        "duration_days": 7,
        "features": [
            {
                "id": 1,
                "feature_text": "Detailed aura analysis",
                "display_order": 1
            }
        ],
        "requirements": [
            {
                "id": 1,
                "requirement_text": "Recent photo",
                "is_mandatory": true,
                "field_type": "file"
            }
        ]
    }
}
```

### Booking Endpoints

#### 1. Create Booking (First Form)
```http
POST /bookings/
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
    "service": "service_uuid",
    "full_name": "Rahul Sharma",
    "phone_number": "9876543210",
    "email": "[email protected]",
    "address": "123 Main St",
    "country": "India",
    "city": "Mumbai",
    "postal_code": "400001",
    "special_note": "Need urgent consultation",
    "selected_service": "single_aura"
}

Response (201 Created):
{
    "success": true,
    "data": {
        "id": "booking_uuid",
        "user": "user_uuid",
        "service": { /* service object */ },
        "full_name": "Rahul Sharma",
        "status": "pending",
        "created_at": "2024-03-05T10:30:00Z"
    }
}
```

#### 2. Add Booking Details (Second Form)
```http
POST /bookings/{booking_id}/add_details/
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
    "additional_notes": "Born in Delhi",
    "birth_date": "1990-05-15",
    "birth_time": "14:30:00",
    "birth_place": "New Delhi, India"
}

Response (200 OK):
{
    "success": true,
    "message": "Booking details added successfully",
    "data": { /* booking details */ }
}
```

#### 3. Upload Attachment
```http
POST /bookings/{booking_id}/upload_attachment/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Request:
file: <file>
file_type: "image"
description: "Recent photo"

Response (201 Created):
{
    "success": true,
    "message": "File uploaded successfully",
    "data": {
        "id": "uuid",
        "file": "/media/booking_attachments/2024/03/05/photo.jpg",
        "file_name": "photo.jpg",
        "file_size": 245680
    }
}
```

### Payment Endpoints

#### 1. Create Checkout Session
```http
POST /payments/create_checkout_session/
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
    "booking_id": "booking_uuid",
    "success_url": "https://yourdomain.com/payment/success",
    "cancel_url": "https://yourdomain.com/payment/cancel"
}

Response (200 OK):
{
    "success": true,
    "data": {
        "session_id": "cs_test_...",
        "session_url": "https://checkout.stripe.com/pay/cs_test_...",
        "payment_id": "payment_uuid"
    }
}
```

#### 2. List Payments
```http
GET /payments/
Authorization: Bearer <access_token>

Response (200 OK):
{
    "count": 5,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": "uuid",
            "payment_number": "PAY-20240305-00001",
            "user_email": "[email protected]",
            "service_name": "Single Aura",
            "amount_display": "$99.00",
            "status": "succeeded",
            "created_at": "2024-03-05T10:30:00Z"
        }
    ]
}
```

### Case Endpoints

#### 1. List Cases
```http
GET /cases/
Authorization: Bearer <access_token>

Response (200 OK):
{
    "count": 10,
    "results": [
        {
            "id": "uuid",
            "case_number": "CASE-20240305-0001",
            "client_name": "Rahul Sharma",
            "admin_name": "Baba Ji",
            "service_name": "Single Aura",
            "status": "working",
            "priority": "medium",
            "created_at": "2024-03-05T10:30:00Z"
        }
    ]
}
```

#### 2. Assign Case (SuperAdmin Only)
```http
POST /cases/{case_id}/assign/
Authorization: Bearer <superadmin_token>
Content-Type: application/json

Request:
{
    "admin_id": "admin_user_uuid",
    "notes": "Assign to Baba Ji for aura reading"
}

Response (200 OK):
{
    "success": true,
    "message": "Case assigned to Baba Ji successfully",
    "data": { /* full case object */ }
}
```

#### 3. Update Case Status
```http
POST /cases/{case_id}/update_status/
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
    "status": "completed",
    "notes": "Case completed successfully"
}

Response (200 OK):
{
    "success": true,
    "message": "Case status updated to completed",
    "data": { /* case object */ }
}
```

#### 4. Upload Result
```http
POST /cases/{case_id}/upload_result/
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Request:
result_text: "Your aura shows..."
result_file: <file>
additional_notes: "Follow-up recommended"

Response (200 OK):
{
    "success": true,
    "message": "Result uploaded successfully",
    "data": { /* case result object */ }
}
```

### Chat Endpoints

#### 1. Send Message
```http
POST /chat/messages/
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
    "case": "case_uuid",
    "message_type": "text",
    "message": "Hello, I have a question about my case"
}

Response (201 Created):
{
    "success": true,
    "message": "Message sent successfully",
    "data": {
        "id": "uuid",
        "sender_name": "Rahul Sharma",
        "sender_role": "client",
        "message": "Hello, I have a question...",
        "created_at": "2024-03-05T10:30:00Z"
    }
}
```

#### 2. Get Case Messages
```http
GET /chat/messages/case_messages/?case_id={case_uuid}
Authorization: Bearer <access_token>

Response (200 OK):
{
    "success": true,
    "count": 15,
    "data": [
        {
            "id": "uuid",
            "sender_name": "Rahul Sharma",
            "sender_role": "client",
            "message_type": "text",
            "message": "Hello...",
            "created_at": "2024-03-05T10:30:00Z"
        }
    ]
}
```

### Sales Endpoints

#### 1. Create Quote (SuperAdmin Only)
```http
POST /sales/quotes/
Authorization: Bearer <superadmin_token>
Content-Type: application/json

Request:
{
    "case": "case_uuid",
    "title": "Advanced Aura Healing Package",
    "description": "Comprehensive healing package",
    "amount": 199.00,
    "valid_until": "2024-04-05",
    "terms_and_conditions": "Payment within 30 days"
}

Response (201 Created):
{
    "success": true,
    "data": {
        "id": "uuid",
        "quote_number": "QT-20240305-00001",
        "amount_display": "$199.00",
        "status": "pending"
    }
}
```

#### 2. Respond to Quote (Client)
```http
POST /sales/quotes/{quote_id}/respond/
Authorization: Bearer <client_token>
Content-Type: application/json

Request:
{
    "action": "accept",
    "notes": "I accept this quote"
}

Response (200 OK):
{
    "success": true,
    "message": "Quote accepted successfully",
    "data": {
        "quote": { /* quote object */ },
        "order": { /* order object created */ }
    }
}
```

### Dashboard Endpoints

#### 1. SuperAdmin Dashboard
```http
GET /dashboard/superadmin/
Authorization: Bearer <superadmin_token>

Response (200 OK):
{
    "success": true,
    "data": {
        "users": {
            "total": 150,
            "clients": 140,
            "admins": 9,
            "active": 145
        },
        "cases": {
            "total": 200,
            "received": 10,
            "working": 50,
            "completed": 140
        },
        "revenue": {
            "total": 19800.00,
            "currency": "USD",
            "last_30_days": 5000.00
        }
    }
}
```

#### 2. Client Dashboard
```http
GET /dashboard/client/
Authorization: Bearer <client_token>

Response (200 OK):
{
    "success": true,
    "data": {
        "bookings": { "total": 5 },
        "cases": {
            "total": 5,
            "active": 1,
            "completed": 4
        },
        "spending": {
            "total": 495.00,
            "currency": "USD"
        }
    }
}
```

---

## Authentication Flow

### JWT Token-Based Authentication

**Why JWT over Session Authentication?**
- **Stateless**: No server-side session storage required
- **Scalable**: Works across multiple servers without shared session storage
- **Secure**: Tokens are signed and can include expiration
- **Mobile-Friendly**: Easy to use in mobile applications

**Token Lifetime:**
- Access Token: 60 minutes (configurable)
- Refresh Token: 24 hours (configurable)

**Token Storage (Client-Side):**
- Access Token: Memory or secure HttpOnly cookie
- Refresh Token: HttpOnly cookie (recommended) or local storage

**Authentication Header:**
```
Authorization: Bearer <access_token>
```

### OTP Verification Strategy

**Flow:**
1. User registers with email and phone
2. OTP sent via Twilio SMS
3. User submits OTP within 5 minutes
4. System verifies OTP
5. Account activated, JWT tokens issued

**Security Features:**
- 6-digit OTP
- 5-minute expiration
- Maximum 3 attempts per OTP
- 60-second cooldown between resends
- Rate limiting via Redis cache

---

## Security Considerations

### 1. Authentication Security
- **Password Hashing**: PBKDF2 with SHA256 (Django default)
- **JWT Blacklisting**: Refresh tokens blacklisted on logout
- **Token Rotation**: Refresh tokens rotated on use
- **Password Requirements**: Minimum 8 characters, complexity validation

### 2. OTP Security
- **Expiration**: 5-minute timeout
- **Rate Limiting**: 60-second cooldown between requests
- **Attempt Limiting**: Maximum 3 verification attempts
- **SMS Provider**: Twilio with international support

### 3. API Security
- **CORS**: Configured allowed origins
- **CSRF Protection**: Enabled for non-API requests
- **Rate Limiting**: Implemented via Django middleware
- **Input Validation**: All inputs validated via serializers
- **SQL Injection**: Protected by Django ORM
- **XSS Protection**: Auto-escaping in templates

### 4. File Upload Security
- **Size Limits**: 10MB maximum
- **Type Validation**: Whitelist of allowed MIME types
- **Virus Scanning**: Recommended for production
- **Storage**: AWS S3 with signed URLs

### 5. Payment Security
- **PCI Compliance**: Stripe handles card data
- **Webhook Verification**: Signature verification required
- **HTTPS Only**: All payment endpoints over SSL
- **Idempotency**: Prevent duplicate payments

### 6. Role-Based Access Control
- **Decorator-Based**: `@permission_classes([IsSuperAdmin])`
- **Object-Level**: Check ownership before modification
- **Database-Level**: Foreign key constraints
- **Audit Trail**: Status history for critical changes

---

## Scalability Best Practices

### 1. Database Optimization
- **Indexing**: Strategic indexes on frequently queried fields
- **Query Optimization**: Use `select_related()` and `prefetch_related()`
- **Connection Pooling**: PostgreSQL connection pooling
- **Read Replicas**: Separate read/write database instances

### 2. Caching Strategy
- **Redis Cache**: Used for sessions, OTP rate limiting
- **Query Caching**: Cache expensive database queries
- **CDN**: Static files and media via CloudFront
- **Cache Keys**: Namespaced and versioned

### 3. Async Processing
- **Celery Tasks**: Email, SMS, report generation
- **Background Jobs**: File processing, notifications
- **Message Queue**: Redis as broker
- **Result Backend**: Redis for task results

### 4. API Performance
- **Pagination**: Default 20 items per page
- **Filtering**: Django-filter for efficient queries
- **Compression**: GZip middleware enabled
- **Rate Limiting**: Per-user and per-endpoint limits

### 5. Monitoring & Logging
- **Application Logs**: Structured logging to files
- **Error Tracking**: Sentry integration recommended
- **Performance Monitoring**: New Relic or DataDog
- **Database Monitoring**: pg_stat_statements

### 6. Deployment Architecture
```
Load Balancer (ALB/Nginx)
    ↓
Web Servers (Gunicorn + Django)
    ↓
Cache Layer (Redis)
    ↓
Database (PostgreSQL Primary + Read Replicas)
    ↓
File Storage (AWS S3)
    ↓
Background Workers (Celery)
```

### 7. Environment Management
- **Development**: Local SQLite/PostgreSQL
- **Staging**: Mirror of production
- **Production**: High-availability setup
- **Environment Variables**: Django-decouple for secrets

---

## Next Steps

1. **Setup Environment**
   ```bash
   cd Backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure Database**
   - Create PostgreSQL database
   - Update `.env` file with credentials

3. **Run Migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Create SuperUser**
   ```bash
   python manage.py createsuperuser
   ```

5. **Load Initial Data** (Optional)
   ```bash
   python manage.py loaddata services
   ```

6. **Run Development Server**
   ```bash
   python manage.py runserver
   ```

7. **Access API Documentation**
   - Swagger: http://localhost:8000/api/docs/
   - ReDoc: http://localhost:8000/api/redoc/

---

**For production deployment, see DEPLOYMENT.md**
