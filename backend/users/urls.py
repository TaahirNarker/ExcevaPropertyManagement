"""
URL configuration for users app.
Handles authentication, registration, and user management endpoints.
"""
from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # User registration and profile management
    path('register/', views.RegisterView.as_view(), name='register'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    
    # WebAuthn/Passkeys endpoints
    path('webauthn/register/begin/', views.WebAuthnRegisterBeginView.as_view(), name='webauthn_register_begin'),
    path('webauthn/register/complete/', views.WebAuthnRegisterCompleteView.as_view(), name='webauthn_register_complete'),
    path('webauthn/login/begin/', views.WebAuthnLoginBeginView.as_view(), name='webauthn_login_begin'),
    path('webauthn/login/complete/', views.WebAuthnLoginCompleteView.as_view(), name='webauthn_login_complete'),
    
    # User management
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
] 