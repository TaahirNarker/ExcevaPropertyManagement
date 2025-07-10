#!/bin/bash

# Complete Deployment Script for Property Management System
# This script deploys the project to Oracle Cloud server with SSL support

echo "🚀 Property Management System - Complete Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/osmannarker/ExcevaPropertyManagement.git"
PROJECT_NAME="ExcevaPropertyManagement"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"
DOMAIN="propman.exceva.capital"
SERVER_IP="150.230.123.106"

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root. Please run as ubuntu user.${NC}"
        exit 1
    fi
}

# Function to check internet connectivity
check_internet() {
    echo -e "${YELLOW}🌐 Checking internet connectivity...${NC}"
    
    if ping -c 1 google.com &> /dev/null; then
        echo -e "${GREEN}✅ Internet connection is working${NC}"
        return 0
    else
        echo -e "${RED}❌ No internet connection. Please check your network.${NC}"
        return 1
    fi
}

# Function to update system packages
update_system() {
    echo -e "${YELLOW}📦 Updating system packages...${NC}"
    
    sudo apt update && sudo apt upgrade -y
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ System packages updated successfully${NC}"
    else
        echo -e "${RED}❌ Failed to update system packages${NC}"
        exit 1
    fi
}

# Function to install required packages
install_dependencies() {
    echo -e "${YELLOW}🔧 Installing required dependencies...${NC}"
    
    # Install basic packages
    sudo apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        nginx \
        postgresql \
        postgresql-contrib \
        git \
        curl \
        wget \
        unzip \
        htop \
        nano \
        vim \
        ufw \
        certbot \
        python3-certbot-nginx \
        snapd
    
    # Install Node.js 18.x
    echo -e "${YELLOW}📦 Installing Node.js 18.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PM2 globally
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
    
    # Install certbot via snap
    echo -e "${YELLOW}🔐 Installing Certbot...${NC}"
    sudo snap install core
    sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
}

# Function to clone or update project
deploy_project() {
    echo -e "${YELLOW}📥 Deploying project...${NC}"
    
    # Check if project already exists
    if [ -d "$PROJECT_PATH" ]; then
        echo -e "${YELLOW}⚠️  Project already exists at $PROJECT_PATH${NC}"
        echo -e "${YELLOW}🔄 Updating existing project...${NC}"
        
        cd "$PROJECT_PATH"
        git pull origin main
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Project updated successfully${NC}"
        else
            echo -e "${RED}❌ Failed to update project${NC}"
            exit 1
        fi
    else
        # Clone the project
        echo -e "${YELLOW}📥 Cloning project from GitHub...${NC}"
        
        # Create /var/www directory if it doesn't exist
        sudo mkdir -p /var/www
        
        # Clone to temporary location first
        cd /tmp
        git clone "$GITHUB_REPO" "$PROJECT_NAME"
        
        if [ $? -eq 0 ]; then
            # Move to final location
            sudo mv "/tmp/$PROJECT_NAME" "$PROJECT_PATH"
            
            # Set proper ownership
            sudo chown -R ubuntu:ubuntu "$PROJECT_PATH"
            
            echo -e "${GREEN}✅ Project cloned successfully${NC}"
        else
            echo -e "${RED}❌ Failed to clone project${NC}"
            exit 1
        fi
    fi
}

# Function to setup backend
setup_backend() {
    echo -e "${YELLOW}🐍 Setting up Django backend...${NC}"
    
    cd "$PROJECT_PATH/backend"
    
    # Create virtual environment
    python3 -m venv venv
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install Python dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Create .env file from template
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}📝 Creating .env file...${NC}"
        cp env_template.txt .env
        
        # Update .env with production values
        sed -i "s/DEBUG=True/DEBUG=False/" .env
        sed -i "s/ALLOWED_HOSTS=localhost,127.0.0.1/ALLOWED_HOSTS=localhost,127.0.0.1,$SERVER_IP,$DOMAIN/" .env
        sed -i "s/SECURE_SSL_REDIRECT=False/SECURE_SSL_REDIRECT=True/" .env
        
        echo -e "${YELLOW}⚠️  Please update .env file with your actual database credentials${NC}"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Run migrations
    python manage.py migrate
    
    # Collect static files
    python manage.py collectstatic --noinput
    
    echo -e "${GREEN}✅ Django backend setup complete${NC}"
}

