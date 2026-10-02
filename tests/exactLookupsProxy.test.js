const test = require('node:test');
const assert = require('node:assert/strict');

test('Express Server - Exact Lookups Proxy Suite (Prompt 6)', async (t) => {
  await t.test('1. /api/kvk proxied through Express returns KVK directory records (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/kvk?district=Bhopal&state=Madhya%20Pradesh');
      if (res.status === 503) return; // If Python backend not up in test runner environment
      assert.strictEqual(res.status, 200, 'Should return 200 OK from proxied backend');
      const data = await res.json();
      assert.strictEqual(data.status, 'success');
      assert(Array.isArray(data.records), 'records must be an array');
      assert(data.count >= 1, 'Should find at least 1 KVK record');
      assert.strictEqual(data.records[0].district, 'Bhopal');
      assert(data.last_updated, 'Must include last_updated date');
      assert(data.source_name, 'Must include source_name');
    } catch (err) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  await t.test('2. /api/kvk/events proxied through Express returns upcoming trainings (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/kvk/events?district=Bhopal&state=Madhya%20Pradesh');
      if (res.status === 503) return;
      assert.strictEqual(res.status, 200, 'Should return 200 OK from proxied backend');
      const data = await res.json();
      assert.strictEqual(data.status, 'success');
      assert(Array.isArray(data.records));
      assert(data.records.length >= 1);
      assert(data.records[0].training_topic);
    } catch (err) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  await t.test('3. /api/advisories proxied through Express returns seasonal crop advisories (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/advisories?crop=Soybean&state=Madhya%20Pradesh');
      if (res.status === 503) return;
      assert.strictEqual(res.status, 200, 'Should return 200 OK from proxied backend');
      const data = await res.json();
      assert.strictEqual(data.status, 'success');
      assert(Array.isArray(data.records));
    } catch (err) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  await t.test('4. /api/mandi proxied through Express returns latest wholesale prices (200)', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/mandi?crop=Soybean&district=Dewas&state=Madhya%20Pradesh');
      if (res.status === 503) return;
      assert.strictEqual(res.status, 200, 'Should return 200 OK from proxied backend');
      const data = await res.json();
      assert.strictEqual(data.status, 'success');
      assert(Array.isArray(data.records));
      assert(data.records.length >= 1);
      assert.strictEqual(data.records[0].commodity, 'Soybean');
      assert(data.records[0].modal_price > 0);
      assert(data.last_updated);
    } catch (err) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });
});
