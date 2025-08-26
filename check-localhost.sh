#!/bin/bash

echo "🔍 Checking Exceva Property Management localhost services..."

# Check if PostgreSQL is running
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
fi

# Check if Redis is running
if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
fi

# Check if backend is accessible
if curl -s http://localhost:8000/api/health/ >/dev/null 2>&1; then
    echo "✅ Backend API is running"
else
    echo "❌ Backend API is not running"
fi

# Check if frontend is accessible
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
fi

echo ""
echo "🎯 To start the system, run: ./start-localhost.sh"
