#!/bin/bash

# Script to setup Bitcoin Lightning payment environment
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
sed -i '' 's/your-strike-api-key-here/C76F8D791A36EBF6583B3E25BBF316CE316A70AB3507EA6A4628C3DAD4CO1FBF/g' .env

# Configure production URLs
echo "Configuring production URLs..."
sed -i '' 's|http://localhost:3000/pay|https://propman.exceva.capital/pay|g' .env

# Prompt for webhook secret
echo
echo "IMPORTANT: You need to configure your webhook secret from Strike dashboard."
echo "Please visit your Strike developer dashboard and set up a webhook with the following URL:"
echo "  https://propman.exceva.capital/api/payments/webhook/strike/"
echo
echo "Enable these webhook events:"
echo "  - invoice.created"
echo "  - invoice.updated"
echo "  - invoice.paid"
echo "  - invoice.canceled"
echo
echo "After setting up the webhook, copy the webhook secret and update it in the .env file."
echo
echo "Setup complete! Run 'python3 manage.py runserver 8000' to test your configuration."
echo "Check the logs for '✅ Strike API key configured successfully' to verify it's working." 