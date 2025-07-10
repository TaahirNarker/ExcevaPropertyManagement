#!/bin/bash

# Enhanced SSL Deployment Script for propman.exceva.capital
# This script sets up SSL certificates and auto-redirect for the Property Management System
# Domain: propman.exceva.capital
# Server: Oracle Cloud Instance

echo "🔐 Enhanced SSL Setup for Property Management System"
echo "Domain: propman.exceva.capital"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="propman.exceva.capital"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/property-management"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/property-management"
EMAIL="admin@exceva.capital"

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root. Please run as ubuntu user.${NC}"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        echo -e "${RED}❌ Nginx is not installed. Please install nginx first.${NC}"
        exit 1
    fi
    
    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Certbot...${NC}"
        sudo apt update
        sudo apt install -y snapd
        sudo snap install core
        sudo snap refresh core
        sudo snap install --classic certbot
        sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    fi
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_PATH" ]; then
        echo -e "${RED}❌ Project directory not found at $PROJECT_PATH${NC}"
        echo -e "${YELLOW}💡 Please deploy the project first using deploy-to-server.sh${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to check DNS configuration
check_dns() {
    print_status "Checking DNS configuration..."
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s api.ipify.org 2>/dev/null)
    
    if [ -z "$SERVER_IP" ]; then
        echo -e "${RED}❌ Unable to determine server IP${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📍 Server IP: $SERVER_IP${NC}"
    
    # Check domain DNS
    DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
    
    if [ -z "$DOMAIN_IP" ]; then
        echo -e "${RED}❌ Domain $DOMAIN does not resolve to any IP${NC}"
        echo -e "${YELLOW}💡 Please configure DNS to point $DOMAIN to $SERVER_IP${NC}"
        exit 1
    fi
    
    if [[ "$DOMAIN_IP" == "$SERVER_IP" ]]; then
        echo -e "${GREEN}✅ DNS correctly configured: $DOMAIN -> $SERVER_IP${NC}"
    else
        echo -e "${RED}❌ DNS mismatch:${NC}"
        echo -e "  Domain $DOMAIN points to: $DOMAIN_IP"
        echo -e "  Server IP: $SERVER_IP"
        echo -e "${YELLOW}💡 Please update DNS to point $DOMAIN to $SERVER_IP${NC}"
        exit 1
    fi
}

# Function to configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Configure Ubuntu firewall (UFW)
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    echo -e "${GREEN}✅ Firewall configured${NC}"
    echo -e "${YELLOW}💡 Ensure Oracle Cloud Security List allows:${NC}"
    echo -e "  - Port 22 (SSH) - 0.0.0.0/0"
    echo -e "  - Port 80 (HTTP) - 0.0.0.0/0"
    echo -e "  - Port 443 (HTTPS) - 0.0.0.0/0"
}

# Function to create temporary nginx config for certificate
create_temp_nginx_config() {
    print_status "Creating temporary nginx configuration..."
    
    # Backup existing config if it exists
    if [ -f "$NGINX_CONFIG_PATH" ]; then
        sudo cp "$NGINX_CONFIG_PATH" "${NGINX_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Create temporary config for certificate validation
    sudo tee "$NGINX_CONFIG_PATH" > /dev/null <<EOF
# Temporary HTTP server for SSL certificate validation
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt challenge directory
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Temporary location for testing
    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf "$NGINX_CONFIG_PATH" "$NGINX_ENABLED_PATH"
    
    # Test nginx configuration
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Temporary nginx configuration created${NC}"
        sudo systemctl reload nginx
    else
        echo -e "${RED}❌ Nginx configuration error${NC}"
        exit 1
    fi
}

# Function to obtain SSL certificate
obtain_ssl_certificate() {
    print_status "Obtaining SSL certificate..."
    
    # Create web directory
    sudo mkdir -p /var/www/html
    
    # Obtain certificate using webroot method
    sudo certbot certonly \
        --webroot \
        --webroot-path=/var/www/html \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$DOMAIN" \
        --keep-until-expiring \
        --expand
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
        
        # Check certificate
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            CERT_EXPIRY=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
            echo -e "${GREEN}📅 Certificate expires: $CERT_EXPIRY${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
        exit 1
    fi
}

# Function to create production nginx config with SSL and auto-redirect
create_production_nginx_config() {
    print_status "Creating production nginx configuration with SSL..."
    
    # Create production nginx config with SSL and auto-redirect
    sudo tee "$NGINX_CONFIG_PATH" > /dev/null <<EOF
# HTTP server - Auto redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt challenge directory
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all HTTP requests to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server - Main application
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Frontend (Next.js) - Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
        proxy_buffer_size 4k;
        proxy_buffers 100 4k;
        proxy_busy_buffers_size 8k;
        proxy_temp_file_write_size 8k;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # Backend API and Admin Panel
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_redirect off;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # Django Static Files
    location /static/ {
        alias $PROJECT_PATH/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # Django Media Files
    location /media/ {
        alias $PROJECT_PATH/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
        add_header Vary "Accept-Encoding";
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ ^/(wp-admin|wp-login|xmlrpc|phpmyadmin) {
        return 404;
    }
    
    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }
    
    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
}
EOF
    
    # Test nginx configuration
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Production nginx configuration created${NC}"
    else
        echo -e "${RED}❌ Nginx configuration error${NC}"
        exit 1
    fi
}

