const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Sahay AI — Full Screen Mode UI & Keybindings Verification', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  // 1. HTML element exists and has inline click handler & pointer-events guard
  assert.ok(html.includes('id="sahay-fullscreen-btn"'), 'Full screen button must be present in index.html');
  assert.ok(html.includes('id="sahay-fullscreen-icon"'), 'Full screen icon wrapper must be present');
  assert.ok(html.includes('onclick="window.toggleSahayFullscreen'), 'Full screen button should call window.toggleSahayFullscreen');

  // 2. CSS styles exist with high z-index and viewport coverage
  assert.ok(css.includes('.sahay-chat-window.is-fullscreen'), 'CSS must define .sahay-chat-window.is-fullscreen');
  assert.ok(css.includes('position: fixed'), 'Full screen window must be position: fixed');
  assert.ok(css.includes('width: 100vw'), 'Full screen window must occupy full viewport width');
  assert.ok(css.includes('height: 100vh'), 'Full screen window must occupy full viewport height');
  assert.ok(css.includes('#sahay-fullscreen-btn *'), 'CSS must disable pointer events on children of fullscreen button');

  // 3. JavaScript logic exists and exports window.toggleSahayFullscreen
  assert.ok(js.includes('toggleFullscreen'), 'app.js must define toggleFullscreen');
  assert.ok(js.includes('window.toggleSahayFullscreen = toggleFullscreen'), 'app.js must export window.toggleSahayFullscreen');
  assert.ok(js.includes('is-fullscreen'), 'app.js must toggle is-fullscreen class');
  assert.ok(js.includes('Escape'), 'app.js must handle Escape key to exit full screen');
});

test('Sahay AI — Chatbox Languages (English & Hindi strictly, Punjabi and Bengali removed)', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

  // 1. Chatbox language toggle must support English and Hindi
  assert.ok(html.includes('title="Switch Language (English / हिन्दी)"'), 'Language button tooltip must only mention English and Hindi');
  assert.ok(js.includes("code: 'en'"), 'app.js must include English (en)');
  assert.ok(js.includes("code: 'hi'"), 'app.js must include Hindi (hi)');

  // 2. Verify Punjabi and Bengali were removed from Sahay AI chatbox definitions
  assert.ok(!js.includes("code: 'pa'"), 'app.js must NOT include Punjabi in Sahay chatbox');
  assert.ok(!js.includes("code: 'bn'"), 'app.js must NOT include Bengali in Sahay chatbox');
  assert.ok(!js.includes("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਹਾਇ AI ਹਾਂ"), 'app.js must NOT include Punjabi intro title');
  assert.ok(!js.includes("নমস্কার! আমি সহায় AI"), 'app.js must NOT include Bengali intro title');
});

test('Sahay AI — Dark Mode Microphone Styling is Crisp White', () => {
  const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');

  // 1. Dark mode selectors for the bottom mic
  assert.ok(css.includes('body.dark-mode .btn-sahay-mic') || css.includes('body.dark-mode #sahay-mic-btn'), 'CSS must define dark mode mic selector');
  assert.ok(css.includes('color: #ffffff !important'), 'Dark mode mic color must be #ffffff !important');
  assert.ok(css.includes('stroke: #ffffff !important'), 'Dark mode mic stroke must be #ffffff !important');
});

test('Sahay AI — Light / White Mode Background Image Styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');

  // 1. Light mode background image applied to sahay-chat-window
  assert.ok(css.includes('body:not(.dark-mode) .sahay-chat-window'), 'Must target sahay-chat-window in non-dark/light mode');
  assert.ok(css.includes("wheat_field_bg.png"), 'Must reference wheat_field_bg.png in styles.css');
  assert.ok(css.includes('body:not(.dark-mode) .sahay-message-stream'), 'Must make sahay-message-stream transparent in light mode');

  // 2. Dark mode overrides background image
  assert.ok(css.includes('body.dark-mode .sahay-chat-window') && css.includes('background-image: none !important'), 'Dark mode must disable wheat field image on chat window');
});
