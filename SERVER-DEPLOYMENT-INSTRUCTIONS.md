# 🚀 Server Deployment Instructions for propman.exceva.capital

## 📋 Current Situation

Your project isn't deployed to the server yet. Here are the steps to get everything set up with SSL.

---

## 🎯 **Option 1: Complete Automated Setup (Recommended)**

### **Step 1: Connect to your server**
```bash
ssh ubuntu@150.230.123.106
```

### **Step 2: Download and run the complete setup script**
```bash
# Download the quick setup script
curl -o quick-setup.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/quick-setup.sh

# Make it executable
chmod +x quick-setup.sh

# Run the complete setup
./quick-setup.sh
```

**This will:**
- ✅ Install all required software (nginx, node.js, python, etc.)
- ✅ Clone your project from GitHub
- ✅ Set up Django backend
- ✅ Set up Next.js frontend
- ✅ Configure firewall
- ✅ Start all services
- ✅ Install SSL certificates
- ✅ Configure auto-redirect
- ✅ Verify everything works

---

## 🔧 **Option 2: Step-by-Step Manual Setup**

### **Step 1: Discover current server state**
```bash
# Connect to server
ssh ubuntu@150.230.123.106

# Download and run discovery script
curl -o server-discovery.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/server-discovery.sh
chmod +x server-discovery.sh
./server-discovery.sh
```

### **Step 2: Deploy the project**
```bash
# Create project directory
sudo mkdir -p /var/www
cd /var/www

# Clone the project
sudo git clone https://github.com/TaahirNarker/ExcevaPropertyManagement.git
sudo chown -R ubuntu:ubuntu /var/www/ExcevaPropertyManagement

# Navigate to project
cd /var/www/ExcevaPropertyManagement
```

### **Step 3: Run the existing deployment script**
```bash
# Run the main deployment script
./deploy-to-server.sh
```

### **Step 4: Set up SSL**
```bash
# Download SSL scripts
curl -o deploy-ssl-propman.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/deploy-ssl-propman.sh
curl -o verify-ssl.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/verify-ssl.sh
chmod +x deploy-ssl-propman.sh verify-ssl.sh

# Run SSL setup
./deploy-ssl-propman.sh
```

### **Step 5: Verify everything works**
```bash
# Run verification
./verify-ssl.sh
```

---

## 📋 **Prerequisites (Important!)**

Before running any setup, ensure:

1. **DNS Configuration**: `propman.exceva.capital` points to your server IP
2. **Oracle Cloud Security List**: Allow these ports:
   - Port 22 (SSH) - 0.0.0.0/0
   - Port 80 (HTTP) - 0.0.0.0/0
   - Port 443 (HTTPS) - 0.0.0.0/0
3. **Server Access**: You can SSH as ubuntu user

---

## 🔍 **Checking DNS Configuration**

```bash
# From your local machine or server, check DNS
dig +short propman.exceva.capital

# Should return your server IP: 150.230.123.106
```

---

## 🛠️ **Troubleshooting**

### **If DNS isn't working:**
1. Update your domain DNS records
2. Point `propman.exceva.capital` to `150.230.123.106`
3. Wait 5-10 minutes for propagation

### **If SSL setup fails:**
1. Check firewall ports are open
2. Verify DNS is working first
3. Check nginx is running: `sudo systemctl status nginx`

### **If services aren't starting:**
1. Check logs: `pm2 logs`
2. Restart services: `pm2 restart all`
3. Check nginx: `sudo systemctl status nginx`

---

## 🎯 **Expected Final Result**

After successful setup, you should have:

- 🔒 **https://propman.exceva.capital** - Your main application
- 🔐 **https://propman.exceva.capital/auth/login** - Login page
- 📝 **https://propman.exceva.capital/auth/register** - Registration
- 🏢 **https://propman.exceva.capital/dashboard** - Dashboard
- 🛠️ **https://propman.exceva.capital/admin/** - Admin panel

All HTTP requests will automatically redirect to HTTPS.

---

## 📞 **Need Help?**

If you encounter issues:

1. **Check the logs**: The scripts provide detailed output
2. **Run discovery**: `./server-discovery.sh` to see current state
3. **Verify DNS**: Make sure your domain points to the server
4. **Check firewall**: Ensure ports 22, 80, 443 are open

---

## 🚀 **Quick Start (TL;DR)**

```bash
# Connect to server
ssh ubuntu@150.230.123.106

# Download and run complete setup
curl -o quick-setup.sh https://raw.githubusercontent.com/TaahirNarker/ExcevaPropertyManagement/main/quick-setup.sh
chmod +x quick-setup.sh
./quick-setup.sh

# Your site will be available at https://propman.exceva.capital
```

That's it! The script handles everything automatically. 