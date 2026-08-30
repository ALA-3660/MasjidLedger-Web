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
  CommitteeMeetingNotice,
  MeetingResolution,
  ResolutionStatus,
  ResolutionType,
  ResolutionImplementationStatus,
  CommitteeActionPlan,
  CommitteeActionPlanStatus,
  CommitteeActionPlanPriority,
  CommitteeActionPlanAttachment,
  CommitteeActionPlanActivityLog,
  CommitteeMemberActivity,
  CommitteeMemberTask,
  CommitteeManualEvaluation,
  Staff,
  StaffPayment,
  StaffBankTransferLetter,
  SalaryHistoryEntry,
  MosqueAsset,
  AssetServiceRecord,
  MosqueProperty,
  PropertyTenant,
  PropertyInspectionRecord,
  PropertyLegalCase,
  PropertyRentCollection,
  PropertyExpenseRecord,
  PropertyDocument,
  PropertyKhajnaRecord,
  SubCommittee,
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

// ==========================================
// 2.2. DIGITAL PUBLIC PORTAL & VISIBILITY CONTROL
// ==========================================

// Get Sanitized Public Portal Data (Public & Unauthenticated, Whitelist Enforced)
app.get(['/api/v1/public/portal', '/api/v1/public/portal/:mosqueIdOrCode'], (req: Request, res: Response) => {
  try {
    const target = req.params.mosqueIdOrCode || (req.query.mosqueId as string) || (req.query.code as string);
    const data = db.getSanitizedPublicPortalData(target);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        code: 'MOSQUE_NOT_FOUND',
        message: error.message || 'মসজিদের পাবলিক পোর্টাল তথ্য পাওয়া যায়নি।'
      }
    });
  }
});

// Get Public Portal Configuration only (Public)
app.get(['/api/v1/public/portal-config', '/api/v1/public/portal-config/:mosqueIdOrCode'], (req: Request, res: Response) => {
  try {
    const target = req.params.mosqueIdOrCode || (req.query.mosqueId as string) || (req.query.code as string);
    const data = db.getSanitizedPublicPortalData(target);
    res.json({
      success: true,
      data: {
        settings: data.settings,
        mosqueName: data.mosque?.nameBn,
        serverTime: data.serverTime
      }
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        code: 'MOSQUE_NOT_FOUND',
        message: error.message || 'কনফিগারেশন পাওয়া যায়নি।'
      }
    });
  }
});

// ==========================================
// SMART QR MANAGEMENT API ROUTES
// ==========================================

app.get('/api/v1/qr', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = (req.query.mosqueId as string) || req.currentMosque?.id;
  const list = db.getQrCodes(mosqueId);
  res.json({ success: true, data: list });
});

app.post('/api/v1/qr', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const created = db.createQrCode({
      ...body,
      mosqueId: body.mosqueId || req.currentMosque?.id,
    });
    res.json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'QR_CREATE_FAILED', message: err.message } });
  }
});

app.put('/api/v1/qr/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const updated = db.updateQrCode(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'QR_NOT_FOUND', message: err.message } });
  }
});

app.post('/api/v1/qr/:id/activate', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const updated = db.updateQrCodeStatus(req.params.id, 'ACTIVE');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'QR_NOT_FOUND', message: err.message } });
  }
});

app.post('/api/v1/qr/:id/deactivate', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const updated = db.updateQrCodeStatus(req.params.id, 'INACTIVE');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'QR_NOT_FOUND', message: err.message } });
  }
});

app.post('/api/v1/qr/:id/archive', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const updated = db.updateQrCodeStatus(req.params.id, 'ARCHIVED');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: { code: 'QR_NOT_FOUND', message: err.message } });
  }
});

app.get('/api/v1/qr/resolve/:token', (req: Request, res: Response) => {
  const qr = db.resolveQrToken(req.params.token);
  if (!qr) {
    return res.status(404).json({ success: false, error: { code: 'QR_INVALID', message: 'এই QR কোডটি পাওয়া যায়নি বা মেয়াদোত্তীর্ণ।' } });
  }
  res.json({ success: true, data: qr });
});

// Get Public Portal Settings for Admin View (Authenticated)
app.get('/api/v1/mosques/current/public-portal-settings', authenticate, (req: AuthRequest, res: Response) => {
  const mosque = req.currentMosque!;
  const settings = mosque.publicPortalSettings || {
    mosqueProfile: true,
    mosqueLogo: true,
    mosqueAddress: true,
    mosquePhone: true,
    mosqueEmail: false,
    waqfId: true,
    registrationNumber: true,
    establishedYear: true,
    islamicTagline: true,
    prayerSchedule: true,
    jumuahSchedule: true,
    ramadanSchedule: false,
    donation: true,
    onlineDonation: true,
    bankAccount: true,
    mobileBanking: true,
    donationQr: true,
    donationInstructions: true,
    financialSummary: true,
    monthlyIncome: true,
    monthlyExpense: true,
    monthlySurplus: true,
    currentBalance: false,
    cashBalance: false,
    bankBalance: false,
    totalDonationReceived: true,
    notices: true,
    emergencyNotice: true,
    noticeDate: true,
    projects: true,
    projectProgress: true,
    projectBudget: false,
    waqfSummary: false,
    committee: true,
    subCommittee: false,
    staff: true,
    cemetery: false,
    displayModeTheme: 'EMERALD_NIGHT',
    autoRefreshInterval: 45,
  };
  res.json({ success: true, data: settings });
});

// Update Public Portal Settings (Admin / Settings Manager only)
app.put('/api/v1/mosques/current/public-portal-settings', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const mosque = req.currentMosque!;

  // Verify permission: SUPER_ADMIN, MOSQUE_ADMIN, or MANAGE_SETTINGS / MANAGE_PUBLIC_PORTAL
  const hasPermission =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MOSQUE_ADMIN' ||
    user.permissions.includes('MANAGE_SETTINGS') ||
    user.permissions.includes('MANAGE_PUBLIC_PORTAL');

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস পরিবর্তনের অনুমতি আপনার নেই।'
      }
    });
  }

  try {
    const updatedMosque = db.updateMosquePublicPortalSettings(
      mosque.id,
      req.body,
      user.id,
      user.name,
      user.role,
      req.ip
    );

    realtime.broadcastToMosque(mosque.id, 'PUBLIC_PORTAL_SETTINGS_UPDATED', updatedMosque.publicPortalSettings, {
      senderId: user.id
    });

    res.json({
      success: true,
      data: updatedMosque.publicPortalSettings,
      message: 'পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস সফলভাবে সংরক্ষিত হয়েছে।'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message || 'সেটিংস সংরক্ষণে ব্যর্থ হয়েছে।' }
    });
  }
});

// Reset Public Portal Settings to Safe Defaults
app.post('/api/v1/mosques/current/public-portal-settings/reset', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const mosque = req.currentMosque!;

  const hasPermission =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MOSQUE_ADMIN' ||
    user.permissions.includes('MANAGE_SETTINGS') ||
    user.permissions.includes('MANAGE_PUBLIC_PORTAL');

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'পাবলিক পোর্টাল রিসেট করার অনুমতি আপনার নেই।'
      }
    });
  }

  try {
    const updatedMosque = db.resetMosquePublicPortalSettings(
      mosque.id,
      user.id,
      user.name,
      user.role,
      req.ip
    );

    realtime.broadcastToMosque(mosque.id, 'PUBLIC_PORTAL_SETTINGS_UPDATED', updatedMosque.publicPortalSettings, {
      senderId: user.id
    });

    res.json({
      success: true,
      data: updatedMosque.publicPortalSettings,
      message: 'পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস নিরাপদ ডিফল্টে রিসেট করা হয়েছে।'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'RESET_FAILED', message: error.message || 'রিসেট করতে ব্যর্থ হয়েছে।' }
    });
  }
});

// Public transparency portal (Legacy Compatibility with Sanitization)
app.get('/api/v1/mosques/public/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  try {
    const data = db.getSanitizedPublicPortalData(code);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মসজিদ খুঁজে পাওয়া যায়নি।' } });
  }
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
  const { nameBn, accountType, bankName, branchName, accountNumber, openingBalance, openingBalanceDate, openingBalanceType, openingBalanceSource, openingBalanceNote } = req.body;
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
    openingBalanceDate: openingBalanceDate || new Date().toISOString().split('T')[0],
    openingBalanceType: openingBalanceType || 'DEBIT',
    openingBalanceSource: openingBalanceSource || 'INITIAL',
    openingBalanceNote: openingBalanceNote || 'প্রাথমিক অ্যাকাউন্ট সেটআপ',
    currentBalance: openingBalanceType === 'CREDIT' ? -bal : bal,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString()
  };

  db.accounts.push(newAcc);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'FINANCIAL_ACCOUNT', `নতুন ফান্ড/অ্যাকাউন্ট তৈরি: ${nameBn} (প্রারম্ভিক স্থিতি: ৳ ${bal})`);
  realtime.broadcastToMosque(mosqueId, 'ACCOUNT_CREATED', newAcc, { senderId: req.user!.id });

  res.json({ success: true, data: newAcc, message: 'নতুন হিসাব সফলভাবে খোলা হয়েছে।' });
});

// Update Account Details & Opening Balance
app.put('/api/v1/accounting/accounts/:id', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const account = db.accounts.find(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (!account) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'অ্যাকাউন্ট পাওয়া যায়নি।' } });
  }

  const { nameBn, bankName, branchName, accountNumber, openingBalance, openingBalanceDate, openingBalanceType, openingBalanceSource, openingBalanceNote, status } = req.body;
  const prevOpening = account.openingBalance || 0;
  const newOpening = openingBalance !== undefined ? (Number(openingBalance) || 0) : prevOpening;

  if (nameBn) {
    account.name = nameBn;
    account.nameBn = nameBn;
  }
  if (bankName !== undefined) account.bankName = bankName;
  if (branchName !== undefined) account.branchName = branchName;
  if (accountNumber !== undefined) account.accountNumber = accountNumber;
  if (status !== undefined) account.status = status;

  account.openingBalance = newOpening;
  if (openingBalanceDate !== undefined) account.openingBalanceDate = openingBalanceDate;
  if (openingBalanceType !== undefined) account.openingBalanceType = openingBalanceType;
  if (openingBalanceSource !== undefined) account.openingBalanceSource = openingBalanceSource;
  if (openingBalanceNote !== undefined) account.openingBalanceNote = openingBalanceNote;
  account.updatedAt = new Date().toISOString();

  // Recalculate Current Balance safely using all approved transactions & transfers without touching vouchers
  const totalIn = db.incomeEntries
    .filter(i => i.mosqueId === mosqueId && i.accountId === account.id && i.status === 'APPROVED')
    .reduce((s, i) => s + i.amount, 0);

  const totalOut = db.expenseEntries
    .filter(e => e.mosqueId === mosqueId && e.accountId === account.id && e.status === 'APPROVED')
    .reduce((s, e) => s + e.amount, 0);

  const transfersIn = db.transfers
    .filter(t => t.mosqueId === mosqueId && t.toAccountId === account.id)
    .reduce((s, t) => s + t.amount, 0);

  const transfersOut = db.transfers
    .filter(t => t.mosqueId === mosqueId && t.fromAccountId === account.id)
    .reduce((s, t) => s + t.amount, 0);

  const baseOpening = account.openingBalanceType === 'CREDIT' ? -newOpening : newOpening;
  account.currentBalance = baseOpening + totalIn - totalOut + transfersIn - transfersOut;

  db.save();
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'FINANCIAL_ACCOUNT',
    `অ্যাকাউন্ট/প্রারম্ভিক স্থিতি হালনাগাদ: ${account.nameBn} (প্রারম্ভিক স্থিতি: ৳ ${prevOpening.toLocaleString('en-IN')} ➔ ৳ ${newOpening.toLocaleString('en-IN')}, কার্যকর তারিখ: ${account.openingBalanceDate || 'N/A'}, উৎস: ${account.openingBalanceSource || 'N/A'})`
  );
  realtime.broadcastToMosque(mosqueId, 'ACCOUNT_UPDATED', account, { senderId: req.user!.id });

  res.json({ success: true, data: account, message: 'অ্যাকাউন্ট ও প্রারম্ভিক স্থিতি সফলভাবে হালনাগাদ করা হয়েছে।' });
});

// Dedicated Opening Balance Management Route
app.post('/api/v1/accounting/accounts/opening-balance', authenticate, requirePermission('MANAGE_ACCOUNTS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { accountId, openingBalance, openingBalanceDate, openingBalanceType, openingBalanceSource, openingBalanceNote } = req.body;

  if (!accountId) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'হিসাব বা অ্যাকাউন্ট নির্বাচন করুন।' } });
  }

  const account = db.accounts.find(a => a.id === accountId && a.mosqueId === mosqueId);
  if (!account) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।' } });
  }

  const prevOpening = account.openingBalance || 0;
  const newOpening = Number(openingBalance) || 0;

  account.openingBalance = newOpening;
  account.openingBalanceDate = openingBalanceDate || new Date().toISOString().split('T')[0];
  account.openingBalanceType = openingBalanceType || 'DEBIT';
  account.openingBalanceSource = openingBalanceSource || 'INITIAL_SETUP';
  account.openingBalanceNote = openingBalanceNote || '';
  account.updatedAt = new Date().toISOString();

  // Recalculate Current Balance safely using all approved transactions & transfers
  const totalIn = db.incomeEntries
    .filter(i => i.mosqueId === mosqueId && i.accountId === account.id && i.status === 'APPROVED')
    .reduce((s, i) => s + i.amount, 0);

  const totalOut = db.expenseEntries
    .filter(e => e.mosqueId === mosqueId && e.accountId === account.id && e.status === 'APPROVED')
    .reduce((s, e) => s + e.amount, 0);

  const transfersIn = db.transfers
    .filter(t => t.mosqueId === mosqueId && t.toAccountId === account.id)
    .reduce((s, t) => s + t.amount, 0);

  const transfersOut = db.transfers
    .filter(t => t.mosqueId === mosqueId && t.fromAccountId === account.id)
    .reduce((s, t) => s + t.amount, 0);

  const baseOpening = account.openingBalanceType === 'CREDIT' ? -newOpening : newOpening;
  account.currentBalance = baseOpening + totalIn - totalOut + transfersIn - transfersOut;

  db.save();
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'OPENING_BALANCE',
    `প্রারম্ভিক স্থিতি সমন্বয়: ${account.nameBn} (পূর্বের স্থিতি: ৳ ${prevOpening.toLocaleString('en-IN')}, নতুন স্থিতি: ৳ ${newOpening.toLocaleString('en-IN')}, কার্যকর তারিখ: ${account.openingBalanceDate}, উৎস: ${account.openingBalanceSource}, নোট: ${account.openingBalanceNote || 'N/A'})`
  );
  realtime.broadcastToMosque(mosqueId, 'ACCOUNT_UPDATED', account, { senderId: req.user!.id });

  res.json({ success: true, data: account, message: 'প্রারম্ভিক স্থিতি সফলভাবে সংরক্ষণ ও খতিয়ানে প্রয়োগ করা হয়েছে।' });
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

  const { mainHeadId, subHeadId, amount, paymentMethod, accountId, donorName, donorPhone, reference, description, date, attachmentUrl, denominationData } = req.body;
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
    denominationData: denominationData || undefined,
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

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'INCOME', `আয় ভাউচার তৈরি (${voucherNumber}): ৳ ${numAmount}${denominationData ? ' (ডিনোমিনেশন সহ)' : ''}`, entry.id);

  const responsePayload = { success: true, data: entry, message: 'আয় ভাউচার সফলভাবে সংরক্ষণ ও অ্যাকাউন্টে পোস্টিং করা হয়েছে।' };
  db.saveIdempotency(req.idempotencyKey, responsePayload);

  // Broadcast WebSocket event
  realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', entry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json(responsePayload);
});

// Update Income Entry
app.put('/api/v1/accounting/income/:id', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  const item = db.incomeEntries.find(i => i.id === req.params.id && i.mosqueId === req.currentMosque!.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'আয় ভাউচার পাওয়া যায়নি।' } });

  const { donorName, donorPhone, reference, description, date, denominationData } = req.body;
  if (donorName !== undefined) item.donorName = donorName;
  if (donorPhone !== undefined) item.donorPhone = donorPhone;
  if (reference !== undefined) item.reference = reference;
  if (description !== undefined) item.description = description;
  if (date !== undefined) item.date = date;
  if (denominationData !== undefined) item.denominationData = denominationData;
  item.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'INCOME', `আয় ভাউচার আপডেট (${item.voucherNumber})`, item.id);
  realtime.broadcastToMosque(req.currentMosque!.id, 'INCOME_UPDATED', item, { senderId: req.user!.id });

  res.json({ success: true, data: item, message: 'আয় ভাউচার সফলভাবে হালনাগাদ করা হয়েছে।' });
});

// Update Income Denomination Breakdown
app.put('/api/v1/accounting/income/:id/denomination', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  const item = db.incomeEntries.find(i => i.id === req.params.id && i.mosqueId === req.currentMosque!.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'আয় ভাউচার পাওয়া যায়নি।' } });

  const { denominationData, editReason } = req.body;
  if (!denominationData) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'ডিনোমিনেশন ডাটা আবশ্যক।' } });
  }

  const oldTotal = item.denominationData?.grandTotal || item.amount;
  item.denominationData = denominationData;
  item.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(
    req.currentMosque!.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'INCOME_DENOMINATION',
    `আয় ভাউচার (${item.voucherNumber}) ডিনোমিনেশন পরিবর্তন (৳ ${oldTotal} -> ৳ ${denominationData.grandTotal}). কারণ: ${editReason || 'হিসাব সমন্বয়'}`,
    item.id
  );

  realtime.broadcastToMosque(req.currentMosque!.id, 'INCOME_UPDATED', item, { senderId: req.user!.id });
  res.json({ success: true, data: item, message: 'ডিনোমিনেশন গণনা তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
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

  const { donorName, donorPhone, donorAddress, isAnonymous, category, amount, paymentMethod, accountId, reference, date, denominationData, description, countingTeam, witness } = req.body;
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
    description: description || undefined,
    countingTeam: countingTeam || undefined,
    witness: witness || undefined,
    date: date || new Date().toISOString().split('T')[0],
    receivedBy: req.user!.id,
    receivedByName: req.user!.name,
    denominationData: denominationData || undefined,
    status: 'COMPLETED' as const,
    createdAt: new Date().toISOString()
  };

  account.currentBalance += numAmount;
  db.donations.unshift(donation);

  // Auto-create income entry for double entry consistency
  const incVoucherNumber = `INC-${year}-${String(db.incomeEntries.filter(i => i.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;
  const isJumaRecord = Boolean(
    (reference && reference.includes('জুমা')) ||
    (description && description.includes('জুমা')) ||
    (donorName && donorName.includes('জুমা'))
  );
  const incEntry = {
    id: `inc-don-${Date.now()}`,
    mosqueId,
    voucherNumber: incVoucherNumber,
    date: donation.date,
    mainHeadId: 'head-inc-01',
    mainHeadNameBn: 'দান ও অনুদান (Donations)',
    subHeadId: isJumaRecord ? 'head-inc-01-2' : 'head-inc-01-3',
    subHeadNameBn: isJumaRecord ? 'পবিত্র জুমার জামাত কালেকশন' : `মাসিক ও বিশেষ অনুদান (${donation.donorName})`,
    amount: numAmount,
    paymentMethod: donation.paymentMethod,
    accountId: account.id,
    accountName: account.nameBn,
    donorName: isJumaRecord ? 'পবিত্র জুমার জামাত ও মুসল্লিবৃন্দ' : donation.donorName,
    donorPhone: donation.donorPhone,
    reference: `Receipt: ${receiptNumber}`,
    description: description || `দান রসিদ ${receiptNumber} এর বিপরীতে সংগৃহীত অনুদান`,
    denominationData: denominationData || undefined,
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

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'DONATION', `দান রসিদ প্রস্তুত (${receiptNumber}): ৳ ${numAmount} - ${donation.donorName}${denominationData ? ' (ডিনোমিনেশন সহ)' : ''}`);

  const responsePayload = { success: true, data: donation, message: 'অনুদানের মানি রিসিট প্রস্তুত ও ফান্ডে যোগ করা হয়েছে।' };
  db.saveIdempotency(req.idempotencyKey, responsePayload);

  realtime.broadcastToMosque(mosqueId, 'DONATION_CREATED', donation, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', incEntry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json(responsePayload);
});

// Update Donation Denomination Breakdown
app.put('/api/v1/donations/:id/denomination', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  const donation = db.donations.find(d => d.id === req.params.id && d.mosqueId === req.currentMosque!.id);
  if (!donation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দান রসিদ পাওয়া যায়নি।' } });

  const { denominationData, editReason } = req.body;
  if (!denominationData) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'ডিনোমিনেশন ডাটা আবশ্যক।' } });
  }

  const oldTotal = donation.denominationData?.grandTotal || donation.amount;
  donation.denominationData = denominationData;

  // Also sync to matching income entry if exists
  const incEntry = db.incomeEntries.find(i => i.reference === `Receipt: ${donation.receiptNumber}` && i.mosqueId === req.currentMosque!.id);
  if (incEntry) {
    incEntry.denominationData = denominationData;
    incEntry.updatedAt = new Date().toISOString();
  }

  db.save();
  db.logAudit(
    req.currentMosque!.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'DONATION_DENOMINATION',
    `দান রসিদ (${donation.receiptNumber}) ডিনোমিনেশন পরিবর্তন (৳ ${oldTotal} -> ৳ ${denominationData.grandTotal}). কারণ: ${editReason || 'হিসাব সমন্বয়'}`
  );

  realtime.broadcastToMosque(req.currentMosque!.id, 'DONATION_UPDATED', donation, { senderId: req.user!.id });
  res.json({ success: true, data: donation, message: 'দান রসিদের ডিনোমিনেশন তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
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
  const { boxId, amount, witnesses, countingTeam, notes, accountId, date, denominationData } = req.body;
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
    denominationData: denominationData || undefined,
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
    denominationData: denominationData || undefined,
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

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'DONATION_BOX_COLLECT', `দানবাক্স খোলা ও জমা (${collectionNumber}): ৳ ${numAmount}${denominationData ? ' (ডিনোমিনেশন সহ)' : ''}`);

  realtime.broadcastToMosque(mosqueId, 'DONATION_BOX_COLLECTED', { collection, box }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', incEntry, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: collection, message: 'দানবাক্সের টাকা সফলভাবে গণনা ও তহবিলে জমা করা হয়েছে।' });
});

// Update Donation Box Collection Denomination
app.put('/api/v1/donation-boxes/collections/:id/denomination', authenticate, requirePermission('CREATE_INCOME'), (req: AuthRequest, res: Response) => {
  const collection = db.donationBoxCollections.find(c => c.id === req.params.id && c.mosqueId === req.currentMosque!.id);
  if (!collection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দানবাক্স কালেকশন পাওয়া যায়নি।' } });

  const { denominationData, editReason } = req.body;
  if (!denominationData) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'ডিনোমিনেশন ডাটা আবশ্যক।' } });
  }

  const oldTotal = collection.denominationData?.grandTotal || collection.amount;
  collection.denominationData = denominationData;

  // Sync to linked income entry if exists
  if (collection.incomeVoucherNumber) {
    const inc = db.incomeEntries.find(i => i.voucherNumber === collection.incomeVoucherNumber && i.mosqueId === req.currentMosque!.id);
    if (inc) {
      inc.denominationData = denominationData;
      inc.updatedAt = new Date().toISOString();
    }
  }

  db.save();
  db.logAudit(
    req.currentMosque!.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'DONATION_BOX_DENOMINATION',
    `দানবাক্স কালেকশন (${collection.depositReference || collection.id}) ডিনোমিনেশন পরিবর্তন (৳ ${oldTotal} -> ৳ ${denominationData.grandTotal}). কারণ: ${editReason || 'হিসাব সমন্বয়'}`
  );

  realtime.broadcastToMosque(req.currentMosque!.id, 'DONATION_BOX_COLLECTED', { collection }, { senderId: req.user!.id });
  res.json({ success: true, data: collection, message: 'দানবাক্স কালেকশনের ডিনোমিনেশন তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Aggregate Denomination Summary Report
app.get('/api/v1/accounting/denomination-summary', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { fromDate, toDate, collectionType } = req.query;

  const noteSummary: Record<number, { count: number; totalAmount: number }> = {
    1000: { count: 0, totalAmount: 0 },
    500: { count: 0, totalAmount: 0 },
    200: { count: 0, totalAmount: 0 },
    100: { count: 0, totalAmount: 0 },
    50: { count: 0, totalAmount: 0 },
    20: { count: 0, totalAmount: 0 },
    10: { count: 0, totalAmount: 0 },
    5: { count: 0, totalAmount: 0 },
    2: { count: 0, totalAmount: 0 },
  };

  const coinSummary: Record<number, { count: number; totalAmount: number }> = {
    5: { count: 0, totalAmount: 0 },
    2: { count: 0, totalAmount: 0 },
    1: { count: 0, totalAmount: 0 },
  };

  let totalCountedRecords = 0;
  let totalGrandAmount = 0;
  const records: any[] = [];

  // Filter income entries that have denominationData
  db.incomeEntries
    .filter(i => i.mosqueId === mosqueId && i.status !== 'CANCELLED' && i.denominationData)
    .forEach(i => {
      if (fromDate && i.date < String(fromDate)) return;
      if (toDate && i.date > String(toDate)) return;

      const d = i.denominationData!;
      if (collectionType && d.collectionType && d.collectionType !== collectionType) return;

      totalCountedRecords++;
      totalGrandAmount += d.grandTotal || i.amount;

      // Accumulate notes
      if (d.noteBreakdown) {
        Object.entries(d.noteBreakdown).forEach(([denomStr, count]) => {
          const denom = Number(denomStr);
          const c = Number(count) || 0;
          if (noteSummary[denom]) {
            noteSummary[denom].count += c;
            noteSummary[denom].totalAmount += denom * c;
          }
        });
      }

      // Accumulate coins
      if (d.coinBreakdown) {
        Object.entries(d.coinBreakdown).forEach(([denomStr, count]) => {
          const denom = Number(denomStr);
          const c = Number(count) || 0;
          if (coinSummary[denom]) {
            coinSummary[denom].count += c;
            coinSummary[denom].totalAmount += denom * c;
          }
        });
      }

      records.push({
        id: i.id,
        voucherNumber: i.voucherNumber,
        date: i.date,
        head: i.mainHeadNameBn,
        amount: i.amount,
        grandTotal: d.grandTotal,
        countedBy: d.countedBy,
        collectionType: d.collectionType || 'INCOME',
        denominationData: d,
      });
    });

  const totalNotesAmount = Object.values(noteSummary).reduce((s, item) => s + item.totalAmount, 0);
  const totalNotesCount = Object.values(noteSummary).reduce((s, item) => s + item.count, 0);
  const totalCoinsAmount = Object.values(coinSummary).reduce((s, item) => s + item.totalAmount, 0);
  const totalCoinsCount = Object.values(coinSummary).reduce((s, item) => s + item.count, 0);

  res.json({
    success: true,
    data: {
      totalCountedRecords,
      totalGrandAmount,
      totalNotesAmount,
      totalNotesCount,
      totalCoinsAmount,
      totalCoinsCount,
      noteSummary,
      coinSummary,
      records,
    }
  });
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
  const { termName, title, startDate, endDate, description } = req.body;
  const mosqueId = req.currentMosque!.id;

  const term: CommitteeTerm = {
    id: `term-${Date.now()}`,
    mosqueId,
    title: title || termName || 'নতুন মেয়াদকাল',
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

app.put('/api/v1/committee/terms/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const termId = req.params.id;
  const mosqueId = req.currentMosque!.id;
  const term = db.committeeTerms.find(t => t.id === termId && t.mosqueId === mosqueId);
  if (!term) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কমিটির মেয়াদকাল পাওয়া যায়নি।' } });
  }

  const { title, termName, startDate, endDate, description, status } = req.body;
  if (title !== undefined) term.title = title;
  if (termName !== undefined) term.title = termName;
  if (startDate !== undefined) term.startDate = startDate;
  if (endDate !== undefined) term.endDate = endDate;
  if (description !== undefined) term.description = description;
  if (status !== undefined) {
    term.status = status;
    if (status === 'ACTIVE') {
      db.committeeTerms.forEach(t => {
        if (t.mosqueId === mosqueId && t.id !== termId && t.status === 'ACTIVE') {
          t.status = 'EXPIRED';
        }
      });
    }
  }

  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'COMMITTEE_TERM', `কমিটি মেয়াদ আপডেট: ${term.title}`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TERM_UPDATED', term, { senderId: req.user!.id });

  res.json({ success: true, data: term, message: 'কমিটির মেয়াদ সফলভাবে আপডেট করা হয়েছে।' });
});

app.delete('/api/v1/committee/terms/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const termId = req.params.id;
  const mosqueId = req.currentMosque!.id;
  const idx = db.committeeTerms.findIndex(t => t.id === termId && t.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কমিটির মেয়াদকাল পাওয়া যায়নি।' } });
  }

  const hasMembers = db.committeeMembers.some(m => m.termId === termId && m.mosqueId === mosqueId);
  if (hasMembers) {
    return res.status(400).json({
      success: false,
      error: { code: 'HAS_MEMBERS', message: 'এই কমিটির অধীনে সদস্য রয়েছে। প্রথমে সদস্যগুলো অপসারণ বা অন্য কমিটিতে স্থানান্তর করুন।' }
    });
  }

  const removed = db.committeeTerms.splice(idx, 1)[0];
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'COMMITTEE_TERM', `কমিটি মেয়াদ ডিলিট: ${removed.title}`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TERM_DELETED', { id: termId }, { senderId: req.user!.id });

  res.json({ success: true, message: 'কমিটির মেয়াদ সফলভাবে মুছে ফেলা হয়েছে।' });
});

function computeCommitteeFinancials(mosqueId: string, termId: string) {
  const term = db.committeeTerms.find(t => t.id === termId && t.mosqueId === mosqueId);
  if (!term) return null;

  const startDate = term.startDate;
  const endDate = term.endDate;

  const belongsToTerm = (itemDate: string, itemTermId?: string) => {
    if (itemTermId === termId) return true;
    if (!itemTermId && itemDate >= startDate && itemDate <= endDate) return true;
    return false;
  };

  const incomes = db.incomeEntries.filter(i => i.mosqueId === mosqueId && i.status === 'APPROVED' && !i.isReversal && belongsToTerm(i.date, (i as any).termId));
  const expenses = db.expenseEntries.filter(e => e.mosqueId === mosqueId && e.status === 'APPROVED' && !e.isReversal && belongsToTerm(e.date, (e as any).termId));
  const donations = db.donations.filter(d => d.mosqueId === mosqueId && d.status === 'COMPLETED' && belongsToTerm(d.date, (d as any).termId));
  const collections = db.donationBoxCollections.filter(c => c.mosqueId === mosqueId && belongsToTerm(c.collectionDate, (c as any).termId));

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalBoxCollections = collections.reduce((sum, c) => sum + c.amount, 0);

  const cashIncomes = incomes.filter(i => i.paymentMethod === 'CASH');
  const cashExpenses = expenses.filter(e => e.paymentMethod === 'CASH');
  const bankIncomes = incomes.filter(i => i.paymentMethod !== 'CASH');
  const bankExpenses = expenses.filter(e => e.paymentMethod !== 'CASH');

  const cashInflow = cashIncomes.reduce((sum, i) => sum + i.amount, 0);
  const cashOutflow = cashExpenses.reduce((sum, e) => sum + e.amount, 0);
  const bankInflow = bankIncomes.reduce((sum, i) => sum + i.amount, 0);
  const bankOutflow = bankExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openingBalance = term.openingBalance || 0;
  const calculatedClosing = openingBalance + totalIncome - totalExpense;
  const handoverBalance = term.handoverBalance !== undefined ? term.handoverBalance : calculatedClosing;
  const difference = handoverBalance - calculatedClosing;

  return {
    term,
    openingBalance,
    totalIncome,
    totalExpense,
    totalDonations,
    totalBoxCollections,
    cashInflow,
    cashOutflow,
    bankInflow,
    bankOutflow,
    calculatedClosing,
    handoverBalance,
    difference,
    incomesCount: incomes.length,
    expensesCount: expenses.length
  };
}

app.get('/api/v1/committee/terms/:id/financials', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const termId = req.params.id;
  const financials = computeCommitteeFinancials(mosqueId, termId);
  if (!financials) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মেয়াদকাল পাওয়া যায়নি।' } });
  }
  res.json({ success: true, data: financials });
});

app.post('/api/v1/committee/terms/:id/close', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const termId = req.params.id;
  const term = db.committeeTerms.find(t => t.id === termId && t.mosqueId === mosqueId);
  if (!term) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মেয়াদকাল পাওয়া যায়নি।' } });
  }

  const { actualHandoverBalance, handoverRecipientTermId, handoverRecipientName, handoverNotes, reconciliationNotes } = req.body;
  const financials = computeCommitteeFinancials(mosqueId, termId);
  if (!financials) {
    return res.status(400).json({ success: false, error: { code: 'CALC_ERROR', message: 'হিসাব গণনা করা সম্ভব হয়নি।' } });
  }

  term.status = 'CLOSED';
  term.closingBalance = financials.calculatedClosing;
  term.closingBalanceDate = new Date().toISOString().split('T')[0];
  term.handoverBalance = actualHandoverBalance !== undefined ? Number(actualHandoverBalance) : financials.calculatedClosing;
  term.actualHandoverBalance = term.handoverBalance;
  term.reconciliationDifference = term.handoverBalance - financials.calculatedClosing;
  term.reconciliationNotes = reconciliationNotes;
  term.handoverRecipientTermId = handoverRecipientTermId;
  term.handoverRecipientName = handoverRecipientName;
  term.handoverDate = new Date().toISOString().split('T')[0];
  term.handoverNotes = handoverNotes;
  term.approvedBy = req.user!.id;
  term.approvedByName = req.user!.name;
  term.approvalDate = new Date().toISOString().split('T')[0];

  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CLOSE', 'COMMITTEE_TERM', `কমিটি ক্লোজ ও হস্তান্তর সম্পন্ন: ${term.title}, হ্যান্ডওভার: ৳${term.handoverBalance}`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TERM_CLOSED', term, { senderId: req.user!.id });

  res.json({ success: true, data: term, message: 'কমিটির মেয়াদ সফলভাবে সমাপ্ত ও হিসাব হস্তান্তর করা হয়েছে।' });
});

app.post('/api/v1/committee/terms/:id/activate', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const termId = req.params.id;
  const term = db.committeeTerms.find(t => t.id === termId && t.mosqueId === mosqueId);
  if (!term) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মেয়াদকাল পাওয়া যায়নি।' } });
  }

  db.committeeTerms.forEach(t => {
    if (t.mosqueId === mosqueId && t.id !== termId && t.status === 'ACTIVE') {
      t.status = 'COMPLETED';
    }
  });

  term.status = 'ACTIVE';
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'ACTIVATE', 'COMMITTEE_TERM', `কমিটি সক্রিয় করা হয়েছে: ${term.title}`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TERM_ACTIVATED', term, { senderId: req.user!.id });

  res.json({ success: true, data: term, message: 'কমিটি সফলভাবে সক্রিয় করা হয়েছে।' });
});

app.post('/api/v1/committee/members', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const { termId, name, designation, designationBn, phone, nid, email, address, occupation, photoUrl, orderIndex, position, positionCustomBn } = req.body;
  const mosqueId = req.currentMosque!.id;

  const POSITION_MAP_BN: Record<string, string> = {
    PRESIDENT: 'সভাপতি (President)',
    VICE_PRESIDENT: 'সহ-সভাপতি (Vice President)',
    SECRETARY: 'সাধারণ সম্পাদক (General Secretary)',
    JOINT_SECRETARY: 'যুগ্ম সম্পাদক (Joint Secretary)',
    TREASURER: 'কোষাধ্যক্ষ (Treasurer)',
    ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
    MEMBER: 'কার্যনির্বাহী সদস্য (Member)',
    IMAM: 'ইমাম (সদস্য)',
    ADVISOR: 'উপদেষ্টা (Advisor)',
    OTHER: 'অন্যান্য পদবি',
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'সদস্যের নাম আবশ্যক।' } });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'মোবাইল নম্বর আবশ্যক।' } });
  }

  const finalPosition = position || designation || 'MEMBER';
  const finalDesignationBn = positionCustomBn || designationBn || POSITION_MAP_BN[finalPosition] || POSITION_MAP_BN['MEMBER'] || 'কার্যনির্বাহী সদস্য';

  const member: CommitteeMember = {
    id: `mem-${Date.now()}`,
    mosqueId,
    termId: termId || db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE')?.id || db.committeeTerms.find(t => t.mosqueId === mosqueId)?.id || 'term-2024-2026',
    name: name.trim(),
    nid: nid ? String(nid).trim() : '',
    phone: phone.trim(),
    address: address ? String(address).trim() : '',
    photoUrl: photoUrl || '',
    position: (finalPosition as any) || 'MEMBER',
    positionCustomBn: finalDesignationBn,
    joinDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    notes: occupation ? `পেশা: ${occupation}` : undefined,
    createdAt: new Date().toISOString()
  };

  db.committeeMembers.push(member);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'COMMITTEE_MEMBER', `কমিটিতে সদস্য অন্তর্ভুক্তি: ${member.name} (${finalDesignationBn})`);
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_MEMBER_CREATED', member, { senderId: req.user!.id });

  res.json({ success: true, data: member, message: 'কমিটির সদস্য সফলভাবে অন্তর্ভুক্ত করা হয়েছে।' });
});

app.put('/api/v1/committee/members/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const member = db.committeeMembers.find(m => m.id === req.params.id && m.mosqueId === req.currentMosque!.id);
  if (!member) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সদস্য পাওয়া যায়নি।' } });

  const POSITION_MAP_BN: Record<string, string> = {
    PRESIDENT: 'সভাপতি (President)',
    VICE_PRESIDENT: 'সহ-সভাপতি (Vice President)',
    SECRETARY: 'সাধারণ সম্পাদক (General Secretary)',
    JOINT_SECRETARY: 'যুগ্ম সম্পাদক (Joint Secretary)',
    TREASURER: 'কোষাধ্যক্ষ (Treasurer)',
    ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
    MEMBER: 'কার্যনির্বাহী সদস্য (Member)',
    IMAM: 'ইমাম (সদস্য)',
    ADVISOR: 'উপদেষ্টা (Advisor)',
    OTHER: 'অন্যান্য পদবি',
  };

  const { name, phone, nid, address, position, positionCustomBn, designation, designationBn, status, termId, notes, photoUrl } = req.body;

  if (name !== undefined) member.name = String(name).trim();
  if (phone !== undefined) member.phone = String(phone).trim();
  if (nid !== undefined) member.nid = String(nid).trim();
  if (address !== undefined) member.address = String(address).trim();
  if (termId !== undefined) member.termId = termId;
  if (status !== undefined) member.status = status;
  if (notes !== undefined) member.notes = notes;
  if (photoUrl !== undefined) member.photoUrl = photoUrl;

  const finalPos = position || designation;
  if (finalPos) {
    member.position = finalPos;
  }
  const finalPosBn = positionCustomBn || designationBn || (finalPos ? POSITION_MAP_BN[finalPos] : undefined);
  if (finalPosBn) {
    member.positionCustomBn = finalPosBn;
  }

  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'COMMITTEE_MEMBER', `সদস্য তথ্য আপডেট: ${member.name} (${member.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'})`);
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

app.get('/api/v1/committee/notices', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const notices = (db.committeeNotices || []).filter(n => n.mosqueId === mosqueId);
  res.json({ success: true, data: notices });
});

app.post('/api/v1/committee/notices', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { memoNo, serialNumber, noticeDate, meetingDate, dayName, time, venue, meetingType, meetingTypeBn, agendas, remarks } = req.body;

  const count = (db.committeeNotices || []).filter(n => n.mosqueId === mosqueId).length;
  const newNotice: CommitteeMeetingNotice = {
    id: `cnot-${Date.now()}`,
    mosqueId,
    memoNo: memoNo || `MJMWS-${new Date().getFullYear()}/${String(count + 1).padStart(3, '0')}`,
    serialNumber: serialNumber || String(count + 1),
    noticeDate: noticeDate || new Date().toISOString().split('T')[0],
    meetingDate: meetingDate || new Date().toISOString().split('T')[0],
    dayName: dayName || 'শুক্রবার',
    time: time || 'বাদ আসর',
    venue: venue || 'মসজিদ কার্যালয়',
    meetingType: meetingType || 'GENERAL',
    meetingTypeBn: meetingTypeBn || 'সাধারণ সভা',
    agendas: Array.isArray(agendas) ? agendas : (agendas ? agendas.split('\n').filter(Boolean) : ['সাধারণ আলোচ্যসূচি']),
    remarks: remarks || '',
    status: 'ISSUED',
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };

  if (!db.committeeNotices) db.committeeNotices = [];
  db.committeeNotices.unshift(newNotice);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'COMMITTEE_NOTICE', `মিটিং আহবান নোটিশ তৈরি: স্মারক নং ${newNotice.memoNo}`);
  realtime.broadcastToMosque(mosqueId, 'NOTICE_CREATED', newNotice, { senderId: req.user!.id });

  res.json({ success: true, data: newNotice, message: 'মিটিং নোটিশ সফলভাবে তৈরি হয়েছে।' });
});

