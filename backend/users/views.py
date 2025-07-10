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
    LoginSerializer,
)
from django.utils import timezone


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


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view that returns user data along with tokens."""
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response({'detail': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get user from validated data
        user = serializer.user
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


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
            print(f"DEBUG: Starting WebAuthn registration for user {user.id}")
            print(f"DEBUG: User type: {type(user)}")
            print(f"DEBUG: User ID type: {type(user.id)}")
            print(f"DEBUG: User email: {user.email}")
            
            # Test user data conversion
            try:
                user_id_str = str(user.id)
                print(f"DEBUG: User ID string: {user_id_str}")
                user_display_name = f"{user.first_name} {user.last_name}".strip() or user.email
                print(f"DEBUG: User display name: {user_display_name}")
            except Exception as e:
                print(f"DEBUG: Error converting user data: {str(e)}")
                raise
            
            # Generate registration options step by step
            try:
                print(f"DEBUG: About to call generate_registration_options")
                options = generate_registration_options(
                    rp_id=settings.WEBAUTHN_RP_ID,
                    rp_name=settings.WEBAUTHN_RP_NAME,
                    user_id=user_id_str,  # Use the string we just created
                    user_name=user.email,
                    user_display_name=user_display_name,
                    authenticator_selection=AuthenticatorSelectionCriteria(
                        resident_key=ResidentKeyRequirement.PREFERRED,
                        user_verification=UserVerificationRequirement.PREFERRED,
                    ),
                )
                print(f"DEBUG: Generated options successfully")
                print(f"DEBUG: Challenge type: {type(options.challenge)}")
                print(f"DEBUG: User ID type from options: {type(options.user.id)}")
            except Exception as e:
                print(f"DEBUG: Error generating registration options: {str(e)}")
                import traceback
                traceback.print_exc()
                raise
            
            # Store challenge in user model for verification
            try:
                challenge_b64 = base64.b64encode(options.challenge).decode('utf-8')
                user.webauthn_challenge = challenge_b64
                user.save()
                print(f"DEBUG: Challenge stored successfully")
            except Exception as e:
                print(f"DEBUG: Error storing challenge: {str(e)}")
                raise
            
            # Prepare response data
            try:
                print(f"DEBUG: Preparing response data")
                response_data = {
                    'options': {
                        'rp': {
                            'id': options.rp.id, 
                            'name': options.rp.name
                        },
                        'user': {
                            'id': base64.b64encode(options.user.id).decode('utf-8'),
                            'name': options.user.name,
                            'displayName': options.user.display_name,
                        },
                        'challenge': base64.b64encode(options.challenge).decode('utf-8'),
                        'pubKeyCredParams': [
                            {'alg': param.alg, 'type': param.type} 
                            for param in options.pub_key_cred_params
                        ],
                        'timeout': options.timeout,
                        'excludeCredentials': [],
                        'authenticatorSelection': {
                            'residentKey': (
                                options.authenticator_selection.resident_key 
                                if options.authenticator_selection 
                                else 'preferred'
                            ),
                            'userVerification': (
                                options.authenticator_selection.user_verification 
                                if options.authenticator_selection 
                                else 'preferred'
                            ),
                        },
                        'attestation': options.attestation,
                    }
                }
                print(f"DEBUG: Response data prepared successfully")
                return Response(response_data)
            except Exception as e:
                print(f"DEBUG: Error preparing response data: {str(e)}")
                import traceback
                traceback.print_exc()
                raise
            
        except Exception as e:
            print(f"DEBUG: Error in WebAuthn registration begin: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnRegisterCompleteView(APIView):
    """Complete WebAuthn registration process."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            credential_data = request.data.get('credential')
            challenge = user.webauthn_challenge
            
            print(f"DEBUG: WebAuthn registration complete for user {user.id}")
            print(f"DEBUG: Challenge found: {bool(challenge)}")
            
            if not challenge:
                return Response({'error': 'No challenge found'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Decode the challenge
            challenge_bytes = base64.b64decode(challenge)
            
            print(f"DEBUG: About to verify registration response")
            
            # Verify the registration response
            verification = verify_registration_response(
                credential=credential_data,
                expected_challenge=challenge_bytes,
                expected_origin=settings.WEBAUTHN_ORIGIN,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
            )
            
            print(f"DEBUG: Verification completed")
            print(f"DEBUG: Verification object type: {type(verification)}")
            print(f"DEBUG: Verification object attributes: {dir(verification)}")
            
            # Check if verification was successful
            # Note: VerifiedRegistration object may not have 'verified' attribute
            # Let's check if verification object exists and has credential data
            if verification and hasattr(verification, 'credential_id'):
                print(f"DEBUG: Registration verification successful")
                
                # Store the credential
                import json
                
                print(f"DEBUG: credential_id type: {type(verification.credential_id)}")
                print(f"DEBUG: public_key type: {type(verification.credential_public_key)}")
                
                credential_info = {
                    'id': base64.b64encode(verification.credential_id).decode('utf-8'),
                    'public_key': base64.b64encode(verification.credential_public_key).decode('utf-8'),
                    'sign_count': verification.sign_count,
                    'created_at': str(timezone.now()),
                }
                
                print(f"DEBUG: Credential info created successfully")
                
                # Store in user model
                user.webauthn_credentials = json.dumps(credential_info)
                user.webauthn_challenge = None  # Clear the challenge
                user.save()
                
                print(f"DEBUG: User updated successfully, passkey registered")
                
                return Response({'verified': True})
            else:
                print(f"DEBUG: Verification failed - no credential_id found")
                return Response({'error': 'Verification failed'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"DEBUG: Error in WebAuthn registration complete: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnLoginBeginView(APIView):
    """Begin WebAuthn login process."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            print(f"DEBUG: Starting WebAuthn login begin")
            
            email = request.data.get('email')
            print(f"DEBUG: Email: {email}")
            
            if not email:
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = CustomUser.objects.get(email=email)
                print(f"DEBUG: User found: {user.email}")
            except CustomUser.DoesNotExist:
                print(f"DEBUG: User not found for email: {email}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if user has WebAuthn credentials
            if not hasattr(user, 'webauthn_credentials') or not user.webauthn_credentials:
                print(f"DEBUG: No passkey found for user")
                return Response({'error': 'No passkey found for this user'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get stored credentials
            stored_credentials = json.loads(user.webauthn_credentials)
            print(f"DEBUG: Stored credentials loaded successfully")
            
            # Create allowCredentials array with the user's credential ID
            allow_credentials = [{
                'type': 'public-key',
                'id': stored_credentials['id'],  # This is already base64 encoded
                'transports': ['usb', 'ble', 'nfc', 'internal']
            }]
            
            print(f"DEBUG: Allow credentials created: {len(allow_credentials)} credentials")
            
            # Generate authentication options
            options = generate_authentication_options(
                rp_id=settings.WEBAUTHN_RP_ID,
                user_verification=UserVerificationRequirement.PREFERRED,
            )
            
            print(f"DEBUG: Authentication options generated successfully")
            
            # Store challenge in user model for verification
            user.webauthn_challenge = base64.b64encode(options.challenge).decode('utf-8')
            user.save()
            
            print(f"DEBUG: Challenge stored successfully")
            
            return Response({
                'options': {
                    'challenge': base64.b64encode(options.challenge).decode('utf-8'),
                    'timeout': options.timeout,
                    'rpId': options.rp_id,
                    'allowCredentials': allow_credentials,
                    'userVerification': options.user_verification,
                }
            })
        except Exception as e:
            print(f"DEBUG: Error in WebAuthn login begin: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnLoginCompleteView(APIView):
    """Complete WebAuthn login process."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            print(f"DEBUG: Starting WebAuthn login complete")
            
            credential_data = request.data.get('credential')
            email = request.data.get('email')
            
            print(f"DEBUG: Email: {email}")
            print(f"DEBUG: Credential data received: {credential_data is not None}")
            
            if not email:
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = CustomUser.objects.get(email=email)
                print(f"DEBUG: User found: {user.email}")
            except CustomUser.DoesNotExist:
                print(f"DEBUG: User not found for email: {email}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            challenge = user.webauthn_challenge
            
            if not challenge:
                print(f"DEBUG: No challenge found for user")
                return Response({'error': 'No challenge found'}, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"DEBUG: Challenge found: {challenge[:20]}...")
            
            # Decode the challenge
            challenge_bytes = base64.b64decode(challenge)
            print(f"DEBUG: Challenge decoded successfully")
            
            # Get stored credentials
            if not user.webauthn_credentials:
                print(f"DEBUG: No stored credentials found for user")
                return Response({'error': 'No stored credentials found'}, status=status.HTTP_400_BAD_REQUEST)
            
            stored_credentials = json.loads(user.webauthn_credentials)
            print(f"DEBUG: Stored credentials loaded successfully")
            
            # Verify the authentication response
            print(f"DEBUG: About to verify authentication response")
            verification = verify_authentication_response(
                credential=credential_data,
                expected_challenge=challenge_bytes,
                expected_origin=settings.WEBAUTHN_ORIGIN,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
                credential_public_key=base64.b64decode(stored_credentials['public_key']),
                credential_current_sign_count=stored_credentials['sign_count'],
            )
            
            print(f"DEBUG: Authentication verification completed")
            print(f"DEBUG: Verification object type: {type(verification)}")
            print(f"DEBUG: Verification object attributes: {dir(verification)}")
            
            # Check if verification was successful
            # The verification object should have the result - let's check its attributes
            if verification and hasattr(verification, 'new_sign_count'):
                print(f"DEBUG: Authentication verification successful")
                
                # Update sign count
                stored_credentials['sign_count'] = verification.new_sign_count
                user.webauthn_credentials = json.dumps(stored_credentials)
                user.webauthn_challenge = None  # Clear the challenge
                user.save()
                
                print(f"DEBUG: User credentials updated successfully")
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                
                print(f"DEBUG: JWT tokens generated successfully")
                
                return Response({
                    'verified': True,
                    'user': UserProfileSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            else:
                print(f"DEBUG: Authentication verification failed - no new_sign_count found")
                return Response({'verified': False, 'error': 'Authentication failed'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"DEBUG: Error in WebAuthn login complete: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WebAuthnTestView(APIView):
    """Test WebAuthn library imports and basic functionality."""
    permission_classes = [permissions.AllowAny]  # Allow without authentication for debugging
    
    def get(self, request):
        try:
            print(f"DEBUG: Starting WebAuthn registration options test")
            
            # Test 1: WebAuthn imports
            from webauthn import generate_registration_options
            print("DEBUG: WebAuthn imports successful")
            
            # Test 2: Generate registration options with string user_id
            try:
                print(f"DEBUG: Testing registration options generation with string user_id")
                options = generate_registration_options(
                    rp_id="localhost",
                    rp_name="Test",
                    user_id="test123",  # Using string instead of bytes
                    user_name="test@example.com",
                    user_display_name="Test User",
                )
                print(f"DEBUG: Registration options generated successfully")
                print(f"DEBUG: Challenge type: {type(options.challenge)}")
                print(f"DEBUG: User ID type: {type(options.user.id)}")
                return Response({'status': 'options_generation_success'})
            except Exception as e:
                print(f"DEBUG: Registration options generation failed: {str(e)}")
                raise
            
        except Exception as e:
            print(f"DEBUG: WebAuthn options test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
