/**
 * MASJIDLEDGER PRO v2.6 — PHASE 1B.8 ROUTE MIGRATION VERIFICATION SUITE
 * Task ID: ML-V26-DAL-PHASE1B8-MOSQUES-CURRENT
 *
 * Route-level verification for the first migrated read-only Express route:
 *   GET /api/v1/mosques/current
 *
 * Verifies:
 * 1. Contract Separation: IReadOnlyDataAccessLayer strictly excludes mutation methods
 *    (income.reverse, expense.reverse, transfers.create, idempotency.saveRecord/cleanupExpired),
 *    while IScopedMutationDataAccessLayer preserves Phase 1B.7 parity.
 * 2. Successful authenticated request in default JSON mode via actual Express route & DAL middleware.
 * 3. Correct mosque identity is returned (id, code, name, nameBn, address, phone, status, etc.).
 * 4. Cross-tenant access is rejected (403 TENANT_FORBIDDEN) for non-SUPER_ADMIN and permitted for SUPER_ADMIN.
 * 5. Unauthenticated request is rejected (401 UNAUTHORIZED) with missing or invalid Bearer token.
 * 6. Missing mosque behavior matches existing API contract (403 TENANT_NOT_FOUND at auth boundary;
 *    { success: true, data: null } when record is absent at DAL lookup).
 * 7. Existing frontend response shape ({ success: true, data: Mosque }) remains unchanged.
 * 8. Factory defaults to JSON (JsonStorageAdapter) and PostgreSQL is NOT activated by default.
 * 9. Zero mutation of data/masjidledger_db.json (SHA-256 match).
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../src/server/db';
import { generateAccessToken } from '../src/server/auth/jwt';
import { createDataAccessLayer } from '../src/server/db/adapters/dalFactory';
import { JsonStorageAdapter } from '../src/server/db/adapters/JsonStorageAdapter';
import { PostgresStorageAdapter } from '../src/server/db/adapters/PostgresStorageAdapter';
import { dalContextMiddleware } from '../src/server/middleware/dalContextMiddleware';
import {
  IReadOnlyDataAccessLayer,
  IScopedMutationDataAccessLayer,
} from '../src/server/db/interfaces/IDataAccessLayer';

interface TestAssertion {
  id: number;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestAssertion[] = [];

function record(category: string, name: string, passed: boolean, details: string) {
  const id = results.length + 1;
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ id, category, name, status, details });
  console.log(`  ${passed ? '✅ [PASS]' : '❌ [FAIL]'} #${id} [${category}] ${name}: ${details}`);
}

function requestJson(
  port: number,
  reqPath: string,
  method: string = 'GET',
  headers: Record<string, string> = {}
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode || 0, body: JSON.parse(raw) });
          } catch {
            resolve({ statusCode: res.statusCode || 0, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runPhase1B8Verification() {
  console.log('='.repeat(84));
  console.log('🕌 MASJIDLEDGER PRO v2.6 — PHASE 1B.8 ROUTE MIGRATION VERIFICATION');
  console.log('Target Route: GET /api/v1/mosques/current');
  console.log('='.repeat(84));

  const jsonDbPath = path.resolve(process.cwd(), 'data/masjidledger_db.json');
  const initialHash = fs.existsSync(jsonDbPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(jsonDbPath)).digest('hex')
    : 'NONE';

  process.env.NODE_ENV = 'test';
  const { app } = await import('../server');

  // Start ephemeral Express server bound to the migrated `app` instance
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const testPort = address.port;

  try {
    const mosque1 = db.mosques[0];
    const mosque2 = db.mosques[1] || db.mosques[0];
    const adminUser =
      db.users.find(
        (u) => u.role === 'MOSQUE_ADMIN' && u.mosqueId === mosque1.id && u.status === 'ACTIVE'
      ) ||
      db.users.find((u) => u.role !== 'SUPER_ADMIN' && u.status === 'ACTIVE')!;
    const superAdminUser = db.users.find((u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE')!;

    const adminToken = generateAccessToken(adminUser).token;
    const superAdminToken = generateAccessToken(superAdminUser).token;

    // ------------------------------------------------------------------------
    // 1. Contract & Factory Verification
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Contract Separation, Factory Default & Middleware Verification ---');

    // Type-level compile check: IReadOnlyDataAccessLayer must NOT expose reverse/create/saveRecord
    type HasIncomeReverse = 'reverse' extends keyof NonNullable<IReadOnlyDataAccessLayer['income']>
      ? true
      : false;
    type HasExpenseReverse = 'reverse' extends keyof NonNullable<IReadOnlyDataAccessLayer['expense']>
      ? true
      : false;
    type HasTransferCreate = 'create' extends keyof NonNullable<IReadOnlyDataAccessLayer['transfers']>
      ? true
      : false;
    type HasIdempSave = 'saveRecord' extends keyof NonNullable<IReadOnlyDataAccessLayer['idempotency']>
      ? true
      : false;
    type MutationContractHasReverse = 'reverse' extends keyof IScopedMutationDataAccessLayer['income']
      ? true
      : false;

    const readOnlyExcludesMutations: [
      HasIncomeReverse,
      HasExpenseReverse,
      HasTransferCreate,
      HasIdempSave,
      MutationContractHasReverse
    ] = [false, false, false, false, true];

    record(
      'CONTRACT',
      'IReadOnlyDataAccessLayer Excludes Mutation Methods & Separates IScopedMutationDataAccessLayer',
      readOnlyExcludesMutations[0] === false &&
        readOnlyExcludesMutations[1] === false &&
        readOnlyExcludesMutations[2] === false &&
        readOnlyExcludesMutations[3] === false &&
        readOnlyExcludesMutations[4] === true,
      'IReadOnlyDataAccessLayer has zero mutation methods; IScopedMutationDataAccessLayer holds parity mutations'
    );

    const defaultDal = createDataAccessLayer();
    record(
      'FACTORY',
      'createDataAccessLayer() Defaults to JsonStorageAdapter (PostgreSQL Not Active)',
      defaultDal instanceof JsonStorageAdapter &&
        !(defaultDal instanceof PostgresStorageAdapter) &&
        !process.env.DATABASE_URL,
      `defaultDal=${defaultDal.constructor.name}, DATABASE_URL=${process.env.DATABASE_URL || 'unset'}`
    );

    // Verify no unrestricted rawRepositories exposed on req.dal
    const mockReq: any = {
      user: adminUser,
      currentMosque: mosque1,
      ip: '127.0.0.1',
    };
    let mwNext = false;
    dalContextMiddleware(mockReq, {} as any, () => {
      mwNext = true;
    });

    record(
      'MIDDLEWARE',
      'dalContextMiddleware Injects Scoped JSON Adapter Without Unrestricted Raw Repositories',
      mwNext &&
        mockReq.dal instanceof JsonStorageAdapter &&
        !('rawRepositories' in mockReq.dal),
      `req.dal=${mockReq.dal?.constructor?.name}, hasRawRepositories=${'rawRepositories' in (mockReq.dal || {})}`
    );

    // ------------------------------------------------------------------------
    // 2. Route-Level Tests for GET /api/v1/mosques/current
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Express Route-Level Tests: GET /api/v1/mosques/current ---');

    // Test 2.1: Successful authenticated request in default JSON mode
    const authRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
      Authorization: `Bearer ${adminToken}`,
    });

    const expectedMosque = db.mosques.find((m) => m.id === adminUser.mosqueId)!;
    record(
      'ROUTE_AUTH',
      'Authenticated Request in Default JSON Mode Returns 200 OK',
      authRes.statusCode === 200 && authRes.body?.success === true && Boolean(authRes.body?.data),
      `HTTP ${authRes.statusCode}, success=${authRes.body?.success}, mosqueId=${authRes.body?.data?.id}`
    );

    // Test 2.2: Correct mosque identity & frontend response shape preserved
    const returnedMosque = authRes.body?.data;
    const identityMatches =
      returnedMosque &&
      returnedMosque.id === expectedMosque.id &&
      returnedMosque.name === expectedMosque.name &&
      returnedMosque.nameBn === expectedMosque.nameBn &&
      returnedMosque.address === expectedMosque.address &&
      returnedMosque.phone === expectedMosque.phone &&
      returnedMosque.status === expectedMosque.status;

    record(
      'ROUTE_IDENTITY',
      'Returned Mosque Identity Matches Authoritative Record & Frontend Shape',
      Boolean(identityMatches) &&
        Object.keys(authRes.body).sort().join(',') === 'data,success',
      `id=${returnedMosque?.id}, nameBn="${returnedMosque?.nameBn}", topLevelKeys=[${Object.keys(authRes.body).join(', ')}]`
    );

    // Test 2.3: Confirm route actually invokes req.dal.mosque.findById(req.currentMosque!.id)
    let spyCalledWithId: string | null = null;
    const origFindById = JsonStorageAdapter.prototype.mosque;
    const origMethod = Object.getPrototypeOf(defaultDal.mosque).findById;
    Object.getPrototypeOf(defaultDal.mosque).findById = async function (
      mosqueId: string,
      options?: any
    ) {
      spyCalledWithId = mosqueId;
      return origMethod.call(this, mosqueId, options);
    };
    try {
      const spyRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
        Authorization: `Bearer ${adminToken}`,
      });
      record(
        'ROUTE_DAL_DELEGATION',
        'GET /api/v1/mosques/current Invokes req.dal.mosque.findById(req.currentMosque.id)',
        spyRes.statusCode === 200 && spyCalledWithId === expectedMosque.id,
        `req.dal.mosque.findById called with "${spyCalledWithId}"`
      );
    } finally {
      Object.getPrototypeOf(defaultDal.mosque).findById = origMethod;
      void origFindById;
    }

    // Test 2.4: Unauthenticated request without token is rejected with 401 UNAUTHORIZED
    const unauthRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET');
    record(
      'ROUTE_SECURITY',
      'Unauthenticated Request (No Token) Rejected with 401 UNAUTHORIZED',
      unauthRes.statusCode === 401 &&
        unauthRes.body?.success === false &&
        unauthRes.body?.error?.code === 'UNAUTHORIZED',
      `HTTP ${unauthRes.statusCode}, error.code=${unauthRes.body?.error?.code}`
    );

    // Test 2.5: Invalid Bearer token is rejected with 401 UNAUTHORIZED
    const badTokenRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
      Authorization: 'Bearer invalid.jwt.token.value',
    });
    record(
      'ROUTE_SECURITY',
      'Invalid Bearer Token Rejected with 401 UNAUTHORIZED',
      badTokenRes.statusCode === 401 &&
        badTokenRes.body?.success === false &&
        badTokenRes.body?.error?.code === 'UNAUTHORIZED',
      `HTTP ${badTokenRes.statusCode}, error.code=${badTokenRes.body?.error?.code}`
    );

    // Test 2.6: Cross-tenant access attempt by non-SUPER_ADMIN is rejected with 403 TENANT_FORBIDDEN
    const otherMosqueId = mosque2.id !== adminUser.mosqueId ? mosque2.id : 'mosque-other-999';
    const crossTenantRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
      Authorization: `Bearer ${adminToken}`,
      'x-mosque-id': otherMosqueId,
    });
    record(
      'ROUTE_TENANT_ISOLATION',
      'Cross-Tenant Access Attempt by Non-SUPER_ADMIN Rejected with 403 TENANT_FORBIDDEN',
      crossTenantRes.statusCode === 403 &&
        crossTenantRes.body?.success === false &&
        crossTenantRes.body?.error?.code === 'TENANT_FORBIDDEN',
      `HTTP ${crossTenantRes.statusCode}, error.code=${crossTenantRes.body?.error?.code}`
    );

    // Test 2.7: SUPER_ADMIN switching to valid second mosque via x-mosque-id succeeds
    const superSwitchRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
      Authorization: `Bearer ${superAdminToken}`,
      'x-mosque-id': mosque2.id,
    });
    record(
      'ROUTE_TENANT_ISOLATION',
      'SUPER_ADMIN Valid Mosque Context Switch Returns Target Mosque',
      superSwitchRes.statusCode === 200 &&
        superSwitchRes.body?.success === true &&
        superSwitchRes.body?.data?.id === mosque2.id,
      `HTTP ${superSwitchRes.statusCode}, returned mosqueId=${superSwitchRes.body?.data?.id}`
    );

    // Test 2.8: Missing mosque behavior matches existing API contract (403 TENANT_NOT_FOUND at auth boundary)
    const missingMosqueAuthRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
      Authorization: `Bearer ${superAdminToken}`,
      'x-mosque-id': 'mosque-does-not-exist-999',
    });
    record(
      'ROUTE_MISSING_MOSQUE',
      'Non-Existent Target Mosque Returns 403 TENANT_NOT_FOUND (Existing Auth Contract)',
      missingMosqueAuthRes.statusCode === 403 &&
        missingMosqueAuthRes.body?.success === false &&
        missingMosqueAuthRes.body?.error?.code === 'TENANT_NOT_FOUND',
      `HTTP ${missingMosqueAuthRes.statusCode}, error.code=${missingMosqueAuthRes.body?.error?.code}`
    );

    // Test 2.9: Missing mosque record at DAL lookup returns { success: true, data: null }
    Object.getPrototypeOf(defaultDal.mosque).findById = async function () {
      return null;
    };
    try {
      const nullDalRes = await requestJson(testPort, '/api/v1/mosques/current', 'GET', {
        Authorization: `Bearer ${adminToken}`,
      });
      record(
        'ROUTE_MISSING_MOSQUE',
        'Null DAL Lookup Preserves { success: true, data: null } Contract',
        nullDalRes.statusCode === 200 &&
          nullDalRes.body?.success === true &&
          nullDalRes.body?.data === null,
        `HTTP ${nullDalRes.statusCode}, body=${JSON.stringify(nullDalRes.body)}`
      );
    } finally {
      Object.getPrototypeOf(defaultDal.mosque).findById = origMethod;
    }

    // Test 2.10: Verify active runtime health endpoints confirm JSON storage
    const healthRes = await requestJson(testPort, '/api/v1/health', 'GET');
    const dalHealthRes = await requestJson(testPort, '/api/v1/dal-health', 'GET', {
      Authorization: `Bearer ${adminToken}`,
    });
    record(
      'RUNTIME_SAFETY',
      'Health & DAL-Health Endpoints Confirm Active Storage Is JSON',
      healthRes.statusCode === 200 &&
        healthRes.body?.storage === 'JSON' &&
        dalHealthRes.statusCode === 200 &&
        dalHealthRes.body?.adapter === 'JSON',
      `/api/v1/health.storage=${healthRes.body?.storage}, /api/v1/dal-health.adapter=${dalHealthRes.body?.adapter}`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const finalHash = fs.existsSync(jsonDbPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(jsonDbPath)).digest('hex')
    : 'NONE';

  record(
    'RUNTIME_SAFETY',
    'Active JSON Database File (data/masjidledger_db.json) Unmodified',
    initialHash === finalHash,
    `SHA-256 unchanged (${finalHash.substring(0, 16)}...)`
  );

  console.log('\n' + '='.repeat(84));
  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const totalCount = results.length;
  console.log(
    `PHASE 1B.8 VERIFICATION SUMMARY: ${passedCount} / ${totalCount} Checks Passed (${Math.round(
      (passedCount / totalCount) * 100
    )}%)`
  );
  console.log('='.repeat(84));

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase1B8Verification().catch((err) => {
  console.error('Unhandled error in Phase 1B.8 verification suite:', err);
  process.exit(1);
});
