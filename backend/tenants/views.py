from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Q
from .models import Tenant, Lease
from .serializers import TenantSerializer, LeaseSerializer

# Create your views here.

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.filter(is_active=True)
    serializer_class = TenantSerializer
    permission_classes = [AllowAny]  # Allow public access for development
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(id_number__icontains=search)
            )
        return queryset


class LeaseViewSet(viewsets.ModelViewSet):
    queryset = Lease.objects.filter(is_active=True)
    serializer_class = LeaseSerializer
    permission_classes = [AllowAny]  # Allow public access for development
    
    def get_queryset(self):
        queryset = super().get_queryset()
        tenant_id = self.request.query_params.get('tenant_id', None)
        unit_id = self.request.query_params.get('unit_id', None)
        status = self.request.query_params.get('status', None)
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset
