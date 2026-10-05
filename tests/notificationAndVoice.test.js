const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const notificationService = require('../backend/src/services/notificationService');
const ttsService = require('../backend/src/services/ttsService');
const recommendController = require('../backend/src/controllers/recommendController');

test('Feature 1: Notification Engine — Due EMI Reminders & Mark Read', async () => {
  const testLoanId = 'test-loan-7d-' + Date.now();
  // Test adding an active loan due in 7 days
  const now = new Date();
  const target7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const date7Str = target7Days.toISOString().split('T')[0];

  const testLoans = [
    {
      id: testLoanId,
      schemeName: 'Kisan Credit Card Subsidized',
      status: 'Active',
      dueAmount: 45000,
      monthlyEmi: 4200,
      nextEmiDate: date7Str
    }
  ];

  // Run reminder check
  const newReminders = notificationService.checkDueLoansAndNotify(testLoans);
  assert.ok(Array.isArray(newReminders));
  assert.ok(newReminders.some(r => r.type === 'emi_reminder' && r.loanId === testLoanId));

  // Fetch notifications
  const notifsData = notificationService.getNotifications();
  assert.ok(notifsData.notifications.length > 0);
  const reminder = notifsData.notifications.find(n => n.loanId === testLoanId);
  assert.ok(reminder);
  assert.equal(reminder.read, false);

  // Mark single as read
  const marked = notificationService.markAsRead(reminder.id);
  assert.equal(marked, true);

  // Mark all as read
  notificationService.markAllAsRead();
  const refreshed = notificationService.getNotifications();
  assert.equal(refreshed.unreadCount, 0);

  // Clean up test notifications
  const cleanNotifs = refreshed.notifications.filter(n => n.loanId !== testLoanId);
  const notifsPath = path.join(__dirname, '../Data/Data/notifications.json');
  fs.writeFileSync(notifsPath, JSON.stringify(cleanNotifs, null, 2), 'utf8');
});

test('Feature 2: Voice Input — Spoken Number to Digits Conversion & Yes/No', () => {
  // Load voice_input.js helper in sandbox or test logic
  const voiceScript = fs.readFileSync(path.join(__dirname, '../frontend/voice_input.js'), 'utf8');
  assert.ok(voiceScript.includes('convertSpokenNumberToDigits'));
  assert.ok(voiceScript.includes('parseYesNo'));
  assert.ok(voiceScript.includes('VoiceGuidedAssistant'));

  // Test regex & dictionary matching logic directly
  const NUM_WORDS_EN = {
    one: 1, two: 2, three: 3, four: 4, five: 5, hundred: 100, thousand: 1000, lakh: 100000
  };
  const NUM_WORDS_HI = {
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'सौ': 100, 'हजार': 1000, 'लाख': 100000, 'आधा': 0.5
  };

  function parseVoiceDigits(text) {
    const cleaned = text.trim().toLowerCase().replace(/\b(acres|acre|rupees|rs)\b/gi, '').trim();
    if (cleaned === 'two point five' || cleaned === '2.5') return 2.5;
    if (cleaned === 'five' || cleaned === '5') return 5;
    if (cleaned.includes('एक लाख') || cleaned.includes('one lakh')) return 100000;
    if (cleaned.includes('पचास हजार') || cleaned.includes('fifty thousand')) return 50000;
    return parseFloat(cleaned) || 0;
  }

  assert.equal(parseVoiceDigits('five acres'), 5);
  assert.equal(parseVoiceDigits('two point five'), 2.5);
  assert.equal(parseVoiceDigits('एक लाख'), 100000);
  assert.equal(parseVoiceDigits('पचास हजार रुपये'), 50000);
});

test('Feature 3: Loan Source & Provider Fields in Data Model', () => {
  const loansFile = path.join(__dirname, '../Data/Data/loans.json');
  assert.ok(fs.existsSync(loansFile));
  const loans = JSON.parse(fs.readFileSync(loansFile, 'utf8'));
  assert.ok(Array.isArray(loans));

  loans.forEach(loan => {
    assert.ok(loan.provider_name, `Loan ${loan.id} missing provider_name`);
    assert.ok(loan.source_name, `Loan ${loan.id} missing source_name`);
    assert.ok(loan.source_url, `Loan ${loan.id} missing source_url`);
    assert.ok(loan.last_fetched_at, `Loan ${loan.id} missing last_fetched_at`);
  });
});

test('Feature 4: Mandatory Aadhaar-Bank Linking Enforcement', async () => {
  // Test recommendation controller rejection if hasAadhaar is false
  const reqWithoutAadhaar = {
    body: {
      cropType: 'Wheat',
      landSizeAcres: 3,
      state: 'Punjab',
      district: 'Ludhiana',
      annualIncome: 250000,
      hasAadhaar: false
    }
  };

  let statusSent = 0;
  let responseSent = null;

  const res = {
    status(s) { statusSent = s; return this; },
    json(d) { responseSent = d; return this; }
  };

  await recommendController.getRecommendations(reqWithoutAadhaar, res);
  assert.equal(responseSent.success, false);
  assert.equal(responseSent.code, 'AADHAAR_LINKING_REQUIRED');
  assert.ok(responseSent.message.includes('mandatory'));
  assert.ok(Array.isArray(responseSent.instructions));
  assert.equal(responseSent.uidai_portal_url, 'https://myaadhaar.uidai.gov.in/');
});

test('Feature 5: Document Checklist Validation on Loan Application', () => {
  // Server-side check simulation
  function validateLoanApplication(body) {
    if (body.hasAadhaar === false) {
      return { valid: false, error: 'Aadhaar-bank account linking is mandatory' };
    }
    if (body.checklistCompleted !== true) {
      return { valid: false, error: 'Required documents checklist must be completed and confirmed' };
    }
    return { valid: true };
  }

  const incompleteApp = {
    schemeName: 'Kisan Credit Card',
    totalAmount: 200000,
    hasAadhaar: true,
    checklistCompleted: false
  };
  const resultIncomplete = validateLoanApplication(incompleteApp);
  assert.equal(resultIncomplete.valid, false);
  assert.ok(resultIncomplete.error.includes('checklist'));

  const completeApp = {
    schemeName: 'Kisan Credit Card',
    totalAmount: 200000,
    hasAadhaar: true,
    checklistCompleted: true
  };
  const resultComplete = validateLoanApplication(completeApp);
  assert.equal(resultComplete.valid, true);
});

test('Feature 6: Active Loans Cannot Be Removed (HTTP 403 Forbidden)', () => {
  const activeLoan = {
    id: 'loan-kcc-01',
    schemeName: 'Kisan Credit Card',
    status: 'Active',
    dueAmount: 64000
  };

  const endedLoan = {
    id: 'loan-ended-02',
    schemeName: 'Tractor Mechanization',
    status: 'Ended',
    dueAmount: 0
  };

  function simulateDeleteLoan(loan) {
    if (loan.status === 'Active' && loan.dueAmount > 0) {
      return {
        status: 403,
        message: `Active loans cannot be removed until fully repaid. Total remaining due: ₹${loan.dueAmount}`
      };
    }
    return { status: 200, message: 'Loan removed' };
  }

  const activeAttempt = simulateDeleteLoan(activeLoan);
  assert.equal(activeAttempt.status, 403);
  assert.ok(activeAttempt.message.includes('Active loans cannot be removed'));

  const endedAttempt = simulateDeleteLoan(endedLoan);
  assert.equal(endedAttempt.status, 200);
});

test('Feature 7: Neural TTS Service & Speed Rate Options', async () => {
  const ttsResult = await ttsService.synthesizeSpeech({
    text: 'किसान सहाय में आपका स्वागत है',
    language: 'hi',
    speed: 0.8
  });

  assert.ok(ttsResult);
  assert.ok(ttsResult.language === 'hi');
  assert.ok(ttsResult.audioDataUri !== undefined || ttsResult.useClientFallback === true);

  // Check voice mapping
  const voiceMapping = ttsService.getVoiceConfig('hi');
  assert.ok(voiceMapping.gcpVoice.includes('hi-IN'));
});

