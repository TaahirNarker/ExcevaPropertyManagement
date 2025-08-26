#!/bin/bash

# Exceva Property Management - Localhost Startup
echo "🚀 Starting Exceva Property Management on localhost..."

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend server
echo "📡 Starting Django backend server on http://localhost:8000"
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting Next.js frontend server on http://localhost:3000"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Exceva Property Management is now running on localhost!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "🔧 Django Admin: http://localhost:8000/admin"
echo ""
echo "👤 Admin Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait
