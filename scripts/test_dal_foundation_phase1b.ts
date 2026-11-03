/**
 * MASJIDLEDGER PRO v2.6 — DAL FOUNDATION PHASE 1B.2 VERIFICATION SUITE
 * Task ID: ML-V26-DAL-PHASE1B2-SAFETY-FIX
 *
 * Verifies:
 * 1. DDL Schema compatibility for Income and Expense reversals (status CHECK constraint & rejection_reason column)
 * 2. Secure user creation with bcrypt hash requirement (no placeholder/empty password)
 * 3. Raw repository tenant isolation and active transaction client binding
 * 4. Transaction client propagation and SAVEPOINT-based nested transactions
 * 5. Strict SUPER_ADMIN target mosque existence validation
 * 6. Phase 1A read-only compatibility and DAL factory default
 *
 * NOTE: All tests in this suite run against isolated in-memory mock client and canonical DDL inspection.
 * Real PostgreSQL integration tests remain blocked as no local or containerized PostgreSQL instance is available.
 */

import pg from 'pg';
import {
  PostgresStorageAdapter,
  TenantSecurityError,
  UnsupportedOperationError,
} from '../src/server/db/adapters/PostgresStorageAdapter';
import { createDataAccessLayer } from '../src/server/db/adapters/dalFactory';
import { JsonStorageAdapter } from '../src/server/db/adapters/JsonStorageAdapter';
import { DALOptions, AuthorizedUserContext } from '../src/server/db/interfaces/IDataAccessLayer';
import { POSTGRES_99_TABLES_DDL_SQL } from '../src/server/db/postgres/schema/ddl';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ name, status, details });
  console.log(`  ${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${name}: ${details}`);
}

/**
 * Creates an in-memory mock PostgreSQL client for unit testing adapter logic.
 */
