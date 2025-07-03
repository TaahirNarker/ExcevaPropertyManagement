# 🎉 Property Control System: Supabase Cloud Database System

**✅ MIGRATION COMPLETE** - This system now runs entirely on Supabase cloud database.

## **🎯 System Overview**

Your Property Control System is now configured to use **Supabase PostgreSQL cloud database exclusively**:
- ✅ **Database**: Supabase PostgreSQL (EU West 3)
- ✅ **Backend**: Django API running on port 8001
- ✅ **Frontend**: Next.js dashboard on port 3000/3001
- ✅ **Admin**: Django admin panel at `http://localhost:8001/admin/`
- ❌ **No local SQLite** - completely cloud-based

## **🚀 Quick Start Commands**

### Start the System:
```bash
# 1. Navigate to Django project
cd property_control_system

# 2. Activate virtual environment  
source ../property_control_env/bin/activate

# 3. Start Django backend (connects to Supabase automatically)
python manage.py runserver 8001

# 4. Access your system:
# - Dashboard: http://localhost:3000 or http://localhost:3001
# - Admin Panel: http://localhost:8001/admin/
# - API: http://localhost:8001/api/
```

## **📁 System Configuration**

The system is configured with these key files:
- `.env` - Contains Supabase credentials and configuration
- `settings.py` - Django settings configured for Supabase-only
- API endpoints at `/api/` for frontend communication

## 🚀 Property Control System: SQLite to Supabase Migration Guide

This guide will help you migrate your Property Control System from local SQLite to Supabase, enabling access from multiple devices through GitHub.

## 📋 Prerequisites

- Existing Property Control System with SQLite data
- Supabase account (free tier available)
- Git repository on GitHub
- Python environment with Django

## 🏗️ Step 1: Set Up Supabase Project

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `property-control-system`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"

### 1.2 Get Your Supabase Credentials
Once your project is ready, navigate to:
- **Settings** → **Database** → **Connection info**
- **Settings** → **API** → **Project API keys**

You'll need:
- Database URL (Host)
- Database Password (from Step 1.1)
- Project URL
- Anon/Public Key
- Service Role Key (secret)

## 🔧 Step 2: Configure Environment Variables

### 2.1 Create Environment File
Copy the template file and fill in your credentials:

```bash
cd property_control_system
cp env_template.txt .env
```

### 2.2 Edit .env File
Open `.env` and replace the placeholder values:

```env
# Django Environment Configuration - Supabase Cloud Only
SECRET_KEY=django-insecure-temp-key-for-development-only
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Supabase Database Configuration (Cloud Only)
DB_NAME=postgres
DB_USER=postgres.fduhpefiwmfenjcldnwr
DB_PASSWORD=LEBOBw0xYplPSFRK
DB_HOST=aws-0-eu-west-3.pooler.supabase.com
DB_PORT=5432

# Supabase Configuration
SUPABASE_URL=https://fduhpefiwmfenjcldnwr.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdWhwZWZpd21mZW5qY2xkbndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MDgzNDQsImV4cCI6MjA0OTI4NDM0NH0.z39BtGhNzDBYNzXyULHlCJ3mK5SXWo-t8-KJfJb09JI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdWhwZWZpd21mZW5qY2xkbndyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzcwODM0NCwiZXhwIjoyMDQ5Mjg0MzQ0fQ.zQ5wuBZnWjOcALuuXEcBLmFkDyNh-BdAyxbT8vADbE4

# Development Override
USE_SQLITE=False

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

**Important**: Replace ALL placeholder values with your actual Supabase credentials!

## 📤 Step 3: Export Your Current Data

### 3.1 Run the Export Script
This will create JSON files of all your current SQLite data:

```bash
cd property_control_system
source ../property_control_env/bin/activate
python migrate_to_supabase.py
```

### 3.2 Verify Export
Check that the export was successful:

```bash
ls -la sqlite_export/
cat sqlite_export/migration_summary.json
```

You should see JSON files for each of your models and a summary file.

## 🏗️ Step 4: Create Database Schema in Supabase

### 4.1 Test Connection
First, ensure your Supabase connection works:

```bash
# Test with temporary SQLite disabled
export USE_SQLITE=False
python manage.py check
```

### 4.2 Run Migrations
Create all your Django tables in Supabase:

```bash
python manage.py migrate
```

### 4.3 Create Superuser (Optional)
Create a new admin user for Supabase:

```bash
python manage.py createsuperuser
```

## 📥 Step 5: Import Your Data

### 5.1 Run the Import Script
Import your exported SQLite data into Supabase:

```bash
python import_to_supabase.py
```

### 5.2 Verify Import
Test that your data was imported correctly:

```bash
python manage.py shell
```

In the Django shell:
```python
from django.contrib.auth import get_user_model
from properties.models import Property  # Adjust based on your models