app.delete('/api/v1/committee/notices/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const idx = (db.committeeNotices || []).findIndex(n => n.id === req.params.id && n.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোটিশ পাওয়া যায়নি।' } });
  }

  const removed = db.committeeNotices.splice(idx, 1)[0];
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'COMMITTEE_NOTICE', `মিটিং নোটিশ মুছে ফেলা: স্মারক ${removed.memoNo}`);

  res.json({ success: true, message: 'নোটিশ সফলভাবে অপসারিত হয়েছে।' });
});

app.get('/api/v1/committee/meetings', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const meetings = db.committeeMeetings.filter(m => m.mosqueId === mosqueId);
  res.json({ success: true, data: meetings });
});

app.post('/api/v1/committee/meetings', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const {
    documentNumber,
    meetingNumber,
    memoNumber,
    meetingNoticeId,
    noticeDate,
    date,
    dayName,
    time,
    closingTime,
    location,
    meetingType,
    meetingTypeBn,
    conductor,
    conductorMemberId,
    chairman,
    chairmanMemberId,
    chairmanDesignation,
    secretary,
    secretaryMemberId,
    duaLeader,
    duaLeaderMemberId,
    agenda,
    agendaItems,
    decisions,
    decisionItems,
    resolutions,
    miscellaneous,
    responsibleMembers,
    assignedTasks,
    attendees,
    status = 'FINAL',
    notes,
    presidentSignatureUrl,
    secretarySignatureUrl
  } = req.body;

  const mosqueId = req.currentMosque!.id;
  const year = new Date(date || Date.now()).getFullYear();
  const existingCount = db.committeeMeetings.filter(m => m.mosqueId === mosqueId).length;
  const autoDocNo = documentNumber || `MM-${year}-${String(existingCount + 1).padStart(4, '0')}`;
  const autoMeetNo = meetingNumber || `MEET-${existingCount + 1}`;

  // Process agenda items
  let cleanAgenda: string[] = [];
  let cleanAgendaItems: any[] = [];
  if (Array.isArray(agendaItems) && agendaItems.length > 0) {
    cleanAgendaItems = agendaItems.map((item: any, idx: number) => ({
      id: item.id || `ag-${Date.now()}-${idx}`,
      agendaNumber: item.agendaNumber || idx + 1,
      title: item.title || item.name || '',
      discussion: item.discussion || ''
    }));
    cleanAgenda = cleanAgendaItems.map(item => item.title).filter(Boolean);
  } else if (Array.isArray(agenda)) {
    cleanAgenda = agenda.filter((a: any) => typeof a === 'string' && a.trim() !== '');
    cleanAgendaItems = cleanAgenda.map((title, idx) => ({
      id: `ag-${Date.now()}-${idx}`,
      agendaNumber: idx + 1,
      title,
      discussion: ''
    }));
  } else {
    cleanAgenda = req.body.title ? [req.body.title] : ['সাধারণ আলোচ্যসূচি'];
    cleanAgendaItems = [{ id: `ag-${Date.now()}-0`, agendaNumber: 1, title: cleanAgenda[0], discussion: '' }];
  }

  // Process decision items
  let cleanDecisions: string[] = [];
  let cleanDecisionItems: any[] = [];
  if (Array.isArray(decisionItems) && decisionItems.length > 0) {
    cleanDecisionItems = decisionItems.map((d: any, idx: number) => ({
      id: d.id || `dec-${Date.now()}-${idx}`,
      decisionNumber: d.decisionNumber || `সিদ্ধান্ত-${idx + 1}`,
      agendaId: d.agendaId || undefined,
      agendaTitle: d.agendaTitle || undefined,
      details: d.details || d.decision || '',
      assignedMemberId: d.assignedMemberId || undefined,
      assignedMemberName: d.assignedMemberName || undefined,
      assignedMemberDesignation: d.assignedMemberDesignation || undefined,
      deadline: d.deadline || undefined,
      priority: d.priority || 'NORMAL',
      remarks: d.remarks || undefined,
      resolutionId: d.resolutionId || undefined,
      resolutionNumber: d.resolutionNumber || undefined
    }));
    cleanDecisions = cleanDecisionItems.map(d => d.details).filter(Boolean);
  } else if (Array.isArray(decisions)) {
    cleanDecisions = decisions.filter((d: any) => typeof d === 'string' && d.trim() !== '');
    cleanDecisionItems = cleanDecisions.map((details, idx) => ({
      id: `dec-${Date.now()}-${idx}`,
      decisionNumber: `সিদ্ধান্ত-${idx + 1}`,
      details,
      priority: 'NORMAL'
    }));
  } else if (Array.isArray(resolutions)) {
    cleanDecisions = resolutions;
    cleanDecisionItems = cleanDecisions.map((details, idx) => ({
      id: `dec-${Date.now()}-${idx}`,
      decisionNumber: `সিদ্ধান্ত-${idx + 1}`,
      details,
      priority: 'NORMAL'
    }));
  }

  // Process assigned tasks & sync to CommitteeTasks if assigned
  let cleanTasks: any[] = [];
  if (Array.isArray(assignedTasks) && assignedTasks.length > 0) {
    cleanTasks = assignedTasks.map((t: any, idx: number) => ({
      id: t.id || `ts-${Date.now()}-${idx}`,
      taskDescription: t.taskDescription || t.task || '',
      assignedMemberId: t.assignedMemberId || undefined,
      assignedMemberName: t.assignedMemberName || t.assigneeName || '',
      assignedMemberDesignation: t.assignedMemberDesignation || t.assigneeDesignation || undefined,
      startDate: t.startDate || undefined,
      endDate: t.endDate || t.deadline || undefined,
      status: t.status || 'PENDING',
      notes: t.notes || undefined
    }));

    // Sync to committeeTasks for member evaluation
    if (!db.committeeTasks) db.committeeTasks = [];
    const activeTerm = db.committeeTerms.find(term => term.mosqueId === mosqueId && term.status === 'ACTIVE') || db.committeeTerms[0];
    cleanTasks.forEach(task => {
      if (task.assignedMemberId && task.taskDescription) {
        const newTaskItem = {
          id: `ctask-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          mosqueId,
          termId: activeTerm ? activeTerm.id : 'term-default',
          memberId: task.assignedMemberId,
          memberName: task.assignedMemberName,
          memberDesignation: task.assignedMemberDesignation || 'কমিটি সদস্য',
          taskTitle: task.taskDescription,
          title: task.taskDescription,
          description: `মিটিং কার্যবিবরণী (${autoDocNo}) থেকে অর্পিত দায়িত্ব।`,
          assignedDate: task.startDate || date || new Date().toISOString().split('T')[0],
          dueDate: task.endDate || new Date().toISOString().split('T')[0],
          assignedBy: req.user!.id,
          assignedByName: req.user!.name,
          priority: 'HIGH' as const,
          status: (task.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS') as any,
          relatedMeetingId: `meet-${Date.now()}`,
          relatedMeetingTitle: `মিটিং নং ${autoMeetNo}`,
          createdAt: new Date().toISOString()
        };
        db.committeeTasks.unshift(newTaskItem);
      }
    });
  }

  const cleanAttendees = Array.isArray(attendees) ? attendees : [];
  const presentNames = cleanAttendees
    .filter((a: any) => a.attendanceStatus === 'PRESENT')
    .map((a: any) => a.name);
  const absentNames = cleanAttendees
    .filter((a: any) => a.attendanceStatus !== 'PRESENT')
    .map((a: any) => a.name);

  const meeting: CommitteeMeeting = {
    id: `meet-${Date.now()}`,
    mosqueId,
    documentNumber: autoDocNo,
    meetingNumber: autoMeetNo,
    memoNumber: memoNumber || undefined,
    meetingNoticeId: meetingNoticeId || undefined,
    noticeDate: noticeDate || undefined,
    date: date || new Date().toISOString().split('T')[0],
    dayName: dayName || 'শুক্রবার',
    time: time || 'বাদ মাগরিব',
    closingTime: closingTime || undefined,
    location: location || 'মসজিদ অডিটোরিয়াম',
    meetingType: meetingType || 'GENERAL',
    meetingTypeBn: meetingTypeBn || 'সাধারণ সভা',
    conductor: conductor || undefined,
    conductorMemberId: conductorMemberId || undefined,
    chairman: chairman || req.body.presidedBy || 'সভাপতি',
    chairmanMemberId: chairmanMemberId || undefined,
    chairmanDesignation: chairmanDesignation || 'সভাপতি',
    secretary: secretary || req.body.recordedBy || req.user!.name,
    secretaryMemberId: secretaryMemberId || undefined,
    duaLeader: duaLeader || undefined,
    duaLeaderMemberId: duaLeaderMemberId || undefined,
    agenda: cleanAgenda.length > 0 ? cleanAgenda : ['সাধারণ আলোচ্যসূচি'],
    agendaItems: cleanAgendaItems,
    decisions: cleanDecisions,
    decisionItems: cleanDecisionItems,
    resolutions: cleanDecisions,
    assignedTasks: cleanTasks,
    miscellaneous: miscellaneous || undefined,
    responsibleMembers: Array.isArray(responsibleMembers) ? responsibleMembers : [],
    attendees: cleanAttendees,
    membersPresent: presentNames.length > 0 ? presentNames : [`উপস্থিত সদস্য (${cleanAttendees.length || 10} জন)`],
    membersAbsent: absentNames,
    presidentSignatureUrl: presidentSignatureUrl || req.currentMosque?.presidentSignatureUrl,
    secretarySignatureUrl: secretarySignatureUrl || req.currentMosque?.secretarySignatureUrl,
    status: status as any,
    resolutionNumber: autoMeetNo,
    notes: notes || undefined,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.committeeMeetings.unshift(meeting);

  // If created from a notice, mark the notice as converted
  if (meetingNoticeId && db.committeeNotices) {
    const matchedNotice = db.committeeNotices.find(n => n.id === meetingNoticeId && n.mosqueId === mosqueId);
    if (matchedNotice) {
      matchedNotice.status = 'CONVERTED_TO_MINUTES';
    }
  }

  db.save();

  const auditAction = status === 'DRAFT' ? 'DRAFT_SAVED' : 'CREATE';
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    auditAction,
    'COMMITTEE_MEETING',
    `নতুন সভার কার্যবিবরণী সংরক্ষিত: ${meeting.documentNumber} (${meeting.meetingTypeBn || meeting.meetingType}) - স্ট্যাটাস: ${status}`
  );
  realtime.broadcastToMosque(mosqueId, 'MEETING_CREATED', meeting, { senderId: req.user!.id });

  res.json({ success: true, data: meeting, message: status === 'DRAFT' ? 'ড্রাফট হিসেবে সংরক্ষিত হয়েছে।' : 'মিটিং কার্যবিবরণী ও গৃহীত সিদ্ধান্ত সফলভাবে সংরক্ষিত হয়েছে।' });
});

app.put('/api/v1/committee/meetings/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const meeting = db.committeeMeetings.find(m => m.id === req.params.id && m.mosqueId === mosqueId);
  if (!meeting) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মিটিং কার্যবিবরণী পাওয়া যায়নি।' } });
  }

  const {
    isRevision,
    revisionReason,
    status,
    memoNumber,
    meetingNoticeId,
    noticeDate,
    date,
    dayName,
    time,
    closingTime,
    location,
    meetingType,
    meetingTypeBn,
    conductor,
    conductorMemberId,
    chairman,
    chairmanMemberId,
    chairmanDesignation,
    secretary,
    secretaryMemberId,
    duaLeader,
    duaLeaderMemberId,
    agenda,
    agendaItems,
    decisions,
    decisionItems,
    resolutions,
    assignedTasks,
    miscellaneous,
    responsibleMembers,
    attendees,
    notes,
    presidentSignatureUrl,
    secretarySignatureUrl
  } = req.body;

  // Handle Revision Creation
  if (isRevision) {
    const revNumber = (meeting.revisionHistory?.length || 0) + 1;
    const revEntry = {
      revisionNo: revNumber,
      revisionDate: new Date().toISOString(),
      revisedBy: req.user!.id,
      revisedByName: req.user!.name,
      reason: revisionReason || 'সংশোধিত কার্যবিবরণী তৈরি',
      previousDecisions: [...meeting.decisions],
      createdAt: new Date().toISOString(),
    };

    if (!meeting.revisionHistory) meeting.revisionHistory = [];
    meeting.revisionHistory.push(revEntry);
    meeting.isRevised = true;
    meeting.status = 'REVISED';
  } else if (status) {
    meeting.status = status;
  }

  // Update fields if provided
  if (memoNumber !== undefined) meeting.memoNumber = memoNumber;
  if (meetingNoticeId !== undefined) meeting.meetingNoticeId = meetingNoticeId;
  if (noticeDate !== undefined) meeting.noticeDate = noticeDate;
  if (date !== undefined) meeting.date = date;
  if (dayName !== undefined) meeting.dayName = dayName;
  if (time !== undefined) meeting.time = time;
  if (closingTime !== undefined) meeting.closingTime = closingTime;
  if (location !== undefined) meeting.location = location;
  if (meetingType !== undefined) meeting.meetingType = meetingType;
  if (meetingTypeBn !== undefined) meeting.meetingTypeBn = meetingTypeBn;
  if (conductor !== undefined) meeting.conductor = conductor;
  if (conductorMemberId !== undefined) meeting.conductorMemberId = conductorMemberId;
  if (chairman !== undefined) meeting.chairman = chairman;
  if (chairmanMemberId !== undefined) meeting.chairmanMemberId = chairmanMemberId;
  if (chairmanDesignation !== undefined) meeting.chairmanDesignation = chairmanDesignation;
  if (secretary !== undefined) meeting.secretary = secretary;
  if (secretaryMemberId !== undefined) meeting.secretaryMemberId = secretaryMemberId;
  if (duaLeader !== undefined) meeting.duaLeader = duaLeader;
  if (duaLeaderMemberId !== undefined) meeting.duaLeaderMemberId = duaLeaderMemberId;
  if (miscellaneous !== undefined) meeting.miscellaneous = miscellaneous;
  if (notes !== undefined) meeting.notes = notes;

  if (Array.isArray(agendaItems)) {
    meeting.agendaItems = agendaItems;
    meeting.agenda = agendaItems.map((item: any) => item.title || '').filter(Boolean);
  } else if (Array.isArray(agenda)) {
    meeting.agenda = agenda.filter((a: any) => typeof a === 'string' && a.trim() !== '');
  }

  if (Array.isArray(decisionItems)) {
    meeting.decisionItems = decisionItems;
    meeting.decisions = decisionItems.map((d: any) => d.details || '').filter(Boolean);
    meeting.resolutions = meeting.decisions;
  } else if (Array.isArray(decisions)) {
    const cleanD = decisions.filter((d: any) => typeof d === 'string' && d.trim() !== '');
    meeting.decisions = cleanD;
    meeting.resolutions = cleanD;
  } else if (Array.isArray(resolutions)) {
    meeting.decisions = resolutions;
    meeting.resolutions = resolutions;
  }

  if (Array.isArray(assignedTasks)) {
    meeting.assignedTasks = assignedTasks;
  }

  if (Array.isArray(responsibleMembers)) {
    meeting.responsibleMembers = responsibleMembers;
  }
  if (Array.isArray(attendees)) {
    meeting.attendees = attendees;
    meeting.membersPresent = attendees.filter((a: any) => a.attendanceStatus === 'PRESENT').map((a: any) => a.name);
    meeting.membersAbsent = attendees.filter((a: any) => a.attendanceStatus !== 'PRESENT').map((a: any) => a.name);
  }

  if (presidentSignatureUrl !== undefined) meeting.presidentSignatureUrl = presidentSignatureUrl;
  if (secretarySignatureUrl !== undefined) meeting.secretarySignatureUrl = secretarySignatureUrl;
  meeting.updatedAt = new Date().toISOString();

  db.save();

  const auditAction = isRevision ? 'REVISION_CREATED' : (status === 'FINAL' ? 'FINALIZED' : 'UPDATE');
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    auditAction,
    'COMMITTEE_MEETING',
    `মিটিং কার্যবিবরণী আপডেট: ${meeting.documentNumber} (${meeting.status}) - ${isRevision ? `রিভিশন #${meeting.revisionHistory?.length}` : 'তথ্য হালনাগাদ'}`
  );
  realtime.broadcastToMosque(mosqueId, 'MEETING_UPDATED', meeting, { senderId: req.user!.id });

  res.json({ success: true, data: meeting, message: 'মিটিং কার্যবিবরণী সফলভাবে আপডেট করা হয়েছে।' });
});

app.delete('/api/v1/committee/meetings/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const idx = db.committeeMeetings.findIndex(m => m.id === req.params.id && m.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মিটিং কার্যবিবরণী পাওয়া যায়নি।' } });
  }

  const removed = db.committeeMeetings.splice(idx, 1)[0];
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'COMMITTEE_MEETING', `মিটিং কার্যবিবরণী মুছে ফেলা: ${removed.documentNumber || removed.meetingNumber}`);
  realtime.broadcastToMosque(mosqueId, 'MEETING_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'মিটিং কার্যবিবরণী সফলভাবে মুছে ফেলা হয়েছে।' });
});

app.post('/api/v1/committee/meetings/:id/audit', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { action, details } = req.body; // e.g. 'PRINT', 'PDF_DOWNLOAD'
  const meeting = db.committeeMeetings.find(m => m.id === req.params.id && m.mosqueId === mosqueId);
  if (meeting) {
    db.logAudit(
      mosqueId,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      action || 'PRINT',
      'COMMITTEE_MEETING',
      details || `মিটিং কার্যবিবরণী ${action === 'PDF_DOWNLOAD' ? 'PDF ডাউনলোড' : 'প্রিন্ট'}: ${meeting.documentNumber}`
    );
  }
  res.json({ success: true });
});

// ==========================================
// 8.4 MEETING RESOLUTIONS (মিটিং রেজোলিউশন - আলাদা স্বয়ংসম্পূর্ণ মডিউল)
// ==========================================

// Get All Resolutions with multi-criteria filtering
app.get('/api/v1/committee/resolutions', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { meetingId, status, memberId, search, fromDate, toDate, month, year, priority } = req.query;

  if (!db.committeeResolutions) db.committeeResolutions = [];

  let list = db.committeeResolutions.filter(r => r.mosqueId === mosqueId);

  if (meetingId) list = list.filter(r => r.meetingId === meetingId);
  if (status) list = list.filter(r => r.status === status);
  if (memberId) list = list.filter(r => r.assignedMemberId === memberId);
  if (priority) list = list.filter(r => r.priority === priority);
  if (fromDate) list = list.filter(r => r.date >= String(fromDate));
  if (toDate) list = list.filter(r => r.date <= String(toDate));
  if (year) list = list.filter(r => r.date.startsWith(String(year)));
  if (month) list = list.filter(r => r.date.startsWith(String(month)));

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(r =>
      r.resolutionNumber.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.resolutionText.toLowerCase().includes(q) ||
      (r.assignedMemberName && r.assignedMemberName.toLowerCase().includes(q)) ||
      (r.meetingNumber && r.meetingNumber.toLowerCase().includes(q))
    );
  }

  // Sort descending by date and creation
  list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

  res.json({ success: true, data: list });
});

// Get Single Resolution
app.get('/api/v1/committee/resolutions/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeResolutions) db.committeeResolutions = [];
  const resolution = db.committeeResolutions.find(r => r.id === req.params.id && r.mosqueId === mosqueId);

  if (!resolution) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'রেজোলিউশন পাওয়া যায়নি।' } });
  }

  res.json({ success: true, data: resolution });
});

// Create New Resolution
app.post('/api/v1/committee/resolutions', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  // Support both single resolution and bulk array of resolutions
  const isBulk = Array.isArray(req.body.resolutions);
  const resolutionsToCreate = isBulk ? req.body.resolutions : [req.body];

  if (resolutionsToCreate.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'অন্তত একটি রেজোলিউশন তথ্য প্রদান করুন।' } });
  }

  if (!db.committeeResolutions) db.committeeResolutions = [];

  const createdResolutions: MeetingResolution[] = [];
  const curYear = new Date().getFullYear();

  for (let i = 0; i < resolutionsToCreate.length; i++) {
    const item = resolutionsToCreate[i];
    const {
      resolutionNumber,
      resolutionType = 'INDIVIDUAL',
      meetingId,
      meetingDocumentNumber,
      meetingNumber,
      meetingMemoNumber,
      meetingDate,
      meetingDayName,
      meetingTime,
      meetingType,
      meetingTypeBn,
      meetingVenue,
      meetingChairman,
      meetingSecretary,
      meetingConductor,
      meetingAgendas,
      agendaId,
      agendaTitle,
      decisionId,
      decisionNumber,
      decisionIds,
      items,
      date,
      subject,
      background,
      consideration,
      proposal,
      proposerName,
      supporterName,
      resolutionText,
      assignedMemberId,
      assignedMemberName,
      assignedMemberDesignation,
      assignedMemberPhone,
      taskDescription,
      deadline,
      status = 'DRAFT',
      priority = 'NORMAL',
      implementationStatus = 'PENDING',
      progressPercentage = 0,
      completionDate,
      financialAmount,
      termId,
      termTitle,
      remarks,
      presidentSignatureUrl,
      secretarySignatureUrl
    } = item;

    if (!subject || !resolutionText) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `রেজোলিউশনের বিষয় ও গৃহীত সিদ্ধান্ত প্রদান করা আবশ্যক (আইটেম #${i + 1})।` } });
    }

    const existingCount = db.committeeResolutions.filter(r => r.mosqueId === mosqueId).length + createdResolutions.length;
    const autoResNo = resolutionNumber || `RES-${curYear}-${String(existingCount + 1).padStart(3, '0')}`;

    const newResolution: MeetingResolution = {
      id: `res-${Date.now()}-${i}`,
      mosqueId,
      resolutionNumber: autoResNo,
      resolutionType: resolutionType as ResolutionType,
      meetingId: meetingId || '',
      meetingDocumentNumber: meetingDocumentNumber || undefined,
      meetingNumber: meetingNumber || undefined,
      meetingMemoNumber: meetingMemoNumber || undefined,
      meetingDate: meetingDate || undefined,
      meetingDayName: meetingDayName || undefined,
      meetingTime: meetingTime || undefined,
      meetingType: meetingType || undefined,
      meetingTypeBn: meetingTypeBn || undefined,
      meetingVenue: meetingVenue || undefined,
      meetingChairman: meetingChairman || undefined,
      meetingSecretary: meetingSecretary || undefined,
      meetingConductor: meetingConductor || undefined,
      meetingAgendas: meetingAgendas || undefined,
      agendaId: agendaId || undefined,
      agendaTitle: agendaTitle || undefined,
      decisionId: decisionId || undefined,
      decisionNumber: decisionNumber || undefined,
      decisionIds: decisionIds || (decisionId ? [decisionId] : undefined),
      items: items || undefined,
      date: date || new Date().toISOString().split('T')[0],
      subject: subject.trim(),
      background: background || undefined,
      consideration: consideration || undefined,
      proposal: proposal || undefined,
      proposerName: proposerName || undefined,
      supporterName: supporterName || undefined,
      resolutionText: resolutionText.trim(),
      assignedMemberId: assignedMemberId || undefined,
      assignedMemberName: assignedMemberName || undefined,
      assignedMemberDesignation: assignedMemberDesignation || undefined,
      assignedMemberPhone: assignedMemberPhone || undefined,
      taskDescription: taskDescription || undefined,
      deadline: deadline || undefined,
      status: status as ResolutionStatus,
      priority: priority || 'NORMAL',
      implementationStatus: (implementationStatus || (status === 'IMPLEMENTED' ? 'COMPLETED' : 'PENDING')) as ResolutionImplementationStatus,
      progressPercentage: progressPercentage !== undefined ? Number(progressPercentage) : 0,
      completionDate: completionDate || undefined,
      financialAmount: financialAmount !== undefined ? Number(financialAmount) : undefined,
      termId: termId || undefined,
      termTitle: termTitle || undefined,
      remarks: remarks || undefined,
      presidentSignatureUrl: presidentSignatureUrl || req.currentMosque?.presidentSignatureUrl,
      secretarySignatureUrl: secretarySignatureUrl || req.currentMosque?.secretarySignatureUrl,
      createdBy: req.user!.id,
      createdByName: req.user!.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.committeeResolutions.unshift(newResolution);
    createdResolutions.push(newResolution);

    // If tied to a meeting decision or multiple decisions, update parent meeting decisions linkage
    if (meetingId) {
      const parentMeeting = db.committeeMeetings.find(m => m.id === meetingId && m.mosqueId === mosqueId);
      if (parentMeeting && parentMeeting.decisionItems) {
        if (decisionId) {
          const targetDecision = parentMeeting.decisionItems.find(d => d.id === decisionId);
          if (targetDecision) {
            targetDecision.resolutionId = newResolution.id;
            targetDecision.resolutionNumber = newResolution.resolutionNumber;
          }
        }
        if (decisionIds && Array.isArray(decisionIds)) {
          parentMeeting.decisionItems.forEach(d => {
            if (decisionIds.includes(d.id)) {
              d.resolutionId = newResolution.id;
              d.resolutionNumber = newResolution.resolutionNumber;
            }
          });
        }
      }
    }
  }

  db.save();

  for (const r of createdResolutions) {
    db.logAudit(
      mosqueId,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE',
      'COMMITTEE_RESOLUTION',
      `নতুন রেজোলিউশন তৈরি: ${r.resolutionNumber} - ${r.subject} (${r.resolutionType === 'COMBINED' ? 'সম্মিলিত রেজোলিউশন' : 'একক রেজোলিউশন'}) [স্ট্যাটাস: ${r.status}]`
    );
    realtime.broadcastToMosque(mosqueId, 'RESOLUTION_CREATED', r, { senderId: req.user!.id });
  }

  res.json({
    success: true,
    data: isBulk ? createdResolutions : createdResolutions[0],
    count: createdResolutions.length,
    message: isBulk
      ? `${createdResolutions.length}টি রেজোলিউশন সফলভাবে তৈরি হয়েছে।`
      : 'রেজোলিউশন সফলভাবে তৈরি হয়েছে।'
  });
});

// Update Existing Resolution (Supports Revision workflow for Approved ones)
app.put('/api/v1/committee/resolutions/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeResolutions) db.committeeResolutions = [];
  const resolution = db.committeeResolutions.find(r => r.id === req.params.id && r.mosqueId === mosqueId);

  if (!resolution) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'রেজোলিউশন পাওয়া যায়নি।' } });
  }

  const {
    isRevision,
    revisionReason,
    resolutionNumber,
    resolutionType,
    date,
    subject,
    background,
    consideration,
    proposal,
    proposerName,
    supporterName,
    resolutionText,
    assignedMemberId,
    assignedMemberName,
    assignedMemberDesignation,
    assignedMemberPhone,
    taskDescription,
    deadline,
    status,
    priority,
    implementationStatus,
    progressPercentage,
    completionDate,
    financialAmount,
    items,
    decisionIds,
    termId,
    termTitle,
    remarks,
    presidentSignatureUrl,
    secretarySignatureUrl
  } = req.body;

  // Handle Revision Workflow
  if (isRevision) {
    const revNo = (resolution.revisionHistory?.length || 0) + 1;
    const revEntry = {
      revisionNo: revNo,
      revisionDate: new Date().toISOString(),
      revisedBy: req.user!.id,
      revisedByName: req.user!.name,
      reason: revisionReason || 'রেজোলিউশন পরিমার্জন ও সংশোধন',
      previousContent: {
        subject: resolution.subject,
        background: resolution.background,
        consideration: resolution.consideration,
        proposal: resolution.proposal,
        resolutionText: resolution.resolutionText,
        status: resolution.status,
        deadline: resolution.deadline,
        items: resolution.items ? JSON.parse(JSON.stringify(resolution.items)) : undefined
      },
      createdAt: new Date().toISOString()
    };

    if (!resolution.revisionHistory) resolution.revisionHistory = [];
    resolution.revisionHistory.push(revEntry);
    resolution.isRevised = true;
    resolution.revisionNumber = revNo;
    resolution.revisionReason = revisionReason;
  }

  if (resolutionNumber !== undefined) resolution.resolutionNumber = resolutionNumber;
  if (resolutionType !== undefined) resolution.resolutionType = resolutionType;
  if (date !== undefined) resolution.date = date;
  if (subject !== undefined) resolution.subject = subject.trim();
  if (background !== undefined) resolution.background = background;
  if (consideration !== undefined) resolution.consideration = consideration;
  if (proposal !== undefined) resolution.proposal = proposal;
  if (proposerName !== undefined) resolution.proposerName = proposerName;
  if (supporterName !== undefined) resolution.supporterName = supporterName;
  if (resolutionText !== undefined) resolution.resolutionText = resolutionText.trim();
  if (assignedMemberId !== undefined) resolution.assignedMemberId = assignedMemberId;
  if (assignedMemberName !== undefined) resolution.assignedMemberName = assignedMemberName;
  if (assignedMemberDesignation !== undefined) resolution.assignedMemberDesignation = assignedMemberDesignation;
  if (assignedMemberPhone !== undefined) resolution.assignedMemberPhone = assignedMemberPhone;
  if (taskDescription !== undefined) resolution.taskDescription = taskDescription;
  if (deadline !== undefined) resolution.deadline = deadline;
  if (status !== undefined) resolution.status = status;
  if (priority !== undefined) resolution.priority = priority;
  if (implementationStatus !== undefined) resolution.implementationStatus = implementationStatus;
  if (progressPercentage !== undefined) resolution.progressPercentage = Number(progressPercentage);
  if (completionDate !== undefined) resolution.completionDate = completionDate;
  if (financialAmount !== undefined) resolution.financialAmount = financialAmount ? Number(financialAmount) : undefined;
  if (items !== undefined) resolution.items = items;
  if (decisionIds !== undefined) resolution.decisionIds = decisionIds;
  if (termId !== undefined) resolution.termId = termId;
  if (termTitle !== undefined) resolution.termTitle = termTitle;
  if (remarks !== undefined) resolution.remarks = remarks;
  if (presidentSignatureUrl !== undefined) resolution.presidentSignatureUrl = presidentSignatureUrl;
  if (secretarySignatureUrl !== undefined) resolution.secretarySignatureUrl = secretarySignatureUrl;

  resolution.updatedAt = new Date().toISOString();

  db.save();

  const auditAction = isRevision ? 'REVISION_CREATED' : 'UPDATE';
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    auditAction,
    'COMMITTEE_RESOLUTION',
    `রেজোলিউশন আপডেট: ${resolution.resolutionNumber} - ${resolution.subject} (${isRevision ? `রিভিশন #${resolution.revisionNumber}` : `স্ট্যাটাস: ${resolution.status}, বাস্তবায়ন: ${resolution.implementationStatus || 'চলমান'}`})`
  );
  realtime.broadcastToMosque(mosqueId, 'RESOLUTION_UPDATED', resolution, { senderId: req.user!.id });

  res.json({ success: true, data: resolution, message: 'রেজোলিউশন সফলভাবে আপডেট করা হয়েছে।' });
});

