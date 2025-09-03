#!/bin/bash

# Check Localhost Server Status
# This script checks if both Django backend and Next.js frontend are running

echo "🔍 Checking Exceva Property Management Server Status..."
echo ""

# Check Django backend
echo "📡 Django Backend (Port 8000):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ | grep -q "200"; then
    echo "   ✅ Running - http://localhost:8000"
    echo "   📊 Admin: http://localhost:8000/admin"
else
    echo "   ❌ Not responding"
fi

echo ""

# Check Next.js frontend
echo "🌐 Next.js Frontend (Port 3000):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "   ✅ Running - http://localhost:3000"
else
    echo "   ❌ Not responding"
fi

echo ""

# Check running processes
echo "🔧 Running Processes:"
echo "   Django: $(ps aux | grep -c 'manage.py runserver' | tr -d ' ') instances"
echo "   Next.js: $(ps aux | grep -c 'next dev' | tr -d ' ') instances"

echo ""
echo "💡 To start servers: ./start-localhost.sh"
echo "💡 To stop servers: Ctrl+C in the start script or pkill -f 'manage.py runserver' && pkill -f 'next dev'"
