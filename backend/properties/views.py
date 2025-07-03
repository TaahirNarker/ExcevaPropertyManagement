from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from .models import Property, Unit
from .serializers import PropertySerializer, UnitSerializer


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.filter(is_active=True)
    serializer_class = PropertySerializer
    permission_classes = [AllowAny]  # Allow public access for development
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(address__icontains=search)
            )
        return queryset
    
    @action(detail=True, methods=['get'])
    def units(self, request, pk=None):
        """Get all units for a specific property"""
        property_instance = self.get_object()
        units = property_instance.units.filter(is_active=True)
        serializer = UnitSerializer(units, many=True)
        return Response(serializer.data)


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.filter(is_active=True)
    serializer_class = UnitSerializer
    permission_classes = [AllowAny]  # Allow public access for development
    
    def get_queryset(self):
        queryset = super().get_queryset()
        property_id = self.request.query_params.get('property_id', None)
        if property_id:
            queryset = queryset.filter(property_ref_id=property_id)
        return queryset
