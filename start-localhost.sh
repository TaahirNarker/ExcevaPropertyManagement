#!/bin/bash

# Start Localhost Development Servers
# This script starts both the Django backend and Next.js frontend

echo "🚀 Starting Exceva Property Management Development Servers..."

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    pkill -f "manage.py runserver" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install Django==4.2.7 djangorestframework==3.14.0 django-cors-headers==4.3.1
    cd ..
fi

# Start Django backend server
echo "📡 Starting Django backend on http://localhost:8000"
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 > ../django.log 2>&1 &
DJANGO_PID=$!
cd ..

# Wait a moment for Django to start
sleep 3

# Start Next.js frontend server
echo "🌐 Starting Next.js frontend on http://localhost:3000"
cd frontend
npm run dev > ../nextjs.log 2>&1 &
NEXT_PID=$!
cd ..

echo ""
echo "✅ Both servers are starting up..."
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8000"
echo "📊 Django Admin: http://localhost:8000/admin"
echo ""
echo "📝 Logs: django.log (backend) and nextjs.log (frontend)"
echo "💡 Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $DJANGO_PID $NEXT_PID
