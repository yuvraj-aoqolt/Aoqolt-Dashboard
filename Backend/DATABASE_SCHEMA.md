# Database Schema Diagram

```mermaid
erDiagram
    User ||--o{ Booking : creates
    User ||--o{ Case_as_Client : has
    User ||--o{ Case_as_Admin : assigned
    User ||--o{ Payment : makes
    User ||--o{ SalesQuote : receives
    User ||--o{ SalesOrder : places
    User ||--o{ CaseMessage : sends
    User ||--|| UserProfile : has
    User ||--o{ OTPVerification : has

    Service ||--o{ Booking : offered_in
    Service ||--o{ ServiceFeature : has
    Service ||--o{ ServiceRequirement : requires

    Booking ||--|| BookingDetail : has
    Booking ||--o{ BookingAttachment : contains
    Booking ||--|| Case : generates
    Booking ||--|| Payment : requires

    Case ||--o{ CaseMessage : contains
    Case ||--o{ CaseAssignment : has
    Case ||--|| CaseResult : produces
    Case ||--o{ CaseStatusHistory : tracks
    Case ||--o{ SalesQuote : generates

    CaseResult ||--o{ CaseResultAttachment : includes

    SalesQuote ||--o{ SalesQuoteItem : contains
    SalesQuote ||--|| SalesOrder : converts_to

    User {
        uuid id PK
        varchar email UK
        varchar full_name
        varchar phone_number UK
        varchar country_code
        varchar password
        varchar role
        varchar auth_provider
        varchar social_id
        boolean is_active
        boolean is_verified
        varchar avatar
        text address
        varchar city
        varchar country
        varchar postal_code
        timestamp date_joined
        timestamp last_login
    }

    UserProfile {
        bigint id PK
        uuid user_id FK
        date date_of_birth
        varchar gender
        boolean notification_enabled
        boolean email_notifications
        boolean sms_notifications
        int total_cases_handled
        int total_bookings
        decimal total_spent
        varchar specialization
        text bio
        decimal rating
        int total_reviews
    }

    OTPVerification {
        bigint id PK
        uuid user_id FK
        varchar phone_number
        varchar otp_code
        boolean is_verified
        int attempts
        timestamp created_at
        timestamp expires_at
        timestamp verified_at
    }

    Service {
        uuid id PK
        varchar service_type UK
        varchar name
        text description
        varchar short_description
        int price
        varchar currency
        int duration_days
        boolean is_active
        varchar icon
        int display_order
    }

    ServiceFeature {
        bigint id PK
        uuid service_id FK
        varchar feature_text
        int display_order
    }

    ServiceRequirement {
        bigint id PK
        uuid service_id FK
        varchar requirement_text
        boolean is_mandatory
        varchar field_type
        int display_order
    }

    Booking {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        varchar full_name
        varchar phone_number
        varchar email
        text address
        varchar country
        varchar city
        varchar postal_code
        text special_note
        varchar selected_service
        varchar status
        timestamp created_at
        timestamp completed_at
    }

    BookingDetail {
        uuid id PK
        uuid booking_id FK
        text additional_notes
        int family_member_count
        jsonb family_member_details
        date birth_date
        time birth_time
        varchar birth_place
        jsonb custom_data
    }

    BookingAttachment {
        uuid id PK
        uuid booking_id FK
        varchar file
        varchar file_name
        varchar file_type
        int file_size
        varchar description
    }

    Case {
        uuid id PK
        varchar case_number UK
        uuid booking_id FK
        uuid client_id FK
        uuid assigned_admin_id FK
        varchar status
        varchar priority
        text admin_notes
        timestamp created_at
        timestamp assigned_at
        timestamp started_at
        timestamp completed_at
        date expected_completion_date
    }

    CaseAssignment {
        bigint id PK
        uuid case_id FK
        uuid assigned_by_id FK
        uuid assigned_to_id FK
        text notes
        timestamp assigned_at
    }

    CaseResult {
        uuid id PK
        uuid case_id FK
        text result_text
        varchar result_file
        text additional_notes
        uuid uploaded_by_id FK
        timestamp uploaded_at
    }

    CaseResultAttachment {
        uuid id PK
        uuid case_result_id FK
        varchar file
        varchar file_name
        varchar file_type
        int file_size
        varchar description
    }

    CaseStatusHistory {
        bigint id PK
        uuid case_id FK
        varchar old_status
        varchar new_status
        text notes
        uuid changed_by_id FK
        timestamp changed_at
    }

    CaseMessage {
        uuid id PK
        uuid case_id FK
        uuid sender_id FK
        varchar message_type
        text message
        varchar file_url
        boolean is_read
        timestamp read_at
        boolean is_deleted
        timestamp created_at
    }

    Payment {
        uuid id PK
        varchar payment_number UK
        uuid user_id FK
        uuid booking_id FK
        int amount
        varchar currency
        varchar stripe_payment_intent_id UK
        varchar stripe_checkout_session_id
        varchar stripe_customer_id
        varchar status
        varchar payment_method
        text description
        int refund_amount
        text refund_reason
        timestamp refunded_at
        timestamp created_at
        timestamp paid_at
    }

    SalesQuote {
        uuid id PK
        varchar quote_number UK
        uuid case_id FK
        uuid client_id FK
        uuid created_by_id FK
        varchar title
        text description
        decimal amount
        varchar currency
        date valid_until
        text terms_and_conditions
        varchar status
        text client_response_notes
        timestamp responded_at
        timestamp created_at
    }

    SalesQuoteItem {
        uuid id PK
        uuid quote_id FK
        varchar item_name
        text description
        int quantity
        decimal unit_price
        decimal total_price
        int display_order
    }

    SalesOrder {
        uuid id PK
        varchar order_number UK
        uuid quote_id FK
        uuid client_id FK
        decimal total_amount
        varchar currency
        varchar payment_status
        decimal amount_paid
        varchar status
        text notes
        timestamp created_at
        timestamp completed_at
    }
```

