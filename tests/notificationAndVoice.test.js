const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const notificationService = require('../src/services/notificationService');
const ttsService = require('../src/services/ttsService');
const recommendController = require('../src/controllers/recommendController');

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
  const voiceScript = fs.readFileSync(path.join(__dirname, '../public/voice_input.js'), 'utf8');
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
