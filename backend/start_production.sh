#!/bin/bash

# Production Startup Script for Property Management System
echo "🚀 Starting Property Management System in PRODUCTION mode..."

# Load production environment variables
if [ -f "env.production" ]; then
    echo "📋 Loading production environment configuration..."
    export $(cat env.production | grep -v '^#' | xargs)
else
    echo "⚠️  Production environment file not found. Using defaults."
fi

# Set production environment variables
export DJANGO_SETTINGS_MODULE=property_control_system.settings
export DEBUG=False
export ALLOWED_HOSTS=propman.exceva.capital,www.propman.exceva.capital,150.230.123.106

# Activate virtual environment
if [ -d "venv" ]; then
    echo "🐍 Activating virtual environment..."
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Please run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if migrations are needed
echo "🔍 Checking database migrations..."
python manage.py migrate --check

# Start the production server
echo "🌐 Starting production server on 0.0.0.0:8000..."
echo "📱 Server will be accessible at: https://propman.exceva.capital"
echo "🔌 API endpoints available at: https://propman.exceva.capital/api/"
echo ""

# Start Django server on all interfaces
python manage.py runserver 0.0.0.0:8000
