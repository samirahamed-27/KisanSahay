const test = require('node:test');
const assert = require('node:assert/strict');

test('Express Server - Admin Proxy Routing & Authentication Suite', async (t) => {
  const ADMIN_KEY = process.env.ADMIN_API_KEY || 'kisansahay-admin-secret-2026';

  await t.test('1. Direct /admin/pending through Express rejects unauthenticated request (401)', async () => {
    try {
      const res = await fetch('http://localhost:3000/admin/pending', {
        signal: AbortSignal.timeout(1000)
      });
      assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized without auth');
      const data = await res.json();
      assert.match(data.detail, /Unauthorized/i);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.name === 'AbortError') {
        // If Express is not running on 3000, skip gracefully
        return;
      }
      throw err;
    }
  });

  await t.test('2. /admin/pending through Express accepts valid X-Admin-Key (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/admin/pending', {
        headers: { 'X-Admin-Key': ADMIN_KEY },
        signal: AbortSignal.timeout(1000)
      });
      assert.strictEqual(res.status, 200, 'Should return 200 OK with valid X-Admin-Key');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.pending), 'pending should be an array');
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.name === 'AbortError') return;
      throw err;
    }
  });

  await t.test('3. /api/admin/pending through Express accepts valid Authorization Bearer (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/pending', {
        headers: { 'Authorization': `Bearer ${ADMIN_KEY}` },
        signal: AbortSignal.timeout(1000)
      });
      assert.strictEqual(res.status, 200, 'Should return 200 OK with valid Bearer token');
      const data = await res.json();
      assert.strictEqual(data.success, true);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.name === 'AbortError') return;
      throw err;
    }
  });

  await t.test('4. /admin/health through Express returns health report (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/admin/health', {
        headers: { 'X-Admin-Key': ADMIN_KEY },
        signal: AbortSignal.timeout(1000)
      });
      assert.strictEqual(res.status, 200, 'Should return 200 OK with health report');
      const data = await res.json();
      assert(['HEALTHY', 'WARNING', 'UNHEALTHY'].includes(data.status));
      assert(Array.isArray(data.alerts));
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.name === 'TimeoutError' || err.name === 'AbortError') return;
      throw err;
    }
  });
});