# Function to setup frontend
setup_frontend() {
    echo -e "${YELLOW}⚛️  Setting up Next.js frontend...${NC}"
    
    cd "$PROJECT_PATH/frontend"
    
    # Install Node.js dependencies
    npm install
    
    # Build the frontend
    npm run build
    
    echo -e "${GREEN}✅ Next.js frontend setup complete${NC}"
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}🗄️  Setting up PostgreSQL database...${NC}"
    
    # Start PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE property_management;" 2>/dev/null || echo "Database already exists"
    sudo -u postgres psql -c "CREATE USER property_user WITH PASSWORD 'secure_password_here';" 2>/dev/null || echo "User already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE property_management TO property_user;" 2>/dev/null
    
    echo -e "${GREEN}✅ PostgreSQL database setup complete${NC}"
    echo -e "${YELLOW}⚠️  Please update the database password in your .env file${NC}"
}

# Function to setup PM2 processes
setup_pm2() {
    echo -e "${YELLOW}🔄 Setting up PM2 processes...${NC}"
    
    cd "$PROJECT_PATH"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'property-backend',
      cwd: '$PROJECT_PATH/backend',
      script: 'venv/bin/gunicorn',
      args: '--bind 0.0.0.0:8000 property_control_system.wsgi:application --workers 2 --timeout 120',
      env: {
        DJANGO_SETTINGS_MODULE: 'property_control_system.settings',
        PATH: '$PROJECT_PATH/backend/venv/bin:' + process.env.PATH
      },
      error_file: '$PROJECT_PATH/logs/backend_error.log',
      out_file: '$PROJECT_PATH/logs/backend_out.log',
      log_file: '$PROJECT_PATH/logs/backend.log',
      time: true
    },
    {
      name: 'property-frontend',
      cwd: '$PROJECT_PATH/frontend',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      },
      error_file: '$PROJECT_PATH/logs/frontend_error.log',
      out_file: '$PROJECT_PATH/logs/frontend_out.log',
      log_file: '$PROJECT_PATH/logs/frontend.log',
      time: true
    }
  ]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    
    # Start PM2 processes
    pm2 start ecosystem.config.js
    pm2 startup
    pm2 save
    
    echo -e "${GREEN}✅ PM2 processes setup complete${NC}"
}

# Function to setup nginx
setup_nginx() {
    echo -e "${YELLOW}🌐 Setting up Nginx...${NC}"
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/property-management > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $SERVER_IP;
    
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
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/property-management /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        # Start nginx
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        echo -e "${GREEN}✅ Nginx setup complete${NC}"
    else
        echo -e "${RED}❌ Nginx configuration error${NC}"
        exit 1
    fi
}

# Function to setup firewall
setup_firewall() {
    echo -e "${YELLOW}🔥 Setting up firewall...${NC}"
    
    # Configure UFW
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    echo -e "${GREEN}✅ Firewall setup complete${NC}"
    echo -e "${YELLOW}💡 Make sure Oracle Cloud Security List allows:${NC}"
    echo -e "  - Port 22 (SSH)"
    echo -e "  - Port 80 (HTTP)"
    echo -e "  - Port 443 (HTTPS)"
}

