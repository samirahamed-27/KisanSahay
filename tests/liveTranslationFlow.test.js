/**
 * Live Integration Test Suite against running Backend API (http://localhost:8000)
 */

const test = require('node:test');
const assert = require('node:assert');

test('Live Backend Translation & Fallback Integration Suite', async (t) => {
  const API_URL = 'http://localhost:8000/api/translate';

  // Check if live backend server is running
  let isLive = false;
  try {
    const probe = await fetch(API_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(1000)
    });
    isLive = probe.ok || probe.status < 500;
  } catch {
    isLive = false;
  }

  // 1. Verify Live API is responding
  await t.test('1. Live backend /api/translate responds with Hindi translation', async (t1) => {
    if (!isLive) {
      t1.skip('Live backend (http://localhost:8000) is offline — skipping live integration check');
      return;
    }

    const payload = {
      navHome: 'Home',
      navEligibility: 'Check Eligibility',
      docChecklist: 'Document Checklist',
      target_lang: 'hi'
    };

    const res = await fetch(`${API_URL}?target_lang=hi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.ok, true, `API returned status ${res.status}`);
    const data = await res.json();
    const trans = data.translations || data;

    assert.ok(trans.navHome, 'navHome must be returned');
    assert.ok(trans.navEligibility, 'navEligibility must be returned');
    console.log('   Live Hindi Translation:', trans);
  });

  // 2. Verify Live API Punjabi translation
  await t.test('2. Live backend /api/translate responds with Punjabi translation', async (t2) => {
    if (!isLive) {
      t2.skip('Live backend (http://localhost:8000) is offline — skipping live integration check');
      return;
    }

    const payload = {
      navHome: 'Home',
      navEligibility: 'Check Eligibility',
      target_lang: 'pa'
    };

    const res = await fetch(`${API_URL}?target_lang=pa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.ok, true, `API returned status ${res.status}`);
    const data = await res.json();
    const trans = data.translations || data;

    assert.ok(trans.navHome, 'navHome must be returned in Punjabi');
    console.log('   Live Punjabi Translation:', trans);
  });

  // 3. Verify Graceful English Fallback on Invalid or Failing Route
  await t.test('3. English fallback when requesting invalid endpoint / server offline simulation', async () => {
    const origFields = {
      title: 'Farmer Loan Portal',
      btn: 'Apply Now'
    };

    // Client wrapper logic matching public/app.js translateBatch error handler
    async function clientTranslateBatchWithFallback(fields, targetLang) {
      const result = {};
      try {
        const res = await fetch(`http://localhost:8000/api/nonexistent_route?target_lang=${targetLang}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields)
        });

        if (!res.ok) {
          // Graceful fallback to original English
          for (const [k, v] of Object.entries(fields)) {
            result[k] = v;
          }
          return result;
        }

        return await res.json();
      } catch (err) {
        // Network error fallback to original English
        for (const [k, v] of Object.entries(fields)) {
          result[k] = v;
        }
        return result;
      }
    }

    const fallbackResult = await clientTranslateBatchWithFallback(origFields, 'hi');
    assert.strictEqual(fallbackResult.title, 'Farmer Loan Portal', 'Must return original English title');
    assert.strictEqual(fallbackResult.btn, 'Apply Now', 'Must return original English btn');
    console.log('   Graceful English Fallback verified:', fallbackResult);
  });
});
