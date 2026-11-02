/**
 * MASJIDLEDGER PRO v2.6 — DAL CONTEXT MIDDLEWARE (PHASE 1A)
 * Task ID: ML-V26-DAL-FOUNDATION-PHASE1A
 *
 * Injects scoped, tenant-bound IReadOnlyDataAccessLayer instance into Express Request (req.dal).
 * Enforces strict authentication verification, token-bound tenant authorization, and zero bypass.
 */

import { Request, Response, NextFunction } from 'express';
import {
  IReadOnlyDataAccessLayer,
  AuthorizedUserContext,
  DALOptions,
} from '../db/interfaces/IDataAccessLayer';
import { JsonStorageAdapter } from '../db/adapters/JsonStorageAdapter';

// Express Request type augmentation for req.dal
declare global {
  namespace Express {
    interface Request {
      dal?: IReadOnlyDataAccessLayer;
    }
  }
}

/**
 * DAL Context Middleware:
 * Validates authenticated session context and injects request-scoped read-only DAL.
 */
export const dalContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  const currentMosque = (req as any).currentMosque;

  // 1. Strict Authentication Boundary: Verified user and mosque context are mandatory
  if (!user || !currentMosque || !user.id || !currentMosque.id) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'অননুমোদিত অ্যাক্সেস। ডাটা এক্সেস লেয়ারের জন্য অথেনটিকেটেড ইউজার ও মসজিদ কনটেক্সট আবশ্যক।',
      },
    });
  }

  // 2. Strict Tenant Authorization: Non-SUPER_ADMIN must NEVER cross tenant boundaries
  if (user.role !== 'SUPER_ADMIN' && currentMosque.id !== user.mosqueId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_FORBIDDEN',
        message: 'অননুমোদিত মসজিদ অ্যাক্সেস নিষিদ্ধ। আপনি শুধুমাত্র আপনার অনুমোদিত মসজিদের ডাটা ব্যবহার করতে পারেন।',
      },
    });
  }

  // 3. Construct AuthorizedUserContext strictly from verified server credentials
  const userContext: AuthorizedUserContext = {
    userId: user.id,
    userRole: user.role,
    userMosqueId: user.mosqueId,
    permissions: user.permissions || [],
  };

  // 4. Construct authoritative DALOptions
  const dalOptions: DALOptions = {
    mosqueId: currentMosque.id,
    userContext,
    clientIp: req.ip || (req.headers?.['x-forwarded-for'] as string) || '127.0.0.1',
    idempotencyKey: (req as any).idempotencyKey,
  };

  // 5. Bind scoped read-only DAL adapter to request
  req.dal = new JsonStorageAdapter(dalOptions);

  next();
};
