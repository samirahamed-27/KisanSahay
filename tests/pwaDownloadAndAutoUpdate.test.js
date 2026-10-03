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
  const appJs = fs.readFileSync(path.join(publicPath, 'app.js'), 'utf8');
  const copyAppJs = fs.readFileSync(path.join(copyPath, 'app.js'), 'utf8');

  await t.test('1. Parity between public/ and public copy/ files', () => {
    assert.equal(indexHtml, copyHtml, 'index.html must match exactly in public and public copy');
    assert.equal(stylesCss, copyStylesCss, 'styles.css must match exactly in public and public copy');
    assert.equal(multiuserJs, copyMultiuserJs, 'multiuser.js must match exactly in public and public copy');
    assert.equal(swJs, copySwJs, 'sw.js must match exactly in public and public copy');
    assert.equal(appJs, copyAppJs, 'app.js must match exactly in public and public copy');
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
    assert.ok(stylesCss.includes('.pwa-direct-downloads-row {'), 'Must style .pwa-direct-downloads-row');
    assert.ok(stylesCss.includes('.btn-pwa-os-download {'), 'Must style .btn-pwa-os-download');
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

  await t.test('6. Direct OS downloadable packages exist for macOS and Windows', () => {
    const macZip = path.join(publicPath, 'downloads/KisanSahay-Mac.zip');
    const winZip = path.join(publicPath, 'downloads/KisanSahay-Windows.zip');
    const copyMacZip = path.join(copyPath, 'downloads/KisanSahay-Mac.zip');
    const copyWinZip = path.join(copyPath, 'downloads/KisanSahay-Windows.zip');

    assert.ok(fs.existsSync(macZip), 'public/downloads/KisanSahay-Mac.zip must exist');
    assert.ok(fs.existsSync(winZip), 'public/downloads/KisanSahay-Windows.zip must exist');
    assert.ok(fs.existsSync(copyMacZip), 'public copy/downloads/KisanSahay-Mac.zip must exist');
    assert.ok(fs.existsSync(copyWinZip), 'public copy/downloads/KisanSahay-Windows.zip must exist');

    assert.ok(fs.statSync(macZip).size > 1000, 'macOS zip must be non-empty valid package');
    assert.ok(fs.statSync(winZip).size > 100, 'Windows zip must be non-empty valid package');
  });

  await t.test('7. Direct OS download links and instructions in index.html', () => {
    assert.ok(indexHtml.includes('id="btn-download-mac-pkg"'), 'Must have Mac download link');
    assert.ok(indexHtml.includes('id="btn-download-win-pkg"'), 'Must have Windows download link');
    assert.ok(indexHtml.includes('/downloads/KisanSahay-Mac.zip'), 'Must link to KisanSahay-Mac.zip');
    assert.ok(indexHtml.includes('/downloads/KisanSahay-Windows.zip'), 'Must link to KisanSahay-Windows.zip');
  });

  await t.test('8. app.js implements downloadKisanSahayApp and triggers direct file download', () => {
    assert.ok(appJs.includes('function downloadKisanSahayApp()'), 'Must define downloadKisanSahayApp');
    assert.ok(appJs.includes('KisanSahay-Mac.zip'), 'Must reference KisanSahay-Mac.zip');
    assert.ok(appJs.includes('KisanSahay-Windows.zip'), 'Must reference KisanSahay-Windows.zip');
  });
});
