# Exceva Property Management - Localhost Setup

## 🚀 Quick Start

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

## 🔍 Health Check
```bash
./check-localhost.sh
```

## 🛠️ Services Running Locally

- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache and message broker (port 6379)
- **Django Backend**: API server (port 8000)
- **Next.js Frontend**: Web application (port 3000)

## 📋 Development Notes

- **Database**: SQLite (local file) - no PostgreSQL required for local development
- **Email**: Console backend (emails printed to terminal)
- **File Storage**: Local filesystem
- **Payments**: Disabled (mock mode)
- **Bitcoin Lightning**: Disabled (demo mode)

## 🔧 Individual Services

### Backend Only
```bash
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### Frontend Only
```bash
cd frontend
npm run dev
```

## 🚨 Troubleshooting

### 1. Port already in use:
```bash
lsof -ti:8000 | xargs kill -9  # Kill process on port 8000
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
```

### 2. Database issues:
```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

### 3. Dependencies issues:
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements-simple.txt

# Frontend
cd frontend
npm install
```

### 4. Redis connection issues:
```bash
# Start Redis manually
brew services start redis

# Or check if it's running
redis-cli ping
```

### 5. PostgreSQL issues (if needed):
```bash
# Start PostgreSQL manually
brew services start postgresql@14

# Or check if it's running
pg_isready -h localhost -p 5432
```

## 📁 Environment Variables

### Backend: `backend/.env.local`
- Django settings for local development
- SQLite database configuration
- CORS settings for localhost
- JWT settings
- Email console backend
- Redis local configuration

### Frontend: `frontend/.env.local`
- API URL pointing to localhost:8000
- Development flags
- Feature toggles for local development

**Note**: These files contain development-only settings and should not be committed to version control.

## 🗄️ Database

The system is configured to use SQLite for local development, which means:
- No PostgreSQL setup required
- Database file: `backend/db.sqlite3`
- All migrations are already applied
- Admin user is already created

## 🔐 Authentication

- **Admin User**: `admin` / `admin123`
- **JWT Authentication**: Enabled for API access
- **Session Authentication**: Available for Django admin

## 📧 Email

Emails are configured to use the console backend, which means:
- All emails are printed to the terminal
- No external email service required
- Perfect for development and testing

## 💰 Payments

Payment systems are disabled for local development:
- Stripe: Disabled
- Bitcoin Lightning: Demo mode only
- All payment features will show mock data

## 🎯 API Endpoints

### Health Check
- `GET /api/health/` - System health status

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `POST /api/auth/verify/` - Verify JWT token

### Main APIs
- `GET /api/properties/` - List properties
- `GET /api/tenants/` - List tenants
- `GET /api/leases/` - List leases
- `GET /api/finance/invoices/` - List invoices
- `GET /api/users/` - List users

## 🚀 Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Database | SQLite | PostgreSQL |
| Email | Console | SMTP/SES |
| File Storage | Local | S3/Cloud |
| Payments | Mock | Real |
| Debug | Enabled | Disabled |
| CORS | localhost | Domain specific |

## 📚 Additional Resources

- **Django Admin**: http://localhost:8000/admin
- **API Documentation**: Available at each endpoint with DRF browsable API
- **Health Check**: http://localhost:8000/api/health/

## 🔄 Updates and Maintenance

### Update Dependencies
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements-simple.txt --upgrade

# Frontend
cd frontend
npm update
```

### Reset Database
```bash
cd backend
source venv/bin/activate
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

## 🆘 Support

If you encounter issues:

1. Check the health status: `./check-localhost.sh`
2. Review the logs in the terminal
3. Ensure all services are running
4. Check environment variables are set correctly
5. Verify ports are not in use by other applications

---

**Happy coding! 🎉**