User = get_user_model()
print(f"Users: {User.objects.count()}")
print(f"Properties: {Property.objects.count()}")
```

## 🧪 Step 6: Test Your Application

### 6.1 Start Development Server
```bash
export USE_SQLITE=False
python manage.py runserver 8001
```

### 6.2 Verify Functionality
- Visit http://127.0.0.1:8001/admin/
- Login with your credentials
- Check that all your data is accessible
- Test CRUD operations

## 🚀 Step 7: Deploy to Production

### 7.1 Update Git Repository
Add your new files to Git (but **NOT** the .env file):

```bash
# Add to .gitignore if not already there
echo ".env" >> .gitignore

# Add migration files
git add migrate_to_supabase.py
git add import_to_supabase.py
git add SUPABASE_MIGRATION_GUIDE.md
git add env_template.txt
git add property_control_system/settings.py

git commit -m "Add Supabase migration support"
git push origin main
```

### 7.2 Environment Variables for Production
For production deployment (Heroku, DigitalOcean, etc.), set these environment variables:

```
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
USE_SQLITE=False
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## 🔄 Step 8: Access from Other Devices

### 8.1 Clone Repository
On your other device:

```bash
git clone https://github.com/yourusername/property-control-system.git
cd property-control-system/property_control_system
```

### 8.2 Set Up Environment
```bash
# Create virtual environment
python -m venv property_control_env
source property_control_env/bin/activate  # Linux/Mac
# or
property_control_env\Scripts\activate  # Windows

# Install requirements
pip install -r requirements.txt

# Create .env file with Supabase credentials
cp env_template.txt .env
# Edit .env with your Supabase credentials
```

### 8.3 Run Application
```bash
export USE_SQLITE=False
python manage.py runserver 8001
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Connection Refused**
   - Check your Supabase credentials
   - Ensure DB_HOST includes the full Supabase URL
   - Verify your project is not paused (free tier limitation)

2. **SSL Connection Error**
   - Add `'sslmode': 'require'` to database options (already in settings.py)

3. **Migration Errors**
   - Run `python manage.py migrate --fake-initial` if needed
   - Check for model conflicts

4. **Data Import Failures**
   - Check foreign key relationships
   - Verify model field compatibility
   - Review import logs for specific errors

### Performance Optimization:

1. **Database Indexes**
   ```python
   # In your models, add:
   class Meta:
       indexes = [
           models.Index(fields=['created_at']),
           models.Index(fields=['status']),
       ]
   ```

2. **Connection Pooling**
   ```python
   # In settings.py DATABASES config:
   'OPTIONS': {
       'sslmode': 'require',
       'MAX_CONNS': 20,
   },
   ```

## 🎉 Success!

Your Property Control System is now running on Supabase! You can:
- ✅ Access it from any device with internet connection
- ✅ Share data across multiple devices
- ✅ Have automatic backups through Supabase
- ✅ Scale as your business grows
- ✅ Access through GitHub from anywhere

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the migration logs in `sqlite_export/`
3. Verify all environment variables are set correctly
4. Test database connection manually

**Note**: Keep your `.env` file secure and never commit it to Git!

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit sensitive credentials
2. **Supabase Row Level Security**: Enable RLS for production
3. **HTTPS Only**: Always use HTTPS in production
4. **Regular Backups**: Supabase provides automated backups
5. **Access Control**: Use proper authentication and permissions

---

**Migration Complete! 🎊**

Your property control system is now cloud-ready and accessible from anywhere! 