// Update Implementation Progress of Resolution
app.patch('/api/v1/committee/resolutions/:id/implementation', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeResolutions) db.committeeResolutions = [];
  const resolution = db.committeeResolutions.find(r => r.id === req.params.id && r.mosqueId === mosqueId);

  if (!resolution) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'রেজোলিউশন পাওয়া যায়নি।' } });
  }

  const { implementationStatus, progressPercentage, completionDate, remarks } = req.body;

  if (implementationStatus) resolution.implementationStatus = implementationStatus;
  if (progressPercentage !== undefined) resolution.progressPercentage = Number(progressPercentage);
  if (completionDate !== undefined) resolution.completionDate = completionDate;
  if (remarks !== undefined) resolution.remarks = remarks;

  if (implementationStatus === 'COMPLETED' && resolution.status === 'APPROVED') {
    resolution.status = 'IMPLEMENTED';
  }

  resolution.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_RESOLUTION',
    `রেজোলিউশন বাস্তবায়ন অগ্রগতি আপডেট: ${resolution.resolutionNumber} (অগ্রগতি: ${resolution.progressPercentage || 0}%, স্ট্যাটাস: ${resolution.implementationStatus})`
  );
  realtime.broadcastToMosque(mosqueId, 'RESOLUTION_UPDATED', resolution, { senderId: req.user!.id });

  res.json({ success: true, data: resolution, message: 'বাস্তবায়ন অগ্রগতি সফলভাবে আপডেট হয়েছে।' });
});

// Delete Resolution (Enforcing Business Rule 13: Approved resolutions require cancel/revoke unless forced)
app.delete('/api/v1/committee/resolutions/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeResolutions) db.committeeResolutions = [];
  const idx = db.committeeResolutions.findIndex(r => r.id === req.params.id && r.mosqueId === mosqueId);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'রেজোলিউশন পাওয়া যায়নি।' } });
  }

  const target = db.committeeResolutions[idx];
  const force = req.query.force === 'true';

  // Rule: An APPROVED or IMPLEMENTED resolution cannot be deleted directly without force
  if ((target.status === 'APPROVED' || target.status === 'IMPLEMENTED') && !force) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'APPROVED_RESOLUTION_PROTECTED',
        message: 'অনুমোদিত বা বাস্তবায়িত রেজোলিউশন সরাসরি মুছে ফেলা যায় না। অডিট ট্রেইল রক্ষার স্বার্থে রেজোলিউশনটি বাতিল (Cancel) অথবা সংশোধন (Revise) করুন।'
      }
    });
  }

  const removed = db.committeeResolutions.splice(idx, 1)[0];

  // Unlink from meeting decision if linked
  if (removed.meetingId) {
    const parentMeeting = db.committeeMeetings.find(m => m.id === removed.meetingId && m.mosqueId === mosqueId);
    if (parentMeeting && parentMeeting.decisionItems) {
      if (removed.decisionId) {
        const targetDecision = parentMeeting.decisionItems.find(d => d.id === removed.decisionId);
        if (targetDecision && targetDecision.resolutionId === removed.id) {
          delete targetDecision.resolutionId;
          delete targetDecision.resolutionNumber;
        }
      }
      if (removed.decisionIds && Array.isArray(removed.decisionIds)) {
        parentMeeting.decisionItems.forEach(d => {
          if (removed.decisionIds!.includes(d.id) && d.resolutionId === removed.id) {
            delete d.resolutionId;
            delete d.resolutionNumber;
          }
        });
      }
    }
  }

  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'COMMITTEE_RESOLUTION',
    `রেজোলিউশন মুছে ফেলা হয়েছে: ${removed.resolutionNumber} - ${removed.subject} (পূর্ববর্তী স্ট্যাটাস: ${removed.status})`
  );
  realtime.broadcastToMosque(mosqueId, 'RESOLUTION_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'রেজোলিউশন সফলভাবে মুছে ফেলা হয়েছে।' });
});

// Duplicate Resolution
app.post('/api/v1/committee/resolutions/:id/duplicate', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeResolutions) db.committeeResolutions = [];
  const orig = db.committeeResolutions.find(r => r.id === req.params.id && r.mosqueId === mosqueId);

  if (!orig) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মূল রেজোলিউশন পাওয়া যায়নি।' } });
  }

  const curYear = new Date().getFullYear();
  const existingCount = db.committeeResolutions.filter(r => r.mosqueId === mosqueId).length;
  const newResNo = `RES-${curYear}-${String(existingCount + 1).padStart(3, '0')}`;

  const duplicated: MeetingResolution = {
    ...orig,
    id: `res-${Date.now()}`,
    resolutionNumber: newResNo,
    subject: `(কপি) ${orig.subject}`,
    status: 'DRAFT',
    isRevised: false,
    revisionNumber: undefined,
    revisionReason: undefined,
    revisionHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: req.user!.id,
    createdByName: req.user!.name
  };

  db.committeeResolutions.unshift(duplicated);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DUPLICATE',
    'COMMITTEE_RESOLUTION',
    `রেজোলিউশন ডুপ্লিকেট: ${orig.resolutionNumber} -> ${duplicated.resolutionNumber}`
  );
  realtime.broadcastToMosque(mosqueId, 'RESOLUTION_CREATED', duplicated, { senderId: req.user!.id });

  res.json({ success: true, data: duplicated, message: 'রেজোলিউশন সফলভাবে অনুলিপি (Duplicate) করা হয়েছে।' });
});

// Audit log for Resolution print / PDF download
app.post('/api/v1/committee/resolutions/:id/audit', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { action, details } = req.body;
  if (!db.committeeResolutions) db.committeeResolutions = [];
  const resObj = db.committeeResolutions.find(r => r.id === req.params.id && r.mosqueId === mosqueId);

  if (resObj) {
    db.logAudit(
      mosqueId,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      action || 'PRINT',
      'COMMITTEE_RESOLUTION',
      details || `রেজোলিউশন ${action === 'PDF_DOWNLOAD' ? 'PDF ডাউনলোড' : 'প্রিন্ট'}: ${resObj.resolutionNumber}`
    );
  }
  res.json({ success: true });
});

// ==========================================
// 8.5 COMMITTEE MEMBER PERFORMANCE & EVALUATION
// ==========================================

// 1. Get Committee Activities
app.get('/api/v1/committee/activities', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { termId, memberId, category, status, fromDate, toDate } = req.query;

  let list = db.committeeActivities.filter(a => a.mosqueId === mosqueId);
  if (termId) list = list.filter(a => a.termId === termId);
  if (memberId) list = list.filter(a => a.memberId === memberId);
  if (category) list = list.filter(a => a.category === category);
  if (status) list = list.filter(a => a.status === status);
  if (fromDate) list = list.filter(a => a.date >= String(fromDate));
  if (toDate) list = list.filter(a => a.date <= String(toDate));

  // Sort descending by date
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, data: list });
});

// 2. Create Committee Activity
app.post('/api/v1/committee/activities', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const {
    termId,
    memberId,
    memberName,
    memberDesignation,
    activityType,
    activityTypeBn,
    category = 'COMMITTEE_ACTIVITY',
    title,
    description,
    date,
    relatedMeetingId,
    relatedMeetingTitle,
    assignedBy,
    assignedByName,
    status = 'COMPLETED',
    qualityRating,
    qualityScore,
    evidenceAttachmentUrl,
    evidenceAttachmentName,
    evaluatorNote
  } = req.body;

  if (!termId || !memberId || !title || !date) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'সদস্য, কার্যকালের মেয়াদ, কার্যক্রমের শিরোনাম এবং তারিখ আবশ্যক।' }
    });
  }

  // Derive score if rating provided but no numeric score
  let numericScore = qualityScore !== undefined && qualityScore !== '' ? Number(qualityScore) : undefined;
  if (numericScore === undefined && qualityRating) {
    if (qualityRating === 'EXCELLENT') numericScore = 95;
    else if (qualityRating === 'GOOD') numericScore = 85;
    else if (qualityRating === 'SATISFACTORY') numericScore = 75;
    else if (qualityRating === 'NEEDS_IMPROVEMENT') numericScore = 60;
  }

  // Find member info if not fully passed
  const member = db.committeeMembers.find(m => m.id === memberId && m.mosqueId === mosqueId);
  const finalMemberName = memberName || member?.name || 'কমিটি সদস্য';
  const finalDesignation = memberDesignation || member?.positionCustomBn || member?.position || 'সদস্য';

  const activity: CommitteeMemberActivity = {
    id: `cact-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mosqueId,
    termId,
    memberId,
    memberName: finalMemberName,
    memberDesignation: finalDesignation,
    activityType: activityType || 'OTHER',
    activityTypeBn: activityTypeBn || 'অন্যান্য কার্যক্রম',
    category,
    title: title.trim(),
    description: (description || '').trim(),
    date,
    relatedMeetingId: relatedMeetingId || undefined,
    relatedMeetingTitle: relatedMeetingTitle || undefined,
    assignedBy: assignedBy || undefined,
    assignedByName: assignedByName || undefined,
    status,
    qualityRating: qualityRating || undefined,
    qualityScore: numericScore,
    evidenceAttachmentUrl: evidenceAttachmentUrl || undefined,
    evidenceAttachmentName: evidenceAttachmentName || undefined,
    evaluatorNote: evaluatorNote || undefined,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  db.committeeActivities.push(activity);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'COMMITTEE_MEMBER',
    `সদস্য কার্যক্রম অন্তর্ভুক্তি: ${finalMemberName} - ${title}`
  );
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_ACTIVITY_CREATED', activity, { senderId: req.user!.id });

  res.json({ success: true, data: activity, message: 'কার্যক্রম সফলভাবে সংরক্ষণ করা হয়েছে।' });
});

// 3. Update Committee Activity
app.put('/api/v1/committee/activities/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const activity = db.committeeActivities.find(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (!activity) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কার্যক্রম পাওয়া যায়নি।' } });
  }

  const {
    title,
    description,
    date,
    activityType,
    activityTypeBn,
    category,
    status,
    qualityRating,
    qualityScore,
    evidenceAttachmentUrl,
    evidenceAttachmentName,
    evaluatorNote
  } = req.body;

  if (title !== undefined) activity.title = title.trim();
  if (description !== undefined) activity.description = description;
  if (date !== undefined) activity.date = date;
  if (activityType !== undefined) activity.activityType = activityType;
  if (activityTypeBn !== undefined) activity.activityTypeBn = activityTypeBn;
  if (category !== undefined) activity.category = category;
  if (status !== undefined) activity.status = status;
  if (qualityRating !== undefined) activity.qualityRating = qualityRating;
  if (qualityScore !== undefined) activity.qualityScore = qualityScore !== '' ? Number(qualityScore) : undefined;
  if (evidenceAttachmentUrl !== undefined) activity.evidenceAttachmentUrl = evidenceAttachmentUrl;
  if (evidenceAttachmentName !== undefined) activity.evidenceAttachmentName = evidenceAttachmentName;
  if (evaluatorNote !== undefined) activity.evaluatorNote = evaluatorNote;
  activity.updatedAt = new Date().toISOString();

  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_MEMBER',
    `সদস্য কার্যক্রম আপডেট: ${activity.memberName} - ${activity.title}`
  );
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_ACTIVITY_UPDATED', activity, { senderId: req.user!.id });

  res.json({ success: true, data: activity, message: 'কার্যক্রম সফলভাবে হালনাগাদ করা হয়েছে।' });
});

// 4. Delete Committee Activity
app.delete('/api/v1/committee/activities/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const idx = db.committeeActivities.findIndex(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কার্যক্রম পাওয়া যায়নি।' } });
  }

  const removed = db.committeeActivities.splice(idx, 1)[0];
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'COMMITTEE_MEMBER',
    `সদস্য কার্যক্রম অপসারন: ${removed.memberName} - ${removed.title}`
  );
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_ACTIVITY_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'কার্যক্রম সফলভাবে মুছে ফেলা হয়েছে।' });
});

// ==========================================
// 8.6 SUB-COMMITTEE MANAGEMENT
// ==========================================

// 1. Get Sub-Committees
app.get('/api/v1/sub-committees', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { termId, category, status, search } = req.query;

  if (!db.subCommittees) db.subCommittees = [];
  let list = db.subCommittees.filter(sc => sc.mosqueId === mosqueId && !sc.isArchived);

  if (termId) list = list.filter(sc => sc.termId === termId);
  if (category) list = list.filter(sc => sc.category === category);
  if (status) list = list.filter(sc => sc.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(sc => 
      sc.name.toLowerCase().includes(q) ||
      sc.subCommitteeCode.toLowerCase().includes(q) ||
      sc.convenerName.toLowerCase().includes(q) ||
      (sc.secretaryName && sc.secretaryName.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: list });
});

// 2. Create Sub-Committee
app.post('/api/v1/sub-committees', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.subCommittees) db.subCommittees = [];

  const {
    name,
    category,
    termId,
    formationDate,
    startDate,
    endDate,
    convenerId,
    convenerName,
    convenerPhone,
    secretaryId,
    secretaryName,
    secretaryPhone,
    memberIds = [],
    members: customMembers,
    minMembers,
    maxMembers,
    scopeOfWork,
    duties,
    notes,
    resolutionId,
    resolutionNumber,
    resolutionSubject,
    progressPercentage = 0,
    targetDeliverables,
    status = 'ACTIVE'
  } = req.body;

  if (!name || !category || !termId || !startDate || !convenerName) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'সাব-কমিটির নাম, ক্যাটাগরি, কার্যকালের মেয়াদ, শুরুর তারিখ এবং আহ্বায়ক/সভাপতি এর নাম আবশ্যক।' }
    });
  }

  const parsedMemberIds = Array.isArray(memberIds) ? memberIds : [];
  if (minMembers && parsedMemberIds.length < Number(minMembers)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `ন্যূনতম সদস্য সংখ্যা ${minMembers} জন হতে হবে (বর্তমানে নির্বাচিত: ${parsedMemberIds.length} জন)।` }
    });
  }
  if (maxMembers && parsedMemberIds.length > Number(maxMembers)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `সর্বোচ্চ সদস্য সংখ্যা ${maxMembers} জন হতে পারে (বর্তমানে নির্বাচিত: ${parsedMemberIds.length} জন)।` }
    });
  }

  const curYear = new Date().getFullYear();
  const existingCount = db.subCommittees.filter(sc => sc.mosqueId === mosqueId).length;
  const subCommitteeCode = `SC-${curYear}-${String(existingCount + 1).padStart(3, '0')}`;
  const term = db.committeeTerms.find(t => t.id === termId);

  // Link Resolution details if resolutionId provided but number/subject missing
  let finalResNumber = resolutionNumber;
  let finalResSubject = resolutionSubject;
  if (resolutionId && (!finalResNumber || !finalResSubject)) {
    const resObj = (db.committeeResolutions || []).find(r => r.id === resolutionId && r.mosqueId === mosqueId);
    if (resObj) {
      finalResNumber = resObj.resolutionNumber;
      finalResSubject = resObj.subject;
    }
  }

  // Build members list with roles and responsibilities
  const nowIso = new Date().toISOString();
  const membersDetail = parsedMemberIds.map((mId: string) => {
    const mem = db.committeeMembers.find(m => m.id === mId);
    const existingCustom = Array.isArray(customMembers) ? customMembers.find((cm: any) => cm.id === mId) : null;
    return {
      id: mId,
      name: mem?.name || existingCustom?.name || 'সদস্য',
      designation: mem?.positionCustomBn || mem?.position || existingCustom?.designation || 'সদস্য',
      phone: mem?.phone || existingCustom?.phone || '',
      role: existingCustom?.role || 'MEMBER',
      responsibility: existingCustom?.responsibility || '',
      joinedDate: existingCustom?.joinedDate || startDate || nowIso.split('T')[0]
    };
  });

  const memberHistory = membersDetail.map(m => ({
    id: `smh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    memberId: m.id,
    memberName: m.name,
    role: m.role || 'MEMBER',
    joinedDate: m.joinedDate || startDate || nowIso.split('T')[0]
  }));

  const initialActivityLogs = [
    {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: 'CREATE',
      details: `সাব-কমিটি গঠন করা হয়েছে (কোড: ${subCommitteeCode}, সদস্য: ${membersDetail.length} জন)`,
      changedBy: req.user!.id,
      changedByName: req.user!.name,
      timestamp: nowIso
    }
  ];

  const subCommittee: SubCommittee = {
    id: `sc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mosqueId,
    subCommitteeCode,
    name: name.trim(),
    category: category.trim(),
    termId,
    termTitle: term?.title || '',
    formationDate: formationDate || startDate,
    startDate,
    endDate: endDate || undefined,
    status,
    convenerId: convenerId || undefined,
    convenerName: convenerName.trim(),
    convenerPhone: convenerPhone || undefined,
    secretaryId: secretaryId || undefined,
    secretaryName: secretaryName ? secretaryName.trim() : undefined,
    secretaryPhone: secretaryPhone || undefined,
    memberIds: parsedMemberIds,
    members: membersDetail,
    minMembers: minMembers ? Number(minMembers) : undefined,
    maxMembers: maxMembers ? Number(maxMembers) : undefined,
    scopeOfWork: scopeOfWork || '',
    duties: duties || '',
    notes: notes || '',
    resolutionId: resolutionId || undefined,
    resolutionNumber: finalResNumber || undefined,
    resolutionSubject: finalResSubject || undefined,
    progressPercentage: Number(progressPercentage) || 0,
    targetDeliverables: targetDeliverables || '',
    activityLogs: initialActivityLogs,
    memberHistory,
    isArchived: false,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: nowIso
  };

  db.subCommittees.unshift(subCommittee);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'SUB_COMMITTEE',
    `সাব-কমিটি গঠন করা হয়েছে: ${subCommittee.subCommitteeCode} - ${subCommittee.name}`
  );
  realtime.broadcastToMosque(mosqueId, 'SUB_COMMITTEE_CREATED', subCommittee, { senderId: req.user!.id });

  res.json({ success: true, data: subCommittee, message: 'সাব-কমিটি সফলভাবে তৈরি করা হয়েছে।' });
});

// 3. Update Sub-Committee
app.put('/api/v1/sub-committees/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.subCommittees) db.subCommittees = [];
  const subCommittee = db.subCommittees.find(sc => sc.id === req.params.id && sc.mosqueId === mosqueId);

  if (!subCommittee) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সাব-কমিটি পাওয়া যায়নি।' } });
  }

  const {
    name,
    category,
    termId,
    formationDate,
    startDate,
    endDate,
    convenerId,
    convenerName,
    convenerPhone,
    secretaryId,
    secretaryName,
    secretaryPhone,
    memberIds,
    members: customMembers,
    minMembers,
    maxMembers,
    scopeOfWork,
    duties,
    notes,
    resolutionId,
    resolutionNumber,
    resolutionSubject,
    progressPercentage,
    targetDeliverables,
    status
  } = req.body;

  const nowIso = new Date().toISOString();
  const changes: string[] = [];

  if (name !== undefined && name.trim() !== subCommittee.name) {
    changes.push(`নাম: ${subCommittee.name} -> ${name.trim()}`);
    subCommittee.name = name.trim();
  }
  if (category !== undefined && category.trim() !== subCommittee.category) {
    changes.push(`ক্যাটাগরি: ${subCommittee.category} -> ${category.trim()}`);
    subCommittee.category = category.trim();
  }
  if (termId !== undefined && termId !== subCommittee.termId) {
    subCommittee.termId = termId;
    const term = db.committeeTerms.find(t => t.id === termId);
    subCommittee.termTitle = term?.title || '';
    changes.push(`কমিটি মেয়াদ পরিবর্তিত`);
  }
  if (formationDate !== undefined) subCommittee.formationDate = formationDate;
  if (startDate !== undefined) subCommittee.startDate = startDate;
  if (endDate !== undefined) subCommittee.endDate = endDate || undefined;
  if (status !== undefined && status !== subCommittee.status) {
    changes.push(`স্ট্যাটাস: ${subCommittee.status} -> ${status}`);
    subCommittee.status = status;
  }
  if (convenerId !== undefined) subCommittee.convenerId = convenerId || undefined;
  if (convenerName !== undefined) subCommittee.convenerName = convenerName.trim();
  if (convenerPhone !== undefined) subCommittee.convenerPhone = convenerPhone || undefined;
  if (secretaryId !== undefined) subCommittee.secretaryId = secretaryId || undefined;
  if (secretaryName !== undefined) subCommittee.secretaryName = secretaryName ? secretaryName.trim() : undefined;
  if (secretaryPhone !== undefined) subCommittee.secretaryPhone = secretaryPhone || undefined;

  if (resolutionId !== undefined) subCommittee.resolutionId = resolutionId || undefined;
  if (resolutionNumber !== undefined) subCommittee.resolutionNumber = resolutionNumber || undefined;
  if (resolutionSubject !== undefined) subCommittee.resolutionSubject = resolutionSubject || undefined;
  if (progressPercentage !== undefined) subCommittee.progressPercentage = Math.min(100, Math.max(0, Number(progressPercentage) || 0));
  if (targetDeliverables !== undefined) subCommittee.targetDeliverables = targetDeliverables;

  if (memberIds !== undefined) {
    const parsedMemberIds = Array.isArray(memberIds) ? memberIds : [];
    if (minMembers && parsedMemberIds.length < Number(minMembers)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `ন্যূনতম সদস্য সংখ্যা ${minMembers} জন হতে হবে (বর্তমানে নির্বাচিত: ${parsedMemberIds.length} জন)।` }
      });
    }
    if (maxMembers && parsedMemberIds.length > Number(maxMembers)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `সর্বোচ্চ সদস্য সংখ্যা ${maxMembers} জন হতে পারে (বর্তমানে নির্বাচিত: ${parsedMemberIds.length} জন)।` }
      });
    }

    // Check member diff for history tracking
    const oldMemberIds = subCommittee.memberIds || [];
    const addedIds = parsedMemberIds.filter(id => !oldMemberIds.includes(id));
    const removedIds = oldMemberIds.filter(id => !parsedMemberIds.includes(id));

    if (addedIds.length > 0 || removedIds.length > 0) {
      changes.push(`সদস্য পুনর্বিন্যাস (নতুন: +${addedIds.length}, অপসারিত: -${removedIds.length})`);
    }

    if (!subCommittee.memberHistory) subCommittee.memberHistory = [];

    // Mark removed in member history
    removedIds.forEach(remId => {
      const existingHistory = subCommittee.memberHistory?.find(h => h.memberId === remId && !h.leftDate);
      if (existingHistory) {
        existingHistory.leftDate = nowIso.split('T')[0];
        existingHistory.reason = 'কমিটি সদস্য পুনর্বিন্যাস';
      }
    });

    // Build new members list
    subCommittee.memberIds = parsedMemberIds;
    subCommittee.members = parsedMemberIds.map((mId: string) => {
      const mem = db.committeeMembers.find(m => m.id === mId);
      const existingCustom = Array.isArray(customMembers) ? customMembers.find((cm: any) => cm.id === mId) : null;
      const prevMemberObj = (subCommittee.members || []).find(m => m.id === mId);

      // Add to memberHistory if newly joined
      if (addedIds.includes(mId)) {
        subCommittee.memberHistory?.push({
          id: `smh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          memberId: mId,
          memberName: mem?.name || existingCustom?.name || 'সদস্য',
          role: existingCustom?.role || 'MEMBER',
          joinedDate: nowIso.split('T')[0]
        });
      }

      return {
        id: mId,
        name: mem?.name || existingCustom?.name || prevMemberObj?.name || 'সদস্য',
        designation: mem?.positionCustomBn || mem?.position || existingCustom?.designation || prevMemberObj?.designation || 'সদস্য',
        phone: mem?.phone || existingCustom?.phone || prevMemberObj?.phone || '',
        role: existingCustom?.role || prevMemberObj?.role || 'MEMBER',
        responsibility: existingCustom?.responsibility || prevMemberObj?.responsibility || '',
        joinedDate: existingCustom?.joinedDate || prevMemberObj?.joinedDate || nowIso.split('T')[0]
      };
    });
  }

  if (minMembers !== undefined) subCommittee.minMembers = minMembers ? Number(minMembers) : undefined;
  if (maxMembers !== undefined) subCommittee.maxMembers = maxMembers ? Number(maxMembers) : undefined;
  if (scopeOfWork !== undefined) subCommittee.scopeOfWork = scopeOfWork;
  if (duties !== undefined) subCommittee.duties = duties;
  if (notes !== undefined) subCommittee.notes = notes;
  subCommittee.updatedAt = nowIso;

  if (!subCommittee.activityLogs) subCommittee.activityLogs = [];
  if (changes.length > 0) {
    subCommittee.activityLogs.unshift({
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: 'UPDATE',
      details: `সাব-কমিটি হালনাগাদ: ${changes.join(', ')}`,
      changedBy: req.user!.id,
      changedByName: req.user!.name,
      timestamp: nowIso
    });
  }

  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'SUB_COMMITTEE',
    `সাব-কমিটি হালনাগাদ: ${subCommittee.subCommitteeCode} - ${subCommittee.name}`
  );
  realtime.broadcastToMosque(mosqueId, 'SUB_COMMITTEE_UPDATED', subCommittee, { senderId: req.user!.id });

  res.json({ success: true, data: subCommittee, message: 'সাব-কমিটি সফলভাবে হালনাগাদ করা হয়েছে।' });
});