## Entity Relationships Summary

### User-Centric Relationships
- **User → Booking**: One-to-Many (A user can create multiple bookings)
- **User → Case (Client)**: One-to-Many (A client can have multiple cases)
- **User → Case (Admin)**: One-to-Many (An admin can be assigned multiple cases)
- **User → Payment**: One-to-Many (A user can make multiple payments)
- **User → UserProfile**: One-to-One (Each user has exactly one profile)

### Service Flow
- **Service → Booking**: One-to-Many (A service can be booked multiple times)
- **Service → ServiceFeature**: One-to-Many (A service has multiple features)
- **Service → ServiceRequirement**: One-to-Many (A service has specific requirements)

### Booking to Case Pipeline
```
Booking → Payment (1:1) → Case Creation (1:1)
```

### Case Management
- **Case → CaseMessage**: One-to-Many (Multiple messages per case)
- **Case → CaseAssignment**: One-to-Many (Track all assignment history)
- **Case → CaseResult**: One-to-One (One result per case)
- **Case → CaseStatusHistory**: One-to-Many (Audit trail)
- **Case → SalesQuote**: One-to-Many (Multiple quotes can be generated)

### Sales Flow
```
Case → SalesQuote → SalesOrder (upon acceptance)
```

### Quote Structure
- **SalesQuote → SalesQuoteItem**: One-to-Many (Line items in quote)
- **SalesQuote → SalesOrder**: One-to-One (Quote converts to order)

## Key Database Indexes

### Performance-Critical Indexes
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- Case management
CREATE INDEX idx_cases_number ON cases(case_number);
CREATE INDEX idx_cases_client_status ON cases(client_id, status);
CREATE INDEX idx_cases_admin_status ON cases(assigned_admin_id, status);
CREATE INDEX idx_cases_status_created ON cases(status, created_at);

-- Payments
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Messages
CREATE INDEX idx_messages_case_created ON case_messages(case_id, created_at);
CREATE INDEX idx_messages_sender_read ON case_messages(sender_id, is_read);

-- Bookings
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_bookings_created ON bookings(created_at);

-- OTP
CREATE INDEX idx_otp_phone_verified ON otp_verifications(phone_number, is_verified);
CREATE INDEX idx_otp_created ON otp_verifications(created_at);
```

## Data Flow Diagrams

### User Registration Flow
```mermaid
flowchart LR
    A[Register] --> B[Create User]
    B --> C[Generate OTP]
    C --> D[Send SMS]
    D --> E{Verify OTP}
    E -->|Success| F[Activate Account]
    E -->|Failure| G[Retry/Resend]
    G --> C
```

### Booking to Case Flow
```mermaid
flowchart TD
    A[Create Booking] --> B[Fill Form 1]
    B --> C[Create Stripe Session]
    C --> D{Payment Success?}
    D -->|Yes| E[Fill Form 2]
    D -->|No| F[Cancel Booking]
    E --> G[Create Case]
    G --> H[Status: RECEIVED]
    H --> I[SuperAdmin Assigns]
    I --> J[Status: WORKING]
    J --> K[Admin Uploads Result]
    K --> L[Status: COMPLETED]
```

### Chat Participants Flow
```mermaid
flowchart LR
    A[Client] <--> B[Case Chat]
    C[Assigned Admin] <--> B
    D[SuperAdmin] <--> B
```

### Quote to Order Flow
```mermaid
flowchart TD
    A[Case Completed] --> B[SuperAdmin Creates Quote]
    B --> C{Client Decision}
    C -->|Accept| D[Create Order]
    C -->|Reject| E[Quote Rejected]
    D --> F[Payment Pending]
    F --> G[Order In Progress]
```

## Table Size Estimates (1 Year)

Assuming:
- 1,000 clients
- 5,000 bookings/year
- Average 15 messages per case

| Table | Estimated Rows | Storage Est. |
|-------|----------------|--------------|
| users | 1,100 | 1 MB |
| bookings | 5,000 | 5 MB |
| cases | 5,000 | 10 MB |
| case_messages | 75,000 | 50 MB |
| payments | 5,000 | 5 MB |
| sales_quotes | 2,000 | 3 MB |
| sales_orders | 1,500 | 2 MB |
| **Total** | **~94,600** | **~80 MB** |

*Note: File storage (media files) not included - depends on upload volume*

## Backup Strategy

### Daily Backups
```bash
# Full database dump
pg_dump -h localhost -U aoqolt_user aoqolt_db > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://aoqolt-backups/
```

### Point-in-Time Recovery
- Enable WAL archiving in PostgreSQL
- Store WAL files in S3
- Allows restore to any point in time

### Media Files Backup
- S3 versioning enabled
- Cross-region replication for disaster recovery
