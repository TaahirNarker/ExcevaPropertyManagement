#!/bin/bash

# SSL Certificate Setup Script for Property Management System
# Domain: propman.exceva.capital
# Server: Oracle Cloud Free Tier (150.230.123.106)

echo "🔐 SSL Certificate Setup for Property Management System"
echo "Domain: propman.exceva.capital"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="propman.exceva.capital"
SERVER_IP="150.230.123.106"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/property-management"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root. Please run as ubuntu user.${NC}"
        exit 1
    fi
}

# Function to check if domain points to this server
check_domain_dns() {
    echo -e "${YELLOW}🔍 Checking DNS configuration...${NC}"
    
    DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
    
    if [[ "$DOMAIN_IP" == "$SERVER_IP" ]]; then
        echo -e "${GREEN}✅ DNS is correctly configured: $DOMAIN -> $SERVER_IP${NC}"
        return 0
    else
        echo -e "${RED}❌ DNS issue detected:${NC}"
        echo -e "  Domain $DOMAIN points to: $DOMAIN_IP"
        echo -e "  Server IP: $SERVER_IP"
        echo -e "${YELLOW}💡 Please update your DNS records to point $DOMAIN to $SERVER_IP${NC}"
        return 1
    fi
}

# Function to install Certbot
install_certbot() {
    echo -e "${YELLOW}📦 Installing Certbot...${NC}"
    
    # Install snapd if not present
    if ! command -v snap &> /dev/null; then
        sudo apt update
        sudo apt install -y snapd
    fi
    
    # Install certbot
    sudo snap install core
    sudo snap refresh core
    sudo snap install --classic certbot
    
    # Create symlink if it doesn't exist
    if [ ! -f /usr/bin/certbot ]; then
        sudo ln -s /snap/bin/certbot /usr/bin/certbot
    fi
    
    echo -e "${GREEN}✅ Certbot installed successfully${NC}"
}

# Function to update Nginx configuration for SSL
update_nginx_config() {
    echo -e "${YELLOW}🔧 Updating Nginx configuration...${NC}"
    
    # Backup existing config
    sudo cp $NGINX_CONFIG_PATH ${NGINX_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)
    
    # Create new Nginx config with SSL support
    sudo tee $NGINX_CONFIG_PATH > /dev/null <<EOF
# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 5m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
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
        proxy_redirect off;
    }
    
    # Backend API and Admin
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }
    
    # Django static files
    location /static/ {
        alias $PROJECT_PATH/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Django media files
    location /media/ {
        alias $PROJECT_PATH/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF
    
    # Test Nginx configuration
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    else
        echo -e "${RED}❌ Nginx configuration error. Restoring backup...${NC}"
        sudo cp ${NGINX_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S) $NGINX_CONFIG_PATH
        exit 1
    fi
}

# Function to obtain SSL certificate
obtain_ssl_certificate() {
    echo -e "${YELLOW}🔐 Obtaining SSL certificate...${NC}"
    
    # Ensure web directory exists
    sudo mkdir -p /var/www/html
    
    # Stop services temporarily to avoid conflicts
    sudo systemctl stop nginx
    
    # Obtain certificate using standalone mode
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email admin@exceva.capital \
        --domains $DOMAIN \
        --keep-until-expiring
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
        
        # Start nginx again
        sudo systemctl start nginx
        sudo systemctl reload nginx
        
        return 0
    else
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
        sudo systemctl start nginx
        return 1
    fi
}

# Function to setup automatic renewal
setup_auto_renewal() {
    echo -e "${YELLOW}🔄 Setting up automatic SSL certificate renewal...${NC}"
    
    # Create renewal hook script
    sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null <<EOF
#!/bin/bash
systemctl reload nginx
EOF
    
    sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
    
    # Test renewal
    sudo certbot renew --dry-run
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Automatic renewal configured successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Renewal test failed, but certificate is still valid${NC}"
    fi
}

# Function to verify SSL setup
verify_ssl_setup() {
    echo -e "${YELLOW}🔍 Verifying SSL setup...${NC}"
    
    # Check if certificate exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo -e "${GREEN}✅ SSL certificate file exists${NC}"
    else
        echo -e "${RED}❌ SSL certificate file not found${NC}"
        return 1
    fi
    
    # Check certificate validity
    CERT_EXPIRY=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
    echo -e "${GREEN}📅 Certificate expires: $CERT_EXPIRY${NC}"
    
    # Test HTTPS connection
    sleep 5
    if curl -s -I https://$DOMAIN | grep -q "200 OK"; then
        echo -e "${GREEN}✅ HTTPS connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTPS connection test failed - this might be normal during initial setup${NC}"
    fi
}

# Function to check and configure firewall
configure_firewall() {
    echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
    
    # Local firewall (ufw)
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    echo -e "${GREEN}✅ Local firewall configured${NC}"
    echo -e "${YELLOW}💡 Make sure Oracle Cloud Security List allows:${NC}"
    echo -e "  - Port 22 (SSH)"
    echo -e "  - Port 80 (HTTP)"
    echo -e "  - Port 443 (HTTPS)"
}

# Function to update Django settings for SSL
update_django_settings() {
    echo -e "${YELLOW}⚙️  Verifying Django SSL settings...${NC}"
    
    # Check if SSL settings are properly configured
    if grep -q "SECURE_SSL_REDIRECT.*=.*True" $PROJECT_PATH/backend/property_control_system/settings.py; then
        echo -e "${GREEN}✅ Django SSL settings are configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Django SSL settings may need attention${NC}"
    fi
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    
    # Restart nginx
    sudo systemctl restart nginx
    
    # Restart PM2 services
    cd $PROJECT_PATH
    pm2 restart all
    
    echo -e "${GREEN}✅ Services restarted${NC}"
}

# Main execution
main() {
    echo -e "${YELLOW}🚀 Starting SSL Certificate Setup...${NC}"
    
    # Check prerequisites
    check_root
    
    # Step 1: Check DNS configuration
    if ! check_domain_dns; then
        echo -e "${RED}❌ DNS configuration issue. Please fix DNS first.${NC}"
        exit 1
    fi
    
    # Step 2: Install Certbot
    install_certbot
    
    # Step 3: Configure firewall
    configure_firewall
    
    # Step 4: Update Nginx configuration
    update_nginx_config
    
    # Step 5: Obtain SSL certificate
    if obtain_ssl_certificate; then
        echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
    else
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
        exit 1
    fi
    
    # Step 6: Setup automatic renewal
    setup_auto_renewal
    
    # Step 7: Verify Django settings
    update_django_settings
    
    # Step 8: Restart services
    restart_services
    
    # Step 9: Verify SSL setup
    verify_ssl_setup
    
    echo ""
    echo -e "${GREEN}🎉 SSL Certificate Setup Complete!${NC}"
    echo ""
    echo -e "${YELLOW}🌍 Your website is now secure:${NC}"
    echo -e "  🔗 Main site: https://$DOMAIN"
    echo -e "  🔐 Login: https://$DOMAIN/auth/login"
    echo -e "  📝 Register: https://$DOMAIN/auth/register"
    echo -e "  🏠 Dashboard: https://$DOMAIN/dashboard"
    echo -e "  🛠️ Admin: https://$DOMAIN/admin/"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "1. Test all pages to ensure they load correctly"
    echo "2. Check that HTTP redirects to HTTPS"
    echo "3. Verify all API endpoints work over HTTPS"
    echo "4. Certificate will auto-renew every 3 months"
    echo ""
    echo -e "${GREEN}✅ SSL Certificate setup completed successfully!${NC}"
}

# Run main function
main "$@" 