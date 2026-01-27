/**
 * Secure Storage Utilities
 * Uses expo-secure-store for sensitive data
 */
import * as SecureStore from 'expo-secure-store';
import { AUTH_CONFIG } from '../constants/config';
import { AuthTokens, User } from '../types';

/**
 * Store authentication tokens securely
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(AUTH_CONFIG.ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(AUTH_CONFIG.REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

/**
 * Retrieve stored tokens
 */
export async function getTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(AUTH_CONFIG.ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(AUTH_CONFIG.REFRESH_TOKEN_KEY),
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
  return SecureStore.getItemAsync(AUTH_CONFIG.ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token only
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_CONFIG.REFRESH_TOKEN_KEY);
}

/**
 * Clear all stored tokens (logout)
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_CONFIG.ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_CONFIG.REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(AUTH_CONFIG.USER_DATA_KEY),
  ]);
}

/**
 * Store user data
 */
export async function storeUserData(user: User): Promise<void> {
  await SecureStore.setItemAsync(AUTH_CONFIG.USER_DATA_KEY, JSON.stringify(user));
}

/**
 * Get stored user data
 */
export async function getUserData(): Promise<User | null> {
  const data = await SecureStore.getItemAsync(AUTH_CONFIG.USER_DATA_KEY);
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
  await SecureStore.setItemAsync(
    AUTH_CONFIG.BIOMETRIC_ENABLED_KEY,
    enabled ? 'true' : 'false'
  );
}

/**
 * Get biometric preference
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(AUTH_CONFIG.BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

/**
 * Store generic key-value pair securely
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

/**
 * Get generic secure item
 */
export async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

/**
 * Delete generic secure item
 */
export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
