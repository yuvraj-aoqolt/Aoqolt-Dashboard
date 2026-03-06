# Production Deployment Guide

## Prerequisites

- Ubuntu 20.04+ Server
- Python 3.11+
- PostgreSQL 15+
- Redis 6+
- Nginx
- Domain with SSL certificate

## Server Setup

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Dependencies
```bash
sudo apt install python3-pip python3-venv postgresql postgresql-contrib nginx redis-server -y
```

### 3. Setup PostgreSQL
```bash
sudo -u postgres psql

CREATE DATABASE aoqolt_db;
CREATE USER aoqolt_user WITH PASSWORD 'your_secure_password';
ALTER ROLE aoqolt_user SET client_encoding TO 'utf8';
ALTER ROLE aoqolt_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE aoqolt_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE aoqolt_db TO aoqolt_user;
\q
```

### 4. Clone and Setup Project
```bash
cd /var/www
git clone <your-repo> aoqolt
cd aoqolt/Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

### 5. Configure Environment
```bash
cp .env.example .env
nano .env  # Update with production values
```

### 6. Run Migrations
```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 7. Configure Gunicorn
Create `/etc/systemd/system/aoqolt.service`:
```ini
[Unit]
Description=Aoqolt Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/aoqolt/Backend
Environment="PATH=/var/www/aoqolt/Backend/venv/bin"
ExecStart=/var/www/aoqolt/Backend/venv/bin/gunicorn \
          --workers 4 \
          --bind unix:/var/www/aoqolt/Backend/aoqolt.sock \
          core.wsgi:application

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl start aoqolt
sudo systemctl enable aoqolt
```

### 8. Configure Nginx
Create `/etc/nginx/sites-available/aoqolt`:
```nginx
server {
    listen 80;
    server_name api.aoqolt.com;

    location /static/ {
        alias /var/www/aoqolt/Backend/staticfiles/;
    }

    location /media/ {
        alias /var/www/aoqolt/Backend/media/;
    }

    location / {
        proxy_pass http://unix:/var/www/aoqolt/Backend/aoqolt.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/aoqolt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.aoqolt.com
```

### 10. Configure Celery Worker
Create `/etc/systemd/system/aoqolt-celery.service`:
```ini
[Unit]
Description=Aoqolt Celery Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/aoqolt/Backend
Environment="PATH=/var/www/aoqolt/Backend/venv/bin"
ExecStart=/var/www/aoqolt/Backend/venv/bin/celery -A core worker -l info

[Install]
WantedBy=multi-user.target
```

Start Celery:
```bash
sudo systemctl start aoqolt-celery
sudo systemctl enable aoqolt-celery
```

## Security Hardening

1. **Firewall Configuration**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow OpenSSH
   sudo ufw enable
   ```

2. **Disable Debug Mode**
   - Set `DEBUG=False` in `.env`
   - Set proper `ALLOWED_HOSTS`

3. **Database Backup**
   ```bash
   # Daily backup cron
   0 2 * * * pg_dump aoqolt_db > /backups/aoqolt_$(date +\%Y\%m\%d).sql
   ```

4. **Monitoring**
   - Setup Sentry for error tracking
   - Configure logging to external service
   - Monitor server resources

## Maintenance

### Update Application
```bash
cd /var/www/aoqolt/Backend
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart aoqolt
sudo systemctl restart aoqolt-celery
```

### View Logs
```bash
# Gunicorn logs
sudo journalctl -u aoqolt -f

# Celery logs
sudo journalctl -u aoqolt-celery -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```
