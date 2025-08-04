"""
Serializers for user authentication and profile management.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from .models import CustomUser


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name', 
                 'phone_number', 'company', 'role')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'default': 'basic_user'},
        }
    
    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def validate_email(self, value):
        """Validate that email is unique."""
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists")
        return value
    
    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Use email as username
        validated_data['username'] = validated_data['email']
        
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information."""
    full_name = serializers.SerializerMethodField()
    has_passkey = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'full_name',
                 'phone_number', 'company', 'role', 'date_joined', 'last_login',
                 'has_passkey')
        read_only_fields = ('id', 'email', 'username', 'date_joined', 'last_login', 'has_passkey')
    
    def get_full_name(self, obj):
        """Get user's full name."""
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email
    
    def get_has_passkey(self, obj):
        """Check if user has a registered passkey."""
        return hasattr(obj, 'webauthn_credentials') and bool(obj.webauthn_credentials)


class WebAuthnCredentialSerializer(serializers.Serializer):
    """Serializer for WebAuthn credential data."""
    credential_id = serializers.CharField()
    public_key = serializers.CharField()
    sign_count = serializers.IntegerField()
    
    def validate(self, attrs):
        """Validate credential data."""
        # Add any additional validation here
        return attrs


class LoginSerializer(serializers.Serializer):
    """Serializer for email/password login."""
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        """Validate login credentials."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user = CustomUser.objects.get(email=email)
                if not user.check_password(password):
                    raise serializers.ValidationError('Invalid email or password')
                
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled')
                
                attrs['user'] = user
                return attrs
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError('Invalid email or password')
        else:
            raise serializers.ValidationError('Must include email and password')


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate that user exists."""
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs 