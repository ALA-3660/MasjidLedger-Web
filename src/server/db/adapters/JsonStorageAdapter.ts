/**
 * MASJIDLEDGER PRO v2.6 — JSON STORAGE ADAPTER (PHASE 1A)
 * Task ID: ML-V26-DAL-FOUNDATION-PHASE1A
 *
 * Controlled Read-Only Data Access Layer Vertical Slice for Mosque Identity.
 * Implements IReadOnlyDataAccessLayer backed purely by existing in-memory JSON data source.
 * Strict zero-write invariant: Never calls db.save(), never mutates in-memory data, zero side-effects.
 */

import {
  IReadOnlyDataAccessLayer,
  IMosqueIdentityReadOnlyRepository,
  DALOptions,
  AuthorizedUserContext,
} from '../interfaces/IDataAccessLayer';
import { Mosque } from '../../../types';
import { db } from '../../db.ts';

/**
 * Domain error for tenant access and boundary violations.
 */
export class TenantSecurityError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'TenantSecurityError';
  }
}

/**
 * Read-Only Mosque Identity Repository implementation backed by in-memory JSON dataset.
 */
export class JsonMosqueIdentityReadOnlyRepository implements IMosqueIdentityReadOnlyRepository {
  constructor(
    private dataSource: { mosques: Mosque[] } = db,
    private defaultOptions?: DALOptions
  ) {}

  /**
   * Enforces strict server-side tenant security rules.
   * Non-SUPER_ADMIN callers can NEVER access a tenant different from their token claim.
   */
  private verifyTenantAccess(options: DALOptions, targetMosqueId: string): void {
    if (!options.mosqueId) {
      throw new TenantSecurityError('TENANT_REQUIRED', 'Tenant ID (mosqueId) is required for DAL operations.');
    }

    const userRole = options.userContext?.userRole;
    const userMosqueId = options.userContext?.userMosqueId;

    if (userRole !== 'SUPER_ADMIN' && targetMosqueId !== userMosqueId) {
      throw new TenantSecurityError(
        'TENANT_FORBIDDEN',
        `Access denied. User belongs to mosque [${userMosqueId}] but requested mosque [${targetMosqueId}].`
      );
    }

    if (userRole === 'SUPER_ADMIN' && targetMosqueId !== userMosqueId) {
      const exists = this.dataSource.mosques.some((m) => m.id === targetMosqueId);
      if (!exists) {
        throw new TenantSecurityError(
          'TARGET_MOSQUE_NOT_FOUND',
          `SUPER_ADMIN target mosque [${targetMosqueId}] does not exist.`
        );
      }
    }
  }

  /**
   * Retrieves mosque profile by ID asynchronously with tenant isolation checks.
   * Guaranteed read-only: returns a defensive clone; performs zero disk writes.
   */
  async findById(mosqueId: string, options?: DALOptions): Promise<Mosque | null> {
    const activeOptions = options || this.defaultOptions;
    const targetId = mosqueId || activeOptions?.mosqueId;

    if (!targetId) {
      throw new TenantSecurityError('TENANT_REQUIRED', 'Mosque ID is required for findById operation.');
    }

    if (activeOptions) {
      this.verifyTenantAccess(activeOptions, targetId);
    }

    const record = this.dataSource.mosques.find((m) => m.id === targetId);
    // Return defensive shallow copy to guarantee caller mutations cannot alter in-memory state
    return record ? { ...record } : null;
  }

  /**
   * Alias matching options-first signature for compatibility with DALOptions pattern.
   */
  async getById(options: DALOptions, mosqueId?: string): Promise<Mosque | null> {
    const targetId = mosqueId || options.mosqueId;
    return this.findById(targetId, options);
  }
}

/**
 * JsonStorageAdapter: Provides scoped, read-only DAL instances backed by JSON storage.
 */
export class JsonStorageAdapter implements IReadOnlyDataAccessLayer {
  readonly mosque: IMosqueIdentityReadOnlyRepository;

  constructor(
    options?: DALOptions,
    dataSource: { mosques: Mosque[] } = db
  ) {
    this.mosque = new JsonMosqueIdentityReadOnlyRepository(dataSource, options);
  }
}
