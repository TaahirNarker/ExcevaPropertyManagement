# 🚀 Exceva Property Management - Deployment Checklist

## ✅ Pre-Deployment Checklist

### Oracle Cloud Configuration
- [ ] Port 22 (SSH) is open in Security List
- [ ] Port 80 (HTTP) is open in Security List  
- [ ] Port 443 (HTTPS) is open in Security List
- [ ] Server has internet access

### Domain Configuration
- [ ] `propman.exceva.capital` points to `150.230.123.106`
- [ ] DNS propagation is complete (can take up to 24 hours)

## 🚀 Deployment Steps

### Step 1: Server Access
- [ ] SSH to server: `ssh ubuntu@150.230.123.106`
- [ ] Enter password: `TaahirNarker19`
- [ ] Verify you're logged in as `ubuntu` user

### Step 2: Download & Execute
- [ ] Download script: `wget https://raw.githubusercontent.com/osmannarker/ExcevaPropertyManagement/main/deploy-exceva-server.sh`
- [ ] Make executable: `chmod +x deploy-exceva-server.sh`
- [ ] Run deployment: `./deploy-exceva-server.sh`

### Step 3: Monitor Progress
- [ ] System packages updated
- [ ] Dependencies installed (Python, Node.js, PostgreSQL, Nginx)
- [ ] Project cloned from GitHub
- [ ] Database setup complete
- [ ] Backend configured
- [ ] Frontend built
- [ ] PM2 processes started
- [ ] Nginx configured
- [ ] Firewall configured
- [ ] SSL certificate obtained
- [ ] Maintenance scripts created
- [ ] Health checks passed

## 🔐 Post-Deployment Verification

### Access Tests
- [ ] Main website: https://propman.exceva.capital
- [ ] Admin panel: https://propman.exceva.capital/admin/
- [ ] Admin login: `admin` / `ExcevaAdmin2024!`
- [ ] API endpoints: https://propman.exceva.capital/api/

### Service Status
- [ ] PM2 processes running: `pm2 status`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] SSL certificate valid: `sudo certbot certificates`

### Maintenance Scripts
- [ ] `./view-logs.sh` - View system logs
- [ ] `./restart-services.sh` - Restart all services
- [ ] `./backup-database.sh` - Create database backup

## 🚨 Troubleshooting Quick Reference

### Common Issues
- **SSL Error**: Check domain DNS and run `sudo certbot renew`
- **Service Down**: Use `pm2 restart all` and `sudo systemctl restart nginx`
- **Database Error**: Check logs with `./view-logs.sh`
- **Port Conflict**: Verify Oracle Cloud Security List settings

### Emergency Commands
```bash
# Quick restart
./restart-services.sh

# View all logs
./view-logs.sh

# Check system status
pm2 status && sudo systemctl status nginx
```

## 📞 Support Information

### Log Locations
- **App Logs**: `/var/www/ExcevaPropertyManagement/logs/`
- **Nginx**: `/var/log/nginx/`
- **System**: `/var/log/syslog`

### Default Credentials
- **Admin**: `admin` / `ExcevaAdmin2024!`
- **Database**: `property_user` / `ExcevaProperty2024!`

---

**Deployment Time**: 15-25 minutes  
**Status**: Ready for deployment
