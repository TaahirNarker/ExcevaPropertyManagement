#!/bin/bash

# Deployment script for Property Management System with Authentication
# This script deploys the authentication system to production

echo "🚀 Starting deployment of Property Management System with Authentication..."

# Configuration
SERVER_IP="150.230.123.106"  # Your Oracle Cloud server IP
SERVER_USER="ubuntu"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"
DOMAIN="propman.exceva.capital"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo -e "  Server: ${SERVER_IP}"
echo -e "  Domain: ${DOMAIN}"
echo -e "  Project Path: ${PROJECT_PATH}"
echo ""

# Function to run commands on server
run_on_server() {
    ssh ${SERVER_USER}@${SERVER_IP} "$1"
}

# Function to copy files to server
copy_to_server() {
    scp -r "$1" ${SERVER_USER}@${SERVER_IP}:"$2"
}

echo -e "${YELLOW}🔄 Step 1: Updating code on server...${NC}"
run_on_server "cd ${PROJECT_PATH} && git pull origin main"

echo -e "${YELLOW}🔄 Step 2: Updating backend dependencies...${NC}"
run_on_server "cd ${PROJECT_PATH}/backend && source venv/bin/activate && pip install -r requirements.txt"

echo -e "${YELLOW}🔄 Step 3: Running database migrations...${NC}"
run_on_server "cd ${PROJECT_PATH}/backend && source venv/bin/activate && python manage.py migrate"

echo -e "${YELLOW}🔄 Step 4: Collecting static files...${NC}"
run_on_server "cd ${PROJECT_PATH}/backend && source venv/bin/activate && python manage.py collectstatic --noinput"

echo -e "${YELLOW}🔄 Step 5: Updating frontend dependencies...${NC}"
run_on_server "cd ${PROJECT_PATH}/frontend && npm install"

echo -e "${YELLOW}🔄 Step 6: Building frontend...${NC}"
run_on_server "cd ${PROJECT_PATH}/frontend && npm run build"

echo -e "${YELLOW}🔄 Step 7: Restarting services...${NC}"
run_on_server "pm2 restart all"

echo -e "${YELLOW}🔄 Step 8: Checking service status...${NC}"
run_on_server "pm2 status"

echo -e "${YELLOW}🔄 Step 9: Testing endpoints...${NC}"
echo "Testing backend health..."
run_on_server "curl -f http://localhost:8000/admin/ > /dev/null 2>&1 && echo 'Backend: ✅ OK' || echo 'Backend: ❌ ERROR'"

echo "Testing frontend health..."
run_on_server "curl -f http://localhost:3000/ > /dev/null 2>&1 && echo 'Frontend: ✅ OK' || echo 'Frontend: ❌ ERROR'"

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo -e "${YELLOW}🌍 Your authentication system is now live at:${NC}"
echo -e "  🔗 Main site: https://${DOMAIN}"
echo -e "  🔐 Login: https://${DOMAIN}/auth/login"
echo -e "  📝 Register: https://${DOMAIN}/auth/register"
echo -e "  🏠 Dashboard: https://${DOMAIN}/dashboard"
echo -e "  🛠️ Admin: https://${DOMAIN}/admin/"
echo ""
echo -e "${YELLOW}💡 Test your authentication:${NC}"
echo "1. Visit https://${DOMAIN} - should redirect to login"
echo "2. Register a new account or login"
echo "3. After login, should redirect to dashboard"
echo "4. Try logging out and logging back in"
echo ""
echo -e "${GREEN}✅ Authentication system deployed successfully!${NC}" 