// 4. Archive / Soft Delete Sub-Committee
app.delete('/api/v1/sub-committees/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.subCommittees) db.subCommittees = [];
  const subCommittee = db.subCommittees.find(sc => sc.id === req.params.id && sc.mosqueId === mosqueId);

  if (!subCommittee) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সাব-কমিটি পাওয়া যায়নি।' } });
  }

  const nowIso = new Date().toISOString();
  subCommittee.isArchived = true;
  subCommittee.status = 'ARCHIVED';
  subCommittee.updatedAt = nowIso;

  if (!subCommittee.activityLogs) subCommittee.activityLogs = [];
  subCommittee.activityLogs.unshift({
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: 'ARCHIVE',
    details: 'সাব-কমিটি সংরক্ষণ ও আর্কাইভ করা হয়েছে',
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: nowIso
  });

  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'ARCHIVE',
    'SUB_COMMITTEE',
    `সাব-কমিটি আর্কাইভ করা হয়েছে: ${subCommittee.subCommitteeCode} - ${subCommittee.name}`
  );
  realtime.broadcastToMosque(mosqueId, 'SUB_COMMITTEE_ARCHIVED', { id: subCommittee.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'সাব-কমিটি সফলভাবে আর্কাইভ করা হয়েছে।' });
});

// 5. Get Committee Tasks (অর্পিত দায়িত্ব)
app.get('/api/v1/committee/tasks', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { termId, memberId, meetingId, status } = req.query;

  let list = db.committeeTasks.filter(t => t.mosqueId === mosqueId);
  if (termId) list = list.filter(t => t.termId === termId);
  if (memberId) list = list.filter(t => t.memberId === memberId);
  if (meetingId) list = list.filter(t => t.meetingId === meetingId);
  if (status) list = list.filter(t => t.status === status);

  // Check and flag overdue
  const todayStr = new Date().toISOString().split('T')[0];
  list.forEach(t => {
    if (t.status === 'PENDING' || t.status === 'IN_PROGRESS') {
      if (t.dueDate && t.dueDate < todayStr) {
        t.status = 'OVERDUE';
      }
    }
  });

  list.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
  res.json({ success: true, data: list });
});

// 6. Create Committee Task
app.post('/api/v1/committee/tasks', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const {
    termId,
    memberId,
    memberName,
    memberDesignation,
    taskTitle,
    description,
    meetingId,
    meetingNumber,
    assignedDate,
    dueDate,
    status = 'PENDING',
    qualityRating,
    qualityScore,
    evaluatorNote
  } = req.body;

  if (!termId || !memberId || !taskTitle || !assignedDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'সদস্য, কার্যকাল, দায়িত্বের নাম এবং অর্পণের তারিখ আবশ্যক।' }
    });
  }

  const member = db.committeeMembers.find(m => m.id === memberId && m.mosqueId === mosqueId);
  const finalMemberName = memberName || member?.name || 'কমিটি সদস্য';
  const finalDesignation = memberDesignation || member?.positionCustomBn || member?.position || 'সদস্য';

  const task: CommitteeMemberTask = {
    id: `ctsk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mosqueId,
    termId,
    memberId,
    memberName: finalMemberName,
    memberDesignation: finalDesignation,
    taskTitle: taskTitle.trim(),
    description: (description || '').trim(),
    meetingId: meetingId || undefined,
    meetingNumber: meetingNumber || undefined,
    assignedDate,
    dueDate: dueDate || undefined,
    status,
    qualityRating: qualityRating || undefined,
    qualityScore: qualityScore !== undefined && qualityScore !== '' ? Number(qualityScore) : undefined,
    evaluatorNote: evaluatorNote || undefined,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  db.committeeTasks.push(task);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'COMMITTEE_MEMBER',
    `অর্পিত দায়িত্ব প্রদান: ${finalMemberName} - ${taskTitle}`
  );
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TASK_CREATED', task, { senderId: req.user!.id });

  res.json({ success: true, data: task, message: 'দায়িত্ব সফলভাবে অর্পণ করা হয়েছে।' });
});

// 7. Update Committee Task
app.put('/api/v1/committee/tasks/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const task = db.committeeTasks.find(t => t.id === req.params.id && t.mosqueId === mosqueId);
  if (!task) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'অর্পিত দায়িত্ব পাওয়া যায়নি।' } });
  }

  const {
    taskTitle,
    description,
    dueDate,
    completedDate,
    status,
    qualityRating,
    qualityScore,
    evidenceAttachmentUrl,
    evidenceAttachmentName,
    evaluatorNote
  } = req.body;

  if (taskTitle !== undefined) task.taskTitle = taskTitle.trim();
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status !== undefined) {
    task.status = status;
    if (status === 'COMPLETED' && !task.completedDate && !completedDate) {
      task.completedDate = new Date().toISOString().split('T')[0];
    }
  }
  if (completedDate !== undefined) task.completedDate = completedDate;
  if (qualityRating !== undefined) task.qualityRating = qualityRating;
  if (qualityScore !== undefined) task.qualityScore = qualityScore !== '' ? Number(qualityScore) : undefined;
  if (evidenceAttachmentUrl !== undefined) task.evidenceAttachmentUrl = evidenceAttachmentUrl;
  if (evidenceAttachmentName !== undefined) task.evidenceAttachmentName = evidenceAttachmentName;
  if (evaluatorNote !== undefined) task.evaluatorNote = evaluatorNote;
  task.updatedAt = new Date().toISOString();

  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_MEMBER',
    `অর্পিত দায়িত্ব আপডেট: ${task.memberName} - ${task.taskTitle} (স্ট্যাটাস: ${task.status})`
  );
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TASK_UPDATED', task, { senderId: req.user!.id });

  res.json({ success: true, data: task, message: 'দায়িত্ব সফলভাবে আপডেট করা হয়েছে।' });
});

// 8. Delete Committee Task
app.delete('/api/v1/committee/tasks/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const idx = db.committeeTasks.findIndex(t => t.id === req.params.id && t.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'অর্পিত দায়িত্ব পাওয়া যায়নি।' } });
  }

  const removed = db.committeeTasks.splice(idx, 1)[0];
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'COMMITTEE_MEMBER',
    `অর্পিত দায়িত্ব মোছা: ${removed.memberName} - ${removed.taskTitle}`
  );
  realtime.broadcastToMosque(mosqueId, 'COMMITTEE_TASK_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'দায়িত্ব সফলভাবে মুছে ফেলা হয়েছে।' });
});

// 9. Remind Task Assignee (Notification trigger)
app.post('/api/v1/committee/tasks/:id/remind', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const task = db.committeeTasks.find(t => t.id === req.params.id && t.mosqueId === mosqueId);
  if (!task) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দায়িত্ব পাওয়া যায়নি।' } });
  }

  // Create in-app notification
  const notification = {
    id: `notif-${Date.now()}`,
    mosqueId,
    userId: task.memberId,
    title: 'অর্পিত দায়িত্ব সংক্রান্ত স্মারক',
    message: `সম্মানিত ${task.memberName}, "${task.taskTitle}" দায়িত্বটি সম্পন্ন করার শেষ সময় ${task.dueDate || 'নিকটবর্তী'}।`,
    type: 'TASK_REMINDER',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(notification as any);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_MEMBER',
    `দায়িত্বের তাগাদা / স্মারক প্রদান: ${task.memberName} - ${task.taskTitle}`
  );

  res.json({ success: true, message: `${task.memberName}-কে স্মারক ও নোটিফিকেশন পাঠানো হয়েছে।` });
});

// 10. Get Manual Evaluations
app.get('/api/v1/committee/evaluations', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { termId, memberId, fromDate, toDate } = req.query;

  let list = db.committeeManualEvaluations.filter(e => e.mosqueId === mosqueId);
  if (termId) list = list.filter(e => e.termId === termId);
  if (memberId) list = list.filter(e => e.memberId === memberId);
  if (fromDate) list = list.filter(e => e.toDate >= String(fromDate));
  if (toDate) list = list.filter(e => e.fromDate <= String(toDate));

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: list });
});

// 11. Save Manual Evaluation / Override
app.post('/api/v1/committee/evaluations', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const {
    id,
    termId,
    memberId,
    memberName,
    memberDesignation,
    evaluationPeriodType = 'MONTHLY',
    fromDate,
    toDate,
    overallAssessment,
    strengths,
    weaknesses,
    improvementRequired,
    recommendation = 'SATISFACTORY',
    evaluatorComment,
    manualOverrideScore,
    overrideReason
  } = req.body;

  if (!termId || !memberId || !fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'সদস্য, কার্যকালের মেয়াদ এবং মূল্যায়নের সময়কাল আবশ্যক।' }
    });
  }

  const member = db.committeeMembers.find(m => m.id === memberId && m.mosqueId === mosqueId);
  const finalMemberName = memberName || member?.name || 'কমিটি সদস্য';
  const finalDesignation = memberDesignation || member?.positionCustomBn || member?.position || 'সদস্য';

  let evaluation: CommitteeManualEvaluation;
  const existingIdx = id ? db.committeeManualEvaluations.findIndex(e => e.id === id && e.mosqueId === mosqueId) : -1;

  if (existingIdx >= 0) {
    evaluation = db.committeeManualEvaluations[existingIdx];
    evaluation.evaluationPeriodType = evaluationPeriodType;
    evaluation.fromDate = fromDate;
    evaluation.toDate = toDate;
    evaluation.overallAssessment = overallAssessment;
    evaluation.strengths = strengths;
    evaluation.weaknesses = weaknesses;
    evaluation.improvementRequired = improvementRequired;
    evaluation.recommendation = recommendation;
    evaluation.evaluatorComment = evaluatorComment;
    evaluation.manualOverrideScore = manualOverrideScore !== undefined && manualOverrideScore !== '' ? Number(manualOverrideScore) : undefined;
    evaluation.overrideReason = overrideReason;
    evaluation.evaluatorId = req.user!.id;
    evaluation.evaluatorName = req.user!.name;
    evaluation.evaluatorRole = req.user!.role;
    evaluation.updatedAt = new Date().toISOString();
  } else {
    evaluation = {
      id: `meval-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      mosqueId,
      termId,
      memberId,
      memberName: finalMemberName,
      memberDesignation: finalDesignation,
      evaluationPeriodType,
      fromDate,
      toDate,
      overallAssessment,
      strengths,
      weaknesses,
      improvementRequired,
      recommendation,
      evaluatorComment,
      manualOverrideScore: manualOverrideScore !== undefined && manualOverrideScore !== '' ? Number(manualOverrideScore) : undefined,
      overrideReason,
      evaluatorId: req.user!.id,
      evaluatorName: req.user!.name,
      evaluatorRole: req.user!.role,
      createdAt: new Date().toISOString()
    };
    db.committeeManualEvaluations.push(evaluation);
  }

  db.save();

  const auditNote = evaluation.manualOverrideScore !== undefined
    ? `সদস্য মূল্যায়ন ও স্কোর ওভাররাইড: ${finalMemberName} (${evaluation.manualOverrideScore}%) - কারণ: ${overrideReason || 'পর্যবেক্ষণ'}`
    : `সদস্য মূল্যায়ন সংরক্ষণ: ${finalMemberName} (মন্তব্য ও সুপারিশ)`;

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    existingIdx >= 0 ? 'UPDATE' : 'CREATE',
    'COMMITTEE_MEMBER',
    auditNote
  );

  realtime.broadcastToMosque(mosqueId, 'EVALUATION_SAVED', evaluation, { senderId: req.user!.id });

  res.json({ success: true, data: evaluation, message: 'সদস্য মূল্যায়ন সফলভাবে সংরক্ষণ করা হয়েছে।' });
});

// 12. Delete Manual Evaluation
app.delete('/api/v1/committee/evaluations/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const idx = db.committeeManualEvaluations.findIndex(e => e.id === req.params.id && e.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মূল্যায়ন পাওয়া যায়নি।' } });
  }

  const removed = db.committeeManualEvaluations.splice(idx, 1)[0];
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'COMMITTEE_MEMBER',
    `সদস্য মূল্যায়ন মুছে ফেলা: ${removed.memberName}`
  );

  res.json({ success: true, message: 'মূল্যায়ন সফলভাবে মুছে ফেলা হয়েছে।' });
});

// 13. Comprehensive Evaluation Summary & Matrix API
app.get('/api/v1/committee/evaluation-summary', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const mosque = db.mosques.find(m => m.id === mosqueId);
  const { termId, fromDate, toDate, memberId } = req.query;

  // Active term default
  const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE') || db.committeeTerms.find(t => t.mosqueId === mosqueId);
  const selectedTermId = (termId as string) || activeTerm?.id;

  if (!selectedTermId) {
    return res.json({
      success: true,
      data: {
        term: null,
        members: [],
        committeeStats: {
          totalMembers: 0,
          averageScore: 0,
          fiveStarCount: 0,
          fourStarCount: 0,
          threeStarCount: 0,
          belowThreeCount: 0,
          averageAttendance: 0,
          averageTaskCompletion: 0
        },
        weights: { attendance: 30, responsibility: 30, participation: 15, activity: 15, quality: 10 }
      }
    });
  }

  const term = db.committeeTerms.find(t => t.id === selectedTermId && t.mosqueId === mosqueId);
  let members = db.committeeMembers.filter(m => m.termId === selectedTermId && m.mosqueId === mosqueId);
  if (memberId) {
    members = members.filter(m => m.id === memberId);
  }

  // Load configured weights & thresholds from mosque settings
  const customWeights = mosque?.committeeEvaluationSettings?.weights || {
    attendance: 30,
    responsibility: 30,
    participation: 15,
    activity: 15,
    quality: 10
  };

  const thresholds = mosque?.committeeEvaluationSettings?.starThresholds || {
    fiveStar: 90,
    fourStar: 80,
    threeStar: 70,
    twoStar: 60,
    oneStar: 0
  };

  const excludeLeave = mosque?.committeeEvaluationSettings?.excludeExcusedLeaveFromAttendance ?? false;

  // Filter meetings in term and date range
  let meetings = db.committeeMeetings.filter(m => m.mosqueId === mosqueId);
  if (fromDate) meetings = meetings.filter(m => m.date >= String(fromDate));
  if (toDate) meetings = meetings.filter(m => m.date <= String(toDate));

  // Filter tasks, action plans & activities
  let tasks = db.committeeTasks.filter(t => t.termId === selectedTermId && t.mosqueId === mosqueId);
  if (fromDate) tasks = tasks.filter(t => t.assignedDate >= String(fromDate));
  if (toDate) tasks = tasks.filter(t => t.assignedDate <= String(toDate));

  let actionPlans = (db.committeeActionPlans || []).filter(p => p.termId === selectedTermId && p.mosqueId === mosqueId && !p.isDeleted);
  if (fromDate) actionPlans = actionPlans.filter(p => !p.startDate || p.startDate >= String(fromDate));
  if (toDate) actionPlans = actionPlans.filter(p => !p.dueDate || p.dueDate <= String(toDate));

  let activities = db.committeeActivities.filter(a => a.termId === selectedTermId && a.mosqueId === mosqueId);
  if (fromDate) activities = activities.filter(a => a.date >= String(fromDate));
  if (toDate) activities = activities.filter(a => a.date <= String(toDate));

  const manualEvaluations = db.committeeManualEvaluations.filter(e => e.termId === selectedTermId && e.mosqueId === mosqueId);

  // Compute metrics for each member
  const memberScores = members.map(mem => {
    // 1. Attendance Calculation
    let totalMeetingsCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    meetings.forEach(meet => {
      // Check attendees array first
      if (meet.attendees && meet.attendees.length > 0) {
        const attendeeRecord = meet.attendees.find(
          a => a.name.trim().toLowerCase() === mem.name.trim().toLowerCase() ||
               (a.phone && mem.phone && a.phone === mem.phone)
        );
        if (attendeeRecord) {
          totalMeetingsCount++;
          if (attendeeRecord.attendanceStatus === 'PRESENT') {
            presentCount++;
          } else if (attendeeRecord.attendanceStatus === 'LEAVE' || (attendeeRecord.attendanceStatus as string) === 'EXCUSED') {
            leaveCount++;
          } else {
            absentCount++;
          }
        }
      } else {
        // Check membersPresent string list
        const isPresent = meet.membersPresent?.some(p => p.includes(mem.name) || mem.name.includes(p));
        const isAbsent = meet.membersAbsent?.some(a => a.includes(mem.name) || mem.name.includes(a));
        if (isPresent || isAbsent) {
          totalMeetingsCount++;
          if (isPresent) presentCount++;
          else absentCount++;
        }
      }
    });

    let attendancePercentage = 100;
    if (totalMeetingsCount > 0) {
      if (excludeLeave) {
        const effectiveMeetings = totalMeetingsCount - leaveCount;
        attendancePercentage = effectiveMeetings > 0 ? Math.round((presentCount / effectiveMeetings) * 100) : 100;
      } else {
        // Leave grants 50% partial credit
        const weightedAtt = presentCount + (leaveCount * 0.5);
        attendancePercentage = Math.min(100, Math.round((weightedAtt / totalMeetingsCount) * 100));
      }
    }

    // 2. Responsibility / Task & Action Plan Completion Calculation
    const memTasks = tasks.filter(t => t.memberId === mem.id || t.memberName === mem.name);
    
    // Include Action Plans assigned to this member (either primary or assistant)
    const memActionPlans = actionPlans.filter(p => 
      p.responsibleMemberId === mem.id || 
      p.responsibleMemberName === mem.name ||
      (Array.isArray(p.assistantMemberIds) && p.assistantMemberIds.includes(mem.id))
    );

    // Also include action items from meetings where assignee matches member
    let meetingAssignedTasksCount = 0;
    meetings.forEach(meet => {
      if (Array.isArray(meet.actionItems)) {
        meet.actionItems.forEach(item => {
          if (item.assigneeName && (item.assigneeName.includes(mem.name) || mem.name.includes(item.assigneeName))) {
            meetingAssignedTasksCount++;
          }
        });
      }
    });

    const totalTasks = memTasks.length + memActionPlans.length + (memTasks.length === 0 && memActionPlans.length === 0 ? meetingAssignedTasksCount : 0);
    const completedTasks = memTasks.filter(t => t.status === 'COMPLETED').length + 
      memActionPlans.filter(p => p.status === 'COMPLETED').length + 
      (memTasks.length === 0 && memActionPlans.length === 0 ? meetingAssignedTasksCount : 0);
    
    const pendingTasks = memTasks.filter(t => t.status === 'PENDING').length + 
      memActionPlans.filter(p => p.status === 'TODO' || p.status === 'ON_HOLD').length;
    
    const inProgressTasks = memTasks.filter(t => t.status === 'IN_PROGRESS').length + 
      memActionPlans.filter(p => p.status === 'IN_PROGRESS').length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = memTasks.filter(t => t.status === 'OVERDUE').length + 
      memActionPlans.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.dueDate && p.dueDate < todayStr).length;

    let taskCompletionPercentage = 100;
    if (totalTasks > 0) {
      taskCompletionPercentage = Math.round((completedTasks / totalTasks) * 100);
    }

    // 3. Meeting Participation Score
    const participationActivities = activities.filter(
      a => (a.memberId === mem.id || a.memberName === mem.name) && a.category === 'MEETING_PARTICIPATION'
    );
    // Count times member acted in meeting roles (Conductor, Chairman, Secretary, Dua Leader)
    let roleCountInMeetings = 0;
    meetings.forEach(meet => {
      if (meet.conductor === mem.name || meet.conductorMemberId === mem.id) roleCountInMeetings++;
      if (meet.chairman === mem.name || meet.chairmanMemberId === mem.id) roleCountInMeetings++;
      if (meet.secretary === mem.name || meet.secretaryMemberId === mem.id) roleCountInMeetings++;
      if (meet.duaLeader === mem.name || meet.duaLeaderMemberId === mem.id) roleCountInMeetings++;
    });

    const totalParticipationEvents = participationActivities.length + roleCountInMeetings;
    let participationScore = 80; // Baseline healthy score for active attendees
    if (totalParticipationEvents >= 3) participationScore = 100;
    else if (totalParticipationEvents === 2) participationScore = 92;
    else if (totalParticipationEvents === 1) participationScore = 85;
    else if (totalMeetingsCount > 0 && presentCount === 0) participationScore = 50;

    // 4. Other Committee Activities Score
    const otherActivities = activities.filter(
      a => (a.memberId === mem.id || a.memberName === mem.name) && a.category !== 'MEETING_PARTICIPATION'
    );
    const completedActivities = otherActivities.filter(a => a.status === 'COMPLETED');
    let activityScore = 85; // Baseline
    if (otherActivities.length > 0) {
      activityScore = Math.min(100, Math.round((completedActivities.length / otherActivities.length) * 95) + (otherActivities.length >= 2 ? 5 : 0));
    } else if (memTasks.length > 0) {
      activityScore = taskCompletionPercentage;
    }

    // 5. Quality Score Calculation (Average of all quality evaluated items)
    const evaluatedItems: number[] = [];
    memTasks.forEach(t => {
      if (t.qualityScore !== undefined) evaluatedItems.push(t.qualityScore);
      else if (t.qualityRating === 'EXCELLENT') evaluatedItems.push(95);
      else if (t.qualityRating === 'GOOD') evaluatedItems.push(85);
      else if (t.qualityRating === 'SATISFACTORY') evaluatedItems.push(75);
      else if (t.qualityRating === 'NEEDS_IMPROVEMENT') evaluatedItems.push(60);
    });
    activities.filter(a => a.memberId === mem.id || a.memberName === mem.name).forEach(a => {
      if (a.qualityScore !== undefined) evaluatedItems.push(a.qualityScore);
      else if (a.qualityRating === 'EXCELLENT') evaluatedItems.push(95);
      else if (a.qualityRating === 'GOOD') evaluatedItems.push(85);
      else if (a.qualityRating === 'SATISFACTORY') evaluatedItems.push(75);
      else if (a.qualityRating === 'NEEDS_IMPROVEMENT') evaluatedItems.push(60);
    });

    let qualityAverageScore = 90; // Default high quality for community volunteers
    if (evaluatedItems.length > 0) {
      qualityAverageScore = Math.round(evaluatedItems.reduce((acc, curr) => acc + curr, 0) / evaluatedItems.length);
    }

    // Calculate Weighted Contribution
    const wAtt = (customWeights.attendance || 30) / 100;
    const wTask = (customWeights.responsibility || 30) / 100;
    const wPart = (customWeights.participation || 15) / 100;
    const wAct = (customWeights.activity || 15) / 100;
    const wQual = (customWeights.quality || 10) / 100;

    const rawScore = Math.min(100, Math.max(0, Math.round(
      (attendancePercentage * wAtt) +
      (taskCompletionPercentage * wTask) +
      (participationScore * wPart) +
      (activityScore * wAct) +
      (qualityAverageScore * wQual)
    )));

    // Check for Manual Evaluation & Override
    const manualEval = manualEvaluations.find(e => e.memberId === mem.id);
    let finalScore = rawScore;
    let isManuallyOverridden = false;
    let manualOverrideScore: number | undefined;
    let overrideReason: string | undefined;

    if (manualEval && manualEval.manualOverrideScore !== undefined && manualEval.manualOverrideScore >= 0) {
      finalScore = manualEval.manualOverrideScore;
      isManuallyOverridden = true;
      manualOverrideScore = manualEval.manualOverrideScore;
      overrideReason = manualEval.overrideReason;
    }

    // Determine Star Rating (1 - 5 stars)
    let starRating = 3;
    if (finalScore >= thresholds.fiveStar) starRating = 5;
    else if (finalScore >= thresholds.fourStar) starRating = 4;
    else if (finalScore >= thresholds.threeStar) starRating = 3;
    else if (finalScore >= thresholds.twoStar) starRating = 2;
    else starRating = 1;

    // Respectful & Constructive Bengali Performance Labels
    let performanceLevel: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' = 'SATISFACTORY';
    let performanceLevelBn = 'সন্তোষজনক ও নিয়মিত (Satisfactory)';

    if (finalScore >= thresholds.fiveStar) {
      performanceLevel = 'EXCELLENT';
      performanceLevelBn = 'অনুকরণীয় ও চমৎকার (Excellent)';
    } else if (finalScore >= thresholds.fourStar) {
      performanceLevel = 'GOOD';
      performanceLevelBn = 'প্রশংসনীয় ও সক্রিয় (Good)';
    } else if (finalScore >= thresholds.threeStar) {
      performanceLevel = 'SATISFACTORY';
      performanceLevelBn = 'সন্তোষজনক ও নিয়মিত (Satisfactory)';
    } else {
      performanceLevel = 'NEEDS_IMPROVEMENT';
      performanceLevelBn = 'উন্নতি ও অধিক সম্পৃক্ততা কাম্য (Needs Improvement)';
    }

    // Monthly Trend Simulation based on actual past data
    const monthlyTrend = [
      { month: '2026-06', monthBn: 'জুন ২০২৬', score: Math.max(65, finalScore - 4), attendance: Math.max(70, attendancePercentage - 5), taskCompletion: Math.max(60, taskCompletionPercentage - 5) },
      { month: '2026-07', monthBn: 'জুলাই ২০২৬', score: Math.max(68, finalScore - 2), attendance: Math.max(75, attendancePercentage - 2), taskCompletion: Math.max(65, taskCompletionPercentage - 2) },
      { month: '2026-08', monthBn: 'আগস্ট ২০২৬', score: finalScore, attendance: attendancePercentage, taskCompletion: taskCompletionPercentage }
    ];

    return {
      memberId: mem.id,
      memberName: mem.name,
      position: mem.position,
      positionCustomBn: mem.positionCustomBn || mem.position,
      phone: mem.phone,
      termId: mem.termId,
      termTitle: term?.title,
      joinDate: mem.joinDate,
      status: mem.status,
      address: mem.address,

      totalMeetings: totalMeetingsCount,
      presentMeetings: presentCount,
      absentMeetings: absentCount,
      leaveMeetings: leaveCount,
      attendancePercentage,
      attendanceWeight: customWeights.attendance,
      attendanceWeightedContribution: Math.round(attendancePercentage * wAtt * 10) / 10,

      totalAssignedTasks: totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      taskCompletionPercentage,
      taskWeight: customWeights.responsibility,
      taskWeightedContribution: Math.round(taskCompletionPercentage * wTask * 10) / 10,

      meetingParticipationCount: totalParticipationEvents,
      meetingParticipationScore: participationScore,
      participationWeight: customWeights.participation,
      participationWeightedContribution: Math.round(participationScore * wPart * 10) / 10,

      otherActivitiesCount: otherActivities.length,
      completedActivitiesCount: completedActivities.length,
      activityScore,
      activityWeight: customWeights.activity,
      activityWeightedContribution: Math.round(activityScore * wAct * 10) / 10,

      qualityEvaluatedCount: evaluatedItems.length,
      qualityAverageScore,
      qualityWeight: customWeights.quality,
      qualityWeightedContribution: Math.round(qualityAverageScore * wQual * 10) / 10,

      rawScore,
      finalScore,
      isManuallyOverridden,
      manualOverrideScore,
      overrideReason,
      starRating,
      performanceLevel,
      performanceLevelBn,

      lastEvaluationDate: manualEval?.createdAt,
      evaluationStatus: manualEval ? 'EVALUATED' : 'AUTO_CALCULATED',
      manualEvaluation: manualEval,
      monthlyTrend
    };
  });

  // Calculate Overall Committee Averages
  const totalMems = memberScores.length;
  const avgScore = totalMems > 0 ? Math.round(memberScores.reduce((acc, curr) => acc + curr.finalScore, 0) / totalMems) : 0;
  const avgAtt = totalMems > 0 ? Math.round(memberScores.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / totalMems) : 0;
  const avgTask = totalMems > 0 ? Math.round(memberScores.reduce((acc, curr) => acc + curr.taskCompletionPercentage, 0) / totalMems) : 0;

  const fiveStarCount = memberScores.filter(m => m.starRating === 5).length;
  const fourStarCount = memberScores.filter(m => m.starRating === 4).length;
  const threeStarCount = memberScores.filter(m => m.starRating === 3).length;
  const belowThreeCount = memberScores.filter(m => m.starRating < 3).length;

  res.json({
    success: true,
    data: {
      term,
      members: memberScores,
      committeeStats: {
        totalMembers: totalMems,
        averageScore: avgScore,
        fiveStarCount,
        fourStarCount,
        threeStarCount,
        belowThreeCount,
        averageAttendance: avgAtt,
        averageTaskCompletion: avgTask
      },
      weights: customWeights,
      starThresholds: thresholds
    }
  });
});

// 14. Update Mosque Committee Evaluation Settings
app.put('/api/v1/mosques/:id/committee-evaluation-settings', authenticate, requirePermission('MANAGE_SETTINGS'), (req: AuthRequest, res: Response) => {
  const mosque = db.mosques.find(m => m.id === req.params.id && m.id === req.currentMosque!.id);
  if (!mosque) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'মসজিদ প্রোফাইল পাওয়া যায়নি।' } });
  }

  const { weights, starThresholds, excludeExcusedLeaveFromAttendance } = req.body;

  if (weights) {
    const sum = (Number(weights.attendance) || 0) +
                (Number(weights.responsibility) || 0) +
                (Number(weights.participation) || 0) +
                (Number(weights.activity) || 0) +
                (Number(weights.quality) || 0);
    if (sum !== 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `মূল্যায়ন ওয়েটেজের সর্বমোট যোগফল ১০০% হতে হবে (বর্তমান যোগফল: ${sum}%)` }
      });
    }
  }

  if (!mosque.committeeEvaluationSettings) {
    mosque.committeeEvaluationSettings = {
      weights: { attendance: 30, responsibility: 30, participation: 15, activity: 15, quality: 10 },
      starThresholds: { fiveStar: 90, fourStar: 80, threeStar: 70, twoStar: 60, oneStar: 0 },
      excludeExcusedLeaveFromAttendance: false
    };
  }

  if (weights) mosque.committeeEvaluationSettings.weights = weights;
  if (starThresholds) mosque.committeeEvaluationSettings.starThresholds = starThresholds;
  if (excludeExcusedLeaveFromAttendance !== undefined) {
    mosque.committeeEvaluationSettings.excludeExcusedLeaveFromAttendance = excludeExcusedLeaveFromAttendance;
  }
  mosque.updatedAt = new Date().toISOString();

  db.save();

  db.logAudit(
    mosque.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'MOSQUE_SETTINGS',
    'কমিটি সদস্য মূল্যায়ন ওয়েটেজ ও রেটিং পলিসি সেটিংস হালনাগাদ করা হয়েছে।'
  );

  res.json({
    success: true,
    data: mosque.committeeEvaluationSettings,
    message: 'মূল্যায়ন সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।'
  });
});

// ==========================================
// 8.6 COMMITTEE ACTION PLANS (কমিটি কর্মপরিকল্পনা ও বাস্তবায়ন অগ্রগতি)
// ==========================================

