/**
 * Authentication Utilities
 */
import * as LocalAuthentication from 'expo-local-authentication';
import api from './api';
import {
  storeTokens,
  storeUserData,
  clearTokens,
  getTokens,
  getUserData,
  isBiometricEnabled,
} from './storage';
import {
  LoginResponse,
  OTPRequestResponse,
  OTPVerifyResponse,
  User,
  AuthTokens,
} from '../types';

/**
 * Login with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
      mobile_app: true, // Tell backend this is mobile app
    });

    // API returns data directly, not wrapped in response.data
    if (response.success && response.access_token && response.user) {
      await storeTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token!,
      });
      await storeUserData(response.user);
    }

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Login failed. Please try again.',
      attempts_remaining: error.data?.attempts_remaining,
    };
  }
}

/**
 * Request OTP for mobile login
 */
export async function requestMobileOTP(
  mobile: string,
  deviceId: string
): Promise<OTPRequestResponse> {
  try {
    const response = await api.post<OTPRequestResponse>('/auth/mobile/request-otp', {
      mobile,
      device_id: deviceId,
    });
    // API returns data directly
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Failed to send OTP. Please try again.',
    };
  }
}

/**
 * Verify OTP for mobile login
 */
export async function verifyMobileOTP(
  mobile: string,
  otp: string,
  otpId: string,
  deviceId: string
): Promise<OTPVerifyResponse> {
  try {
    const response = await api.post<OTPVerifyResponse>('/auth/mobile/verify-otp', {
      mobile,
      otp,
      otp_id: otpId,
      device_id: deviceId,
    });

    // API returns data directly
    if (response.success && response.access_token && response.user) {
      await storeTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token!,
      });
      await storeUserData(response.user);
    }

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Invalid OTP. Please try again.',
      attempts_remaining: error.data?.attempts_remaining,
    };
  }
}

/**
 * Verify 2FA code (for email/password login with 2FA enabled)
 */
export async function verify2FACode(
  code: string,
  tempToken: string
): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>('/auth/verify-2fa', {
      code,
      temp_token: tempToken,
      mobile_app: true,
    });

    // API returns data directly
    if (response.success && response.access_token && response.user) {
      await storeTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token!,
      });
      await storeUserData(response.user);
    }

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Invalid code. Please try again.',
    };
  }
}

/**
 * Resend OTP
 */
export async function resendOTP(
  mobile: string,
  deviceId: string
): Promise<OTPRequestResponse> {
  return requestMobileOTP(mobile, deviceId);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await api.post<{ message: string }>('/auth/reset-password/request', { email });
    return { success: true, message: response.message };
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Failed to send reset email.',
    };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await api.post<{ message: string }>('/auth/reset-password/confirm', {
      token,
      new_password: newPassword,
    });
    return { success: true, message: response.message };
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Failed to reset password.',
    };
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors - still clear local tokens
  }
  await clearTokens();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getTokens();
  return tokens !== null;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  return getUserData();
}

/**
 * Refresh user data from server
 */
export async function refreshUserData(): Promise<User | null> {
  try {
    const response = await api.get<{ user: User }>('/auth/me');
    // API returns data directly
    if (response.user) {
      await storeUserData(response.user);
      return response.user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Biometric Authentication
 */

// Check if device supports biometrics
export async function hasBiometricSupport(): Promise<{
  available: boolean;
  biometryType: 'fingerprint' | 'facial' | 'iris' | null;
}> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { available: false, biometryType: null };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { available: false, biometryType: null };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let biometryType: 'fingerprint' | 'facial' | 'iris' | null = null;

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'facial';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometryType = 'iris';
    }

    return { available: true, biometryType };
  } catch {
    // Biometrics not available (e.g., on web)
    return { available: false, biometryType: null };
  }
}

// Authenticate with biometrics
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in to Loanease',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Biometric authentication failed',
    };
  } catch {
    // Biometrics not available (e.g., on web)
    return {
      success: false,
      error: 'Biometric authentication not available',
    };
  }
}

// Login with biometrics (uses stored credentials)
export async function loginWithBiometrics(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  const biometricEnabled = await isBiometricEnabled();
  if (!biometricEnabled) {
    return { success: false, error: 'Biometric login not enabled' };
  }

  const tokens = await getTokens();
  if (!tokens) {
    return { success: false, error: 'No stored credentials' };
  }

  const authResult = await authenticateWithBiometrics();
  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  // Verify tokens are still valid
  try {
    const user = await refreshUserData();
    if (user) {
      return { success: true, user };
    }
    return { success: false, error: 'Session expired. Please log in again.' };
  } catch {
    return { success: false, error: 'Session expired. Please log in again.' };
  }
}

/**
 * Signup
 */
export interface SignupData {
  // Director info
  first_name: string;
  surname: string;
  phone: string;
  email: string;
  password: string;

  // Company info
  abn: string;
  entity_name: string;
  trading_name?: string;
  address: string;
  entity_type: string;
  industry_type: string;

  // Additional directors
  additional_directors?: Array<{
    first_name: string;
    surname: string;
  }>;

  // Terms
  terms_accepted: boolean;
}

export async function signup(data: SignupData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await api.post<{ success: boolean; message?: string }>('/auth/mobile/signup', data);
    // API returns data directly
    return { success: response.success !== false, message: response.message };
  } catch (error: any) {
    return {
      success: false,
      error: error.data?.error || error.message || 'Signup failed. Please try again.',
    };
  }
}

/**
 * Check email availability
 */
export async function checkEmailAvailability(email: string): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    const response = await api.get<{ available: boolean }>('/auth/check-email', { email });
    // API returns data directly
    return { available: response.available !== false };
  } catch (error: any) {
    // If API call fails (e.g., network error), assume email is available
    // Server will validate during actual signup
    console.log('Email check failed, assuming available:', error);
    return { available: true };
  }
}
