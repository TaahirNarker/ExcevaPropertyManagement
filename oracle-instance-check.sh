#!/bin/bash

echo "🔍 ORACLE CLOUD INSTANCE RESOURCE ANALYSIS"
echo "=========================================="
echo ""

echo "📋 1. INSTANCE SPECIFICATIONS"
echo "------------------------------"
echo "Instance Type:"
curl -s -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/instance/ | grep -E "shape|displayName" 2>/dev/null || echo "API not available - checking manually..."

echo ""
echo "CPU Information:"
lscpu | grep -E "^CPU\(s\)|^Thread|^Core|^Socket|^Model name"

echo ""
echo "Memory Information:"
free -h

echo ""
echo "Storage Information:"
df -h

echo ""
echo "🔄 2. CURRENT RESOURCE USAGE"
echo "-----------------------------"
echo "CPU Usage (last 1 minute):"
uptime

echo ""
echo "Current CPU usage by process:"
top -bn1 | head -20

echo ""
echo "Memory Usage:"
free -h
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Buffers|Cached"

echo ""
echo "💾 3. STORAGE ANALYSIS"
echo "----------------------"
echo "Disk Usage:"
df -h

echo ""
echo "Disk I/O:"
iostat 1 3 2>/dev/null || echo "iostat not available - install with: sudo apt install sysstat"

echo ""
echo "🌐 4. NETWORK & PROCESSES"
echo "-------------------------"
echo "Active network connections:"
netstat -tulpn | grep LISTEN | wc -l
echo "Listening ports:"
netstat -tulpn | grep LISTEN

echo ""
echo "🏃 5. RUNNING PROCESSES"
echo "----------------------"
echo "Process count:"
ps aux | wc -l

echo ""
echo "Top memory-consuming processes:"
ps aux --sort=-%mem | head -10

echo ""
echo "Top CPU-consuming processes:"
ps aux --sort=-%cpu | head -10

echo ""
echo "📊 6. SYSTEM LOAD"
echo "-----------------"
echo "Load Average:"
cat /proc/loadavg

echo ""
echo "System uptime:"
uptime

echo ""
echo "🔍 7. DETAILED SPECS"
echo "--------------------"
echo "Kernel version:"
uname -a

echo ""
echo "OS Information:"
cat /etc/os-release | head -5

echo ""
echo "Available package managers:"
which apt yum dnf 2>/dev/null

echo ""
echo "Python version:"
python3 --version 2>/dev/null || echo "Python3 not installed"

echo ""
echo "Node.js version:"
node --version 2>/dev/null || echo "Node.js not installed"

echo ""
echo "Docker status:"
docker --version 2>/dev/null || echo "Docker not installed"
docker ps 2>/dev/null | wc -l || echo "Docker not running"

echo ""
echo "🎯 8. ORACLE CLOUD SPECIFIC"
echo "----------------------------"
echo "Cloud-init logs (recent):"
tail -20 /var/log/cloud-init.log 2>/dev/null || echo "Cloud-init logs not accessible"

echo ""
echo "Instance metadata:"
curl -s http://169.254.169.254/opc/v2/instance/metadata/ 2>/dev/null | head -10 || echo "Instance metadata not accessible"

echo ""
echo "=========================================="
echo "✅ Analysis complete! Please share this output."
echo "==========================================" 