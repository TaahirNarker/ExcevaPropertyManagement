#!/bin/bash

# Exceva Property Management System - Complete Server Deployment
# Server: 150.230.123.106
# Username: ubuntu
# Password: TaahirNarker19

echo "🚀 Exceva Property Management System - Complete Server Deployment"
echo "================================================================"
echo "Server: 150.230.123.106"
echo "Username: ubuntu"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/osmannarker/ExcevaPropertyManagement.git"
PROJECT_NAME="ExcevaPropertyManagement"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"
SERVER_IP="150.230.123.106"
DOMAIN="propman.exceva.capital"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root. Please run as ubuntu user."
        exit 1
    fi
}

# Function to check internet connectivity
check_internet() {
    print_status "Checking internet connectivity..."
    
    if ping -c 1 google.com &> /dev/null; then
        print_success "Internet connection is working"
        return 0
    else
        print_error "No internet connection. Please check your network."
        return 1
    fi
}

# Function to update system packages
update_system() {
    print_status "Updating system packages..."
    
    sudo apt update && sudo apt upgrade -y
    
    if [ $? -eq 0 ]; then
        print_success "System packages updated successfully"
    else
        print_error "Failed to update system packages"
        exit 1
    fi
}

# Function to install required packages
install_dependencies() {
    print_status "Installing required dependencies..."
    
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
        snapd \
        libpq-dev \
        libssl-dev \
        libffi-dev
    
    # Install Node.js 18.x
    print_status "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PM2 globally
    print_status "Installing PM2..."
    sudo npm install -g pm2
    
    # Install certbot via snap
    print_status "Installing Certbot..."
    sudo snap install core
    sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    
    print_success "Dependencies installed successfully"
}

# Function to clone or update project
deploy_project() {
    print_status "Deploying project..."
    
    # Check if project already exists
    if [ -d "$PROJECT_PATH" ]; then
        print_warning "Project already exists at $PROJECT_PATH"
        print_status "Updating existing project..."
        
        cd "$PROJECT_PATH"
        git pull origin main
        
        if [ $? -eq 0 ]; then
            print_success "Project updated successfully"
        else
            print_error "Failed to update project"
            exit 1
        fi
    else
        # Clone the project
        print_status "Cloning project from GitHub..."
        
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
            
            print_success "Project cloned successfully"
        else
            print_error "Failed to clone project"
            exit 1
        fi
    fi
}

# Function to setup database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    # Start PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE property_management;" 2>/dev/null || print_warning "Database already exists"
    sudo -u postgres psql -c "CREATE USER property_user WITH PASSWORD 'ExcevaProperty2024!';" 2>/dev/null || print_warning "User already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE property_management TO property_user;" 2>/dev/null
    
    # Create backup directory
    sudo mkdir -p /backup
    sudo chown postgres:postgres /backup
    
    print_success "PostgreSQL database setup complete"
}

# Function to setup backend
setup_backend() {
    print_status "Setting up Django backend..."
    
    cd "$PROJECT_PATH/backend"
    
    # Create virtual environment
    python3 -m venv venv
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install Python dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Install additional production dependencies
    pip install gunicorn
    
    # Create .env file from template
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cp env_template.txt .env
        
        # Generate a secure secret key
        SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
        
        # Update .env with production values
        sed -i "s/SECRET_KEY=your-secret-key-here/SECRET_KEY=$SECRET_KEY/" .env
        sed -i "s/DEBUG=True/DEBUG=False/" .env
        sed -i "s/ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com/ALLOWED_HOSTS=localhost,127.0.0.1,$SERVER_IP,$DOMAIN/" .env
        sed -i "s/SECURE_SSL_REDIRECT=False/SECURE_SSL_REDIRECT=True/" .env
        
        # Update database configuration for local PostgreSQL
        sed -i "s/DB_NAME=postgres/DB_NAME=property_management/" .env
        sed -i "s/DB_USER=postgres.your-project-ref/DB_USER=property_user/" .env
        sed -i "s/DB_PASSWORD=your-database-password/DB_PASSWORD=ExcevaProperty2024!/" .env
        sed -i "s/DB_HOST=aws-0-region.pooler.supabase.com/DB_HOST=localhost/" .env
        sed -i "s/DB_PORT=5432/DB_PORT=5432/" .env
        
        print_success "Environment file configured for production"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Run migrations
    print_status "Running database migrations..."
    python manage.py migrate
    
    # Collect static files
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Create superuser if it doesn't exist
    print_status "Creating Django superuser..."
    echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@exceva.capital', 'ExcevaAdmin2024!') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell
    
    print_success "Django backend setup complete"
}

# Function to setup frontend
setup_frontend() {
    print_status "Setting up Next.js frontend..."
    
    cd "$PROJECT_PATH/frontend"
    
    # Install Node.js dependencies
    npm install
    
    # Build the frontend
    print_status "Building frontend for production..."
    npm run build
    
    print_success "Next.js frontend setup complete"
}

# Function to setup PM2 processes
setup_pm2() {
    print_status "Setting up PM2 processes..."
    
    cd "$PROJECT_PATH"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'exceva-backend',
      cwd: '$PROJECT_PATH/backend',
      script: 'venv/bin/gunicorn',
      args: '--bind 0.0.0.0:8000 property_control_system.wsgi:application --workers 2 --timeout 120 --max-requests 1000',
      env: {
        DJANGO_SETTINGS_MODULE: 'property_control_system.settings',
        PATH: '$PROJECT_PATH/backend/venv/bin:' + process.env.PATH
      },
      error_file: '$PROJECT_PATH/logs/backend_error.log',
      out_file: '$PROJECT_PATH/logs/backend_out.log',
      log_file: '$PROJECT_PATH/logs/backend.log',
      time: true,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'exceva-frontend',
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
      time: true,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
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
    
    print_success "PM2 processes setup complete"
}

# Function to setup nginx
setup_nginx() {
    print_status "Setting up Nginx..."
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/exceva-property-management > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $SERVER_IP;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
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
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Backend API and Admin
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Django static files
    location /static/ {
        alias $PROJECT_PATH/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Django media files
    location /media/ {
        alias $PROJECT_PATH/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Health check endpoint
    location /health/ {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/exceva-property-management /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        # Start nginx
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        print_success "Nginx setup complete"
    else
        print_error "Nginx configuration error"
        exit 1
    fi
}

# Function to setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    
    # Configure UFW
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    print_success "Firewall setup complete"
    print_warning "Make sure Oracle Cloud Security List allows:"
    echo "  - Port 22 (SSH)"
    echo "  - Port 80 (HTTP)"
    echo "  - Port 443 (HTTPS)"
}

# Function to setup SSL certificate
setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    # Stop nginx temporarily
    sudo systemctl stop nginx
    
    # Get SSL certificate
    sudo certbot certonly --standalone --non-interactive --agree-tos --email admin@exceva.capital --domains $DOMAIN
    
    if [ $? -eq 0 ]; then
        # Update nginx config for SSL
        sudo tee /etc/nginx/sites-available/exceva-property-management > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $SERVER_IP;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN $SERVER_IP;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
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
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Backend API and Admin
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Django static files
    location /static/ {
        alias $PROJECT_PATH/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Django media files
    location /media/ {
        alias $PROJECT_PATH/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Health check endpoint
    location /health/ {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
        
        # Test and restart nginx
        sudo nginx -t
        if [ $? -eq 0 ]; then
            sudo systemctl start nginx
            print_success "SSL certificate setup complete"
        else
            print_error "Nginx configuration error after SSL setup"
            exit 1
        fi
    else
        print_error "Failed to obtain SSL certificate"
        # Restart nginx without SSL for now
        sudo systemctl start nginx
    fi
}

# Function to create maintenance scripts
create_maintenance_scripts() {
    print_status "Creating maintenance scripts..."
    
    cd "$PROJECT_PATH"
    
    # Create backup script
    cat > backup-database.sh << 'EOF'
#!/bin/bash
# Database backup script
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/property_management_$DATE.sql"

echo "Creating database backup: $BACKUP_FILE"
pg_dump -h localhost -U property_user property_management > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF
    
    chmod +x backup-database.sh
    
    # Create restart script
    cat > restart-services.sh << 'EOF'
#!/bin/bash
# Service restart script
echo "Restarting all services..."

# Restart PM2 processes
pm2 restart all

# Restart nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "All services restarted successfully"
EOF
    
    chmod +x restart-services.sh
    
    # Create log viewer script
    cat > view-logs.sh << 'EOF'
#!/bin/bash
# Log viewer script
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Backend Logs ==="
pm2 logs exceva-backend --lines 20

echo ""
echo "=== Frontend Logs ==="
pm2 logs exceva-frontend --lines 20

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager
EOF
    
    chmod +x view-logs.sh
    
    print_success "Maintenance scripts created"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Wait for services to start
    sleep 15
    
    # Check PM2 processes
    echo ""
    print_status "PM2 Status:"
    pm2 status
    
    # Check nginx
    echo ""
    print_status "Nginx Status:"
    sudo systemctl status nginx --no-pager
    
    # Check database
    echo ""
    print_status "Database Status:"
    sudo systemctl status postgresql --no-pager
    
    # Test endpoints
    echo ""
    print_status "Testing endpoints..."
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        print_success "Frontend is responding"
    else
        print_error "Frontend is not responding"
    fi
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/admin/ | grep -q "200\|302"; then
        print_success "Backend is responding"
    else
        print_error "Backend is not responding"
    fi
    
    # Test external access
    if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP | grep -q "200"; then
        print_success "External access is working"
    else
        print_warning "External access may not be working yet"
    fi
}

# Function to display final information
display_final_info() {
    echo ""
    echo "🎉 ================================================="
    echo "🎉 EXCEVA PROPERTY MANAGEMENT SYSTEM DEPLOYED!"
    echo "🎉 ================================================="
    echo ""
    echo "🌍 Access Information:"
    echo "  🔗 Website: http://$DOMAIN"
    echo "  🔗 Website (IP): http://$SERVER_IP"
    echo "  🛠️  Admin Panel: http://$DOMAIN/admin/"
    echo "  🔌 API: http://$DOMAIN/api/"
    echo ""
    echo "🔐 Admin Credentials:"
    echo "  👤 Username: admin"
    echo "  🔑 Password: ExcevaAdmin2024!"
    echo ""
    echo "🗄️  Database Credentials:"
    echo "  📊 Database: property_management"
    echo "  👤 Username: property_user"
    echo "  🔑 Password: ExcevaProperty2024!"
    echo ""
    echo "📋 Useful Commands:"
    echo "  - Check status: pm2 status"
    echo "  - View logs: pm2 logs"
    echo "  - Restart services: ./restart-services.sh"
    echo "  - View logs: ./view-logs.sh"
    echo "  - Backup database: ./backup-database.sh"
    echo ""
    echo "🔧 Maintenance:"
    echo "  - SSL auto-renewal: sudo certbot renew --dry-run"
    echo "  - System updates: sudo apt update && sudo apt upgrade"
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
}

# Main execution
main() {
    echo ""
    print_status "Starting complete deployment for Exceva Property Management System..."
    echo ""
    
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
    
    # Step 10: Setup SSL certificate
    setup_ssl
    
    # Step 11: Create maintenance scripts
    create_maintenance_scripts
    
    # Step 12: Run health checks
    run_health_checks
    
    # Step 13: Display final information
    display_final_info
}

# Run main function
main "$@"
