# 🚀 Exceva Property Management - Deployment Summary

## 📋 Quick Start

### 1. Connect to Server
```bash
ssh ubuntu@150.230.123.106
# Password: TaahirNarker19
```

### 2. Deploy with One Command
```bash
wget -O deploy-exceva-server.sh https://raw.githubusercontent.com/osmannarker/ExcevaPropertyManagement/main/deploy-exceva-server.sh && chmod +x deploy-exceva-server.sh && ./deploy-exceva-server.sh
```

## 🎯 What Gets Deployed

- **Backend**: Django 4.2.7 + REST API
- **Frontend**: Next.js 15.2.4 + React 19  
- **Database**: PostgreSQL (local)
- **Web Server**: Nginx + SSL
- **Process Manager**: PM2
- **Domain**: propman.exceva.capital

## 🔐 Access Information

### Production URLs
- **Website**: https://propman.exceva.capital
- **Admin**: https://propman.exceva.capital/admin/
- **API**: https://propman.exceva.capital/api/

### Credentials
- **Admin Panel**: `admin` / `ExcevaAdmin2024!`
- **Database**: `property_user` / `ExcevaProperty2024!`

## ⚡ Maintenance Commands

```bash
# Check status
pm2 status
./view-logs.sh

# Restart services  
./restart-services.sh

# Backup database
./backup-database.sh
```

## 🚨 Prerequisites

- Oracle Cloud ports open: 22, 80, 443
- Domain `propman.exceva.capital` → `150.230.123.106`

## ⏱️ Deployment Time: 15-25 minutes

---

**Need Help?** Check `EXCEVA_DEPLOYMENT_GUIDE.md` for detailed instructions.
