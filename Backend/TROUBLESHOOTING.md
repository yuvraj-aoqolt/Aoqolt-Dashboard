# Troubleshooting Guide

## Common Setup Issues and Solutions

### 1. ModuleNotFoundError: No module named 'pkg_resources'

**Problem:** This occurs with setuptools version 69.0.0+ which deprecated `pkg_resources`.

**Solution:** The `requirements.txt` is pinned to `setuptools==68.0.0` which includes `pkg_resources`. If you encounter this error:

```bash
pip install --force-reinstall setuptools==68.0.0
```

### 2. Missing Database Tables / Migration Errors

**Problem:** `relation "users" does not exist` or similar errors.

**Solution:** Ensure custom app migrations are created before running migrate:

```bash
# Create migrations for custom apps
python manage.py makemigrations accounts
python manage.py makemigrations authentication

# Run all migrations
python manage.py migrate
```

### 3. Missing STATICFILES_DIRS Directory

**Problem:** Warning about missing 'static' directory.

**Solution:** Create the directory:

```bash
mkdir static  # Linux/Mac
md static     # Windows
```

### 4. ImproperlyConfigured: TOKEN_MODEL Error

**Problem:** `You must include rest_framework.authtoken in INSTALLED_APPS`

**Solution:** Already fixed in settings.py. Ensure `rest_framework.authtoken` is in INSTALLED_APPS.

### 5. Missing allauth.account.middleware.AccountMiddleware

**Problem:** `AccountMiddleware must be added to settings.MIDDLEWARE`

**Solution:** Already fixed in settings.py. Ensure `allauth.account.middleware.AccountMiddleware` is added after `AuthenticationMiddleware`.

## Environment Variable Issues

### Missing .env File

Create a `.env` file from the example:

```bash
cp .env.example .env  # Linux/Mac
copy .env.example .env  # Windows
```

Then edit `.env` with your actual credentials.

### Boolean Environment Variables

When using `python-dotenv`, boolean values must be strings:

```env
# Correct
DEBUG=True
DEBUG=False

# Incorrect
DEBUG=1
DEBUG=0
```

The settings.py handles conversion: `os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')`

## Package Compatibility

### Verified Working Versions (Python 3.14.x)

- **Django**: 5.0.3
- **setuptools**: 68.0.0 (CRITICAL - do not upgrade)
- **psycopg2-binary**: 2.9.9
- **Pillow**: 10.2.0
- **drf-yasg**: 1.21.7 (requires setuptools<=68)

### Upgrading Packages

Before upgrading packages, especially `setuptools` or `drf-yasg`:

1. Check compatibility with Python 3.14
2. Test in development environment first
3. Update this file with findings

## Database Issues

### PostgreSQL Connection Errors

1. Ensure PostgreSQL is running:
   ```bash
   # Check PostgreSQL status
   pg_ctl status  # Windows/Mac
   sudo systemctl status postgresql  # Linux
   ```

2. Verify credentials in `.env` match PostgreSQL settings

3. Test connection:
   ```bash
   psql -U postgres -d aoqolt_db
   ```

### Reset Database (Development Only)

```bash
# Drop and recreate database
python manage.py dbshell
DROP DATABASE aoqolt_db;
CREATE DATABASE aoqolt_db;
\q

# Run migrations
python manage.py migrate
```

## Virtual Environment Issues

### Wrong Python Version

Ensure you're creating venv with Python 3.10+:

```bash
python --version  # Should be 3.10+
python -m venv venv
```

### Activation Issues

**PowerShell (Windows):**
```powershell
# If execution policy error
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
```

**Bash (Linux/Mac):**
```bash
source venv/bin/activate
```

## Installation Best Practices

### Clean Installation

```bash
# Remove old virtual environment
rm -rf venv  # Linux/Mac
rmdir /s venv  # Windows

# Create fresh environment
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1

# Install with exact versions
pip install -r requirements.txt
```

### Verify Installation

```bash
python manage.py check
python manage.py showmigrations
```

## Getting Help

If you encounter issues not listed here:

1. Check Django docs: https://docs.djangoproject.com/
2. Check package-specific documentation
3. Review error traceback carefully
4. Search for error message on Stack Overflow
5. Check package GitHub issues

## Maintenance Notes

**Last Updated:** March 5, 2026  
**Python Version:** 3.14.3  
**Django Version:** 5.0.3  
**Critical Dependencies:** setuptools==68.0.0 (pkg_resources compatibility)
