/**
 * Test Suite: Runtime Translation API, Single Source of Truth & Minimal-Storage LRU Cache
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const express = require('express');

const { translationCache, TranslationCache } = require('../backend/src/services/translationCache');
const { translationService } = require('../backend/src/services/translationService');
const apiRoutes = require('../backend/src/routes/apiRoutes');

test('Translation Suite — 1. Single Source of Truth Base Strings Extraction', () => {
  const stringsPath = path.join(__dirname, '../backend/src/data/strings.json');
  assert.ok(fs.existsSync(stringsPath), 'src/data/strings.json must exist');

  const strings = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));
  const keys = Object.keys(strings);
  assert.ok(keys.length >= 180, `Expected at least 180 base strings, found ${keys.length}`);

  // Mandatory UI keys
  assert.ok(strings.navHome, 'Must have navHome key');
  assert.ok(strings.navEligibility, 'Must have navEligibility key');
  assert.ok(strings.navSchemes, 'Must have navSchemes key');
  assert.ok(strings.navLoans, 'Must have navLoans key');
  assert.ok(strings.installApp, 'Must have installApp key');
  assert.ok(strings.heroTitle, 'Must have heroTitle key');

  // Verify public/different_languages.js exports matching BASE_STRINGS
  const clientLang = require('../frontend/different_languages.js');
  assert.ok(clientLang.BASE_STRINGS, 'Client different_languages.js must export BASE_STRINGS');
  assert.strictEqual(clientLang.BASE_STRINGS.navHome, strings.navHome);
  assert.ok(Array.isArray(clientLang.INDIAN_LANGUAGES), 'INDIAN_LANGUAGES must be an array');
  assert.strictEqual(clientLang.INDIAN_LANGUAGES.length, 25, 'Must have 25 supported Indian languages');
});

test('Translation Suite — 2. Minimal-Storage Hash Cache with TTL and Key Hashing', () => {
  const testCache = new TranslationCache({
    ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxSize: 100,
    filePath: path.join(__dirname, '../scratch/test_lru_cache.json')
  });

  const source = 'Empowering Indian Farmers';
  const targetLang = 'hi';
  const translated = 'भारतीय किसानों का सशक्तिकरण';

  // Verify compact hash key format (16 hex chars + ':' + targetLang)
  const key = testCache.hashKey(source, targetLang);
  assert.match(key, /^[0-9a-f]{16}:hi$/, 'Cache key must be 16-hex hash with target language suffix');

  // Store and retrieve
  testCache.set(source, targetLang, translated);
  assert.strictEqual(testCache.get(source, targetLang), translated, 'Should retrieve cached translation');
  assert.strictEqual(testCache.get('NonExistent', targetLang), null, 'Miss should return null');

  const stats = testCache.getStats();
  assert.strictEqual(stats.size, 1);
  assert.strictEqual(stats.hits, 1);
  assert.strictEqual(stats.misses, 1);
  assert.strictEqual(stats.ttlDays, 30);
});

test('Translation Suite — 3. Cache LRU Eviction Cap Enforcement', () => {
  const testCachePath = path.join(__dirname, '../scratch/test_eviction_cache.json');
  try { if (fs.existsSync(testCachePath)) fs.unlinkSync(testCachePath); } catch (e) {}

  const smallCache = new TranslationCache({
    ttlMs: 60000,
    maxSize: 3,
    filePath: testCachePath
  });

  smallCache.set('Text 1', 'hi', 'अनुवाद 1');
  smallCache.set('Text 2', 'hi', 'अनुवाद 2');
  smallCache.set('Text 3', 'hi', 'अनुवाद 3');
  assert.strictEqual(smallCache.cache.size, 3);

  // Access Text 1 so Text 2 becomes least recently used
  smallCache.get('Text 1', 'hi');

  // Add Text 4 — should evict Text 2
  smallCache.set('Text 4', 'hi', 'अनुवाद 4');
  assert.strictEqual(smallCache.cache.size, 3, 'Size must not exceed maxSize');
  assert.strictEqual(smallCache.get('Text 2', 'hi'), null, 'Text 2 should have been evicted');
  assert.strictEqual(smallCache.get('Text 1', 'hi'), 'अनुवाद 1', 'Text 1 should remain');
  assert.strictEqual(smallCache.get('Text 4', 'hi'), 'अनुवाद 4', 'Text 4 should remain');
  assert.strictEqual(smallCache.getStats().evictions, 1);
});

test('Translation Suite — 4. Batch Translation API Endpoint & Caching', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. First call (miss/populate cache)
    const response1 = await fetch(`http://localhost:${port}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strings: {
          navHome: 'Home',
          checkElig: 'Check Eligibility',
          govSchemes: 'Government Schemes'
        },
        from: 'en',
        to: 'hi',
        isDynamic: false
      })
    });

    assert.strictEqual(response1.status, 200);
    const data1 = await response1.json();
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.to, 'hi');
    assert.strictEqual(data1.translations.navHome, 'होम');
    assert.strictEqual(data1.translations.checkElig, 'पात्रता जांचें');

    // 2. Second call with same strings (must hit cache: cached count > 0)
    const response2 = await fetch(`http://localhost:${port}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strings: {
          navHome: 'Home',
          checkElig: 'Check Eligibility'
        },
        from: 'en',
        to: 'hi',
        isDynamic: false
      })
    });

    const data2 = await response2.json();
    assert.strictEqual(data2.success, true);
    assert.strictEqual(data2.stats.cached, 2, 'Subsequent batch call must be served from cache');
    assert.strictEqual(data2.stats.translated, 0, 'No new external translations required on cache hit');
  } finally {
    server.close();
  }
});

test('Translation Suite — 5. Dynamic Content Bypasses Static Cache', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const dynamicText = `Dynamic Live Scheme Alert ${Date.now()}`;
    const res = await fetch(`http://localhost:${port}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: [dynamicText],
        from: 'en',
        to: 'hi',
        isDynamic: true // Dynamic flag: do not cache
      })
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.translations), 'Array input should return array translations');

    // Verify dynamic text was NOT saved in cache
    const cached = translationCache.get(dynamicText, 'hi');
    assert.strictEqual(cached, null, 'Dynamic content must never be stored in static cache');
  } finally {
    server.close();
  }
});

test('Translation Suite — 6. Languages and Cache Stats Endpoints', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Languages endpoint
    const langRes = await fetch(`http://localhost:${port}/api/translate/languages`);
    const langData = await langRes.json();
    assert.strictEqual(langData.success, true);
    assert.strictEqual(langData.baseLanguage, 'en');
    assert.strictEqual(langData.count, 25);
    assert.ok(langData.activeProvider);

    // Cache stats endpoint
    const statsRes = await fetch(`http://localhost:${port}/api/translate/cache-stats`);
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.success, true);
    assert.ok(typeof statsData.cache.size === 'number');
    assert.ok(typeof statsData.cache.hits === 'number');
    assert.strictEqual(statsData.cache.ttlDays, 30);
  } finally {
    server.close();
  }
});
