const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Sahay AI — Full Screen Mode UI & Keybindings Verification', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  // 1. HTML element exists
  assert.ok(html.includes('id="sahay-fullscreen-btn"'), 'Full screen button must be present in index.html');
  assert.ok(html.includes('id="sahay-fullscreen-icon"'), 'Full screen icon wrapper must be present');

  // 2. CSS styles exist
  assert.ok(css.includes('.sahay-chat-window.is-fullscreen'), 'CSS must define .sahay-chat-window.is-fullscreen');
  assert.ok(css.includes('position: fixed'), 'Full screen window must be position: fixed');
  assert.ok(css.includes('width: 100vw'), 'Full screen window must occupy full viewport width');
  assert.ok(css.includes('height: 100vh'), 'Full screen window must occupy full viewport height');

  // 3. JavaScript logic exists
  assert.ok(js.includes('toggleFullscreen'), 'app.js must define toggleFullscreen');
  assert.ok(js.includes('is-fullscreen'), 'app.js must toggle is-fullscreen class');
  assert.ok(js.includes('Escape'), 'app.js must handle Escape key to exit full screen');
});

test('Sahay AI — 4 Popular Languages Support (English, Hindi, Punjabi, Bengali)', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  // 1. Language codes & metadata
  assert.ok(js.includes("code: 'pa'"), 'app.js must include Punjabi (pa)');
  assert.ok(js.includes("code: 'bn'"), 'app.js must include Bengali (bn)');
  assert.ok(js.includes("Punjabi (ਪੰਜਾਬੀ)"), 'app.js must have Punjabi label');
  assert.ok(js.includes("Bengali (বাংলা)"), 'app.js must have Bengali label');

  // 2. Multilingual intro cards
  assert.ok(js.includes("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਹਾਇ AI ਹਾਂ"), 'app.js must have Punjabi intro title');
  assert.ok(js.includes("নমস্কার! আমি সহায় AI"), 'app.js must have Bengali intro title');

  // 3. Speech recognition and synthesis mapping
  assert.ok(js.includes("'pa': 'pa-IN'"), 'Speech map must map pa to pa-IN');
  assert.ok(js.includes("'bn': 'bn-IN'"), 'Speech map must map bn to bn-IN');

  // 4. Batch translation on response when language is non-English
  assert.ok(js.includes("window.translateBatch({ answer: answerText }, sahayLang)"), 'Must translate answers dynamically for selected language');
});
