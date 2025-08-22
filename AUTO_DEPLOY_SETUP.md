# 🚀 Auto-Deploy Setup Guide

## Overview
This guide will help you set up automatic deployment from GitHub to your production server.

## ✅ What's Already Done
- ✅ GitHub Actions workflow created (`.github/workflows/deploy.yml`)
- ✅ Auto-deploy triggers on push to `main` branch
- ✅ Automatic database migrations
- ✅ Service restart after deployment

## 🔧 Setup Required

### 1. Configure GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SERVER_HOST` | `150.230.123.106` | Your server IP |
| `SERVER_USER` | `ubuntu` | Server username |
| `SERVER_PASSWORD` | `TaahirNarker19` | Server password |
| `SLACK_WEBHOOK` | `your-slack-webhook-url` | (Optional) Slack notifications |

### 2. Test Auto-Deploy
1. Make a small change to any file
2. Commit and push to `main` branch
3. Check GitHub Actions tab for deployment status

## 🔄 How It Works

### Trigger
- Push to `main` or `master` branch
- Pull request to `main` or `master` branch

### Process
1. **SSH to Server**: Connects to your production server
2. **Pull Changes**: `git pull origin main`
3. **Update Dependencies**: `pip install -r requirements.txt`
4. **Run Migrations**: `python manage.py migrate`
5. **Collect Static**: `python manage.py collectstatic --noinput`
6. **Restart Services**: `pm2 restart all`
7. **Notify**: Send Slack notification (if configured)

## 🛡️ Security Features
- ✅ SSH key authentication (recommended)
- ✅ Environment-specific secrets
- ✅ Deployment logs in GitHub Actions
- ✅ Rollback capability via PM2

## 📊 Monitoring
- **GitHub Actions**: View deployment logs
- **Server Logs**: `pm2 logs` on server
- **Slack**: Real-time deployment notifications

## 🚨 Troubleshooting

### Common Issues
1. **SSH Connection Failed**
   - Check server IP and credentials
   - Verify SSH port (22) is open

2. **Permission Denied**
   - Ensure ubuntu user has write access to `/var/www/ExcevaPropertyManagement`

3. **Dependencies Failed**
   - Check `requirements.txt` for missing packages
   - Verify virtual environment is activated

### Manual Rollback
```bash
# On server
cd /var/www/ExcevaPropertyManagement
git log --oneline -5  # Find previous commit
git reset --hard <commit-hash>
pm2 restart all
```

## 📈 Benefits
- ✅ **Zero Downtime**: Automatic deployment
- ✅ **Consistency**: Same deployment process every time
- ✅ **Audit Trail**: GitHub Actions logs
- ✅ **Quick Rollback**: Easy to revert changes
- ✅ **Team Collaboration**: Everyone can deploy safely

## 🎯 Next Steps
1. Configure GitHub secrets
2. Test with a small change
3. Monitor first deployment
4. Set up Slack notifications (optional)

---

**Need Help?** Check the deployment logs in GitHub Actions or server logs with `pm2 logs`.
