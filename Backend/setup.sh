#!/bin/bash

# Aoqolt Backend Setup Script

echo "🚀 Setting up Aoqolt Backend..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Create logs directory
mkdir -p logs

# Create media directories
mkdir -p media/avatars
mkdir -p media/service_icons
mkdir -p media/booking_attachments
mkdir -p media/chat_files
mkdir -p media/case_results
mkdir -p media/case_result_attachments

echo "✓ Directories created"

# Check PostgreSQL
echo "🔍 Checking database connectivity..."
python3 << END
import os
from decouple import config
try:
    import psycopg2
    conn = psycopg2.connect(
        dbname=config('DB_NAME', default='aoqolt_db'),
        user=config('DB_USER', default='postgres'),
        password=config('DB_PASSWORD', default=''),
        host=config('DB_HOST', default='localhost'),
        port=config('DB_PORT', default='5432')
    )
    print("✓ Database connection successful")
    conn.close()
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("Please ensure PostgreSQL is running and credentials are correct")
END

# Run migrations
echo "🔄 Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser prompt
echo ""
echo "👤 Create a superuser account:"
python manage.py createsuperuser

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your credentials"
echo "2. Run: python manage.py runserver"
echo "3. Visit: http://localhost:8000/api/docs/"
echo ""
