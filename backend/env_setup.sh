#!/bin/bash

# Script to setup Bitcoin Lightning payment environment with new API key
echo "Setting up Bitcoin Lightning payments with Strike API..."

# Check if .env file exists
if [ -f .env ]; then
    echo "Found existing .env file. Creating backup..."
    cp .env .env.bak
    echo "Backup created as .env.bak"
fi

# Copy template
echo "Copying environment template..."
cp env_template_bitcoin.txt .env

# Update with Strike API key
echo "Configuring Strike API credentials..."
# Replace placeholder with actual API key
sed -i '' 's/your-strike-api-key-here/9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3/g' .env

# Set webhook secret
echo "Configuring webhook secret..."
sed -i '' 's/your-strike-webhook-secret-here/o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk/g' .env

# Configure production URLs
echo "Configuring production URLs..."
sed -i '' 's|http://localhost:3000/pay|https://propman.exceva.capital/pay|g' .env
sed -i '' 's|admin@yourapp.com,manager@yourapp.com|admin@exceva.capital,manager@exceva.capital|g' .env

echo
echo "✅ Environment variables set successfully!"
echo "✅ API Key: 9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3"
echo "✅ Webhook Secret: o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk"
echo
echo "Now you can run the backend with: python3 manage.py runserver 8000" 