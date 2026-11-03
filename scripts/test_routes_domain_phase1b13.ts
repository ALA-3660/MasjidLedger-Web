process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-32-chars-long-minimum!!';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32-chars-long-minimum!';

import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

// 1. Copy production JSON DB to an isolated temp file BEFORE importing server.ts
const prodDbPath = path.resolve(process.cwd(), 'data', 'masjidledger_db.json');
const prodBeforeSha = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-phase1b13-'));
const tempDbPath = path.join(tempDir, 'masjidledger_db.json');
fs.copyFileSync(prodDbPath, tempDbPath);
process.env.MASJIDLEDGER_DB_PATH = tempDbPath;

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];
function record(id: string, name: string, passed: boolean, detail: string) {
  results.push({ id, name, passed, detail });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${id}] ${name} — ${detail}`);
}

function httpRequest(
  port: number,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  reqPath: string,
  body?: Record<string, any>,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode || 0, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('===================================================================');
  console.log('MASJIDLEDGER PRO — PHASE 1B.13: OPERATIONAL DOMAIN MODULES DAL TEST');
  console.log('===================================================================');

  const { db } = await import('../src/server/db');
  const {
    JsonAssetParityRepository,
    JsonMusalliParityRepository,
    JsonEducationParityRepository,
    JsonLibraryParityRepository,
    JsonStorageAdapter,
  } = await import('../src/server/db/adapters/JsonStorageAdapter');
  const { createDataAccessLayer } = await import('../src/server/db/adapters/dalFactory');
  const { app } = await import('../server');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const port = address.port;

  try {
    const mosque1 = db.mosques[0];
    const mosque1Admin = db.users.find(u => u.mosqueId === mosque1.id && u.role === 'MOSQUE_ADMIN' && u.status === 'ACTIVE') || db.users[0];

    // 1. Verify DAL Factory & Scoped Domain Surface for Phase 1B.13
    const defaultAdapter = createDataAccessLayer({
      dalOptions: {
        mosqueId: mosque1.id,
        userContext: {
          userId: mosque1Admin.id,
          userRole: mosque1Admin.role,
          userMosqueId: mosque1.id,
          permissions: mosque1Admin.permissions || [],
        },
        clientIp: '127.0.0.1',
      },
    });

    record(
      'FACTORY_DEFAULT_ADAPTER',
      'createDataAccessLayer defaults strictly to JsonStorageAdapter',
      defaultAdapter instanceof JsonStorageAdapter,
      `Instance constructor: ${defaultAdapter.constructor.name}`
    );

    record(
      'ASSET_REPO_SURFACE',
      'Assets domain repository is attached to DAL instance',
      defaultAdapter.assets instanceof JsonAssetParityRepository,
      `assets type: ${defaultAdapter.assets?.constructor.name}`
    );

    record(
      'MUSALLI_REPO_SURFACE',
      'Musalli & Donors domain repository is attached to DAL instance',
      defaultAdapter.musalli instanceof JsonMusalliParityRepository,
      `musalli type: ${defaultAdapter.musalli?.constructor.name}`
    );

    record(
      'EDUCATION_REPO_SURFACE',
      'Education domain repository is attached to DAL instance',
      defaultAdapter.education instanceof JsonEducationParityRepository,
      `education type: ${defaultAdapter.education?.constructor.name}`
    );

    record(
      'LIBRARY_REPO_SURFACE',
      'Library domain repository is attached to DAL instance',
      defaultAdapter.library instanceof JsonLibraryParityRepository,
      `library type: ${defaultAdapter.library?.constructor.name}`
    );

    // Setup headers using x-user-id for dev testing
    const m1AuthHeaders = {
      'x-user-id': mosque1Admin.id,
      'x-mosque-id': mosque1.id,
    };

    // -------------------------------------------------------------------
    // Section 8: Assets & Maintenance Tests
    // -------------------------------------------------------------------
    const newAssetRes = await httpRequest(port, 'POST', '/api/v1/assets', {
      name: 'সাউন্ড সিস্টেম স্পিকার (টেস্ট)',
      category: 'ELECTRONICS',
      quantity: 2,
      condition: 'GOOD',
      location: 'প্রধান প্রার্থনা কক্ষ',
    }, m1AuthHeaders);

    record(
      'ASSET_CREATE_200',
      'POST /api/v1/assets creates new asset via req.dal.assets',
      newAssetRes.status === 200 && newAssetRes.body.success === true && Boolean(newAssetRes.body.data?.id),
      `Status: ${newAssetRes.status}, asset id: ${newAssetRes.body.data?.id}`
    );

    const assetId = newAssetRes.body.data?.id;

    const assetsListRes = await httpRequest(port, 'GET', '/api/v1/assets', undefined, m1AuthHeaders);

    record(
      'ASSETS_LIST_200',
      'GET /api/v1/assets returns 200 with list data and stats',
      assetsListRes.status === 200 && assetsListRes.body.success === true && Array.isArray(assetsListRes.body.data),
      `Status: ${assetsListRes.status}, count: ${assetsListRes.body.data?.length}`
    );

    const assetGetRes = await httpRequest(port, 'GET', `/api/v1/assets/${assetId}`, undefined, m1AuthHeaders);

    record(
      'ASSET_BY_ID_200',
      'GET /api/v1/assets/:id returns asset detail and audit history',
      assetGetRes.status === 200 && assetGetRes.body.success === true && assetGetRes.body.data?.id === assetId,
      `Status: ${assetGetRes.status}, asset id: ${assetGetRes.body.data?.id}`
    );

    const assetUnauthRes = await httpRequest(port, 'GET', '/api/v1/assets');
    record(
      'ASSET_UNAUTH_401',
      'GET /api/v1/assets without token is rejected with 401',
      assetUnauthRes.status === 401,
      `Status: ${assetUnauthRes.status}`
    );

    // -------------------------------------------------------------------
    // Section 12: Musalli & Donors Tests
    // -------------------------------------------------------------------
    const areasRes = await httpRequest(port, 'GET', '/api/v1/areas', undefined, m1AuthHeaders);

    record(
      'AREAS_LIST_200',
      'GET /api/v1/areas returns 200 with areas list',
      areasRes.status === 200 && areasRes.body.success === true && Array.isArray(areasRes.body.data),
      `Status: ${areasRes.status}, count: ${areasRes.body.data?.length}`
    );

    const familiesRes = await httpRequest(port, 'GET', '/api/v1/families', undefined, m1AuthHeaders);

    record(
      'FAMILIES_LIST_200',
      'GET /api/v1/families returns 200 with families list',
      familiesRes.status === 200 && familiesRes.body.success === true && Array.isArray(familiesRes.body.data),
      `Status: ${familiesRes.status}, count: ${familiesRes.body.data?.length}`
    );

    const personsRes = await httpRequest(port, 'GET', '/api/v1/persons', undefined, m1AuthHeaders);

    record(
      'PERSONS_LIST_200',
      'GET /api/v1/persons returns 200 with persons list',
      personsRes.status === 200 && personsRes.body.success === true && Array.isArray(personsRes.body.data),
      `Status: ${personsRes.status}, count: ${personsRes.body.data?.length}`
    );

    const musalliStatsRes = await httpRequest(port, 'GET', '/api/v1/musalli/stats', undefined, m1AuthHeaders);

    record(
      'MUSALLI_STATS_200',
      'GET /api/v1/musalli/stats returns aggregate counts',
      musalliStatsRes.status === 200 && musalliStatsRes.body.success === true && typeof musalliStatsRes.body.data?.totalPersons === 'number',
      `Status: ${musalliStatsRes.status}, totalPersons: ${musalliStatsRes.body.data?.totalPersons}`
    );

    // -------------------------------------------------------------------
    // Section 14: Library & Knowledge Center Tests
    // -------------------------------------------------------------------
    const libraryStatsRes = await httpRequest(port, 'GET', '/api/v1/library/dashboard-stats', undefined, m1AuthHeaders);

    record(
      'LIBRARY_STATS_200',
      'GET /api/v1/library/dashboard-stats returns 200',
      libraryStatsRes.status === 200 && libraryStatsRes.body.success === true,
      `Status: ${libraryStatsRes.status}, totalTitles: ${libraryStatsRes.body.data?.totalTitles}`
    );

    const libraryCategoriesRes = await httpRequest(port, 'GET', '/api/v1/library/categories', undefined, m1AuthHeaders);

    record(
      'LIBRARY_CATEGORIES_200',
      'GET /api/v1/library/categories returns categories list',
      libraryCategoriesRes.status === 200 && libraryCategoriesRes.body.success === true && Array.isArray(libraryCategoriesRes.body.data),
      `Status: ${libraryCategoriesRes.status}, count: ${libraryCategoriesRes.body.data?.length}`
    );

    const libraryBookTitlesRes = await httpRequest(port, 'GET', '/api/v1/library/book-titles', undefined, m1AuthHeaders);

    record(
      'LIBRARY_BOOK_TITLES_200',
      'GET /api/v1/library/book-titles returns book titles list',
      libraryBookTitlesRes.status === 200 && libraryBookTitlesRes.body.success === true && Array.isArray(libraryBookTitlesRes.body.data),
      `Status: ${libraryBookTitlesRes.status}, count: ${libraryBookTitlesRes.body.data?.length}`
    );

    // -------------------------------------------------------------------
    // Section 13: Education Foundation Tests
    // -------------------------------------------------------------------
    const eduStatsRes = await httpRequest(port, 'GET', '/api/v1/education/dashboard-stats', undefined, m1AuthHeaders);

    record(
      'EDUCATION_STATS_200',
      'GET /api/v1/education/dashboard-stats returns 200',
      eduStatsRes.status === 200 && eduStatsRes.body.success === true,
      `Status: ${eduStatsRes.status}`
    );

    const eduProgramsRes = await httpRequest(port, 'GET', '/api/v1/education/programs', undefined, m1AuthHeaders);

    record(
      'EDUCATION_PROGRAMS_200',
      'GET /api/v1/education/programs returns 200',
      eduProgramsRes.status === 200 && eduProgramsRes.body.success === true && Array.isArray(eduProgramsRes.body.data),
      `Status: ${eduProgramsRes.status}, count: ${eduProgramsRes.body.data?.length}`
    );

    const eduStudentsRes = await httpRequest(port, 'GET', '/api/v1/education/students', undefined, m1AuthHeaders);

    record(
      'EDUCATION_STUDENTS_200',
      'GET /api/v1/education/students returns 200',
      eduStudentsRes.status === 200 && eduStudentsRes.body.success === true && Array.isArray(eduStudentsRes.body.data),
      `Status: ${eduStudentsRes.status}, count: ${eduStudentsRes.body.data?.length}`
    );

    // -------------------------------------------------------------------
    // Tenant Isolation Tests
    // -------------------------------------------------------------------
    const crossTenantRes = await httpRequest(port, 'GET', '/api/v1/assets', undefined, {
      'x-user-id': mosque1Admin.id,
      'x-mosque-id': 'mosque-forbidden-99',
    });

    record(
      'CROSS_TENANT_ISOLATION',
      'Cross-tenant header spoofing is rejected with 403',
      crossTenantRes.status === 403,
      `Status: ${crossTenantRes.status}`
    );

    // -------------------------------------------------------------------
    // Production File Integrity Guard
    // -------------------------------------------------------------------
    const prodAfterSha = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
    record(
      'PROD_DB_INVARIANCE',
      'Production database file data/masjidledger_db.json SHA-256 is unchanged',
      prodBeforeSha === prodAfterSha,
      `Before: ${prodBeforeSha.slice(0, 12)}..., After: ${prodAfterSha.slice(0, 12)}...`
    );

  } finally {
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const failedCount = results.filter((r) => !r.passed).length;
  console.log('===================================================================');
  console.log(`TEST SUMMARY: ${results.length - failedCount}/${results.length} PASSED`);
  console.log('===================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