function createMockPostgresClient() {
  const queryLog: string[] = [];
  let isReleased = false;

  const mockClient = {
    queryLog,
    query: async (sqlTextOrConfig: any, params?: any[]) => {
      const sql = typeof sqlTextOrConfig === 'string' ? sqlTextOrConfig : sqlTextOrConfig.text;
      const lower = sql.toLowerCase().trim();
      queryLog.push(sql);

      if (lower === 'begin' || lower === 'commit' || lower === 'rollback') {
        return { rows: [], rowCount: 0 };
      }

      if (lower.startsWith('savepoint') || lower.startsWith('release savepoint') || lower.startsWith('rollback to savepoint')) {
        return { rows: [], rowCount: 0 };
      }

      if (lower.includes('from mosques')) {
        const mosqueId = params?.[0];
        if (mosqueId === 'mosque-nonexistent' || (typeof mosqueId === 'string' && mosqueId.includes('nonexistent'))) {
          return { rows: [], rowCount: 0 };
        }
        return {
          rows: [
            {
              id: mosqueId || 'mosque-1',
              name: 'PG Test Mosque',
              name_bn: 'পিজি টেস্ট মসজিদ',
              address: 'Test Address',
              contact_number: '01700000000',
              email: 'mosque@example.com',
              logo_url: null,
              established_year: '2020',
              registration_number: 'REG-123',
              division: 'Dhaka',
              district: 'Dhaka',
              upazila: 'Mirpur',
              postal_code: '1216',
              letterhead_settings: null,
              prayer_settings: null,
              public_portal_settings: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        };
      }

      if (lower.includes('insert into users')) {
        let perms: string[] = [];
        try {
          if (params?.[8]) {
            perms = typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8];
          }
        } catch {
          perms = [];
        }
        return {
          rows: [
            {
              id: params?.[0] || 'usr-created-1',
              mosque_id: params?.[1] || 'mosque-1',
              username: params?.[2] || null,
              name: params?.[3] || 'Test User',
              phone: params?.[4] || '01700000001',
              email: params?.[5] || null,
              password_hash: params?.[6] || '',
              role: params?.[7] || 'ACCOUNTANT',
              permissions: perms,
              status: params?.[9] || 'ACTIVE',
              last_login: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        };
      }

      if (lower.includes('from users')) {
        return {
          rows: [
            {
              id: params?.[0] || 'usr-pg-1',
              mosque_id: params?.[1] || 'mosque-1',
              username: 'testuser',
              name: 'Test PG User',
              phone: '01700000001',
              email: 'pg@example.com',
              password_hash: '$2b$10$validhashedpasswordforexistingusertesting12345678901234',
              role: 'MOSQUE_ADMIN',
              permissions: ['VIEW_DASHBOARD'],
              status: 'ACTIVE',
              last_login: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        };
      }

      if (lower.includes('from financial_accounts')) {
        return {
          rows: [
            {
              id: 'acc-1',
              mosque_id: params?.[0] || 'mosque-1',
              name: 'General Cash',
              name_bn: 'সাধারণ ক্যাশ',
              account_type: 'CASH',
              opening_balance: '10000.00',
              current_balance: '15000.00',
              status: 'ACTIVE',
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    },
    release: () => {
      isReleased = true;
    },
    getIsReleased: () => isReleased,
  };

  return mockClient as unknown as pg.PoolClient & { queryLog: string[]; getIsReleased: () => boolean };
}

function createMockPostgresPool(mockClient: any) {
  return {
    connect: async () => mockClient,
    query: mockClient.query,
  } as unknown as pg.Pool;
}

async function runPhase1B2TestSuite() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — DAL FOUNDATION PHASE 1B.2 VERIFICATION');
  console.log('Task: ML-V26-DAL-PHASE1B2-SAFETY-FIX');
  console.log('Scope: Adapter Safety Fixes, DDL Reconciliation & Tenant Enforcement');
  console.log('================================================================\n');

  const sampleAdminContext: AuthorizedUserContext = {
    userId: 'usr-admin-1',
    userRole: 'MOSQUE_ADMIN',
    userMosqueId: 'mosque-1',
    permissions: ['VIEW_DASHBOARD', 'CREATE_INCOME', 'MANAGE_ACCOUNTS'],
  };

  const sampleSuperAdminContext: AuthorizedUserContext = {
    userId: 'usr-super-1',
    userRole: 'SUPER_ADMIN',
    userMosqueId: 'mosque-system',
    permissions: [],
  };

  const defaultAdminOptions: DALOptions = {
    mosqueId: 'mosque-1',
    userContext: sampleAdminContext,
    clientIp: '127.0.0.1',
  };

  const defaultSuperAdminOptions: DALOptions = {
    mosqueId: 'mosque-1',
    userContext: sampleSuperAdminContext,
    clientIp: '127.0.0.1',
  };

  // --- 1. Canonical DDL Schema Reconciliation Tests ---
  console.log('--- 1. Canonical DDL Schema Reconciliation Tests ---');

  // Test 1: income_entries table contains rejection_reason column and CANCELLED in status check
  try {
    const incomeBlock = POSTGRES_99_TABLES_DDL_SQL.substring(
      POSTGRES_99_TABLES_DDL_SQL.indexOf('CREATE TABLE IF NOT EXISTS income_entries'),
      POSTGRES_99_TABLES_DDL_SQL.indexOf('CREATE INDEX IF NOT EXISTS idx_income_search')
    );
    const hasRejectionReason = incomeBlock.includes('rejection_reason TEXT');
    const hasCancelledStatus = incomeBlock.includes("'CANCELLED'");

    record(
      'Test 1: Canonical DDL income_entries contains rejection_reason and CANCELLED in status check',
      hasRejectionReason && hasCancelledStatus,
      `rejection_reason: ${hasRejectionReason}, CANCELLED in check: ${hasCancelledStatus}`
    );
  } catch (err: any) {
    record('Test 1: Canonical DDL income_entries schema', false, `Threw error: ${err.message}`);
  }

  // Test 2: expense_entries table contains rejection_reason column and CANCELLED in status check
  try {
    const expenseBlock = POSTGRES_99_TABLES_DDL_SQL.substring(
      POSTGRES_99_TABLES_DDL_SQL.indexOf('CREATE TABLE IF NOT EXISTS expense_entries'),
      POSTGRES_99_TABLES_DDL_SQL.indexOf('CREATE INDEX IF NOT EXISTS idx_expense_search')
    );
    const hasRejectionReason = expenseBlock.includes('rejection_reason TEXT');
    const hasCancelledStatus = expenseBlock.includes("'CANCELLED'");

    record(
      'Test 2: Canonical DDL expense_entries contains rejection_reason and CANCELLED in status check',
      hasRejectionReason && hasCancelledStatus,
      `rejection_reason: ${hasRejectionReason}, CANCELLED in check: ${hasCancelledStatus}`
    );
  } catch (err: any) {
    record('Test 2: Canonical DDL expense_entries schema', false, `Threw error: ${err.message}`);
  }

  // --- 2. Secure User Creation & Password Hash Enforcement Tests ---
  console.log('\n--- 2. Secure User Creation & Password Hash Enforcement Tests ---');

  // Test 3: User creation without passwordHash is rejected
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    let threwUnsupported = false;
    let errMessage = '';
    try {
      await adapter.users.createUser(defaultAdminOptions, {
        mosqueId: 'mosque-1',
        name: 'Accountant User',
        phone: '01711111111',
        role: 'ACCOUNTANT',
        permissions: ['CREATE_INCOME'],
        status: 'ACTIVE',
      });
    } catch (err: any) {
      if (err instanceof UnsupportedOperationError) {
        threwUnsupported = true;
        errMessage = err.message;
      }
    }

    record(
      'Test 3: User creation without valid passwordHash is rejected with UnsupportedOperationError',
      threwUnsupported,
      `Threw expected error: ${errMessage}`
    );
  } catch (err: any) {
    record('Test 3: User creation without password', false, `Unexpected error: ${err.message}`);
  }

  // Test 4: User creation with placeholder passwordHash is rejected
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    let threwUnsupported = false;
    try {
      await adapter.users.createUser(defaultAdminOptions, {
        mosqueId: 'mosque-1',
        name: 'Placeholder User',
        phone: '01722222222',
        role: 'ACCOUNTANT',
        permissions: [],
        status: 'ACTIVE',
        ...({ passwordHash: '$2b$10$placeholder_temporary_hash_to_be_updated' } as any),
      });
    } catch (err: any) {
      if (err instanceof UnsupportedOperationError) {
        threwUnsupported = true;
      }
    }

    record(
      'Test 4: User creation with placeholder password hash is rejected',
      threwUnsupported,
      `Rejected insecure placeholder hash`
    );
  } catch (err: any) {
    record('Test 4: User creation with placeholder', false, `Unexpected error: ${err.message}`);
  }

  // Test 5: User creation with valid bcrypt password hash succeeds
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    const validBcrypt = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'; // 60 chars bcrypt
    const createdUser = await adapter.users.createUser(defaultAdminOptions, {
      mosqueId: 'mosque-1',
      name: 'Valid User',
      phone: '01733333333',
      role: 'ACCOUNTANT',
      permissions: ['CREATE_INCOME'],
      status: 'ACTIVE',
      ...({ passwordHash: validBcrypt } as any),
    });

    const passed = Boolean(createdUser && createdUser.name === 'Valid User');
    record(
      'Test 5: User creation with valid bcrypt password hash succeeds',
      passed,
      `Successfully created user: id=${createdUser.id}, role=${createdUser.role}`
    );
  } catch (err: any) {
    record('Test 5: User creation with valid bcrypt', false, `Threw error: ${err.message}`);
  }

  // --- 3. Tenant Boundary & SUPER_ADMIN Validation Tests ---
  console.log('\n--- 3. Tenant Boundary & SUPER_ADMIN Validation Tests ---');

  // Test 6: Non-SUPER_ADMIN cross-tenant query rejected
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    const crossTenantOptions: DALOptions = {
      mosqueId: 'mosque-2',
      userContext: sampleAdminContext,
    };

    let caughtTenantForbidden = false;
    try {
      await adapter.users.listByMosque(crossTenantOptions);
    } catch (err: any) {
      if (err instanceof TenantSecurityError && err.code === 'TENANT_FORBIDDEN') {
        caughtTenantForbidden = true;
      }
    }

    record(
      'Test 6: Non-SUPER_ADMIN cross-tenant access is rejected with TENANT_FORBIDDEN',
      caughtTenantForbidden,
      `Rejected cross-tenant operation cleanly`
    );
  } catch (err: any) {
    record('Test 6: Cross-tenant access', false, `Unexpected error: ${err.message}`);
  }

  // Test 7: SUPER_ADMIN accessing existing mosque succeeds
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultSuperAdminOptions, mockPool);

    const targetExistingOptions: DALOptions = {
      mosqueId: 'mosque-existing-2',
      userContext: sampleSuperAdminContext,
    };

    const users = await adapter.users.listByMosque(targetExistingOptions);
    record(
      'Test 7: SUPER_ADMIN accessing valid existing target mosque succeeds',
      Array.isArray(users),
      `SUPER_ADMIN verified against existing target mosque`
    );
  } catch (err: any) {
    record('Test 7: SUPER_ADMIN existing mosque', false, `Threw error: ${err.message}`);
  }

  // Test 8: SUPER_ADMIN accessing non-existent target mosque throws TARGET_MOSQUE_NOT_FOUND
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultSuperAdminOptions, mockPool);

    const targetNonexistentOptions: DALOptions = {
      mosqueId: 'mosque-nonexistent',
      userContext: sampleSuperAdminContext,
    };

    let caughtNotFound = false;
    let errCode = '';
    try {
      await adapter.users.listByMosque(targetNonexistentOptions);
    } catch (err: any) {
      if (err instanceof TenantSecurityError && err.code === 'TARGET_MOSQUE_NOT_FOUND') {
        caughtNotFound = true;
        errCode = err.code;
      }
    }

    record(
      'Test 8: SUPER_ADMIN accessing non-existent target mosque throws TARGET_MOSQUE_NOT_FOUND',
      caughtNotFound,
      `Threw expected TenantSecurityError with code=${errCode}`
    );
  } catch (err: any) {
    record('Test 8: SUPER_ADMIN non-existent mosque', false, `Unexpected error: ${err.message}`);
  }

  // --- 4. Raw Repository Tenant Isolation Tests ---
  console.log('\n--- 4. Raw Repository Tenant Isolation Tests ---');

  // Test 9: Raw repository direct access rejects cross-tenant query
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    let caughtForbidden = false;
    try {
      // Direct raw repository access targeting mosque-forbidden
      await adapter.rawRepositories.users.findById('usr-1', 'mosque-forbidden');
    } catch (err: any) {
      if (err instanceof TenantSecurityError && err.code === 'TENANT_FORBIDDEN') {
        caughtForbidden = true;
      }
    }

    record(
      'Test 9: Direct raw repository access enforces tenant security and rejects cross-tenant queries',
      caughtForbidden,
      `Prevented tenant isolation bypass via rawRepositories`
    );
  } catch (err: any) {
    record('Test 9: Raw repo tenant boundary', false, `Unexpected error: ${err.message}`);
  }

  // Test 10: Raw repository access without DALOptions throws TENANT_REQUIRED
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const unconfiguredAdapter = new PostgresStorageAdapter(undefined, mockPool);

    let caughtRequired = false;
    try {
      await unconfiguredAdapter.rawRepositories.users.findById('usr-1', 'mosque-1');
    } catch (err: any) {
      if (err instanceof TenantSecurityError && err.code === 'TENANT_REQUIRED') {
        caughtRequired = true;
      }
    }

    record(
      'Test 10: Raw repository access without DALOptions context throws TENANT_REQUIRED',
      caughtRequired,
      `Enforced fail-closed security when DALOptions missing`
    );
  } catch (err: any) {
    record('Test 10: Raw repo unconfigured options', false, `Unexpected error: ${err.message}`);
  }

  // --- 5. Transaction & Nested SAVEPOINT Tests ---
  console.log('\n--- 5. Transaction Execution & Nested SAVEPOINT Tests ---');

  // Test 11: executeTransaction begins, propagates client, and commits
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    const txResult = await adapter.executeTransaction(async (txDal) => {
      await txDal.users.findById(defaultAdminOptions, 'usr-pg-1');
      return { success: true };
    });

    const hasBegin = mockClient.queryLog.includes('BEGIN');
    const hasCommit = mockClient.queryLog.includes('COMMIT');
    const isReleased = mockClient.getIsReleased();

    record(
      'Test 11: executeTransaction executes BEGIN and COMMIT and releases client in finally block',
      Boolean(txResult.success && hasBegin && hasCommit && isReleased),
      `BEGIN: ${hasBegin}, COMMIT: ${hasCommit}, Released: ${isReleased}`
    );
  } catch (err: any) {
    record('Test 11: Transaction execution', false, `Threw error: ${err.message}`);
  }

  // Test 12: executeTransaction rollback on error
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    let caughtError = false;
    try {
      await adapter.executeTransaction(async (txDal) => {
        await txDal.users.findById(defaultAdminOptions, 'usr-pg-1');
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err: any) {
      if (err.message === 'SIMULATED_TRANSACTION_FAILURE') {
        caughtError = true;
      }
    }

    const hasRollback = mockClient.queryLog.includes('ROLLBACK');
    const isReleased = mockClient.getIsReleased();

    record(
      'Test 12: Transaction failure triggers ROLLBACK and releases client without swallowing error',
      Boolean(caughtError && hasRollback && isReleased),
      `Caught: ${caughtError}, ROLLBACK: ${hasRollback}, Released: ${isReleased}`
    );
  } catch (err: any) {
    record('Test 12: Transaction rollback', false, `Threw error: ${err.message}`);
  }

  // Test 13: Nested executeTransaction employs SAVEPOINT and RELEASE SAVEPOINT
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    await adapter.executeTransaction(async (outerTx) => {
      await outerTx.users.findById(defaultAdminOptions, 'usr-1');

      // Nested transaction block
      await outerTx.executeTransaction(async (innerTx) => {
        await innerTx.users.findById(defaultAdminOptions, 'usr-1');
        return true;
      });

      return true;
    });

    const hasSavepoint = mockClient.queryLog.some((q) => q.toUpperCase().includes('SAVEPOINT SP_'));
    const hasReleaseSavepoint = mockClient.queryLog.some((q) => q.toUpperCase().includes('RELEASE SAVEPOINT SP_'));

    record(
      'Test 13: Nested executeTransaction employs SAVEPOINT and RELEASE SAVEPOINT cleanly',
      Boolean(hasSavepoint && hasReleaseSavepoint),
      `SAVEPOINT: ${hasSavepoint}, RELEASE SAVEPOINT: ${hasReleaseSavepoint}`
    );
  } catch (err: any) {
    record('Test 13: Nested SAVEPOINT', false, `Threw error: ${err.message}`);
  }

  // Test 14: Nested transaction error triggers ROLLBACK TO SAVEPOINT without aborting outer block
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    await adapter.executeTransaction(async (outerTx) => {
      await outerTx.users.findById(defaultAdminOptions, 'usr-1');

      let innerFailed = false;
      try {
        await outerTx.executeTransaction(async () => {
          throw new Error('INNER_NESTED_ERROR');
        });
      } catch (innerErr: any) {
        if (innerErr.message === 'INNER_NESTED_ERROR') {
          innerFailed = true;
        }
      }

      // Outer transaction continues successfully after inner rollback to savepoint
      await outerTx.users.findById(defaultAdminOptions, 'usr-1');
      return innerFailed;
    });

    const hasRollbackToSavepoint = mockClient.queryLog.some((q) =>
      q.toUpperCase().includes('ROLLBACK TO SAVEPOINT SP_')
    );
    const hasCommit = mockClient.queryLog.includes('COMMIT');

    record(
      'Test 14: Nested transaction error triggers ROLLBACK TO SAVEPOINT and permits outer COMMIT',
      Boolean(hasRollbackToSavepoint && hasCommit),
      `ROLLBACK TO SAVEPOINT: ${hasRollbackToSavepoint}, Outer COMMIT: ${hasCommit}`
    );
  } catch (err: any) {
    record('Test 14: Nested error rollback', false, `Threw error: ${err.message}`);
  }

  // --- 6. Invariants, Factory & Phase 1A Compatibility Tests ---
  console.log('\n--- 6. Invariants, Factory & Compatibility Tests ---');

  // Test 15: updateBalance throws UnsupportedOperationError
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    let threwUnsupported = false;
    try {
      await adapter.financialAccounts.updateBalance(defaultAdminOptions, 'acc-1', 99999);
    } catch (err: any) {
      if (err instanceof UnsupportedOperationError) {
        threwUnsupported = true;
      }
    }

    record(
      'Test 15: Direct balance override throws UnsupportedOperationError to protect double-entry rules',
      threwUnsupported,
      `Enforced double-entry balance mutation invariant`
    );
  } catch (err: any) {
    record('Test 15: UnsupportedOperationError updateBalance', false, `Threw error: ${err.message}`);
  }

  // Test 16: createDataAccessLayer factory defaults to JsonStorageAdapter
  try {
    const defaultDal = createDataAccessLayer({ dalOptions: defaultAdminOptions });
    const isJsonInstance = defaultDal instanceof JsonStorageAdapter;

    record(
      'Test 16: DAL factory defaults to JsonStorageAdapter to keep live application on JSON',
      isJsonInstance,
      `Instantiated class: ${defaultDal.constructor.name}`
    );
  } catch (err: any) {
    record('Test 16: Factory default JSON', false, `Threw error: ${err.message}`);
  }

  // Test 17: createDataAccessLayer factory instantiates PostgresStorageAdapter on explicit POSTGRES request
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const postgresDal = createDataAccessLayer({
      adapterType: 'POSTGRES',
      dalOptions: defaultAdminOptions,
      postgresPool: mockPool,
    });

    const isPostgresInstance = postgresDal instanceof PostgresStorageAdapter;
    record(
      'Test 17: DAL factory instantiates PostgresStorageAdapter on explicit POSTGRES request',
      isPostgresInstance,
      `Instantiated class: ${postgresDal.constructor.name}`
    );
  } catch (err: any) {
    record('Test 17: Factory explicit postgres', false, `Threw error: ${err.message}`);
  }

  // Test 18: Phase 1A read-only contract compatibility
  try {
    const mockClient = createMockPostgresClient();
    const mockPool = createMockPostgresPool(mockClient);
    const adapter = new PostgresStorageAdapter(defaultAdminOptions, mockPool);

    const mosque = await adapter.mosque.findById('mosque-1', defaultAdminOptions);
    const passed = Boolean(mosque && mosque.id === 'mosque-1' && mosque.nameBn === 'পিজি টেস্ট মসজিদ');

    record(
      'Test 18: PostgresStorageAdapter satisfies Phase 1A read-only mosque contract',
      passed,
      `Read mosque id=${mosque?.id}, nameBn=${mosque?.nameBn}`
    );
  } catch (err: any) {
    record('Test 18: Phase 1A compatibility', false, `Threw error: ${err.message}`);
  }

  console.log('\n================================================================');
  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const totalCount = results.length;
  console.log(`PHASE 1B.2 TEST RESULTS: ${passedCount} / ${totalCount} Checks Passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase1B2TestSuite().catch((e) => {
  console.error('Test suite failed with unhandled exception:', e);
  process.exit(1);
});
