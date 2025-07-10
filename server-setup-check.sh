#!/bin/bash

# Server Setup Check Script for Property Management System
# This script checks the current server setup and locates project files

echo "🔍 Server Setup Check for Property Management System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Checking current server setup...${NC}"

# Check if we're on the right server
echo -e "${YELLOW}🖥️  Server Information:${NC}"
echo "Hostname: $(hostname)"
echo "User: $(whoami)"
echo "Current directory: $(pwd)"
echo "Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
echo ""

# Check if project exists in various common locations
echo -e "${YELLOW}📁 Searching for ExcevaPropertyManagement project...${NC}"

COMMON_LOCATIONS=(
    "/var/www/ExcevaPropertyManagement"
    "/home/ubuntu/ExcevaPropertyManagement"
    "/opt/ExcevaPropertyManagement"
    "/srv/ExcevaPropertyManagement"
    "~/ExcevaPropertyManagement"
    "./ExcevaPropertyManagement"
)

PROJECT_FOUND=false
PROJECT_LOCATION=""

for location in "${COMMON_LOCATIONS[@]}"; do
    if [ -d "$location" ]; then
        echo -e "${GREEN}✅ Found project at: $location${NC}"
        PROJECT_FOUND=true
        PROJECT_LOCATION="$location"
        break
    else
        echo -e "${RED}❌ Not found at: $location${NC}"
    fi
done

if [ "$PROJECT_FOUND" = false ]; then
    echo -e "${YELLOW}🔍 Searching entire system for ExcevaPropertyManagement...${NC}"
    SEARCH_RESULT=$(find / -name "ExcevaPropertyManagement" -type d 2>/dev/null | head -5)
    
    if [ -n "$SEARCH_RESULT" ]; then
        echo -e "${GREEN}📍 Found project directories:${NC}"
        echo "$SEARCH_RESULT"
        PROJECT_LOCATION=$(echo "$SEARCH_RESULT" | head -1)
        PROJECT_FOUND=true
    else
        echo -e "${RED}❌ Project not found on this server${NC}"
    fi
fi

echo ""

# Check if project is cloned from GitHub
if [ "$PROJECT_FOUND" = true ]; then
    echo -e "${YELLOW}📦 Checking project details at: $PROJECT_LOCATION${NC}"
    
    cd "$PROJECT_LOCATION" 2>/dev/null || {
        echo -e "${RED}❌ Cannot access project directory${NC}"
        exit 1
    }
    
    # Check if it's a git repository
    if [ -d ".git" ]; then
        echo -e "${GREEN}✅ Git repository detected${NC}"
        echo "Remote origin: $(git remote get-url origin 2>/dev/null || echo 'No remote origin')"
        echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'Unable to detect')"
        echo "Last commit: $(git log -1 --oneline 2>/dev/null || echo 'No commits')"
    else
        echo -e "${YELLOW}⚠️  Not a git repository${NC}"
    fi
    
    # Check project structure
    echo -e "${YELLOW}📂 Project structure:${NC}"
    ls -la
    
    # Check if backend exists
    if [ -d "backend" ]; then
        echo -e "${GREEN}✅ Backend directory found${NC}"
        echo "Backend contents:"
        ls -la backend/ | head -10
    else
        echo -e "${RED}❌ Backend directory not found${NC}"
    fi
    
    # Check if frontend exists
    if [ -d "frontend" ]; then
        echo -e "${GREEN}✅ Frontend directory found${NC}"
        echo "Frontend contents:"
        ls -la frontend/ | head -10
    else
        echo -e "${RED}❌ Frontend directory not found${NC}"
    fi
    
else
    echo -e "${RED}❌ Project not found. Need to clone/deploy the project first.${NC}"
fi

echo ""

# Check installed services
echo -e "${YELLOW}🔧 Checking installed services...${NC}"

# Check Python
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"
else
    echo -e "${RED}❌ Python3 not installed${NC}"
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not installed${NC}"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
else
    echo -e "${RED}❌ npm not installed${NC}"
