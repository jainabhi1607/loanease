/**
 * Secure Storage Utilities
 * Uses expo-secure-store for native, localStorage for web
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AUTH_CONFIG } from '../constants/config';
import { AuthTokens, User } from '../types';

/**
 * Platform-aware storage helpers
 * SecureStore only works on native (iOS/Android)
 * Use localStorage for web
 */
const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
      return null;
    }
  } else {
    return SecureStore.getItemAsync(key);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

/**
 * Store authentication tokens securely
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    setItem(AUTH_CONFIG.ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

/**
 * Retrieve stored tokens
 */
export async function getTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY),
    getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY),
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

/**
 * Get access token only
 */
export async function getAccessToken(): Promise<string | null> {
  return getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token only
 */
export async function getRefreshToken(): Promise<string | null> {
  return getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
}

/**
 * Clear all stored tokens (logout)
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteItem(AUTH_CONFIG.ACCESS_TOKEN_KEY),
    deleteItem(AUTH_CONFIG.REFRESH_TOKEN_KEY),
    deleteItem(AUTH_CONFIG.USER_DATA_KEY),
  ]);
}

/**
 * Store user data
 */
export async function storeUserData(user: User): Promise<void> {
  await setItem(AUTH_CONFIG.USER_DATA_KEY, JSON.stringify(user));
}

/**
 * Get stored user data
 */
export async function getUserData(): Promise<User | null> {
  const data = await getItem(AUTH_CONFIG.USER_DATA_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as User;
  } catch {
    return null;
  }
}

/**
 * Store biometric preference
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setItem(AUTH_CONFIG.BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Get biometric preference
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await getItem(AUTH_CONFIG.BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

/**
 * Store generic key-value pair securely
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  await setItem(key, value);
}

/**
 * Get generic secure item
 */
export async function getSecureItem(key: string): Promise<string | null> {
  return getItem(key);
}

/**
 * Delete generic secure item
 */
export async function deleteSecureItem(key: string): Promise<void> {
  await deleteItem(key);
}
