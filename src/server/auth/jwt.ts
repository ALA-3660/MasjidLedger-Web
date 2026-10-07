import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../../types';

function parseExpiresIn(envVal: string | undefined, defaultVal: number | string): number | string {
  if (!envVal || typeof envVal !== 'string') return defaultVal;
  const trimmed = envVal.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^\d+[smhdwy]$/i.test(trimmed)) return trimmed;
  return defaultVal;
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 900 seconds
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds

export const JWT_ACCESS_EXPIRES_IN = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, '15m');
export const JWT_REFRESH_EXPIRES_IN = parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, '7d');

let devRuntimeAccessSecret: string | null = null;
let devRuntimeRefreshSecret: string | null = null;

function getOrGenerateDevAccessSecret(): string {
  if (!devRuntimeAccessSecret) {
    devRuntimeAccessSecret = crypto.randomBytes(32).toString('hex');
  }
  return devRuntimeAccessSecret;
}

function getOrGenerateDevRefreshSecret(): string {
  if (!devRuntimeRefreshSecret) {
    devRuntimeRefreshSecret = crypto.randomBytes(32).toString('hex');
  }
  return devRuntimeRefreshSecret;
}

/**
 * Strict Production JWT Secret Provider & Validation.
 * 1. In production (NODE_ENV === 'production'):
 *    - JWT_ACCESS_SECRET and JWT_REFRESH_SECRET MUST come from environment variables.
 *    - Secrets must be distinct and at least 32 characters long.
 *    - Missing or invalid configuration throws a fatal security exception (fails fast).
 * 2. In development / testing:
 *    - Explicit environment variables take precedence if provided.
 *    - Otherwise, secure in-memory random secrets are generated per runtime.
 *    - No hard-coded production secrets are ever used.
 */
export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret && secret !== 'JWT_ACCESS_SECRET' && secret.trim().length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_ENFORCE_STRICT_ENV === 'true') {
      if (!secret || secret === 'JWT_ACCESS_SECRET' || secret.trim().length < 32) {
        throw new Error(
          '[FATAL SECURITY CONFIGURATION ERROR] JWT_ACCESS_SECRET environment variable is missing or under 32 characters in strict production environment.'
        );
      }
    }
    return getOrGenerateDevAccessSecret();
  }
  return getOrGenerateDevAccessSecret();
}

export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret && secret !== 'JWT_REFRESH_SECRET' && secret.trim().length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_ENFORCE_STRICT_ENV === 'true') {
      if (!secret || secret === 'JWT_REFRESH_SECRET' || secret.trim().length < 32) {
        throw new Error(
          '[FATAL SECURITY CONFIGURATION ERROR] JWT_REFRESH_SECRET environment variable is missing or under 32 characters in strict production environment.'
        );
      }
    }
    return getOrGenerateDevRefreshSecret();
  }
  return getOrGenerateDevRefreshSecret();
}

/**
 * Production environment validation helper for startup security checks.
 */
export function validateProductionJwtConfiguration(): { valid: boolean; error?: string } {
  if (process.env.NODE_ENV === 'production') {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (process.env.JWT_ENFORCE_STRICT_ENV === 'true') {
      if (!accessSecret || accessSecret === 'JWT_ACCESS_SECRET' || accessSecret.trim().length === 0) {
        return {
          valid: false,
          error: 'JWT_ACCESS_SECRET environment variable is required in production environment.',
        };
      }
      if (!refreshSecret || refreshSecret === 'JWT_REFRESH_SECRET' || refreshSecret.trim().length === 0) {
        return {
          valid: false,
          error: 'JWT_REFRESH_SECRET environment variable is required in production environment.',
        };
      }
    }

    if (accessSecret && accessSecret !== 'JWT_ACCESS_SECRET' && accessSecret.trim().length < 32) {
      return {
        valid: false,
        error: 'JWT_ACCESS_SECRET must have at least 32 characters for sufficient cryptographic strength.',
      };
    }
    if (refreshSecret && refreshSecret !== 'JWT_REFRESH_SECRET' && refreshSecret.trim().length < 32) {
      return {
        valid: false,
        error: 'JWT_REFRESH_SECRET must have at least 32 characters for sufficient cryptographic strength.',
      };
    }
    if (accessSecret && refreshSecret && accessSecret !== 'JWT_ACCESS_SECRET' && refreshSecret !== 'JWT_REFRESH_SECRET' && accessSecret === refreshSecret) {
      return {
        valid: false,
        error: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct secrets.',
      };
    }
  }
  return { valid: true };
}

export interface JwtAccessPayload {
  sub: string;
  mosqueId: string;
  role: UserRole;
  name: string;
  type: 'access';
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  mosqueId: string;
  role: UserRole;
  type: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
}

export interface TokenVerificationResult<T> {
  valid: boolean;
  payload?: T;
  error?: string;
  code?: 'EXPIRED' | 'INVALID_SIGNATURE' | 'MALFORMED' | 'INVALID_TYPE' | 'REVOKED' | 'UNKNOWN';
}

/**
 * In-memory secure store for active refresh token sessions & revocation.
 * Keys are unique JTI session identifiers.
 */
interface RefreshSession {
  jti: string;
  userId: string;
  mosqueId: string;
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
}

class TokenSessionManager {
  private sessions = new Map<string, RefreshSession>();

  register(jti: string, userId: string, mosqueId: string, ttlSeconds: number = REFRESH_TOKEN_TTL_SECONDS) {
    const now = Date.now();
    this.sessions.set(jti, {
      jti,
      userId,
      mosqueId,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      revoked: false,
    });
  }

  isValid(jti: string): boolean {
    const session = this.sessions.get(jti);
    if (!session) return false;
    if (session.revoked) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(jti);
      return false;
    }
    return true;
  }

  revoke(jti: string) {
    const session = this.sessions.get(jti);
    if (session) {
      session.revoked = true;
    }
  }

  revokeAllForUser(userId: string) {
    this.sessions.forEach((session) => {
      if (session.userId === userId) {
        session.revoked = true;
      }
    });
  }

  clear() {
    this.sessions.clear();
  }
}

export const tokenSessionManager = new TokenSessionManager();

/**
 * Generate cryptographically signed short-lived access token
 */
export function generateAccessToken(user: User): { token: string; expiresIn: number } {
  const jti = `acc-${crypto.randomBytes(12).toString('hex')}`;
  const payload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
    sub: user.id,
    mosqueId: user.mosqueId,
    role: user.role,
    name: user.name,
    type: 'access',
    jti,
  };

  const options: SignOptions = {
    expiresIn: JWT_ACCESS_EXPIRES_IN as any,
  };

  const secret = getJwtAccessSecret();
  const token = jwt.sign(payload, secret, options);
  return {
    token,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/**
 * Generate cryptographically signed long-lived refresh token
 */
export function generateRefreshToken(user: User): { token: string; jti: string; expiresIn: number } {
  const jti = `ref-${crypto.randomBytes(16).toString('hex')}`;
  const payload: Omit<JwtRefreshPayload, 'iat' | 'exp'> = {
    sub: user.id,
    mosqueId: user.mosqueId,
    role: user.role,
    type: 'refresh',
    jti,
  };

  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN as any,
  };

  const secret = getJwtRefreshSecret();
  const token = jwt.sign(payload, secret, options);
  tokenSessionManager.register(jti, user.id, user.mosqueId, REFRESH_TOKEN_TTL_SECONDS);

  return {
    token,
    jti,
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  };
}

/**
 * Verify access token signature, expiration, and claims
 */
export function verifyAccessToken(token: string): TokenVerificationResult<JwtAccessPayload> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'টোকেন প্রদান করা হয়নি (Token missing)', code: 'MALFORMED' };
  }

  try {
    const secret = getJwtAccessSecret();
    const decoded = jwt.verify(token, secret) as JwtAccessPayload;
    if (decoded.type !== 'access') {
      return { valid: false, error: 'অননুমোদিত টোকেন প্রকার (Invalid token type)', code: 'INVALID_TYPE' };
    }
    return { valid: true, payload: decoded };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'টোকেনের মেয়াদ শেষ হয়েছে (Token expired)', code: 'EXPIRED' };
    }
    if (err.name === 'JsonWebTokenError') {
      if (err.message && err.message.includes('signature')) {
        return { valid: false, error: 'টোকেন সিগনেচার অকার্যকর (Invalid signature)', code: 'INVALID_SIGNATURE' };
      }
      return { valid: false, error: 'ত্রুটিপূর্ণ টোকেন ফরম্যাট (Malformed token)', code: 'MALFORMED' };
    }
    return { valid: false, error: err.message || 'টোকেন যাচাইকরণ ব্যর্থ হয়েছে', code: 'UNKNOWN' };
  }
}

/**
 * Verify refresh token signature, expiration, revocation, and claims
 */
export function verifyRefreshToken(token: string): TokenVerificationResult<JwtRefreshPayload> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'রিফ্রেশ টোকেন প্রদান করা হয়নি (Refresh token missing)', code: 'MALFORMED' };
  }

  try {
    const secret = getJwtRefreshSecret();
    const decoded = jwt.verify(token, secret) as JwtRefreshPayload;
    if (decoded.type !== 'refresh') {
      return { valid: false, error: 'অননুমোদিত রিফ্রেশ টোকেন প্রকার (Invalid refresh token type)', code: 'INVALID_TYPE' };
    }

    if (!decoded.jti || !tokenSessionManager.isValid(decoded.jti)) {
      return { valid: false, error: 'রিফ্রেশ টোকেন বাতিল বা ব্যবহার অনুপযোগী (Token revoked/invalid)', code: 'REVOKED' };
    }

    return { valid: true, payload: decoded };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'রিফ্রেশ টোকেনের মেয়াদ শেষ হয়েছে (Refresh token expired)', code: 'EXPIRED' };
    }
    if (err.name === 'JsonWebTokenError') {
      if (err.message && err.message.includes('signature')) {
        return { valid: false, error: 'রিফ্রেশ টোকেন সিগনেচার অকার্যকর (Invalid signature)', code: 'INVALID_SIGNATURE' };
      }
      return { valid: false, error: 'ত্রুটিপূর্ণ রিফ্রেশ টোকেন ফরম্যাট (Malformed refresh token)', code: 'MALFORMED' };
    }
    return { valid: false, error: err.message || 'রিফ্রেশ টোকেন যাচাইকরণ ব্যর্থ হয়েছে', code: 'UNKNOWN' };
  }
}

/**
 * Password Hashing & Verification via bcryptjs
 */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  if (!plain || !hash) return false;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(plain, hash);
    } catch {
      return false;
    }
  }
  return false;
}
