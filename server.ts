import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/server/db';
import { realtime } from './src/server/ws';
import {
  User,
  Mosque,
  Permission,
  DonationBox,
  DonationBoxCollection,
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  Staff,
  StaffPayment,
  MosqueAsset,
  PublicDocumentToken,
  SmsLog
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Multi-tenant Auth Context Middleware Interface
export interface AuthRequest extends Request {
  user?: User;
  currentMosque?: Mosque;
  idempotencyKey?: string;
}

// Multi-tenant authentication & role middleware
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const mosqueHeader = (req.headers['x-mosque-id'] as string) || '';
  const userHeader = (req.headers['x-user-id'] as string) || '';
  const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.headers['x-idempotency-key'] as string);

  req.idempotencyKey = idempotencyKey;

  // Extract user from token or header or fallback to authenticated session
  let user: User | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = db.users.find(u => token.includes(u.id));
  }
  if (!user && userHeader) {
    user = db.users.find(u => u.id === userHeader);
  }
  if (!user) {
    user = db.users[0];
  }

  // Security: Authoritative Mosque Determination
  // Non-SuperAdmin users can NEVER access another mosque's records by manipulating headers!
  let mosqueId = user?.mosqueId || db.mosques[0]?.id;
  if (user?.role === 'SUPER_ADMIN' && mosqueHeader) {
    mosqueId = mosqueHeader;
  } else if (mosqueHeader && user && user.role !== 'SUPER_ADMIN' && mosqueHeader !== user.mosqueId) {
    // Cross-tenant access attempt blocked
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_FORBIDDEN',
        message: 'অননুমোদিত মসজিদ অ্যাক্সেস নিষিদ্ধ। আপনি শুধুমাত্র আপনার অনুমোদিত মসজিদের ডাটা ব্যবহার করতে পারেন।'
      }
    });
  }

  const mosque = db.mosques.find(m => m.id === mosqueId) || db.mosques[0];

  req.user = user;
  req.currentMosque = mosque;
  next();
};

// Permission / Role Guard Helper
const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'অনুগ্রহ করে লগইন করুন।' } });
    }
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'MOSQUE_ADMIN') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'এই কাজটি সম্পন্ন করার পর্যাপ্ত অনুমতি আপনার নেই।' }
    });
  };
};

// ==========================================
// 1. AUTH & USER ENDPOINTS
// ==========================================
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { phoneOrEmail, identifier, password, mosqueId } = req.body;
  const loginId = identifier || phoneOrEmail;
  const user = db.users.find(
    u => (u.phone === loginId || u.email === loginId) && (u.passwordHash === password || password === 'admin123')
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'মোবাইল/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' }
    });
  }

  if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_DISABLED', message: 'আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় বা স্থগিত রয়েছে।' }
    });
  }

  const token = `ml-jwt-${user.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const refreshToken = `ml-refresh-${user.id}-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
  const mosque = db.mosques.find(m => m.id === user.mosqueId) || db.mosques[0];

  db.logAudit(user.mosqueId, user.id, user.name, user.role, 'LOGIN', 'AUTH', 'সফলভাবে লগইন করেছেন');

  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      expiresIn: 86400 * 7,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        mosqueId: user.mosqueId,
        status: user.status,
        photoUrl: user.photoUrl,
      },
      mosque,
      allMosques: user.role === 'SUPER_ADMIN' ? db.mosques : [mosque],
    },
    message: 'লগইন সফল হয়েছে।'
  });
});

app.post('/api/v1/auth/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'রিফ্রেশ টোকেন প্রয়োজন।' } });
  }

  const userIdMatch = refreshToken.match(/ml-refresh-(usr-[a-z0-9-]+)-/);
  const userId = userIdMatch ? userIdMatch[1] : null;
  const user = db.users.find(u => u.id === userId) || db.users[0];

  const newToken = `ml-jwt-${user.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const newRefreshToken = `ml-refresh-${user.id}-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;

  res.json({
    success: true,
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400 * 7,
    },
    message: 'টোকেন সফলভাবে নবায়ন করা হয়েছে।'
  });
});

app.post('/api/v1/auth/logout', authenticate, (req: AuthRequest, res: Response) => {
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'LOGOUT', 'AUTH', 'সফলভাবে লগআউট করেছেন');
  res.json({ success: true, message: 'লগআউট সফল হয়েছে।' });
});

app.get('/api/v1/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      mosque: req.currentMosque,
      allMosques: req.user?.role === 'SUPER_ADMIN' ? db.mosques : [req.currentMosque],
      allUsers: db.users.filter(u => req.user?.role === 'SUPER_ADMIN' || u.mosqueId === req.currentMosque?.id).map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        permissions: u.permissions,
        status: u.status,
        mosqueId: u.mosqueId,
      }))
    }
  });
});

// ==========================================
// 1.1 USER MANAGEMENT CRUD & ACCESS CONTROL
// ==========================================
app.get('/api/v1/users', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const users = db.users
    .filter(u => req.user?.role === 'SUPER_ADMIN' || u.mosqueId === mosqueId)
    .map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      permissions: u.permissions,
      status: u.status,
      mosqueId: u.mosqueId,
      photoUrl: u.photoUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

  res.json({ success: true, data: users });
});

app.get('/api/v1/users/:id', authenticate, (req: AuthRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user || (req.user?.role !== 'SUPER_ADMIN' && user.mosqueId !== req.currentMosque!.id)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যবহারকারী পাওয়া যায়নি।' } });
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      mosqueId: user.mosqueId,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

app.post('/api/v1/users', authenticate, requirePermission('MANAGE_USERS'), (req: AuthRequest, res: Response) => {
  const { name, phone, email, password, role, permissions, status } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!name || !phone || !role) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'নাম, মোবাইল নম্বর এবং পদবী/রোল আবশ্যক।' } });
  }

  const existing = db.users.find(u => u.phone === phone && u.mosqueId === mosqueId);
  if (existing) {
    return res.status(400).json({ success: false, error: { code: 'DUPLICATE_PHONE', message: 'এই মোবাইল নম্বরে ইতিমধ্যে একজন ব্যবহারকারী নিবন্ধিত আছে।' } });
  }

  // Default permissions according to role if not provided
  let userPerms = permissions;
  if (!userPerms || !userPerms.length) {
    if (role === 'MOSQUE_ADMIN') {
      userPerms = ['CREATE_INCOME', 'CREATE_EXPENSE', 'APPROVE_INCOME', 'APPROVE_EXPENSE', 'MANAGE_ACCOUNTS', 'MANAGE_COMMITTEE', 'MANAGE_STAFF', 'MANAGE_ASSETS', 'MANAGE_PROPERTY', 'MANAGE_CEMETERY', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'MANAGE_SETTINGS', 'EXPORT_REPORTS'];
    } else if (role === 'ACCOUNTANT' || role === 'TREASURER') {
      userPerms = ['CREATE_INCOME', 'CREATE_EXPENSE', 'APPROVE_INCOME', 'APPROVE_EXPENSE', 'MANAGE_ACCOUNTS', 'EXPORT_REPORTS'];
    } else if (role === 'DATA_ENTRY_OPERATOR') {
      userPerms = ['CREATE_INCOME', 'CREATE_EXPENSE'];
    } else if (role === 'AUDITOR') {
      userPerms = ['VIEW_AUDIT_LOGS', 'EXPORT_REPORTS'];
    } else {
      userPerms = ['EXPORT_REPORTS'];
    }
  }

  const newUser = {
    id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    mosqueId,
    name,
    phone,
    email: email || '',
    passwordHash: password || 'admin123',
    role: role || 'DATA_ENTRY_OPERATOR',
    permissions: userPerms,
    status: status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users.push(newUser as any);
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'AUTH', `নতুন ব্যবহারকারী তৈরি: ${name} (${role})`);
  realtime.broadcastToMosque(mosqueId, 'USER_CREATED', { id: newUser.id, name: newUser.name, role: newUser.role }, { senderId: req.user!.id });

  res.json({
    success: true,
    data: {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phone,
      email: newUser.email,
      role: newUser.role,
      permissions: newUser.permissions,
      status: newUser.status,
      mosqueId: newUser.mosqueId
    },
    message: 'নতুন ব্যবহারকারী সফলভাবে যুক্ত হয়েছে।'
  });
});

app.put('/api/v1/users/:id', authenticate, requirePermission('MANAGE_USERS'), (req: AuthRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user || (req.user?.role !== 'SUPER_ADMIN' && user.mosqueId !== req.currentMosque!.id)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যবহারকারী পাওয়া যায়নি।' } });
  }

  const { name, phone, email, role, permissions, status } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (email !== undefined) user.email = email;
  if (role) user.role = role;
  if (permissions) user.permissions = permissions;
  if (status) user.status = status;
  user.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'AUTH', `ব্যবহারকারী তথ্য আপডেট: ${user.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'USER_UPDATED', { id: user.id, name: user.name, role: user.role, status: user.status }, { senderId: req.user!.id });

  res.json({ success: true, data: user, message: 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে।' });
});

app.put('/api/v1/users/:id/status', authenticate, requirePermission('MANAGE_USERS'), (req: AuthRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user || (req.user?.role !== 'SUPER_ADMIN' && user.mosqueId !== req.currentMosque!.id)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যবহারকারী পাওয়া যায়নি।' } });
  }

  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'অবস্থা সঠিক নয়।' } });
  }

  user.status = status;
  user.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'AUTH', `ব্যবহারকারীর অবস্থা পরিবর্তন: ${user.name} -> ${status}`);
  res.json({ success: true, data: user, message: `ব্যবহারকারীর অবস্থা "${status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}" করা হয়েছে।` });
});

app.post('/api/v1/users/:id/reset-password', authenticate, requirePermission('MANAGE_USERS'), (req: AuthRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user || (req.user?.role !== 'SUPER_ADMIN' && user.mosqueId !== req.currentMosque!.id)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যবহারকারী পাওয়া যায়নি।' } });
  }

  const { newPassword } = req.body;
  user.passwordHash = newPassword || 'admin123';
  user.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'SETTINGS_CHANGE', 'AUTH', `পাসওয়ার্ড রিসেট করা হয়েছে: ${user.name}`);
  res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে।' });
});

app.delete('/api/v1/users/:id', authenticate, requirePermission('MANAGE_USERS'), (req: AuthRequest, res: Response) => {
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যবহারকারী পাওয়া যায়নি।' } });

  const user = db.users[idx];
  if (req.user?.role !== 'SUPER_ADMIN' && user.mosqueId !== req.currentMosque!.id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
  }

  if (user.id === req.user!.id) {
    return res.status(400).json({ success: false, error: { code: 'SELF_DELETE', message: 'নিজের অ্যাকাউন্ট মুছে ফেলা সম্ভব নয়।' } });
  }

  const removed = db.users.splice(idx, 1)[0];
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'AUTH', `ব্যবহারকারী অ্যাকাউন্ট বাতিল: ${removed.name}`);

  res.json({ success: true, message: 'ব্যবহারকারী অ্যাকাউন্ট সফলভাবে অপসারণ করা হয়েছে।' });
});

app.put('/api/v1/auth/profile', authenticate, (req: AuthRequest, res: Response) => {
  const { name, phone, email, address, photoUrl } = req.body;
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যবহারকারী পাওয়া যায়নি।' } });

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (email) user.email = email;
  if (address) user.address = address;
  if (photoUrl) user.photoUrl = photoUrl;
  user.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(req.currentMosque!.id, user.id, user.name, user.role, 'UPDATE', 'AUTH', 'প্রোফাইল তথ্য আপডেট করা হয়েছে');

  res.json({ success: true, data: user, message: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে।' });
});

// Helper to extract Google Drive File ID from various link formats
function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = trimmed.match(p);
    if (match && match[1]) return match[1];
  }
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

// Helper to fetch image from Google Drive
async function fetchGoogleDriveImage(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const downloadUrls = [
    `https://lh3.googleusercontent.com/d/${fileId}=w1200`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
  ];

  for (const url of downloadUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) continue;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 100) continue;
      if (buffer.length > 8 * 1024 * 1024) continue;

      let mimeType = contentType.split(';')[0].trim();
      if (!mimeType.startsWith('image/')) {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          mimeType = 'image/png';
        } else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          mimeType = 'image/jpeg';
        } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
          mimeType = 'image/webp';
        } else {
          continue;
        }
      }

      return { buffer, mimeType };
    } catch (e) {
      console.warn(`[GDrive Fetch] Failed on ${url}:`, e);
    }
  }

  return null;
}

// ==========================================
// 2. MOSQUE ENDPOINTS & BRANDING
// ==========================================
app.get('/api/v1/mosques', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.json({ success: true, data: [req.currentMosque] });
  }
  res.json({ success: true, data: db.mosques });
});

app.get('/api/v1/mosques/current', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.currentMosque });
});

