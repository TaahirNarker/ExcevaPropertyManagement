# SSL Certificate Troubleshooting Guide
## Property Management System - propman.exceva.capital

This guide helps you troubleshoot SSL certificate issues for your Property Management System.

## Quick SSL Certificate Setup

### 1. Run the Automated Script
```bash
# On your Oracle Cloud server
cd /var/www/ExcevaPropertyManagement
./ssl-certificate-setup.sh
```

### 2. Manual Setup (if script fails)

#### Step 1: Check DNS Configuration
```bash
# Verify domain points to your server
dig +short propman.exceva.capital

# Should return: 150.230.123.106
# If not, update your DNS records
```

#### Step 2: Install Certbot
```bash
# Install snapd and certbot
sudo apt update
sudo apt install snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

#### Step 3: Get SSL Certificate
```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@exceva.capital \
    --domains propman.exceva.capital

# Start nginx
sudo systemctl start nginx
```

#### Step 4: Update Nginx Configuration
```bash
# Backup current config
sudo cp /etc/nginx/sites-available/property-management /etc/nginx/sites-available/property-management.backup

# Create SSL-enabled config
sudo tee /etc/nginx/sites-available/property-management > /dev/null <<'EOF'
# HTTP server (redirect to HTTPS)
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

# HTTPS server
server {
    listen 443 ssl http2;
    server_name propman.exceva.capital;
    
    ssl_certificate /etc/letsencrypt/live/propman.exceva.capital/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/propman.exceva.capital/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
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
    
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /var/www/ExcevaPropertyManagement/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
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

## Common Issues and Solutions

### Issue 1: "DNS resolution failed"
**Problem**: Domain doesn't point to your server
**Solution**:
```bash
# Check current DNS
dig +short propman.exceva.capital

# Update DNS records to point to: 150.230.123.106
# Wait 5-10 minutes for propagation
```

### Issue 2: "Certificate already exists"
**Problem**: Trying to create duplicate certificate
**Solution**:
```bash
# Renew existing certificate
sudo certbot renew

# Or force renewal
sudo certbot renew --force-renewal
```

### Issue 3: "Port 80 already in use"
**Problem**: Another service is using port 80
**Solution**:
```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d propman.exceva.capital

# Start nginx
sudo systemctl start nginx
```

### Issue 4: "Certificate not found"
**Problem**: SSL certificate files missing
**Solution**:
```bash
# Check certificate location
sudo ls -la /etc/letsencrypt/live/propman.exceva.capital/

# If missing, obtain new certificate
sudo certbot certonly --standalone -d propman.exceva.capital
```

### Issue 5: "Nginx configuration error"
**Problem**: Nginx config syntax error
**Solution**:
```bash
# Test nginx config
sudo nginx -t

# Check for syntax errors in:
sudo nano /etc/nginx/sites-available/property-management

# Restore backup if needed
sudo cp /etc/nginx/sites-available/property-management.backup /etc/nginx/sites-available/property-management
```

### Issue 6: "SSL certificate expired"
**Problem**: Certificate has expired
**Solution**:
```bash
# Check certificate expiry
sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/propman.exceva.capital/fullchain.pem

# Renew certificate
sudo certbot renew

# Reload nginx
sudo systemctl reload nginx
```

## Diagnostic Commands

### Check Certificate Status
```bash
# Check certificate expiry
sudo certbot certificates

# Check certificate details
sudo openssl x509 -text -in /etc/letsencrypt/live/propman.exceva.capital/fullchain.pem
```

### Check Services
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check PM2 services
pm2 status
pm2 logs
```

### Test SSL Connection
```bash
# Test SSL certificate
openssl s_client -connect propman.exceva.capital:443 -servername propman.exceva.capital

# Test HTTP redirect
curl -I http://propman.exceva.capital

# Test HTTPS connection
curl -I https://propman.exceva.capital
```

### Check Firewall
```bash
# Check local firewall
sudo ufw status

# Check if ports are listening
sudo netstat -tlnp | grep -E ':80|:443'
```

## Oracle Cloud Security List Configuration

Make sure your Oracle Cloud Security List allows:

1. **SSH (Port 22)**
   - Source: 0.0.0.0/0
   - Protocol: TCP
   - Port: 22

2. **HTTP (Port 80)**
   - Source: 0.0.0.0/0
   - Protocol: TCP
   - Port: 80

3. **HTTPS (Port 443)**
   - Source: 0.0.0.0/0
   - Protocol: TCP
   - Port: 443

## Automatic Certificate Renewal

### Setup Automatic Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer

# Manual renewal
sudo certbot renew
```

### Renewal Hook
```bash
# Create renewal hook
sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null <<'EOF'
#!/bin/bash
systemctl reload nginx
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
```

## Emergency Rollback

If SSL setup breaks your site:

### 1. Restore HTTP-only Configuration
```bash
# Restore backup
sudo cp /etc/nginx/sites-available/property-management.backup /etc/nginx/sites-available/property-management

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Disable SSL in Django
```bash
# Edit settings.py
sudo nano /var/www/ExcevaPropertyManagement/backend/property_control_system/settings.py

# Set SECURE_SSL_REDIRECT = False
# Restart Django
pm2 restart property-backend
```

## Success Verification

After setup, verify:

1. **HTTP redirects to HTTPS**
   ```bash
   curl -I http://propman.exceva.capital
   # Should return 301 redirect
   ```

2. **HTTPS loads correctly**
   ```bash
   curl -I https://propman.exceva.capital
   # Should return 200 OK
   ```

3. **All endpoints work**
   - https://propman.exceva.capital (Frontend)
   - https://propman.exceva.capital/admin/ (Django Admin)
   - https://propman.exceva.capital/api/ (API)

4. **SSL certificate is valid**
   - Check in browser for green lock icon
   - No certificate warnings

## Support

If you continue to experience issues:

1. Check the logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

2. Verify DNS propagation:
   ```bash
   nslookup propman.exceva.capital
   ```

3. Test from external services:
   - https://www.ssllabs.com/ssltest/
   - https://www.whois.net/

Your SSL certificate should now be properly configured and automatically renewing! 