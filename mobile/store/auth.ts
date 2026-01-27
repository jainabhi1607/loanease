/**
 * Auth Store using Zustand
 * Manages authentication state across the app
 */
import { create } from 'zustand';
import { User } from '../types';
import {
  loginWithEmail,
  loginWithBiometrics,
  requestMobileOTP,
  verifyMobileOTP,
  verify2FACode,
  logout as authLogout,
  getCurrentUser,
  refreshUserData,
  hasBiometricSupport,
} from '../lib/auth';
import { getTokens, setBiometricEnabled, isBiometricEnabled } from '../lib/storage';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 2FA / OTP state
  requires2FA: boolean;
  tempToken: string | null;
  otpId: string | null;
  pendingMobile: string | null;

  // Biometric
  biometricAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | null;
  biometricEnabled: boolean;

  // Actions
  initialize: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<boolean>;
  loginBiometric: () => Promise<boolean>;
  requestOTP: (mobile: string, deviceId: string) => Promise<boolean>;
  verifyOTP: (otp: string, deviceId: string) => Promise<boolean>;
  verify2FA: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setBiometric: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  requires2FA: false,
  tempToken: null,
  otpId: null,
  pendingMobile: null,

  biometricAvailable: false,
  biometricType: null,
  biometricEnabled: false,

  // Initialize auth state on app start
  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      // Check biometric support
      const biometric = await hasBiometricSupport();
      const biometricEnabled = await isBiometricEnabled();

      // Check for existing tokens
      const tokens = await getTokens();
      if (tokens) {
        const user = await getCurrentUser();
        if (user) {
          set({
            user,
            isAuthenticated: true,
            biometricAvailable: biometric.available,
            biometricType: biometric.biometryType,
            biometricEnabled,
          });
        }
      } else {
        set({
          biometricAvailable: biometric.available,
          biometricType: biometric.biometryType,
          biometricEnabled,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Login with email/password
  loginEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await loginWithEmail(email, password);

      if (result.success) {
        if (result.requires_2fa) {
          set({
            requires2FA: true,
            tempToken: result.temp_token || null,
            isLoading: false,
          });
          return true;
        }

        set({
          user: result.user!,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      set({
        error: result.error || 'Login failed',
        isLoading: false,
      });
      return false;
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      return false;
    }
  },

  // Login with biometrics
  loginBiometric: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await loginWithBiometrics();

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      set({
        error: result.error || 'Biometric login failed',
        isLoading: false,
      });
      return false;
    } catch (error: any) {
      set({
        error: error.message || 'Biometric login failed',
        isLoading: false,
      });
      return false;
    }
  },

  // Request OTP for mobile login
  requestOTP: async (mobile: string, deviceId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await requestMobileOTP(mobile, deviceId);

      if (result.success) {
        set({
          otpId: result.otp_id || null,
          pendingMobile: mobile,
          isLoading: false,
        });
        return true;
      }

      set({
        error: result.error || 'Failed to send OTP',
        isLoading: false,
      });
      return false;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to send OTP',
        isLoading: false,
      });
      return false;
    }
  },

  // Verify OTP
  verifyOTP: async (otp: string, deviceId: string) => {
    const { otpId, pendingMobile } = get();

    if (!otpId || !pendingMobile) {
      set({ error: 'Invalid OTP session' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await verifyMobileOTP(pendingMobile, otp, otpId, deviceId);

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          otpId: null,
          pendingMobile: null,
          isLoading: false,
        });
        return true;
      }

      set({
        error: result.error || 'Invalid OTP',
        isLoading: false,
      });
      return false;
    } catch (error: any) {
      set({
        error: error.message || 'OTP verification failed',
        isLoading: false,
      });
      return false;
    }
  },

  // Verify 2FA code
  verify2FA: async (code: string) => {
    const { tempToken } = get();

    if (!tempToken) {
      set({ error: 'Invalid 2FA session' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await verify2FACode(code, tempToken);

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          requires2FA: false,
          tempToken: null,
          isLoading: false,
        });
        return true;
      }

      set({
        error: result.error || 'Invalid 2FA code',
        isLoading: false,
      });
      return false;
    } catch (error: any) {
      set({
        error: error.message || '2FA verification failed',
        isLoading: false,
      });
      return false;
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });

    try {
      await authLogout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        requires2FA: false,
        tempToken: null,
        otpId: null,
        pendingMobile: null,
        isLoading: false,
        error: null,
      });
    }
  },

  // Refresh user data
  refreshUser: async () => {
    try {
      const user = await refreshUserData();
      if (user) {
        set({ user });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set biometric preference
  setBiometric: async (enabled: boolean) => {
    await setBiometricEnabled(enabled);
    set({ biometricEnabled: enabled });
  },
}));

// Helper hooks
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