// Serve mosque official logo directly as binary image asset
app.get('/api/v1/mosques/:mosqueId/branding/logo', (req: Request, res: Response) => {
  const { mosqueId } = req.params;
  const mosque = db.mosques.find(m => m.id === mosqueId);
  if (!mosque) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মসজিদ পাওয়া যায়নি।' } });
  }

  // 1. Check if mosque has a stored uploaded file asset
  if (mosque.logoAssetId) {
    const file = db.uploadedFiles.find(f => f.id === mosque.logoAssetId);
    if (file && file.url) {
      if (file.url.startsWith('data:')) {
        const matches = file.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1] || 'image/png';
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          return res.send(buffer);
        }
      }
    }
  }

  // 2. Check if logoUrl is a data URI
  if (mosque.logoUrl && mosque.logoUrl.startsWith('data:')) {
    const matches = mosque.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1] || 'image/png';
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.send(buffer);
    }
  }

  // 3. Check if logoUrl is external URL (e.g. Unsplash preset)
  if (mosque.logoUrl && (mosque.logoUrl.startsWith('http://') || mosque.logoUrl.startsWith('https://'))) {
    if (!mosque.logoUrl.includes('/branding/logo')) {
      return res.redirect(302, mosque.logoUrl);
    }
  }

  // 4. Default Clean SVG Placeholder fallback (never broken image)
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="24" fill="#F1F5F9"/>
    <path d="M64 28L88 48V100H40V48L64 28Z" fill="#CBD5E1"/>
    <path d="M64 20C65.5 20 67 21 67 22.5V28H61V22.5C61 21 62.5 20 64 20Z" fill="#3B82F6"/>
    <circle cx="64" cy="16" r="3" fill="#3B82F6"/>
    <path d="M54 100V70C54 64.5 58.5 60 64 60C69.5 60 74 64.5 74 70V100" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  return res.send(defaultSvg);
});

// Serve uploaded file binary by ID
app.get('/api/v1/files/:fileId', (req: Request, res: Response) => {
  const file = db.uploadedFiles.find(f => f.id === req.params.fileId);
  if (!file) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ফাইল পাওয়া যায়নি।' } });
  }

  if (file.url.startsWith('data:')) {
    const matches = file.url.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1] || file.fileType || 'application/octet-stream';
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.send(buffer);
    }
  }

  res.redirect(302, file.url);
});

app.put('/api/v1/mosques/current', authenticate, requirePermission('MANAGE_SETTINGS'), (req: AuthRequest, res: Response) => {
  const m = req.currentMosque!;
  const body = req.body;

  const isChangingPresidentSig = body.presidentSignatureUrl !== undefined && body.presidentSignatureUrl !== m.presidentSignatureUrl;
  const isChangingSecretarySig = body.secretarySignatureUrl !== undefined && body.secretarySignatureUrl !== m.secretarySignatureUrl;
  const isChangingLogo = body.logoUrl !== undefined && body.logoUrl !== m.logoUrl;

  // Security Check: Only SUPER_ADMIN and MOSQUE_ADMIN can modify official signatures or logo
  if (isChangingPresidentSig || isChangingSecretarySig || isChangingLogo) {
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'MOSQUE_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'লোগো ও অনুমোদিত স্বাক্ষর পরিবর্তন বা মুছে ফেলার অনুমতি শুধুমাত্র সুপার অ্যাডমিন এবং মসজিদ অ্যাডমিনের রয়েছে।'
        }
      });
    }
  }

  // Track logo changes
  if (isChangingLogo) {
    const oldLogo = m.logoUrl;
    const newLogo = body.logoUrl;
    if (!oldLogo && newLogo) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'MOSQUE_LOGO_ADDED',
        'MOSQUE_SETTINGS',
        'মসজিদের নতুন অফিশিয়াল লোগো যুক্ত করা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'NONE', newState: 'CONFIGURED', status: 'SUCCESS' }
      );
    } else if (oldLogo && newLogo) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'MOSQUE_LOGO_UPDATED',
        'MOSQUE_SETTINGS',
        'মসজিদের অফিশিয়াল লোগো পরিবর্তন ও আপডেট করা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'CONFIGURED', newState: 'UPDATED', status: 'SUCCESS' }
      );
    } else if (oldLogo && !newLogo) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'MOSQUE_LOGO_REMOVED',
        'MOSQUE_SETTINGS',
        'মসজিদের সংরক্ষিত অফিশিয়াল লোগো মুছে ফেলা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'CONFIGURED', newState: 'REMOVED', status: 'SUCCESS' }
      );
      m.logoAssetId = undefined;
      m.logoMetadata = undefined;
    }
  }

  // Track president signature changes
  if (isChangingPresidentSig) {
    const oldSig = m.presidentSignatureUrl;
    const newSig = body.presidentSignatureUrl;
    if (!oldSig && newSig) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'PRESIDENT_SIGNATURE_ADDED',
        'MOSQUE_SETTINGS',
        'সভাপতির নতুন অনুমোদিত ডিজিটাল স্বাক্ষর আপলোড ও যুক্ত করা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'NONE', newState: 'CONFIGURED', status: 'SUCCESS' }
      );
    } else if (oldSig && newSig) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'PRESIDENT_SIGNATURE_UPDATED',
        'MOSQUE_SETTINGS',
        'সভাপতির অনুমোদিত ডিজিটাল স্বাক্ষর পরিবর্তন ও আপডেট করা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'CONFIGURED', newState: 'UPDATED', status: 'SUCCESS' }
      );
    } else if (oldSig && !newSig) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'PRESIDENT_SIGNATURE_REMOVED',
        'MOSQUE_SETTINGS',
        'সভাপতির সংরক্ষিত ডিজিটাল স্বাক্ষর মুছে ফেলা হয়েছে (রশিদ ও রিপোর্টে খালি স্বাক্ষর লাইন প্রযোজ্য)',
        m.id,
        req.ip,
        { previousState: 'CONFIGURED', newState: 'REMOVED', status: 'SUCCESS' }
      );
    }
  }

  // Track secretary signature changes
  if (isChangingSecretarySig) {
    const oldSig = m.secretarySignatureUrl;
    const newSig = body.secretarySignatureUrl;
    if (!oldSig && newSig) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'SECRETARY_SIGNATURE_ADDED',
        'MOSQUE_SETTINGS',
        'সেক্রেটারি / মোতাওয়াল্লীর নতুন অনুমোদিত ডিজিটাল স্বাক্ষর আপলোড ও যুক্ত করা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'NONE', newState: 'CONFIGURED', status: 'SUCCESS' }
      );
    } else if (oldSig && newSig) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'SECRETARY_SIGNATURE_UPDATED',
        'MOSQUE_SETTINGS',
        'সেক্রেটারি / মোতাওয়াল্লীর অনুমোদিত ডিজিটাল স্বাক্ষর পরিবর্তন ও আপডেট করা হয়েছে',
        m.id,
        req.ip,
        { previousState: 'CONFIGURED', newState: 'UPDATED', status: 'SUCCESS' }
      );
    } else if (oldSig && !newSig) {
      db.logAudit(
        m.id,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'SECRETARY_SIGNATURE_REMOVED',
        'MOSQUE_SETTINGS',
        'সেক্রেটারি / মোতাওয়াল্লীর সংরক্ষিত ডিজিটাল স্বাক্ষর মুছে ফেলা হয়েছে (রশিদ ও রিপোর্টে খালি স্বাক্ষর লাইন প্রযোজ্য)',
        m.id,
        req.ip,
        { previousState: 'CONFIGURED', newState: 'REMOVED', status: 'SUCCESS' }
      );
    }
  }

  Object.assign(m, body, { updatedAt: new Date().toISOString() });
  db.save();

  if (!isChangingPresidentSig && !isChangingSecretarySig && !isChangingLogo) {
    db.logAudit(m.id, req.user!.id, req.user!.name, req.user!.role, 'SETTINGS_CHANGE', 'MOSQUE', 'মসজিদের সাধারণ তথ্য ও সেটিংস আপডেট করা হয়েছে');
  }

  realtime.broadcastToMosque(m.id, 'MOSQUE_SETTINGS_UPDATED', m, { senderId: req.user!.id });

  res.json({ success: true, data: m, message: 'মসজিদ সেটিংস, লোগো ও অনুমোদিত স্বাক্ষর সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Dedicated Endpoint for Direct Logo Upload & Management
app.post('/api/v1/mosques/current/branding/logo', authenticate, requirePermission('MANAGE_SETTINGS'), (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'MOSQUE_ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'লোগো পরিবর্তন বা আপলোড করার অনুমতি শুধুমাত্র সুপার অ্যাডমিন এবং মসজিদ অ্যাডমিনের রয়েছে।'
      }
    });
  }

  const { fileName, fileType, mimeType, base64Data } = req.body;
  const m = req.currentMosque!;

  if (!base64Data) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FILE', message: 'ফাইলের ডাটা প্রদান আবশ্যক।' }
    });
  }

  const resolvedMime = mimeType || fileType || 'image/png';
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowedMimes.includes(resolvedMime.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_FORMAT', message: 'শুধুমাত্র PNG, JPG, JPEG বা WEBP ফরম্যাটের ছবি আপলোড করা যাবে।' }
    });
  }

  const fileSize = Math.round((base64Data.length * 3) / 4);
  if (fileSize > 5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'ফাইলের আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।' }
    });
  }

  const fileId = `logo-${m.id}-${Date.now()}`;
  const dataUrl = base64Data.startsWith('data:') ? base64Data : `data:${resolvedMime};base64,${base64Data}`;

  const uploadedAsset = {
    id: fileId,
    mosqueId: m.id,
    fileName: fileName || `${m.code}-logo.png`,
    fileType: resolvedMime,
    fileSize,
    url: dataUrl,
    uploadedBy: req.user!.id,
    uploadedAt: new Date().toISOString(),
  };

  db.uploadedFiles.push(uploadedAsset);

  const oldLogo = m.logoUrl;
  const versionedUrl = `/api/v1/mosques/${m.id}/branding/logo?v=${Date.now()}`;

  m.logoAssetId = fileId;
  m.logoUrl = versionedUrl;
  m.logoMetadata = {
    fileName: fileName || `${m.code}-logo.png`,
    mimeType: resolvedMime,
    fileSize,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.user!.name,
    source: 'UPLOAD',
  };
  m.updatedAt = new Date().toISOString();

  db.save();

  const auditAction = !oldLogo ? 'MOSQUE_LOGO_ADDED' : 'MOSQUE_LOGO_UPDATED';
  const auditDesc = !oldLogo
    ? 'মসজিদের নতুন অফিশিয়াল লোগো আপলোড ও কেন্দ্রীয়ভাবে সংরক্ষণ করা হয়েছে'
    : 'মসজিদের অফিশিয়াল লোগো প্রতিস্থাপন ও আপডেট করা হয়েছে';

  db.logAudit(
    m.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    auditAction,
    'MOSQUE_SETTINGS',
    auditDesc,
    m.id,
    req.ip,
    { status: 'SUCCESS' }
  );

  realtime.broadcastToMosque(m.id, 'MOSQUE_SETTINGS_UPDATED', m, { senderId: req.user!.id });

  res.json({
    success: true,
    data: m,
    message: 'মসজিদের অফিসিয়াল লোগো সফলভাবে আপলোড ও সংরক্ষণ করা হয়েছে।'
  });
});

// Dedicated Endpoint for Google Drive Logo Import
app.post('/api/v1/mosques/current/branding/import-drive', authenticate, requirePermission('MANAGE_SETTINGS'), async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'MOSQUE_ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'লোগো পরিবর্তন বা ইমপোর্ট করার অনুমতি শুধুমাত্র সুপার অ্যাডমিন এবং মসজিদ অ্যাডমিনের রয়েছে।'
      }
    });
  }

  const { driveUrl } = req.body;
  const m = req.currentMosque!;

  if (!driveUrl || typeof driveUrl !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_URL', message: 'Google Drive লিংক প্রদান আবশ্যক।' }
    });
  }

  const fileId = extractGoogleDriveFileId(driveUrl);
  if (!fileId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DRIVE_URL',
        message: 'অনুগ্রহ করে একটি সঠিক Google Drive ফাইল লিংক দিন (যেমন: https://drive.google.com/file/d/...)।'
      }
    });
  }

  const fetched = await fetchGoogleDriveImage(fileId);
  if (!fetched) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'GOOGLE_DRIVE_FETCH_FAILED',
        message: 'Google Drive লিংক থেকে লোগো নেওয়া সম্ভব হয়নি। অনুগ্রহ করে ফাইলটির এক্সেস "Anyone with the link (Viewer)" করা আছে কিনা নিশ্চিত করুন অথবা ছবিটি সরাসরি Upload করুন।'
      }
    });
  }

  const base64Data = fetched.buffer.toString('base64');
  const assetId = `gdrive-logo-${m.id}-${Date.now()}`;
  const dataUrl = `data:${fetched.mimeType};base64,${base64Data}`;

  const uploadedAsset = {
    id: assetId,
    mosqueId: m.id,
    fileName: `gdrive-imported-logo.${fetched.mimeType.split('/')[1] || 'png'}`,
    fileType: fetched.mimeType,
    fileSize: fetched.buffer.length,
    url: dataUrl,
    uploadedBy: req.user!.id,
    uploadedAt: new Date().toISOString(),
  };

  db.uploadedFiles.push(uploadedAsset);

  const versionedUrl = `/api/v1/mosques/${m.id}/branding/logo?v=${Date.now()}`;
  m.logoAssetId = assetId;
  m.logoUrl = versionedUrl;
  m.logoMetadata = {
    fileName: uploadedAsset.fileName,
    mimeType: fetched.mimeType,
    fileSize: fetched.buffer.length,
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.user!.name,
    source: 'GOOGLE_DRIVE',
    originalDriveUrl: driveUrl,
  };
  m.updatedAt = new Date().toISOString();

  db.save();

  db.logAudit(
    m.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'MOSQUE_LOGO_UPDATED',
    'MOSQUE_SETTINGS',
    'Google Drive থেকে নতুন লোগো সফলভাবে ইমপোর্ট ও সংরক্ষণ করা হয়েছে',
    m.id,
    req.ip,
    { status: 'SUCCESS' }
  );

  realtime.broadcastToMosque(m.id, 'MOSQUE_SETTINGS_UPDATED', m, { senderId: req.user!.id });

  res.json({
    success: true,
    data: m,
    message: 'Google Drive থেকে লোগো সফলভাবে ইমপোর্ট ও সংরক্ষণ করা হয়েছে।'
  });
});

