# SSL Setup Guide for propman.exceva.capital

## 🔐 Complete SSL Configuration with Auto-Redirect

This guide provides step-by-step instructions to set up SSL certificates and automatic HTTP-to-HTTPS redirection for your Property Management System.

---

## 🚀 Quick Setup (Recommended)

### Step 1: Run the Automated SSL Setup Script

```bash
# Connect to your Oracle Cloud server
ssh ubuntu@150.230.123.106

# Navigate to the project directory
cd /var/www/ExcevaPropertyManagement

# Run the enhanced SSL setup script
./deploy-ssl-propman.sh
```

**This script will:**
- ✅ Check DNS configuration
- ✅ Install SSL certificates via Let's Encrypt
- ✅ Configure Nginx with auto-redirect
- ✅ Set up automatic certificate renewal
- ✅ Configure Django for SSL
- ✅ Test the complete setup

---

## 📋 Prerequisites

Before running the setup, ensure:

1. **Domain DNS**: `propman.exceva.capital` points to your server IP
2. **Server Access**: SSH access to your Oracle Cloud server
3. **Project Deployed**: ExcevaPropertyManagement project is deployed
4. **Ports Open**: Oracle Cloud Security List allows ports 22, 80, 443
5. **Services Running**: Nginx, PM2, and your applications are running

---

## 🔧 Manual Setup (If Automated Script Fails)

### Step 1: Check DNS Configuration

```bash
# Verify domain points to your server
dig +short propman.exceva.capital

# Should return your server IP: 150.230.123.106
```

### Step 2: Install Certbot

```bash
# Install snapd
sudo apt update
sudo apt install snapd

# Install certbot
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### Step 3: Configure Firewall

```bash
# Configure Ubuntu firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Verify firewall status
sudo ufw status
```

### Step 4: Create Temporary Nginx Config

```bash
# Backup existing config
sudo cp /etc/nginx/sites-available/property-management /etc/nginx/sites-available/property-management.backup

# Create temporary config for certificate
sudo tee /etc/nginx/sites-available/property-management > /dev/null <<'EOF'
server {
    listen 80;
    server_name propman.exceva.capital;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Obtain SSL Certificate

```bash
# Create web directory
sudo mkdir -p /var/www/html

# Get SSL certificate
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --non-interactive \
    --agree-tos \
    --email admin@exceva.capital \
    --domains propman.exceva.capital
```

### Step 6: Create Production Nginx Config

```bash
# Create production config with SSL and auto-redirect
sudo tee /etc/nginx/sites-available/property-management > /dev/null <<'EOF'
# HTTP server - Auto redirect to HTTPS
server {
    listen 80;
    server_name propman.exceva.capital;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server - Main application
server {
    listen 443 ssl http2;
    server_name propman.exceva.capital;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/propman.exceva.capital/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/propman.exceva.capital/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API and Admin
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /var/www/ExcevaPropertyManagement/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /var/www/ExcevaPropertyManagement/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Setup Auto-Renewal

```bash
# Create renewal hook
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy

sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null <<'EOF'
#!/bin/bash
systemctl reload nginx
cd /var/www/ExcevaPropertyManagement && pm2 reload all
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Test renewal
sudo certbot renew --dry-run
```

### Step 8: Update Django Settings

```bash
# Add SSL settings to Django
sudo tee -a /var/www/ExcevaPropertyManagement/backend/property_control_system/settings.py > /dev/null <<'EOF'

# SSL/HTTPS Configuration
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_FRAME_DENY = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'propman.exceva.capital',
]
EOF

# Restart Django
cd /var/www/ExcevaPropertyManagement
pm2 restart all
```

---

## 🧪 Testing Your SSL Setup

### 1. Test HTTP to HTTPS Redirect

```bash
# Should return 301 redirect
curl -I http://propman.exceva.capital

# Should automatically redirect to HTTPS
curl -L http://propman.exceva.capital
```

### 2. Test HTTPS Connection

```bash
# Should return 200 OK
curl -I https://propman.exceva.capital

