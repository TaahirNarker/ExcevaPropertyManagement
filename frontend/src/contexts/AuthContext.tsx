/**
 * Authentication Context for Property Management System
 * Provides authentication state and methods throughout the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { authService, User, LoginCredentials, RegistrationData, AuthResponse } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Context types
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  loginWithPasskey: (email: string) => Promise<void>;
  registerPasskey: () => Promise<void>;
  isPasskeySupported: boolean;
  refreshProfile: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for provider
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Auto-logout functionality
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_LOGOUT_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  // Check if passkeys are supported
  const isPasskeySupported = authService.isPasskeySupported();

  // Auto-logout functions
  const resetLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    
    if (isAuthenticated) {
      logoutTimerRef.current = setTimeout(async () => {
        toast.error('Session expired due to inactivity. Please log in again.');
        // Use the logout function directly to avoid dependency issues
        try {
          await authService.logout();
          setUser(null);
          setIsAuthenticated(false);
          router.push('/auth/login');
        } catch (error) {
          console.error('Auto-logout error:', error);
        }
      }, AUTO_LOGOUT_DURATION);
    }
  }, [isAuthenticated, router]);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Ensure we set loading to false even if initialization fails
        setLoading(false);
        setUser(null);
        setIsAuthenticated(false);
      }
    };
    
    init();
  }, []);

  // Auto-logout timer management
  useEffect(() => {
    if (isAuthenticated) {
      resetLogoutTimer();
      
      // Set up activity listeners
      const handleActivity = () => {
        resetLogoutTimer();
      };

      // Listen for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });

      return () => {
        clearLogoutTimer();
        events.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
      };
    } else {
      clearLogoutTimer();
    }
  }, [isAuthenticated, resetLogoutTimer, clearLogoutTimer]);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (authService.isAuthenticated()) {
        const userData = authService.getUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          
          // Refresh profile from server - wrapped in try-catch to prevent unhandled promises
          try {
            await refreshProfile();
          } catch (error) {
            console.error('Failed to refresh profile:', error);
            // If refresh fails, user might have invalid token
            try {
              await logout();
            } catch (logoutError) {
              console.error('Failed to logout after refresh error:', logoutError);
              // Manually clear state if logout fails
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        } else {
          // Token exists but no user data, try to fetch profile
          try {
            await refreshProfile();
          } catch (error) {
            console.error('Failed to fetch profile:', error);
            try {
              await logout();
            } catch (logoutError) {
              console.error('Failed to logout after profile fetch error:', logoutError);
              // Manually clear state if logout fails
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login with email and password
  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      const response: AuthResponse = await authService.login(credentials);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      // Reset auto-logout timer on successful login
      resetLogoutTimer();
      
      toast.success(`Welcome back, ${response.user.full_name}!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (data: RegistrationData) => {
    try {
      setLoading(true);
      const response: AuthResponse = await authService.register(data);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      // Reset auto-logout timer on successful registration
      resetLogoutTimer();
      
      toast.success(`Welcome, ${response.user.full_name}! Your account has been created.`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login with passkey
  const loginWithPasskey = async (email: string) => {
    try {
      setLoading(true);
      const response: AuthResponse = await authService.loginWithPasskey(email);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      // Reset auto-logout timer on successful passkey login
      resetLogoutTimer();
      
      toast.success(`Welcome back, ${response.user.full_name}!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Passkey login error:', error);
      toast.error(error instanceof Error ? error.message : 'Passkey login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register a new passkey
  const registerPasskey = async () => {
    try {
      setLoading(true);
      const success = await authService.registerPasskey();
      
      if (success) {
        // Update user data to reflect passkey registration
        const updatedUser = authService.getUser();
        if (updatedUser) {
          setUser(updatedUser);
        }
        
        toast.success('Passkey registered successfully! You can now use Face ID/Touch ID to log in.');
      } else {
        toast.error('Failed to register passkey');
      }
    } catch (error) {
      console.error('Passkey registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to register passkey');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear auto-logout timer on logout
      clearLogoutTimer();
      
      toast.success('Logged out successfully');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      throw error;
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    loginWithPasskey,
    registerPasskey,
    isPasskeySupported,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}

export default AuthContext; 