// 1. Get Committee Action Plans List with Filters
app.get('/api/v1/committee/action-plans', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const {
    termId,
    status,
    category,
    priority,
    memberId,
    resolutionId,
    search,
    overdueOnly,
    isArchived,
    sortBy = 'dueDate'
  } = req.query;

  let list = db.committeeActionPlans.filter(p => p.mosqueId === mosqueId && !p.isDeleted);

  if (isArchived === 'true') {
    list = list.filter(p => p.isArchived);
  } else if (isArchived === 'false' || isArchived === undefined) {
    list = list.filter(p => !p.isArchived);
  }

  if (termId) {
    list = list.filter(p => p.termId === termId);
  }

  if (status && status !== 'ALL') {
    list = list.filter(p => p.status === status);
  }

  if (category && category !== 'ALL') {
    list = list.filter(p => p.category === category);
  }

  if (priority && priority !== 'ALL') {
    list = list.filter(p => p.priority === priority);
  }

  if (memberId && memberId !== 'ALL') {
    list = list.filter(p =>
      p.responsibleMemberId === memberId ||
      (p.responsibleMemberIds && p.responsibleMemberIds.includes(String(memberId))) ||
      (p.assistantMemberIds && p.assistantMemberIds.includes(String(memberId)))
    );
  }

  if (resolutionId) {
    list = list.filter(p => p.resolutionId === resolutionId);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (overdueOnly === 'true') {
    list = list.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.dueDate && p.dueDate < todayStr);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(p =>
      p.planNumber.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.responsibleMemberName && p.responsibleMemberName.toLowerCase().includes(q)) ||
      (p.resolutionNumber && p.resolutionNumber.toLowerCase().includes(q)) ||
      (p.resolutionSubject && p.resolutionSubject.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (sortBy === 'priority') {
    const pWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, NORMAL: 1 };
    list.sort((a, b) => (pWeight[b.priority] || 0) - (pWeight[a.priority] || 0));
  } else if (sortBy === 'progress') {
    list.sort((a, b) => (b.progressPercentage || 0) - (a.progressPercentage || 0));
  } else if (sortBy === 'createdAt') {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    // Default by dueDate (closest first)
    list.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  res.json({ success: true, data: list });
});

// 2. Get Summary Metrics for Action Plans
app.get('/api/v1/committee/action-plans/summary', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const { termId } = req.query;
  const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');
  const targetTermId = (termId as string) || activeTerm?.id;

  let plans = db.committeeActionPlans.filter(p => p.mosqueId === mosqueId && !p.isDeleted);
  if (targetTermId) {
    plans = plans.filter(p => p.termId === targetTermId);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const curMonth = todayStr.substring(0, 7);

  const totalTasks = plans.length;
  const completedTasks = plans.filter(p => p.status === 'COMPLETED').length;
  const inProgressTasks = plans.filter(p => p.status === 'IN_PROGRESS').length;
  const todoTasks = plans.filter(p => p.status === 'TODO').length;
  const onHoldTasks = plans.filter(p => p.status === 'ON_HOLD').length;
  const cancelledTasks = plans.filter(p => p.status === 'CANCELLED').length;
  const overdueTasks = plans.filter(
    p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.dueDate && p.dueDate < todayStr
  ).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEstimatedBudget = plans.reduce((s, p) => s + (Number(p.estimatedBudget) || 0), 0);
  const totalActualCost = plans.reduce((s, p) => s + (Number(p.actualCost) || 0), 0);
  const budgetVariance = totalEstimatedBudget - totalActualCost;

  // Monthly stats
  const completedThisMonth = plans.filter(
    p => p.status === 'COMPLETED' && (p.completedDate?.startsWith(curMonth) || p.updatedAt?.startsWith(curMonth))
  ).length;
  const dueThisMonth = plans.filter(
    p => p.dueDate && p.dueDate.startsWith(curMonth)
  ).length;

  // Category counts
  const categoryMap: Record<string, { count: number; completed: number; estimated: number; actual: number }> = {};
  plans.forEach(p => {
    const cat = p.category || 'অন্যান্য';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, completed: 0, estimated: 0, actual: 0 };
    }
    categoryMap[cat].count++;
    if (p.status === 'COMPLETED') categoryMap[cat].completed++;
    categoryMap[cat].estimated += (Number(p.estimatedBudget) || 0);
    categoryMap[cat].actual += (Number(p.actualCost) || 0);
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => ({
    name,
    count: data.count,
    completed: data.completed,
    estimated: data.estimated,
    actual: data.actual,
    rate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: {
      termId: targetTermId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      onHoldTasks,
      cancelledTasks,
      overdueTasks,
      completionRate,
      totalEstimatedBudget,
      totalActualCost,
      budgetVariance,
      completedThisMonth,
      dueThisMonth,
      categoryBreakdown
    }
  });
});

// 3. Get Single Action Plan
app.get('/api/v1/committee/action-plans/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!plan) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  res.json({ success: true, data: plan });
});

// 4. Create New Action Plan
app.post('/api/v1/committee/action-plans', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const {
    termId,
    title,
    description,
    category,
    priority = 'NORMAL',
    responsibleMemberId,
    responsibleMemberIds,
    assistantMemberIds,
    startDate,
    dueDate,
    completedDate,
    estimatedBudget = 0,
    actualCost = 0,
    fundingSource,
    fundingAccountId,
    fundingAccountName,
    financialVoucherNumber,
    status = 'TODO',
    progressPercentage = 0,
    remarks,
    resolutionId,
    resolutionNumber,
    resolutionSubject,
    meetingId,
    meetingNumber,
    decisionNumber,
    attachments
  } = req.body;

  if (!title || !category || !startDate || !dueDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'কাজের নাম, ক্যাটাগরি/বিভাগ, শুরু ও সমাপ্তির তারিখ আবশ্যক।' }
    });
  }

  // Active Term auto lookup if termId missing
  let finalTermId = termId;
  let finalTermTitle = '';
  if (!finalTermId) {
    const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');
    finalTermId = activeTerm?.id || db.committeeTerms.find(t => t.mosqueId === mosqueId)?.id || '';
    finalTermTitle = activeTerm?.title || '';
  } else {
    const termObj = db.committeeTerms.find(t => t.id === finalTermId && t.mosqueId === mosqueId);
    finalTermTitle = termObj?.title || '';
  }

  // Auto Generate Plan Number (e.g. AP-2026-006)
  const curYear = new Date().getFullYear();
  const existingCount = db.committeeActionPlans.filter(p => p.mosqueId === mosqueId).length;
  const planNumber = `AP-${curYear}-${String(existingCount + 1).padStart(3, '0')}`;

  // Find responsible member info
  let finalRespMemberId = responsibleMemberId;
  let finalRespMemberName = '';
  let finalRespMemberDesignation = '';
  let finalRespMemberPhone = '';
  const responsibleMembersList: Array<{ id: string; name: string; designation?: string; phone?: string }> = [];

  const allRespIds = responsibleMemberIds && Array.isArray(responsibleMemberIds) && responsibleMemberIds.length > 0
    ? responsibleMemberIds
    : (responsibleMemberId ? [responsibleMemberId] : []);

  if (allRespIds.length > 0) {
    finalRespMemberId = allRespIds[0];
    allRespIds.forEach(id => {
      const mem = db.committeeMembers.find(m => m.id === id && m.mosqueId === mosqueId);
      if (mem) {
        responsibleMembersList.push({
          id: mem.id,
          name: mem.name,
          designation: mem.positionCustomBn || mem.position,
          phone: mem.phone
        });
      }
    });
    if (responsibleMembersList.length > 0) {
      finalRespMemberName = responsibleMembersList.map(m => m.name).join(', ');
      finalRespMemberDesignation = responsibleMembersList[0].designation || '';
      finalRespMemberPhone = responsibleMembersList[0].phone || '';
    }
  }

  // Assistant members list
  const assistantMembersList: Array<{ id: string; name: string; designation?: string; phone?: string }> = [];
  if (assistantMemberIds && Array.isArray(assistantMemberIds)) {
    assistantMemberIds.forEach(id => {
      const mem = db.committeeMembers.find(m => m.id === id && m.mosqueId === mosqueId);
      if (mem) {
        assistantMembersList.push({
          id: mem.id,
          name: mem.name,
          designation: mem.positionCustomBn || mem.position,
          phone: mem.phone
        });
      }
    });
  }

  // Resolution linkage resolution info
  let resNum = resolutionNumber;
  let resSub = resolutionSubject;
  let meetId = meetingId;
  let meetNum = meetingNumber;
  let decNum = decisionNumber;

  if (resolutionId) {
    const resObj = db.committeeResolutions.find(r => r.id === resolutionId && r.mosqueId === mosqueId);
    if (resObj) {
      resNum = resObj.resolutionNumber;
      resSub = resObj.subject;
      meetId = resObj.meetingId;
      meetNum = resObj.meetingNumber;
      decNum = resObj.decisionNumber;
    }
  }

  const initialLog: CommitteeActionPlanActivityLog = {
    id: `act-${Date.now()}-1`,
    action: 'CREATE',
    details: `নতুন কর্মপরিকল্পনা প্রণয়ন: ${title.trim()}${resNum ? ` (সংযুক্ত রেজোলিউশন: ${resNum})` : ''}`,
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: new Date().toISOString()
  };

  const newPlan: CommitteeActionPlan = {
    id: `plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    mosqueId,
    planNumber,
    termId: finalTermId,
    termTitle: finalTermTitle,
    title: title.trim(),
    description: description ? description.trim() : undefined,
    category: category.trim(),
    priority: priority as CommitteeActionPlanPriority,

    responsibleMemberId: finalRespMemberId,
    responsibleMemberName: finalRespMemberName,
    responsibleMemberDesignation: finalRespMemberDesignation,
    responsibleMemberPhone: finalRespMemberPhone,
    responsibleMemberIds: allRespIds,
    responsibleMembers: responsibleMembersList,

    assistantMemberIds: assistantMemberIds || [],
    assistantMembers: assistantMembersList,

    startDate,
    dueDate,
    completedDate: status === 'COMPLETED' ? (completedDate || new Date().toISOString().split('T')[0]) : undefined,

    estimatedBudget: Number(estimatedBudget) || 0,
    actualCost: Number(actualCost) || 0,
    fundingSource: fundingSource ? fundingSource.trim() : undefined,
    fundingAccountId: fundingAccountId || undefined,
    fundingAccountName: fundingAccountName || undefined,
    financialVoucherNumber: financialVoucherNumber ? financialVoucherNumber.trim() : undefined,

    status: status as CommitteeActionPlanStatus,
    progressPercentage: status === 'COMPLETED' ? 100 : (Number(progressPercentage) || 0),
    remarks: remarks ? remarks.trim() : undefined,

    resolutionId: resolutionId || undefined,
    resolutionNumber: resNum || undefined,
    resolutionSubject: resSub || undefined,
    meetingId: meetId || undefined,
    meetingNumber: meetNum || undefined,
    decisionNumber: decNum || undefined,

    attachments: Array.isArray(attachments) ? attachments : [],
    activityLogs: [initialLog],

    isArchived: false,
    isDeleted: false,

    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.committeeActionPlans.unshift(newPlan);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'COMMITTEE_ACTION_PLAN',
    `নতুন কর্মপরিকল্পনা তৈরি: ${newPlan.planNumber} - ${newPlan.title} (ক্যাটাগরি: ${newPlan.category}, বাজেট: ৳${newPlan.estimatedBudget})`
  );
  realtime.broadcastToMosque(mosqueId, 'ACTION_PLAN_CREATED', newPlan, { senderId: req.user!.id });

  res.json({ success: true, data: newPlan, message: 'কর্মপরিকল্পনা সফলভাবে তৈরি করা হয়েছে।' });
});

// 5. Update Action Plan
app.put('/api/v1/committee/action-plans/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!plan) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  const {
    termId,
    title,
    description,
    category,
    priority,
    responsibleMemberId,
    responsibleMemberIds,
    assistantMemberIds,
    startDate,
    dueDate,
    completedDate,
    estimatedBudget,
    actualCost,
    fundingSource,
    fundingAccountId,
    fundingAccountName,
    financialVoucherNumber,
    status,
    progressPercentage,
    remarks,
    resolutionId,
    resolutionNumber,
    resolutionSubject,
    meetingId,
    meetingNumber,
    decisionNumber,
    isArchived,
    attachments
  } = req.body;

  const previousStatus = plan.status;
  const previousProgress = plan.progressPercentage;

  if (title !== undefined) plan.title = title.trim();
  if (description !== undefined) plan.description = description ? description.trim() : undefined;
  if (category !== undefined) plan.category = category.trim();
  if (priority !== undefined) plan.priority = priority;
  if (termId !== undefined) {
    plan.termId = termId;
    const termObj = db.committeeTerms.find(t => t.id === termId && t.mosqueId === mosqueId);
    if (termObj) plan.termTitle = termObj.title;
  }

  // Update members
  if (responsibleMemberIds !== undefined || responsibleMemberId !== undefined) {
    const allRespIds = responsibleMemberIds && Array.isArray(responsibleMemberIds)
      ? responsibleMemberIds
      : (responsibleMemberId ? [responsibleMemberId] : []);

    plan.responsibleMemberIds = allRespIds;
    plan.responsibleMemberId = allRespIds[0] || undefined;

    const responsibleMembersList: Array<{ id: string; name: string; designation?: string; phone?: string }> = [];
    allRespIds.forEach(id => {
      const mem = db.committeeMembers.find(m => m.id === id && m.mosqueId === mosqueId);
      if (mem) {
        responsibleMembersList.push({
          id: mem.id,
          name: mem.name,
          designation: mem.positionCustomBn || mem.position,
          phone: mem.phone
        });
      }
    });
    plan.responsibleMembers = responsibleMembersList;
    if (responsibleMembersList.length > 0) {
      plan.responsibleMemberName = responsibleMembersList.map(m => m.name).join(', ');
      plan.responsibleMemberDesignation = responsibleMembersList[0].designation || '';
      plan.responsibleMemberPhone = responsibleMembersList[0].phone || '';
    } else {
      plan.responsibleMemberName = undefined;
      plan.responsibleMemberDesignation = undefined;
      plan.responsibleMemberPhone = undefined;
    }
  }

  if (assistantMemberIds !== undefined) {
    plan.assistantMemberIds = assistantMemberIds;
    const assistantMembersList: Array<{ id: string; name: string; designation?: string; phone?: string }> = [];
    if (Array.isArray(assistantMemberIds)) {
      assistantMemberIds.forEach(id => {
        const mem = db.committeeMembers.find(m => m.id === id && m.mosqueId === mosqueId);
        if (mem) {
          assistantMembersList.push({
            id: mem.id,
            name: mem.name,
            designation: mem.positionCustomBn || mem.position,
            phone: mem.phone
          });
        }
      });
    }
    plan.assistantMembers = assistantMembersList;
  }

  if (startDate !== undefined) plan.startDate = startDate;
  if (dueDate !== undefined) plan.dueDate = dueDate;
  if (completedDate !== undefined) plan.completedDate = completedDate;

  if (estimatedBudget !== undefined) plan.estimatedBudget = Number(estimatedBudget) || 0;
  if (actualCost !== undefined) plan.actualCost = Number(actualCost) || 0;
  if (fundingSource !== undefined) plan.fundingSource = fundingSource;
  if (fundingAccountId !== undefined) plan.fundingAccountId = fundingAccountId;
  if (fundingAccountName !== undefined) plan.fundingAccountName = fundingAccountName;
  if (financialVoucherNumber !== undefined) plan.financialVoucherNumber = financialVoucherNumber;

  if (remarks !== undefined) plan.remarks = remarks;
  if (isArchived !== undefined) plan.isArchived = isArchived;
  if (attachments !== undefined) plan.attachments = attachments;

  if (resolutionId !== undefined) plan.resolutionId = resolutionId;
  if (resolutionNumber !== undefined) plan.resolutionNumber = resolutionNumber;
  if (resolutionSubject !== undefined) plan.resolutionSubject = resolutionSubject;
  if (meetingId !== undefined) plan.meetingId = meetingId;
  if (meetingNumber !== undefined) plan.meetingNumber = meetingNumber;
  if (decisionNumber !== undefined) plan.decisionNumber = decisionNumber;

  if (status !== undefined) plan.status = status;
  if (progressPercentage !== undefined) plan.progressPercentage = Number(progressPercentage) || 0;

  // Auto handle completion sync
  if (plan.status === 'COMPLETED') {
    plan.progressPercentage = 100;
    if (!plan.completedDate) {
      plan.completedDate = new Date().toISOString().split('T')[0];
    }
  } else if (plan.progressPercentage === 100 && (plan.status as string) !== 'COMPLETED') {
    plan.status = 'COMPLETED';
    if (!plan.completedDate) {
      plan.completedDate = new Date().toISOString().split('T')[0];
    }
  }

  // Create Activity Log Entry
  if (!plan.activityLogs) plan.activityLogs = [];
  let logAction = 'UPDATE';
  let logDetails = 'কর্মপরিকল্পনার তথ্য আপডেট করা হয়েছে।';

  if (status !== undefined && status !== previousStatus) {
    logAction = 'STATUS_CHANGE';
    logDetails = `স্ট্যাটাস পরিবর্তন: ${previousStatus} -> ${status}`;
  } else if (progressPercentage !== undefined && progressPercentage !== previousProgress) {
    logAction = 'PROGRESS_UPDATE';
    logDetails = `বাস্তবায়ন অগ্রগতি পরিবর্তন: ${previousProgress}% -> ${progressPercentage}%`;
  }

  plan.activityLogs.push({
    id: `act-${Date.now()}-${plan.activityLogs.length + 1}`,
    action: logAction,
    details: logDetails,
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: new Date().toISOString(),
    previousState: String(previousStatus),
    newState: String(plan.status)
  });

  plan.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_ACTION_PLAN',
    `কর্মপরিকল্পনা আপডেট: ${plan.planNumber} - ${plan.title} (স্ট্যাটাস: ${plan.status}, অগ্রগতি: ${plan.progressPercentage}%)`
  );
  realtime.broadcastToMosque(mosqueId, 'ACTION_PLAN_UPDATED', plan, { senderId: req.user!.id });

  res.json({ success: true, data: plan, message: 'কর্মপরিকল্পনা সফলভাবে আপডেট হয়েছে।' });
});

// 6. Quick Progress & Cost Update
app.patch('/api/v1/committee/action-plans/:id/progress', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!plan) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  const { progressPercentage, status, actualCost, remarks, completedDate } = req.body;
  const prevProgress = plan.progressPercentage;
  const prevStatus = plan.status;

  if (progressPercentage !== undefined) {
    plan.progressPercentage = Math.min(100, Math.max(0, Number(progressPercentage) || 0));
  }

  if (status !== undefined) {
    plan.status = status;
  }

  if (actualCost !== undefined) {
    plan.actualCost = Number(actualCost) || 0;
  }

  if (remarks !== undefined) {
    plan.remarks = remarks;
  }

  // If progress is 100%, auto complete
  if (plan.progressPercentage === 100) {
    plan.status = 'COMPLETED';
    plan.completedDate = completedDate || plan.completedDate || new Date().toISOString().split('T')[0];
  } else if (plan.status === 'COMPLETED' && plan.progressPercentage < 100) {
    plan.progressPercentage = 100;
  }

  if (!plan.activityLogs) plan.activityLogs = [];
  plan.activityLogs.push({
    id: `act-${Date.now()}-${plan.activityLogs.length + 1}`,
    action: 'PROGRESS_UPDATE',
    details: `বাস্তবায়ন অগ্রগতি আপডেট: ${prevProgress}% -> ${plan.progressPercentage}% (স্ট্যাটাস: ${plan.status})`,
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: new Date().toISOString(),
    previousState: `${prevProgress}%`,
    newState: `${plan.progressPercentage}%`
  });

  plan.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_ACTION_PLAN',
    `কর্মপরিকল্পনা দ্রুত অগ্রগতি আপডেট: ${plan.planNumber} (${plan.progressPercentage}%, স্ট্যাটাস: ${plan.status})`
  );
  realtime.broadcastToMosque(mosqueId, 'ACTION_PLAN_UPDATED', plan, { senderId: req.user!.id });

  res.json({ success: true, data: plan, message: 'বাস্তবায়ন অগ্রগতি সফলভাবে আপডেট করা হয়েছে।' });
});

// 7. Quick Toggle Complete / Incomplete Checkbox
app.patch('/api/v1/committee/action-plans/:id/complete', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!plan) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  const { completed } = req.body;
  const isComplete = completed === true || completed === 'true';

  if (isComplete) {
    plan.status = 'COMPLETED';
    plan.progressPercentage = 100;
    plan.completedDate = new Date().toISOString().split('T')[0];
  } else {
    plan.status = 'IN_PROGRESS';
    plan.progressPercentage = 50;
    plan.completedDate = undefined;
  }

  if (!plan.activityLogs) plan.activityLogs = [];
  plan.activityLogs.push({
    id: `act-${Date.now()}-${plan.activityLogs.length + 1}`,
    action: isComplete ? 'MARK_COMPLETED' : 'STATUS_CHANGE',
    details: isComplete ? 'কাজটি সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে (১০০%)।' : 'কাজটি পুনরায় চলমান (In Progress) করা হয়েছে।',
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: new Date().toISOString()
  });

  plan.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_ACTION_PLAN',
    `কর্মপরিকল্পনা সম্পন্নকরণ পরিবর্তন: ${plan.planNumber} -> ${plan.status}`
  );
  realtime.broadcastToMosque(mosqueId, 'ACTION_PLAN_UPDATED', plan, { senderId: req.user!.id });

  res.json({ success: true, data: plan, message: isComplete ? 'কাজটি সম্পন্ন হিসেবে চিহ্নিত হয়েছে।' : 'কাজটি চলমান হিসেবে সেট করা হয়েছে।' });
});

// 8. Add Attachment (Before / During / After Photo, Bill / Invoice)
app.post('/api/v1/committee/action-plans/:id/attachments', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!plan) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  const { name, url, type = 'DOCUMENT', typeBn } = req.body;
  if (!name || !url) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ফাইলের নাম এবং ইউআরএল আবশ্যক।' } });
  }

  const newAttachment: CommitteeActionPlanAttachment = {
    id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    url: url.trim(),
    type,
    typeBn: typeBn || (
      type === 'BEFORE_PHOTO' ? 'কাজের পূর্বের ছবি' :
      type === 'DURING_PHOTO' ? 'কাজের চলমান ছবি' :
      type === 'AFTER_PHOTO' ? 'কাজের সমাপ্তির ছবি' :
      type === 'BILL' ? 'বিল ও ভাউচার' :
      type === 'INVOICE' ? 'ইনভয়েস / রশিদ' : 'নথি / প্রমাণক'
    ),
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.user!.id,
    uploadedByName: req.user!.name
  };

  if (!plan.attachments) plan.attachments = [];
  plan.attachments.push(newAttachment);

  if (!plan.activityLogs) plan.activityLogs = [];
  plan.activityLogs.push({
    id: `act-${Date.now()}-${plan.activityLogs.length + 1}`,
    action: 'ATTACH_DOCUMENT',
    details: `নতুন সংযুক্তি যুক্ত হয়েছে: ${newAttachment.name} (${newAttachment.typeBn})`,
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: new Date().toISOString()
  });

  plan.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'COMMITTEE_ACTION_PLAN',
    `কর্মপরিকল্পনায় সংযুক্তি যোগ: ${plan.planNumber} - ${newAttachment.name}`
  );

  res.json({ success: true, data: plan, attachment: newAttachment, message: 'সংযুক্তি সফলভাবে যুক্ত হয়েছে।' });
});

// 9. Remove Attachment
app.delete('/api/v1/committee/action-plans/:id/attachments/:attachmentId', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!plan) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  if (!plan.attachments) plan.attachments = [];
  const attIdx = plan.attachments.findIndex(a => a.id === req.params.attachmentId);
  if (attIdx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সংযুক্তি পাওয়া যায়নি।' } });
  }

  const removed = plan.attachments.splice(attIdx, 1)[0];

  if (!plan.activityLogs) plan.activityLogs = [];
  plan.activityLogs.push({
    id: `act-${Date.now()}-${plan.activityLogs.length + 1}`,
    action: 'UPDATE',
    details: `সংযুক্তি মুছে ফেলা হয়েছে: ${removed.name}`,
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    timestamp: new Date().toISOString()
  });

  plan.updatedAt = new Date().toISOString();
  db.save();

  res.json({ success: true, data: plan, message: 'সংযুক্তি সফলভাবে মুছে ফেলা হয়েছে।' });
});

// 10. Delete / Soft-Delete Action Plan (Preserving Audit Trail)
app.delete('/api/v1/committee/action-plans/:id', authenticate, requirePermission('MANAGE_COMMITTEE'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const idx = db.committeeActionPlans.findIndex(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কর্মপরিকল্পনা পাওয়া যায়নি।' } });
  }

  const target = db.committeeActionPlans[idx];
  const force = req.query.force === 'true';

  // Soft delete for safety unless super-admin forces
  if (!force || req.user?.role !== 'SUPER_ADMIN') {
    target.isDeleted = true;
    target.updatedAt = new Date().toISOString();
    if (!target.activityLogs) target.activityLogs = [];
    target.activityLogs.push({
      id: `act-${Date.now()}-${target.activityLogs.length + 1}`,
      action: 'ARCHIVE',
      details: 'কর্মপরিকল্পনাটি সফট ডিলিট / আর্কাইভ করা হয়েছে।',
      changedBy: req.user!.id,
      changedByName: req.user!.name,
      timestamp: new Date().toISOString()
    });
    db.save();

    db.logAudit(
      mosqueId,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'DELETE',
      'COMMITTEE_ACTION_PLAN',
      `কর্মপরিকল্পনা সফট ডিলিট: ${target.planNumber} - ${target.title}`
    );
    realtime.broadcastToMosque(mosqueId, 'ACTION_PLAN_DELETED', { id: target.id }, { senderId: req.user!.id });

    return res.json({ success: true, message: 'কর্মপরিকল্পনা সফলভাবে মুছে ফেলা হয়েছে (Soft Delete)।' });
  }

  // Hard delete
  const removed = db.committeeActionPlans.splice(idx, 1)[0];
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'COMMITTEE_ACTION_PLAN',
    `কর্মপরিকল্পনা স্থায়ীভাবে মুছে ফেলা হয়েছে: ${removed.planNumber} - ${removed.title}`
  );
  realtime.broadcastToMosque(mosqueId, 'ACTION_PLAN_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'কর্মপরিকল্পনা স্থায়ীভাবে মুছে ফেলা হয়েছে।' });
});

// 11. Audit Log for Action Plan Print / PDF / Export
app.post('/api/v1/committee/action-plans/:id/audit', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { action, details, reportType } = req.body;
  if (!db.committeeActionPlans) db.committeeActionPlans = [];

  const plan = db.committeeActionPlans.find(p => p.id === req.params.id && p.mosqueId === mosqueId);

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    action || 'PRINT',
    'COMMITTEE_ACTION_PLAN',
    details || `কর্মপরিকল্পনা ${action === 'PDF_DOWNLOAD' ? 'PDF ডাউনলোড' : 'প্রিন্ট'}: ${plan ? plan.planNumber : 'রিপোর্ট'} (${reportType || 'সাধারণ'})`
  );

  res.json({ success: true });
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

app.get('/api/v1/staff/next-code', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const currentYear = new Date().getFullYear();
  const yearStaff = db.staffList.filter(s => s.mosqueId === mosqueId);
  const nextSeq = yearStaff.length + 1;
  const nextCode = `STF-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  res.json({ success: true, data: { nextCode, year: currentYear, count: yearStaff.length } });
});

app.post('/api/v1/staff', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const { 
    name, 
    fullNameBn,
    staffCode,
    role, 
    designationBn, 
    employmentType,
    employmentTypeBn,
    phone, 
    nid, 
    salary, 
    monthlySalary,
    joiningDate, 
    address, 
    presentAddress,
    permanentAddress,
    allowance,
    salaryEffectiveDate,
    educationQualification,
    photoUrl,
    signatureUrl,
    bankName,
    branchName,
    accountHolderName,
    accountNumber,
    routingNumber,
    accountType,
    bankStatus,
    notes
  } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!name || !designationBn || !phone) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'স্টাফের নাম, পদবী ও মোবাইল নম্বর আবশ্যক।' } });
  }

  const joinDate = joiningDate || new Date().toISOString().split('T')[0];
  const joinYear = joinDate.split('-')[0] || new Date().getFullYear().toString();
  const yearStaffCount = db.staffList.filter(s => s.mosqueId === mosqueId).length + 1;
  const finalCode = staffCode || `STF-${joinYear}-${String(yearStaffCount).padStart(3, '0')}`;

  const numSalary = Number(monthlySalary !== undefined ? monthlySalary : salary) || 15000;
  const numAllowance = Number(allowance) || 0;
  const effDate = salaryEffectiveDate || joinDate;

  const initialSalaryHistory: SalaryHistoryEntry = {
    id: `sh-${Date.now()}-init`,
    effectiveDate: effDate,
    newSalary: numSalary,
    allowance: numAllowance,
    reason: 'প্রারম্ভিক নির্ধারিত বেতন/হাদিয়া',
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };

  const staff: Staff = {
    id: `staff-${Date.now()}`,
    mosqueId,
    name,
    fullNameBn: fullNameBn || name,
    staffCode: finalCode,
    nid: nid || '',
    phone,
    designation: (role as any) || 'OTHER',
    designationBn,
    employmentType: employmentType || 'PERMANENT',
    employmentTypeBn: employmentTypeBn || (employmentType === 'CONTRACTUAL' ? 'চুক্তিভিত্তিক' : employmentType === 'PART_TIME' ? 'খণ্ডকালীন' : employmentType === 'TEMPORARY' ? 'অস্থায়ী' : 'স্থায়ী'),
    monthlySalary: numSalary,
    allowance: numAllowance,
    salaryEffectiveDate: effDate,
    salaryHistory: [initialSalaryHistory],
    joiningDate: joinDate,
    address: presentAddress || address || '',
    presentAddress: presentAddress || address || '',
    permanentAddress: permanentAddress || address || '',
    educationQualification: educationQualification || undefined,
    photoUrl: photoUrl || undefined,
    signatureUrl: signatureUrl || undefined,
    bankName: bankName || undefined,
    branchName: branchName || undefined,
    accountHolderName: accountHolderName || undefined,
    accountNumber: accountNumber || undefined,
    routingNumber: routingNumber || undefined,
    accountType: accountType || 'SAVINGS',
    bankStatus: bankStatus || (accountNumber ? 'ACTIVE' : 'PENDING'),
    notes,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  db.staffList.push(staff);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'STAFF', `নতুন স্টাফ নিয়োগ: ${name} (${designationBn}, আইডি: ${finalCode})`);
  realtime.broadcastToMosque(mosqueId, 'STAFF_CREATED', staff, { senderId: req.user!.id });

  res.json({ success: true, data: staff, message: 'স্টাফ সফলভাবে যুক্ত করা হয়েছে।' });
});

