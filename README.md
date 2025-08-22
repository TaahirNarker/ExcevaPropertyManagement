# 🏢 Exceva Property Management System

**Complete property portfolio management solution for landlords, property managers, and real estate professionals**

🚀 **Live Demo**: https://propman.exceva.capital  
📊 **Admin Panel**: https://propman.exceva.capital/admin/  
🔌 **API Documentation**: https://propman.exceva.capital/api/

<!-- Auto-deploy test: $(date) - Network Connectivity Investigation -->

## 🎯 Overview

The Property Management System is a full-stack application designed to streamline property portfolio operations:
- **Portfolio Management**: Track properties, units, and occupancy rates
- **Tenant Management**: Handle tenant information, communications, and history
- **Lease Management**: Create, track, and renew lease agreements
- **Financial Management**: Income tracking, expense management, and reporting
- **Analytics & Reports**: Performance insights and financial analytics

## 🚀 Auto-Deploy System

### **GitHub Actions CI/CD**
- **Automatic deployment** on every push to `main` branch
- **Zero-downtime deployments** with PM2 process management
- **Database migrations** run automatically
- **Static file collection** and service restart
- **Deployment notifications** via Slack (optional)

### **Production Infrastructure**
- **Oracle Cloud** server with SSL certificates
- **Nginx** reverse proxy with load balancing
- **PostgreSQL** database for production data
- **PM2** process manager for Node.js applications
- **Let's Encrypt** SSL certificates with auto-renewal

## 🏗️ Architecture

### **Backend (Django)**
- **Python Django** REST API with comprehensive data models
- **PostgreSQL/Supabase** cloud database for scalability
- **Role-based permissions** (Admin, Property Manager, Accountant, Viewer)
- **RESTful APIs** for all property management operations
- **WebAuthn/Passkeys** for secure authentication

### **Frontend (Next.js)**
- **React/Next.js** modern web application
- **Tailwind CSS** for responsive design
- **Real-time updates** and interactive dashboards
- **Multi-tenant support** for property management companies
- **Progressive Web App** (PWA) capabilities

## ✨ Core Features

### 🏠 Property Management
- **Property Portfolio** overview with key metrics
- **Unit Management** for multi-unit properties
- **Property Details** including financials and documents
- **Occupancy Tracking** and availability management
- **Property Images** and document storage

### 👥 Tenant Management
- **Tenant Profiles** with contact information and history
- **Application Processing** and tenant screening
- **Communication History** and notes
- **Tenant Portal** (coming soon)
- **Lease History** and renewals

### 📋 Lease Management
- **Lease Creation** with customizable templates
- **Lease Tracking** and renewal alerts
- **Rental Escalations** and lease modifications
- **Digital Signatures** (coming soon)
- **Lease Analytics** and performance metrics

### 💰 Financial Management
- **Income Tracking** from all properties
- **Expense Management** and categorization
- **Invoice Generation** and payment tracking
- **Financial Reports** and analytics
- **Tax Reporting** support
- **Bitcoin Lightning Payments** via Strike API
- **Automated Payment Processing** with webhooks

### 📊 Analytics & Reports
- **Portfolio Performance** metrics
- **Occupancy Reports** and trends
- **Financial Analysis** and cash flow projections
- **Custom Reports** for different stakeholders
- **Export Capabilities** (PDF, Excel)

### ⚡ Bitcoin Lightning Payments
- **Strike API Integration** for instant payments
- **Lightning Invoice Generation** with QR codes
- **Automated Payment Confirmation** via webhooks
- **Payment History Tracking** and reconciliation
- **Multi-currency Support** (USD, EUR, GBP)
- **Secure Payment Processing** with signature verification

## 🚀 Getting Started

### Prerequisites
- **Python** 3.8+ with pip
- **Node.js** 18+ and npm
- **PostgreSQL** (or Supabase account)

### Backend Setup (Django)

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start Django server**
   ```bash
   python manage.py runserver 8001
   ```

### Frontend Setup (Next.js)

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Set NEXT_PUBLIC_API_URL=http://localhost:8001/api/
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Full Stack Deployment

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
python manage.py runserver 8001

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api/
- **Django Admin**: http://localhost:8001/admin/

## 🚀 Production Deployment

### **Quick Deploy (One Command)**
```bash
# On your production server
wget -O deploy-exceva-server.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/deploy-exceva-server.sh
chmod +x deploy-exceva-server.sh
./deploy-exceva-server.sh
```

### **Auto-Deploy Setup**
1. **Configure GitHub Secrets**:
   - Go to repository Settings → Secrets → Actions
   - Add: `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD`

2. **Test Auto-Deploy**:
   - Make changes and push to `main` branch
   - Check GitHub Actions tab for deployment status

3. **Monitor Deployment**:
   - GitHub Actions logs for deployment progress
   - Server logs: `pm2 logs` on production server

### **Manual Deployment**
```bash
# SSH to server
ssh ubuntu@150.230.123.106

# Navigate to project
cd /var/www/ExcevaPropertyManagement

# Pull latest changes
git pull origin main

# Update dependencies
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Run migrations
python backend/manage.py migrate

# Restart services
pm2 restart all
```

## 🔐 SSL Certificate Setup

### Automated Setup (Recommended)
```bash
# On your production server
cd /var/www/ExcevaPropertyManagement
./ssl-certificate-setup.sh
```

### Manual Setup
If the automated script fails, follow the [SSL Troubleshooting Guide](ssl-troubleshooting-guide.md) for manual configuration.

**Features included:**
- ✅ Let's Encrypt SSL certificate
- ✅ Automatic certificate renewal
- ✅ HTTP to HTTPS redirect
- ✅ Security headers configuration
- ✅ Oracle Cloud firewall configuration

**Your secure endpoints:**
- **Website**: https://propman.exceva.capital
- **Admin Panel**: https://propman.exceva.capital/admin/
- **API**: https://propman.exceva.capital/api/

## 📁 Project Structure

```
ExcevaPropertyManagement/
├── backend/                 # Django backend
│   ├── properties/          # Property models and APIs
│   ├── tenants/            # Tenant management
│   ├── finance/            # Financial tracking
│   ├── payments/           # Bitcoin Lightning payments
│   ├── users/              # User management and roles
│   ├── manage.py           # Django management
│   ├── requirements.txt    # Python dependencies
│   ├── env.production      # Production environment
│   └── start_production.sh # Production startup script
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/  # Dashboard pages
│   │   │   ├── auth/       # Authentication pages
│   │   │   └── pay/        # Payment pages
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── lib/            # API utilities
│   │   └── utils/          # Utility functions
│   ├── package.json        # Node.js dependencies
│   └── next.config.ts      # Next.js configuration
├── .github/workflows/      # GitHub Actions CI/CD
│   └── deploy.yml          # Auto-deploy workflow
├── deploy-exceva-server.sh # Production deployment script
├── AUTO_DEPLOY_SETUP.md    # Auto-deploy documentation
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
# Database Configuration
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432

# Supabase Configuration (if using)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Django Configuration
SECRET_KEY=your_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email
EMAIL_HOST_PASSWORD=your_password

# Bitcoin Lightning Payment Configuration
STRIKE_API_KEY=your_strike_api_key
STRIKE_WEBHOOK_SECRET=your_webhook_secret
STRIKE_API_BASE_URL=https://api.strike.me/v1

### Frontend Environment Variables (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8001/api/

# Optional: Google Maps for address autocomplete
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## 🛠️ API Endpoints

### Properties
- `GET /api/properties/` - List all properties
- `POST /api/properties/` - Create new property
- `GET /api/properties/{id}/` - Get property details
- `PUT /api/properties/{id}/` - Update property
- `DELETE /api/properties/{id}/` - Delete property
- `GET /api/properties/{id}/units/` - Get property units

### Tenants
- `GET /api/tenants/` - List all tenants
- `POST /api/tenants/` - Create new tenant
- `GET /api/tenants/{id}/` - Get tenant details
- `PUT /api/tenants/{id}/` - Update tenant
- `DELETE /api/tenants/{id}/` - Delete tenant

### Leases
- `GET /api/leases/` - List all leases
- `POST /api/leases/` - Create new lease
- `GET /api/leases/{id}/` - Get lease details
- `PUT /api/leases/{id}/` - Update lease
- `DELETE /api/leases/{id}/` - Delete lease

### Finance
- `GET /api/invoices/` - List all invoices
- `POST /api/invoices/` - Create new invoice
- `GET /api/payments/` - List all payments
- `POST /api/payments/` - Record new payment

### Bitcoin Lightning Payments
- `POST /api/payments/strike/create-invoice/` - Create Lightning invoice
- `GET /api/payments/strike/invoices/` - List Lightning invoices
- `POST /api/payments/webhook/strike/` - Strike webhook handler
- `GET /api/payments/strike/quote/` - Get payment quote

## 👥 User Roles

### **Administrator**
- Full system access
- User management
- System configuration
- All property and financial operations

### **Property Manager**
- Property CRUD operations
- Tenant management
- Lease management
- Limited financial access

### **Accountant**
- Read-only property and tenant access
- Full financial management
- Report generation
- Payment processing

### **Viewer**
- Read-only dashboard access
- Basic reporting
- No modification permissions

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

## 📊 Database Models

### Property Model
- Basic property information
- Financial details (purchase price, market value)
- Property attributes (type, units, etc.)
- Document storage references

### Tenant Model
- Personal information
- Contact details
- Application status
- Lease history

### Lease Model
- Lease terms and conditions
- Rental amounts and escalations
- Start and end dates
- Renewal tracking

### Financial Models
- Invoice generation
- Payment tracking
- Expense categorization
- Financial reporting

## 🔐 Security Features

- **Role-based access control** (RBAC)
- **Django authentication** and session management
- **CORS configuration** for secure API access
- **Environment variable** protection for sensitive data
- **Database encryption** for sensitive information
- **WebAuthn/Passkeys** for secure authentication
- **SSL/TLS encryption** for all communications
- **Webhook signature verification** for payment security

## 🚀 Current Deployment Status

### **Production Environment**
- **Domain**: https://propman.exceva.capital
- **Server**: Oracle Cloud (150.230.123.106)
- **Database**: PostgreSQL
- **SSL**: Let's Encrypt (auto-renewing)
- **Process Manager**: PM2
- **Auto-Deploy**: GitHub Actions (configured)

### **Services Status**
- ✅ **Frontend**: Next.js application running
- ✅ **Backend**: Django API running
- ✅ **Database**: PostgreSQL connected
- ✅ **SSL**: HTTPS enabled
- ✅ **Auto-Deploy**: GitHub Actions workflow active
- ⚠️ **Payment System**: Strike API integration ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please:
1. Check the [Documentation](docs/)
2. Search existing [Issues](https://github.com/yourusername/property-management-system/issues)
3. Create a new issue if needed

## 🔄 Updates

- **v1.0.0** - Initial release with core property management features
- **v1.1.0** - Added advanced reporting and analytics
- **v1.2.0** - Introduced multi-tenant support and role-based permissions
- **v1.3.0** - Added Bitcoin Lightning payment integration
- **v1.4.0** - Implemented auto-deploy with GitHub Actions
- **v1.5.0** - Added WebAuthn/Passkeys authentication

---

**Built with ❤️ for property management professionals** 