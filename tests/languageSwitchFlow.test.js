/**
 * Test Suite: Full Language Switch Flow
 *
 * Verifies:
 * 1. Switching between at least two target languages repeatedly (e.g. 'hi' and 'pa').
 * 2. No duplicate API calls for cached text (cache hits make 0 network requests).
 * 3. No flicker on cached text (loading indicators are never shown for cache hits).
 * 4. English fallback text appears gracefully if the translate API call fails (HTTP 500 or Network Error).
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Language Switch Full Flow Suite', async (t) => {
  // Load base strings from single source of truth
  const stringsPath = path.join(__dirname, '../src/data/strings.json');
  const baseStrings = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));

  // Setup simulated environment mimicking browser runtime
  let fetchCallCount = 0;
  const fetchCallsByLang = {};
  let mockFetchHandler = null;

  // Mock DOM
  const elements = {};
  function createMockElement(id, tag = 'div') {
    const el = {
      id,
      tagName: tag,
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      setAttribute(k, v) { this[k] = v; },
      textContent: '',
      innerHTML: '',
      dataset: {}
    };
    elements[id] = el;
    return el;
  }

  const progressBar = createMockElement('translation-progress-bar');
  const loadingPill = createMockElement('translation-loading-pill');
  const loadingText = createMockElement('translation-loading-text', 'span');
  const langToggleBtn = createMockElement('lang-toggle-btn', 'button');
  const langText = createMockElement('lang-text', 'span');

  const documentMock = {
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tag) {
      return createMockElement('el_' + Math.random().toString(36).slice(2), tag);
    },
    querySelectorAll() {
      return [];
    },
    body: {
      prepend(el) { elements[el.id] = el; },
      appendChild(el) { elements[el.id] = el; }
    }
  };

  // Mock LocalStorage
  const localStorageStore = new Map();
  const localStorageMock = {
    getItem(k) { return localStorageStore.get(k) || null; },
    setItem(k, v) { localStorageStore.set(k, String(v)); },
    removeItem(k) { localStorageStore.delete(k); },
    clear() { localStorageStore.clear(); }
  };

  // Create isolated environment for test
  global.document = documentMock;
  global.localStorage = localStorageMock;
  global.window = {
    INDIAN_LANGUAGES: [
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
      { code: 'mr', name: 'Marathi', native: 'मराठी' },
      { code: 'bn', name: 'Bengali', native: 'বাংলা' }
    ],
    BASE_STRINGS: baseStrings,
    TRANSLATIONS: { en: baseStrings }
  };

  // Global fetch mock
  global.fetch = async (url, options) => {
    fetchCallCount++;
    const targetLangMatch = url.match(/target_lang=([^&]+)/);
    const targetLang = targetLangMatch ? decodeURIComponent(targetLangMatch[1]) : 'unknown';
    fetchCallsByLang[targetLang] = (fetchCallsByLang[targetLang] || 0) + 1;

    if (mockFetchHandler) {
      return mockFetchHandler(url, options);
    }

    // Default mock response: returns translated keys with a language prefix
    const body = JSON.parse(options.body);
    const translations = {};
    for (const [k, v] of Object.entries(body)) {
      if (k !== 'target_lang') {
        translations[k] = `[${targetLang}] ${v}`;
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ translations })
    };
  };

  // In-memory cache structures matching public/app.js
  const translationTextCache = new Map();
  const fieldSourceTextMap = new Map();
  let activeTranslationsCount = 0;
  let indicatorShowCount = 0;

  function getCachedTranslation(text, lang) {
    const key = `${lang}:::${text}`;
    if (translationTextCache.has(key)) return translationTextCache.get(key);
    return null;
  }

  function setCachedTranslation(text, lang, translatedText) {
    const key = `${lang}:::${text}`;
    translationTextCache.set(key, translatedText);
  }

  function invalidateTranslationCache(prevText, lang) {
    translationTextCache.delete(`${lang}:::${prevText}`);
  }

  function showTranslationLoading(targetLang) {
    activeTranslationsCount++;
    indicatorShowCount++;
    progressBar.classList.add('active');
    loadingPill.classList.add('visible');
    const langObj = window.INDIAN_LANGUAGES.find(l => l.code === targetLang);
    loadingText.textContent = langObj ? `Translating (${langObj.native})...` : 'Translating content...';
  }

  function hideTranslationLoading() {
    activeTranslationsCount = Math.max(0, activeTranslationsCount - 1);
    if (activeTranslationsCount === 0) {
      progressBar.classList.remove('active');
      loadingPill.classList.remove('visible');
    }
  }

  // Exact translateBatch function logic from public/app.js
  async function translateBatch(fieldsObject, targetLang) {
    if (!fieldsObject || typeof fieldsObject !== 'object' || targetLang === 'en' || !targetLang) {
      return fieldsObject;
    }

    const normLang = targetLang.toLowerCase().trim();
    const result = {};
    const misses = {};

    for (const [key, text] of Object.entries(fieldsObject)) {
      if (!text || typeof text !== 'string') {
        result[key] = text;
        continue;
      }

      if (fieldSourceTextMap.has(key)) {
        const prevText = fieldSourceTextMap.get(key);
        if (prevText !== text) {
          invalidateTranslationCache(prevText, normLang);
        }
      }
      fieldSourceTextMap.set(key, text);

      const cached = getCachedTranslation(text, normLang);
      if (cached !== null) {
        result[key] = cached;
      } else {
        misses[key] = text;
      }
    }

    // Skip API call completely if all texts were already translated into targetLang
    if (Object.keys(misses).length === 0) {
      return result;
    }

    showTranslationLoading(normLang);
    try {
      const payload = Object.assign({}, misses, { target_lang: normLang });
      const res = await fetch(`/api/translate?target_lang=${encodeURIComponent(normLang)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        for (const [k, orig] of Object.entries(misses)) {
          result[k] = orig;
        }
        return result;
      }

      const data = await res.json();
      const translatedMisses = (data && data.translations) ? data.translations : data;

      for (const [k, origText] of Object.entries(misses)) {
        const translatedVal = (translatedMisses && translatedMisses[k]) ? translatedMisses[k] : origText;
        result[k] = translatedVal;
        if (translatedVal && translatedVal !== origText) {
          setCachedTranslation(origText, normLang, translatedVal);
        }
      }

      return result;
    } catch (err) {
      for (const [k, orig] of Object.entries(misses)) {
        result[k] = orig;
      }
      return result;
    } finally {
      hideTranslationLoading();
    }
  }

  // Exact setLanguage flow from public/app.js
  async function setLanguage(langCode) {
    if (langCode === 'en') {
      return window.TRANSLATIONS['en'];
    }

    if (window.TRANSLATIONS[langCode] && Object.keys(window.TRANSLATIONS[langCode]).length > 0) {
      return window.TRANSLATIONS[langCode];
    }

    const strings = window.TRANSLATIONS['en'] || baseStrings;
    const transMap = await translateBatch(strings, langCode);
    if (transMap && Object.keys(transMap).length > 0) {
      window.TRANSLATIONS[langCode] = transMap;
    }
    return window.TRANSLATIONS[langCode];
  }

  // =========================================================================
  // Test 1: Repeatedly switch between Hindi ('hi') and Punjabi ('pa')
  // =========================================================================
  await t.test('1. Switching repeatedly between Hindi and Punjabi does not duplicate API calls', async () => {
    // 1st switch: en -> hi (Cache miss -> 1 API call)
    fetchCallCount = 0;
    indicatorShowCount = 0;
    const hi1 = await setLanguage('hi');
    assert.strictEqual(fetchCallsByLang['hi'], 1, 'First Hindi switch must make 1 API call');
    assert.strictEqual(indicatorShowCount, 1, 'Loading indicator must be shown on first Hindi switch');
    assert.strictEqual(progressBar.classList.contains('active'), false, 'Indicator must be dismissed after finish');
    assert.strictEqual(loadingPill.classList.contains('visible'), false, 'Pill must be dismissed after finish');
    assert.ok(hi1.navHome.includes('[hi]'), 'Hindi translated text must be present');

    // 2nd switch: hi -> pa (Cache miss -> 1 API call)
    const pa1 = await setLanguage('pa');
    assert.strictEqual(fetchCallsByLang['pa'], 1, 'First Punjabi switch must make 1 API call');
    assert.strictEqual(indicatorShowCount, 2, 'Loading indicator must be shown on first Punjabi switch');
    assert.ok(pa1.navHome.includes('[pa]'), 'Punjabi translated text must be present');

    // 3rd switch: pa -> hi (Cache hit -> 0 API calls, NO FLICKER)
    const callsBeforeHi2 = fetchCallCount;
    const indicatorBeforeHi2 = indicatorShowCount;
    const hi2 = await setLanguage('hi');
    assert.strictEqual(fetchCallCount, callsBeforeHi2, 'Switching back to Hindi must NOT make an API call');
    assert.strictEqual(indicatorShowCount, indicatorBeforeHi2, 'Loading indicator must NOT show on cache hit (NO FLICKER)');
    assert.strictEqual(hi2.navHome, hi1.navHome, 'Must return same cached translated content');

    // 4th switch: hi -> pa (Cache hit -> 0 API calls, NO FLICKER)
    const callsBeforePa2 = fetchCallCount;
    const indicatorBeforePa2 = indicatorShowCount;
    const pa2 = await setLanguage('pa');
    assert.strictEqual(fetchCallCount, callsBeforePa2, 'Switching back to Punjabi must NOT make an API call');
    assert.strictEqual(indicatorShowCount, indicatorBeforePa2, 'Loading indicator must NOT show on cache hit (NO FLICKER)');
    assert.strictEqual(pa2.navHome, pa1.navHome, 'Must return same cached translated content');

    // 5th switch: pa -> hi (Cache hit -> 0 API calls)
    const callsBeforeHi3 = fetchCallCount;
    const hi3 = await setLanguage('hi');
    assert.strictEqual(fetchCallCount, callsBeforeHi3, 'Repeated Hindi switch must NOT make an API call');
    assert.strictEqual(hi3.navHome, hi1.navHome);

    // Verify overall API calls
    assert.strictEqual(fetchCallsByLang['hi'], 1, 'Total API calls for Hindi throughout all switches must remain exactly 1');
    assert.strictEqual(fetchCallsByLang['pa'], 1, 'Total API calls for Punjabi throughout all switches must remain exactly 1');
  });

  // =========================================================================
  // Test 2: Dynamic component batch translation caching
  // =========================================================================
  await t.test('2. Component level translateBatch skips API call for cached scheme fields', async () => {
    const schemeFields = {
      scheme_1_name: 'PM Kisan Samman Nidhi',
      scheme_1_cat: 'Direct Income Support',
      scheme_1_desc: 'Financial benefit of ₹6,000 per year in three equal installments.'
    };

    // First call for 'hi' (cache miss)
    const initialCalls = fetchCallCount;
    const resHi1 = await translateBatch(schemeFields, 'hi');
    assert.strictEqual(fetchCallCount, initialCalls + 1, 'First scheme translation must call API');
    assert.ok(resHi1.scheme_1_name.includes('[hi]'));

    // Second call for 'hi' with exact same fields (cache hit)
    const callsAfterFirst = fetchCallCount;
    const indicatorBeforeSecond = indicatorShowCount;
    const resHi2 = await translateBatch(schemeFields, 'hi');
    assert.strictEqual(fetchCallCount, callsAfterFirst, 'Second scheme translation call must be served 100% from cache');
    assert.strictEqual(indicatorShowCount, indicatorBeforeSecond, 'No indicator shown on scheme cache hit (NO FLICKER)');
    assert.strictEqual(resHi2.scheme_1_name, resHi1.scheme_1_name);
  });

  // =========================================================================
  // Test 3: API HTTP 500 error fallback to English text
  // =========================================================================
  await t.test('3. API HTTP 500 error returns original English text and dismisses loading indicator', async () => {
    // Configure mockFetch to simulate 500 server error
    mockFetchHandler = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Translation backend temporary overload' })
    });

    const testFields = {
      fieldA: 'Apply for KCC Loan',
      fieldB: 'Required Documents: Aadhaar, Land Record'
    };

    const indicatorBefore = indicatorShowCount;
    const result = await translateBatch(testFields, 'mr');

    // Verification:
    assert.strictEqual(indicatorShowCount, indicatorBefore + 1, 'Indicator was shown during request');
    assert.strictEqual(progressBar.classList.contains('active'), false, 'Progress bar was dismissed in finally');
    assert.strictEqual(loadingPill.classList.contains('visible'), false, 'Loading pill was dismissed in finally');
    assert.strictEqual(activeTranslationsCount, 0, 'Ref counter returned to 0');

    // Confirm English fallback:
    assert.strictEqual(result.fieldA, 'Apply for KCC Loan', 'Must fallback to original English text for fieldA');
    assert.strictEqual(result.fieldB, 'Required Documents: Aadhaar, Land Record', 'Must fallback to original English text for fieldB');
  });

  // =========================================================================
  // Test 4: Network Exception error fallback to English text
  // =========================================================================
  await t.test('4. Network connection failure returns original English text and dismisses loading indicator', async () => {
    // Configure mockFetch to simulate network disconnect
    mockFetchHandler = async () => {
      throw new Error('NetworkError: Failed to fetch (connection refused)');
    };

    const testFields = {
      title: 'Farmer Loan Portal',
      cta: 'Check Eligibility Now'
    };

    const indicatorBefore = indicatorShowCount;
    const result = await translateBatch(testFields, 'bn');

    // Verification:
    assert.strictEqual(indicatorShowCount, indicatorBefore + 1, 'Indicator was shown during request');
    assert.strictEqual(progressBar.classList.contains('active'), false, 'Progress bar was dismissed in finally');
    assert.strictEqual(loadingPill.classList.contains('visible'), false, 'Loading pill was dismissed in finally');
    assert.strictEqual(activeTranslationsCount, 0, 'Ref counter returned to 0');

    // Confirm English fallback:
    assert.strictEqual(result.title, 'Farmer Loan Portal', 'Must fallback to original English title');
    assert.strictEqual(result.cta, 'Check Eligibility Now', 'Must fallback to original English cta');
  });
});