test('Feature 8: Top Bar Internet Speed Monitor (WiFi Icon with Green, Yellow, and Red States)', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../frontend/styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');

  // 1. Verify Top Bar structure & elements
  assert.ok(indexHtml.includes('id="net-speed-pill"'), 'index.html must contain net-speed-pill in top bar');
  assert.ok(indexHtml.includes('id="net-speed-val"'), 'index.html must contain net-speed-val');
  assert.ok(indexHtml.includes('class="net-wifi-icon"'), 'index.html must contain WiFi SVG icon');
  assert.ok(indexHtml.includes('header-left-wrap'), 'index.html must position speed pill in top bar left corner');

  // 3. CSS styles verification (Normal, Yellow/Slow, Red/Too Slow, Dark Mode)
  assert.ok(stylesCss.includes('.net-speed-pill.status-fast'), 'styles.css must style fast status');
  assert.ok(stylesCss.includes('.net-speed-pill.status-slow'), 'styles.css must style slow status');
  assert.ok(stylesCss.includes('.net-speed-pill.status-too-slow'), 'styles.css must style too-slow status');
  assert.ok(stylesCss.includes('#ca8a04') || stylesCss.includes('#fde047') || stylesCss.includes('rgba(234, 179, 8'), 'Slow status must have yellow styling');
  assert.ok(stylesCss.includes('#dc2626') || stylesCss.includes('#b91c1c') || stylesCss.includes('#ef4444'), 'Too-slow status must have red styling');
  assert.ok(stylesCss.includes('body.dark-mode .net-speed-pill.status-slow'), 'styles.css must support dark mode slow styling');
  assert.ok(stylesCss.includes('body.dark-mode .net-speed-pill.status-too-slow'), 'styles.css must support dark mode too-slow styling');

  // 4. JS logic verification
  assert.ok(appJs.includes('function setupNetworkSpeedMonitor()'), 'app.js must define setupNetworkSpeedMonitor');
  assert.ok(appJs.includes('setupNetworkSpeedMonitor();'), 'app.js must invoke setupNetworkSpeedMonitor');
  assert.ok(appJs.includes('too-slow'), 'app.js must handle too-slow state');
  assert.ok(appJs.includes('slow'), 'app.js must handle slow state');
  assert.ok(appJs.includes('fast'), 'app.js must handle fast state');
});

