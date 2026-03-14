import { SignJWT, jwtVerify, CompactEncrypt, compactDecrypt, base64url } from 'jose';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET must be set in production');
  if (!process.env.TOKEN_ENCRYPTION_KEY) throw new Error('TOKEN_ENCRYPTION_KEY must be set in production');
} else {
  if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET not set — using dev fallback');
  if (!process.env.JWT_REFRESH_SECRET) console.warn('WARNING: JWT_REFRESH_SECRET not set — using dev fallback');
  if (!process.env.TOKEN_ENCRYPTION_KEY) console.warn('WARNING: TOKEN_ENCRYPTION_KEY not set — using dev fallback');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'loanease-jwt-secret-dev-only-not-for-production'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'loanease-refresh-secret-dev-only-not-for-production'
);

// 256-bit key for AES-256-GCM token encryption (base64url-encoded)
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY
  ? base64url.decode(process.env.TOKEN_ENCRYPTION_KEY)
  : base64url.decode('bG9hbmVhc2UtZGV2LWVuY3J5cHRpb24ta2V5LTAwMDA'); // 32-byte dev fallback

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REMEMBER_ME_REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

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
 * Encrypt a signed JWT using JWE (A256GCM)
 * This wraps the signed JWT so the payload is not readable without the encryption key
 */
async function encryptToken(signedJwt: string): Promise<string> {
  return new CompactEncrypt(new TextEncoder().encode(signedJwt))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(TOKEN_ENCRYPTION_KEY);
}

/**
 * Decrypt a JWE token to get the inner signed JWT
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  const { plaintext } = await compactDecrypt(encryptedToken, TOKEN_ENCRYPTION_KEY);
  return new TextDecoder().decode(plaintext);
}

/**
 * Generate an access token (signed + encrypted)
 */
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  const signedJwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
  return encryptToken(signedJwt);
}

/**
 * Generate a refresh token (signed + encrypted)
 */
export async function generateRefreshToken(payload: JWTPayload, rememberMe: boolean = false): Promise<string> {
  const signedJwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? REMEMBER_ME_REFRESH_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
  return encryptToken(signedJwt);
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(payload: JWTPayload, rememberMe: boolean = false): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload, rememberMe),
  ]);
  return { accessToken, refreshToken };
}

/**
 * Verify an access token (decrypt + verify signature)
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const signedJwt = await decryptToken(token);
    const { payload } = await jwtVerify(signedJwt, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] verifyAccessToken failed:', (err as Error).message);
    }
    return null;
  }
}

/**
 * Verify a refresh token (decrypt + verify signature)
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const signedJwt = await decryptToken(token);
    const { payload } = await jwtVerify(signedJwt, JWT_REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] verifyRefreshToken failed:', (err as Error).message);
    }
    return null;
  }
}

/**
 * Check if a token is expired (decrypt then check exp claim)
 */
export async function isTokenExpired(token: string): Promise<boolean> {
  try {
    const signedJwt = await decryptToken(token);
    const parts = signedJwt.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