fi

# Check nginx
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx: $(nginx -v 2>&1)${NC}"
    echo "Nginx status: $(systemctl is-active nginx 2>/dev/null || echo 'inactive')"
else
    echo -e "${RED}❌ Nginx not installed${NC}"
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2: $(pm2 --version)${NC}"
    echo "PM2 processes:"
    pm2 list 2>/dev/null || echo "No PM2 processes running"
else
    echo -e "${RED}❌ PM2 not installed${NC}"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL: $(psql --version)${NC}"
    echo "PostgreSQL status: $(systemctl is-active postgresql 2>/dev/null || echo 'inactive')"
else
    echo -e "${RED}❌ PostgreSQL not installed${NC}"
fi

echo ""

# Check SSL certificates
echo -e "${YELLOW}🔐 Checking SSL certificates...${NC}"

if [ -d "/etc/letsencrypt/live" ]; then
    echo -e "${GREEN}✅ Let's Encrypt directory exists${NC}"
    
    if [ -d "/etc/letsencrypt/live/propman.exceva.capital" ]; then
        echo -e "${GREEN}✅ SSL certificate for propman.exceva.capital found${NC}"
        
        # Check certificate expiry
        if [ -f "/etc/letsencrypt/live/propman.exceva.capital/fullchain.pem" ]; then
            CERT_EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/propman.exceva.capital/fullchain.pem" 2>/dev/null | cut -d= -f2)
            echo "Certificate expires: $CERT_EXPIRY"
        fi
    else
        echo -e "${RED}❌ SSL certificate for propman.exceva.capital not found${NC}"
    fi
else
    echo -e "${RED}❌ Let's Encrypt not installed${NC}"
fi

echo ""

# Check firewall
echo -e "${YELLOW}🔥 Checking firewall...${NC}"

if command -v ufw &> /dev/null; then
    echo -e "${GREEN}✅ UFW installed${NC}"
    echo "UFW status: $(ufw status 2>/dev/null || echo 'inactive')"
else
    echo -e "${RED}❌ UFW not installed${NC}"
fi

# Check open ports
echo -e "${YELLOW}🌐 Checking open ports...${NC}"
if command -v netstat &> /dev/null; then
    echo "Listening ports:"
    netstat -tlnp 2>/dev/null | grep -E ':80|:443|:3000|:8000' || echo "No relevant ports found"
else
    echo "netstat not available"
fi

echo ""

# Provide recommendations
echo -e "${YELLOW}💡 Recommendations:${NC}"

if [ "$PROJECT_FOUND" = false ]; then
    echo -e "${RED}1. Clone the project from GitHub:${NC}"
    echo "   git clone https://github.com/your-username/ExcevaPropertyManagement.git"
    echo "   sudo mv ExcevaPropertyManagement /var/www/"
    echo "   sudo chown -R ubuntu:ubuntu /var/www/ExcevaPropertyManagement"
elif [ "$PROJECT_LOCATION" != "/var/www/ExcevaPropertyManagement" ]; then
    echo -e "${YELLOW}1. Move project to standard location:${NC}"
    echo "   sudo mv $PROJECT_LOCATION /var/www/ExcevaPropertyManagement"
    echo "   sudo chown -R ubuntu:ubuntu /var/www/ExcevaPropertyManagement"
fi

echo -e "${YELLOW}2. Update SSL setup script with correct project path${NC}"
echo -e "${YELLOW}3. Install missing dependencies if needed${NC}"
echo -e "${YELLOW}4. Run SSL certificate setup${NC}"

echo ""
echo -e "${GREEN}✅ Server setup check complete!${NC}"

if [ "$PROJECT_FOUND" = true ]; then
    echo -e "${GREEN}Project found at: $PROJECT_LOCATION${NC}"
    echo -e "${YELLOW}You can now update the SSL setup script with the correct path.${NC}"
else
    echo -e "${RED}Project not found. Please deploy the project first.${NC}"
fi 