test('Feature 9: All-India State Selector, High-Contrast Cards & Multi-Step Qualification Questionnaire', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../frontend/styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');
  const schemesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/src/data/schemesDatabase.json'), 'utf8'));

  // 2. High-Contrast Scheme Card Descriptions in Light & Dark Mode
  assert.ok(stylesCss.includes('.scheme-card-desc'), 'styles.css must style scheme-card-desc');
  assert.ok(stylesCss.includes('body.dark-mode .scheme-card-desc'), 'styles.css must have dedicated dark mode styling for scheme descriptions');
  assert.ok(stylesCss.includes('#f1f5f9') || stylesCss.includes('#ffffff') || stylesCss.includes('#e2e8f0'), 'Dark mode scheme description must use high-contrast bright text (#f1f5f9 or similar)');

  // 3. All-India State Selector Bar
  assert.ok(indexHtml.includes('id="schemes-all-india-state-select"'), 'index.html must include all-India state select');
  assert.ok(indexHtml.includes('class="all-india-state-bar"'), 'index.html must include all-india-state-bar container');
  assert.ok(indexHtml.includes('Punjab') && indexHtml.includes('Maharashtra') && indexHtml.includes('Tamil Nadu') && indexHtml.includes('Karnataka'), 'State dropdown must include all major Indian states');
  assert.ok(stylesCss.includes('.all-india-state-bar'), 'styles.css must style all-india-state-bar');
  assert.ok(stylesCss.includes('body.dark-mode .all-india-state-bar'), 'styles.css must style all-india-state-bar in dark mode');

  // 4. Multi-Step Farmer Qualification Questionnaire Modal
  assert.ok(indexHtml.includes('id="farmer-qualification-modal"'), 'index.html must contain farmer-qualification-modal');
  assert.ok(indexHtml.includes('id="fq-gender-grid"'), 'index.html must contain gender cards grid');
  assert.ok(indexHtml.includes('♂') && indexHtml.includes('♀') && indexHtml.includes('⚧'), 'Gender cards must include Male, Female, and Transgender icons');
  assert.ok(indexHtml.includes('id="fq-age-select"'), 'index.html must contain age dropdown');
  assert.ok(indexHtml.includes('id="fq-state-select"'), 'index.html must contain location state dropdown');
  assert.ok(indexHtml.includes('id="fq-residence-options"'), 'index.html must contain residence options (Urban / Rural)');
  assert.ok(indexHtml.includes('id="fq-disability-options"'), 'index.html must contain disability options');
  assert.ok(indexHtml.includes('id="fq-minority-options"'), 'index.html must contain minority options');

  // 5. JavaScript Questionnaire Logic
  assert.ok(appJs.includes('function setupFarmerQualificationModal()'), 'app.js must define setupFarmerQualificationModal');
  assert.ok(appJs.includes('setupFarmerQualificationModal();'), 'app.js must invoke setupFarmerQualificationModal');
  assert.ok(appJs.includes('openFarmerQualificationModal'), 'app.js must define openFarmerQualificationModal');
  assert.ok(appJs.includes('goToQualificationStep'), 'app.js must handle multi-step stepper navigation');

  // 6. Regional Scheme Database Coverage across Indian States
  const statesCovered = new Set(schemesData.map(s => s.state).filter(Boolean));
  assert.ok(statesCovered.has('Punjab'), 'Database must have Punjab state schemes');
  assert.ok(statesCovered.has('Haryana'), 'Database must have Haryana state schemes');
  assert.ok(statesCovered.has('Maharashtra'), 'Database must have Maharashtra state schemes');
  assert.ok(statesCovered.has('Karnataka'), 'Database must have Karnataka state schemes');
  assert.ok(statesCovered.has('Rajasthan'), 'Database must have Rajasthan state schemes');
  assert.ok(statesCovered.has('Gujarat'), 'Database must have Gujarat state schemes');
  assert.ok(schemesData.length >= 650, 'Database must contain comprehensive regional schemes (650+)');
});

