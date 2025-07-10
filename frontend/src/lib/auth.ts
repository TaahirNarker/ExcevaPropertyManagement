/**
 * Authentication service for Property Management System
 * Handles login, registration, JWT token management, and WebAuthn/passkeys
 */

import { z } from 'zod';
import Cookies from 'js-cookie';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// API Base URL - updated for production deployment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://propman.exceva.capital/api'
  : 'http://127.0.0.1:8000/api';

// WebAuthn Configuration
const WEBAUTHN_ORIGIN = process.env.NODE_ENV === 'production'
  ? 'https://propman.exceva.capital'
  : 'http://localhost:3000';

const WEBAUTHN_RP_ID = process.env.NODE_ENV === 'production'
  ? 'propman.exceva.capital'
  : 'localhost';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  is_landlord: boolean;
  is_tenant: boolean;
  date_joined: string;
  last_login: string;
  has_passkey: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_landlord?: boolean;
  is_tenant?: boolean;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

class AuthService {
  private baseUrl = API_BASE_URL;

  /**
   * Token Management
   */
  
  // Store tokens securely
  private setTokens(tokens: AuthTokens): void {
    Cookies.set(ACCESS_TOKEN_KEY, tokens.access, {
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refresh, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  // Get access token
  getAccessToken(): string | null {
    return Cookies.get(ACCESS_TOKEN_KEY) || null;
  }

  // Get refresh token
  getRefreshToken(): string | null {
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
  }

  // Clear tokens
  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Store user data
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Get user data
  getUser(): User | null {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Authentication Methods
   */

  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store tokens and user data
    this.setTokens({ access: data.access, refresh: data.refresh });
    this.setUser(data.user);
    
    return data;
  }

  // Register new user
  async register(registrationData: RegistrationData): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(Object.values(error).flat().join(', ') || 'Registration failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store tokens and user data
    this.setTokens({ access: data.access, refresh: data.refresh });
    this.setUser(data.user);
    
    return data;
  }

  // Refresh access token
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Update access token
    Cookies.set(ACCESS_TOKEN_KEY, data.access, {
      expires: 1,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    return data.access;
  }

  // Logout user
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      try {
        await fetch(`${this.baseUrl}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    
    this.clearTokens();
  }

  /**
   * WebAuthn/Passkeys Methods
   */

  // Register a new passkey
  async registerPasskey(): Promise<boolean> {
    try {
      console.log('🔐 Starting passkey registration...');
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        throw new Error('User must be logged in to register passkey');
      }

      console.log('🔐 Beginning passkey registration...');
      // Start registration
      const beginResponse = await fetch(`${this.baseUrl}/auth/webauthn/register/begin/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('🔐 Begin response status:', beginResponse.status);

      if (!beginResponse.ok) {
        const errorData = await beginResponse.json().catch(() => null);
        const errorMessage = errorData?.error || 'Failed to begin passkey registration';
        console.error('🔐 Begin request failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const { options } = await beginResponse.json();
      console.log('🔐 Registration options received:', options);

      // Import the WebAuthn client library
      const { startRegistration } = await import('@simplewebauthn/browser');
      console.log('🔐 SimpleWebAuthn library imported');

      // Start WebAuthn registration with origin and rpId
      console.log('🔐 Starting WebAuthn registration with browser...');
      const origin = WEBAUTHN_ORIGIN;
      const rpId = WEBAUTHN_RP_ID;
      if (!origin || !rpId) {
        throw new Error('WebAuthn configuration not available');
      }
      const attResp = await startRegistration({
        ...options,
        origin,
        rpId
      });
      console.log('🔐 WebAuthn registration completed:', attResp);

      // Complete registration
      console.log('🔐 Completing registration with server...');
      const completeResponse = await fetch(`${this.baseUrl}/auth/webauthn/register/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ credential: attResp }),
      });

      console.log('🔐 Complete response status:', completeResponse.status);

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => null);
        const errorMessage = errorData?.error || 'Failed to complete passkey registration';
        console.error('🔐 Complete request failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await completeResponse.json();
      console.log('🔐 Registration result:', result);
      
      // Update user data to reflect passkey registration
      const user = this.getUser();
      if (user) {
        user.has_passkey = true;
        this.setUser(user);
      }

      console.log('🔐 Passkey registration successful!');
      return result.verified;
    } catch (error) {
      console.error('🔐 Passkey registration failed:', error);
      throw error;
    }
  }

  // Login with passkey
  async loginWithPasskey(email: string): Promise<AuthResponse> {
    try {
      // Start authentication
      const beginResponse = await fetch(`${this.baseUrl}/auth/webauthn/login/begin/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!beginResponse.ok) {
        const error = await beginResponse.json();
        throw new Error(error.error || 'Failed to begin passkey login');
      }

      const { options } = await beginResponse.json();

      // Start WebAuthn authentication with origin and rpId
      const origin = WEBAUTHN_ORIGIN;
      const rpId = WEBAUTHN_RP_ID;
      if (!origin || !rpId) {
        throw new Error('WebAuthn configuration not available');
      }
      const authResp = await startAuthentication({
        ...options,
        origin,
        rpId
      });

      // Complete authentication
      const completeResponse = await fetch(`${this.baseUrl}/auth/webauthn/login/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: authResp, email: email }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete passkey login');
      }

      const data: AuthResponse = await completeResponse.json();
      
      // Store tokens and user data
      this.setTokens({ access: data.access, refresh: data.refresh });
      this.setUser(data.user);
      
      return data;
    } catch (error) {
      console.error('Passkey login failed:', error);
      throw error;
    }
  }

  // Check if passkeys are supported
  isPasskeySupported(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  }

  // Get user profile
  async getProfile(): Promise<User> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/profile/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        await this.refreshToken();
        return this.getProfile();
      }
      throw new Error('Failed to fetch profile');
    }

    const user: User = await response.json();
    this.setUser(user);
    return user;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService; 