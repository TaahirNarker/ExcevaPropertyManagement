/**
 * Login Form Component - Optimized for Performance
 * Handles email/password login and passkey authentication
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon,
  FaceSmileIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  const { login, loginWithPasskey, isPasskeySupported, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isPasskeyLogin, setIsPasskeyLogin] = useState(false);
  const [passkeyEmail, setPasskeyEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<LoginFormData>();

  // Handle email/password login
  const onSubmit = useCallback(async (data: LoginFormData) => {
    try {
      await login(data);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [login]);

  // Handle passkey login
  const handlePasskeyLogin = useCallback(async () => {
    if (!passkeyEmail) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      await loginWithPasskey(passkeyEmail);
    } catch (error) {
      console.error('Passkey login failed:', error);
    }
  }, [passkeyEmail, loginWithPasskey]);

  // Switch between login methods
  const switchToPasskey = useCallback(() => {
    setIsPasskeyLogin(true);
    const currentEmail = getValues('email');
    if (currentEmail) {
      setPasskeyEmail(currentEmail);
    }
  }, [getValues]);

  const switchToPassword = useCallback(() => {
    setIsPasskeyLogin(false);
  }, []);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Memoize the login method toggle buttons
  const loginMethodToggle = useMemo(() => {
    if (!isPasskeySupported) return null;

    return (
      <div className="flex mb-6 p-1 bg-white/5 rounded-lg border border-white/10">
        <button
          type="button"
          onClick={switchToPassword}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
            !isPasskeyLogin
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={switchToPasskey}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
            isPasskeyLogin
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Passkey
        </button>
      </div>
    );
  }, [isPasskeySupported, isPasskeyLogin, switchToPassword, switchToPasskey]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-300">Sign in to your property management account</p>
        </div>

        {/* Login Method Toggle */}
        {loginMethodToggle}

        {/* Login Forms */}
        <div className="transition-opacity duration-300">
          {isPasskeyLogin ? (
            // Passkey Login Form
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={passkeyEmail}
                    onChange={(e) => setPasskeyEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading || !passkeyEmail}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaceSmileIcon className="h-5 w-5" />
                    <span>Continue with Face ID / Touch ID</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-400">
                  Use your device's biometric authentication or security key
                </p>
              </div>
            </div>
          ) : (
            // Email/Password Login Form
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Please enter a valid email address',
                      },
                    })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting || loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 