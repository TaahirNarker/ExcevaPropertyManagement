#!/bin/bash

# Quick Setup Script for Property Management System with SSL
# This script deploys the project and sets up SSL in one go

echo "🚀 Quick Setup for Property Management System with SSL"
echo "Domain: propman.exceva.capital"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/TaahirNarker/ExcevaPropertyManagement.git"
PROJECT_NAME="ExcevaPropertyManagement"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"
DOMAIN="propman.exceva.capital"

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

# Function to check internet connectivity
check_internet() {
    print_status "Checking internet connectivity..."
    
    if ping -c 1 google.com &> /dev/null; then
        echo -e "${GREEN}✅ Internet connection is working${NC}"
        return 0
    else
        echo -e "${RED}❌ No internet connection. Please check your network.${NC}"
        return 1
    fi
}

# Function to install required packages
install_dependencies() {
    print_status "Installing required dependencies..."
    
    # Update system
    sudo apt update
    
    # Install basic packages
    sudo apt install -y \
        git \
        curl \
        wget \
        unzip \
        nginx \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        postgresql \
        postgresql-contrib \
        snapd \
        ufw \
        net-tools
    
    # Install Node.js 18.x
    echo -e "${YELLOW}📦 Installing Node.js 18.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PM2
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
    
    # Install Certbot
    echo -e "${YELLOW}🔐 Installing Certbot...${NC}"
    sudo snap install core
    sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
}

# Function to configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    echo -e "${GREEN}✅ Firewall configured${NC}"
}

# Function to clone or update project
deploy_project() {
    print_status "Deploying project..."
    
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
    print_status "Setting up Django backend..."
    
    cd "$PROJECT_PATH/backend"
    
    # Create virtual environment
    python3 -m venv venv
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install Python dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}📝 Creating .env file...${NC}"
        if [ -f "env_template.txt" ]; then
            cp env_template.txt .env
        else
            # Create basic .env file
            cat > .env << EOF
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1,$DOMAIN
SECURE_SSL_REDIRECT=True
EOF
        fi
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
    print_status "Setting up Next.js frontend..."
    
    cd "$PROJECT_PATH/frontend"
    
    # Install Node.js dependencies
    npm install
    
    # Build the frontend
    npm run build
    
    echo -e "${GREEN}✅ Next.js frontend setup complete${NC}"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    
    # Start nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    # Start backend with PM2
    cd "$PROJECT_PATH/backend"
    source venv/bin/activate
    pm2 start "python manage.py runserver 127.0.0.1:8000" --name "propman-backend"
    
    # Start frontend with PM2
    cd "$PROJECT_PATH/frontend"
    pm2 start "npm run start" --name "propman-frontend"
    
    # Save PM2 configuration
    pm2 save
    pm2 startup
    
    echo -e "${GREEN}✅ Services started successfully${NC}"
}

# Function to setup SSL
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    cd "$PROJECT_PATH"
    
    # Download SSL setup scripts if they don't exist
    if [ ! -f "deploy-ssl-propman.sh" ]; then
        echo -e "${YELLOW}📥 Downloading SSL setup scripts...${NC}"
        curl -o deploy-ssl-propman.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/deploy-ssl-propman.sh
        curl -o verify-ssl.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/verify-ssl.sh
        chmod +x deploy-ssl-propman.sh verify-ssl.sh
    fi
    
    # Run SSL setup
    echo -e "${YELLOW}🔐 Running SSL setup...${NC}"
    ./deploy-ssl-propman.sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL setup completed successfully${NC}"
    else
        echo -e "${RED}❌ SSL setup failed${NC}"
        exit 1
    fi
}

# Function to verify setup
verify_setup() {
    print_status "Verifying complete setup..."
    
    cd "$PROJECT_PATH"
    
    # Run SSL verification
    if [ -f "verify-ssl.sh" ]; then
        ./verify-ssl.sh
    fi
    
    echo -e "${GREEN}✅ Setup verification completed${NC}"
}

# Function to display final summary
display_summary() {
    echo ""
    echo -e "${GREEN}🎉 Quick Setup Complete!${NC}"
    echo -e "${GREEN}=========================${NC}"
    echo ""
    echo -e "${YELLOW}🌍 Your Property Management System is now running at:${NC}"
    echo -e "  🔒 https://propman.exceva.capital"
    echo -e "  🔐 https://propman.exceva.capital/auth/login"
    echo -e "  📝 https://propman.exceva.capital/auth/register"
    echo -e "  🏢 https://propman.exceva.capital/dashboard"
    echo -e "  🛠️ https://propman.exceva.capital/admin/"
    echo ""
    echo -e "${GREEN}🔒 Security Features:${NC}"
    echo -e "  ✅ SSL/TLS encryption"
    echo -e "  ✅ HTTP to HTTPS auto-redirect"
    echo -e "  ✅ Security headers"
    echo -e "  ✅ Automatic certificate renewal"
    echo ""
    echo -e "${YELLOW}🔧 Service Management:${NC}"
    echo -e "  Check services: pm2 status"
    echo -e "  Restart services: pm2 restart all"
    echo -e "  View logs: pm2 logs"
    echo -e "  Nginx status: sudo systemctl status nginx"
    echo ""
    echo -e "${BLUE}📊 SSL Testing:${NC}"
    echo -e "  Run verification: ./verify-ssl.sh"
    echo -e "  SSL Labs: https://www.ssllabs.com/ssltest/?d=propman.exceva.capital"
    echo ""
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
}

# Main execution
main() {
    print_status "Starting Quick Setup for Property Management System with SSL"
    
    # Check prerequisites
    check_root
    check_internet
    
    # Step 1: Install dependencies
    install_dependencies
    
    # Step 2: Configure firewall
    configure_firewall
    
    # Step 3: Deploy project
    deploy_project
    
    # Step 4: Setup backend
    setup_backend
    
    # Step 5: Setup frontend
    setup_frontend
    
    # Step 6: Start services
    start_services
    
    # Step 7: Setup SSL
    setup_ssl
    
    # Step 8: Verify setup
    verify_setup
    
    # Step 9: Display summary
    display_summary
}

# Show usage if help requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "This script performs a complete setup of the Property Management System"
    echo "including project deployment, service configuration, and SSL setup."
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Prerequisites:"
    echo "  - Ubuntu server with internet access"
    echo "  - DNS for propman.exceva.capital pointing to this server"
    echo "  - Ports 22, 80, 443 open in firewall"
    echo ""
    echo "What this script does:"
    echo "  1. Installs required software (nginx, node.js, python, etc.)"
    echo "  2. Configures firewall"
    echo "  3. Clones the project from GitHub"
    echo "  4. Sets up Django backend"
    echo "  5. Sets up Next.js frontend"
    echo "  6. Starts services with PM2"
    echo "  7. Obtains SSL certificates"
    echo "  8. Configures nginx with SSL and auto-redirect"
    echo "  9. Verifies the complete setup"
    echo ""
    exit 0
fi

# Run main function
main "$@" 