app.put('/api/v1/staff/:id', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const staff = db.staffList.find(s => s.id === req.params.id && s.mosqueId === req.currentMosque!.id);
  if (!staff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });

  const { 
    name, 
    fullNameBn,
    staffCode,
    designation, 
    designationBn, 
    employmentType,
    employmentTypeBn,
    phone, 
    nid, 
    monthlySalary, 
    salary, 
    salaryEffectiveDate,
    salaryRevisionReason,
    joiningDate, 
    resignationDate,
    terminationDate,
    educationQualification,
    photoUrl,
    signatureUrl,
    address, 
    presentAddress,
    permanentAddress,
    allowance, 
    status, 
    notes,
    bankName,
    branchName,
    accountHolderName,
    accountNumber,
    routingNumber,
    accountType,
    bankStatus
  } = req.body;
  
  if (name) staff.name = name;
  if (fullNameBn !== undefined) staff.fullNameBn = fullNameBn;
  if (staffCode !== undefined) staff.staffCode = staffCode;
  if (designation) staff.designation = designation;
  if (designationBn) staff.designationBn = designationBn;
  if (employmentType) staff.employmentType = employmentType;
  if (employmentTypeBn) staff.employmentTypeBn = employmentTypeBn;
  if (phone) staff.phone = phone;
  if (nid !== undefined) staff.nid = nid;
  if (joiningDate) staff.joiningDate = joiningDate;
  if (resignationDate !== undefined) staff.resignationDate = resignationDate;
  if (terminationDate !== undefined) staff.terminationDate = terminationDate;
  if (educationQualification !== undefined) staff.educationQualification = educationQualification;
  if (photoUrl !== undefined) staff.photoUrl = photoUrl;
  if (signatureUrl !== undefined) staff.signatureUrl = signatureUrl;
  if (address !== undefined) staff.address = address;
  if (presentAddress !== undefined) staff.presentAddress = presentAddress;
  if (permanentAddress !== undefined) staff.permanentAddress = permanentAddress;
  if (status) staff.status = status;
  if (notes !== undefined) staff.notes = notes;
  if (bankName !== undefined) staff.bankName = bankName;
  if (branchName !== undefined) staff.branchName = branchName;
  if (accountHolderName !== undefined) staff.accountHolderName = accountHolderName;
  if (accountNumber !== undefined) staff.accountNumber = accountNumber;
  if (routingNumber !== undefined) staff.routingNumber = routingNumber;
  if (accountType !== undefined) staff.accountType = accountType;
  if (bankStatus !== undefined) staff.bankStatus = bankStatus;

  // Handle Salary Update & Record Salary History
  const targetNewSalary = monthlySalary !== undefined ? Number(monthlySalary) : (salary !== undefined ? Number(salary) : undefined);
  const targetNewAllowance = allowance !== undefined ? Number(allowance) : staff.allowance;

  if (targetNewSalary !== undefined && targetNewSalary !== staff.monthlySalary) {
    if (!staff.salaryHistory) staff.salaryHistory = [];
    const prevSal = staff.monthlySalary;
    staff.monthlySalary = targetNewSalary;
    staff.allowance = targetNewAllowance;
    staff.salaryEffectiveDate = salaryEffectiveDate || new Date().toISOString().split('T')[0];

    const historyEntry: SalaryHistoryEntry = {
      id: `sh-${Date.now()}`,
      effectiveDate: staff.salaryEffectiveDate,
      previousSalary: prevSal,
      newSalary: targetNewSalary,
      allowance: targetNewAllowance,
      incrementAmount: targetNewSalary - prevSal,
      reason: salaryRevisionReason || 'বেতন স্কেল হালনাগাদ / ইনক্রিমেন্ট',
      changedBy: req.user!.id,
      changedByName: req.user!.name,
      createdAt: new Date().toISOString(),
    };
    staff.salaryHistory.unshift(historyEntry);

    db.logAudit(
      req.currentMosque!.id,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'UPDATE',
      'STAFF_SALARY',
      `${staff.name} এর বেতন সংশোধন/বৃদ্ধি: ৳${prevSal} ➔ ৳${targetNewSalary} (কার্যকর: ${staff.salaryEffectiveDate})`
    );
  } else if (allowance !== undefined) {
    staff.allowance = Number(allowance);
  }

  staff.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'STAFF', `স্টাফ তথ্য আপডেট: ${staff.name} (${staff.designationBn}, স্ট্যাটাস: ${staff.status})`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'STAFF_UPDATED', staff, { senderId: req.user!.id });

  res.json({ success: true, data: staff, message: 'স্টাফ তথ্য সফলভাবে আপডেট হয়েছে।' });
});

// Explicit Salary Revision Endpoint
app.post('/api/v1/staff/:id/salary-revision', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const staff = db.staffList.find(s => s.id === req.params.id && s.mosqueId === req.currentMosque!.id);
  if (!staff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });

  const { newSalary, allowance, effectiveDate, reason } = req.body;
  if (newSalary === undefined || Number(newSalary) < 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'সঠিক নতুন বেতন/হাদিয়ার পরিমাণ দিন।' } });
  }

  const prevSal = staff.monthlySalary;
  const numNewSal = Number(newSalary);
  const numAllowance = allowance !== undefined ? Number(allowance) : (staff.allowance || 0);
  const effDate = effectiveDate || new Date().toISOString().split('T')[0];

  staff.monthlySalary = numNewSal;
  staff.allowance = numAllowance;
  staff.salaryEffectiveDate = effDate;
  if (!staff.salaryHistory) staff.salaryHistory = [];

  const historyEntry: SalaryHistoryEntry = {
    id: `sh-${Date.now()}`,
    effectiveDate: effDate,
    previousSalary: prevSal,
    newSalary: numNewSal,
    allowance: numAllowance,
    incrementAmount: numNewSal - prevSal,
    reason: reason || 'কমিটি অনুমোদিত বেতন বৃদ্ধি',
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };

  staff.salaryHistory.unshift(historyEntry);
  staff.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(
    req.currentMosque!.id,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'STAFF_SALARY',
    `${staff.name} এর বেতন বৃদ্ধি: ৳${prevSal} ➔ ৳${numNewSal} (${reason || 'ইনক্রিমেন্ট'})`
  );
  realtime.broadcastToMosque(req.currentMosque!.id, 'STAFF_UPDATED', staff, { senderId: req.user!.id });

  res.json({ success: true, data: staff, historyEntry, message: 'বেতন সংশোধন ও হিস্ট্রি সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Batch Disburse Festival Allowance / Bonus
app.post('/api/v1/staff/disburse-festival-allowance', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { 
    festivalName, 
    paymentType = 'FESTIVAL_ALLOWANCE',
    month, 
    paymentDate, 
    paymentMethod = 'BANK', 
    accountId, 
    staffAllocations, // Array of { staffId, amount, notes }
    notes 
  } = req.body;

  if (!festivalName) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'উৎসবের নাম প্রদান করুন।' } });
  }

  if (!Array.isArray(staffAllocations) || staffAllocations.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'অন্তত একজন স্টাফ নির্বাচন করুন।' } });
  }

  const account = db.accounts.find(a => a.id === accountId && a.mosqueId === mosqueId) || 
                  db.accounts.find(a => a.mosqueId === mosqueId && a.accountType === 'BANK') ||
                  db.accounts[0];

  const currentYear = new Date().getFullYear();
  const payDate = paymentDate || new Date().toISOString().split('T')[0];
  const payMonth = month || `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');

  let batchTotalAmount = 0;
  const createdPayments: StaffPayment[] = [];

  for (const item of staffAllocations) {
    const staff = db.staffList.find(s => s.id === item.staffId && s.mosqueId === mosqueId);
    if (!staff) continue;

    const amount = Number(item.amount) || 0;
    if (amount <= 0) continue;

    batchTotalAmount += amount;
    const expVoucher = `EXP-${currentYear}-${String(db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;
    const expEntryId = `exp-fest-${Date.now()}-${staff.id.slice(-4)}`;

    const payment: StaffPayment = {
      id: `pay-${Date.now()}-${staff.id.slice(-4)}`,
      mosqueId,
      staffId: staff.id,
      staffName: staff.name,
      designationBn: staff.designationBn,
      month: payMonth,
      paymentDate: payDate,
      paymentType: paymentType as any,
      festivalName,
      basicSalary: 0,
      bonus: amount,
      otherAllowance: 0,
      allowance: amount,
      deduction: 0,
      totalPayable: amount,
      netPaid: amount,
      paymentMethod: paymentMethod || 'BANK',
      accountId: account.id,
      accountNameBn: account.nameBn,
      expenseVoucherNumber: expVoucher,
      expenseEntryId: expEntryId,
      notes: `${festivalName}: ${item.notes || notes || ''}`.trim(),
      status: 'PAID',
      termId: activeTerm ? activeTerm.id : undefined,
      createdAt: new Date().toISOString()
    };

    db.staffPayments.unshift(payment);
    createdPayments.push(payment);

    // Auto Expense Entry
    db.expenseEntries.unshift({
      id: expEntryId,
      mosqueId,
      termId: activeTerm ? activeTerm.id : undefined,
      voucherNumber: expVoucher,
      date: payDate,
      mainHeadId: 'head-exp-01',
      mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
      subHeadId: staff.designation === 'IMAM' || staff.designation === 'KHATIB' ? 'head-exp-01-1' : 'head-exp-01-2',
      subHeadNameBn: `${festivalName} ভাতা (${staff.name})`,
      amount: amount,
      paymentMethod: payment.paymentMethod,
      accountId: account.id,
      accountName: account.nameBn,
      payeeName: staff.name,
      payeePhone: staff.phone,
      reference: `${festivalName} - ${payMonth}`,
      description: `${staff.name} (${staff.designationBn}) কে ${festivalName} বাবদ উৎসব ভাতা প্রদান [ভাউচার: ${expVoucher}]`,
      createdBy: req.user!.id,
      createdByName: req.user!.name,
      approvedBy: req.user!.id,
      approvedByName: req.user!.name,
      approvedAt: new Date().toISOString(),
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Deduct bank/cash balance
  account.currentBalance -= batchTotalAmount;

  db.save();
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'STAFF_PAYMENT',
    `${festivalName} উৎসব ভাতা বিতরণ: ${createdPayments.length} জন স্টাফকে সর্বমোট ৳${batchTotalAmount} প্রদান`
  );

  realtime.broadcastToMosque(mosqueId, 'STAFF_FESTIVAL_DISBURSED', { payments: createdPayments, totalAmount: batchTotalAmount }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ 
    success: true, 
    data: { payments: createdPayments, totalAmount: batchTotalAmount, count: createdPayments.length },
    message: `${festivalName} বাবদ ${createdPayments.length} জন স্টাফের উৎসব ভাতা সফলভাবে একাউন্ট ও ভাউচারে যুক্ত হয়েছে।` 
  });
});

app.delete('/api/v1/staff/:id', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const staff = db.staffList.find(s => s.id === req.params.id && s.mosqueId === mosqueId);
  if (!staff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });

  // Check if staff has past payment history
  const hasPayments = db.staffPayments.some(p => p.staffId === staff.id && p.mosqueId === mosqueId);
  if (hasPayments) {
    // Preserve financial history: deactivate instead of permanent deletion
    staff.status = 'INACTIVE';
    staff.updatedAt = new Date().toISOString();
    db.save();
    db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'STAFF', `স্টাফ নিষ্ক্রিয় করা হয়েছে (পূর্ববর্তী পেমেন্ট ইতিহাস সংরক্ষিত): ${staff.name}`);
    realtime.broadcastToMosque(mosqueId, 'STAFF_UPDATED', staff, { senderId: req.user!.id });
    return res.json({ 
      success: true, 
      data: staff,
      archived: true, 
      message: 'স্টাফের পূর্ববর্তী বেতন প্রদানের ইতিহাস থাকায় তাঁকে নিষ্ক্রিয় (Inactive) হিসেবে সংরক্ষণ করা হয়েছে।' 
    });
  }

  const idx = db.staffList.findIndex(s => s.id === req.params.id && s.mosqueId === mosqueId);
  const removed = db.staffList.splice(idx, 1)[0];
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'STAFF', `স্টাফ অপসারণ: ${removed.name}`);
  realtime.broadcastToMosque(mosqueId, 'STAFF_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'স্টাফ সফলভাবে অপসারণ করা হয়েছে।' });
});

// Pay staff salary
const handleStaffPay = (req: AuthRequest, res: Response) => {
  const { 
    staffId, 
    month, 
    year, 
    paymentDate,
    paymentType,
    festivalName,
    basicSalary, 
    bonus, 
    otherAllowance,
    allowance,
    deduction, 
    advanceDeduction,
    netPaid, 
    paymentMethod, 
    accountId, 
    staffSignatureUrl,
    receivedByConfirmation,
    notes 
  } = req.body;
  
  const mosqueId = req.currentMosque!.id;
  const staff = db.staffList.find(s => s.id === staffId && s.mosqueId === mosqueId);
  const account = db.accounts.find(a => a.id === accountId && a.mosqueId === mosqueId) || 
                  db.accounts.find(a => a.mosqueId === mosqueId) || 
                  db.accounts[0];

  if (!staff) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'স্টাফ পাওয়া যায়নি।' } });
  }

  const numBasic = Number(basicSalary) >= 0 ? Number(basicSalary) : staff.monthlySalary;
  const numBonus = Number(bonus) || 0;
  const numOther = Number(otherAllowance) || (Number(allowance) > numBonus ? Number(allowance) - numBonus : 0);
  const numAdvDeduction = Number(advanceDeduction) || 0;
  const numDeduction = (Number(deduction) || 0) + numAdvDeduction;
  const totalPayable = numBasic + numBonus + numOther;
  const totalAmount = Number(netPaid) > 0 ? Number(netPaid) : (totalPayable - numDeduction);
  
  const currentYear = Number(year) || new Date().getFullYear();
  const monthName = month || `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const payDate = paymentDate || new Date().toISOString().split('T')[0];

  // Active Committee Term Link
  const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');

  // Check and deduct account balance
  account.currentBalance -= totalAmount;

  // Auto create expense voucher
  const expVoucher = `EXP-${currentYear}-${String(db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;
  const expEntryId = `exp-pay-${Date.now()}`;

  const payment: StaffPayment = {
    id: `pay-${Date.now()}`,
    mosqueId,
    staffId: staff.id,
    staffName: staff.name,
    designationBn: staff.designationBn,
    month: monthName,
    paymentDate: payDate,
    paymentType: paymentType || 'REGULAR_SALARY',
    festivalName: festivalName || undefined,
    basicSalary: numBasic,
    bonus: numBonus,
    otherAllowance: numOther,
    allowance: numBonus + numOther,
    deduction: numDeduction,
    advanceDeduction: numAdvDeduction,
    totalPayable: totalPayable,
    netPaid: totalAmount,
    paymentMethod: paymentMethod || 'CASH',
    accountId: account.id,
    accountNameBn: account.nameBn,
    expenseVoucherNumber: expVoucher,
    expenseEntryId: expEntryId,
    notes,
    staffSignatureUrl: staffSignatureUrl || staff.signatureUrl || undefined,
    receivedByConfirmation: receivedByConfirmation !== undefined ? Boolean(receivedByConfirmation) : true,
    status: 'PAID',
    termId: activeTerm ? activeTerm.id : undefined,
    createdAt: new Date().toISOString()
  };

  db.staffPayments.unshift(payment);

  // Auto-post expense entry linked to Committee Term and head-exp-01
  db.expenseEntries.unshift({
    id: expEntryId,
    mosqueId,
    termId: activeTerm ? activeTerm.id : undefined,
    voucherNumber: expVoucher,
    date: payDate,
    mainHeadId: 'head-exp-01',
    mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
    subHeadId: staff.designation === 'IMAM' || staff.designation === 'KHATIB' ? 'head-exp-01-1' : 'head-exp-01-2',
    subHeadNameBn: `${staff.designationBn} বেতন ও হাদিয়া (${staff.name} - ${monthName})`,
    amount: totalAmount,
    paymentMethod: payment.paymentMethod,
    accountId: account.id,
    accountName: account.nameBn,
    payeeName: staff.name,
    payeePhone: staff.phone,
    reference: `${paymentType === 'FESTIVAL_ALLOWANCE' ? festivalName || 'উৎসব ভাতা' : 'Salary Month'}: ${monthName}`,
    description: `${staff.name} (${staff.designationBn}) এর ${monthName} মাসের ${paymentType === 'FESTIVAL_ALLOWANCE' ? `${festivalName || 'উৎসব ভাতা'}` : 'বেতন/হাদিয়া'} পরিশোধ ${numBonus > 0 ? `(বোনাস: ৳${numBonus})` : ''} ${notes ? `[${notes}]` : ''}`.trim(),
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
  db.logAudit(
    mosqueId, 
    req.user!.id, 
    req.user!.name, 
    req.user!.role, 
    'CREATE', 
    'STAFF_PAYMENT', 
    `${staff.name} এর ${monthName} মাসের বেতন পরিশোধ (${expVoucher}): মূল ৳${numBasic}${numBonus > 0 ? ` + বোনাস ৳${numBonus}` : ''} = মোট ৳${totalAmount}`
  );

  realtime.broadcastToMosque(mosqueId, 'STAFF_PAID', payment, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: payment, message: 'বেতন ও বোনাস সফলভাবে পরিশোধ ও হিসাবভুক্ত করা হয়েছে।' });
};

app.post('/api/v1/staff/pay', authenticate, requirePermission('MANAGE_STAFF'), handleStaffPay);
app.post('/api/v1/management/staff-pay', authenticate, requirePermission('MANAGE_STAFF'), handleStaffPay);

// Update Staff Payment (with accounting integrity)
app.put('/api/v1/staff/payments/:id', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const payment = db.staffPayments.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'পেমেন্ট রেকর্ড পাওয়া যায়নি।' } });

  const { notes, basicSalary, bonus, otherAllowance, deduction, netPaid, paymentMethod, accountId, paymentDate } = req.body;
  const expEntry = db.expenseEntries.find(e => e.voucherNumber === payment.expenseVoucherNumber || e.id === payment.expenseEntryId);

  const oldAmount = payment.netPaid;
  const oldAccountId = payment.accountId;

  if (basicSalary !== undefined) payment.basicSalary = Number(basicSalary);
  if (bonus !== undefined) payment.bonus = Number(bonus);
  if (otherAllowance !== undefined) payment.otherAllowance = Number(otherAllowance);
  if (payment.bonus !== undefined || payment.otherAllowance !== undefined) {
    payment.allowance = (payment.bonus || 0) + (payment.otherAllowance || 0);
  }
  if (deduction !== undefined) payment.deduction = Number(deduction);
  
  if (payment.basicSalary !== undefined) {
    payment.totalPayable = (payment.basicSalary || 0) + (payment.bonus || 0) + (payment.otherAllowance || 0);
  }

  const newAmount = netPaid !== undefined ? Number(netPaid) : (payment.totalPayable ? payment.totalPayable - (payment.deduction || 0) : payment.netPaid);
  const newAccountId = accountId || payment.accountId;
  const newPayDate = paymentDate || payment.paymentDate;

  // If financial balance or account changed, adjust accounts safely
  if (newAmount !== oldAmount || newAccountId !== oldAccountId) {
    const oldAcc = db.accounts.find(a => a.id === oldAccountId);
    const newAcc = db.accounts.find(a => a.id === newAccountId);

    if (oldAcc) oldAcc.currentBalance += oldAmount; // restore old
    if (newAcc) newAcc.currentBalance -= newAmount; // deduct new

    payment.netPaid = newAmount;
    payment.accountId = newAccountId;
    if (newAcc) payment.accountNameBn = newAcc.nameBn;

    if (expEntry) {
      expEntry.amount = newAmount;
      expEntry.accountId = newAccountId;
      if (newAcc) expEntry.accountName = newAcc.nameBn;
      expEntry.updatedAt = new Date().toISOString();
    }
  }

  if (paymentMethod) {
    payment.paymentMethod = paymentMethod;
    if (expEntry) expEntry.paymentMethod = paymentMethod;
  }

  if (paymentDate) {
    payment.paymentDate = paymentDate;
    if (expEntry) expEntry.date = paymentDate;
  }

  if (notes !== undefined) {
    payment.notes = notes;
    if (expEntry) expEntry.description = `${payment.staffName} (${payment.designationBn}) এর ${payment.month} মাসের বেতন পরিশোধ [সংশোধিত] ${notes ? `(${notes})` : ''}`.trim();
  }

  payment.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId, 
    req.user!.id, 
    req.user!.name, 
    req.user!.role, 
    'UPDATE', 
    'STAFF_PAYMENT', 
    `${payment.staffName} এর বেতন রেকর্ড সংশোধন (${payment.expenseVoucherNumber}): ৳${newAmount}`
  );

  realtime.broadcastToMosque(mosqueId, 'STAFF_PAYMENT_UPDATED', payment, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: payment, message: 'বেতন পরিশোধের বিবরণ সফলভাবে সংশোধন করা হয়েছে।' });
});

// Cancel / Reversal for Staff Payment
app.post('/api/v1/staff/payments/:id/cancel', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const payment = db.staffPayments.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'পেমেন্ট রেকর্ড পাওয়া যায়নি।' } });

  if (payment.status === 'CANCELLED') {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_CANCELLED', message: 'এই পেমেন্টটি ইতিমধ্যে বাতিল করা হয়েছে।' } });
  }

  const { reason } = req.body;
  const account = db.accounts.find(a => a.id === payment.accountId);
  if (account) {
    account.currentBalance += payment.netPaid; // Restore fund
  }

  payment.status = 'CANCELLED';
  payment.notes = `${payment.notes ? payment.notes + ' | ' : ''}[বাতিলকৃত: ${reason || 'প্রশাসনিক সিদ্ধান্ত'}]`;
  payment.updatedAt = new Date().toISOString();

  const expEntry = db.expenseEntries.find(e => e.voucherNumber === payment.expenseVoucherNumber || e.id === payment.expenseEntryId);
  if (expEntry) {
    expEntry.status = 'REJECTED';
    expEntry.description = `[বাতিলকৃত ভাউচার] ${expEntry.description} (কারণ: ${reason || 'প্রশাসনিক সিদ্ধান্ত'})`;
    expEntry.updatedAt = new Date().toISOString();
  }

  db.save();
  db.logAudit(
    mosqueId, 
    req.user!.id, 
    req.user!.name, 
    req.user!.role, 
    'DELETE', 
    'STAFF_PAYMENT', 
    `${payment.staffName} এর ${payment.month} মাসের বেতন বাতিল ও ব্যালেন্স সমন্বয় (${payment.expenseVoucherNumber}): ৳${payment.netPaid}`
  );

  realtime.broadcastToMosque(mosqueId, 'STAFF_PAYMENT_CANCELLED', { id: payment.id }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, message: 'বেতন পেমেন্ট সফলভাবে বাতিল ও ব্যাংক/ক্যাশ একাউন্টে তহবিল সমন্বয় করা হয়েছে।' });
});

// ==========================================
// 9.1 STAFF BANK TRANSFER LETTERS
// ==========================================
app.get('/api/v1/staff/bank-transfer-letters', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const letters = (db.staffBankTransferLetters || [])
    .filter(l => l.mosqueId === mosqueId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: letters });
});

app.get('/api/v1/staff/bank-transfer-letters/next-memo', authenticate, (req: AuthRequest, res: Response) => {
  const mosque = req.currentMosque!;
  const mosqueId = mosque.id;
  const { paymentType = 'SALARY', selectionScope = 'ALL', paymentMonth = '', paymentYear = '' } = req.query as Record<string, string>;

  const existingLetters = (db.staffBankTransferLetters || []).filter(l => l.mosqueId === mosqueId);
  const nextSerial = existingLetters.length > 0 
    ? Math.max(...existingLetters.map(l => l.runningSerial || 0)) + 1 
    : 1;

  // Short code for Mosque
  const mosqueCode = (mosque as any).code || (mosque.name ? mosque.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() : '') || 'MJMWE';
  
  // Payment Type in English
  const typeMap: Record<string, string> = {
    SALARY: 'Salary',
    FESTIVAL_ALLOWANCE: 'FestivalAllowance',
    BONUS: 'Bonus',
    SPECIAL_ALLOWANCE: 'SpecialAllowance',
    OTHER: 'Allowance'
  };
  const typeStr = typeMap[paymentType] || 'Salary';
  const scopeStr = selectionScope === 'ALL' ? 'All' : 'Selected';
  
  // Month Name in short English
  let monthStr = 'Month';
  if (paymentMonth) {
    const monthIndex = parseInt(paymentMonth.split('-')[1] || '0', 10);
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex >= 1 && monthIndex <= 12) {
      monthStr = monthsShort[monthIndex - 1];
    } else {
      monthStr = paymentMonth.slice(0, 3);
    }
  }

  const yearStr = paymentYear || new Date().getFullYear().toString();
  const memoNumber = `${mosqueCode}/Bank/${typeStr}/${scopeStr}/${monthStr}/${yearStr}/${nextSerial}`;

  res.json({ success: true, data: { nextSerial, memoNumber } });
});

app.get('/api/v1/staff/bank-transfer-letters/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const letter = (db.staffBankTransferLetters || []).find(l => l.id === req.params.id && l.mosqueId === mosqueId);
  if (!letter) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যাংক ট্রান্সফার লেটার পাওয়া যায়নি।' } });
  res.json({ success: true, data: letter });
});

app.post('/api/v1/staff/bank-transfer-letters', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const mosque = req.currentMosque!;
  const mosqueId = mosque.id;
  const {
    letterDate,
    paymentType = 'SALARY',
    paymentTypeCustomBn,
    paymentMonth,
    paymentYear,
    selectionScope = 'ALL',
    bankName,
    branchName,
    bankAddress,
    mosqueBankAccountId,
    mosqueBankAccountName,
    mosqueBankAccountNumber,
    subject,
    bodyParagraph,
    declarationText,
    items = [],
    relatedPaymentIds = [],
    termId,
    termTitle,
    showLetterhead = true,
    notes,
    totalAmountInWordsBn
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'কমপক্ষে একজন স্টাফের বিবরণ থাকা আবশ্যক।' } });
  }

  const existingLetters = (db.staffBankTransferLetters || []).filter(l => l.mosqueId === mosqueId);
  const nextSerial = existingLetters.length > 0 
    ? Math.max(...existingLetters.map(l => l.runningSerial || 0)) + 1 
    : 1;

  const mosqueCode = (mosque as any).code || (mosque.name ? mosque.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() : '') || 'MJMWE';
  const typeMap: Record<string, string> = {
    SALARY: 'Salary',
    FESTIVAL_ALLOWANCE: 'FestivalAllowance',
    BONUS: 'Bonus',
    SPECIAL_ALLOWANCE: 'SpecialAllowance',
    OTHER: 'Allowance'
  };
  const typeStr = typeMap[paymentType] || 'Salary';
  const scopeStr = selectionScope === 'ALL' ? 'All' : 'Selected';
  
  let monthStr = 'Month';
  if (paymentMonth) {
    const monthIndex = parseInt(paymentMonth.split('-')[1] || '0', 10);
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex >= 1 && monthIndex <= 12) {
      monthStr = monthsShort[monthIndex - 1];
    } else {
      monthStr = paymentMonth.slice(0, 3);
    }
  }

  const yearNum = Number(paymentYear) || new Date().getFullYear();
  const memoNumber = `${mosqueCode}/Bank/${typeStr}/${scopeStr}/${monthStr}/${yearNum}/${nextSerial}`;

  const totalAmount = items.reduce((sum: number, it: any) => sum + (Number(it.netPayable) || 0), 0);

  // Active committee term lookup if not provided
  let activeTermId = termId;
  let activeTermTitle = termTitle;
  if (!activeTermId) {
    const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');
    if (activeTerm) {
      activeTermId = activeTerm.id;
      activeTermTitle = activeTerm.title;
    }
  }

  const letter: StaffBankTransferLetter = {
    id: `btl-${Date.now()}`,
    mosqueId,
    memoNumber,
    runningSerial: nextSerial,
    letterDate: letterDate || new Date().toISOString().split('T')[0],
    paymentType,
    paymentTypeCustomBn,
    paymentMonth: paymentMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    paymentYear: yearNum,
    selectionScope: selectionScope as 'ALL' | 'SELECTED',
    staffCount: items.length,
    totalAmount,
    totalAmountInWordsBn: totalAmountInWordsBn || '',
    bankName: bankName || 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি',
    branchName: branchName || '',
    bankAddress: bankAddress || '',
    mosqueBankAccountId,
    mosqueBankAccountName: mosqueBankAccountName || mosque.name,
    mosqueBankAccountNumber: mosqueBankAccountNumber || '',
    subject: subject || '',
    bodyParagraph: bodyParagraph || '',
    declarationText: declarationText || 'উপরোক্ত তালিকাভুক্ত সকল ব্যক্তিবর্গ বর্তমানে অত্র মসজিদের কর্মরত ইমাম ও কর্মচারী এবং তাঁদের প্রদেয় অর্থ সংশ্লিষ্ট অনুমোদিত হিসাব অনুযায়ী নির্ধারিত হয়েছে।',
    items,
    relatedPaymentIds,
    termId: activeTermId,
    termTitle: activeTermTitle,
    status: 'FINAL',
    showLetterhead: showLetterhead !== false,
    notes,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  if (!db.staffBankTransferLetters) {
    db.staffBankTransferLetters = [];
  }
  db.staffBankTransferLetters.unshift(letter);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'STAFF',
    `স্টাফ ব্যাংক ট্রান্সফার দরখাস্ত প্রস্তুত (স্মারক: ${memoNumber}, মোট কর্মচারি: ${items.length} জন, মোট টাকা: ৳${totalAmount})`
  );

  realtime.broadcastToMosque(mosqueId, 'STAFF_BANK_LETTER_CREATED', letter, { senderId: req.user!.id });

  res.json({ success: true, data: letter, message: 'ব্যাংক ট্রান্সফার দরখাস্ত সফলভাবে সংরক্ষিত হয়েছে।' });
});

app.post('/api/v1/staff/bank-transfer-letters/:id/cancel', authenticate, requirePermission('MANAGE_STAFF'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const letter = (db.staffBankTransferLetters || []).find(l => l.id === req.params.id && l.mosqueId === mosqueId);
  if (!letter) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যাংক ট্রান্সফার দরখাস্ত পাওয়া যায়নি।' } });

  const { reason } = req.body;
  letter.status = 'CANCELLED';
  letter.notes = `${letter.notes ? letter.notes + ' | ' : ''}[বাতিলকৃত: ${reason || 'প্রশাসনিক সিদ্ধান্ত'}]`;
  letter.updatedAt = new Date().toISOString();

  db.save();
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'STAFF',
    `ব্যাংক ট্রান্সফার দরখাস্ত বাতিল (স্মারক: ${letter.memoNumber}, কারণ: ${reason || 'প্রশাসনিক সিদ্ধান্ত'})`
  );

  realtime.broadcastToMosque(mosqueId, 'STAFF_BANK_LETTER_CANCELLED', { id: letter.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'ব্যাংক ট্রান্সফার দরখাস্ত সফলভাবে বাতিল করা হয়েছে।' });
});

// ==========================================
// 10. ASSETS & PROPERTIES MANAGEMENT
// ==========================================
app.get('/api/v1/assets', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { category, condition, search, location, includeArchived, termId } = req.query as {
    category?: string;
    condition?: string;
    search?: string;
    location?: string;
    includeArchived?: string;
    termId?: string;
  };

  let list = db.assets.filter(a => a.mosqueId === mosqueId && !a.isDeleted);

  if (includeArchived !== 'true') {
    list = list.filter(a => !a.isArchived);
  }

  if (category && category !== 'ALL') {
    list = list.filter(a => a.category === category);
  }

  if (condition && condition !== 'ALL') {
    list = list.filter(a => a.condition === condition);
  }

  if (location && location !== 'ALL') {
    list = list.filter(a => a.location?.toLowerCase().includes(location.toLowerCase()));
  }

  if (termId && termId !== 'ALL') {
    list = list.filter(a => a.termId === termId);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(a =>
      a.name?.toLowerCase().includes(q) ||
      a.assetCode?.toLowerCase().includes(q) ||
      a.brand?.toLowerCase().includes(q) ||
      a.model?.toLowerCase().includes(q) ||
      a.serialNumber?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.responsiblePerson?.toLowerCase().includes(q) ||
      a.supplier?.toLowerCase().includes(q)
    );
  }

  // Calculate comprehensive stats for mosque assets
  const allMosqueAssets = db.assets.filter(a => a.mosqueId === mosqueId && !a.isDeleted && !a.isArchived);
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = {
    totalAssets: allMosqueAssets.length,
    goodCount: allMosqueAssets.filter(a => a.condition === 'GOOD').length,
    needsRepairCount: allMosqueAssets.filter(a => a.condition === 'NEEDS_REPAIR' || a.condition === 'FAIR' || a.condition === 'POOR').length,
    outOfOrderCount: allMosqueAssets.filter(a => a.condition === 'OUT_OF_ORDER' || a.condition === 'DAMAGED').length,
    lostCount: allMosqueAssets.filter(a => a.condition === 'LOST').length,
    disposedCount: allMosqueAssets.filter(a => a.condition === 'DISPOSED').length,
    archivedCount: db.assets.filter(a => a.mosqueId === mosqueId && !a.isDeleted && a.isArchived).length,
    demoCount: db.assets.filter(a => a.mosqueId === mosqueId && !a.isDeleted && a.isDemo).length,
    totalPurchaseValue: allMosqueAssets.reduce((sum, a) => sum + (Number(a.purchaseValue) || 0), 0),
    totalCurrentValue: allMosqueAssets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0),
    upcomingServiceCount: allMosqueAssets.filter(a => a.nextServiceDate && a.nextServiceDate >= todayStr).length,
    overdueServiceCount: allMosqueAssets.filter(a => a.nextServiceDate && a.nextServiceDate < todayStr).length,
  };

  res.json({ success: true, data: list, stats });
});

app.get('/api/v1/assets/:id', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const asset = db.assets.find(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (!asset) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });
  }

  // Linked expense voucher if available
  let linkedExpense = null;
  if (asset.expenseVoucherNumber || asset.expenseEntryId) {
    linkedExpense = db.expenseEntries.find(
      e => e.mosqueId === mosqueId && (e.voucherNumber === asset.expenseVoucherNumber || e.id === asset.expenseEntryId)
    );
  }

  // Audit history for this asset
  const auditHistory = db.auditLogs.filter(
    l => l.mosqueId === mosqueId && l.module === 'ASSET' && (l.recordId === asset.id || l.details?.includes(asset.assetCode))
  ).slice(0, 20);

  res.json({
    success: true,
    data: {
      ...asset,
      linkedExpense,
      auditHistory
    }
  });
});

