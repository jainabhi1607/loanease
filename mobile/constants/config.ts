/**
 * App Configuration
 */

// API Configuration
// For web testing use localhost, for mobile device use your computer's local IP
import { Platform } from 'react-native';

const DEV_API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000/api'  // Web browser
  : 'http://192.168.1.8:3000/api';  // Mobile device - local network IP

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? DEV_API_URL  // Development
    : 'https://loanease.com/api',  // Production

  TIMEOUT: 30000, // 30 seconds
};

// Authentication Configuration
export const AUTH_CONFIG = {
  ACCESS_TOKEN_KEY: 'loanease_access_token',
  REFRESH_TOKEN_KEY: 'loanease_refresh_token',
  USER_DATA_KEY: 'loanease_user_data',
  BIOMETRIC_ENABLED_KEY: 'loanease_biometric_enabled',

  // Token expiry (for reference - actual expiry is in JWT)
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000,  // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_SECONDS: 300, // 5 minutes
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_ATTEMPTS: 3,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  LOGIN_HISTORY_PAGE_SIZE: 50,
};

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 10,
  MOBILE_REGEX: /^(\+?61|0)4\d{8}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ABN_LENGTH: 11,
};

// App Info
export const APP_INFO = {
  NAME: 'Loanease',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@loanease.com',
  SUPPORT_PHONE: '1300 XXX XXX',
};
