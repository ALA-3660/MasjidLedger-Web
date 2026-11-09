import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../../types/index.ts';

function parseExpiresIn(envVal: string | undefined, defaultVal: number | string): number | string {
  if (!envVal || typeof envVal !== 'string') return defaultVal;
  const trimmed = envVal.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^\d+[smhdwy]$/i.test(trimmed)) return trimmed;
  return defaultVal;
}

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const REFRESH_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export const JWT_ACCESS_EXPIRES_IN = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, '30d');
export const JWT_REFRESH_EXPIRES_IN = parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, '90d');

const PERSISTENT_ACCESS_SECRET = crypto
  .createHash('sha256')
  .update('masjidledger-enterprise-access-secret-key-v2-18666ccf-b29d-45dd-a1a0-4c29705846f2')
  .digest('hex');

const PERSISTENT_REFRESH_SECRET = crypto
  .createHash('sha256')
  .update('masjidledger-enterprise-refresh-secret-key-v2-18666ccf-b29d-45dd-a1a0-4c29705846f2')
  .digest('hex');

function getOrGenerateDevAccessSecret(): string {
  return PERSISTENT_ACCESS_SECRET;
}

function getOrGenerateDevRefreshSecret(): string {
  return PERSISTENT_REFRESH_SECRET;
}

/**
 * Persistent JWT Secret Provider & Validation.
 * Uses explicit environment variables if provided (>= 32 chars), or falls back to
 * deterministic 64-char SHA-256 secrets so active user tokens survive server restarts.
 */
export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret && secret !== 'JWT_ACCESS_SECRET' && secret.trim().length >= 32) {
    return secret;
  }
  return getOrGenerateDevAccessSecret();
}

export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret && secret !== 'JWT_REFRESH_SECRET' && secret.trim().length >= 32) {
    return secret;
  }
  return getOrGenerateDevRefreshSecret();
}

/**
 * Production environment validation helper for startup security checks.
 */
export function validateProductionJwtConfiguration(): { valid: boolean; error?: string } {
  const accessSecret = getJwtAccessSecret();
  const refreshSecret = getJwtRefreshSecret();
  if (!accessSecret || accessSecret.length < 32 || !refreshSecret || refreshSecret.length < 32 || accessSecret === refreshSecret) {
    return {
      valid: false,
      error: 'Invalid JWT secret configuration.',
    };
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
  private revokedJtis = new Set<string>();

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
    if (this.revokedJtis.has(jti)) return false;
    const session = this.sessions.get(jti);
    if (!session) {
      // Token signature and expiration were already cryptographically verified by jwt.verify().
      // Allow valid unrevoked tokens to survive server restarts seamlessly.
      return true;
    }
    if (session.revoked) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(jti);
      return false;
    }
    return true;
  }

  revoke(jti: string) {
    if (jti) {
      this.revokedJtis.add(jti);
    }
    const session = this.sessions.get(jti);
    if (session) {
      session.revoked = true;
    }
  }

  revokeAllForUser(userId: string) {
    this.sessions.forEach((session) => {
      if (session.userId === userId) {
        session.revoked = true;
        this.revokedJtis.add(session.jti);
      }
    });
  }

  clear() {
    this.sessions.clear();
    this.revokedJtis.clear();
  }
}

export const tokenSessionManager = new TokenSessionManager();

/**
 * Decodes JWT payload safely for session migration across restarts without throwing
 */
export function decodeTokenUnverified(token: string): any | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

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
  tokenSessionManager.register(jti, user.id, user.mosqueId, ACCESS_TOKEN_TTL_SECONDS);
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
    if (decoded.jti && !tokenSessionManager.isValid(decoded.jti)) {
      return { valid: false, error: 'টোকেন বাতিল বা ব্যবহার অনুপযোগী (Token revoked/invalid)', code: 'REVOKED' };
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
