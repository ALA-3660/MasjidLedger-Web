/**
 * MASJIDLEDGER PRO v2.6 — UNIFIED STORAGE MANAGER & ENGINE SWITCHBOARD
 * Checkpoint 1: Controlled Storage Selection Foundation & Production Fail-Closed Boundary
 */

import { Request } from 'express';
import { db } from '../db.ts';
import { IDataAccessLayer, AuthorizedUserContext, DALOptions } from './interfaces/IDataAccessLayer';

export class StorageManagerError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'StorageManagerError';
  }
}

/**
 * Validates production environment persistence configuration on startup.
 * Strictly enforces that production mode NEVER runs without explicit DATABASE_URL.
 */
export function validateProductionStorageConfiguration(): { valid: boolean; error?: string } {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
      return {
        valid: false,
        error: '[FATAL PERSISTENCE ERROR]: DATABASE_URL environment variable is required in production mode. Silent fallback to JSON is strictly prohibited.',
      };
    }
  }
  return { valid: true };
}

/**
 * Storage Engine Selection Manager.
 * Governs storage engine switching and context-bound DAL instance creation.
 */
export class StorageManager {
  /**
   * Returns true if production PostgreSQL storage is configured and enabled.
   */
  static isPostgresEnabled(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const hasDbUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');

    if (isProd && !hasDbUrl) {
      throw new StorageManagerError(
        'DATABASE_URL_REQUIRED',
        'DATABASE_URL environment variable is required in production mode.'
      );
    }

    return hasDbUrl;
  }

  /**
   * Factory boundary for creating a DAL instance bound to an authenticated HTTP request.
   * Explicitly rejects requests with missing or unauthenticated user contexts.
   */
  static getDAL(req: Request & { user?: any }): IDataAccessLayer {
    const configCheck = validateProductionStorageConfiguration();
    if (!configCheck.valid) {
      throw new StorageManagerError('PRODUCTION_STORAGE_INVALID', configCheck.error || 'Invalid storage configuration');
    }

    if (!req.user || !req.user.id || !req.user.role || !req.user.mosqueId) {
      throw new StorageManagerError(
        'UNAUTHORIZED_CONTEXT',
        'Missing or invalid authenticated user context. Protected operations require signed JWT credentials.'
      );
    }

    const context: AuthorizedUserContext = {
      userId: req.user.id,
      userRole: req.user.role,
      userMosqueId: req.user.mosqueId,
      permissions: req.user.permissions || [],
    };

    // Note: In Checkpoint 1, storageManager provides the factory boundary.
    // Full PostgreSQL repository integration and JSON DAL wrapper will be wired in Checkpoint 2.
    return StorageManager.createJsonDalWrapper(context);
  }