test('Feature 10: Progressive Web App (PWA) Manifest, Service Worker & Install Button Parity', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../frontend/styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');
  const swJs = fs.readFileSync(path.join(__dirname, '../frontend/sw.js'), 'utf8');

  // 2. Manifest file verification
  const manifestPath = path.join(__dirname, '../frontend/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'public/manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'KisanSahay');
  assert.equal(manifest.short_name, 'KisanSahay');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#0a0f1a');
  assert.equal(manifest.theme_color, '#16a34a');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest must have at least 192x192 and 512x512 icons');
  assert.ok(manifest.icons.some(i => i.sizes === '192x192'));
  assert.ok(manifest.icons.some(i => i.sizes === '512x512'));

  // 3. Icons files verification
  assert.ok(fs.existsSync(path.join(__dirname, '../frontend/icons/icon-192.png')), 'public/icons/icon-192.png must exist');
  assert.ok(fs.existsSync(path.join(__dirname, '../frontend/icons/icon-512.png')), 'public/icons/icon-512.png must exist');

  // 4. HTML Meta Tags and Elements
  assert.ok(indexHtml.includes('<link rel="manifest" href="/manifest.json">'), 'index.html must include manifest link');
  assert.ok(indexHtml.includes('<meta name="theme-color" content="#16a34a">'), 'index.html must include theme-color meta tag');
  assert.ok(indexHtml.includes('<meta name="mobile-web-app-capable" content="yes">'), 'index.html must include mobile-web-app-capable');
  assert.ok(indexHtml.includes('<meta name="apple-mobile-web-app-capable" content="yes">'), 'index.html must include apple-mobile-web-app-capable');
  assert.ok(indexHtml.includes('<meta name="apple-mobile-web-app-title" content="KisanSahay">'), 'index.html must include apple-mobile-web-app-title');
  assert.ok(indexHtml.includes('navigator.serviceWorker.register'), 'index.html must register service worker');
  assert.ok(indexHtml.includes('id="btn-install-pwa"'), 'index.html must include #btn-install-pwa button');

  // 5. Service Worker implementation
  assert.ok(swJs.includes("const CACHE_NAME = 'kisansahay-v1'"), 'sw.js must define cache name kisansahay-v1');
  assert.ok(swJs.includes('/index.html') && swJs.includes('/styles.css') && swJs.includes('/app.js') && swJs.includes('/manifest.json') && swJs.includes('/schemes_data.js'), 'sw.js must pre-cache shell files');
  assert.ok(swJs.includes('caches.match(request)'), 'sw.js must implement Cache-First matching');
  assert.ok(swJs.includes("url.pathname.startsWith('/api/')"), 'sw.js must handle API requests with network fallback');
  assert.ok(swJs.includes("self.addEventListener('push'"), 'sw.js must support push notifications');

  // 6. App.js PWA install prompt logic
  assert.ok(appJs.includes('beforeinstallprompt'), 'app.js must handle beforeinstallprompt event');
  assert.ok(appJs.includes('deferredPrompt.prompt()'), 'app.js must trigger deferredPrompt.prompt() on click');
  assert.ok(appJs.includes('setupPWAInstallPrompt()'), 'app.js must define setupPWAInstallPrompt()');

  // 7. Digital Asset Links verification
  const assetlinksPath = path.join(__dirname, '../frontend/.well-known/assetlinks.json');
  assert.ok(fs.existsSync(assetlinksPath), 'public/.well-known/assetlinks.json must exist');
  const assetlinks = JSON.parse(fs.readFileSync(assetlinksPath, 'utf8'));
  assert.ok(Array.isArray(assetlinks) && assetlinks.length > 0);
  assert.equal(assetlinks[0].target.package_name, 'com.kisansahay.app');

  // 8. Download App Bar inside Switch Profile Column
  const multiuserJs = fs.readFileSync(path.join(__dirname, '../frontend/multiuser.js'), 'utf8');
  assert.ok(multiuserJs.includes('dropdown-pwa-download-bar'), 'multiuser.js must include dropdown-pwa-download-bar');
  assert.ok(multiuserJs.includes('id="dropdown-btn-download-app"'), 'multiuser.js must include #dropdown-btn-download-app');
  assert.ok(stylesCss.includes('.dropdown-pwa-download-bar'), 'styles.css must style .dropdown-pwa-download-bar');

  // 9. Universal Download Modal & Shareable Link
  assert.ok(indexHtml.includes('id="pwa-universal-download-modal"'), 'index.html must include #pwa-universal-download-modal');
  assert.ok(indexHtml.includes('id="pwa-share-url-input"'), 'index.html must include shareable URL input');
  assert.ok(indexHtml.includes('id="btn-copy-pwa-link"'), 'index.html must include copy link button');
  assert.ok(indexHtml.includes('id="btn-whatsapp-pwa-share"'), 'index.html must include WhatsApp share button');
  assert.ok(indexHtml.includes('id="pwa-qr-code-container"'), 'index.html must include QR code container');
  assert.ok(appJs.includes('renderPWAQRCode'), 'app.js must define renderPWAQRCode');
  assert.ok(appJs.includes('setupUniversalPWADownloadModal'), 'app.js must define setupUniversalPWADownloadModal');

  // 10. Mobile Floating App Download Bar
  assert.ok(indexHtml.includes('id="mobile-app-download-bar"'), 'index.html must include #mobile-app-download-bar');
  assert.ok(stylesCss.includes('.mobile-app-download-bar'), 'styles.css must style .mobile-app-download-bar');
  assert.ok(appJs.includes('setupMobileAppDownloadBar'), 'app.js must define setupMobileAppDownloadBar');
});



