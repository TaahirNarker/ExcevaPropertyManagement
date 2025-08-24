"""
Deploy Webhook Views
HTTP endpoints for triggering service restarts and deployments.
"""

import subprocess
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def restart_services(request):
    """
    Webhook endpoint to restart all services.
    This bypasses the need for SSH access.
    """
    try:
        # Log the request
        logger.info("Service restart webhook triggered")
        
        # Run the restart script
        result = subprocess.run(
            ["python3", "deploy_webhook.py"],
            cwd="/var/www/ExcevaPropertyManagement",
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            logger.info("Service restart completed successfully")
            return JsonResponse({
                "status": "success",
                "message": "Services restarted successfully",
                "output": result.stdout
            })
        else:
            logger.error(f"Service restart failed: {result.stderr}")
            return JsonResponse({
                "status": "error",
                "message": "Service restart failed",
                "error": result.stderr
            }, status=500)
            
    except subprocess.TimeoutExpired:
        logger.error("Service restart timed out")
        return JsonResponse({
            "status": "error",
            "message": "Service restart timed out"
        }, status=408)
        
    except Exception as e:
        logger.error(f"Unexpected error in restart webhook: {e}")
        return JsonResponse({
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    Enhanced health check endpoint.
    """
    try:
        # Check if backend services are running
        pm2_status = subprocess.run(
            ["pm2", "status"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if pm2_status.returncode == 0:
            return JsonResponse({
                "status": "healthy",
                "message": "Backend services are running",
                "pm2_status": pm2_status.stdout
            })
        else:
            return JsonResponse({
                "status": "unhealthy",
                "message": "Backend services are not running",
                "pm2_status": pm2_status.stderr
            }, status=503)
            
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JsonResponse({
            "status": "error",
            "message": f"Health check failed: {str(e)}"
        }, status=500)