  /**
   * Temporary JSON DAL wrapper for Checkpoint 1 backward compatibility.
   * Maps current db object properties (`db.accounts`, `db.transfers`, etc.) to IDataAccessLayer interface contracts.
   */
  private static createJsonDalWrapper(context: AuthorizedUserContext): IDataAccessLayer {
    return {
      users: {
        findById: async (options, userId) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.users.find(u => u.id === userId && u.mosqueId === options.mosqueId) || null;
        },
        findByPhone: async (options, phone) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.users.find(u => u.phone === phone && u.mosqueId === options.mosqueId) || null;
        },
        listByMosque: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.users.filter(u => u.mosqueId === options.mosqueId);
        },
        createUser: async (options, user) => {
          StorageManager.verifyTenantAccess(options, context);
          const newUser = { ...user, id: `usr-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          db.users.push(newUser as any);
          db.save();
          return newUser as any;
        },
        updateUser: async (options, userId, updates) => {
          StorageManager.verifyTenantAccess(options, context);
          const idx = db.users.findIndex(u => u.id === userId && u.mosqueId === options.mosqueId);
          if (idx === -1) throw new Error('User not found');
          db.users[idx] = { ...db.users[idx], ...updates, updatedAt: new Date().toISOString() };
          db.save();
          return db.users[idx] as any;
        },
      },
      mosque: {
        findById: async (mosqueId) => {
          return db.mosques.find(m => m.id === mosqueId) || null;
        },
        updateSettings: async (options, updates) => {
          StorageManager.verifyTenantAccess(options, context);
          const idx = db.mosques.findIndex(m => m.id === options.mosqueId);
          if (idx === -1) throw new Error('Mosque not found');
          db.mosques[idx] = { ...db.mosques[idx], ...updates, updatedAt: new Date().toISOString() };
          db.save();
          return db.mosques[idx] as any;
        },
      },
      accountHeads: {
        list: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.accountHeads.filter(h => h.mosqueId === options.mosqueId);
        },
        findById: async (options, headId) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.accountHeads.find(h => h.id === headId && h.mosqueId === options.mosqueId) || null;
        },
        create: async (options, head) => {
          StorageManager.verifyTenantAccess(options, context);
          const newHead = { ...head, id: `head-${Date.now()}` };
          db.accountHeads.push(newHead as any);
          db.save();
          return newHead as any;
        },
      },
      financialAccounts: {
        list: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.accounts.filter(a => a.mosqueId === options.mosqueId);
        },
        findById: async (options, accountId) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.accounts.find(a => a.id === accountId && a.mosqueId === options.mosqueId) || null;
        },
        updateBalance: async (options, accountId, newBalance) => {
          StorageManager.verifyTenantAccess(options, context);
          const acc = db.accounts.find(a => a.id === accountId && a.mosqueId === options.mosqueId);
          if (acc) {
            acc.currentBalance = Math.round(newBalance * 100) / 100;
            db.save();
          }
        },
      },
      income: {
        list: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.incomeEntries.filter(i => i.mosqueId === options.mosqueId);
        },
        findById: async (options, entryId) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.incomeEntries.find(i => i.id === entryId && i.mosqueId === options.mosqueId) || null;
        },
        create: async (options, entry) => {
          StorageManager.verifyTenantAccess(options, context);
          const newEntry = { ...entry, id: `inc-${Date.now()}`, voucherNumber: `INC-${Date.now()}` };
          db.incomeEntries.push(newEntry as any);
          db.save();
          return newEntry as any;
        },
        reverse: async (options, entryId, reason) => {
          StorageManager.verifyTenantAccess(options, context);
          const entry = db.incomeEntries.find(i => i.id === entryId && i.mosqueId === options.mosqueId);
          if (!entry) throw new Error('Income entry not found');
          entry.status = 'CANCELLED';
          entry.rejectionReason = reason;
          db.save();
          return entry as any;
        },
      },
      expense: {
        list: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.expenseEntries.filter(e => e.mosqueId === options.mosqueId);
        },
        findById: async (options, entryId) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.expenseEntries.find(e => e.id === entryId && e.mosqueId === options.mosqueId) || null;
        },
        create: async (options, entry) => {
          StorageManager.verifyTenantAccess(options, context);
          const newEntry = { ...entry, id: `exp-${Date.now()}`, voucherNumber: `EXP-${Date.now()}` };
          db.expenseEntries.push(newEntry as any);
          db.save();
          return newEntry as any;
        },
        reverse: async (options, entryId, reason) => {
          StorageManager.verifyTenantAccess(options, context);
          const entry = db.expenseEntries.find(e => e.id === entryId && e.mosqueId === options.mosqueId);
          if (!entry) throw new Error('Expense entry not found');
          entry.status = 'CANCELLED';
          entry.rejectionReason = reason;
          db.save();
          return entry as any;
        },
      },
      transfers: {
        list: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.transfers.filter(t => t.mosqueId === options.mosqueId);
        },
        create: async (options, transfer) => {
          StorageManager.verifyTenantAccess(options, context);
          const newTransfer = { ...transfer, id: `trf-${Date.now()}`, transferNumber: `TRF-${Date.now()}` };
          db.transfers.push(newTransfer as any);
          db.save();
          return newTransfer as any;
        },
      },
      audit: {
        log: async (options, action, entityType, entityId, details, meta) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.logAudit(options.mosqueId, context.userId, context.userId, context.userRole, action as any, entityType, details || '', entityId, options.clientIp, meta) as any;
        },
        list: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.auditLogs.filter(a => a.mosqueId === options.mosqueId);
        },
      },
      committee: {
        getActiveTerm: async (options) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.committeeTerms.find(t => t.mosqueId === options.mosqueId && t.status === 'ACTIVE') || null;
        },
        listMembers: async (options, termId) => {
          StorageManager.verifyTenantAccess(options, context);
          return db.committeeMembers.filter(m => m.mosqueId === options.mosqueId && m.termId === termId);
        },
      },
      executeTransaction: async (work) => {
        // In-memory execution boundary for JSON storage engine
        return await work(StorageManager.createJsonDalWrapper(context));
      },
    };
  }

  /**
   * Enforces server-side tenant authorization.
   * Non-SUPER_ADMIN callers CANNOT access a tenant ID different from their JWT claim.
   */
  private static verifyTenantAccess(options: DALOptions, context: AuthorizedUserContext): void {
    if (!options.mosqueId) {
      throw new StorageManagerError('TENANT_REQUIRED', 'Tenant ID (mosqueId) is required for all DAL operations.');
    }

    if (context.userRole !== 'SUPER_ADMIN' && options.mosqueId !== context.userMosqueId) {
      throw new StorageManagerError(
        'TENANT_FORBIDDEN',
        `Access denied. User belongs to mosque [${context.userMosqueId}] but requested mosque [${options.mosqueId}].`
      );
    }
  }
}
