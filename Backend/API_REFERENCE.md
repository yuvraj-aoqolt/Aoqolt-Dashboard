# API Quick Reference

## Authentication
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "[email protected]",
    "country_code": "+1",
    "phone_number": "1234567890",
    "password": "Test@123",
    "confirm_password": "Test@123"
  }'

# Verify OTP
curl -X POST http://localhost:8000/api/v1/auth/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "1234567890",
    "otp_code": "123456"
  }'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "[email protected]",
    "password": "Test@123"
  }'
```

## Services
```bash
# List services
curl http://localhost:8000/api/v1/services/active/

# Get service details
curl http://localhost:8000/api/v1/services/{id}/details/
```

## Bookings
```bash
# Create booking
curl -X POST http://localhost:8000/api/v1/bookings/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "service_uuid",
    "full_name": "Test User",
    "email": "[email protected]",
    "phone_number": "1234567890",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA",
    "postal_code": "10001"
  }'

# Get my bookings
curl http://localhost:8000/api/v1/bookings/my_bookings/ \
  -H "Authorization: Bearer <token>"
```

## Payments
```bash
# Create checkout session
curl -X POST http://localhost:8000/api/v1/payments/create_checkout_session/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "booking_uuid",
    "success_url": "https://yourdomain.com/success",
    "cancel_url": "https://yourdomain.com/cancel"
  }'
```

## Cases
```bash
# List my cases
curl http://localhost:8000/api/v1/cases/my_cases/ \
  -H "Authorization: Bearer <token>"

# Get case detail
curl http://localhost:8000/api/v1/cases/{id}/ \
  -H "Authorization: Bearer <token>"

# Assign case (SuperAdmin)
curl -X POST http://localhost:8000/api/v1/cases/{id}/assign/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin_uuid",
    "notes": "Assign to specific admin"
  }'
```

## Chat
```bash
# Send message
curl -X POST http://localhost:8000/api/v1/chat/messages/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "case": "case_uuid",
    "message_type": "text",
    "message": "Hello, I have a question"
  }'

# Get messages
curl "http://localhost:8000/api/v1/chat/messages/case_messages/?case_id={uuid}" \
  -H "Authorization: Bearer <token>"
```

## Dashboard
```bash
# SuperAdmin dashboard
curl http://localhost:8000/api/v1/dashboard/superadmin/ \
  -H "Authorization: Bearer <token>"

# Client dashboard
curl http://localhost:8000/api/v1/dashboard/client/ \
  -H "Authorization: Bearer <token>"
```

## Admin
```bash
# Access Django admin
http://localhost:8000/admin/

# API documentation
http://localhost:8000/api/docs/
```