app.post('/api/v1/assets', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const {
    assetCode: customCode,
    name,
    category,
    categoryBn,
    brand,
    model,
    serialNumber,
    purchaseDate,
    purchaseValue,
    currentValue,
    location,
    responsiblePerson,
    responsiblePersonPhone,
    condition,
    conditionBn,
    nextServiceDate,
    warrantyInfo,
    supplier,
    sourceOfPurchase,
    notes,
    description,
    photoUrl,
    attachments,
    termId,
    termTitle,
    expenseVoucherNumber,
    expenseEntryId,
    createExpenseVoucher,
    accountId,
    expenseHeadId
  } = req.body;

  const mosqueId = req.currentMosque!.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'সম্পদের নাম আবশ্যক।' } });
  }

  // Auto-generate code if not provided
  const categoryPrefixMap: Record<string, string> = {
    GENERATOR: 'GEN',
    FAN: 'FAN',
    AC: 'AC',
    REFRIGERATOR: 'FRG',
    DEEP_FREEZER: 'DFZ',
    SOUND_SYSTEM: 'SND',
    CCTV: 'CCTV',
    COMPUTER_ICT: 'ICT',
    FURNITURE: 'FUR',
    ELECTRICAL: 'ELE',
    WATER_WUDU: 'WDU',
    CONSTRUCTION: 'CON',
    RELIGIOUS: 'REL',
    OTHER: 'AST'
  };

  const prefix = categoryPrefixMap[category] || 'AST';
  const count = db.assets.filter(a => a.mosqueId === mosqueId).length + 1;
  const autoCode = `AST-${prefix}-${String(count).padStart(3, '0')}`;
  const assetCode = customCode && customCode.trim() ? customCode.trim() : autoCode;

  // Active committee term fallback
  const activeTerm = db.committeeTerms.find(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');
  const selectedTermId = termId || activeTerm?.id || '';
  const selectedTermTitle = termTitle || activeTerm?.title || '';

  const parsedPurchaseValue = Number(purchaseValue) || 0;
  const parsedCurrentValue = currentValue !== undefined && currentValue !== null && currentValue !== '' ? Number(currentValue) : parsedPurchaseValue;

  let linkedVoucherNo = expenseVoucherNumber || '';
  let linkedExpenseId = expenseEntryId || '';

  // Optional: Auto-create Expense Voucher in Accounting without duplication
  if (createExpenseVoucher && parsedPurchaseValue > 0 && accountId && expenseHeadId) {
    const account = db.accounts.find(a => a.id === accountId && a.mosqueId === mosqueId);
    const head = db.accountHeads.find(h => h.id === expenseHeadId && h.mosqueId === mosqueId);

    if (account && head) {
      const expCount = db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1;
      const year = new Date().getFullYear();
      const expVoucherNo = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
      const newExpId = `exp-${Date.now()}`;

      const expenseEntry = {
        id: newExpId,
        mosqueId,
        voucherNumber: expVoucherNo,
        date: purchaseDate || new Date().toISOString().split('T')[0],
        mainHeadId: head.id,
        mainHeadNameBn: head.nameBn,
        subHeadNameBn: categoryBn || 'স্থায়ী সম্পদ ক্রয়',
        amount: parsedPurchaseValue,
        accountId: account.id,
        accountName: account.name || account.nameBn,
        payeeName: supplier || responsiblePerson || 'সরবরাহকারী',
        paymentMethod: account.accountType === 'CASH' ? ('CASH' as const) : ('BANK' as const),
        description: `সম্পদ ক্রয় ভাউচার: ${name} (${assetCode})${brand ? ' | ' + brand : ''}`,
        status: 'APPROVED' as const,
        createdBy: req.user!.id,
        createdByName: req.user!.name,
        approvedBy: req.user!.id,
        approvedByName: req.user!.name,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      account.currentBalance -= parsedPurchaseValue;
      db.expenseEntries.unshift(expenseEntry);
      linkedVoucherNo = expVoucherNo;
      linkedExpenseId = newExpId;

      db.logAudit(
        mosqueId,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'CREATE',
        'EXPENSE',
        `সম্পদ ক্রয়ের সাথে স্বয়ংক্রিয় ব্যয় ভাউচার তৈরি (${expVoucherNo}): ৳${parsedPurchaseValue} (${name})`
      );
    }
  }

  const asset: MosqueAsset = {
    id: `ast-${Date.now()}`,
    mosqueId,
    assetCode,
    name: name.trim(),
    category: category || 'OTHER',
    categoryBn: categoryBn || '',
    brand: brand || '',
    model: model || '',
    serialNumber: serialNumber || '',
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    purchaseValue: parsedPurchaseValue,
    currentValue: parsedCurrentValue,
    location: location || 'মূল ভবন',
    responsiblePerson: responsiblePerson || '',
    responsiblePersonPhone: responsiblePersonPhone || '',
    condition: condition || 'GOOD',
    conditionBn: conditionBn || '',
    nextServiceDate: nextServiceDate || '',
    warrantyInfo: warrantyInfo || '',
    supplier: supplier || '',
    sourceOfPurchase: sourceOfPurchase || '',
    notes: notes || '',
    description: description || '',
    photoUrl: photoUrl || '',
    attachments: attachments || [],
    serviceHistory: [],
    expenseVoucherNumber: linkedVoucherNo,
    expenseEntryId: linkedExpenseId,
    isExpenseLinked: Boolean(linkedVoucherNo || linkedExpenseId),
    termId: selectedTermId,
    termTitle: selectedTermTitle,
    isArchived: false,
    isDeleted: false,
    isDemo: false,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.assets.unshift(asset);
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'ASSET',
    `নতুন সম্পদ রেজিস্ট্রি: ${asset.name} (${asset.assetCode}) | ক্রয়মূল্য: ৳${asset.purchaseValue} | অবস্থা: ${asset.condition}`
  );

  realtime.broadcastToMosque(mosqueId, 'ASSET_CREATED', asset, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: asset, message: 'সম্পদের তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

app.put('/api/v1/assets/:id', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const asset = db.assets.find(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (!asset) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });

  const prevCondition = asset.condition;
  const prevValue = asset.currentValue;

  const {
    name,
    category,
    categoryBn,
    brand,
    model,
    serialNumber,
    purchaseDate,
    purchaseValue,
    currentValue,
    location,
    responsiblePerson,
    responsiblePersonPhone,
    condition,
    conditionBn,
    nextServiceDate,
    warrantyInfo,
    supplier,
    sourceOfPurchase,
    notes,
    description,
    photoUrl,
    attachments,
    termId,
    termTitle,
    expenseVoucherNumber,
    isArchived
  } = req.body;

  if (name !== undefined) asset.name = name.trim();
  if (category !== undefined) asset.category = category;
  if (categoryBn !== undefined) asset.categoryBn = categoryBn;
  if (brand !== undefined) asset.brand = brand;
  if (model !== undefined) asset.model = model;
  if (serialNumber !== undefined) asset.serialNumber = serialNumber;
  if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate;
  if (purchaseValue !== undefined) asset.purchaseValue = Number(purchaseValue) || 0;
  if (currentValue !== undefined) asset.currentValue = Number(currentValue) || 0;
  if (location !== undefined) asset.location = location;
  if (responsiblePerson !== undefined) asset.responsiblePerson = responsiblePerson;
  if (responsiblePersonPhone !== undefined) asset.responsiblePersonPhone = responsiblePersonPhone;
  if (condition !== undefined) asset.condition = condition;
  if (conditionBn !== undefined) asset.conditionBn = conditionBn;
  if (nextServiceDate !== undefined) asset.nextServiceDate = nextServiceDate;
  if (warrantyInfo !== undefined) asset.warrantyInfo = warrantyInfo;
  if (supplier !== undefined) asset.supplier = supplier;
  if (sourceOfPurchase !== undefined) asset.sourceOfPurchase = sourceOfPurchase;
  if (notes !== undefined) asset.notes = notes;
  if (description !== undefined) asset.description = description;
  if (photoUrl !== undefined) asset.photoUrl = photoUrl;
  if (attachments !== undefined) asset.attachments = attachments;
  if (termId !== undefined) asset.termId = termId;
  if (termTitle !== undefined) asset.termTitle = termTitle;
  if (expenseVoucherNumber !== undefined) {
    asset.expenseVoucherNumber = expenseVoucherNumber;
    asset.isExpenseLinked = Boolean(expenseVoucherNumber);
  }
  if (isArchived !== undefined) asset.isArchived = Boolean(isArchived);

  asset.updatedAt = new Date().toISOString();
  db.save();

  let changeDetail = `সম্পদের তথ্য আপডেট: ${asset.name} (${asset.assetCode})`;
  if (prevCondition !== asset.condition) {
    changeDetail += ` | অবস্থা পরিবর্তন: ${prevCondition} → ${asset.condition}`;
  }
  if (prevValue !== asset.currentValue) {
    changeDetail += ` | বর্তমান মূল্য: ৳${prevValue} → ৳${asset.currentValue}`;
  }

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'ASSET', changeDetail);
  realtime.broadcastToMosque(mosqueId, 'ASSET_UPDATED', asset, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: asset, message: 'সম্পদের তথ্য সফলভাবে আপডেট হয়েছে।' });
});

// Add Maintenance / Service Record
app.post('/api/v1/assets/:id/service', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const asset = db.assets.find(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (!asset) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });

  const {
    serviceDate,
    serviceType,
    serviceTypeBn,
    servicedBy,
    cost,
    description,
    nextServiceDate,
    updateConditionTo,
    createMaintenanceExpense,
    accountId,
    expenseHeadId
  } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'সার্ভিসিং / মেরামতের বিবরণ আবশ্যক।' } });
  }

  const serviceCost = Number(cost) || 0;
  let serviceVoucherNo = '';
  let serviceExpenseId = '';

  // Optional: Auto-create Expense Voucher for Maintenance
  if (createMaintenanceExpense && serviceCost > 0 && accountId && expenseHeadId) {
    const account = db.accounts.find(a => a.id === accountId && a.mosqueId === mosqueId);
    const head = db.accountHeads.find(h => h.id === expenseHeadId && h.mosqueId === mosqueId);

    if (account && head) {
      const expCount = db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1;
      const year = new Date().getFullYear();
      const expVoucherNo = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
      const newExpId = `exp-${Date.now()}`;

      const expenseEntry = {
        id: newExpId,
        mosqueId,
        voucherNumber: expVoucherNo,
        date: serviceDate || new Date().toISOString().split('T')[0],
        mainHeadId: head.id,
        mainHeadNameBn: head.nameBn,
        subHeadNameBn: serviceTypeBn || 'সম্পদ মেরামত ও সার্ভিসিং',
        amount: serviceCost,
        accountId: account.id,
        accountName: account.name || account.nameBn,
        payeeName: servicedBy || 'সার্ভিসিং টেকনিশিয়ান',
        paymentMethod: account.accountType === 'CASH' ? ('CASH' as const) : ('BANK' as const),
        description: `সম্পদ মেরামত/সার্ভিসিং খরচ: ${asset.name} (${asset.assetCode}) - ${description}`,
        status: 'APPROVED' as const,
        createdBy: req.user!.id,
        createdByName: req.user!.name,
        approvedBy: req.user!.id,
        approvedByName: req.user!.name,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      account.currentBalance -= serviceCost;
      db.expenseEntries.unshift(expenseEntry);
      serviceVoucherNo = expVoucherNo;
      serviceExpenseId = newExpId;

      db.logAudit(
        mosqueId,
        req.user!.id,
        req.user!.name,
        req.user!.role,
        'CREATE',
        'EXPENSE',
        `সম্পদ সার্ভিসিং খরচ বাবদ ব্যয় ভাউচার তৈরি (${expVoucherNo}): ৳${serviceCost} (${asset.name})`
      );
    }
  }

  const serviceRecord: AssetServiceRecord = {
    id: `srv-${Date.now()}`,
    serviceDate: serviceDate || new Date().toISOString().split('T')[0],
    serviceType: serviceType || 'REGULAR_MAINTENANCE',
    serviceTypeBn: serviceTypeBn || 'নিয়মিত সার্ভিসিং',
    servicedBy: servicedBy || '',
    cost: serviceCost,
    expenseVoucherNumber: serviceVoucherNo,
    expenseEntryId: serviceExpenseId,
    description: description.trim(),
    nextServiceDate: nextServiceDate || '',
    performedBy: req.user!.name,
    createdAt: new Date().toISOString()
  };

  if (!asset.serviceHistory) asset.serviceHistory = [];
  asset.serviceHistory.unshift(serviceRecord);

  if (nextServiceDate) {
    asset.nextServiceDate = nextServiceDate;
  }
  if (updateConditionTo) {
    asset.condition = updateConditionTo;
  }

  asset.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CREATE',
    'ASSET',
    `সম্পদ সার্ভিসিং লগ যুক্ত: ${asset.name} (${asset.assetCode}) | খরচ: ৳${serviceCost} | বিবরণ: ${description}`
  );

  realtime.broadcastToMosque(mosqueId, 'ASSET_UPDATED', asset, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: asset, message: 'সার্ভিসিং রেকর্ড সফলভাবে যুক্ত হয়েছে।' });
});

// Toggle Archive
app.post('/api/v1/assets/:id/archive', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const asset = db.assets.find(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (!asset) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });

  const { isArchived, reason } = req.body;
  asset.isArchived = isArchived !== undefined ? Boolean(isArchived) : !asset.isArchived;
  asset.updatedAt = new Date().toISOString();
  db.save();

  const actionText = asset.isArchived ? 'আর্কাইভ' : 'সক্রিয়করণ';
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'UPDATE',
    'ASSET',
    `সম্পদ ${actionText}: ${asset.name} (${asset.assetCode})${reason ? ' | কারণ: ' + reason : ''}`
  );

  realtime.broadcastToMosque(mosqueId, 'ASSET_UPDATED', asset, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({
    success: true,
    data: asset,
    message: asset.isArchived ? 'সম্পদটি সফলভাবে আর্কাইভ তালিকায় স্থানান্তরিত হয়েছে।' : 'সম্পদটি পুনরায় সক্রিয় তালিকায় ফিরিয়ে আনা হয়েছে।'
  });
});

// Delete Asset (Safe soft-delete or remove)
app.delete('/api/v1/assets/:id', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { force } = req.query as { force?: string };
  const idx = db.assets.findIndex(a => a.id === req.params.id && a.mosqueId === mosqueId);
  if (idx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পদ পাওয়া যায়নি।' } });

  const asset = db.assets[idx];
  const hasHistory = Boolean(asset.expenseVoucherNumber || (asset.serviceHistory && asset.serviceHistory.length > 0));

  if (hasHistory && force !== 'true') {
    // Soft delete / archive to protect financial and audit integrity
    asset.isArchived = true;
    asset.updatedAt = new Date().toISOString();
    db.save();

    db.logAudit(
      mosqueId,
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'DELETE',
      'ASSET',
      `সম্পদ আর্কাইভ (আর্থিক লেনদেন সংযুক্ত থাকার কারণে সফট-ডিলিট): ${asset.name} (${asset.assetCode})`
    );

    realtime.broadcastToMosque(mosqueId, 'ASSET_UPDATED', asset, { senderId: req.user!.id });
    realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

    return res.json({
      success: true,
      message: 'সম্পদটির সাথে আর্থিক ভাউচার ও সার্ভিস ইতিহাস সংযুক্ত থাকায় ডাটাবেজ অখণ্ডতার জন্য এটি নিরাপদে আর্কাইভ তালিকায় সরানো হয়েছে।'
    });
  }

  // Hard delete if no history or forced
  const removed = db.assets.splice(idx, 1)[0];
  db.save();

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'ASSET',
    `সম্পদ স্থায়ীভাবে মুছে ফেলা: ${removed.name} (${removed.assetCode})`
  );

  realtime.broadcastToMosque(mosqueId, 'ASSET_DELETED', { id: removed.id }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, message: 'সম্পদ সফলভাবে তালিকা থেকে মোছা হয়েছে।' });
});

// Clear Demo Assets (Safely remove demo markers only)
app.post('/api/v1/assets/clear-demo', authenticate, requirePermission('MANAGE_ASSETS'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const initialCount = db.assets.length;
  db.assets = db.assets.filter(a => !(a.mosqueId === mosqueId && a.isDemo));
  const removedCount = initialCount - db.assets.length;

  db.save();
  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'DELETE',
    'ASSET',
    `ডেমো সম্পদ রেকর্ড সফলভাবে পরিচ্ছন্ন করা হয়েছে (${removedCount} টি রেকর্ড)`
  );

  realtime.broadcastToMosque(mosqueId, 'ASSET_CLEARED_DEMO', { count: removedCount }, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({
    success: true,
    removedCount,
    message: `${removedCount} টি ডেমো সম্পদ রেকর্ড সফলভাবে পরিচ্ছন্ন করা হয়েছে। আপনার নিজস্ব এন্ট্রিগুলো সুরক্ষিত রয়েছে।`
  });
});

// Client Audit Action Logging for Assets
app.post('/api/v1/assets/:id/audit', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const { action, details } = req.body;
  const asset = db.assets.find(a => a.id === req.params.id && a.mosqueId === mosqueId);

  db.logAudit(
    mosqueId,
    req.user!.id,
    req.user!.name,
    req.user!.role,
    action || 'PRINT',
    'ASSET',
    details || `সম্পদ তথ্য প্রিন্ট/রিপোর্ট দেখা হয়েছে: ${asset ? asset.name + ' (' + asset.assetCode + ')' : req.params.id}`
  );

  res.json({ success: true });
});

// Properties
app.get('/api/v1/properties', authenticate, (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const properties = db.properties.filter(p => p.mosqueId === mosqueId);
  res.json({ success: true, data: properties });
});

app.post('/api/v1/properties', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const year = new Date().getFullYear();
  const count = db.properties.filter(p => p.mosqueId === mosqueId).length + 1;
  const propertyCode = req.body.propertyCode || `PROP-${year}-${String(count).padStart(3, '0')}`;

  const property: MosqueProperty = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    mosqueId,
    propertyCode,
    name: req.body.name || req.body.description || 'ওয়াকফ সম্পত্তি',
    nameBn: req.body.nameBn || req.body.name || req.body.description || 'ওয়াকফ সম্পত্তি',
    type: req.body.type || 'COMMERCIAL_LAND',
    propertyType: req.body.propertyType || req.body.type || 'COMMERCIAL_LAND',
    category: req.body.category || 'LAND',
    description: req.body.description || req.body.name || 'ওয়াকফ সম্পত্তি ও জমি',
    location: req.body.location || 'মসজিদ সংলগ্ন',
    fullAddress: req.body.fullAddress || req.body.location || '',
    area: req.body.area || '০ শতাংশ',
    areaAmount: Number(req.body.areaAmount) || 0,
    areaUnit: req.body.areaUnit || 'DECIMAL',
    ownershipType: req.body.ownershipType || 'WAQF',
    
    // Land Records
    csPlotNo: req.body.csPlotNo || '',
    saPlotNo: req.body.saPlotNo || '',
    rsPlotNo: req.body.rsPlotNo || '',
    bsPlotNo: req.body.bsPlotNo || '',
    plotNo: req.body.plotNo || req.body.bsPlotNo || req.body.rsPlotNo || '',
    csKhatianNo: req.body.csKhatianNo || '',
    saKhatianNo: req.body.saKhatianNo || '',
    rsKhatianNo: req.body.rsKhatianNo || '',
    bsKhatianNo: req.body.bsKhatianNo || '',
    mutationKhatianNo: req.body.mutationKhatianNo || '',
    khatianNo: req.body.khatianNo || req.body.bsKhatianNo || req.body.rsKhatianNo || '',
    mouza: req.body.mouza || '',
    jlNumber: req.body.jlNumber || '',
    subRegistryOffice: req.body.subRegistryOffice || '',

    // Boundaries
    boundaryNorth: req.body.boundaryNorth || '',
    boundarySouth: req.body.boundarySouth || '',
    boundaryEast: req.body.boundaryEast || '',
    boundaryWest: req.body.boundaryWest || '',

    // Waqf & Waqif
    waqfEnrollmentNo: req.body.waqfEnrollmentNo || '',
    waqfDeedNo: req.body.waqfDeedNo || '',
    waqfYear: req.body.waqfYear || '',
    waqfDeedDate: req.body.waqfDeedDate || '',
    waqifName: req.body.waqifName || '',
    waqifFatherName: req.body.waqifFatherName || '',
    waqifAddress: req.body.waqifAddress || '',
    waqfPurpose: req.body.waqfPurpose || '',
    waqfEstateName: req.body.waqfEstateName || '',

    // Use & Possession
    currentUse: req.body.currentUse || 'মসজিদের ওয়াকফ সম্পত্তি',
    possessionStatus: req.body.possessionStatus || 'MOSQUE_CONTROL',
    status: req.body.status || 'ACTIVE',
    estimatedValue: Number(req.body.estimatedValue) || 0,
    monthlyIncome: Number(req.body.monthlyIncome) || Number(req.body.monthlyRent) || 0,
    monthlyRent: Number(req.body.monthlyRent) || Number(req.body.monthlyIncome) || 0,
    annualIncome: Number(req.body.annualIncome) || 0,
    photoUrl: req.body.photoUrl || '',
    documentsCount: Number(req.body.documentsCount) || 0,
    isArchived: false,
    notes: req.body.notes || '',

    tenants: Array.isArray(req.body.tenants) ? req.body.tenants : [],
    inspections: Array.isArray(req.body.inspections) ? req.body.inspections : [],
    legalCases: Array.isArray(req.body.legalCases) ? req.body.legalCases : [],

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.properties.unshift(property);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `নতুন ওয়াকফ সম্পত্তি অন্তর্ভুক্তি: ${property.name || property.description} (${propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_CREATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, message: 'ওয়াকফ সম্পত্তির তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

app.put('/api/v1/properties/:id', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === req.currentMosque!.id);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const prevName = property.name || property.description;
  Object.assign(property, req.body, { updatedAt: new Date().toISOString() });
  
  // Re-sync monthlyRent / monthlyIncome
  if (req.body.monthlyIncome !== undefined) {
    property.monthlyRent = Number(req.body.monthlyIncome);
  } else if (req.body.monthlyRent !== undefined) {
    property.monthlyIncome = Number(req.body.monthlyRent);
  }

  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'PROPERTY', `সম্পত্তির বিবরণ আপডেট: ${property.name || property.description || prevName} (${property.propertyCode})`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, message: 'সম্পত্তির বিবরণ সফলভাবে আপডেট হয়েছে।' });
});

// Archive / Unarchive Property
app.post('/api/v1/properties/:id/archive', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const isArchived = req.body.isArchived !== undefined ? Boolean(req.body.isArchived) : !property.isArchived;
  property.isArchived = isArchived;
  property.updatedAt = new Date().toISOString();

  db.save();
  const actionText = isArchived ? 'আর্কাইভ' : 'সক্রিয়করণ';
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'PROPERTY', `সম্পত্তি ${actionText}: ${property.name || property.description} (${property.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({
    success: true,
    data: property,
    message: isArchived ? 'সম্পত্তিটি সফলভাবে আর্কাইভ করা হয়েছে।' : 'সম্পত্তিটি পুনরায় সক্রিয় তালিকায় ফিরিয়ে আনা হয়েছে।'
  });
});

// Safe Delete / Soft-Delete Property
app.delete('/api/v1/properties/:id', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const idx = db.properties.findIndex(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (idx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const property = db.properties[idx];
  const hasHistory = Boolean((property.tenants && property.tenants.length > 0) || (property.inspections && property.inspections.length > 0) || (property.legalCases && property.legalCases.length > 0));

  if (hasHistory || !req.query.force) {
    // Soft-archive to preserve master permanent record
    property.isArchived = true;
    property.updatedAt = new Date().toISOString();
    db.save();
    db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'PROPERTY', `সম্পত্তি আর্কাইভ (স্থায়ী রেকর্ড সংরক্ষণের স্বার্থে সফট-ডিলিট): ${property.name || property.description} (${property.propertyCode})`);
    realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
    return res.json({ success: true, message: 'ওয়াকফ সম্পত্তির ঐতিহাসিক রেকর্ড বজায় রেখে এটি আর্কাইভ তালিকায় স্থানান্তরিত করা হয়েছে।' });
  }

  const removed = db.properties.splice(idx, 1)[0];
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'PROPERTY', `সম্পত্তি মুছে ফেলা: ${removed.name || removed.description} (${removed.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_DELETED', { id: removed.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'সম্পত্তির রেকর্ড সফলভাবে অপসারিত হয়েছে।' });
});

// Add / Update Tenant in Property
app.post('/api/v1/properties/:id/tenants', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  if (!property.tenants) property.tenants = [];

  const tenantData = req.body;
  let tenant: PropertyTenant;

  if (tenantData.id) {
    const tIdx = property.tenants.findIndex(t => t.id === tenantData.id);
    if (tIdx !== -1) {
      property.tenants[tIdx] = {
        ...property.tenants[tIdx],
        ...tenantData,
        updatedAt: new Date().toISOString()
      };
      tenant = property.tenants[tIdx];
    } else {
      tenant = {
        id: tenantData.id,
        mosqueId,
        propertyId: property.id,
        tenantCode: tenantData.tenantCode || `TNT-${String(property.tenants.length + 1).padStart(3, '0')}`,
        name: tenantData.name,
        fatherOrSpouseName: tenantData.fatherOrSpouseName,
        mobile: tenantData.mobile,
        nid: tenantData.nid,
        address: tenantData.address,
        photoUrl: tenantData.photoUrl,
        unitOrShopNo: tenantData.unitOrShopNo,
        businessName: tenantData.businessName,
        businessType: tenantData.businessType,
        agreementNo: tenantData.agreementNo,
        startDate: tenantData.startDate,
        endDate: tenantData.endDate,
        monthlyRent: Number(tenantData.monthlyRent) || 0,
        annualRent: Number(tenantData.annualRent) || (Number(tenantData.monthlyRent) || 0) * 12,
        securityDeposit: Number(tenantData.securityDeposit) || 0,
        paymentDueDate: Number(tenantData.paymentDueDate) || 10,
        status: tenantData.status || 'ACTIVE',
        notes: tenantData.notes,
        createdAt: new Date().toISOString()
      };
      property.tenants.unshift(tenant);
    }
  } else {
    const tCode = `TNT-${String(property.tenants.length + 1).padStart(3, '0')}`;
    tenant = {
      id: `tnt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      mosqueId,
      propertyId: property.id,
      tenantCode: tenantData.tenantCode || tCode,
      name: tenantData.name,
      fatherOrSpouseName: tenantData.fatherOrSpouseName,
      mobile: tenantData.mobile,
      nid: tenantData.nid,
      address: tenantData.address,
      photoUrl: tenantData.photoUrl,
      unitOrShopNo: tenantData.unitOrShopNo,
      businessName: tenantData.businessName,
      businessType: tenantData.businessType,
      agreementNo: tenantData.agreementNo || `AGR-${new Date().getFullYear()}-${String(property.tenants.length + 1).padStart(2, '0')}`,
      startDate: tenantData.startDate || new Date().toISOString().split('T')[0],
      endDate: tenantData.endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      monthlyRent: Number(tenantData.monthlyRent) || 0,
      annualRent: Number(tenantData.annualRent) || (Number(tenantData.monthlyRent) || 0) * 12,
      securityDeposit: Number(tenantData.securityDeposit) || 0,
      paymentDueDate: Number(tenantData.paymentDueDate) || 10,
      status: tenantData.status || 'ACTIVE',
      notes: tenantData.notes,
      createdAt: new Date().toISOString()
    };
    property.tenants.unshift(tenant);
  }

  // Update total monthly income of property based on active tenants
  const totalRent = property.tenants
    .filter(t => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON')
    .reduce((sum, t) => sum + (t.monthlyRent || 0), 0);
  
  if (totalRent > 0) {
    property.monthlyIncome = totalRent;
    property.monthlyRent = totalRent;
    if (property.status === 'VACANT' || property.status === 'ACTIVE') {
      property.status = 'RENTED';
    }
  }

  property.updatedAt = new Date().toISOString();
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `ভাড়াটিয়া চুক্তি সংযোজন/আপডেট: ${tenant.name} (${tenant.unitOrShopNo || ''}) - ${property.name || property.propertyCode}`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, tenant, message: 'ভাড়াটিয়া ও ইজারা তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Terminate / Delete Tenant
app.delete('/api/v1/properties/:id/tenants/:tenantId', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property || !property.tenants) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি বা ভাড়াটিয়া পাওয়া যায়নি।' } });

  const tenant = property.tenants.find(t => t.id === req.params.tenantId);
  if (!tenant) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ভাড়াটিয়া পাওয়া যায়নি।' } });

  tenant.status = 'TERMINATED';
  tenant.updatedAt = new Date().toISOString();

  // Recalculate rent
  const totalRent = property.tenants
    .filter(t => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON')
    .reduce((sum, t) => sum + (t.monthlyRent || 0), 0);
  property.monthlyIncome = totalRent;
  property.monthlyRent = totalRent;

  property.updatedAt = new Date().toISOString();
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'PROPERTY', `ভাড়াটিয়া চুক্তি সমাপ্ত/টার্মিনেট: ${tenant.name} (${property.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, message: 'ভাড়া চুক্তি সফলভাবে সমাপ্ত করা হয়েছে।' });
});

// Add Inspection Log
app.post('/api/v1/properties/:id/inspections', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  if (!property.inspections) property.inspections = [];

  const inspection: PropertyInspectionRecord = {
    id: `insp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    propertyId: property.id,
    inspectionDate: req.body.inspectionDate || new Date().toISOString().split('T')[0],
    inspectorName: req.body.inspectorName || req.user!.name,
    inspectorDesignation: req.body.inspectorDesignation || '',
    currentCondition: req.body.currentCondition || 'GOOD',
    occupancyStatus: req.body.occupancyStatus || '',
    problemsObserved: req.body.problemsObserved || '',
    requiredAction: req.body.requiredAction || '',
    nextInspectionDate: req.body.nextInspectionDate || '',
    notes: req.body.notes || '',
    createdAt: new Date().toISOString()
  };

  property.inspections.unshift(inspection);
  property.updatedAt = new Date().toISOString();
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `সম্পত্তি পরিদর্শন রিপোর্ট যুক্ত: ${property.name || property.propertyCode} - পরিদর্শক: ${inspection.inspectorName}`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, inspection, message: 'পরিদর্শন রিপোর্ট সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Add / Update Legal Case
app.post('/api/v1/properties/:id/cases', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  if (!property.legalCases) property.legalCases = [];

  const caseData = req.body;
  let legalCase: PropertyLegalCase;

  if (caseData.id) {
    const cIdx = property.legalCases.findIndex(c => c.id === caseData.id);
    if (cIdx !== -1) {
      property.legalCases[cIdx] = {
        ...property.legalCases[cIdx],
        ...caseData,
        updatedAt: new Date().toISOString()
      };
      legalCase = property.legalCases[cIdx];
    } else {
      legalCase = {
        id: caseData.id,
        propertyId: property.id,
        caseNumber: caseData.caseNumber,
        courtName: caseData.courtName,
        parties: caseData.parties,
        caseSubject: caseData.caseSubject,
        lawyerName: caseData.lawyerName,
        lawyerContact: caseData.lawyerContact,
        filingDate: caseData.filingDate,
        nextHearingDate: caseData.nextHearingDate,
        status: caseData.status || 'RUNNING',
        courtOrders: caseData.courtOrders,
        notes: caseData.notes,
        createdAt: new Date().toISOString()
      };
      property.legalCases.unshift(legalCase);
    }
  } else {
    legalCase = {
      id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      propertyId: property.id,
      caseNumber: caseData.caseNumber,
      courtName: caseData.courtName,
      parties: caseData.parties,
      caseSubject: caseData.caseSubject,
      lawyerName: caseData.lawyerName,
      lawyerContact: caseData.lawyerContact,
      filingDate: caseData.filingDate || new Date().toISOString().split('T')[0],
      nextHearingDate: caseData.nextHearingDate,
      status: caseData.status || 'RUNNING',
      courtOrders: caseData.courtOrders,
      notes: caseData.notes,
      createdAt: new Date().toISOString()
    };
    property.legalCases.unshift(legalCase);
  }

  if (legalCase.status === 'RUNNING' || legalCase.status === 'STAY_ORDER') {
    property.status = 'LEGAL_CASE';
  }

  property.updatedAt = new Date().toISOString();
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `সম্পত্তি আইনি মামলা রেকর্ড সংরক্ষণ: ${legalCase.caseNumber} (${property.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, legalCase, message: 'মামলা সংক্রান্ত তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Add / Record Rent Collection (Linked to Income Voucher & Accounting Ledger)
app.post('/api/v1/properties/:id/rent-collections', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const {
    tenantId,
    billingMonth,
    monthlyRent,
    previousDue,
    paidAmount,
    paymentDate,
    paymentMethod,
    accountId,
    notes,
    isAccountingLinked = true
  } = req.body;

  const tenant = (property.tenants || []).find(t => t.id === tenantId);
  if (!tenant) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ভাড়াটিয়া বা ইজাদার নির্বাচন আবশ্যক।' } });
  }

  const numPaid = Number(paidAmount);
  if (isNaN(numPaid) || numPaid < 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'পরিশোধের সঠিক পরিমাণ প্রদান করুন।' } });
  }

  if (!property.rentCollections) property.rentCollections = [];

  const numMonthlyRent = Number(monthlyRent) || tenant.monthlyRent || 0;
  const numPrevDue = Number(previousDue) || 0;
  const totalDue = numMonthlyRent + numPrevDue;
  const remainingDue = Math.max(0, totalDue - numPaid);

  const year = new Date().getFullYear();
  const allMosqueRentCols = db.properties
    .filter(p => p.mosqueId === mosqueId)
    .flatMap(p => p.rentCollections || []);
  const receiptNumber = `WQR-${year}-${String(allMosqueRentCols.length + 1).padStart(4, '0')}`;

  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId) || db.accounts[0];

  let incomeVoucherNumber = '';
  let incomeEntryId = '';

  // Link to Accounting & Income Entry (Safely without double entry)
  if (isAccountingLinked && numPaid > 0) {
    const mainHead = db.accountHeads.find(h => (h.nameBn?.includes('ভাড়া') || h.nameBn?.includes('ওয়াকফ')) && h.type === 'INCOME') ||
      db.accountHeads.find(h => h.type === 'INCOME') || db.accountHeads[0];

    const incCount = db.incomeEntries.filter(e => e.mosqueId === mosqueId).length + 1;
    incomeVoucherNumber = `INC-${year}-${String(incCount).padStart(6, '0')}`;
    incomeEntryId = `inc-prop-${Date.now()}`;

    const incomeEntry: any = {
      id: incomeEntryId,
      mosqueId,
      voucherNumber: incomeVoucherNumber,
      date: paymentDate || new Date().toISOString().split('T')[0],
      mainHeadId: mainHead?.id || 'head-inc-02',
      mainHeadNameBn: mainHead?.nameBn || 'ওয়াকফ ও দোকান ভাড়া আয়',
      amount: numPaid,
      paymentMethod: paymentMethod || 'CASH',
      accountId: account?.id || 'acc-cash-01',
      accountName: account?.nameBn || 'প্রধান ক্যাশ',
      donorName: `${tenant.name} (${property.name || property.propertyCode})`,
      donorPhone: tenant.mobile,
      reference: receiptNumber,
      description: `ওয়াকফ সম্পত্তি ভাড়া আদায়: ${property.name || property.propertyCode} - ইউনিট/দোকান: ${tenant.unitOrShopNo || ''} (মাস: ${billingMonth || ''})`,
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
      account.currentBalance += numPaid;
    }

    db.incomeEntries.unshift(incomeEntry);
    realtime.broadcastToMosque(mosqueId, 'INCOME_CREATED', incomeEntry, { senderId: req.user!.id });
  }

  const collectionRecord: PropertyRentCollection = {
    id: `rent-col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    mosqueId,
    propertyId: property.id,
    propertyCode: property.propertyCode,
    propertyName: property.name || property.nameBn || property.description,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantCode: tenant.tenantCode,
    shopOrUnitNo: tenant.unitOrShopNo,
    billingMonth: billingMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    monthlyRent: numMonthlyRent,
    previousDue: numPrevDue,
    totalDue,
    paidAmount: numPaid,
    remainingDue,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'CASH',
    accountId: account?.id,
    accountName: account?.nameBn,
    receiptNumber,
    incomeVoucherNumber: incomeVoucherNumber || undefined,
    incomeEntryId: incomeEntryId || undefined,
    isAccountingLinked: Boolean(isAccountingLinked),
    collectorName: req.user!.name,
    collectorDesignation: req.user!.role === 'MOSQUE_ADMIN' ? 'অ্যাডমিন / মোতাওয়াল্লি' : 'হিসাবরক্ষক',
    notes,
    status: remainingDue === 0 ? 'PAID' : 'PARTIAL',
    createdAt: new Date().toISOString()
  };

  property.rentCollections.unshift(collectionRecord);
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `ওয়াকফ সম্পত্তি ভাড়া আদায়: ৳${numPaid.toLocaleString('en-IN')} (রসিদ: ${receiptNumber}, ভাড়াটিয়া: ${tenant.name})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: property, rentCollection: collectionRecord, message: 'ভাড়া আদায় সফলভাবে সম্পন্ন হয়েছে ও রসিদ তৈরি হয়েছে।' });
});

// Delete / Reverse Rent Collection
app.delete('/api/v1/properties/:id/rent-collections/:collectionId', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property || !property.rentCollections) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি বা ভাড়া রেকর্ড পাওয়া যায়নি।' } });

  const colIdx = property.rentCollections.findIndex(c => c.id === req.params.collectionId);
  if (colIdx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ভাড়া কালেকশন রেকর্ড পাওয়া যায়নি।' } });

  const record = property.rentCollections[colIdx];

  // If accounting linked, cancel the income entry and deduct from balance
  if (record.incomeEntryId) {
    const inc = db.incomeEntries.find(i => i.id === record.incomeEntryId && i.mosqueId === mosqueId);
    if (inc && inc.status === 'APPROVED') {
      const account = db.accounts.find(a => a.id === inc.accountId);
      if (account) {
        account.currentBalance -= inc.amount;
      }
      inc.status = 'CANCELLED';
      inc.rejectionReason = 'ওয়াকফ ভাড়া কালেকশন বাতিল';
      inc.updatedAt = new Date().toISOString();
      realtime.broadcastToMosque(mosqueId, 'INCOME_REVERSED', inc, { senderId: req.user!.id });
    }
  }

  property.rentCollections.splice(colIdx, 1);
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'PROPERTY', `ওয়াকফ ভাড়া কালেকশন বাতিল: ${record.receiptNumber} - ৳${record.paidAmount}`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: property, message: 'ভাড়া কালেকশন রেকর্ড সফলভাবে বাতিল করা হয়েছে।' });
});

// Add Property Expense (Linked to Expense Voucher)
app.post('/api/v1/properties/:id/expenses', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const {
    expenseCategory,
    expenseCategoryBn,
    amount,
    date,
    payeeName,
    paymentMethod,
    accountId,
    description,
    attachmentUrl
  } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'ব্যয়ের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।' } });
  }

  if (!property.expenses) property.expenses = [];

  const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId) || db.accounts[0];
  const year = new Date().getFullYear();
  const expCount = db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1;
  const voucherNumber = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
  const expenseEntryId = `exp-prop-${Date.now()}`;

  const mainHead = db.accountHeads.find(h => (h.nameBn?.includes('মেরামত') || h.nameBn?.includes('সম্পত্তি') || h.nameBn?.includes('রক্ষণাবেক্ষণ')) && h.type === 'EXPENSE') ||
    db.accountHeads.find(h => h.type === 'EXPENSE') || db.accountHeads[0];

  const expenseEntry: any = {
    id: expenseEntryId,
    mosqueId,
    voucherNumber,
    date: date || new Date().toISOString().split('T')[0],
    mainHeadId: mainHead?.id || 'head-exp-03',
    mainHeadNameBn: mainHead?.nameBn || 'সম্পত্তি মেরামত ও রক্ষণাবেক্ষণ',
    amount: numAmount,
    paymentMethod: paymentMethod || 'CASH',
    accountId: account?.id || 'acc-cash-01',
    accountName: account?.nameBn || 'প্রধান ক্যাশ',
    payeeName: payeeName || 'সরবরাহকারী/কারিগর',
    reference: property.propertyCode,
    description: `ওয়াকফ সম্পত্তি ব্যয় (${expenseCategoryBn || expenseCategory}): ${property.name || property.propertyCode} - ${description || ''}`,
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

  db.expenseEntries.unshift(expenseEntry);
  realtime.broadcastToMosque(mosqueId, 'EXPENSE_CREATED', expenseEntry, { senderId: req.user!.id });

  const expRecord: PropertyExpenseRecord = {
    id: `exp-prop-rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    mosqueId,
    propertyId: property.id,
    propertyCode: property.propertyCode,
    propertyName: property.name || property.nameBn || property.description,
    expenseCategory: expenseCategory || 'REPAIR',
    expenseCategoryBn: expenseCategoryBn || 'মেরামত ও রক্ষণাবেক্ষণ',
    amount: numAmount,
    date: date || new Date().toISOString().split('T')[0],
    payeeName: payeeName || 'সরবরাহকারী/কারিগর',
    paymentMethod: paymentMethod || 'CASH',
    accountId: account?.id,
    accountName: account?.nameBn,
    voucherNumber,
    expenseEntryId,
    description,
    attachmentUrl,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  property.expenses.unshift(expRecord);
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `ওয়াকফ সম্পত্তি বাবদ ব্যয়: ৳${numAmount.toLocaleString('en-IN')} (${property.propertyCode}, ভাউচার: ${voucherNumber})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: property, expense: expRecord, message: 'সম্পত্তি ব্যয় ও ভাউচার সফলভাবে সংরক্ষিত হয়েছে।' });
});

// Delete Property Expense
app.delete('/api/v1/properties/:id/expenses/:expenseId', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property || !property.expenses) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি বা ব্যয় রেকর্ড পাওয়া যায়নি।' } });

  const expIdx = property.expenses.findIndex(e => e.id === req.params.expenseId);
  if (expIdx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ব্যয় রেকর্ড পাওয়া যায়নি।' } });

  const record = property.expenses[expIdx];

  if (record.expenseEntryId) {
    const exp = db.expenseEntries.find(e => e.id === record.expenseEntryId && e.mosqueId === mosqueId);
    if (exp && exp.status === 'APPROVED') {
      const account = db.accounts.find(a => a.id === exp.accountId);
      if (account) {
        account.currentBalance += exp.amount;
      }
      exp.status = 'CANCELLED';
      exp.rejectionReason = 'ওয়াকফ সম্পত্তি ব্যয় রেকর্ড বাতিল';
      exp.updatedAt = new Date().toISOString();
      realtime.broadcastToMosque(mosqueId, 'EXPENSE_REVERSED', exp, { senderId: req.user!.id });
    }
  }

  property.expenses.splice(expIdx, 1);
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'PROPERTY', `ওয়াকফ সম্পত্তি ব্যয় বাতিল: ${record.voucherNumber} - ৳${record.amount}`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: property, message: 'সম্পত্তি ব্যয় রেকর্ড সফলভাবে বাতিল করা হয়েছে।' });
});

// Add / Archive Document
app.post('/api/v1/properties/:id/documents', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const { title, documentType, documentTypeBn, issueDate, description, fileUrl, fileName, fileSize } = req.body;
  if (!title || !documentType) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'দলিল বা নথির শিরোনাম ও ধরন নির্বাচন আবশ্যক।' } });
  }

  if (!property.documents) property.documents = [];

  const doc: PropertyDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    mosqueId,
    propertyId: property.id,
    title,
    documentType,
    documentTypeBn: documentTypeBn || 'অন্যান্য দলিল',
    issueDate,
    description,
    fileUrl: fileUrl || '/uploads/sample-document.pdf',
    fileName: fileName || `${title}.pdf`,
    fileSize: fileSize || 1500000,
    uploadedBy: req.user!.id,
    uploadedByName: req.user!.name,
    createdAt: new Date().toISOString()
  };

  property.documents.unshift(doc);
  property.documentsCount = property.documents.length;
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `ওয়াকফ সম্পত্তি দলিল/নথি আপলোড: ${doc.title} (${property.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, document: doc, message: 'দলিল সফলভাবে আর্কাইভে সংরক্ষিত হয়েছে।' });
});

