import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable is not set. Using insecure fallback.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('WARNING: JWT_REFRESH_SECRET environment variable is not set. Using insecure fallback.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'loanease-jwt-secret-change-in-production-2024'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'loanease-refresh-secret-change-in-production-2024'
);

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organisationId: string | null;
  twoFaEnabled?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate an access token
 */
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(payload: JWTPayload): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);
  return { accessToken, refreshToken };
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired (without verification)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
