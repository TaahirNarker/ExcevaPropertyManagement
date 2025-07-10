# Working SSL Configuration - Backup Reference

## Server Details
- **Server IP**: 150.230.123.106
- **Domain**: propman.exceva.capital
- **SSL Certificate**: Valid until 2025-10-08
- **Date Working**: $(date)

## Applications Running
- **Frontend**: Next.js on port 3000 (PM2: nextjs-frontend)
- **Backend**: Django on port 8000 (PM2: django-backend)
- **Web Server**: Nginx with SSL on port 443

## Key Configuration Files
- **Nginx Config**: /etc/nginx/sites-available/propman.exceva.capital
- **SSL Certificate**: /etc/letsencrypt/live/propman.exceva.capital/
- **Firewall**: UFW enabled with ports 22, 80, 443

## Working PM2 Commands
```bash
# Start applications
pm2 start "/home/ubuntu/ExcevaPropertyManagement/backend/venv/bin/python manage.py runserver 0.0.0.0:8000" --name "django-backend"
pm2 start "npm run start" --name "nextjs-frontend"

# Save PM2 configuration
pm2 save
```

## Test Commands
```bash
# Test HTTPS
curl -I https://propman.exceva.capital

# Test applications
curl -I http://localhost:3000  # Next.js
curl -I http://localhost:8000  # Django
```

## Rollback Commands
```bash
# Restore from this backup
git checkout ssl-working-backup

# Restart services
sudo systemctl restart nginx
pm2 restart all
```