# Function to copy SSL setup script
copy_ssl_script() {
    echo -e "${YELLOW}📋 Copying SSL setup script...${NC}"
    
    # Copy the SSL setup script to the project directory
    if [ -f "ssl-certificate-setup.sh" ]; then
        cp ssl-certificate-setup.sh "$PROJECT_PATH/"
        chmod +x "$PROJECT_PATH/ssl-certificate-setup.sh"
        echo -e "${GREEN}✅ SSL setup script copied${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL setup script not found in current directory${NC}"
        echo -e "${YELLOW}📝 Creating SSL setup script...${NC}"
        
        # Create a basic SSL setup script
        cat > "$PROJECT_PATH/ssl-certificate-setup.sh" << 'EOFSSL'
#!/bin/bash
# Basic SSL Certificate Setup
echo "Setting up SSL certificate for propman.exceva.capital..."

# Stop nginx
sudo systemctl stop nginx

# Get SSL certificate
sudo certbot certonly --standalone --non-interactive --agree-tos --email admin@exceva.capital --domains propman.exceva.capital

# Update nginx config for SSL
sudo tee /etc/nginx/sites-available/property-management > /dev/null <<EOF
server {
    listen 80;
    server_name propman.exceva.capital;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name propman.exceva.capital;
    
    ssl_certificate /etc/letsencrypt/live/propman.exceva.capital/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/propman.exceva.capital/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Restart nginx
sudo systemctl restart nginx

echo "SSL certificate setup complete!"
EOFSSL
        
        chmod +x "$PROJECT_PATH/ssl-certificate-setup.sh"
        echo -e "${GREEN}✅ SSL setup script created${NC}"
    fi
}

# Function to run health checks
run_health_checks() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"
    
    # Check PM2 processes
    echo -e "${YELLOW}📊 PM2 Status:${NC}"
    pm2 status
    
    # Check nginx
    echo -e "${YELLOW}🌐 Nginx Status:${NC}"
    sudo systemctl status nginx --no-pager
    
    # Check database
    echo -e "${YELLOW}🗄️  Database Status:${NC}"
    sudo systemctl status postgresql --no-pager
    
    # Test endpoints
    echo -e "${YELLOW}🔍 Testing endpoints...${NC}"
    
    sleep 10  # Give services time to start
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend is responding${NC}"
    else
        echo -e "${RED}❌ Frontend is not responding${NC}"
    fi
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/admin/ | grep -q "200\|302"; then
        echo -e "${GREEN}✅ Backend is responding${NC}"
    else
        echo -e "${RED}❌ Backend is not responding${NC}"
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}🚀 Starting complete deployment...${NC}"
    
    # Check prerequisites
    check_root
    check_internet
    
    # Step 1: Update system
    update_system
    
    # Step 2: Install dependencies
    install_dependencies
    
    # Step 3: Deploy project
    deploy_project
    
    # Step 4: Setup database
    setup_database
    
    # Step 5: Setup backend
    setup_backend
    
    # Step 6: Setup frontend
    setup_frontend
    
    # Step 7: Setup PM2
    setup_pm2
    
    # Step 8: Setup Nginx
    setup_nginx
    
    # Step 9: Setup firewall
    setup_firewall
    
    # Step 10: Copy SSL script
    copy_ssl_script
    
    # Step 11: Run health checks
    run_health_checks
    
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo ""
    echo -e "${YELLOW}🌍 Your application is now running at:${NC}"
    echo -e "  🔗 Website: http://$DOMAIN"
    echo -e "  🔗 Website (IP): http://$SERVER_IP"
    echo -e "  🛠️ Admin: http://$DOMAIN/admin/"
    echo -e "  🔌 API: http://$DOMAIN/api/"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Update your .env file with actual database credentials"
    echo "2. Create a Django superuser: cd $PROJECT_PATH/backend && source venv/bin/activate && python manage.py createsuperuser"
    echo "3. Run SSL certificate setup: cd $PROJECT_PATH && ./ssl-certificate-setup.sh"
    echo "4. Test all endpoints to ensure everything works"
    echo ""
    echo -e "${YELLOW}📊 Useful commands:${NC}"
    echo "  - Check PM2 status: pm2 status"
    echo "  - View logs: pm2 logs"
    echo "  - Restart services: pm2 restart all"
    echo "  - Check nginx: sudo systemctl status nginx"
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
}

# Run main function
main "$@" 