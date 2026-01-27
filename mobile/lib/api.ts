/**
 * API Client
 * Fetch-based client with authentication interceptors
 */
import { API_CONFIG } from '../constants/config';
import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from './storage';
import { AuthTokens } from '../types';

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Refresh token function
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  const newTokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };

  await storeTokens(newTokens);
  return newTokens.accessToken;
}

// Base request function with auth handling
async function request<T>(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && retry) {
    if (isRefreshing) {
      // Wait for the refresh to complete
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: async (newToken) => {
            try {
              headers.Authorization = `Bearer ${newToken}`;
              const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
                ...options,
                headers,
              });
              if (!retryResponse.ok) {
                throw new Error(`HTTP error! status: ${retryResponse.status}`);
              }
              resolve(await retryResponse.json());
            } catch (err) {
              reject(err);
            }
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);

      // Retry the original request
      headers.Authorization = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        ...options,
        headers,
      });

      if (!retryResponse.ok) {
        throw new Error(`HTTP error! status: ${retryResponse.status}`);
      }

      return await retryResponse.json();
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();
      throw refreshError;
    } finally {
      isRefreshing = false;
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

/**
 * API helper functions
 */

// Generic GET request
export async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
  }
  return request<T>(fullUrl, { method: 'GET' });
}

// Generic POST request
export async function post<T>(url: string, data?: any): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Generic PATCH request
export async function patch<T>(url: string, data?: any): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Generic DELETE request
export async function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}

export default { get, post, patch, del };
