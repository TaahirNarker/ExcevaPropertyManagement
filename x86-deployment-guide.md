# Optimized x86 Deployment Guide (1GB RAM)

## Memory Optimization Strategy

### 1. Use SQLite Database (Saves ~150MB RAM)
```python
# backend/property_control_system/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### 2. Django Production Settings (Saves ~200MB RAM)
```python
# Disable debug mode
DEBUG = False

# Optimize Django settings
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',  # Only log errors
            'class': 'logging.FileHandler',
            'filename': 'django_errors.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}

# Reduce middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

# Optimize sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

### 3. Next.js Static Build (Saves ~300MB RAM)
```bash
# Build static version
npm run build
npm run export

# Serve with lightweight server instead of Next.js dev server
npm install -g serve
serve -s out -l 3000
```

### 4. Use Gunicorn with Minimal Workers
```bash
# Install gunicorn
pip install gunicorn

# Run with 1 worker (instead of default 4)
gunicorn property_control_system.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --worker-class sync \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --timeout 30
```

### 5. System-Level Optimizations
```bash
# Create swap file (virtual memory)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Add to /etc/fstab for persistence
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize system memory
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
```

## Expected Memory Usage (Optimized)
- **Django Backend (Gunicorn):** 300-400MB
- **SQLite Database:** 50MB
- **Static Frontend (serve):** 100-150MB
- **System Overhead:** 200MB
- **Total:** ~650-800MB (fits in 1GB!)

## Deployment Script
```bash
#!/bin/bash

# System setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nodejs npm nginx

# Create swap
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile

# Backend setup
cd /home/ubuntu
git clone https://github.com/yourusername/ExcevaPropertyManagement.git
cd ExcevaPropertyManagement/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend setup
cd ../frontend
npm install
npm run build
npm install -g serve

# Create systemd services
sudo tee /etc/systemd/system/exceva-backend.service > /dev/null <<EOF
[Unit]
Description=Exceva Property Management Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ExcevaPropertyManagement/backend
Environment=PATH=/home/ubuntu/ExcevaPropertyManagement/backend/venv/bin
ExecStart=/home/ubuntu/ExcevaPropertyManagement/backend/venv/bin/gunicorn property_control_system.wsgi:application --bind 0.0.0.0:8000 --workers 1
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/exceva-frontend.service > /dev/null <<EOF
[Unit]
Description=Exceva Property Management Frontend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ExcevaPropertyManagement/frontend
ExecStart=/usr/local/bin/serve -s out -l 3000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start services
sudo systemctl daemon-reload
sudo systemctl enable exceva-backend exceva-frontend
sudo systemctl start exceva-backend exceva-frontend

# Setup nginx reverse proxy
sudo tee /etc/nginx/sites-available/exceva > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /admin/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/exceva /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## Performance Monitoring
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check services
sudo systemctl status exceva-backend exceva-frontend

# Monitor logs
sudo journalctl -u exceva-backend -f
sudo journalctl -u exceva-frontend -f
``` 