#!/bin/bash
# Network Diagnostics Script for Exceva Property Management Server
# This script gathers comprehensive network and SSH information

echo "🔍 Exceva Property Management - Network Diagnostics"
echo "=================================================="
echo "Timestamp: $(date)"
echo "Server: 150.230.123.106"
echo ""

# 1. Basic Network Connectivity
echo "🌐 1. Basic Network Connectivity"
echo "--------------------------------"
echo "Ping test:"
ping -c 3 150.230.123.106 2>/dev/null || echo "❌ Ping failed"

echo ""
echo "Port connectivity test:"
echo "Port 22 (SSH):"
nc -zv 150.230.123.106 22 2>&1 | head -1

echo "Port 80 (HTTP):"
nc -zv 150.230.123.106 80 2>&1 | head -1

echo "Port 443 (HTTPS):"
nc -zv 150.230.123.106 443 2>&1 | head -1

echo "Port 3000 (Next.js):"
nc -zv 150.230.123.106 3000 2>&1 | head -1

# 2. HTTP Service Status
echo ""
echo "🌐 2. HTTP Service Status"
echo "-------------------------"
echo "Frontend (port 80):"
curl -I http://150.230.123.106 2>/dev/null | head -1 || echo "❌ Frontend not accessible"

echo "Backend API:"
curl -I http://150.230.123.106/api/health/ 2>/dev/null | head -1 || echo "❌ Backend API not accessible"

# 3. SSH Service Analysis
echo ""
echo "🔐 3. SSH Service Analysis"
echo "--------------------------"
echo "SSH connection test:"
timeout 10 ssh -o ConnectTimeout=5 -o BatchMode=yes -i ~/.ssh/github_actions_deploy ubuntu@150.230.123.106 "echo 'SSH working'" 2>&1 | head -1 || echo "❌ SSH connection failed"

# 4. Network Route Analysis
echo ""
echo "🛣️ 4. Network Route Analysis"
echo "----------------------------"
echo "Traceroute to server:"
traceroute -m 15 150.230.123.106 2>/dev/null | head -10 || echo "❌ Traceroute failed"

# 5. DNS Resolution
echo ""
echo "🔍 5. DNS Resolution"
echo "-------------------"
echo "Reverse DNS lookup:"
nslookup 150.230.123.106 2>/dev/null | grep "name\|address" || echo "❌ DNS lookup failed"

# 6. GitHub Actions Network Test
echo ""
echo "🚀 6. GitHub Actions Network Test"
echo "--------------------------------"
echo "Testing from current location (simulating GitHub Actions environment):"
echo "Current IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unknown')"
echo "Current location: $(curl -s ipinfo.io/country 2>/dev/null || echo 'Unknown')"

# 7. Oracle Cloud Network Test
echo ""
echo "☁️ 7. Oracle Cloud Network Test"
echo "-------------------------------"
echo "Testing common Oracle Cloud ports:"
for port in 22 80 443 3000 8000 8080; do
    echo "Port $port: $(nc -zv 150.230.123.106 $port 2>&1 | grep -o 'succeeded\|failed' || echo 'timeout')"
done

echo ""
echo "🔍 Diagnostics Complete!"
echo "Check the results above to identify the root cause."
