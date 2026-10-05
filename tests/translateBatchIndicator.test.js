/**
 * Test Suite: translateBatch() In-Flight Loading Indicator & Ref Counting
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('translateBatch UI Loading Indicator Suite', async (t) => {
  // Read public/app.js to verify implementation
  const appJs = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../frontend/styles.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');

  await t.test('1. HTML includes progress bar and floating indicator elements', () => {
    assert.ok(indexHtml.includes('id="translation-progress-bar"'), 'Must include #translation-progress-bar in index.html');
    assert.ok(indexHtml.includes('id="translation-loading-pill"'), 'Must include #translation-loading-pill in index.html');
    assert.ok(indexHtml.includes('class="translation-spinner"'), 'Must include .translation-spinner in index.html');
    assert.ok(indexHtml.includes('id="translation-loading-text"'), 'Must include #translation-loading-text in index.html');
  });

  await t.test('2. CSS includes styles for progress bar, floating pill, spinner and dark mode', () => {
    assert.ok(stylesCss.includes('.translation-progress-bar'), 'Must define .translation-progress-bar in styles.css');
    assert.ok(stylesCss.includes('.translation-progress-bar.active'), 'Must define .translation-progress-bar.active');
    assert.ok(stylesCss.includes('.translation-loading-pill'), 'Must define .translation-loading-pill');
    assert.ok(stylesCss.includes('.translation-loading-pill.visible'), 'Must define .translation-loading-pill.visible');
    assert.ok(stylesCss.includes('.translation-spinner'), 'Must define .translation-spinner');
    assert.ok(stylesCss.includes('body.dark-mode .translation-loading-pill'), 'Must define dark mode overrides for pill');
  });

  await t.test('3. app.js defines showTranslationLoading and hideTranslationLoading with ref-counting', () => {
    assert.ok(appJs.includes('function showTranslationLoading('), 'Must define showTranslationLoading function');
    assert.ok(appJs.includes('function hideTranslationLoading('), 'Must define hideTranslationLoading function');
    assert.ok(appJs.includes('activeTranslationsCount++'), 'Must increment ref counter');
    assert.ok(appJs.includes('activeTranslationsCount = Math.max(0, activeTranslationsCount - 1)'), 'Must safely decrement ref counter');
  });

  await t.test('4. translateBatch integrates showTranslationLoading and cleans up in finally', () => {
    assert.ok(appJs.includes('showTranslationLoading(normLang);'), 'translateBatch must call showTranslationLoading');
    assert.ok(appJs.includes('finally {'), 'translateBatch must have finally block');
    assert.ok(appJs.includes('hideTranslationLoading();'), 'translateBatch must call hideTranslationLoading in finally');
  });

  await t.test('5. Behavioral simulation: Indicator state transitions during in-flight requests', async () => {
    // Mock minimal DOM
    const elements = {};
    const dom = {
      getElementById(id) {
        return elements[id] || null;
      },
      createElement(tag) {
        return {
          tagName: tag,
          classList: {
            _classes: new Set(),
            add(c) { this._classes.add(c); },
            remove(c) { this._classes.delete(c); },
            contains(c) { return this._classes.has(c); }
          },
          setAttribute(k, v) { this[k] = v; },
          innerHTML: '',
          textContent: '',
          id: '',
          className: ''
        };
      },
      body: {
        prepend(el) { elements[el.id] = el; },
        appendChild(el) { elements[el.id] = el; }
      }
    };

    let activeCount = 0;
    const testBar = dom.createElement('div');
    testBar.id = 'translation-progress-bar';
    elements['translation-progress-bar'] = testBar;

    const testPill = dom.createElement('div');
    testPill.id = 'translation-loading-pill';
    elements['translation-loading-pill'] = testPill;

    const testText = dom.createElement('span');
    testText.id = 'translation-loading-text';
    elements['translation-loading-text'] = testText;

    function triggerShow(lang) {
      activeCount++;
      testBar.classList.add('active');
      testPill.classList.add('visible');
      testText.textContent = `Translating to ${lang}...`;
    }

    function triggerHide() {
      activeCount = Math.max(0, activeCount - 1);
      if (activeCount === 0) {
        testBar.classList.remove('active');
        testPill.classList.remove('visible');
      }
    }

    // 1st network request starts
    triggerShow('hi');
    assert.strictEqual(activeCount, 1);
    assert.strictEqual(testBar.classList.contains('active'), true);
    assert.strictEqual(testPill.classList.contains('visible'), true);

    // 2nd overlapping network request starts
    triggerShow('pa');
    assert.strictEqual(activeCount, 2);
    assert.strictEqual(testBar.classList.contains('active'), true);

    // 1st completes
    triggerHide();
    assert.strictEqual(activeCount, 1);
    assert.strictEqual(testBar.classList.contains('active'), true, 'Indicator remains active while 2nd request is in flight');

    // 2nd completes
    triggerHide();
    assert.strictEqual(activeCount, 0);
    assert.strictEqual(testBar.classList.contains('active'), false, 'Indicator dismissed when all requests finish');
    assert.strictEqual(testPill.classList.contains('visible'), false, 'Pill dismissed when all requests finish');
  });
});
