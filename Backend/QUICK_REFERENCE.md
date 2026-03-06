# Developer Quick Reference

## Essential Commands

### Setup
```bash
# Initial setup
./setup.sh                    # Linux/Mac
setup.bat                     # Windows

# Manual setup
python -m venv venv
source venv/bin/activate      # Linux/Mac: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

### Development
```bash
# Run server
python manage.py runserver

# Run with specific port
python manage.py runserver 8080

# Run Celery worker
celery -A core worker -l info

# Run tests
python manage.py test

# Create migrations
python manage.py makemigrations
python manage.py migrate

# Create app
python manage.py startapp appname

# Django shell
python manage.py shell

# Database shell  
python manage.py dbshell
```

### Data Management
```bash
# Create superuser
python manage.py createsuperuser

# Load fixtures
python manage.py loaddata fixtures/services.json

# Dump data
python manage.py dumpdata services > fixtures/services.json

# Flush database (WARNING: deletes all data)
python manage.py flush

# Collect static files
python manage.py collectstatic
```

## Environment Variables Quick Reference

```env
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=aoqolt_db
DB_USER=postgres
DB_PASSWORD=yourpassword
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
REDIS_URL=redis://localhost:6379/0
```

## Common API Patterns

### Authentication
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"[email protected]","password":"Test@123","full_name":"Test User","phone_number":"1234567890"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"[email protected]","password":"Test@123"}'

# Use token
curl http://localhost:8000/api/v1/cases/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### CRUD Operations
```python
# List
GET /api/v1/resource/

# Retrieve
GET /api/v1/resource/{id}/

# Create
POST /api/v1/resource/

# Update
PUT /api/v1/resource/{id}/
PATCH /api/v1/resource/{id}/

# Delete
DELETE /api/v1/resource/{id}/

# Custom action
POST /api/v1/resource/{id}/action_name/
```

## Database Quick Reference

### Common Django ORM Queries
```python
# Get all
Resource.objects.all()

# Filter
Resource.objects.filter(status='active')

# Get single
Resource.objects.get(id=uuid)

# Create
Resource.objects.create(field1=value1, field2=value2)

# Update
resource.field = new_value
resource.save()

# Delete
resource.delete()

# Bulk operations
Resource.objects.filter(status='old').update(status='new')
Resource.objects.filter(status='temp').delete()

# Relationships
resource.related_objects.all()
resource.related_objects.filter(field=value)

# Aggregation
Resource.objects.count()
Resource.objects.aggregate(total=Sum('amount'))

# Annotations
Resource.objects.annotate(count=Count('related'))
```

### Optimization
```python
# Reduce queries with select_related (ForeignKey, OneToOne)
Booking.objects.select_related('user', 'service').all()

# Reduce queries with prefetch_related (ManyToMany, reverse FK)
Case.objects.prefetch_related('messages').all()

# Only fetch needed fields
Resource.objects.only('id', 'name')

# Exclude fields
Resource.objects.defer('large_text_field')
```

## Model Shortcuts

### User Roles
```python
user.is_superadmin  # SuperAdmin role
user.is_admin       # Admin/Baba role
user.is_client      # Client role
```

### Status Choices
```python
# Case statuses
RECEIVED = 'received'
WORKING = 'working'
COMPLETED = 'completed'
CANCELLED = 'cancelled'

# Payment statuses
PENDING = 'pending'
PROCESSING = 'processing'
SUCCEEDED = 'succeeded'
FAILED = 'failed'
REFUNDED = 'refunded'

# Quote statuses
PENDING = 'pending'
ACCEPTED = 'accepted'
REJECTED = 'rejected'
EXPIRED = 'expired'
```

## Permissions Quick Reference

```python
# Built-in permissions
from rest_framework.permissions import IsAuthenticated, AllowAny

# Custom permissions  
from apps.accounts.permissions import IsSuperAdmin, IsAdmin, IsClient

# View decorator
@permission_classes([IsAuthenticated, IsSuperAdmin])
def superadmin_only_view(request):
    ...

# Check in code
if request.user.is_superadmin:
    # SuperAdmin logic
    pass
```

## Serializer Patterns

```python
# Basic serializer
class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ['id', 'name', 'created_at']

# Read-only fields
class Meta:
    fields = '__all__'
    read_only_fields = ['id', 'created_at', 'updated_at']

