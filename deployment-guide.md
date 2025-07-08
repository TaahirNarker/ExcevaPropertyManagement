# Oracle Cloud Free Tier Deployment Guide
## Exceva Property Management System

### Prerequisites
- Oracle Cloud Free Tier account
- Domain name (optional, can use IP address)
- Basic Linux command line knowledge

### 1. Oracle Cloud Instance Setup

**Create ARM Instance:**
1. Login to Oracle Cloud Console
2. Create Compute Instance
3. Choose: VM.Standard.A1.Flex
4. Configure: 4 OCPUs, 24GB RAM
5. OS: Ubuntu 22.04
6. Add your SSH key

**Security Group Rules:**
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3000 (Next.js - temporary)
- Port 8000 (Django - temporary)

### 2. Server Initial Setup

```bash
# Connect via SSH
ssh ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3-pip python3-venv nodejs npm nginx postgresql postgresql-contrib git

# Install Node.js 18+ (recommended for Next.js)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Database Setup

```bash
# PostgreSQL setup
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE property_management;
CREATE USER property_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE property_management TO property_user;
\q
```

### 4. Application Deployment

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-username/ExcevaPropertyManagement.git
sudo chown -R ubuntu:ubuntu ExcevaPropertyManagement
cd ExcevaPropertyManagement

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create production .env file
cat > .env << EOF
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,your-ip-address
USE_SQLITE=False
DB_NAME=property_management
DB_USER=property_user
DB_PASSWORD=secure_password_here
DB_HOST=localhost
DB_PORT=5432
SECURE_SSL_REDIRECT=True
EOF

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser

# Frontend setup
cd ../frontend
npm install
npm run build
```

### 5. Process Management (PM2)

```bash
# Install PM2
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > /var/www/ExcevaPropertyManagement/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'property-backend',
      cwd: '/var/www/ExcevaPropertyManagement/backend',
      script: 'venv/bin/gunicorn',
      args: '--bind 0.0.0.0:8000 property_control_system.wsgi:application',
      env: {
        DJANGO_SETTINGS_MODULE: 'property_control_system.settings',
      }
    },
    {
      name: 'property-frontend',
      cwd: '/var/www/ExcevaPropertyManagement/frontend',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### 6. Nginx Configuration

```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/property-management << EOF
server {
    listen 80;
    server_name your-domain.com your-ip-address;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API and Admin
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Django static files
    location /static/ {
        alias /var/www/ExcevaPropertyManagement/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Django media files
    location /media/ {
        alias /var/www/ExcevaPropertyManagement/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/property-management /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

### 8. Firewall Configuration

```bash
# Oracle Cloud Security List (via web console)
# Allow: SSH (22), HTTP (80), HTTPS (443)

# Local firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 9. Monitoring and Maintenance

```bash
# View application logs
pm2 logs
pm2 monit

# Database backup script
sudo tee /usr/local/bin/backup-db.sh << EOF
#!/bin/bash
pg_dump -h localhost -U property_user property_management > /backup/property_management_\$(date +%Y%m%d_%H%M%S).sql
find /backup -name "*.sql" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-db.sh

# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/backup-db.sh" | sudo crontab -
```

### 10. Performance Optimization

```bash
# Enable PostgreSQL performance optimizations
sudo tee -a /etc/postgresql/14/main/postgresql.conf << EOF
shared_buffers = 2GB
effective_cache_size = 16GB
work_mem = 64MB
maintenance_work_mem = 512MB
EOF

sudo systemctl restart postgresql
```

### Access Your Application

- **Website**: https://your-domain.com
- **Admin Panel**: https://your-domain.com/admin/
- **API**: https://your-domain.com/api/

### Troubleshooting

```bash
# Check application status
pm2 status
pm2 logs property-backend
pm2 logs property-frontend

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check database
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"
```

## Resource Usage Expectations

- **RAM Usage**: 2-4GB (well within 24GB limit)
- **CPU Usage**: Low to moderate (ARM cores are efficient)
- **Storage**: 2-5GB for application + database growth
- **Bandwidth**: Minimal for typical property management usage

## Cost: $0/month (Oracle Cloud Free Tier)

Your property management system will run completely free on Oracle Cloud! 