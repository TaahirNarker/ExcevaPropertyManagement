#!/bin/bash

# Quick Deploy Script for Exceva Property Management
# Copy and paste this entire script on your server

echo "🚀 Starting Exceva Property Management Deployment..."

# Download and run deployment script
wget -O deploy-exceva-server.sh https://raw.githubusercontent.com/osmannarker/ExcevaPropertyManagement/main/deploy-exceva-server.sh
chmod +x deploy-exceva-server.sh
./deploy-exceva-server.sh
