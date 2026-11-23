import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { db } from '../db.ts';
import { User } from '../../types/index.ts';

// ============================================================================
// 1. HTTP SECURITY HEADERS MIDDLEWARE
//    Protects against MIME sniffing, clickjacking, XSS & unsafe referrer leaks
//    while preserving Camera, Microphone, Print/PDF, Data-URI images & PWA.
// ============================================================================
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Allow camera & microphone on same origin for Live Scanner & Bengali Voice Input
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()'
  );

  // Safe Content-Security-Policy tuned for React SPA, Tailwind, Google Fonts,
  // Camera/Mic, Print/PDF blobs, PWA Service Worker & AI Studio preview frame.
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: mediastream:",
    "connect-src 'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// ============================================================================
// 2. STRICT ORIGIN-ALLOWLIST CORS MIDDLEWARE
//    Blocks unauthorized cross-origin API access (never uses wildcard '*' on
//    authenticated endpoints).
// ============================================================================
function buildAllowedOrigins(req: Request): Set<string> {
  const allowed = new Set<string>();

  const envList = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  for (const origin of envList) {
    allowed.add(origin.toLowerCase());
  }

  const appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (appUrl && (appUrl.startsWith('http://') || appUrl.startsWith('https://'))) {
    try {
      allowed.add(new URL(appUrl).origin.toLowerCase());
    } catch {
      // ignore invalid APP_URL
    }
  }

  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  if (host) {
    const cleanHost = host.split(',')[0].trim().toLowerCase();
    allowed.add(`http://${cleanHost}`);
    allowed.add(`https://${cleanHost}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
  }

  return allowed;
}

export function strictCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawOrigin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  // Same-origin non-CORS browser navigations / server calls have no Origin header
  if (!rawOrigin) {
    return next();
  }

  const normalizedOrigin = rawOrigin.trim().replace(/\/+$/, '').toLowerCase();
  const allowedOrigins = buildAllowedOrigins(req);
  const isAllowed = allowedOrigins.has(normalizedOrigin);

  if (!isAllowed) {
    if (req.path.startsWith('/api/')) {
      logSecurityAuditEvent({
        mosqueId: db.mosques[0]?.id || 'mosque-01',
        action: 'CORS_BLOCKED',
        details: `অননুমোদিত অরিজিন থেকে API অ্যাক্সেস ব্লক করা হয়েছে: ${normalizedOrigin} (${req.method} ${req.path})`,
        ipAddress: getClientIp(req),
        status: 'WARNING',
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'CORS_ORIGIN_DENIED',
          message: 'অননুমোদিত ডোমেইন বা অরিজিন থেকে API অ্যাক্সেস অনুমোদিত নয়।',
        },
      });
    }
    return next();
  }

  res.setHeader('Access-Control-Allow-Origin', rawOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Mosque-Id, X-User-Id, Idempotency-Key, X-Idempotency-Key, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

// ============================================================================
// 3. CLIENT IP & SLIDING-WINDOW RATE LIMITER FACTORY
// ============================================================================
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || '127.0.0.1').slice(0, 64);
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  code: string;
  messageBn: string;
  auditOnBlock?: boolean;
}

export class SlidingWindowRateLimiter {
  private buckets = new Map<string, number[]>();
  private lastCleanupAt = Date.now();
  private readonly options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  private cleanupStale(now: number) {
    if (now - this.lastCleanupAt < 60_000) return;
    this.lastCleanupAt = now;
    const cutoff = now - this.options.windowMs;
    for (const [k, timestamps] of this.buckets.entries()) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length === 0) {
        this.buckets.delete(k);
      } else {
        this.buckets.set(k, kept);
      }
    }
  }

  check(key: string): { allowed: boolean; retryAfterSec: number; remaining: number } {
    const now = Date.now();
    this.cleanupStale(now);
    const cutoff = now - this.options.windowMs;
    const timestamps = (this.buckets.get(key) || []).filter((t) => t > cutoff);

    if (timestamps.length >= this.options.maxRequests) {
      const oldest = timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + this.options.windowMs - now) / 1000));
      this.buckets.set(key, timestamps);
      return { allowed: false, retryAfterSec, remaining: 0 };
    }

    timestamps.push(now);
    this.buckets.set(key, timestamps);
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: Math.max(0, this.options.maxRequests - timestamps.length),
    };
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (process.env.NODE_ENV === 'test') return next();
      const key = this.options.keyGenerator(req);
      const result = this.check(key);

      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSec));
        if (this.options.auditOnBlock) {
          logSecurityAuditEvent({
            mosqueId: (req as any).currentMosque?.id || db.mosques[0]?.id || 'mosque-01',
            userId: (req as any).user?.id,
            userName: (req as any).user?.name,
            userRole: (req as any).user?.role,
            action: 'RATE_LIMIT_BLOCKED',
            details: `অতিরিক্ত অনুরোধের কারণে সীমা আরোপ (${this.options.code}): ${req.method} ${req.path}`,
            ipAddress: getClientIp(req),
            status: 'WARNING',
          });
        }
        return res.status(429).json({
          success: false,
          error: {
            code: this.options.code,
            message: `${this.options.messageBn} (অনুগ্রহ করে ${result.retryAfterSec} সেকেন্ড পর আবার চেষ্টা করুন।)`,
          },
        });
      }

      next();
    };
  }
}

export const authBruteForceLimiter = new SlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 15,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const id = String(
      req.body?.identifier || req.body?.phoneOrEmail || req.body?.phone || req.body?.emailOrPhone || ''
    )
      .trim()
      .toLowerCase()
      .slice(0, 80);
    return `auth:${ip}:${id || 'any'}`;
  },
  code: 'AUTH_RATE_LIMITED',
  messageBn: 'অতিরিক্ত লগইন বা রিসেট চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে।',
  auditOnBlock: true,
});

export const globalApiLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 450,
  keyGenerator: (req) => `api:${getClientIp(req)}`,
  code: 'API_RATE_LIMITED',
  messageBn: 'অতিরিক্ত API অনুরোধ পাঠানো হয়েছে।',
  auditOnBlock: true,
});

export const aiAndUploadLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 45,
  keyGenerator: (req) => {
    const mosqueId = (req as any).currentMosque?.id || 'public';
    const userId = (req as any).user?.id || getClientIp(req);
    return `ai-up:${mosqueId}:${userId}`;
  },
  code: 'AI_UPLOAD_RATE_LIMITED',
  messageBn: 'অল্প সময়ে অনেকগুলো AI বা ফাইল আপলোড অনুরোধ পাঠানো হয়েছে।',
  auditOnBlock: true,
});

// ============================================================================
// 4. USER RESPONSE SANITIZER (NEVER LEAK PASSWORD HASH OR RESET TOKENS)
// ============================================================================
export function sanitizeUserForResponse<T extends User & { passwordHash?: string; passwordResetToken?: string; passwordResetExpires?: number }>(
  user: T
): User {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    permissions: Array.isArray(user.permissions) ? [...user.permissions] : [],
    status: user.status,
    mosqueId: user.mosqueId,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ============================================================================
// 5. SERVER-SIDE HTML, URL, UPLOAD & PATH TRAVERSAL SANITIZERS
// ============================================================================
export function sanitizeRichHtmlServer(rawHtml: string, maxLength: number = 250000): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '<p></p>';
  let clean = rawHtml
    // Remove dangerous executable/embedded tags and their contents
    .replace(/<(script|style|iframe|object|embed|applet|svg|math|template|noscript|form|meta|link|base)[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|applet|svg|math|template|noscript|form|meta|link|base)[^>]*\/?>/gi, '')
    // Strip all inline event handlers (quoted, unquoted, or spaced)
    .replace(/\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip javascript:, vbscript:, data:text/html, or entity-encoded variants in URL attributes
    .replace(
      /\s(href|src|xlink:href|action|formaction|poster|background)\s*=\s*(["'])\s*(?:javascript:|vbscript:|data\s*:\s*text\/html|&#x?0*(?:106|6a);?)[\s\S]*?\2/gi,
      ''
    )
    .replace(
      /\s(href|src|xlink:href|action|formaction)\s*=\s*(?:javascript:|vbscript:|data\s*:\s*text\/html)[^\s>]*/gi,
      ''
    )
    // Neutralize dangerous CSS expressions / url(javascript:) inside inline style attributes
    .replace(/style\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, quote, styleBody) => {
      const safeStyle = String(styleBody)
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/url\s*\(\s*['"]?\s*(?:javascript:|vbscript:|data:text\/html)[^)]*\)/gi, '')
        .replace(/@import/gi, '')
        .replace(/behavior\s*:/gi, '');
      return `style=${quote}${safeStyle}${quote}`;
    });

  if (!clean.trim()) return '<p></p>';
  return clean.slice(0, maxLength);
}

export function sanitizeSafeHttpUrl(rawUrl: unknown): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  let trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Reject dangerous schemes immediately
  if (/^(javascript|vbscript|data|file):/i.test(trimmed)) {
    return undefined;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export const SAFE_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export const SAFE_UPLOAD_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'pdf',
  'docx',
  'xlsx',
  'txt',
]);

export function sanitizeUploadFileName(rawName: unknown, fallback: string = 'attachment.bin'): string {
  const base = path.basename(String(rawName || fallback)).replace(/\0/g, '');
  const cleaned = base.replace(/[^a-zA-Z0-9.\-_ \u0980-\u09FF]/g, '_').replace(/\.{2,}/g, '.').trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  return cleaned.slice(0, 140);
}

export function validateBase64FileUpload(params: {
  fileName?: string;
  fileType?: string;
  base64Data: string;
  maxBytes?: number;
  allowedMimes?: Set<string>;
  allowedExtensions?: Set<string>;
}): { ok: true; safeFileName: string; mimeType: string; sizeBytes: number; dataUrl: string } | { ok: false; code: string; message: string } {
  const maxBytes = params.maxBytes ?? 10 * 1024 * 1024; // Default 10 MB
  const allowedMimes = params.allowedMimes ?? SAFE_UPLOAD_MIME_TYPES;
  const allowedExts = params.allowedExtensions ?? SAFE_UPLOAD_EXTENSIONS;

  if (!params.base64Data || typeof params.base64Data !== 'string') {
    return { ok: false, code: 'MISSING_FILE', message: 'ফাইলের ডাটা প্রদান আবশ্যক।' };
  }

  let detectedMime = String(params.fileType || '').trim().toLowerCase();
  let rawBase64 = params.base64Data.trim();

  if (rawBase64.startsWith('data:')) {
    const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      return { ok: false, code: 'INVALID_FILE_DATA', message: 'অবৈধ ফাইল ফরম্যাট বা ডাটা পাওয়া গেছে।' };
    }
    detectedMime = match[1].trim().toLowerCase();
    rawBase64 = match[2].trim();
  }

  if (!detectedMime || !allowedMimes.has(detectedMime)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_FILE_TYPE',
      message: 'এই ধরনের ফাইল আপলোড অনুমোদিত নয়। শুধুমাত্র JPG, PNG, WebP, PDF, DOCX, XLSX বা TXT ফাইল আপলোড করুন।',
    };
  }

  const safeFileName = sanitizeUploadFileName(params.fileName, 'attachment');
  const ext = path.extname(safeFileName).replace('.', '').toLowerCase();
  if (ext && !allowedExts.has(ext)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_FILE_EXTENSION',
      message: `অননুমোদিত ফাইল এক্সটেনশন (.${ext})। নিরাপদ ছবি বা ডকুমেন্ট ফাইল নির্বাচন করুন।`,
    };
  }

  const sizeBytes = Math.ceil((rawBase64.length * 3) / 4);
  if (sizeBytes <= 0 || sizeBytes > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: `ফাইলের আকার সর্বোচ্চ ${maxMb} মেগাবাইট (${maxMb}MB) হতে পারে।`,
    };
  }

  const dataUrl = `data:${detectedMime};base64,${rawBase64}`;
  return { ok: true, safeFileName, mimeType: detectedMime, sizeBytes, dataUrl };
}

/**
 * Strictly confines any resolved filesystem path inside `uploads/{tenantId}/...`.
 * Blocks `../`, null bytes, and cross-tenant escape attempts.
 */
export function resolveConfinedTenantFilePath(
  uploadsRootDir: string,
  tenantId: string,
  ...relativeSegments: string[]
): string {
  const safeTenant = String(tenantId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeTenant) {
    throw new Error('INVALID_TENANT_SEGMENT');
  }

  const normalizedRoot = path.resolve(uploadsRootDir);
  const tenantRoot = path.resolve(normalizedRoot, safeTenant);
  if (!tenantRoot.startsWith(normalizedRoot + path.sep)) {
    throw new Error('PATH_TRAVERSAL_BLOCKED');
  }

  const sanitizedParts: string[] = [];
  for (const seg of relativeSegments) {
    const raw = String(seg || '');
    if (!raw || raw.includes('\0') || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
      throw new Error('PATH_TRAVERSAL_BLOCKED');
    }
    sanitizedParts.push(path.basename(raw));
  }

  const targetPath = path.resolve(tenantRoot, ...sanitizedParts);
  if (targetPath !== tenantRoot && !targetPath.startsWith(tenantRoot + path.sep)) {
    throw new Error('PATH_TRAVERSAL_BLOCKED');
  }

  return targetPath;
}

// ============================================================================
// 6. SECURITY AUDIT LOGGER (THROTTLED TO PREVENT LOG FLOODING)
// ============================================================================
const securityLogThrottleMap = new Map<string, number>();

export function logSecurityAuditEvent(params: {
  mosqueId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  details: string;
  recordId?: string;
  ipAddress?: string;
  status?: 'FAILED' | 'WARNING' | 'SUCCESS';
}) {
  try {
    const throttleKey = `${params.action}:${params.ipAddress || 'unknown'}:${params.userId || 'anon'}`;
    const now = Date.now();
    const last = securityLogThrottleMap.get(throttleKey) || 0;
    if (now - last < 3000) return; // Max 1 identical security log per 3s per actor/IP
    securityLogThrottleMap.set(throttleKey, now);

    // Keep throttle map bounded
    if (securityLogThrottleMap.size > 500) {
      for (const [k, ts] of securityLogThrottleMap.entries()) {
        if (now - ts > 60_000) securityLogThrottleMap.delete(k);
      }
    }

    const mosqueId = params.mosqueId || db.mosques[0]?.id || 'mosque-01';
    db.logAudit(
      mosqueId,
      params.userId || 'SYSTEM_SECURITY',
      params.userName || 'অজ্ঞাত/অননুমোদিত অনুরোধ',
      params.userRole || 'UNAUTHENTICATED',
      params.action,
      'AUTH',
      params.details.slice(0, 350),
      params.recordId,
      params.ipAddress || '127.0.0.1',
      { status: params.status || 'FAILED' }
    );
  } catch {
    // Never crash request pipeline if audit logging encounters an edge case
  }
}

/**
 * Helper to enforce strict Cross-Tenant 403 Forbidden vs 404 Not Found.
 * If an entity ID exists in another tenant's data, returns explicit 403 Forbidden
 * and writes a security audit event.
 */
export function enforceTenantOwnershipOrRespond<T extends { mosqueId?: string; tenantId?: string }>(
  req: Request & { user?: User; currentMosque?: { id: string } },
  res: Response,
  recordById: T | undefined,
  notFoundMessageBn: string
): recordById is T {
  const currentTenantId = req.currentMosque?.id;
  if (!recordById) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: notFoundMessageBn },
    });
    return false;
  }

  const ownerTenantId = recordById.mosqueId || recordById.tenantId;
  if (ownerTenantId && ownerTenantId !== currentTenantId) {
    logSecurityAuditEvent({
      mosqueId: currentTenantId,
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CROSS_TENANT_ACCESS_DENIED',
      details: `অন্য মসজিদের রিসোর্স অ্যাক্সেস চেষ্টা প্রতিহত (${req.method} ${req.path})`,
      recordId: req.params?.id || req.params?.fileId,
      ipAddress: getClientIp(req),
      status: 'FAILED',
    });
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_FORBIDDEN',
        message: 'অন্য মসজিদের রেকর্ড দেখার, সম্পাদনা বা মুছে ফেলার অনুমতি নেই।',
      },
    });
    return false;
  }

  return true;
}
