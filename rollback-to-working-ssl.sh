#!/bin/bash
echo "🔄 Rolling back to working SSL configuration..."

# Stop services
pm2 stop all
sudo systemctl stop nginx

# Checkout working configuration
git checkout ssl-working-backup

# Restart services
sudo systemctl start nginx
pm2 restart all

# Test
echo "🔍 Testing rollback..."
curl -I https://propman.exceva.capital

echo "✅ Rollback complete!"
