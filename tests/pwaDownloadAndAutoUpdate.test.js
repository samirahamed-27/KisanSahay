const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('PWA Download App in Profile Switch & Auto-Update Suite', async (t) => {
  const publicPath = path.join(__dirname, '../public');
  const copyPath = path.join(__dirname, '../public copy');

  const indexHtml = fs.readFileSync(path.join(publicPath, 'index.html'), 'utf8');
  const copyHtml = fs.readFileSync(path.join(copyPath, 'index.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(publicPath, 'styles.css'), 'utf8');
  const copyStylesCss = fs.readFileSync(path.join(copyPath, 'styles.css'), 'utf8');
  const multiuserJs = fs.readFileSync(path.join(publicPath, 'multiuser.js'), 'utf8');
  const copyMultiuserJs = fs.readFileSync(path.join(copyPath, 'multiuser.js'), 'utf8');
  const swJs = fs.readFileSync(path.join(publicPath, 'sw.js'), 'utf8');
  const copySwJs = fs.readFileSync(path.join(copyPath, 'sw.js'), 'utf8');

  await t.test('1. Parity between public/ and public copy/ files', () => {
    assert.equal(indexHtml, copyHtml, 'index.html must match exactly in public and public copy');
    assert.equal(stylesCss, copyStylesCss, 'styles.css must match exactly in public and public copy');
    assert.equal(multiuserJs, copyMultiuserJs, 'multiuser.js must match exactly in public and public copy');
    assert.equal(swJs, copySwJs, 'sw.js must match exactly in public and public copy');
  });

  await t.test('2. Download App option in Switch Profile dropdown is visible and accessible', () => {
    assert.ok(multiuserJs.includes('id="dropdown-btn-download-app"'), 'Must have #dropdown-btn-download-app element');
    assert.ok(!multiuserJs.includes('id="dropdown-btn-download-app" role="button" tabindex="0" title="Download & Install KisanSahay App on your phone or PC" style="display: none !important;"'), 'Must not hide download bar with inline display: none');
    assert.ok(multiuserJs.includes('Download App'), 'Must show Download App text');
    assert.ok(multiuserJs.includes('triggerPWAInstallOrModal'), 'Must invoke triggerPWAInstallOrModal');
    assert.ok(multiuserJs.includes("e.key === 'Enter' || e.key === ' '"), 'Must support keyboard Enter/Space accessibility');
  });

  await t.test('3. Download App styling in styles.css is active in light and dark mode', () => {
    assert.ok(stylesCss.includes('.dropdown-pwa-download-bar {'), 'Must have .dropdown-pwa-download-bar class');
    assert.ok(!stylesCss.includes('.dropdown-pwa-download-bar {\n  display: none !important;'), 'Must not have display: none on .dropdown-pwa-download-bar');
    assert.ok(stylesCss.includes('.dropdown-pwa-download-bar {\n  display: flex;'), 'Must display .dropdown-pwa-download-bar as flex');
    assert.ok(stylesCss.includes('body.dark-mode .dropdown-pwa-download-bar {\n  display: flex;'), 'Must display dark mode .dropdown-pwa-download-bar as flex');
  });

  await t.test('4. Service Worker implements background cache revalidation & update messaging', () => {
    assert.ok(swJs.includes("const CACHE_NAME = 'kisansahay-v1'"), 'Must define CACHE_NAME');
    assert.ok(swJs.includes('caches.match(request)'), 'Must call caches.match(request)');
    assert.ok(swJs.includes('fetch(request)'), 'Must fetch request for background revalidation');
    assert.ok(swJs.includes('cache.put(request, responseToCache)'), 'Must update cache with fresh response in background');
    assert.ok(swJs.includes("action === 'skipWaiting'"), 'Must support skipWaiting message action');
  });

  await t.test('5. index.html proactively triggers service worker updates on launch', () => {
    assert.ok(indexHtml.includes('navigator.serviceWorker.register'), 'Must register service worker');
    assert.ok(indexHtml.includes('reg.update()'), 'Must call reg.update() to refresh PWA cache');
    assert.ok(indexHtml.includes('controllerchange'), 'Must listen for controllerchange to reload with latest build');
  });
});
