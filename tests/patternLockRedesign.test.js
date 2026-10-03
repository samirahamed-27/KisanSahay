const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Prompt 3: Pattern Lock Tab & Cancel Button Cover Design Suite', async (t) => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const copyHtml = fs.readFileSync(path.join(__dirname, '../public copy/index.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
  const copyCss = fs.readFileSync(path.join(__dirname, '../public copy/styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const copyJs = fs.readFileSync(path.join(__dirname, '../public copy/app.js'), 'utf8');

  await t.test('1. Mirror consistency between public/ and public copy/ files', () => {
    assert.strictEqual(indexHtml, copyHtml, 'index.html and copy must match exactly');
    assert.strictEqual(stylesCss, copyCss, 'styles.css and copy must match exactly');
    assert.strictEqual(appJs, copyJs, 'app.js and copy must match exactly');
  });

  await t.test('2. Vault Modal Pattern Lock pane (#sec-pane-pattern) structure & components', () => {
    assert.ok(indexHtml.includes('id="sec-pane-pattern"'), '#sec-pane-pattern must exist');
    assert.ok(indexHtml.includes('id="vault-pattern-step-indicator"'), 'Step indicator must exist');
    assert.ok(indexHtml.includes('id="vault-pattern-step1-badge"'), 'Step 1 badge must exist');
    assert.ok(indexHtml.includes('id="vault-pattern-step2-badge"'), 'Step 2 badge must exist');
    assert.ok(indexHtml.includes('id="vault-pattern-trail-toggle"'), 'Trail toggle button must exist');
    assert.ok(indexHtml.includes('id="btn-reset-pattern"'), 'btn-reset-pattern must exist for redraw');
    assert.ok(indexHtml.includes('id="vault-pattern-instruction"'), 'Instruction line must exist');
    assert.ok(indexHtml.includes('id="pattern-container"'), 'pattern-container must exist');
    assert.ok(indexHtml.includes('id="pattern-canvas"'), 'pattern-canvas must exist');
    assert.ok(indexHtml.includes('id="pattern-dots-grid"'), 'pattern-dots-grid must exist');
    assert.ok(indexHtml.includes('id="pattern-feedback"'), 'pattern-feedback must exist');
    assert.ok(indexHtml.includes('class="pattern-security-note"'), 'Security note callout must exist');
  });

  await t.test('3. Reset Modal Pattern Lock pane (#reset-pane-pattern) structure & components', () => {
    assert.ok(indexHtml.includes('id="reset-pane-pattern"'), '#reset-pane-pattern must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-step-indicator"'), 'Reset step indicator must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-step1-badge"'), 'Reset step 1 badge must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-step2-badge"'), 'Reset step 2 badge must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-trail-toggle"'), 'Reset trail toggle button must exist');
    assert.ok(indexHtml.includes('id="btn-clear-reset-pattern"'), 'btn-clear-reset-pattern must exist for redraw');
    assert.ok(indexHtml.includes('id="reset-pattern-instruction"'), 'Reset instruction line must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-container"'), 'reset-pattern-container must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-canvas"'), 'reset-pattern-canvas must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-dots-grid"'), 'reset-pattern-dots-grid must exist');
    assert.ok(indexHtml.includes('id="reset-pattern-feedback"'), 'reset-pattern-feedback must exist');
  });

  await t.test('4. Cancel button cover design & equal height footer button styles in CSS', () => {
    assert.ok(stylesCss.includes('.btn-vault-cancel'), 'CSS must define .btn-vault-cancel');
    assert.ok(stylesCss.includes('min-width: 96px !important'), 'Cancel button must have min-width 96px');
    assert.ok(stylesCss.includes('background: #faf7f2 !important'), 'Cancel button must have warm farm cover background in light mode');
    assert.ok(stylesCss.includes('border: 1.5px solid #d5cbba !important'), 'Cancel button must have clear outline cover border in light mode');
    assert.ok(stylesCss.includes('body.dark-mode .btn-vault-cancel'), 'Dark mode Cancel button style must exist');
    assert.ok(stylesCss.includes('background: #1b2636 !important'), 'Dark mode Cancel button must have dark cover background');
    assert.ok(stylesCss.includes('height: 42px'), 'Footer buttons must enforce equal height 42px');
    assert.ok(stylesCss.includes('white-space: nowrap !important'), 'Footer buttons must prevent text wrap');
  });

  await t.test('5. 3x3 pattern card, touch targets, and state styles in CSS', () => {
    assert.ok(stylesCss.includes('.pattern-lock-card'), 'CSS must define .pattern-lock-card');
    assert.ok(stylesCss.includes('.pattern-card-toolbar'), 'CSS must define .pattern-card-toolbar');
    assert.ok(stylesCss.includes('.pattern-step-pill'), 'CSS must define .pattern-step-pill');
    assert.ok(stylesCss.includes('.btn-pattern-toolbar'), 'CSS must define .btn-pattern-toolbar');
    assert.ok(stylesCss.includes('.pattern-container.pattern-error-shake'), 'CSS must define pattern-error-shake');
    assert.ok(stylesCss.includes('@keyframes patternShake'), 'CSS must define @keyframes patternShake');
    assert.ok(stylesCss.includes('.pattern-dot.dot-selected'), 'CSS must define .pattern-dot.dot-selected');
    assert.ok(stylesCss.includes('.pattern-dot.dot-origin'), 'CSS must define .pattern-dot.dot-origin');
    assert.ok(stylesCss.includes('.pattern-dot.dot-matched'), 'CSS must define .pattern-dot.dot-matched');
    assert.ok(stylesCss.includes('.pattern-dot.dot-error'), 'CSS must define .pattern-dot.dot-error');
    assert.ok(stylesCss.includes('.pattern-security-note'), 'CSS must define .pattern-security-note');
    assert.ok(stylesCss.includes('body.dark-mode .pattern-lock-card'), 'Dark mode must style .pattern-lock-card');
  });

  await t.test('6. app.js two-step flow logic, trail toggle, and confirmation enforcement', () => {
    assert.ok(appJs.includes('vault-pattern-step1-badge'), 'app.js must reference vault-pattern-step1-badge');
    assert.ok(appJs.includes('vault-pattern-step2-badge'), 'app.js must reference vault-pattern-step2-badge');
    assert.ok(appJs.includes('vault-pattern-trail-toggle'), 'app.js must bind trail toggle');
    assert.ok(appJs.includes('reset-pattern-step1-badge'), 'app.js must reference reset-pattern-step1-badge');
    assert.ok(appJs.includes('reset-pattern-step2-badge'), 'app.js must reference reset-pattern-step2-badge');
    assert.ok(appJs.includes('reset-pattern-trail-toggle'), 'app.js must reference reset-pattern-trail-toggle');
    assert.ok(appJs.includes('state.isPatternConfirmed'), 'app.js must track pattern confirmation state');
    assert.ok(appJs.includes('pattern-error-shake'), 'app.js must trigger shake animation on error');
  });
});