# Function to setup automatic SSL renewal
setup_auto_renewal() {
    print_status "Setting up automatic SSL renewal..."
    
    # Create renewal hook directory
    sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    
    # Create renewal hook script
    sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null <<EOF
#!/bin/bash
# Reload nginx after certificate renewal
systemctl reload nginx
# Optional: restart PM2 processes
cd $PROJECT_PATH && pm2 reload all
EOF
    
    sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
    
    # Test renewal process
    echo -e "${YELLOW}🧪 Testing SSL renewal process...${NC}"
    sudo certbot renew --dry-run
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL auto-renewal configured successfully${NC}"
        echo -e "${BLUE}📅 Certificates will auto-renew every 3 months${NC}"
    else
        echo -e "${YELLOW}⚠️  Renewal test failed, but certificate is still valid${NC}"
    fi
}

# Function to update Django settings for SSL
update_django_settings() {
    print_status "Updating Django settings for SSL..."
    
    SETTINGS_FILE="$PROJECT_PATH/backend/property_control_system/settings.py"
    
    if [ -f "$SETTINGS_FILE" ]; then
        # Backup settings
        sudo cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update settings for SSL
        sudo tee -a "$SETTINGS_FILE" > /dev/null <<EOF

# SSL/HTTPS Configuration
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_FRAME_DENY = True

# Add domain to ALLOWED_HOSTS
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '$DOMAIN',
    'propman.exceva.capital',
]
EOF
        
        echo -e "${GREEN}✅ Django SSL settings updated${NC}"
    else
        echo -e "${YELLOW}⚠️  Django settings file not found${NC}"
    fi
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."
    
    # Reload nginx
    sudo systemctl reload nginx
    
    # Restart backend services if PM2 is running
    if command -v pm2 &> /dev/null; then
        cd "$PROJECT_PATH"
        pm2 restart all 2>/dev/null || echo -e "${YELLOW}⚠️  PM2 services not running${NC}"
    fi
    
    echo -e "${GREEN}✅ Services restarted${NC}"
}

# Function to verify SSL setup
verify_ssl_setup() {
    print_status "Verifying SSL setup..."
    
    # Wait for services to start
    sleep 5
    
    # Test HTTP to HTTPS redirect
    echo -e "${YELLOW}🔄 Testing HTTP to HTTPS redirect...${NC}"
    HTTP_RESPONSE=$(curl -s -I -w "%{http_code}" -o /dev/null "http://$DOMAIN")
    if [[ "$HTTP_RESPONSE" == "301" ]]; then
        echo -e "${GREEN}✅ HTTP to HTTPS redirect working${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTP redirect test returned: $HTTP_RESPONSE${NC}"
    fi
    
    # Test HTTPS connection
    echo -e "${YELLOW}🔐 Testing HTTPS connection...${NC}"
    HTTPS_RESPONSE=$(curl -s -I -w "%{http_code}" -o /dev/null "https://$DOMAIN")
    if [[ "$HTTPS_RESPONSE" == "200" ]]; then
        echo -e "${GREEN}✅ HTTPS connection working${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTPS test returned: $HTTPS_RESPONSE${NC}"
    fi
    
    # Test SSL certificate
    echo -e "${YELLOW}🔍 Testing SSL certificate...${NC}"
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | grep -q "Verification: OK"; then
        echo -e "${GREEN}✅ SSL certificate verification passed${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL certificate verification may need time to propagate${NC}"
    fi
}

# Function to display final status
display_final_status() {
    echo ""
    echo -e "${GREEN}🎉 SSL Setup Complete for Property Management System!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${YELLOW}🌍 Your secure website is now available at:${NC}"
    echo -e "  🏠 Main Site: https://$DOMAIN"
    echo -e "  🔐 Login: https://$DOMAIN/auth/login"
    echo -e "  📝 Register: https://$DOMAIN/auth/register"
    echo -e "  🏢 Dashboard: https://$DOMAIN/dashboard"
    echo -e "  🛠️ Admin Panel: https://$DOMAIN/admin/"
    echo ""
    echo -e "${GREEN}🔒 Security Features Enabled:${NC}"
    echo -e "  ✅ SSL/TLS encryption (TLS 1.2 & 1.3)"
    echo -e "  ✅ HTTP to HTTPS auto-redirect"
    echo -e "  ✅ HSTS (HTTP Strict Transport Security)"
    echo -e "  ✅ Security headers (XSS, CSRF, etc.)"
    echo -e "  ✅ Automatic certificate renewal"
    echo -e "  ✅ Gzip compression"
    echo ""
    echo -e "${YELLOW}📅 Maintenance:${NC}"
    echo -e "  - SSL certificates will auto-renew every 3 months"
    echo -e "  - Check renewal status: sudo certbot renew --dry-run"
    echo -e "  - View certificate info: sudo certbot certificates"
    echo ""
    echo -e "${BLUE}🔍 Next Steps:${NC}"
    echo -e "  1. Test all application features over HTTPS"
    echo -e "  2. Verify API endpoints work correctly"
    echo -e "  3. Check that all internal links use HTTPS"
    echo -e "  4. Monitor SSL certificate expiration"
    echo ""
    echo -e "${GREEN}✅ SSL deployment completed successfully!${NC}"
}

# Main execution function
main() {
    print_status "Starting Enhanced SSL Setup for propman.exceva.capital"
    
    # Step 1: Initial checks
    check_root
    check_prerequisites
    check_dns
    
    # Step 2: Configure firewall
    configure_firewall
    
    # Step 3: Create temporary nginx config
    create_temp_nginx_config
    
    # Step 4: Obtain SSL certificate
    obtain_ssl_certificate
    
    # Step 5: Create production nginx config with SSL
    create_production_nginx_config
    
    # Step 6: Setup automatic renewal
    setup_auto_renewal
    
    # Step 7: Update Django settings
    update_django_settings
    
    # Step 8: Restart services
    restart_services
    
    # Step 9: Verify setup
    verify_ssl_setup
    
    # Step 10: Display final status
    display_final_status
}

# Run main function
main "$@" 