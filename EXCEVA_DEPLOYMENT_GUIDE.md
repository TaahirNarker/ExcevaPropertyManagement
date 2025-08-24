# 🚀 Exceva Property Management System - Complete Deployment Guide

## 📋 Overview
This guide will help you deploy the Exceva Property Management System to your Oracle Cloud server at `150.230.123.106`.

## 🎯 What We're Deploying
- **Backend**: Django 4.2.7 with REST API
- **Frontend**: Next.js 15.2.4 with React 19
- **Database**: PostgreSQL with local storage
- **Web Server**: Nginx with SSL support
- **Process Manager**: PM2 for application management
- **SSL**: Let's Encrypt certificate for `propman.exceva.capital`

## 🖥️ Server Information
- **IP Address**: 150.230.123.106
- **Username**: ubuntu
- **Password**: TaahirNarker19
- **Domain**: propman.exceva.capital

## 📋 Prerequisites
1. **Oracle Cloud Security List** - Ensure these ports are open:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)

2. **Domain DNS** - Point `propman.exceva.capital` to `150.230.123.106`

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your Server
```bash
ssh ubuntu@150.230.123.106
```
When prompted, enter password: `TaahirNarker19`

### Step 2: Download and Run the Deployment Script
```bash
# Download the deployment script
wget https://raw.githubusercontent.com/osmannarker/ExcevaPropertyManagement/main/deploy-exceva-server.sh

# Make it executable
chmod +x deploy-exceva-server.sh

# Run the deployment
./deploy-exceva-server.sh
```

### Step 3: Monitor the Deployment
The script will automatically:
- ✅ Update system packages
- ✅ Install all dependencies (Python, Node.js, PostgreSQL, Nginx)
- ✅ Clone the project from GitHub
- ✅ Setup PostgreSQL database
- ✅ Configure Django backend
- ✅ Build Next.js frontend
- ✅ Setup PM2 process management
- ✅ Configure Nginx web server
- ✅ Setup firewall (UFW)
- ✅ Obtain SSL certificate
- ✅ Create maintenance scripts
- ✅ Run health checks

**Expected Duration**: 15-25 minutes

## 🔐 Default Credentials

### Admin Panel Access
- **URL**: https://propman.exceva.capital/admin/
- **Username**: `admin`
- **Password**: `ExcevaAdmin2024!`

### Database Access
- **Database**: `property_management`
- **Username**: `property_user`
- **Password**: `ExcevaProperty2024!`
- **Host**: `localhost`
- **Port**: `5432`

## 🌐 Access URLs

### Production URLs
- **Main Website**: https://propman.exceva.capital
- **Admin Panel**: https://propman.exceva.capital/admin/
- **API Endpoints**: https://propman.exceva.capital/api/

### Development URLs (if needed)
- **Frontend**: http://150.230.123.106:3000
- **Backend**: http://150.230.123.106:8000

## 🛠️ Maintenance Commands

### Check System Status
```bash
# Check PM2 processes
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql
```

### View Logs
```bash
# View all logs
pm2 logs

# View specific service logs
pm2 logs exceva-backend
pm2 logs exceva-frontend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart all services
./restart-services.sh

# Or restart individually
pm2 restart exceva-backend
pm2 restart exceva-frontend
sudo systemctl restart nginx
```

### Database Backup
```bash
# Create manual backup
./backup-database.sh

# Check backup directory
ls -la /backup/
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

#### 2. Service Not Starting
```bash
# Check PM2 logs
pm2 logs

# Check system logs
sudo journalctl -u nginx
sudo journalctl -u postgresql

# Restart PM2
pm2 kill
pm2 start ecosystem.config.js
```

#### 3. Database Connection Issues
```bash
# Test database connection
sudo -u postgres psql -d property_management -c "SELECT version();"

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 4. Port Conflicts
```bash
# Check what's using ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :8000
```

### Performance Monitoring
```bash
# Monitor system resources
htop

# Monitor PM2 processes
pm2 monit

# Check disk usage
df -h

# Check memory usage
free -h
```

## 🔒 Security Features

### Implemented Security Measures
- ✅ UFW firewall with restricted access
- ✅ SSL/TLS encryption with Let's Encrypt
- ✅ Security headers (X-Frame-Options, XSS Protection, etc.)
- ✅ Django security settings (DEBUG=False, HTTPS redirect)
- ✅ Database user with limited privileges
- ✅ Regular security updates

### Security Maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Check SSL certificate expiry
sudo certbot certificates

# Review firewall rules
sudo ufw status verbose
```

## 📊 System Requirements

### Minimum Requirements
- **CPU**: 2 cores (ARM or x86)
- **RAM**: 4GB
- **Storage**: 20GB
- **OS**: Ubuntu 22.04 LTS

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB
- **OS**: Ubuntu 22.04 LTS

## 🚨 Emergency Procedures

### Complete System Restart
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx
sudo systemctl stop postgresql

# Start all services
sudo systemctl start postgresql
sudo systemctl start nginx
pm2 start all
```

### Rollback to Previous Version
```bash
# Navigate to project directory
cd /var/www/ExcevaPropertyManagement

# Check git history
git log --oneline -10

# Reset to previous commit
git reset --hard HEAD~1

# Restart services
./restart-services.sh
```

### Database Recovery
```bash
# List available backups
ls -la /backup/

# Restore from backup (replace DATE with actual backup date)
sudo -u postgres psql property_management < /backup/property_management_DATE.sql
```

## 📞 Support Information

### Log Locations
- **Application Logs**: `/var/www/ExcevaPropertyManagement/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **PostgreSQL Logs**: `/var/log/postgresql/`
- **System Logs**: `/var/log/syslog`

### Useful Commands Reference
```bash
# Quick status check
./view-logs.sh

# Service management
sudo systemctl [start|stop|restart|status] [nginx|postgresql]

# PM2 management
pm2 [start|stop|restart|reload|delete] [app-name]
pm2 [logs|monit|status]

# Database operations
sudo -u postgres psql -d property_management
pg_dump -h localhost -U property_user property_management > backup.sql
```

## 🎉 Deployment Complete!

Once the deployment script finishes successfully, your Exceva Property Management System will be:

- ✅ **Fully operational** at https://propman.exceva.capital
- ✅ **Secured** with SSL certificate
- ✅ **Monitored** with PM2 process management
- ✅ **Backed up** with automated database backups
- ✅ **Maintained** with easy-to-use scripts

### Next Steps
1. **Test the system** by visiting the website
2. **Login to admin panel** and create additional users
3. **Configure your domain** DNS settings if not already done
4. **Set up monitoring** for production use
5. **Schedule regular backups** (already configured)

---

**Need Help?** Check the logs using `./view-logs.sh` or contact the development team with specific error messages.
