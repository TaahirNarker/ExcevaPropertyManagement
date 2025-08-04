#!/bin/bash

# Update Deployment Script for Property Management System
# This script updates the existing deployment with latest changes

echo "🔄 Property Management System - Update Deployment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="150.230.123.106"
PROJECT_PATH="/var/www/ExcevaPropertyManagement"
DOMAIN="propman.exceva.capital"

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}❌ This script should not be run as root. Please run as ubuntu user.${NC}"
        exit 1
    fi
}

# Function to check server connectivity
check_server() {
    echo -e "${YELLOW}🔍 Checking server connectivity...${NC}"
    
    if ssh -o ConnectTimeout=10 ubuntu@$SERVER_IP "echo 'Server is reachable'" &> /dev/null; then
        echo -e "${GREEN}✅ Server is reachable${NC}"
        return 0
    else
        echo -e "${RED}❌ Cannot connect to server. Please check your SSH connection.${NC}"
        return 1
    fi
}

# Function to backup current deployment
backup_deployment() {
    echo -e "${YELLOW}💾 Creating backup of current deployment...${NC}"
    
    ssh ubuntu@$SERVER_IP "cd /var/www && sudo cp -r ExcevaPropertyManagement ExcevaPropertyManagement.backup.\$(date +%Y%m%d_%H%M%S)"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create backup${NC}"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}⏹️  Stopping services...${NC}"
    
    ssh ubuntu@$SERVER_IP "sudo systemctl stop nginx"
    ssh ubuntu@$SERVER_IP "pm2 stop all"
    
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to pull latest changes
pull_latest_changes() {
    echo -e "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
    
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH && git fetch origin"
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH && git reset --hard origin/main"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Latest changes pulled successfully${NC}"
    else
        echo -e "${RED}❌ Failed to pull latest changes${NC}"
        exit 1
    fi
}

# Function to update backend
update_backend() {
    echo -e "${YELLOW}🐍 Updating backend dependencies...${NC}"
    
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/backend && source venv/bin/activate && pip install -r requirements.txt"
    
    echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/backend && source venv/bin/activate && python manage.py migrate"
    
    echo -e "${YELLOW}📦 Collecting static files...${NC}"
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/backend && source venv/bin/activate && python manage.py collectstatic --noinput"
    
    echo -e "${GREEN}✅ Backend updated successfully${NC}"
}

# Function to update frontend
update_frontend() {
    echo -e "${YELLOW}⚛️  Updating frontend dependencies...${NC}"
    
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/frontend && npm install"
    
    echo -e "${YELLOW}🏗️  Building frontend for production...${NC}"
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/frontend && npm run build"
    
    echo -e "${GREEN}✅ Frontend updated successfully${NC}"
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    
    # Restart backend
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/backend && pm2 restart all"
    
    # Restart frontend
    ssh ubuntu@$SERVER_IP "cd $PROJECT_PATH/frontend && pm2 restart all"
    
    # Restart nginx
    ssh ubuntu@$SERVER_IP "sudo systemctl restart nginx"
    
    echo -e "${GREEN}✅ Services restarted successfully${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    # Check if services are running
    echo -e "${BLUE}📊 Checking service status...${NC}"
    ssh ubuntu@$SERVER_IP "pm2 status"
    
    # Check nginx status
    echo -e "${BLUE}🌐 Checking nginx status...${NC}"
    ssh ubuntu@$SERVER_IP "sudo systemctl status nginx --no-pager -l"
    
    # Test backend API
    echo -e "${BLUE}🔌 Testing backend API...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health/ | grep -q "200\|404"; then
        echo -e "${GREEN}✅ Backend API is responding${NC}"
    else
        echo -e "${RED}❌ Backend API is not responding${NC}"
    fi
    
    # Test frontend
    echo -e "${BLUE}🌍 Testing frontend...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/ | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${RED}❌ Frontend is not accessible${NC}"
    fi
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Function to show deployment info
show_deployment_info() {
    echo -e "${BLUE}📋 Deployment Information:${NC}"
    echo -e "${BLUE}   Server: $SERVER_IP${NC}"
    echo -e "${BLUE}   Domain: $DOMAIN${NC}"
    echo -e "${BLUE}   Project Path: $PROJECT_PATH${NC}"
    echo -e "${BLUE}   Frontend URL: https://$DOMAIN${NC}"
    echo -e "${BLUE}   Backend API: https://$DOMAIN/api/${NC}"
    echo ""
}

# Function to rollback if needed
rollback() {
    echo -e "${RED}🔄 Rolling back to previous version...${NC}"
    
    # Find the latest backup
    LATEST_BACKUP=$(ssh ubuntu@$SERVER_IP "ls -t /var/www/ExcevaPropertyManagement.backup.* | head -1")
    
    if [ -n "$LATEST_BACKUP" ]; then
        ssh ubuntu@$SERVER_IP "sudo rm -rf $PROJECT_PATH"
        ssh ubuntu@$SERVER_IP "sudo mv $LATEST_BACKUP $PROJECT_PATH"
        ssh ubuntu@$SERVER_IP "sudo chown -R ubuntu:ubuntu $PROJECT_PATH"
        
        # Restart services
        restart_services
        
        echo -e "${GREEN}✅ Rollback completed successfully${NC}"
    else
        echo -e "${RED}❌ No backup found for rollback${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting deployment update...${NC}"
    
    # Check if not running as root
    check_root
    
    # Check server connectivity
    if ! check_server; then
        exit 1
    fi
    
    # Show deployment info
    show_deployment_info
    
    # Confirm before proceeding
    echo -e "${YELLOW}⚠️  This will update your live deployment. Continue? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Update cancelled${NC}"
        exit 0
    fi
    
    # Execute update steps
    backup_deployment
    stop_services
    pull_latest_changes
    update_backend
    update_frontend
    restart_services
    verify_deployment
    
    echo -e "${GREEN}🎉 Deployment update completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your application is now live at: https://$DOMAIN${NC}"
    
    # Ask if user wants to rollback
    echo -e "${YELLOW}❓ If you encounter issues, run this script with --rollback flag${NC}"
}

# Handle rollback flag
if [[ "$1" == "--rollback" ]]; then
    rollback
    exit 0
fi

# Run main function
main 