# Test SSL certificate
openssl s_client -connect propman.exceva.capital:443 -servername propman.exceva.capital
```

### 3. Test in Browser

Visit these URLs in your browser:
- 🌐 `http://propman.exceva.capital` (should redirect to HTTPS)
- 🔒 `https://propman.exceva.capital` (should show your app)
- 🔐 `https://propman.exceva.capital/auth/login`
- 📝 `https://propman.exceva.capital/auth/register`
- 🏢 `https://propman.exceva.capital/dashboard`
- 🛠️ `https://propman.exceva.capital/admin/`

---

## 🛠️ Troubleshooting

### Issue 1: DNS Not Pointing to Server

**Error**: `Domain propman.exceva.capital does not resolve`

**Solution**:
1. Update your DNS records to point to your server IP
2. Wait 5-10 minutes for DNS propagation
3. Verify with: `dig +short propman.exceva.capital`

### Issue 2: Certbot Fails to Get Certificate

**Error**: `Failed to obtain SSL certificate`

**Solution**:
```bash
# Check if nginx is running
sudo systemctl status nginx

# Check if port 80 is accessible
sudo netstat -tlnp | grep :80

# Try standalone mode
sudo systemctl stop nginx
sudo certbot certonly --standalone -d propman.exceva.capital
sudo systemctl start nginx
```

### Issue 3: Nginx Configuration Error

**Error**: `nginx: configuration file test failed`

**Solution**:
```bash
# Check nginx configuration
sudo nginx -t

# Restore backup
sudo cp /etc/nginx/sites-available/property-management.backup /etc/nginx/sites-available/property-management

# Test again
sudo nginx -t
```

### Issue 4: SSL Certificate Expired

**Error**: `SSL certificate has expired`

**Solution**:
```bash
# Check certificate expiry
sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/propman.exceva.capital/fullchain.pem

# Renew certificate
sudo certbot renew

# Force renewal if needed
sudo certbot renew --force-renewal
```

### Issue 5: Services Not Starting

**Error**: `PM2 services not running`

**Solution**:
```bash
# Check PM2 status
pm2 status

# Start services
cd /var/www/ExcevaPropertyManagement
pm2 start ecosystem.config.js

# Or restart all
pm2 restart all
```

---

## 📊 SSL Grade Testing

Test your SSL configuration quality:

1. **SSL Labs Test**: https://www.ssllabs.com/ssltest/
2. **Security Headers**: https://securityheaders.com/
3. **SSL Checker**: https://www.sslchecker.com/

---

## 🔄 Maintenance

### Monthly Tasks
- Monitor certificate expiry: `sudo certbot certificates`
- Check renewal status: `sudo certbot renew --dry-run`
- Review SSL grades and security headers

### Quarterly Tasks
- Update security headers
- Review and update SSL configuration
- Test backup and restore procedures

### Annual Tasks
- Review and update SSL policies
- Audit security configuration
- Update documentation

---

## 📞 Support

If you encounter issues:

1. **Check logs**: `sudo tail -f /var/log/nginx/error.log`
2. **Verify DNS**: `dig +short propman.exceva.capital`
3. **Test SSL**: `openssl s_client -connect propman.exceva.capital:443`
4. **Check certificates**: `sudo certbot certificates`

---

## 🎯 Expected Results

After successful SSL setup:

✅ **HTTP to HTTPS Redirect**: All HTTP requests automatically redirect to HTTPS
✅ **SSL Certificate**: Valid Let's Encrypt certificate installed
✅ **Security Headers**: HSTS, XSS protection, and other security headers active
✅ **Auto-Renewal**: Certificate will automatically renew every 3 months
✅ **Grade A SSL**: High-quality SSL configuration
✅ **All Pages Secure**: Login, dashboard, admin, and API endpoints work over HTTPS

---

## 🔗 Quick Links

- 🏠 **Main Site**: https://propman.exceva.capital
- 🔐 **Login**: https://propman.exceva.capital/auth/login
- 📝 **Register**: https://propman.exceva.capital/auth/register
- 🏢 **Dashboard**: https://propman.exceva.capital/dashboard
- 🛠️ **Admin Panel**: https://propman.exceva.capital/admin/

---

**🎉 Congratulations! Your Property Management System is now secure with SSL encryption and automatic HTTP-to-HTTPS redirection.** 