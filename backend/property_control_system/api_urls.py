from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

# Create placeholder API views for development
@api_view(['GET', 'POST'])
def placeholder_list_view(request):
    """Placeholder view that returns empty list for GET and accepts POST"""
    if request.method == 'GET':
        return Response([])
    elif request.method == 'POST':
        return Response({'message': 'Created successfully'}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def placeholder_detail_view(request, pk=None):
    """Placeholder view for detail operations"""
    if request.method == 'GET':
        return Response({'id': pk, 'message': 'Placeholder detail view'})
    elif request.method in ['PUT', 'PATCH']:
        return Response({'id': pk, 'message': 'Updated successfully'})
    elif request.method == 'DELETE':
        return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# User management endpoint (admin only)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_users(request):
    """
    List all users - Only accessible by admin users
    Returns user information for management purposes
    """
    users = User.objects.all().order_by('-date_joined')
    user_data = []
    
    for user in users:
        user_data.append({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name(),
            'phone_number': user.phone_number,
            'is_landlord': user.is_landlord,
            'is_tenant': user.is_tenant,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'has_passkey': user.has_passkey,
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
        })
    
    return Response({
        'count': len(user_data),
        'users': user_data
    })

# API URL patterns
urlpatterns = [
    # User management endpoints
    path('users/', list_users, name='list-users'),
    
    # Placeholder endpoints for frontend development
    path('properties/', placeholder_list_view, name='properties-list'),
    path('properties/<str:pk>/', placeholder_detail_view, name='properties-detail'),
    
    path('tenants/', placeholder_list_view, name='tenants-list'),
    path('tenants/<str:pk>/', placeholder_detail_view, name='tenants-detail'),
    
    path('units/', placeholder_list_view, name='units-list'),
    path('units/<str:pk>/', placeholder_detail_view, name='units-detail'),
    
    path('leases/', placeholder_list_view, name='leases-list'),
    path('leases/<str:pk>/', placeholder_detail_view, name='leases-detail'),
    
    path('payments/', placeholder_list_view, name='payments-list'),
    path('payments/<str:pk>/', placeholder_detail_view, name='payments-detail'),
] 