# Localhost Setup Guide

## 🚀 Quick Start

### Option 1: Use the Startup Script (Recommended)
```bash
./start-localhost.sh
```

This script will:
- Create a virtual environment if it doesn't exist
- Install required Django packages
- Start both Django backend and Next.js frontend servers
- Handle proper cleanup on exit

### Option 2: Manual Setup

#### 1. Start Django Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install Django==4.2.7 djangorestframework==3.14.0 django-cors-headers==4.3.1
python manage.py runserver 0.0.0.0:8000
```

#### 2. Start Next.js Frontend (in a new terminal)
```bash
cd frontend
npm run dev
```

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin

## 🔧 Troubleshooting

### Common Issues

#### 1. "localhost refused to connect" Error
**Cause**: Frontend server not running
**Solution**: 
```bash
cd frontend
npm run dev
```

#### 2. "No module named 'django'" Error
**Cause**: Virtual environment not activated or Django not installed
**Solution**:
```bash
cd backend
source venv/bin/activate
pip install Django==4.2.7
```

#### 3. Port Already in Use
**Cause**: Previous server instances still running
**Solution**:
```bash
pkill -f "manage.py runserver"
pkill -f "next dev"
```

### Status Check
Use the status check script to verify both servers:
```bash
./check-localhost.sh
```

### Logs
- **Django logs**: `django.log`
- **Next.js logs**: `nextjs.log`

## 📁 Project Structure
```
ExcevaPropertyManagement/
├── backend/                 # Django backend
│   ├── venv/               # Python virtual environment
│   ├── manage.py           # Django management script
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend
│   ├── package.json        # Node.js dependencies
│   └── src/                # React components
├── start-localhost.sh      # Startup script
├── check-localhost.sh      # Status check script
└── LOCALHOST_README.md     # This file
```

## 🛠️ Development Commands

### Backend (Django)
```bash
cd backend
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test
```

### Frontend (Next.js)
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 🔒 Environment Variables

### Backend (.env file in backend/)
```bash
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
```

### Frontend (.env.local file in frontend/)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_DEBUG=true
```

## 🚨 Important Notes

1. **Always activate virtual environment** before running Django commands
2. **Keep both servers running** for full functionality
3. **Use Ctrl+C** to stop servers gracefully
4. **Check logs** if you encounter issues
5. **Database**: Uses SQLite by default for development

## 🆘 Getting Help

If you encounter issues:

1. Check the status: `./check-localhost.sh`
2. Check logs: `tail -f django.log` or `tail -f nextjs.log`
3. Restart servers: `./start-localhost.sh`
4. Verify ports are not in use: `lsof -i :3000` and `lsof -i :8000`

## ✅ Success Indicators

Your setup is working correctly when:
- ✅ Frontend loads at http://localhost:3000
- ✅ Backend API responds at http://localhost:8000/api/
- ✅ Status check shows both servers running
- ✅ No error messages in terminal or logs