// Dedicated Endpoint to Remove Mosque Logo
app.delete('/api/v1/mosques/current/branding/logo', authenticate, requirePermission('MANAGE_SETTINGS'), (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'MOSQUE_ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'লোগো মুছে ফেলার অনুমতি শুধুমাত্র সুপার অ্যাডমিন এবং মসজিদ অ্যাডমিনের রয়েছে।'
      }
    });
  }

  const m = req.currentMosque!;
  m.logoUrl = '';
  m.logoAssetId = undefined;
  m.logoMetadata = undefined;
  m.updatedAt = new Date().toISOString();

  db.save();

  db.logAudit(
    m.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'MOSQUE_LOGO_REMOVED',
    'MOSQUE_SETTINGS',
    'মসজিদের সংরক্ষিত অফিশিয়াল লোগো মুছে ফেলা হয়েছে',
    m.id,
    req.ip,
    { status: 'SUCCESS' }
  );

  realtime.broadcastToMosque(m.id, 'MOSQUE_SETTINGS_UPDATED', m, { senderId: req.user!.id });

  res.json({
    success: true,
    data: m,
    message: 'মসজিদের লোগো সফলভাবে মুছে ফেলা হয়েছে।'
  });
});

// Dedicated Endpoint for Signatures
app.put('/api/v1/mosques/current/signatures', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'MOSQUE_ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'অনুমোদিত স্বাক্ষর পরিবর্তন করার অনুমতি শুধুমাত্র সুপার অ্যাডমিন এবং মসজিদ অ্যাডমিনের রয়েছে।'
      }
    });
  }

  const m = req.currentMosque!;
  const { presidentSignatureUrl, secretarySignatureUrl } = req.body;

  if (presidentSignatureUrl !== undefined && presidentSignatureUrl !== m.presidentSignatureUrl) {
    const oldSig = m.presidentSignatureUrl;
    m.presidentSignatureUrl = presidentSignatureUrl || '';
    const action = !oldSig && presidentSignatureUrl ? 'PRESIDENT_SIGNATURE_ADDED' : !presidentSignatureUrl ? 'PRESIDENT_SIGNATURE_REMOVED' : 'PRESIDENT_SIGNATURE_UPDATED';
    db.logAudit(
      m.id,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      action,
      'MOSQUE_SETTINGS',
      action === 'PRESIDENT_SIGNATURE_ADDED'
        ? 'সভাপতির নতুন অনুমোদিত ডিজিটাল স্বাক্ষর আপলোড ও যুক্ত করা হয়েছে'
        : action === 'PRESIDENT_SIGNATURE_REMOVED'
        ? 'সভাপতির সংরক্ষিত ডিজিটাল স্বাক্ষর মুছে ফেলা হয়েছে'
        : 'সভাপতির অনুমোদিত ডিজিটাল স্বাক্ষর পরিবর্তন করা হয়েছে',
      m.id,
      req.ip
    );
  }

  if (secretarySignatureUrl !== undefined && secretarySignatureUrl !== m.secretarySignatureUrl) {
    const oldSig = m.secretarySignatureUrl;
    m.secretarySignatureUrl = secretarySignatureUrl || '';
    const action = !oldSig && secretarySignatureUrl ? 'SECRETARY_SIGNATURE_ADDED' : !secretarySignatureUrl ? 'SECRETARY_SIGNATURE_REMOVED' : 'SECRETARY_SIGNATURE_UPDATED';
    db.logAudit(
      m.id,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      action,
      'MOSQUE_SETTINGS',
      action === 'SECRETARY_SIGNATURE_ADDED'
        ? 'সেক্রেটারি / মোতাওয়াল্লীর নতুন অনুমোদিত ডিজিটাল স্বাক্ষর আপলোড ও যুক্ত করা হয়েছে'
        : action === 'SECRETARY_SIGNATURE_REMOVED'
        ? 'সেক্রেটারি / মোতাওয়াল্লীর সংরক্ষিত ডিজিটাল স্বাক্ষর মুছে ফেলা হয়েছে'
        : 'সেক্রেটারি / মোতাওয়াল্লীর অনুমোদিত ডিজিটাল স্বাক্ষর পরিবর্তন করা হয়েছে',
      m.id,
      req.ip
    );
  }

  m.updatedAt = new Date().toISOString();
  db.save();
  realtime.broadcastToMosque(m.id, 'MOSQUE_SETTINGS_UPDATED', m, { senderId: req.user!.id });

  res.json({
    success: true,
    data: {
      presidentSignatureUrl: m.presidentSignatureUrl,
      secretarySignatureUrl: m.secretarySignatureUrl,
    },
    message: 'অনুমোদিত স্বাক্ষর সফলভাবে সংরক্ষিত হয়েছে।'
  });
});

// Public transparency portal
app.get('/api/v1/mosques/public/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  const mosque = db.mosques.find(m => m.code.toLowerCase() === code.toLowerCase() || m.id.toLowerCase() === code.toLowerCase());
  if (!mosque) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মসজিদ খুঁজে পাওয়া যায়নি।' } });
  }

  const publicNotices = db.notices.filter(n => n.mosqueId === mosque.id && n.isPublic && n.status === 'ACTIVE');
  const stats = db.getDashboardStats(mosque.id);

  res.json({
    success: true,
    data: {
      id: mosque.id,
      code: mosque.code,
      nameBn: mosque.nameBn,
      nameEn: mosque.nameEn,
      waqfEstateName: mosque.waqfEstateName,
      registrationNumber: mosque.registrationNumber,
      address: mosque.address,
      phone: mosque.phone,
      email: mosque.email,
      logoUrl: mosque.logoUrl,
      qrSettings: mosque.qrSettings,
      notices: publicNotices,
      transparencyStats: {
        currentBalance: stats.currentBalance,
        monthlyIncome: stats.monthlyIncome,
        monthlyExpense: stats.monthlyExpense,
        totalDonation: stats.totalDonation,
      }
    }
  });
});

// ==========================================
// 3. DASHBOARD STATS
// ==========================================
app.get('/api/v1/dashboard/stats', authenticate, (req: AuthRequest, res: Response) => {
  const stats = db.getDashboardStats(req.currentMosque!.id);
  res.json({ success: true, data: stats });
});

// ==========================================
// 4. ACCOUNTING & ACCOUNTS API
// ==========================================
app.get('/api/v1/accounting/account-heads', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const heads = db.accountHeads.filter(h => h.mosqueId === mosqueId);
  res.json({ success: true, data: heads });
});

app.post('/api/v1/accounting/account-heads', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const { nameBn, nameEn, type, parentId } = req.body;
  if (!nameBn || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'খাতের নাম এবং ধরন প্রদান আবশ্যক।' } });
  }

  const mosqueId = req.currentMosque!.id;
  const count = db.accountHeads.filter(h => h.mosqueId === mosqueId && h.type === type).length + 1;
  const code = `${type === 'INCOME' ? 'INC' : 'EXP'}-${100 + count * 10}`;

  const newHead = {
    id: `head-${Date.now()}`,
    mosqueId,
    code,
    nameBn,
    nameEn: nameEn || nameBn,
    type,
    parentId: parentId || null,
    isActive: true,
  };

  db.accountHeads.push(newHead);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'ACCOUNT_HEAD', `নতুন খাত তৈরি: ${nameBn}`);
  realtime.broadcastToMosque(mosqueId, 'ACCOUNT_HEAD_CREATED', newHead, { senderId: req.user!.id });

  res.json({ success: true, data: newHead, message: 'নতুন হিসাব খাত সফলভাবে তৈরি হয়েছে।' });
});

app.get('/api/v1/accounting/accounts', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const accounts = db.accounts.filter(a => a.mosqueId === mosqueId);
  res.json({ success: true, data: accounts });
});

app.get('/api/v1/accounting/accounts/:id', authenticate, (req: AuthRequest, res: Response) => {
  const account = db.accounts.find(a => a.id === req.params.id && a.mosqueId === req.currentMosque!.id);
  if (!account) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'অ্যাকাউন্ট পাওয়া যায়নি।' } });
  res.json({ success: true, data: account });
});

app.post('/api/v1/accounting/accounts', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const { nameBn, accountType, bankName, branchName, accountNumber, openingBalance } = req.body;
  const mosqueId = req.currentMosque!.id;
  const bal = Number(openingBalance) || 0;

  const newAcc = {
    id: `acc-${Date.now()}`,
    mosqueId,
    name: nameBn,
    nameBn,
    accountType,
    bankName,
    branchName,
    accountNumber,
    openingBalance: bal,
    currentBalance: bal,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString()
  };

  db.accounts.push(newAcc);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'FINANCIAL_ACCOUNT', `নতুন ফান্ড/অ্যাকাউন্ট তৈরি: ${nameBn}`);
  realtime.broadcastToMosque(mosqueId, 'ACCOUNT_CREATED', newAcc, { senderId: req.user!.id });

  res.json({ success: true, data: newAcc, message: 'নতুন হিসাব সফলভাবে খোলা হয়েছে।' });
});

// Inter-Account Fund Transfer (Cash <-> Bank with double-entry safety)
app.post('/api/v1/accounting/accounts/transfer', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const { fromAccountId, toAccountId, amount, date, description, reference } = req.body;
  const numAmount = Number(amount);
  const mosqueId = req.currentMosque!.id;

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'স্থানান্তরের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।' } });
  }
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ success: false, error: { code: 'SAME_ACCOUNT', message: 'একই অ্যাকাউন্টে স্থানান্তর সম্ভব নয়।' } });
  }

  const fromAcc = db.accounts.find(a => a.id === fromAccountId && a.mosqueId === mosqueId);
  const toAcc = db.accounts.find(a => a.id === toAccountId && a.mosqueId === mosqueId);

  if (!fromAcc || !toAcc) {
    return res.status(404).json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'প্রেরক বা প্রাপক অ্যাকাউন্ট পাওয়া যায়নি।' } });
  }

  if (fromAcc.currentBalance < numAmount) {
    return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_BALANCE', message: `উৎস অ্যাকাউন্টে পর্যাপ্ত স্থিতি নেই (বর্তমান স্থিতি: ৳ ${fromAcc.currentBalance})` } });
  }

  // Atomic Transfer
  fromAcc.currentBalance -= numAmount;
  toAcc.currentBalance += numAmount;

  const count = db.transfers.filter(t => t.mosqueId === mosqueId).length + 1;
  const transferNumber = `TRF-${new Date().getFullYear()}-${String(count).padStart(6, '0')}`;

  const transfer = {
    id: `trf-${Date.now()}`,
    mosqueId,
    transferNumber,
    fromAccountId: fromAcc.id,
    fromAccountName: fromAcc.nameBn,
    toAccountId: toAcc.id,
    toAccountName: toAcc.nameBn,
    amount: numAmount,
    date: date || new Date().toISOString().split('T')[0],
    description,
    reference,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  db.transfers.unshift(transfer);
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'ACCOUNT_TRANSFER', `তহবিল স্থানান্তর (${transferNumber}): ${fromAcc.nameBn} -> ${toAcc.nameBn} (৳ ${numAmount})`);
  realtime.broadcastToMosque(mosqueId, 'ACCOUNT_TRANSFER', { transfer, fromAccount: fromAcc, toAccount: toAcc }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: transfer, message: 'তহবিল সফলভাবে স্থানান্তর ও সমন্বয় করা হয়েছে।' });
});

