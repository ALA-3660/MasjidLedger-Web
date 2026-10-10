import { validateProductionJwtConfiguration, getJwtAccessSecret, getJwtRefreshSecret } from '../src/server/auth/jwt';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? `: ${detail}` : ''}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('🔒 MASJIDLEDGER PRO v2.6 — PRODUCTION JWT SECURITY VALIDATION TEST');
console.log('================================================================');

const originalEnv = { ...process.env };

try {
  // Test 1: Missing JWT_ACCESS_SECRET
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = 'valid_refresh_secret_32_chars_long_minimum_rule_b';
  let res = validateProductionJwtConfiguration();
  assert(!res.valid && res.error?.includes('JWT_ACCESS_SECRET environment variable is required') === true, '1. Missing JWT_ACCESS_SECRET rejected in production', res.error);

  // Test 2: Missing JWT_REFRESH_SECRET
  process.env.NODE_ENV = 'production';
  process.env.JWT_ACCESS_SECRET = 'valid_access_secret_32_chars_long_minimum_rule_a';
  delete process.env.JWT_REFRESH_SECRET;
  res = validateProductionJwtConfiguration();
  assert(!res.valid && res.error?.includes('JWT_REFRESH_SECRET environment variable is required') === true, '2. Missing JWT_REFRESH_SECRET rejected in production', res.error);

  // Test 3: Weak/Short secret (<32 chars)
  process.env.NODE_ENV = 'production';
  process.env.JWT_ACCESS_SECRET = 'short_weak_key';
  process.env.JWT_REFRESH_SECRET = 'valid_refresh_secret_32_chars_long_minimum_rule_b';
  res = validateProductionJwtConfiguration();
  assert(!res.valid && res.error?.includes('at least 32 characters') === true, '3. Weak/short secret (<32 chars) rejected in production', res.error);

  // Test 4: Identical secrets
  process.env.NODE_ENV = 'production';
  const same = 'identical_secret_key_32_chars_long_minimum_rule!!';
  process.env.JWT_ACCESS_SECRET = same;
  process.env.JWT_REFRESH_SECRET = same;
  res = validateProductionJwtConfiguration();
  assert(!res.valid && res.error?.includes('must be distinct secrets') === true, '4. Identical secrets rejected in production', res.error);

  // Test 5: Distinct valid secrets
  process.env.NODE_ENV = 'production';
  process.env.JWT_ACCESS_SECRET = 'valid_access_secret_32_chars_long_minimum_rule_a';
  process.env.JWT_REFRESH_SECRET = 'valid_refresh_secret_32_chars_long_minimum_rule_b';
  res = validateProductionJwtConfiguration();
  assert(res.valid === true, '5. Distinct valid secrets accepted in production');

  // Test 6: Development fallback
  delete process.env.NODE_ENV;
  delete process.env.JWT_ACCESS_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  const devAccess = getJwtAccessSecret();
  const devRefresh = getJwtRefreshSecret();
  assert(devAccess.length >= 32 && devRefresh.length >= 32, '6. Development mode generates secure in-memory fallback secrets');

} finally {
  process.env = originalEnv;
}

console.log('================================================================');
console.log(`EXECUTION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
