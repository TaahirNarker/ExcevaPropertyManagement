#!/usr/bin/env python3
"""
Deployment Webhook Script
This script can be run on the server to restart services via HTTP requests.
"""

import subprocess
import sys
import os
import signal
import time

def run_command(command, description):
    """Run a shell command and return success status."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout:
                print(f"📝 Output: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ {description} failed")
            if result.stderr:
                print(f"🚨 Error: {result.stderr.strip()}")
            return False
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"💥 {description} failed with exception: {e}")
        return False

def restart_services():
    """Restart all services using PM2."""
    print("🚀 Starting service restart process...")
    
    # Navigate to project directory
    project_dir = "/var/www/ExcevaPropertyManagement"
    if not os.path.exists(project_dir):
        print(f"❌ Project directory not found: {project_dir}")
        return False
    
    os.chdir(project_dir)
    print(f"📁 Working directory: {os.getcwd()}")
    
    # Check PM2 status
    print("🔍 Checking PM2 status...")
    pm2_status = subprocess.run("pm2 status", shell=True, capture_output=True, text=True)
    print(pm2_status.stdout)
    
    # Restart all PM2 processes
    success = run_command("pm2 restart all", "Restarting all PM2 processes")
    
    if not success:
        print("⚠️ PM2 restart failed, attempting to start services individually...")
        
        # Start backend
        backend_success = run_command(
            "cd backend && pm2 start start_production.sh --name exceva-backend",
            "Starting backend service"
        )
        
        # Start frontend
        frontend_success = run_command(
            "cd frontend && pm2 start 'npm run start' --name exceva-frontend",
            "Starting frontend service"
        )
        
        success = backend_success and frontend_success
    
    # Show final status
    print("\n📊 Final PM2 Status:")
    subprocess.run("pm2 status", shell=True)
    
    return success

def main():
    """Main function."""
    print("🚀 Exceva Property Management - Service Restart Webhook")
    print("=" * 60)
    
    try:
        success = restart_services()
        
        if success:
            print("\n✅ Service restart completed successfully!")
            print("🌐 Check status at: https://propman.exceva.capital/api/health/")
            sys.exit(0)
        else:
            print("\n❌ Service restart failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
