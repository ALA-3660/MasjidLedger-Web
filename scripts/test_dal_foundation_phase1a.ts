/**
 * MASJIDLEDGER PRO v2.6 — DAL FOUNDATION PHASE 1A TEST SUITE
 *
 * Task ID: ML-V26-DAL-FOUNDATION-PHASE1A
 * Verification suite for Mosque Identity Read-Only Vertical Slice & DAL Middleware
 */

import http from 'http';
import { db } from '../src/server/db';
import {
  JsonStorageAdapter,
  TenantSecurityError,
  JsonMosqueIdentityReadOnlyRepository,
} from '../src/server/db/adapters/JsonStorageAdapter';
import { dalContextMiddleware } from '../src/server/middleware/dalContextMiddleware';
import { DALOptions, AuthorizedUserContext } from '../src/server/db/interfaces/IDataAccessLayer';
import { generateAccessToken } from '../src/server/auth/jwt';
import { User, Mosque } from '../src/types';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, evidence: string) {
  const status: 'PASS' | 'FAIL' = passed ? 'PASS' : 'FAIL';
  results.push({ name, status, evidence });
  console.log(`  ${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${name}: ${evidence}`);
}

function makeHttpRequest(
  path: string,
  method: string,
  headers: Record<string, string> = {},
  payload?: any
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : undefined;
    const finalHeaders = { ...headers };
    if (postData) {
      finalHeaders['Content-Type'] = 'application/json';
      finalHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method,
        headers: finalHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const body = JSON.parse(data);
            resolve({ statusCode: res.statusCode || 0, body });
          } catch {
            resolve({ statusCode: res.statusCode || 0, body: data });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runPhase1ATestSuite() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — DAL FOUNDATION PHASE 1A VERIFICATION');
  console.log('Task: ML-V26-DAL-FOUNDATION-PHASE1A');
  console.log('Scope: Read-Only Mosque Identity Vertical Slice & DAL Middleware');
  console.log('================================================================\n');

  // Find sample test entities from existing database
  const sampleMosque1 = db.mosques[0];
  const sampleMosque2 = db.mosques[1] || db.mosques[0];
  const sampleAdminUser = db.users.find((u) => u.role === 'MOSQUE_ADMIN') || db.users[0];
  const sampleSuperAdminUser = db.users.find((u) => u.role === 'SUPER_ADMIN') || db.users[0];

  console.log('--- 1. Mosque Identity Read-Only Repository Tests ---');

  // Test 1: Basic findById returns correct mosque
  try {
    const adapter = new JsonStorageAdapter();
    const result = await adapter.mosque.findById(sampleMosque1.id);
    const passed = Boolean(result && result.id === sampleMosque1.id);
    record('Test 1: Basic findById returns mosque matching ID', passed, `Found id=${result?.id}`);
  } catch (err: any) {
    record('Test 1: Basic findById returns mosque matching ID', false, `Threw error: ${err.message}`);
  }

  // Test 2: Defensive Cloning (mutation immutability)
  try {
    const adapter = new JsonStorageAdapter();
    const result = await adapter.mosque.findById(sampleMosque1.id);
    if (result) {
      const originalName = result.name;
      result.name = 'TAMPERED_NAME';
      const freshRead = db.mosques.find((m) => m.id === sampleMosque1.id);
      const passed = freshRead?.name === originalName && freshRead?.name !== 'TAMPERED_NAME';
      record(
        'Test 2: findById returns defensive copy (zero in-memory corruption)',
        passed,
        `Original name [${freshRead?.name}] remained unmutated`
      );
    } else {
      record('Test 2: findById returns defensive copy', false, 'Mosque record not found');
    }
  } catch (err: any) {
    record('Test 2: findById returns defensive copy', false, `Threw error: ${err.message}`);
  }

  // Test 3: findById with matching tenant options
  try {
    const userContext: AuthorizedUserContext = {
      userId: sampleAdminUser.id,
      userRole: sampleAdminUser.role,
      userMosqueId: sampleAdminUser.mosqueId,
      permissions: sampleAdminUser.permissions || [],
    };
    const options: DALOptions = {
      mosqueId: sampleAdminUser.mosqueId,
      userContext,
    };
    const adapter = new JsonStorageAdapter(options);
    const result = await adapter.mosque.findById(sampleAdminUser.mosqueId, options);
    const passed = Boolean(result && result.id === sampleAdminUser.mosqueId);
    record(
      'Test 3: findById with authorized tenant options succeeds',
      passed,
      `Authorized read for mosque [${result?.id}]`
    );
  } catch (err: any) {
    record('Test 3: findById with authorized tenant options succeeds', false, `Threw error: ${err.message}`);
  }

  console.log('\n--- 2. Tenant Isolation & Rejection Tests ---');

  // Test 4: Cross-tenant access rejection for non-SUPER_ADMIN
  try {
    const userContext: AuthorizedUserContext = {
      userId: 'usr-admin-1',
      userRole: 'MOSQUE_ADMIN',
      userMosqueId: 'mosque-1',
      permissions: [],
    };
    const options: DALOptions = {
      mosqueId: 'mosque-1',
      userContext,
    };
    const repo = new JsonMosqueIdentityReadOnlyRepository(db, options);

    let threwExpected = false;
    let errorCode = '';
    try {
      await repo.findById('mosque-2', options);
    } catch (err: any) {
      if (err instanceof TenantSecurityError && err.code === 'TENANT_FORBIDDEN') {
        threwExpected = true;
        errorCode = err.code;
      }
    }
    record(
      'Test 4: Non-SUPER_ADMIN cross-tenant access is strictly rejected',
      threwExpected,
      `Correctly threw TenantSecurityError: ${errorCode}`
    );
  } catch (err: any) {
    record('Test 4: Non-SUPER_ADMIN cross-tenant access is rejected', false, `Unexpected error: ${err.message}`);
  }

  // Test 5: SUPER_ADMIN cross-tenant access is permitted if target mosque exists
  try {
    const userContext: AuthorizedUserContext = {
      userId: sampleSuperAdminUser.id,
      userRole: 'SUPER_ADMIN',
      userMosqueId: sampleMosque1.id,
      permissions: [],
    };
    const options: DALOptions = {
      mosqueId: sampleMosque1.id,
      userContext,
    };
    const repo = new JsonMosqueIdentityReadOnlyRepository(db, options);
    const result = await repo.findById(sampleMosque2.id, options);
    const passed = Boolean(result && result.id === sampleMosque2.id);
    record(
      'Test 5: SUPER_ADMIN permitted to read target tenant if target exists',
      passed,
      `SUPER_ADMIN accessed target [${result?.id}]`
    );
  } catch (err: any) {
    record('Test 5: SUPER_ADMIN cross-tenant access', false, `Threw error: ${err.message}`);
  }

  // Test 6: SUPER_ADMIN requesting non-existent mosque throws TARGET_MOSQUE_NOT_FOUND
  try {
    const userContext: AuthorizedUserContext = {
      userId: sampleSuperAdminUser.id,
      userRole: 'SUPER_ADMIN',
      userMosqueId: sampleMosque1.id,
      permissions: [],
    };
    const options: DALOptions = {
      mosqueId: sampleMosque1.id,
      userContext,
    };
    const repo = new JsonMosqueIdentityReadOnlyRepository(db, options);

    let threwExpected = false;
    let errorCode = '';
    try {
      await repo.findById('mosque-non-existent-999', options);
    } catch (err: any) {
      if (err instanceof TenantSecurityError && err.code === 'TARGET_MOSQUE_NOT_FOUND') {
        threwExpected = true;
        errorCode = err.code;
      }
    }
    record(
      'Test 6: SUPER_ADMIN requesting non-existent mosque throws TARGET_MOSQUE_NOT_FOUND',
      threwExpected,
      `Correctly threw TenantSecurityError: ${errorCode}`
    );
  } catch (err: any) {
    record('Test 6: SUPER_ADMIN non-existent mosque', false, `Unexpected error: ${err.message}`);
  }

  console.log('\n--- 3. DAL Context Middleware Unit Tests ---');

  // Test 7: Unauthenticated request rejected by dalContextMiddleware
  try {
    const mockReq: any = {};
    let statusCode = 0;
    let responseJson: any = null;
    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseJson = data;
          },
        };
      },
    };
    let nextCalled = false;
    const mockNext = () => {
      nextCalled = true;
    };

    dalContextMiddleware(mockReq, mockRes, mockNext);

    const passed = statusCode === 401 && responseJson?.error?.code === 'UNAUTHORIZED' && !nextCalled;
    record(
      'Test 7: Unauthenticated request to dalContextMiddleware yields 401 UNAUTHORIZED',
      passed,
      `statusCode=${statusCode}, code=${responseJson?.error?.code}, nextCalled=${nextCalled}`
    );
  } catch (err: any) {
    record('Test 7: Unauthenticated request to dalContextMiddleware', false, `Threw error: ${err.message}`);
  }

  // Test 8: Tenant mismatch between user and currentMosque rejected by dalContextMiddleware
  try {
    const mockReq: any = {
      user: { id: 'usr-1', role: 'MOSQUE_ADMIN', mosqueId: 'mosque-1' },
      currentMosque: { id: 'mosque-2' },
    };
    let statusCode = 0;
    let responseJson: any = null;
    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseJson = data;
          },
        };
      },
    };
    let nextCalled = false;
    const mockNext = () => {
      nextCalled = true;
    };

    dalContextMiddleware(mockReq, mockRes, mockNext);

    const passed = statusCode === 403 && responseJson?.error?.code === 'TENANT_FORBIDDEN' && !nextCalled;
    record(
      'Test 8: Tenant mismatch rejected by dalContextMiddleware with 403 TENANT_FORBIDDEN',
      passed,
      `statusCode=${statusCode}, code=${responseJson?.error?.code}, nextCalled=${nextCalled}`
    );
  } catch (err: any) {
    record('Test 8: Tenant mismatch rejected by dalContextMiddleware', false, `Threw error: ${err.message}`);
  }

  // Test 9: Valid authenticated request injects req.dal properly
  try {
    const mockReq: any = {
      user: sampleAdminUser,
      currentMosque: sampleMosque1,
    };
    const mockRes: any = {};
    let nextCalled = false;
    const mockNext = () => {
      nextCalled = true;
    };

    dalContextMiddleware(mockReq, mockRes, mockNext);

    const passed = nextCalled && Boolean(mockReq.dal) && typeof mockReq.dal.mosque?.findById === 'function';
    record(
      'Test 9: Valid request injects req.dal with callable mosque repository',
      passed,
      `nextCalled=${nextCalled}, dalPresent=${Boolean(mockReq.dal)}`
    );
  } catch (err: any) {
    record('Test 9: Valid request injects req.dal', false, `Threw error: ${err.message}`);
  }

  console.log('\n--- 4. Live HTTP Endpoint Tests (/api/v1/dal-health) ---');

  // Test 10: Unauthenticated HTTP request returns 401
  try {
    const res = await makeHttpRequest('/api/v1/dal-health', 'GET');
    const passed = res.statusCode === 401 && res.body?.error?.code === 'UNAUTHORIZED';
    record(
      'Test 10: Live GET /api/v1/dal-health without token returns 401 UNAUTHORIZED',
      passed,
      `HTTP status=${res.statusCode}, error=${res.body?.error?.code}`
    );
  } catch (err: any) {
    record('Test 10: Live GET /api/v1/dal-health without token', false, `Threw error: ${err.message}`);
  }

  // Test 11: Authenticated HTTP request with valid Bearer JWT returns 200 UP
  try {
    // Authenticate with live running server to get an authoritative server-signed JWT
    const loginRes = await makeHttpRequest('/api/v1/auth/login', 'POST', {}, {
      identifier: '01711223344',
      password: 'admin123',
    });

    const authToken = loginRes.body?.data?.token || loginRes.body?.data?.accessToken;
    const res = await makeHttpRequest('/api/v1/dal-health', 'GET', {
      Authorization: `Bearer ${authToken}`,
    });

    const is200 = res.statusCode === 200;
    const isUp = res.body?.status === 'UP';
    const isPhase1A = res.body?.phase === '1A_READ_ONLY_VERTICAL_SLICE';
    const isTenantBound = res.body?.tenantBound === true;
    const isAdapterJson = res.body?.adapter === 'JSON';
    // Check that NO private data, secret, or token is leaked in response
    const leaksSecret = JSON.stringify(res.body).includes('password') || JSON.stringify(res.body).includes('secret');

    const passed = is200 && isUp && isPhase1A && isTenantBound && isAdapterJson && !leaksSecret;
    record(
      'Test 11: Live GET /api/v1/dal-health with valid Bearer JWT returns 200 UP (Safe payload)',
      passed,
      `HTTP status=${res.statusCode}, status=${res.body?.status}, adapter=${res.body?.adapter}, tenantBound=${res.body?.tenantBound}, leakedPrivateData=${leaksSecret}`
    );
  } catch (err: any) {
    record('Test 11: Live GET /api/v1/dal-health with valid Bearer JWT', false, `Threw error: ${err.message}`);
  }

  console.log('\n================================================================');
  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const totalCount = results.length;
  console.log(`PHASE 1A TEST RESULTS: ${passedCount} / ${totalCount} Checks Passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase1ATestSuite().catch((e) => {
  console.error('Test suite failed with unhandled exception:', e);
  process.exit(1);
});
