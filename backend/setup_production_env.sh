#!/bin/bash

# Setup Production Environment Script
# This script configures the .env file for production use with Strike API

# Check if .env file exists
if [ -f .env ]; then
    echo "Backing up existing .env file to .env.backup"
    cp .env .env.backup
else
    echo "Creating new .env file"
fi

# Get the current API key and webhook secret
CURRENT_API_KEY=$(grep STRIKE_API_KEY .env 2>/dev/null | cut -d '=' -f2)
CURRENT_WEBHOOK_SECRET=$(grep STRIKE_WEBHOOK_SECRET .env 2>/dev/null | cut -d '=' -f2)
CURRENT_BASE_URL=$(grep PAYMENT_BASE_URL .env 2>/dev/null | cut -d '=' -f2)

# Set default values if not found
API_KEY=${CURRENT_API_KEY:-"9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"}
WEBHOOK_SECRET=${CURRENT_WEBHOOK_SECRET:-"o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk"}
BASE_URL=${CURRENT_BASE_URL:-"https://propman.exceva.capital/pay"}

# Ask for confirmation
echo "Setting up production environment with Strike API"
echo "API Key: ${API_KEY:0:5}...${API_KEY: -5}"
echo "Webhook Secret: ${WEBHOOK_SECRET:0:5}...${WEBHOOK_SECRET: -5}"
echo "Payment Base URL: $BASE_URL"
echo ""
read -p "Continue with these settings? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo "Setup canceled"
    exit 1
fi

# Create/update .env file with production settings
cat > .env << EOL
# Production Environment Configuration
DEBUG=False
SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_HOSTS=localhost,127.0.0.1,propman.exceva.capital

# Database Configuration (SQLite for development)
USE_SQLITE=True

# Strike API Configuration
STRIKE_API_BASE_URL=https://api.strike.me/v1
STRIKE_API_KEY=$API_KEY
STRIKE_WEBHOOK_SECRET=$WEBHOOK_SECRET

# Payment Configuration
LIGHTNING_INVOICE_EXPIRY_MINUTES=15
PAYMENT_BASE_URL=$BASE_URL

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Property Management <your-email@gmail.com>
PAYMENT_NOTIFICATION_EMAILS=admin@yourdomain.com

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
EOL

echo "Production environment configured successfully!"
echo "DEBUG=False has been set - the system will now use real Strike API calls"
echo ""
echo "To start the server in production mode:"
echo "python3 manage.py runserver 8000"
echo ""
echo "Note: For actual production deployment, use gunicorn or uwsgi instead of runserver" 