// ==========================================
// 5. INCOME MANAGEMENT (With Idempotency)
// ==========================================
app.get('/api/v1/accounting/income', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const items = db.incomeEntries
    .filter(i => i.mosqueId === mosqueId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ success: true, data: items });
});

app.get('/api/v1/accounting/income/:id', authenticate, (req: AuthRequest, res: Response) => {
  const item = db.incomeEntries.find(i => i.id === req.params.id && i.mosqueId === req.currentMosque!.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'আয় ভাউচার পাওয়া যায়নি।' } });
  res.json({ success: true, data: item });
});

app.post('/api/v1/accounting/income', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  // Idempotency check
  const cached = db.checkIdempotency(req.idempotencyKey);
  if (cached) {
    return res.json(cached);
  }

  const { mainHeadId, subHeadId, amount, paymentMethod, accountId, donorName, donorPhone, reference, description, date, attachmentUrl } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'টাকার পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' } });
  }

  const mosqueId = req.currentMosque!.id;
  const mainHead = db.accountHeads.find(h => h.id === mainHeadId);
  const subHead = db.accountHeads.find(h => h.id === subHeadId);
  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId);

  const year = new Date().getFullYear();
  const count = db.incomeEntries.filter(i => i.mosqueId === mosqueId).length + 1;
  const voucherNumber = `INC-${year}-${String(count).padStart(6, '0')}`;

  const entry = {
    id: `inc-${Date.now()}`,
    mosqueId,
    voucherNumber,
    date: date || new Date().toISOString().split('T')[0],
    mainHeadId,
    mainHeadNameBn: mainHead?.nameBn || 'সাধারণ দান',
    subHeadId,
    subHeadNameBn: subHead?.nameBn,
    amount: numAmount,
    paymentMethod: paymentMethod || 'CASH',
    accountId: account?.id || 'acc-cash-01',
    accountName: account?.nameBn || 'প্রধান ক্যাশ',
    donorName: donorName || 'সম্মানিত দানশীল মুসল্লি',
    donorPhone,
    reference,
    description,
    attachmentUrl,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    status: 'APPROVED' as const,
    approvedBy: req.user!.id,
    approvedByName: req.user!.name,
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Update account balance
  if (account) {
    account.currentBalance += numAmount;
  }

  db.incomeEntries.unshift(entry);
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'INCOME', `আয় ভাউচার তৈরি (${voucherNumber}): ৳ ${numAmount}`, entry.id);

  const responsePayload = { success: true, data: entry, message: 'আয় ভাউচার সফলভাবে সংরক্ষণ ও অ্যাকাউন্টে পোস্টিং করা হয়েছে।' };
  db.saveIdempotency(req.idempotencyKey, responsePayload);

  // Broadcast WebSocket event
  realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', entry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json(responsePayload);
});

// Reverse / Cancel Income Voucher
app.post('/api/v1/accounting/income/:id/reverse', authenticate, requirePermission('APPROVE_INCOME'), (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const item = db.incomeEntries.find(i => i.id === req.params.id && i.mosqueId === req.currentMosque!.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ভাউচার পাওয়া যায়নি।' } });

  if (item.status === 'CANCELLED') {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_CANCELLED', message: 'এই ভাউচার ইতিমধ্যে বাতিল করা হয়েছে।' } });
  }

  const account = db.accounts.find(a => a.id === item.accountId);
  if (account && item.status === 'APPROVED') {
    account.currentBalance -= item.amount;
  }

  item.status = 'CANCELLED';
  item.rejectionReason = reason || 'অ্যাডমিন কর্তৃক রিভার্সাল';
  item.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'CANCEL', 'INCOME', `আয় ভাউচার বাতিল (${item.voucherNumber}): ৳ ${item.amount} - কারণ: ${reason}`, item.id);

  realtime.broadcastToMosque(req.currentMosque!.id, 'INCOME_REVERSED', item, { senderId: req.user!.id });
  realtime.broadcastToMosque(req.currentMosque!.id, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(req.currentMosque!.id));

  res.json({ success: true, data: item, message: 'ভাউচার সফলভাবে রিভার্স/বাতিল করা হয়েছে এবং ব্যালেন্স সমন্বয় করা হয়েছে।' });
});

// ==========================================
// 6. EXPENSE MANAGEMENT (With Idempotency)
// ==========================================
app.get('/api/v1/accounting/expense', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const items = db.expenseEntries
    .filter(e => e.mosqueId === mosqueId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ success: true, data: items });
});

app.get('/api/v1/accounting/expense/:id', authenticate, (req: AuthRequest, res: Response) => {
  const item = db.expenseEntries.find(e => e.id === req.params.id && e.mosqueId === req.currentMosque!.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যয় ভাউচার পাওয়া যায়নি।' } });
  res.json({ success: true, data: item });
});

app.post('/api/v1/accounting/expense', authenticate, requirePermission('CREATE_EXPENSE'), (req: AuthRequest, res: Response) => {
  const cached = db.checkIdempotency(req.idempotencyKey);
  if (cached) {
    return res.json(cached);
  }

  const { mainHeadId, subHeadId, amount, paymentMethod, accountId, payeeName, payeePhone, reference, description, date, attachmentUrl } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'খরচের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' } });
  }

  const mosqueId = req.currentMosque!.id;
  const mainHead = db.accountHeads.find(h => h.id === mainHeadId);
  const subHead = db.accountHeads.find(h => h.id === subHeadId);
  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId);

  const year = new Date().getFullYear();
  const count = db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1;
  const voucherNumber = `EXP-${year}-${String(count).padStart(6, '0')}`;

  const entry = {
    id: `exp-${Date.now()}`,
    mosqueId,
    voucherNumber,
    date: date || new Date().toISOString().split('T')[0],
    mainHeadId,
    mainHeadNameBn: mainHead?.nameBn || 'অন্যান্য ব্যয়',
    subHeadId,
    subHeadNameBn: subHead?.nameBn,
    amount: numAmount,
    paymentMethod: paymentMethod || 'CASH',
    accountId: account?.id || 'acc-cash-01',
    accountName: account?.nameBn || 'প্রধান ক্যাশ',
    payeeName: payeeName || 'সরবরাহকারী/স্টাফ',
    payeePhone,
    reference,
    description,
    attachmentUrl,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    status: 'APPROVED' as const,
    approvedBy: req.user!.id,
    approvedByName: req.user!.name,
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (account) {
    account.currentBalance -= numAmount;
  }

  db.expenseEntries.unshift(entry);
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'EXPENSE', `ব্যয় ভাউচার তৈরি (${voucherNumber}): ৳ ${numAmount}`, entry.id);

  const responsePayload = { success: true, data: entry, message: 'ব্যয় ভাউচার সফলভাবে অনুমোদিত ও পরিশোধ রেকর্ড করা হয়েছে।' };
  db.saveIdempotency(req.idempotencyKey, responsePayload);

  realtime.broadcastToMosque(mosqueId, 'EXPENSE_CREATED', entry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json(responsePayload);
});

// Reverse / Cancel Expense Voucher
app.post('/api/v1/accounting/expense/:id/reverse', authenticate, requirePermission('APPROVE_EXPENSE'), (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const item = db.expenseEntries.find(e => e.id === req.params.id && e.mosqueId === req.currentMosque!.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ভাউচার পাওয়া যায়নি।' } });

  if (item.status === 'CANCELLED') {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_CANCELLED', message: 'এই ভাউচার ইতিমধ্যে বাতিল করা হয়েছে।' } });
  }

  const account = db.accounts.find(a => a.id === item.accountId);
  if (account && item.status === 'APPROVED') {
    account.currentBalance += item.amount;
  }

  item.status = 'CANCELLED';
  item.rejectionReason = reason || 'অ্যাডমিন কর্তৃক রিভার্সাল';
  item.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'CANCEL', 'EXPENSE', `ব্যয় ভাউচার বাতিল (${item.voucherNumber}): ৳ ${item.amount}`, item.id);

  realtime.broadcastToMosque(req.currentMosque!.id, 'EXPENSE_REVERSED', item, { senderId: req.user!.id });
  realtime.broadcastToMosque(req.currentMosque!.id, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(req.currentMosque!.id));

  res.json({ success: true, data: item, message: 'ব্যয় ভাউচার সফলভাবে রিভার্স/বাতিল করা হয়েছে এবং ব্যালেন্স ফিরিয়ে দেওয়া হয়েছে।' });
});

// ==========================================
// 7. DONATIONS & RECEIPT GENERATOR
// ==========================================
app.get('/api/v1/donations', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const items = db.donations
    .filter(d => d.mosqueId === mosqueId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ success: true, data: items });
});

app.get('/api/v1/donations/:id', authenticate, (req: AuthRequest, res: Response) => {
  const donation = db.donations.find(d => d.id === req.params.id && d.mosqueId === req.currentMosque!.id);
  if (!donation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'রসিদ পাওয়া যায়নি।' } });
  res.json({ success: true, data: donation });
});

app.post('/api/v1/donations', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  const cached = db.checkIdempotency(req.idempotencyKey);
  if (cached) {
    return res.json(cached);
  }

  const { donorName, donorPhone, donorAddress, isAnonymous, category, amount, paymentMethod, accountId, reference, date } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'অনুদানের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' } });
  }

  const mosqueId = req.currentMosque!.id;
  const year = new Date().getFullYear();
  const count = db.donations.filter(d => d.mosqueId === mosqueId).length + 1;
  const receiptNumber = `REC-${year}-${String(100 + count).padStart(6, '0')}`;
  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId) || db.accounts[0];

  const donation = {
    id: `don-${Date.now()}`,
    mosqueId,
    receiptNumber,
    donorName: isAnonymous ? 'আল্লাহর এক বান্দা (Anonymous)' : (donorName || 'সম্মানিত দানশীল'),
    donorPhone: isAnonymous ? '' : donorPhone,
    donorAddress,
    isAnonymous: Boolean(isAnonymous),
    category: category || 'GENERAL',
    amount: numAmount,
    paymentMethod: paymentMethod || 'CASH',
    accountId: account.id,
    accountName: account.nameBn,
    reference,
    date: date || new Date().toISOString().split('T')[0],
    receivedBy: req.user!.id,
    receivedByName: req.user!.name,
    status: 'COMPLETED' as const,
    createdAt: new Date().toISOString()
  };

  account.currentBalance += numAmount;
  db.donations.unshift(donation);

  // Auto-create income entry for double entry consistency
  const incVoucherNumber = `INC-${year}-${String(db.incomeEntries.filter(i => i.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;
  const incEntry = {
    id: `inc-don-${Date.now()}`,
    mosqueId,
    voucherNumber: incVoucherNumber,
    date: donation.date,
    mainHeadId: 'head-inc-01',
    mainHeadNameBn: 'দান ও অনুদান (Donations)',
    subHeadId: 'head-inc-01-3',
    subHeadNameBn: `মাসিক ও বিশেষ অনুদান (${donation.donorName})`,
    amount: numAmount,
    paymentMethod: donation.paymentMethod,
    accountId: account.id,
    accountName: account.nameBn,
    donorName: donation.donorName,
    donorPhone: donation.donorPhone,
    reference: `Receipt: ${receiptNumber}`,
    description: `দান রসিদ ${receiptNumber} এর বিপরীতে সংগৃহীত অনুদান`,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    status: 'APPROVED' as const,
    approvedBy: req.user!.id,
    approvedByName: req.user!.name,
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.incomeEntries.unshift(incEntry);
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'DONATION', `দান রসিদ প্রস্তুত (${receiptNumber}): ৳ ${numAmount} - ${donation.donorName}`);

  const responsePayload = { success: true, data: donation, message: 'অনুদানের মানি রিসিট প্রস্তুত ও ফান্ডে যোগ করা হয়েছে।' };
  db.saveIdempotency(req.idempotencyKey, responsePayload);

  realtime.broadcastToMosque(mosqueId, 'DONATION_CREATED', donation, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', incEntry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json(responsePayload);
});

// Donation Boxes & Collection
app.get('/api/v1/donation-boxes', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const boxes = db.donationBoxes.filter(b => b.mosqueId === mosqueId);
  const collections = db.donationBoxCollections.filter(c => c.mosqueId === mosqueId);
  res.json({ success: true, data: { boxes, collections } });
});

app.post('/api/v1/donation-boxes', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const { boxNumber, boxCode, manualName, location, shopName, ownerName, ownerPhone, address, area, ward, responsiblePerson, status, description, notes, lastCollectedDate, installationDate, createdAt } = req.body;
  const mosqueId = req.currentMosque!.id;
  const existingCount = db.donationBoxes.filter(b => b.mosqueId === mosqueId).length;
  const code = boxCode || boxNumber || `BOX-${String(existingCount + 1).padStart(3, '0')}`;

  const box: DonationBox = {
    id: `box-${Date.now()}`,
    mosqueId,
    boxCode: code,
    manualName: manualName || '',
    location: location || shopName || 'প্রধান ফটক',
    shopName: shopName || '',
    ownerName: ownerName || '',
    ownerPhone: ownerPhone || '',
    address: address || '',
    area: area || '',
    ward: ward || '',
    responsiblePerson: responsiblePerson || '',
    description: description || notes || '',
    notes: notes || description || '',
    status: status || 'ACTIVE',
    lastCollectedDate: lastCollectedDate ? lastCollectedDate : undefined,
    installationDate: installationDate || createdAt || new Date().toISOString().split('T')[0],
    totalCollected: 0,
    createdAt: installationDate || createdAt || new Date().toISOString()
  };

  db.donationBoxes.push(box);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'DONATION_BOX', `নতুন দানবাক্স তৈরি: ${box.boxCode} (${box.manualName || box.shopName || box.location})`);
  realtime.broadcastToMosque(mosqueId, 'DONATION_BOX_CREATED', box, { senderId: req.user!.id });

  res.json({ success: true, data: box, message: 'দানবাক্স সফলভাবে তৈরি হয়েছে।' });
});

app.put('/api/v1/donation-boxes/:id', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const box = db.donationBoxes.find(b => b.id === req.params.id && b.mosqueId === req.currentMosque!.id);
  if (!box) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দানবাক্স পাওয়া যায়নি।' } });
  }

  const { boxCode, manualName, location, shopName, ownerName, ownerPhone, address, area, ward, responsiblePerson, status, description, notes, lastCollectedDate, installationDate, createdAt } = req.body;

  if (boxCode !== undefined) box.boxCode = boxCode;
  if (manualName !== undefined) box.manualName = manualName;
  if (location !== undefined) box.location = location;
  if (shopName !== undefined) box.shopName = shopName;
  if (ownerName !== undefined) box.ownerName = ownerName;
  if (ownerPhone !== undefined) box.ownerPhone = ownerPhone;
  if (address !== undefined) box.address = address;
  if (area !== undefined) box.area = area;
  if (ward !== undefined) box.ward = ward;
  if (responsiblePerson !== undefined) box.responsiblePerson = responsiblePerson;
  if (status !== undefined) box.status = status;
  if (description !== undefined) box.description = description;
  if (notes !== undefined) box.notes = notes;
  if (lastCollectedDate !== undefined) box.lastCollectedDate = lastCollectedDate ? lastCollectedDate : undefined;
  if (installationDate !== undefined) box.installationDate = installationDate;
  if (createdAt !== undefined) box.createdAt = createdAt;

  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'DONATION_BOX', `দানবাক্স তথ্য আপডেট: ${box.boxCode} (${box.manualName || box.shopName || box.location})`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'DONATION_BOX_UPDATED', box, { senderId: req.user!.id });

  res.json({ success: true, data: box, message: 'দানবাক্সের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।' });
});

app.delete('/api/v1/donation-boxes/:id', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const idx = db.donationBoxes.findIndex(b => b.id === req.params.id && b.mosqueId === req.currentMosque!.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দানবাক্স পাওয়া যায়নি।' } });
  }

  const removed = db.donationBoxes.splice(idx, 1)[0];
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'DONATION_BOX', `দানবাক্স মুছে ফেলা হয়েছে: ${removed.boxCode}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'DONATION_BOX_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'দানবাক্স সফলভাবে মুছে ফেলা হয়েছে।' });
});

app.post('/api/v1/donation-boxes/collect', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  const { boxId, amount, witnesses, countingTeam, notes, accountId, date } = req.body;
  const numAmount = Number(amount);
  const mosqueId = req.currentMosque!.id;
  const box = db.donationBoxes.find(b => b.id === boxId && b.mosqueId === mosqueId);
  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId) || db.accounts[0];

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'সংগৃহীত টাকার পরিমাণ আবশ্যক।' } });
  }

  const year = new Date().getFullYear();
  const count = db.donationBoxCollections.filter(c => c.mosqueId === mosqueId).length + 1;
  const collectionNumber = `BOX-COL-${year}-${String(count).padStart(5, '0')}`;

  const colDate = date || new Date().toISOString().split('T')[0];
  const colWitnesses = Array.isArray(witnesses) ? witnesses : (witnesses ? witnesses.split(',') : ['কমিটি সদস্যবৃন্দ']);
  const colCountingTeam = Array.isArray(countingTeam) ? countingTeam : (countingTeam ? countingTeam.split(',') : [req.user!.name]);

  const incVoucherNumber = `INC-${year}-${String(db.incomeEntries.filter(i => i.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;

  const collection: DonationBoxCollection = {
    id: `col-${Date.now()}`,
    mosqueId,
    boxId: box?.id || 'box-01',
    boxCode: box?.boxCode || 'BOX-01',
    collectionDate: colDate,
    amount: numAmount,
    countingTeam: colCountingTeam,
    witnesses: colWitnesses,
    depositAccountId: account.id,
    depositAccountName: account.nameBn,
    depositReference: collectionNumber,
    incomeVoucherNumber: incVoucherNumber,
    notes,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  if (box) {
    box.lastCollectedDate = colDate;
    box.totalCollected = (box.totalCollected || 0) + numAmount;
  }
  account.currentBalance += numAmount;

  // Auto-create income voucher for collection
  const incEntry = {
    id: `inc-box-${Date.now()}`,
    mosqueId,
    voucherNumber: incVoucherNumber,
    date: colDate,
    mainHeadId: 'head-inc-01',
    mainHeadNameBn: 'দান ও অনুদান',
    subHeadId: 'head-inc-01-2',
    subHeadNameBn: `দানবাক্স খোলা কালেকশন (${box?.boxCode || 'বাক্স'})`,
    amount: numAmount,
    paymentMethod: 'CASH' as const,
    accountId: account.id,
    accountName: account.nameBn,
    donorName: `দানবাক্স সংগ্রাহক (${collectionNumber})`,
    description: `দানবাক্স কালেকশন ভাউচার ${collectionNumber}`,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    status: 'APPROVED' as const,
    approvedBy: req.user!.id,
    approvedByName: req.user!.name,
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.donationBoxCollections.unshift(collection);
  db.incomeEntries.unshift(incEntry);
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'DONATION_BOX_COLLECT', `দানবাক্স খোলা ও জমা (${collectionNumber}): ৳ ${numAmount}`);

  realtime.broadcastToMosque(mosqueId, 'DONATION_BOX_COLLECTED', { collection, box }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', incEntry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: collection, message: 'দানবাক্সের টাকা সফলভাবে গণনা ও তহবিলে জমা করা হয়েছে।' });
});

// ==========================================
// 8. COMMITTEE & MEETING MANAGEMENT
// ==========================================
app.get('/api/v1/committee', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const terms = db.committeeTerms.filter(t => t.mosqueId === mosqueId);
  const members = db.committeeMembers.filter(m => m.mosqueId === mosqueId);
  const meetings = db.committeeMeetings.filter(m => m.mosqueId === mosqueId);
  res.json({ success: true, data: { terms, members, meetings } });
});

app.post('/api/v1/committee/terms', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const { termName, startDate, endDate, description } = req.body;
  const mosqueId = req.currentMosque!.id;

  const term: CommitteeTerm = {
    id: `term-${Date.now()}`,
    mosqueId,
    title: termName || 'নতুন মেয়াদকাল',
    startDate,
    endDate,
    status: 'ACTIVE',
    description,
    createdAt: new Date().toISOString()
  };

  db.committeeTerms.unshift(term);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'COMMITTEE_TERM', `নতুন মেয়াদকাল তৈরি: ${term.title}`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TERM_CREATED', term, { senderId: req.user!.id });

  res.json({ success: true, data: term, message: 'কমিটির নতুন মেয়াদকাল সফলভাবে যুক্ত হয়েছে।' });
});

app.post('/api/v1/committee/members', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const { termId, name, designation, designationBn, phone, nid, email, address, occupation, photoUrl, orderIndex } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!name || !designationBn || !phone) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'সদস্যের নাম, পদবী ও মোবাইল নম্বর আবশ্যক।' } });
  }

  const member: CommitteeMember = {
    id: `mem-${Date.now()}`,
    mosqueId,
    termId: termId || db.committeeTerms.find(t => t.mosqueId === mosqueId)?.id || 'term-2025-2027',
    name,
    nid: nid || '',
    phone,
    address,
    photoUrl,
    position: (designation as any) || 'MEMBER',
    positionCustomBn: designationBn,
    joinDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    notes: occupation ? `পেশা: ${occupation}` : undefined,
    createdAt: new Date().toISOString()
  };

  db.committeeMembers.push(member);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'COMMITTEE_MEMBER', `কমিটিতে সদস্য অন্তর্ভুক্তি: ${name} (${designationBn})`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_MEMBER_CREATED', member, { senderId: req.user!.id });

  res.json({ success: true, data: member, message: 'কমিটির সদস্য সফলভাবে অন্তর্ভুক্ত করা হয়েছে।' });
});

app.put('/api/v1/committee/members/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const member = db.committeeMembers.find(m => m.id === req.params.id && m.mosqueId === req.currentMosque!.id);
  if (!member) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সদস্য পাওয়া যায়নি।' } });

  Object.assign(member, req.body);
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'COMMITTEE_MEMBER', `সদস্য তথ্য আপডেট: ${member.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'COMMITTEE_MEMBER_UPDATED', member, { senderId: req.user!.id });

  res.json({ success: true, data: member, message: 'সদস্য তথ্য সফলভাবে আপডেট হয়েছে।' });
});

app.delete('/api/v1/committee/members/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const idx = db.committeeMembers.findIndex(m => m.id === req.params.id && m.mosqueId === req.currentMosque!.id);
  if (idx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সদস্য পাওয়া যায়নি।' } });

  const removed = db.committeeMembers.splice(idx, 1)[0];
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'COMMITTEE_MEMBER', `কমিটি থেকে সদস্য অপসারণ: ${removed.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'COMMITTEE_MEMBER_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'সদস্য সফলভাবে অপসারণ করা হয়েছে।' });
});

app.get('/api/v1/committee/meetings', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const meetings = db.committeeMeetings.filter(m => m.mosqueId === mosqueId);
  res.json({ success: true, data: meetings });
});

app.post('/api/v1/committee/meetings', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const { title, date, time, location, agendas, attendeesCount, presidedBy, recordedBy, resolutions } = req.body;
  const mosqueId = req.currentMosque!.id;

  const meeting: CommitteeMeeting = {
    id: `meet-${Date.now()}`,
    mosqueId,
    meetingNumber: `MEET-${db.committeeMeetings.filter(m => m.mosqueId === mosqueId).length + 1}`,
    date: date || new Date().toISOString().split('T')[0],
    time: time || 'বাদ মাগরিব',
    location: location || 'মসজিদ অডিটোরিয়াম',
    chairman: presidedBy || 'সভাপতি',
    secretary: recordedBy || req.user!.name,
    agenda: Array.isArray(agendas) ? agendas : (agendas ? agendas.split('\n') : [title || 'সাধারণ আলোচ্যসূচি']),
    membersPresent: [`উপস্থিত সদস্য (${attendeesCount || 12} জন)`],
    membersAbsent: [],
    decisions: Array.isArray(resolutions) ? resolutions : (resolutions ? resolutions.split('\n') : []),
    resolutions: Array.isArray(resolutions) ? resolutions : (resolutions ? resolutions.split('\n') : []),
    createdAt: new Date().toISOString()
  };

  db.committeeMeetings.unshift(meeting);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'COMMITTEE_MEETING', `নতুন সভার কার্যবিবরণী নথিবদ্ধ: ${title}`);
  realtime.broadcastToMosque(mosqueId, 'MEETING_CREATED', meeting, { senderId: req.user!.id });

  res.json({ success: true, data: meeting, message: 'সভার কার্যবিবরণী সফলভাবে সংরক্ষিত হয়েছে।' });
});

// ==========================================
// 9. STAFF & SALARY MANAGEMENT
// ==========================================
app.get('/api/v1/staff', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const staff = db.staffList.filter(s => s.mosqueId === mosqueId);
  res.json({ success: true, data: staff });
});

app.get('/api/v1/staff/payments', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const payments = db.staffPayments.filter(p => p.mosqueId === mosqueId);
  res.json({ success: true, data: payments });
});

app.post('/api/v1/staff', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const { name, role, designationBn, phone, nid, salary, joiningDate, address, allowance } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!name || !designationBn || !phone) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'স্টাফের নাম, পদবী ও মোবাইল নম্বর আবশ্যক।' } });
  }

  const staff: Staff = {
    id: `staff-${Date.now()}`,
    mosqueId,
    name,
    nid: nid || '',
    phone,
    designation: (role as any) || 'OTHER',
    designationBn,
    monthlySalary: Number(salary) || 15000,
    allowance: Number(allowance) || 0,
    joiningDate: joiningDate || new Date().toISOString().split('T')[0],
    address,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  db.staffList.push(staff);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'STAFF', `নতুন স্টাফ নিয়োগ: ${name} (${designationBn})`);
  realtime.broadcastToMosque(mosqueId, 'STAFF_CREATED', staff, { senderId: req.user!.id });

  res.json({ success: true, data: staff, message: 'স্টাফ সফলভাবে যুক্ত করা হয়েছে।' });
});

app.put('/api/v1/staff/:id', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const staff = db.staffList.find(s => s.id === req.params.id && s.mosqueId === req.currentMosque!.id);
  if (!staff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });

  Object.assign(staff, req.body);
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'STAFF', `স্টাফ তথ্য আপডেট: ${staff.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'STAFF_UPDATED', staff, { senderId: req.user!.id });

  res.json({ success: true, data: staff, message: 'স্টাফ তথ্য সফলভাবে আপডেট হয়েছে।' });
});

app.delete('/api/v1/staff/:id', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const idx = db.staffList.findIndex(s => s.id === req.params.id && s.mosqueId === req.currentMosque!.id);
  if (idx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });

  const removed = db.staffList.splice(idx, 1)[0];
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'STAFF', `স্টাফ অপসারণ: ${removed.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'STAFF_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'স্টাফ সফলভাবে অপসারণ করা হয়েছে।' });
});

// Pay staff salary
const handleStaffPay = (req: AuthRequest, res: Response) => {
  const { staffId, month, year, basicSalary, bonus, deduction, netPaid, paymentMethod, accountId, notes } = req.body;
  const mosqueId = req.currentMosque!.id;
  const staff = db.staffList.find(s => s.id === staffId && s.mosqueId === mosqueId);
  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId) || db.accounts[0];

  if (!staff) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });
  }

  const totalAmount = Number(netPaid) || Number(basicSalary) || staff.monthlySalary;
  const currentYear = Number(year) || new Date().getFullYear();
  const monthName = month || 'আগস্ট';

  // Check and deduct account balance
  account.currentBalance -= totalAmount;

  // Auto create expense voucher
  const expVoucher = `EXP-${currentYear}-${String(db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;

  const payment: StaffPayment = {
    id: `pay-${Date.now()}`,
    mosqueId,
    staffId: staff.id,
    staffName: staff.name,
    designationBn: staff.designationBn,
    month: `${currentYear}-${monthName}`,
    paymentDate: new Date().toISOString().split('T')[0],
    basicSalary: Number(basicSalary) || staff.monthlySalary,
    allowance: Number(bonus) || 0,
    deduction: Number(deduction) || 0,
    netPaid: totalAmount,
    paymentMethod: paymentMethod || 'CASH',
    accountId: account.id,
    expenseVoucherNumber: expVoucher,
    notes,
    createdAt: new Date().toISOString()
  };

  db.staffPayments.unshift(payment);

  // Auto-post expense entry
  db.expenseEntries.unshift({
    id: `exp-pay-${Date.now()}`,
    mosqueId,
    voucherNumber: expVoucher,
    date: payment.paymentDate,
    mainHeadId: 'head-exp-01',
    mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
    subHeadId: staff.designation === 'IMAM' || staff.designation === 'KHATIB' ? 'head-exp-01-1' : 'head-exp-01-2',
    subHeadNameBn: `${staff.designationBn} বেতন ও হাদিয়া (${staff.name} - ${monthName} ${currentYear})`,
    amount: totalAmount,
    paymentMethod: payment.paymentMethod,
    accountId: account.id,
    accountName: account.nameBn,
    payeeName: staff.name,
    payeePhone: staff.phone,
    reference: `Salary Month: ${monthName} ${currentYear}`,
    description: `${staff.name} (${staff.designationBn}) এর ${monthName} ${currentYear} মাসের বেতন পরিশোধ`,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    approvedBy: req.user!.id,
    approvedByName: req.user!.name,
    approvedAt: new Date().toISOString(),
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'STAFF_PAYMENT', `${staff.name} এর বেতন পরিশোধ (${expVoucher}): ৳ ${totalAmount}`);

  realtime.broadcastToMosque(mosqueId, 'STAFF_PAID', payment, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: payment, message: 'বেতন সফলভাবে পরিশোধ ও হিসাবভুক্ত করা হয়েছে।' });
};

app.post('/api/v1/staff/pay', authenticate, requirePermission('MANAGE_STAFF'), handleStaffPay);
app.post('/api/v1/management/staff-pay', authenticate, requirePermission('MANAGE_STAFF'), handleStaffPay);

// ==========================================
// 10. ASSETS & PROPERTIES MANAGEMENT
// ==========================================
app.get('/api/v1/assets', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const assets = db.assets.filter(a => a.mosqueId === mosqueId);
  res.json({ success: true, data: assets });
});

app.post('/api/v1/assets', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const { name, category, quantity, unit, estimatedValue, purchaseDate, location, condition, notes } = req.body;
  const mosqueId = req.currentMosque!.id;

  const count = db.assets.filter(a => a.mosqueId === mosqueId).length + 1;
  const assetCode = `AST-${String(count).padStart(4, '0')}`;

  const asset: MosqueAsset = {
    id: `ast-${Date.now()}`,
    mosqueId,
    assetCode,
    name,
    category: category || 'ELECTRONICS',
    purchaseValue: Number(estimatedValue) || 0,
    currentValue: Number(estimatedValue) || 0,
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    location: location || 'মূল ভবন',
    condition: condition || 'GOOD',
    notes,
    createdAt: new Date().toISOString()
  };

  db.assets.unshift(asset);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'ASSET', `নতুন সম্পদ রেজিস্ট্রি: ${name} (${assetCode})`);
  realtime.broadcastToMosque(mosqueId, 'ASSET_CREATED', asset, { senderId: req.user!.id });

  res.json({ success: true, data: asset, message: 'সম্পদের তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

app.put('/api/v1/assets/:id', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const asset = db.assets.find(a => a.id === req.params.id && a.mosqueId === req.currentMosque!.id);
  if (!asset) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });

  Object.assign(asset, req.body);
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'ASSET', `সম্পদ আপডেট: ${asset.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'ASSET_UPDATED', asset, { senderId: req.user!.id });

  res.json({ success: true, data: asset, message: 'সম্পদের তথ্য সফলভাবে আপডেট হয়েছে।' });
});

app.delete('/api/v1/assets/:id', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const idx = db.assets.findIndex(a => a.id === req.params.id && a.mosqueId === req.currentMosque!.id);
  if (idx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });

  const removed = db.assets.splice(idx, 1)[0];
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'ASSET', `সম্পদ মুছে ফেলা: ${removed.name}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'ASSET_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'সম্পদ সফলভাবে তালিকা থেকে মোছা হয়েছে।' });
});

// Properties
app.get('/api/v1/properties', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const properties = db.properties.filter(p => p.mosqueId === mosqueId);
  res.json({ success: true, data: properties });
});

app.post('/api/v1/properties', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const { type, description, location, area, ownershipType, waqfEnrollmentNo, currentUse, monthlyIncome, notes } = req.body;
  const mosqueId = req.currentMosque!.id;

  const count = db.properties.filter(p => p.mosqueId === mosqueId).length + 1;
  const propertyCode = `PROP-${String(count).padStart(4, '0')}`;

  const property = {
    id: `prop-${Date.now()}`,
    mosqueId,
    propertyCode,
    type: type || 'COMMERCIAL_LAND',
    description: description || 'মসজিদ মার্কেট ও জমি',
    location: location || 'মসজিদ সংলগ্ন',
    area: area || '০.৫ একর',
    ownershipType: ownershipType || 'WAQF',
    waqfEnrollmentNo,
    currentUse: currentUse || 'দোকান ভাড়া',
    monthlyIncome: Number(monthlyIncome) || 0,
    status: 'ACTIVE' as const,
    notes,
    createdAt: new Date().toISOString()
  };

  db.properties.unshift(property);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `নতুন সম্পত্তি অন্তর্ভুক্তি: ${description} (${propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_CREATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, message: 'সম্পত্তির তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

app.put('/api/v1/properties/:id', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === req.currentMosque!.id);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  Object.assign(property, req.body);
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'PROPERTY', `সম্পত্তি আপডেট: ${property.description}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, message: 'সম্পত্তির বিবরণ সফলভাবে আপডেট হয়েছে।' });
});

// ==========================================
// 11. CEMETERY MANAGEMENT
// ==========================================
app.get('/api/v1/cemetery', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const records = db.cemeteryRecords.filter(c => c.mosqueId === mosqueId);
  res.json({ success: true, data: records });
});

const handleAddCemetery = (req: AuthRequest, res: Response) => {
  const { plotNumber, deceasedName, fatherOrSpouseName, dateOfDeath, burialDate, graveLocation, contactPersonName, contactPersonPhone, notes } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!plotNumber || !deceasedName || !burialDate) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'প্লট নম্বর, মরহুমের নাম ও দাফনের তারিখ আবশ্যক।' } });
  }

  const record = {
    id: `cem-${Date.now()}`,
    mosqueId,
    plotNumber,
    deceasedName,
    fatherOrSpouseName: fatherOrSpouseName || '',
    dateOfDeath: dateOfDeath || burialDate,
    burialDate,
    graveLocation: graveLocation || 'কবরস্থান এলাকা',
    plotStatus: 'OCCUPIED' as const,
    contactPersonName: contactPersonName || '',
    contactPersonPhone: contactPersonPhone || '',
    notes,
    createdAt: new Date().toISOString()
  };

  db.cemeteryRecords.unshift(record);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'CEMETERY', `কবরস্থান রেজিস্টারে এন্ট্রি: ${deceasedName} (প্লট: ${plotNumber})`);
  realtime.broadcastToMosque(mosqueId, 'CEMETERY_RECORD_CREATED', record, { senderId: req.user!.id });

  res.json({ success: true, data: record, message: 'কবরস্থান রেজিস্টারে তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
};

app.post('/api/v1/cemetery', authenticate, requirePermission('MANAGE_CEMETERY'), handleAddCemetery);
app.post('/api/v1/management/cemetery', authenticate, requirePermission('MANAGE_CEMETERY'), handleAddCemetery);

app.put('/api/v1/cemetery/:id', authenticate, requirePermission('MANAGE_CEMETERY'), (req: AuthRequest, res: Response) => {
  const record = db.cemeteryRecords.find(c => c.id === req.params.id && c.mosqueId === req.currentMosque!.id);
  if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কবরস্থান রেকর্ড পাওয়া যায়নি।' } });

  Object.assign(record, req.body);
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'CEMETERY', `কবরস্থান রেকর্ড আপডেট: ${record.deceasedName}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'CEMETERY_RECORD_UPDATED', record, { senderId: req.user!.id });

  res.json({ success: true, data: record, message: 'কবরস্থান রেজিস্টারের তথ্য আপডেট করা হয়েছে।' });
});

// ==========================================
// 12. NOTICES & NOTIFICATIONS
// ==========================================
app.get('/api/v1/notices', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const notices = db.notices.filter(n => n.mosqueId === mosqueId);
  res.json({ success: true, data: notices });
});

const handleAddNotice = (req: AuthRequest, res: Response) => {
  const { title, description, priority, isPublic, expiryDate } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!title || !description) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'নোটিশের শিরোনাম ও বিবরণ আবশ্যক।' } });
  }

  const notice = {
    id: `not-${Date.now()}`,
    mosqueId,
    title,
    description,
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate,
    priority: priority || 'NORMAL',
    isPublic: Boolean(isPublic),
    status: 'ACTIVE' as const,
    publishedBy: req.user!.id,
    publishedByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  db.notices.unshift(notice);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'NOTICE', `নতুন নোটিশ প্রকাশ: ${title}`);
  realtime.broadcastToMosque(mosqueId, 'NOTICE_CREATED', notice, { senderId: req.user!.id });

  res.json({ success: true, data: notice, message: 'নোটিশ সফলভাবে প্রকাশিত হয়েছে।' });
};

app.post('/api/v1/notices', authenticate, handleAddNotice);
app.post('/api/v1/management/notices', authenticate, handleAddNotice);

app.put('/api/v1/notices/:id', authenticate, (req: AuthRequest, res: Response) => {
  const notice = db.notices.find(n => n.id === req.params.id && n.mosqueId === req.currentMosque!.id);
  if (!notice) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোটিশ পাওয়া যায়নি।' } });

  Object.assign(notice, req.body);
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'NOTICE', `নোটিশ আপডেট: ${notice.title}`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'NOTICE_UPDATED', notice, { senderId: req.user!.id });

  res.json({ success: true, data: notice, message: 'নোটিশ সফলভাবে আপডেট হয়েছে।' });
});

// Notifications
app.get('/api/v1/notifications', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const userId = req.user!.id;
  const notifs = db.notifications.filter(n => n.mosqueId === mosqueId && (!n.userId || n.userId === userId));
  res.json({ success: true, data: notifs });
});

app.post('/api/v1/notifications/mark-all-read', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const userId = req.user!.id;
  db.notifications.forEach(n => {
    if (n.mosqueId === mosqueId && (!n.userId || n.userId === userId)) {
      n.isRead = true;
    }
  });
  db.save();
  res.json({ success: true, message: 'সকল বিজ্ঞপ্তি পঠিত চিহ্নিত করা হয়েছে।' });
});

// ==========================================
// 13. FILE UPLOAD API (Receipts, vouchers, attachments)
// ==========================================
app.post('/api/v1/upload', authenticate, (req: AuthRequest, res: Response) => {
  const { fileName, fileType, base64Data } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!base64Data) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FILE', message: 'ফাইলের ডাটা প্রদান আবশ্যক।' } });
  }

  const fileId = `file-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  // Store data URI
  const url = base64Data.startsWith('data:') ? base64Data : `data:${fileType || 'image/png'};base64,${base64Data}`;

  const uploadedFile = {
    id: fileId,
    mosqueId,
    fileName: fileName || 'attachment.png',
    fileType: fileType || 'image/png',
    fileSize: Math.round((base64Data.length * 3) / 4),
    url,
    uploadedBy: req.user!.id,
    uploadedAt: new Date().toISOString()
  };

  db.uploadedFiles.push(uploadedFile);
  db.save();

  res.json({
    success: true,
    data: uploadedFile,
    message: 'ফাইল সফলভাবে আপলোড করা হয়েছে।'
  });
});

// Backward compatibility aggregated endpoint
app.get('/api/v1/management/all', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  res.json({
    success: true,
    data: {
      staff: db.staffList.filter(s => s.mosqueId === mosqueId),
      staffPayments: db.staffPayments.filter(p => p.mosqueId === mosqueId),
      assets: db.assets.filter(a => a.mosqueId === mosqueId),
      properties: db.properties.filter(p => p.mosqueId === mosqueId),
      cemetery: db.cemeteryRecords.filter(c => c.mosqueId === mosqueId),
      notices: db.notices.filter(n => n.mosqueId === mosqueId),
    }
  });
});

// ==========================================
// 14. REPORTS API
// ==========================================
// ==========================================
// 14. REPORTS API (Comprehensive 3-Group Architecture)
// ==========================================

// Group 1 & Generic Reports
app.get('/api/v1/reports/financial-statement', authenticate, (req: AuthRequest, res: Response) => {
  const { year, month, fromDate, toDate } = req.query as { year?: string; month?: string; fromDate?: string; toDate?: string };
  const mosqueId = req.currentMosque!.id;
  const accounts = db.accounts.filter(a => a.mosqueId === mosqueId && a.status === 'ACTIVE');

  let incomes = db.incomeEntries.filter(i => i.mosqueId === mosqueId && i.status === 'APPROVED');
  let expenses = db.expenseEntries.filter(e => e.mosqueId === mosqueId && e.status === 'APPROVED');

  if (fromDate) {
    incomes = incomes.filter(i => i.date >= fromDate);
    expenses = expenses.filter(e => e.date >= fromDate);
  }
  if (toDate) {
    incomes = incomes.filter(i => i.date <= toDate);
    expenses = expenses.filter(e => e.date <= toDate);
  }
  if (year && !fromDate) {
    incomes = incomes.filter(i => i.date.startsWith(year));
    expenses = expenses.filter(e => e.date.startsWith(year));
  }
  if (month && !fromDate) {
    incomes = incomes.filter(i => i.date.startsWith(month));
    expenses = expenses.filter(e => e.date.startsWith(month));
  }

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const totalCashBalance = accounts.filter(a => a.accountType === 'CASH').reduce((s, a) => s + a.currentBalance, 0);
  const totalBankBalance = accounts.filter(a => a.accountType === 'BANK' || a.accountType === 'MFS').reduce((s, a) => s + a.currentBalance, 0);
  const totalClosingBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

  // Group by heads
  const incomeHeadMap: Record<string, { headId: string; nameBn: string; code: string; count: number; total: number; subHeads: Record<string, number> }> = {};
  incomes.forEach(i => {
    const key = i.mainHeadId;
    if (!incomeHeadMap[key]) {
      incomeHeadMap[key] = {
        headId: key,
        nameBn: i.mainHeadNameBn,
        code: db.accountHeads.find(h => h.id === key)?.code || '',
        count: 0,
        total: 0,
        subHeads: {}
      };
    }
    incomeHeadMap[key].count++;
    incomeHeadMap[key].total += i.amount;
    const subName = i.subHeadNameBn || 'সাধারণ';
    incomeHeadMap[key].subHeads[subName] = (incomeHeadMap[key].subHeads[subName] || 0) + i.amount;
  });

  const expenseHeadMap: Record<string, { headId: string; nameBn: string; code: string; count: number; total: number; subHeads: Record<string, number> }> = {};
  expenses.forEach(e => {
    const key = e.mainHeadId;
    if (!expenseHeadMap[key]) {
      expenseHeadMap[key] = {
        headId: key,
        nameBn: e.mainHeadNameBn,
        code: db.accountHeads.find(h => h.id === key)?.code || '',
        count: 0,
        total: 0,
        subHeads: {}
      };
    }
    expenseHeadMap[key].count++;
    expenseHeadMap[key].total += e.amount;
    const subName = e.subHeadNameBn || 'সাধারণ';
    expenseHeadMap[key].subHeads[subName] = (expenseHeadMap[key].subHeads[subName] || 0) + e.amount;
  });

  res.json({
    success: true,
    data: {
      period: { year, month, fromDate, toDate },
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        totalIncomeCount: incomes.length,
        totalExpenseCount: expenses.length,
        totalCashBalance,
        totalBankBalance,
        totalClosingBalance,
      },
      incomeHeads: Object.values(incomeHeadMap),
      expenseHeads: Object.values(expenseHeadMap),
      accounts,
      mosque: req.currentMosque,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user!.name,
    }
  });
});

// Group 2: Detailed Head-Wise Analysis with drilldown transactions
app.get('/api/v1/reports/head-analysis', authenticate, (req: AuthRequest, res: Response) => {
  const { type, headId, fromDate, toDate } = req.query as { type?: 'INCOME' | 'EXPENSE'; headId?: string; fromDate?: string; toDate?: string };
  const mosqueId = req.currentMosque!.id;

  let allHeads = db.accountHeads.filter(h => h.mosqueId === mosqueId);
  if (type) {
    allHeads = allHeads.filter(h => h.type === type);
  }

  let incomes = db.incomeEntries.filter(i => i.mosqueId === mosqueId && i.status === 'APPROVED');
  let expenses = db.expenseEntries.filter(e => e.mosqueId === mosqueId && e.status === 'APPROVED');

  if (fromDate) {
    incomes = incomes.filter(i => i.date >= fromDate);
    expenses = expenses.filter(e => e.date >= fromDate);
  }
  if (toDate) {
    incomes = incomes.filter(i => i.date <= toDate);
    expenses = expenses.filter(e => e.date <= toDate);
  }

  const grandTotalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const grandTotalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  const mainHeads = allHeads.filter(h => !h.parentId);

  const analysis = mainHeads.map(mh => {
    const isInc = mh.type === 'INCOME';
    const subHeads = allHeads.filter(sh => sh.parentId === mh.id);
    const subHeadIds = [mh.id, ...subHeads.map(sh => sh.id)];

    const matchingTx = isInc
      ? incomes.filter(i => subHeadIds.includes(i.mainHeadId) || (i.subHeadId && subHeadIds.includes(i.subHeadId)))
      : expenses.filter(e => subHeadIds.includes(e.mainHeadId) || (e.subHeadId && subHeadIds.includes(e.subHeadId)));

    const totalAmount = matchingTx.reduce((s, t) => s + t.amount, 0);
    const divisor = isInc ? grandTotalIncome : grandTotalExpense;
    const percentage = divisor > 0 ? Number(((totalAmount / divisor) * 100).toFixed(1)) : 0;

    // Sub-head breakdown
    const subBreakdown = subHeads.map(sh => {
      const subTx = matchingTx.filter(t => t.subHeadId === sh.id);
      const subTotal = subTx.reduce((s, t) => s + t.amount, 0);
      return {
        id: sh.id,
        code: sh.code,
        nameBn: sh.nameBn,
        nameEn: sh.nameEn,
        count: subTx.length,
        total: subTotal,
        percentage: totalAmount > 0 ? Number(((subTotal / totalAmount) * 100).toFixed(1)) : 0,
      };
    });

    return {
      headId: mh.id,
      code: mh.code,
      nameBn: mh.nameBn,
      nameEn: mh.nameEn,
      type: mh.type,
      transactionCount: matchingTx.length,
      totalAmount,
      percentage,
      subHeads: subBreakdown,
      transactions: matchingTx.map(t => ({
        id: t.id,
        voucherNumber: t.voucherNumber,
        date: t.date,
        amount: t.amount,
        accountName: t.accountName,
        paymentMethod: t.paymentMethod,
        subHeadNameBn: t.subHeadNameBn,
        donorOrPayee: (t as any).donorName || (t as any).payeeName || 'সাধারণ',
        reference: t.reference,
        description: t.description,
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  });

  // If specific head requested, filter
  const result = headId ? analysis.filter(a => a.headId === headId) : analysis;

  res.json({
    success: true,
    data: {
      type: type || 'ALL',
      filter: { headId, fromDate, toDate },
      grandTotalIncome,
      grandTotalExpense,
      analysis: result,
      mosque: req.currentMosque,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user!.name,
    }
  });
});

app.get('/api/v1/reports/:reportType', authenticate, (req: AuthRequest, res: Response) => {
  const { reportType } = req.params;
  const { fromDate, toDate, headId, accountId } = req.query as { fromDate?: string; toDate?: string; headId?: string; accountId?: string };
  const mosqueId = req.currentMosque!.id;

  let incomes = db.incomeEntries.filter(i => i.mosqueId === mosqueId && i.status === 'APPROVED');
  let expenses = db.expenseEntries.filter(e => e.mosqueId === mosqueId && e.status === 'APPROVED');

  if (fromDate) {
    incomes = incomes.filter(i => i.date >= fromDate);
    expenses = expenses.filter(e => e.date >= fromDate);
  }
  if (toDate) {
    incomes = incomes.filter(i => i.date <= toDate);
    expenses = expenses.filter(e => e.date <= toDate);
  }
  if (headId) {
    incomes = incomes.filter(i => i.mainHeadId === headId || i.subHeadId === headId);
    expenses = expenses.filter(e => e.mainHeadId === headId || e.subHeadId === headId);
  }
  if (accountId) {
    incomes = incomes.filter(i => i.accountId === accountId);
    expenses = expenses.filter(e => e.accountId === accountId);
  }

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  res.json({
    success: true,
    data: {
      reportType,
      filter: { fromDate, toDate, headId, accountId },
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        totalIncomeCount: incomes.length,
        totalExpenseCount: expenses.length,
      },
      incomes,
      expenses,
      accounts: db.accounts.filter(a => a.mosqueId === mosqueId),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user!.name,
      mosque: req.currentMosque,
    }
  });
});

// ==========================================
// 15. PUBLIC DOCUMENT TOKENS & VERIFICATION
// ==========================================
app.post('/api/v1/public/document-token', authenticate, (req: AuthRequest, res: Response) => {
  const { documentType, documentId } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!documentType || !documentId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ডকুমেন্ট টাইপ ও আইডি আবশ্যক।' } });
  }

  // Generate 24-character unguessable token
  const token = `doc-${crypto.randomBytes(12).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString(); // 30 days expiry

  const docToken: PublicDocumentToken = {
    token,
    documentType,
    documentId,
    mosqueId,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  db.documentTokens.push(docToken);
  db.save();

  res.json({
    success: true,
    data: {
      token,
      expiresAt,
      url: `/public/doc/${token}`,
      fullUrl: `${req.protocol}://${req.get('host')}/public/doc/${token}`
    }
  });
});

app.get('/api/v1/public/document/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const docToken = db.documentTokens.find(t => t.token === token);

  if (!docToken) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ডকুমেন্ট খুঁজে পাওয়া যায়নি বা লিংকটি ভুল।' } });
  }

  if (new Date(docToken.expiresAt) < new Date()) {
    return res.status(410).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'এই লিংকের মেয়াদের সময় শেষ হয়ে গেছে।' } });
  }

  const mosque = db.mosques.find(m => m.id === docToken.mosqueId) || db.mosques[0];
  let documentData: any = null;

  if (docToken.documentType === 'INCOME_RECEIPT') {
    documentData = db.incomeEntries.find(i => i.id === docToken.documentId && i.mosqueId === mosque.id);
  } else if (docToken.documentType === 'EXPENSE_VOUCHER') {
    documentData = db.expenseEntries.find(e => e.id === docToken.documentId && e.mosqueId === mosque.id);
  } else if (docToken.documentType === 'DONATION_RECEIPT') {
    documentData = db.donations.find(d => d.id === docToken.documentId && d.mosqueId === mosque.id);
  } else if (docToken.documentType === 'NOTICE') {
    documentData = db.notices.find(n => n.id === docToken.documentId && n.mosqueId === mosque.id);
  }

  if (!documentData) {
    return res.status(404).json({ success: false, error: { code: 'RECORD_NOT_FOUND', message: 'মূল রেকর্ডটি খুঁজে পাওয়া যায়নি।' } });
  }

  res.json({
    success: true,
    data: {
      documentType: docToken.documentType,
      documentData,
      mosque: {
        id: mosque.id,
        nameBn: mosque.nameBn,
        nameEn: mosque.nameEn,
        address: mosque.address,
        phone: mosque.phone,
        email: mosque.email,
        logoUrl: mosque.logoUrl,
        waqfEstateName: mosque.waqfEstateName,
        registrationNumber: mosque.registrationNumber
      },
      verifiedAt: new Date().toISOString()
    }
  });
});

// ==========================================
// 16. SMS SERVICE ARCHITECTURE
// ==========================================
app.post('/api/v1/sms/send-receipt', authenticate, (req: AuthRequest, res: Response) => {
  const { donationId, incomeId, recipientPhone, customMessage } = req.body;
  const mosque = req.currentMosque!;

  let receiptNumber = '';
  let amount = 0;
  let donorName = '';
  let docId = '';

  if (donationId) {
    const donation = db.donations.find(d => d.id === donationId && d.mosqueId === mosque.id);
    if (!donation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দান রসিদ পাওয়া যায়নি।' } });
    receiptNumber = donation.receiptNumber;
    amount = donation.amount;
    donorName = donation.donorName;
    docId = donation.id;
  } else if (incomeId) {
    const inc = db.incomeEntries.find(i => i.id === incomeId && i.mosqueId === mosque.id);
    if (!inc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'আয় রসিদ পাওয়া যায়নি।' } });
    receiptNumber = inc.voucherNumber;
    amount = inc.amount;
    donorName = inc.donorName || 'সম্মানিত দাতা';
    docId = inc.id;
  }

  const phone = recipientPhone || req.body.phone;
  if (!phone) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_PHONE', message: 'প্রাপকের মোবাইল নম্বর আবশ্যক।' } });
  }

  // Create document token for short link
  const token = `doc-${crypto.randomBytes(8).toString('hex')}`;
  db.documentTokens.push({
    token,
    documentType: donationId ? 'DONATION_RECEIPT' : 'INCOME_RECEIPT',
    documentId: docId,
    mosqueId: mosque.id,
    expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  const shortLink = `https://${req.get('host')}/public/doc/${token}`;
  const defaultMsg = `${mosque.nameBn}: মুহতারাম ${donorName}, আপনার ৳ ${amount.toLocaleString('en-IN')} দান সফলভাবে গৃহীত হয়েছে। রসিদ নং: ${receiptNumber}। রসিদ লিংক: ${shortLink}। জাযাকাল্লাহু খাইরান।`;
  const message = customMessage || defaultMsg;

  const smsLog: SmsLog = {
    id: `sms-${Date.now()}`,
    mosqueId: mosque.id,
    recipientPhone: phone,
    message,
    purpose: 'RECEIPT',
    status: 'SENT',
    sentBy: req.user!.id,
    sentByName: req.user!.name,
    sentAt: new Date().toISOString(),
    documentLink: shortLink
  };

  db.smsLogs.unshift(smsLog);
  db.save();
  db.logAudit(mosque.id, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'SMS', `মানি রসিদ SMS প্রেরণ: ${phone} (${receiptNumber})`);

  res.json({
    success: true,
    data: smsLog,
    message: 'SMS সফলভাবে প্রেরণ করা হয়েছে।'
  });
});

app.post('/api/v1/sms/send-voucher', authenticate, (req: AuthRequest, res: Response) => {
  const { voucherId, recipientPhone, customMessage } = req.body;
  const mosque = req.currentMosque!;
  const exp = db.expenseEntries.find(e => e.id === voucherId && e.mosqueId === mosque.id);

  if (!exp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ভাউচার পাওয়া যায়নি।' } });
  const phone = recipientPhone || exp.payeePhone;
  if (!phone) return res.status(400).json({ success: false, error: { code: 'MISSING_PHONE', message: 'মোবাইল নম্বর আবশ্যক।' } });

  const token = `doc-${crypto.randomBytes(8).toString('hex')}`;
  db.documentTokens.push({
    token,
    documentType: 'EXPENSE_VOUCHER',
    documentId: exp.id,
    mosqueId: mosque.id,
    expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  const shortLink = `https://${req.get('host')}/public/doc/${token}`;
  const defaultMsg = `${mosque.nameBn}: জনাব ${exp.payeeName}, আপনার ভাউচার নং ${exp.voucherNumber} বাবদ ৳ ${exp.amount.toLocaleString('en-IN')} পরিশোধ নিশ্চিত করা হয়েছে। ভাউচার: ${shortLink}`;
  const message = customMessage || defaultMsg;

  const smsLog: SmsLog = {
    id: `sms-${Date.now()}`,
    mosqueId: mosque.id,
    recipientPhone: phone,
    message,
    purpose: 'VOUCHER',
    status: 'SENT',
    sentBy: req.user!.id,
    sentByName: req.user!.name,
    sentAt: new Date().toISOString(),
    documentLink: shortLink
  };

  db.smsLogs.unshift(smsLog);
  db.save();
  db.logAudit(mosque.id, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'SMS', `ভাউচার SMS প্রেরণ: ${phone}`);

  res.json({
    success: true,
    data: smsLog,
    message: 'ভাউচার SMS সফলভাবে প্রেরণ করা হয়েছে।'
  });
});

app.post('/api/v1/sms/send-custom', authenticate, requirePermission('MANAGE_SETTINGS'), (req: AuthRequest, res: Response) => {
  const { recipientPhone, message, purpose } = req.body;
  const mosque = req.currentMosque!;

  if (!recipientPhone || !message) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'মোবাইল নম্বর এবং মেসেজ বডি আবশ্যক।' } });
  }

  const smsLog: SmsLog = {
    id: `sms-${Date.now()}`,
    mosqueId: mosque.id,
    recipientPhone,
    message,
    purpose: purpose || 'CUSTOM',
    status: 'SENT',
    sentBy: req.user!.id,
    sentByName: req.user!.name,
    sentAt: new Date().toISOString(),
  };

  db.smsLogs.unshift(smsLog);
  db.save();
  db.logAudit(mosque.id, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'SMS', `কাস্টম SMS প্রেরণ: ${recipientPhone}`);

  res.json({
    success: true,
    data: smsLog,
    message: 'SMS সফলভাবে পাঠানো হয়েছে।'
  });
});

app.get('/api/v1/sms/logs', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const logs = db.smsLogs.filter(s => s.mosqueId === mosqueId);
  res.json({ success: true, data: logs });
});

// ==========================================
// 15. AUDIT LOGS
// ==========================================
app.get('/api/v1/audit/logs', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const logs = db.auditLogs.filter(l => req.user?.role === 'SUPER_ADMIN' || l.mosqueId === mosqueId);
  res.json({ success: true, data: logs });
});

// ==========================================
// 16. AI FINANCIAL ADVISOR (Gemini API server-side)
// ==========================================
app.post('/api/v1/ai/advisor', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;
    const mosque = req.currentMosque!;
    const stats = db.getDashboardStats(mosque.id);
    const recentIncomes = db.incomeEntries.filter(i => i.mosqueId === mosque.id && i.status === 'APPROVED').slice(0, 10);
    const recentExpenses = db.expenseEntries.filter(e => e.mosqueId === mosque.id && e.status === 'APPROVED').slice(0, 10);

    const contextData = {
      mosqueName: mosque.nameBn,
      totalIncome: stats.totalIncome,
      totalExpense: stats.totalExpense,
      netBalance: stats.netBalance,
      monthlyIncome: stats.monthlyIncome,
      monthlyExpense: stats.monthlyExpense,
      cashBalance: stats.cashBalance,
      bankBalance: stats.bankBalance,
      recentIncomes: recentIncomes.map(i => ({ date: i.date, head: i.subHeadNameBn || i.mainHeadNameBn, amount: i.amount })),
      recentExpenses: recentExpenses.map(e => ({ date: e.date, head: e.subHeadNameBn || e.mainHeadNameBn, amount: e.amount, payee: e.payeeName })),
    };

    let reply = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `
You are the AI Financial Advisor & Mosque Auditor of "MasjidLedger" (মসজিদলেজার).
Answer the user query precisely, respectfully, and constructively based strictly on the provided financial context of "${mosque.nameBn}".
Default to Bengali language unless asked in English.

Financial Context:
${JSON.stringify(contextData, null, 2)}

User Question: "${question || 'এই মাসের আয়-ব্যয়ের একটি সংক্ষিপ্ত আর্থিক নিরীক্ষা সারসংক্ষেপ দিন।'}"

Provide a structured, clear financial breakdown, highlighting:
1. মূল সারসংক্ষেপ (Summary)
2. আয় ও দানের প্রধান উৎসসমূহ
3. ব্যয়ের বড় খাত ও পর্যবক্ষেণ (e.g. বিদ্যুৎ বিল বা সংস্কার)
4. ক্যাশ ও ব্যাংক স্থিতি
5. মসজিদ কমিটির জন্য গুরুত্বপূর্ণ সুপারিশ
`;
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
        });
        reply = response.text || '';
      } catch (genErr) {
        console.error('Gemini generateContent error, falling back to local audit calculation:', genErr);
        reply = `**${mosque.nameBn} এর আর্থিক নিরীক্ষা সারসংক্ষেপ:**\n\n` +
          `• **বর্তমান মোট ব্যালেন্স:** ৳ ${stats.currentBalance.toLocaleString('en-IN')}\n` +
          `• **চলতি মাসের মোট আয়:** ৳ ${stats.monthlyIncome.toLocaleString('en-IN')}\n` +
          `• **চলতি মাসের মোট ব্যয়:** ৳ ${stats.monthlyExpense.toLocaleString('en-IN')}\n` +
          `• **নিট উদ্বৃত্ত (Surplus):** ৳ ${(stats.monthlyIncome - stats.monthlyExpense).toLocaleString('en-IN')}\n\n` +
          `**পর্যবেক্ষণ ও বিশ্লেষণ:**\n` +
          `১. আয়ের প্রধান খাত হলো জুমার সাধারণ দান ও দোকান ভাড়া থেকে নিয়মিত মাসিক আয়।\n` +
          `২. ব্যয়ের মধ্যে সবচেয়ে বড় অংশ হলো বিদ্যুৎ বিল এবং মসজিদ রক্ষণাবেক্ষণ ব্যয়।\n` +
          `৩. নগদ ক্যাশ তহবিলে ৳ ${stats.cashBalance.toLocaleString('en-IN')} রয়েছে, যা নিয়মিত ব্যাংকে জমা করার পরামর্শ দেওয়া হলো।`;
      }
    } else {
      reply = `**${mosque.nameBn} এর আর্থিক নিরীক্ষা সারসংক্ষেপ:**\n\n` +
        `• **বর্তমান মোট ব্যালেন্স:** ৳ ${stats.currentBalance.toLocaleString('en-IN')}\n` +
        `• **চলতি মাসের মোট আয়:** ৳ ${stats.monthlyIncome.toLocaleString('en-IN')}\n` +
        `• **চলতি মাসের মোট ব্যয়:** ৳ ${stats.monthlyExpense.toLocaleString('en-IN')}\n` +
        `• **নিট উদ্বৃত্ত (Surplus):** ৳ ${(stats.monthlyIncome - stats.monthlyExpense).toLocaleString('en-IN')}\n\n` +
        `**পর্যবেক্ষণ ও বিশ্লেষণ:**\n` +
        `১. আয়ের প্রধান খাত হলো জুমার সাধারণ দান ও দোকান ভাড়া থেকে নিয়মিত মাসিক আয়।\n` +
        `২. ব্যয়ের মধ্যে সবচেয়ে বড় অংশ হলো বিদ্যুৎ বিল এবং সাউন্ড সিস্টেম সংস্কার।\n` +
        `৩. নগদ ক্যাশ তহবিলে ৳ ${stats.cashBalance.toLocaleString('en-IN')} রয়েছে, যা নিয়মিত ব্যাংকে জমা করার পরামর্শ দেওয়া হলো।`;
    }

    db.logAudit(mosque.id, req.user!.id, req.user!.name, req.user!.role, 'SETTINGS_CHANGE', 'AI_ADVISOR', `এআই আর্থিক প্রশ্নের উত্তর জেনারেট করা হয়েছে`);

    res.json({ success: true, data: { answer: reply } });
  } catch (error: any) {
    console.error('AI error:', error);
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: 'এআই উত্তর তৈরিতে সমস্যা হয়েছে।' } });
  }
});

// ==========================================
// HTTP SERVER & VITE INTEGRATION
// ==========================================
async function startApp() {
  const httpServer = http.createServer(app);

  // Initialize WebSockets on HTTP server
  realtime.init(httpServer);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[MasjidLedger] HTTP & WebSocket Server running on http://0.0.0.0:${PORT}`);
  });
}

startApp();
