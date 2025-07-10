"""
User authentication views for the property management system.
Handles registration, login, profile management, and WebAuthn/passkeys.
"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import TokenError
import json
import base64
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    PublicKeyCredentialDescriptor,
    PublicKeyCredentialType,
)
from .models import CustomUser
from .serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    WebAuthnCredentialSerializer,
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer that adds user information to the token."""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['is_landlord'] = user.is_landlord
        token['is_tenant'] = user.is_tenant
        return token


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    queryset = CustomUser.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens for the new user
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile management endpoint."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """Logout endpoint that blacklists the refresh token."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """List all users (admin only)."""
    queryset = CustomUser.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAdminUser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """User detail view (admin only)."""
    queryset = CustomUser.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAdminUser]


# WebAuthn/Passkeys Views
class WebAuthnRegisterBeginView(APIView):
    """Begin WebAuthn registration process."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            
            # Generate registration options
            options = generate_registration_options(
                rp_id=settings.WEBAUTHN_RP_ID,
                rp_name=settings.WEBAUTHN_RP_NAME,
                user_id=str(user.id).encode('utf-8'),
                user_name=user.email,
                user_display_name=f"{user.first_name} {user.last_name}".strip() or user.email,
                authenticator_selection=AuthenticatorSelectionCriteria(
                    resident_key=ResidentKeyRequirement.PREFERRED,
                    user_verification=UserVerificationRequirement.PREFERRED,
                ),
            )
            
            # Store challenge in session for verification
            request.session['webauthn_challenge'] = options.challenge
            
            return Response({
                'options': {
                    'rp': {'id': options.rp.id, 'name': options.rp.name},
                    'user': {
                        'id': base64.b64encode(options.user.id).decode('utf-8'),
                        'name': options.user.name,
                        'displayName': options.user.display_name,
                    },
                    'challenge': base64.b64encode(options.challenge).decode('utf-8'),
                    'pubKeyCredParams': [{'alg': param.alg, 'type': param.type} for param in options.pub_key_cred_params],
                    'timeout': options.timeout,
                    'excludeCredentials': [],
                    'authenticatorSelection': {
                        'residentKey': options.authenticator_selection.resident_key if options.authenticator_selection else 'preferred',
                        'userVerification': options.authenticator_selection.user_verification if options.authenticator_selection else 'preferred',
                    },
                    'attestation': options.attestation,
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnRegisterCompleteView(APIView):
    """Complete WebAuthn registration process."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            credential_data = request.data.get('credential')
            challenge = request.session.get('webauthn_challenge')
            
            if not challenge:
                return Response({'error': 'No challenge found'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify the registration response
            verification = verify_registration_response(
                credential=credential_data,
                expected_challenge=challenge,
                expected_origin=settings.WEBAUTHN_ORIGIN,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
            )
            
            if verification.verified:
                # Save the credential to the user
                user.webauthn_credentials = json.dumps({
                    'credential_id': base64.b64encode(verification.credential_id).decode('utf-8'),
                    'public_key': base64.b64encode(verification.credential_public_key).decode('utf-8'),
                    'sign_count': verification.sign_count,
                })
                user.save()
                
                # Clear the challenge
                del request.session['webauthn_challenge']
                
                return Response({'verified': True, 'message': 'Passkey registered successfully'})
            else:
                return Response({'verified': False, 'error': 'Registration failed'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnLoginBeginView(APIView):
    """Begin WebAuthn login process."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            
            if not email:
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if user has WebAuthn credentials
            if not hasattr(user, 'webauthn_credentials') or not user.webauthn_credentials:
                return Response({'error': 'No passkey found for this user'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate authentication options
            options = generate_authentication_options(
                rp_id=settings.WEBAUTHN_RP_ID,
                user_verification=UserVerificationRequirement.PREFERRED,
            )
            
            # Store challenge in session for verification
            request.session['webauthn_challenge'] = options.challenge
            request.session['webauthn_user_id'] = user.id
            
            return Response({
                'options': {
                    'challenge': base64.b64encode(options.challenge).decode('utf-8'),
                    'timeout': options.timeout,
                    'rpId': options.rp_id,
                    'allowCredentials': [],
                    'userVerification': options.user_verification,
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnLoginCompleteView(APIView):
    """Complete WebAuthn login process."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            credential_data = request.data.get('credential')
            challenge = request.session.get('webauthn_challenge')
            user_id = request.session.get('webauthn_user_id')
            
            if not challenge or not user_id:
                return Response({'error': 'No challenge or user found'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = CustomUser.objects.get(id=user_id)
            except CustomUser.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get stored credentials
            stored_credentials = json.loads(user.webauthn_credentials)
            
            # Verify the authentication response
            verification = verify_authentication_response(
                credential=credential_data,
                expected_challenge=challenge,
                expected_origin=settings.WEBAUTHN_ORIGIN,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
                credential_public_key=base64.b64decode(stored_credentials['public_key']),
                credential_current_sign_count=stored_credentials['sign_count'],
            )
            
            if verification.verified:
                # Update sign count
                stored_credentials['sign_count'] = verification.new_sign_count
                user.webauthn_credentials = json.dumps(stored_credentials)
                user.save()
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                
                # Clear session data
                del request.session['webauthn_challenge']
                del request.session['webauthn_user_id']
                
                return Response({
                    'verified': True,
                    'user': UserProfileSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            else:
                return Response({'verified': False, 'error': 'Authentication failed'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