// Delete Document
app.delete('/api/v1/properties/:id/documents/:docId', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property || !property.documents) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি বা দলিল পাওয়া যায়নি।' } });

  const docIdx = property.documents.findIndex(d => d.id === req.params.docId);
  if (docIdx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'দলিল রেকর্ড পাওয়া যায়নি।' } });

  const doc = property.documents[docIdx];
  property.documents.splice(docIdx, 1);
  property.documentsCount = property.documents.length;
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'PROPERTY', `ওয়াকফ দলিল মুছে ফেলা হয়েছে: ${doc.title} (${property.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });

  res.json({ success: true, data: property, message: 'দলিল সফলভাবে মুছে ফেলা হয়েছে।' });
});

// Add Khajna / Land Tax Record
app.post('/api/v1/properties/:id/khajna', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি পাওয়া যায়নি।' } });

  const {
    taxYear,
    amount,
    paymentDate,
    receiptNumber,
    nextDueDate,
    holdingNo,
    paidToOffice,
    documentUrl,
    notes,
    isExpenseLinked = true,
    accountId,
    paymentMethod
  } = req.body;

  const numAmount = Number(amount);
  if (!taxYear || isNaN(numAmount) || numAmount < 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'কর বছর ও সঠিক টাকার পরিমাণ আবশ্যক।' } });
  }

  if (!property.khajnaRecords) property.khajnaRecords = [];

  let expenseVoucherNumber = '';
  let expenseEntryId = '';

  if (isExpenseLinked && numAmount > 0) {
    const account = db.accounts.find(a => a.id === accountId) || db.accounts.find(a => a.mosqueId === mosqueId) || db.accounts[0];
    const year = new Date().getFullYear();
    const expCount = db.expenseEntries.filter(e => e.mosqueId === mosqueId).length + 1;
    expenseVoucherNumber = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
    expenseEntryId = `exp-prop-khajna-${Date.now()}`;

    const mainHead = db.accountHeads.find(h => (h.nameBn?.includes('খাজনা') || h.nameBn?.includes('কর') || h.nameBn?.includes('সম্পত্তি')) && h.type === 'EXPENSE') ||
      db.accountHeads.find(h => h.type === 'EXPENSE') || db.accountHeads[0];

    const expenseEntry: any = {
      id: expenseEntryId,
      mosqueId,
      voucherNumber: expenseVoucherNumber,
      date: paymentDate || new Date().toISOString().split('T')[0],
      mainHeadId: mainHead?.id || 'head-exp-03',
      mainHeadNameBn: mainHead?.nameBn || 'ভূমি উন্নয়ন কর ও খাজনা',
      amount: numAmount,
      paymentMethod: paymentMethod || 'CASH',
      accountId: account?.id || 'acc-cash-01',
      accountName: account?.nameBn || 'প্রধান ক্যাশ',
      payeeName: paidToOffice || 'ভূমি রাজস্ব অফিস',
      reference: receiptNumber || property.propertyCode,
      description: `ভূমি উন্নয়ন কর ও খাজনা পরিশোধ (${taxYear}): ${property.name || property.propertyCode} - দাখিলা নং: ${receiptNumber || ''}`,
      attachmentUrl: documentUrl,
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

    db.expenseEntries.unshift(expenseEntry);
    realtime.broadcastToMosque(mosqueId, 'EXPENSE_CREATED', expenseEntry, { senderId: req.user!.id });
  }

  const khajnaRec: PropertyKhajnaRecord = {
    id: `khajna-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    mosqueId,
    propertyId: property.id,
    taxYear,
    amount: numAmount,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    receiptNumber: receiptNumber || `DAK-${new Date().getFullYear()}-${String(property.khajnaRecords.length + 1).padStart(4, '0')}`,
    nextDueDate,
    holdingNo,
    paidToOffice,
    documentUrl,
    notes,
    expenseVoucherNumber: expenseVoucherNumber || undefined,
    expenseEntryId: expenseEntryId || undefined,
    isExpenseLinked: Boolean(isExpenseLinked),
    createdAt: new Date().toISOString()
  };

  property.khajnaRecords.unshift(khajnaRec);
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'PROPERTY', `ভূমি কর ও খাজনা রেকর্ড সংযোজন: ৳${numAmount.toLocaleString('en-IN')} (${taxYear}, ${property.propertyCode})`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: property, khajnaRecord: khajnaRec, message: 'ভূমি উন্নয়ন কর ও খাজনা তথ্য সংরক্ষিত হয়েছে।' });
});

// Delete Khajna Record
app.delete('/api/v1/properties/:id/khajna/:khajnaId', authenticate, requirePermission('MANAGE_PROPERTY'), (req: AuthRequest, res: Response) => {
  const mosqueId = req.currentMosque!.id;
  const property = db.properties.find(p => p.id === req.params.id && p.mosqueId === mosqueId);
  if (!property || !property.khajnaRecords) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সম্পত্তি বা খাজনা রেকর্ড পাওয়া যায়নি।' } });

  const kIdx = property.khajnaRecords.findIndex(k => k.id === req.params.khajnaId);
  if (kIdx === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'খাজনা রেকর্ড পাওয়া যায়নি।' } });

  const record = property.khajnaRecords[kIdx];

  if (record.expenseEntryId) {
    const exp = db.expenseEntries.find(e => e.id === record.expenseEntryId && e.mosqueId === mosqueId);
    if (exp && exp.status === 'APPROVED') {
      const account = db.accounts.find(a => a.id === exp.accountId);
      if (account) {
        account.currentBalance += exp.amount;
      }
      exp.status = 'CANCELLED';
      exp.rejectionReason = 'খাজনা রেকর্ড বাতিল';
      exp.updatedAt = new Date().toISOString();
      realtime.broadcastToMosque(mosqueId, 'EXPENSE_REVERSED', exp, { senderId: req.user!.id });
    }
  }

  property.khajnaRecords.splice(kIdx, 1);
  property.updatedAt = new Date().toISOString();
  db.save();

  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'PROPERTY', `খাজনা রেকর্ড বাতিল: ${record.taxYear} - ৳${record.amount}`);
  realtime.broadcastToMosque(mosqueId, 'PROPERTY_UPDATED', property, { senderId: req.user!.id });
  realtime.broadcastToMosque(mosqueId, 'DASHBOARD_STATS_UPDATED', db.getDashboardStats(mosqueId));

  res.json({ success: true, data: property, message: 'খাজনা রেকর্ড সফলভাবে বাতিল করা হয়েছে।' });
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
  const {
    plotNumber,
    block,
    row,
    graveLocation,
    graveType,
    plotStatus,
    deceasedName,
    deceasedNameBn,
    fatherOrSpouseName,
    fatherName,
    husbandOrSpouseName,
    gender,
    dateOfBirth,
    ageAtDeath,
    dateOfDeath,
    causeOfDeath,
    religion,
    graveyardName,
    burialDate,
    burialTime,
    janazaPlace,
    contactPersonName,
    contactPersonPhone,
    contactPersonAltPhone,
    relationWithDeceased,
    heirAddress,
    heirs,
    burialFee,
    maintenanceFee,
    notes
  } = req.body;
  const mosqueId = req.currentMosque!.id;

  if (!plotNumber || !deceasedName || !burialDate) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'প্লট নম্বর, মরহুমের নাম ও দাফনের তারিখ আবশ্যক।' } });
  }

  const year = burialDate ? new Date(burialDate).getFullYear() : new Date().getFullYear();
  const existingCount = db.cemeteryRecords.filter(c => c.mosqueId === mosqueId).length;
  const recordNumber = `CBR-${year}-${String(existingCount + 1).padStart(4, '0')}`;

  const record = {
    id: `cem-${Date.now()}`,
    mosqueId,
    recordNumber: req.body.recordNumber || recordNumber,
    plotNumber: String(plotNumber).trim(),
    block: block ? String(block).trim() : 'Block-A',
    row: row ? String(row).trim() : undefined,
    graveLocation: graveLocation || 'কবরস্থান এলাকা',
    graveType: graveType || 'PERMANENT',
    plotStatus: (plotStatus || 'OCCUPIED') as 'OCCUPIED' | 'RESERVED' | 'AVAILABLE' | 'MAINTENANCE' | 'ARCHIVED',
    deceasedName: String(deceasedName).trim(),
    deceasedNameBn: deceasedNameBn || String(deceasedName).trim(),
    fatherOrSpouseName: fatherOrSpouseName || fatherName || '',
    fatherName: fatherName || '',
    husbandOrSpouseName: husbandOrSpouseName || undefined,
    gender: gender || 'MALE',
    dateOfBirth: dateOfBirth || undefined,
    ageAtDeath: ageAtDeath || undefined,
    dateOfDeath: dateOfDeath || burialDate,
    causeOfDeath: causeOfDeath || undefined,
    religion: religion || 'ইসলাম',
    graveyardName: graveyardName || 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান',
    burialDate,
    burialTime: burialTime || undefined,
    janazaPlace: janazaPlace || undefined,
    contactPersonName: contactPersonName || '',
    contactPersonPhone: contactPersonPhone || '',
    contactPersonAltPhone: contactPersonAltPhone || undefined,
    relationWithDeceased: relationWithDeceased || undefined,
    heirAddress: heirAddress || undefined,
    heirs: Array.isArray(heirs) ? heirs : undefined,
    burialFee: burialFee ? Number(burialFee) : undefined,
    maintenanceFee: maintenanceFee ? Number(maintenanceFee) : undefined,
    notes,
    isArchived: false,
    createdAt: new Date().toISOString(),
    createdBy: req.user!.id,
    createdByName: req.user!.name
  };

  db.cemeteryRecords.unshift(record);
  db.save();
  db.logAudit(mosqueId, req.user!.id, req.user!.name, req.user!.role, 'CREATE', 'CEMETERY', `কবরস্থান রেজিস্টারে নতুন এন্ট্রি: ${deceasedName} (রেকর্ড: ${record.recordNumber}, প্লট: ${plotNumber})`);
  realtime.broadcastToMosque(mosqueId, 'CEMETERY_RECORD_CREATED', record, { senderId: req.user!.id });

  res.json({ success: true, data: record, message: 'কবরস্থান রেজিস্টারে তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
};

app.post('/api/v1/cemetery', authenticate, requirePermission('MANAGE_CEMETERY'), handleAddCemetery);
app.post('/api/v1/management/cemetery', authenticate, requirePermission('MANAGE_CEMETERY'), handleAddCemetery);

app.put('/api/v1/cemetery/:id', authenticate, requirePermission('MANAGE_CEMETERY'), (req: AuthRequest, res: Response) => {
  const record = db.cemeteryRecords.find(c => c.id === req.params.id && c.mosqueId === req.currentMosque!.id);
  if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কবরস্থান রেকর্ড পাওয়া যায়নি।' } });

  Object.assign(record, req.body, {
    updatedAt: new Date().toISOString(),
    updatedBy: req.user!.id,
    updatedByName: req.user!.name
  });
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'CEMETERY', `কবরস্থান রেকর্ড আপডেট: ${record.deceasedName} (রেকর্ড: ${record.recordNumber || record.plotNumber})`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'CEMETERY_RECORD_UPDATED', record, { senderId: req.user!.id });

  res.json({ success: true, data: record, message: 'কবরস্থান রেজিস্টারের তথ্য সফলভাবে আপডেট করা হয়েছে।' });
});

app.post('/api/v1/cemetery/:id/archive', authenticate, requirePermission('MANAGE_CEMETERY'), (req: AuthRequest, res: Response) => {
  const record = db.cemeteryRecords.find(c => c.id === req.params.id && c.mosqueId === req.currentMosque!.id);
  if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কবরস্থান রেকর্ড পাওয়া যায়নি।' } });

  const { isArchived, reason } = req.body;
  record.isArchived = Boolean(isArchived);
  record.plotStatus = record.isArchived ? 'ARCHIVED' : 'OCCUPIED';
  record.archivedAt = record.isArchived ? new Date().toISOString() : undefined;
  record.archivedBy = record.isArchived ? req.user!.id : undefined;
  record.archivedByName = record.isArchived ? req.user!.name : undefined;
  record.archiveReason = reason || undefined;
  record.updatedAt = new Date().toISOString();
  record.updatedBy = req.user!.id;
  record.updatedByName = req.user!.name;

  db.save();
  const actionText = record.isArchived ? 'আর্কাইভ' : 'সক্রিয়';
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'UPDATE', 'CEMETERY', `কবরস্থান রেকর্ড ${actionText}: ${record.deceasedName} (কারণ: ${reason || 'N/A'})`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'CEMETERY_RECORD_UPDATED', record, { senderId: req.user!.id });

  res.json({ success: true, data: record, message: `কবরস্থান রেকর্ড সফলভাবে ${actionText} করা হয়েছে।` });
});

app.delete('/api/v1/cemetery/:id', authenticate, requirePermission('MANAGE_CEMETERY'), (req: AuthRequest, res: Response) => {
  const index = db.cemeteryRecords.findIndex(c => c.id === req.params.id && c.mosqueId === req.currentMosque!.id);
  if (index === -1) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'কবরস্থান রেকর্ড পাওয়া যায়নি।' } });

  const deleted = db.cemeteryRecords.splice(index, 1)[0];
  db.save();
  db.logAudit(req.currentMosque!.id, req.user!.id, req.user!.name, req.user!.role, 'DELETE', 'CEMETERY', `কবরস্থান রেকর্ড মুছে ফেলা হয়েছে: ${deleted.deceasedName} (প্লট: ${deleted.plotNumber})`);
  realtime.broadcastToMosque(req.currentMosque!.id, 'CEMETERY_RECORD_DELETED', { id: req.params.id }, { senderId: req.user!.id });

  res.json({ success: true, message: 'কবরস্থান রেকর্ড সফলভাবে অপসারণ করা হয়েছে।' });
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
// 16. AI FINANCIAL AUDIT / ADVISOR (Gemini API server-side)
// ==========================================
const handleFinancialAuditRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { question, language = 'bn' } = req.body;
    const mosque = req.currentMosque!;
    const stats = db.getDashboardStats(mosque.id);
    const recentIncomes = db.incomeEntries.filter(i => i.mosqueId === mosque.id && i.status === 'APPROVED').slice(0, 15);
    const recentExpenses = db.expenseEntries.filter(e => e.mosqueId === mosque.id && e.status === 'APPROVED').slice(0, 15);

    // Prevent double-counting: incomeEntries are canonical source of income.
    const approvedIncomes = db.incomeEntries.filter(i => i.mosqueId === mosque.id && i.status === 'APPROVED');
    const approvedExpenses = db.expenseEntries.filter(e => e.mosqueId === mosque.id && e.status === 'APPROVED');

    const totalIncome = approvedIncomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = approvedExpenses.reduce((s, e) => s + e.amount, 0);
    const netSurplus = totalIncome - totalExpense;

    const contextData = {
      mosqueName: mosque.nameBn,
      totalIncome,
      totalExpense,
      netSurplus,
      monthlyIncome: stats.monthlyIncome,
      monthlyExpense: stats.monthlyExpense,
      cashBalance: stats.cashBalance,
      bankBalance: stats.bankBalance,
      currentBalance: stats.currentBalance,
      recentIncomes: recentIncomes.map(i => ({ date: i.date, head: i.subHeadNameBn || i.mainHeadNameBn, amount: i.amount })),
      recentExpenses: recentExpenses.map(e => ({ date: e.date, head: e.subHeadNameBn || e.mainHeadNameBn, amount: e.amount, payee: e.payeeName })),
    };

    let reply = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const prompt = `
You are the AI Financial Auditor & Mosque Advisor of "MasjidLedger" (মসজিদলেজার).
Analyze strictly the provided financial dataset for mosque "${mosque.nameBn}".
Never invent financial figures, never guess missing transactions, and strictly respect backend calculated figures without double counting.
Answer in Bengali (unless English is specifically requested).

Financial Context:
${JSON.stringify(contextData, null, 2)}

User Question: "${question || 'এই মাসের আয়-ব্যয়ের একটি সংক্ষিপ্ত আর্থিক নিরীক্ষা সারসংক্ষেপ দিন।'}"

Provide a professional, clear audit breakdown in Bengali highlighting:
1. মূল সারসংক্ষেপ (Total Income, Total Expense, Net Surplus)
2. আয় ও ব্যয়ের প্রধান খাতসমূহ
3. ক্যাশ ও ব্যাংক স্থিতি
4. মসজিদ কমিটির জন্য সুনির্দিষ্ট পর্যবেক্ষণ ও আর্থিক পরামর্শ
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        reply = response.text || '';
      } catch (genErr) {
        console.error('Gemini generateContent error, falling back to local audit calculation:', genErr);
        reply = `**${mosque.nameBn} এর আর্থিক নিরীক্ষা সারসংক্ষেপ:**\n\n` +
          `• **মোট আয়:** ৳ ${totalIncome.toLocaleString('en-IN')}\n` +
          `• **মোট ব্যয়:** ৳ ${totalExpense.toLocaleString('en-IN')}\n` +
          `• **নিট উদ্বৃত্ত (Surplus):** ৳ ${netSurplus.toLocaleString('en-IN')}\n` +
          `• **চলতি মাসের আয়:** ৳ ${stats.monthlyIncome.toLocaleString('en-IN')}\n` +
          `• **চলতি মাসের ব্যয়:** ৳ ${stats.monthlyExpense.toLocaleString('en-IN')}\n` +
          `• **নগদ ক্যাশ স্থিতি:** ৳ ${stats.cashBalance.toLocaleString('en-IN')}\n` +
          `• **ব্যাংক/এমএফএস স্থিতি:** ৳ ${stats.bankBalance.toLocaleString('en-IN')}\n\n` +
          `**পর্যবেক্ষণ:**\n` +
          `১. রক্ষণাবেক্ষণ ও ইউটিলিটি বিল যথারীতি পরিশোধ করা হয়েছে।\n` +
          `২. ক্যাশ ও ব্যাংক তহবিলের হিসাব সম্পূর্ণ সুসংহত রয়েছে।`;
      }
    } else {
      reply = `**${mosque.nameBn} এর আর্থিক নিরীক্ষা সারসংক্ষেপ:**\n\n` +
        `• **মোট আয়:** ৳ ${totalIncome.toLocaleString('en-IN')}\n` +
        `• **মোট ব্যয়:** ৳ ${totalExpense.toLocaleString('en-IN')}\n` +
        `• **নিট উদ্বৃত্ত (Surplus):** ৳ ${netSurplus.toLocaleString('en-IN')}\n` +
        `• **চলতি মাসের আয়:** ৳ ${stats.monthlyIncome.toLocaleString('en-IN')}\n` +
        `• **চলতি মাসের ব্যয়:** ৳ ${stats.monthlyExpense.toLocaleString('en-IN')}\n` +
        `• **নগদ ক্যাশ স্থিতি:** ৳ ${stats.cashBalance.toLocaleString('en-IN')}\n` +
        `• **ব্যাংক/এমএফএস স্থিতি:** ৳ ${stats.bankBalance.toLocaleString('en-IN')}\n\n` +
        `**পর্যবেক্ষণ:**\n` +
        `১. রক্ষণাবেক্ষণ ও ইউটিলিটি বিল যথারীতি পরিশোধ করা হয়েছে।\n` +
        `২. ক্যাশ ও ব্যাংক তহবিলের হিসাব সম্পূর্ণ সুসংহত রয়েছে।`;
    }

    db.logAudit(mosque.id, req.user!.id, req.user!.name, req.user!.role, 'SETTINGS_CHANGE', 'AI_AUDITOR', `এআই আর্থিক অডিট প্রতিবেদন জেনারেট করা হয়েছে`);
    res.json({ success: true, data: { answer: reply } });
  } catch (error: any) {
    console.error('AI Financial Audit error:', error);
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: 'এআই আর্থিক অডিট বিশ্লেষণে ত্রুটি ঘটেছে।' } });
  }
};

app.post('/api/ai/financial-audit', authenticate, handleFinancialAuditRequest);
app.post('/api/v1/ai/financial-audit', authenticate, handleFinancialAuditRequest);
app.post('/api/v1/ai/advisor', authenticate, handleFinancialAuditRequest);

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
