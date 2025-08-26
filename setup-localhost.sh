#!/bin/bash

# Exceva Property Management - Localhost Setup for macOS
# Simplified setup script for running everything locally

set -e

echo "🚀 Setting up Exceva Property Management for localhost..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS. Please use the full local-setup.sh for other systems."
    exit 1
fi

print_status "Detected macOS system"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    print_success "Homebrew is already installed"
fi

# Install system dependencies
print_status "Installing system dependencies..."
brew install python@3.11 node postgresql redis

# Start PostgreSQL service
print_status "Starting PostgreSQL service..."
brew services start postgresql

# Start Redis service
print_status "Starting Redis service..."
brew services start redis

print_success "System dependencies installed and services started"

# Setup backend
print_status "Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3.11 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

print_success "Backend dependencies installed"

# Create local environment file
print_status "Creating local environment configuration..."
cat > .env.local << 'EOF'
# Django Settings
SECRET_KEY=your-secret-key-for-local-development-only-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Settings (SQLite for local development)
USE_SQLITE=True

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=True

# JWT Settings
JWT_SECRET_KEY=your-jwt-secret-key-for-local-development
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# Email Settings (Console backend for local development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USE_TLS=False
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Redis Settings (Local)
REDIS_URL=redis://localhost:6379/0

# Celery Settings
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# File Storage (Local)
DEFAULT_FILE_STORAGE=django.core.files.storage.FileSystemStorage
MEDIA_ROOT=media/

# Payment Settings (Disabled for local development)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Bitcoin Lightning Settings (Disabled for local development)
STRIKE_API_KEY=
STRIKE_WEBHOOK_SECRET=

# AWS Settings (Disabled for local development)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=

# Supabase Settings (Disabled for local development)
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=

# Security Settings
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF

print_success "Local environment file created"

# Run database migrations
print_status "Setting up database..."
python manage.py makemigrations
python manage.py migrate

# Create superuser
print_status "Creating superuser account..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@exceva.local', 'admin123') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

print_success "Database setup completed"

# Setup frontend
print_status "Setting up frontend..."
cd ../frontend

# Install Node.js dependencies
npm install

print_success "Frontend dependencies installed"

# Create frontend environment file
print_status "Creating frontend environment configuration..."
cat > .env.local << 'EOF'
# Frontend Local Development Environment
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_BITCOIN_PAYMENTS=false
NEXT_PUBLIC_ENABLE_STRIPE_PAYMENTS=false
NEXT_PUBLIC_ENABLE_EMAIL_NOTIFICATIONS=true
EOF

print_success "Frontend environment file created"

# Create startup scripts
print_status "Creating startup scripts..."

cd ..

# Combined startup script
cat > start-localhost.sh << 'EOF'
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
EOF

chmod +x start-localhost.sh

# Create health check script
cat > check-localhost.sh << 'EOF'
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
EOF

chmod +x check-localhost.sh

print_success "Startup scripts created"

# Create quick README
cat > LOCALHOST_README.md << 'EOF'
# Exceva Property Management - Localhost Setup

## Quick Start

1. **Start all services:**
   ```bash
   ./start-localhost.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin

3. **Admin Login:**
   - Username: `admin`
   - Password: `admin123`

## Health Check
```bash
./check-localhost.sh
```

## Services Running Locally

- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache and message broker (port 6379)
- **Django Backend**: API server (port 8000)
- **Next.js Frontend**: Web application (port 3000)

## Development Notes

- Database: SQLite (local file)
- Email: Console backend (emails printed to terminal)
- File Storage: Local filesystem
- Payments: Disabled (mock mode)
- Bitcoin Lightning: Disabled

## Troubleshooting

1. **Port already in use:**
   ```bash
   lsof -ti:8000 | xargs kill -9  # Kill process on port 8000
   lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
   ```

2. **Database issues:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py migrate
   ```

3. **Dependencies issues:**
   ```bash
   # Backend
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Frontend
   cd frontend
   npm install
   ```

## Environment Variables

- Backend: `backend/.env.local`
- Frontend: `frontend/.env.local`

These files contain development-only settings and should not be committed to version control.
EOF

print_success "Documentation created"

echo ""
echo "🎉 Exceva Property Management localhost setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run: ./start-localhost.sh"
echo "2. Open: http://localhost:3000"
echo "3. Login with: admin / admin123"
echo ""
echo "📚 For more information, see: LOCALHOST_README.md"
echo ""
