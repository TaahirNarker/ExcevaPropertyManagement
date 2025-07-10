#!/bin/bash

# Server Discovery Script for Property Management System
# This script helps locate the project and prepare for SSL deployment

echo "🔍 Server Discovery for Property Management System"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_status "Checking server configuration..."

# Check current user and location
echo -e "${YELLOW}👤 Current user: $(whoami)${NC}"
echo -e "${YELLOW}📍 Current directory: $(pwd)${NC}"
echo -e "${YELLOW}🏠 Home directory: $HOME${NC}"

# Check server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s api.ipify.org 2>/dev/null || echo "Unable to detect")
echo -e "${YELLOW}🌐 Server IP: $SERVER_IP${NC}"

echo ""
print_status "Searching for ExcevaPropertyManagement project..."

# Common locations where the project might be
SEARCH_LOCATIONS=(
    "/var/www/ExcevaPropertyManagement"
    "/home/ubuntu/ExcevaPropertyManagement"
    "/opt/ExcevaPropertyManagement"
    "/srv/ExcevaPropertyManagement"
    "$HOME/ExcevaPropertyManagement"
    "./ExcevaPropertyManagement"
)

PROJECT_FOUND=false
PROJECT_LOCATION=""

for location in "${SEARCH_LOCATIONS[@]}"; do
    if [ -d "$location" ]; then
        echo -e "${GREEN}✅ Found project at: $location${NC}"
        PROJECT_FOUND=true
        PROJECT_LOCATION="$location"
        
        # Check if it's a complete project
        if [ -d "$location/backend" ] && [ -d "$location/frontend" ]; then
            echo -e "${GREEN}  ✅ Complete project structure found${NC}"
            break
        else
            echo -e "${YELLOW}  ⚠️  Incomplete project structure${NC}"
        fi
    fi
done

if [ "$PROJECT_FOUND" = false ]; then
    echo -e "${YELLOW}🔍 Searching entire accessible filesystem...${NC}"
    
    # Search in accessible locations
    SEARCH_RESULTS=$(find /home /opt /srv /var/www 2>/dev/null | grep -i "ExcevaPropertyManagement" | head -10)
    
    if [ -n "$SEARCH_RESULTS" ]; then
        echo -e "${GREEN}📍 Found these potential locations:${NC}"
        echo "$SEARCH_RESULTS"
        
        # Check the first result
        FIRST_RESULT=$(echo "$SEARCH_RESULTS" | head -1)
        if [ -d "$FIRST_RESULT" ]; then
            PROJECT_LOCATION="$FIRST_RESULT"
            PROJECT_FOUND=true
        fi
    else
        echo -e "${RED}❌ Project not found on this server${NC}"
    fi
fi

echo ""
print_status "Checking installed software..."

# Check required software
SOFTWARE_STATUS=""

check_software() {
    local software="$1"
    local package_name="$2"
    
    if command -v "$software" &> /dev/null; then
        local version=$($software --version 2>/dev/null | head -1 || echo "installed")
        echo -e "${GREEN}✅ $software: $version${NC}"
        return 0
    else
        echo -e "${RED}❌ $software: not installed${NC}"
        [ -n "$package_name" ] && echo -e "${YELLOW}   Install with: sudo apt install $package_name${NC}"
        return 1
    fi
}

# Check essential software
check_software "git" "git"
check_software "nginx" "nginx"
check_software "python3" "python3"
check_software "node" "nodejs"
check_software "npm" "npm"
check_software "pm2" && echo -e "${BLUE}   Install PM2: sudo npm install -g pm2${NC}"

echo ""
print_status "Checking services..."

# Check service status
check_service() {
    local service="$1"
    local status=$(systemctl is-active "$service" 2>/dev/null || echo "inactive")
    
    if [ "$status" = "active" ]; then
        echo -e "${GREEN}✅ $service: running${NC}"
    elif [ "$status" = "inactive" ]; then
        echo -e "${YELLOW}⚠️  $service: stopped${NC}"
    else
        echo -e "${RED}❌ $service: not installed${NC}"
    fi
}

check_service "nginx"
check_service "postgresql"

echo ""
print_status "Checking firewall and network..."

# Check firewall
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status 2>/dev/null | head -1)
    echo -e "${BLUE}🔥 UFW Status: $UFW_STATUS${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not installed${NC}"
fi

# Check open ports
if command -v netstat &> /dev/null; then
    echo -e "${BLUE}🌐 Open ports:${NC}"
    netstat -tlnp 2>/dev/null | grep -E ":(22|80|443|3000|8000)" | while read line; do
        echo -e "${BLUE}  $line${NC}"
    done
else
    echo -e "${YELLOW}⚠️  netstat not available${NC}"
fi

echo ""
print_status "Checking for existing SSL certificates..."

if [ -d "/etc/letsencrypt/live" ]; then
    echo -e "${GREEN}✅ Let's Encrypt directory exists${NC}"
    
    # Check for domain certificates
    if [ -d "/etc/letsencrypt/live/propman.exceva.capital" ]; then
        echo -e "${GREEN}✅ SSL certificate for propman.exceva.capital found${NC}"
        
        # Check expiry
        if [ -f "/etc/letsencrypt/live/propman.exceva.capital/fullchain.pem" ]; then
            CERT_EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/propman.exceva.capital/fullchain.pem" 2>/dev/null | cut -d= -f2)
            echo -e "${BLUE}📅 Certificate expires: $CERT_EXPIRY${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No SSL certificate for propman.exceva.capital${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No Let's Encrypt certificates found${NC}"
fi

echo ""
print_status "Recommendations based on current state..."

if [ "$PROJECT_FOUND" = true ]; then
    echo -e "${GREEN}📁 Project Location: $PROJECT_LOCATION${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Next Steps:${NC}"
    echo "1. Navigate to project directory:"
    echo "   cd $PROJECT_LOCATION"
    echo ""
    echo "2. Download SSL setup scripts:"
    echo "   curl -o deploy-ssl-propman.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/deploy-ssl-propman.sh"
    echo "   curl -o verify-ssl.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/verify-ssl.sh"
    echo "   chmod +x deploy-ssl-propman.sh verify-ssl.sh"
    echo ""
    echo "3. Run SSL setup:"
    echo "   ./deploy-ssl-propman.sh"
    
else
    echo -e "${RED}❌ Project not found. Need to deploy first.${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Deploy the project first:${NC}"
    echo "1. Clone the repository:"
    echo "   sudo mkdir -p /var/www"
    echo "   cd /var/www"
    echo "   sudo git clone https://github.com/TaahirNarker/ExcevaPropertyManagement.git"
    echo "   sudo chown -R ubuntu:ubuntu /var/www/ExcevaPropertyManagement"
    echo ""
    echo "2. Or if you prefer deploying to your home directory:"
    echo "   cd ~"
    echo "   git clone https://github.com/osmannarker/ExcevaPropertyManagement.git"
    echo ""
    echo "3. Then run the deployment script:"
    echo "   cd ExcevaPropertyManagement"
    echo "   ./deploy-to-server.sh"
fi

echo ""
print_status "Quick fixes for common issues..."

# Missing software installation
echo -e "${YELLOW}📦 Install missing software:${NC}"
echo "sudo apt update && sudo apt install -y git nginx python3 python3-pip nodejs npm"
echo "sudo npm install -g pm2"
echo ""

# Firewall setup
echo -e "${YELLOW}🔥 Configure firewall:${NC}"
echo "sudo ufw allow ssh"
echo "sudo ufw allow 'Nginx Full'"
echo "sudo ufw --force enable"
echo ""

# Service startup
echo -e "${YELLOW}🔧 Start services:${NC}"
echo "sudo systemctl enable nginx"
echo "sudo systemctl start nginx"
echo ""

echo -e "${GREEN}🎉 Server discovery completed!${NC}"
echo -e "${BLUE}💡 Use the recommendations above to proceed with your setup.${NC}" 