# Aoqolt Backend - Spiritual Services Platform

A comprehensive Django REST API for managing spiritual services, bookings, payments, and case management.

## Features

✅ **Multi-Role System** - SuperAdmin, Admin (Baba), Client roles with granular permissions  
✅ **Advanced Authentication** - JWT tokens, OTP verification via Twilio, social login (Google, Apple, Yahoo)  
✅ **Service Management** - Single Aura, Family Aura, Astrology services with dynamic pricing  
✅ **Two-Stage Booking** - Initial form → Payment → Service-specific details  
✅ **Stripe Integration** - Secure payment processing with webhooks  
✅ **Case Management** - Full lifecycle tracking (RECEIVED → WORKING → COMPLETED)  
✅ **Real-time Chat** - Case-based messaging between clients, admins, and superadmins  
✅ **Sales System** - Quote generation, client acceptance, automatic order creation  
✅ **Analytics Dashboard** - Role-specific dashboards with comprehensive statistics  
✅ **Audit Trail** - Complete history tracking for cases, assignments, and status changes

## Quick Start

### 1. Automated Setup (Recommended)

**Linux/Mac:**
```bash
cd Backend
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
cd Backend
setup.bat
```

### 2. Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=aoqolt_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# Twilio (OTP)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Social Auth
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id
YAHOO_CLIENT_ID=your_yahoo_client_id

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_password
```

## Technology Stack

- **Framework**: Django 5.0.3 + Django REST Framework 3.15.1
- **Database**: PostgreSQL 15+
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Environment Variables**: python-dotenv (loads from .env file)
- **SMS**: Twilio
- **Payments**: Stripe
- **Cache**: Redis
- **Task Queue**: Celery
- **File Storage**: Django Storages (S3-ready)

## Project Structure

```
Backend/
├── core/                    # Django project settings
│   ├── settings.py         # Main configuration
│   ├── urls.py             # Root URL configuration
│   ├── celery.py           # Celery configuration
│   └── exceptions.py       # Custom exception handlers
├── apps/
│   ├── accounts/           # User management
│   ├── authentication/     # Auth flows (OTP, social)
│   ├── services/           # Service definitions
│   ├── bookings/           # Booking management
│   ├── cases/              # Case lifecycle
│   ├── chat/               # Case messaging
│   ├── payments/           # Stripe integration
│   ├── sales/              # Quotes & orders
│   └── dashboard/          # Analytics
├── media/                  # User uploads
├── staticfiles/            # Static files
├── logs/                   # Application logs
├── requirements.txt        # Python dependencies
├── manage.py              # Django management script
└── .env                   # Environment variables
```

## API Documentation

### Available Endpoints

- **Authentication**: `/api/v1/auth/` - Register, login, OTP, social auth
- **Services**: `/api/v1/services/` - List and manage services
- **Bookings**: `/api/v1/bookings/` - Create and manage bookings
- **Payments**: `/api/v1/payments/` - Stripe checkout and webhooks
- **Cases**: `/api/v1/cases/` - Case management and assignment
- **Chat**: `/api/v1/chat/` - Case-based messaging
- **Sales**: `/api/v1/sales/` - Quotes and orders
- **Dashboard**: `/api/v1/dashboard/` - Analytics endpoints

### Interactive Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Django Admin**: http://localhost:8000/admin/

## Documentation Files

📖 **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture, database schema, API endpoints, authentication flow, request/response examples, security considerations, and scalability best practices

🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide with server setup, PostgreSQL configuration, Nginx setup, SSL certificates, Celery workers, and monitoring

📝 **[API_REFERENCE.md](API_REFERENCE.md)** - Quick reference for all API endpoints with cURL examples

🗄️ **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Visual database schema with ER diagrams, relationships, indexes, and data flow diagrams

🔧 **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common setup issues, package compatibility notes, and solutions for known problems

## Database Schema Overview

```
User (3 roles: SuperAdmin, Admin, Client)
  ↓
Booking → Payment (Stripe) → Case
  ↓                           ↓
Service                  CaseMessages (Chat)
                              ↓
                         CaseResult
                              ↓
                         SalesQuote → SalesOrder
```

## Key Features Explained

### Role-Based Access Control

1. **SuperAdmin** - Platform owner with full access
   - Create/manage admin accounts
   - Assign cases to admins
   - Generate sales quotes
   - View all analytics

2. **Admin (Baba)** - Service worker
   - View assigned cases only
   - Upload service results
   - Chat with clients
   - Mark cases complete

3. **Client** - Customer
   - Book services
   - Make payments
   - View own cases
   - Accept/reject quotes

### Authentication Flow

1. User registers with email + phone
2. OTP sent via Twilio SMS
3. User verifies OTP (6 digits, 5-min expiry)
4. Account activated, JWT tokens issued
5. Access token (60 min) + Refresh token (24 hrs)

Alternative: Social login with Google/Apple/Yahoo

### Booking Flow

1. Client selects service
2. Fills booking form (contact info, address)
3. Redirected to Stripe checkout
4. Payment processed
5. Client fills service-specific details
6. Case automatically created with status "RECEIVED"

### Case Lifecycle

```
RECEIVED → SuperAdmin assigns to Admin → WORKING → Admin uploads result → COMPLETED
```

### Chat System

- Case-based messaging
- Participants: Client + Assigned Admin + SuperAdmin
- Message types: text, image, video, voice, document
- Read status tracking

### Sales Workflow

1. After case completion, SuperAdmin creates quote
2. Client receives notification
3. Client accepts/rejects quote
4. On acceptance, order automatically created
5. Payment processing for order

## Development

### Run Celery Worker
```bash
celery -A core worker -l info
```

### Run Tests
```bash
python manage.py test
```

### Create Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

### Collect Static Files
```bash
python manage.py collectstatic
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production setup guide including:
- Ubuntu server setup
- PostgreSQL configuration
- Nginx + Gunicorn
- SSL with Let's Encrypt
- Celery as systemd service
- Monitoring and backups

## Security Features

✓ Password hashing with PBKDF2-SHA256  
✓ JWT token blacklisting on logout  
✓ OTP rate limiting (60s cooldown)  
✓ CORS configuration  
✓ CSRF protection  
✓ SQL injection protection (Django ORM)  
✓ File upload validation  
✓ Stripe webhook signature verification  
✓ Role-based permissions on all endpoints

## Support & Contact

For questions or issues, please refer to the documentation files or contact the development team.

## License

Proprietary - All rights reserved