# Nested serializer
class ParentSerializer(serializers.ModelSerializer):
    children = ChildSerializer(many=True, read_only=True)

# Custom field
extra_field = serializers.SerializerMethodField()

def get_extra_field(self, obj):
    return obj.calculate_something()

# Validation
def validate_field_name(self, value):
    if not valid:
        raise serializers.ValidationError("Error message")
    return value
```

## Testing Snippets

```python
from rest_framework.test import APITestCase, APIClient

class ResourceTestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(...)
        self.client.force_authenticate(user=self.user)
    
    def test_list_resources(self):
        response = self.client.get('/api/v1/resources/')
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data), 0)
    
    def test_create_resource(self):
        data = {'field': 'value'}
        response = self.client.post('/api/v1/resources/', data)
        self.assertEqual(response.status_code, 201)
```

## Celery Tasks

```python
# Define task
from celery import shared_task

@shared_task
def my_background_task(arg1, arg2):
    # Long-running operation
    return result

# Call task
my_background_task.delay(arg1, arg2)

# Call with ETA
from datetime import timedelta
my_background_task.apply_async(
    args=[arg1, arg2],
    eta=timezone.now() + timedelta(minutes=5)
)
```

## Debugging

```python
# Print to console
import pdb; pdb.set_trace()  # Debugger breakpoint

# Django shell
python manage.py shell
>>> from apps.accounts.models import User
>>> User.objects.count()

# Check database
python manage.py dbshell
>>> SELECT COUNT(*) FROM users;

# View SQL queries
from django.db import connection
print(connection.queries)

# Enable query logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Useful URLs

```
Admin:          http://localhost:8000/admin/
Swagger:        http://localhost:8000/api/docs/
ReDoc:          http://localhost:8000/api/redoc/
Auth Login:     http://localhost:8000/api/v1/auth/login/
Services:       http://localhost:8000/api/v1/services/active/
```

## Git Workflow

```bash
# Daily workflow
git pull origin main
git checkout -b feature/your-feature
# Make changes
git add .
git commit -m "Description of changes"
git push origin feature/your-feature
# Create pull request

# Check status
git status
git log --oneline -n 10

# Undo changes
git checkout -- filename.py      # Discard working changes
git reset HEAD filename.py       # Unstage file
git reset --soft HEAD~1          # Undo last commit, keep changes
```

## Troubleshooting

### Port already in use
```bash
# Find process
lsof -i :8000          # Mac/Linux
netstat -ano | findstr :8000   # Windows

# Kill process
kill -9 <PID>          # Mac/Linux
taskkill /PID <PID> /F # Windows
```

### Database connection error
```bash
# Check PostgreSQL is running
sudo service postgresql status    # Linux
brew services list                # Mac
# Windows: Check Services app

# Check credentials in .env
# Verify database exists
psql -U postgres -l
```

### Migration conflicts
```bash
# Reset migrations (DANGER: loses data)
python manage.py migrate app_name zero
rm apps/app_name/migrations/000*.py
python manage.py makemigrations
python manage.py migrate
```

### Redis connection error
```bash
# Start Redis
redis-server                      # Mac/Linux
# Windows: Redis service or redis-server.exe

# Test connection
redis-cli ping
```

## Production Checklist

- [ ] DEBUG=False
- [ ] Strong SECRET_KEY
- [ ] ALLOWED_HOSTS configured
- [ ] Database backups scheduled
- [ ] SSL certificate installed
- [ ] Static files on CDN
- [ ] Error tracking enabled (Sentry)
- [ ] Log rotation configured
- [ ] Firewall rules set
- [ ] Environment variables secured

## Performance Tips

1. Use `select_related()` for ForeignKey
2. Use `prefetch_related()` for ManyToMany
3. Add database indexes on filtered fields
4. Cache expensive queries
5. Paginate large querysets
6. Use `only()` to limit fields
7. Avoid N+1 queries
8. Use bulk operations when possible

## Security Reminders

- Never commit `.env` file
- Always validate user input
- Use parameterized queries (ORM does this)
- Implement rate limiting
- Use HTTPS in production
- Keep dependencies updated
- Review permissions on all endpoints
- Sanitize file uploads

---

**Tip**: Bookmark this page for quick reference during development!
