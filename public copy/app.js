/**
 * KisanSahay Frontend Application Logic
 * Accessible Agricultural Finance & Loan Management Portal
 */

// Application State
const state = {
  currentTab: 'home',
  currentLang: 'en', // 'en' or 'hi'
  schemes: [],
  loans: [],
  loanSummary: { totalBorrowed: 0, totalPaid: 0, totalDue: 0, totalMonthlyEmi: 0 },
  selectedSchemeForChecklist: null,
  isSpeaking: false,
  speechSynth: window.speechSynthesis || null,
  activeUtterance: null
};

// Hindi translations for key voice prompts & headings
const i18n = {
  en: {
    welcomeSpeech: "Welcome to KisanSahay. Here you can check your eligibility for government schemes and track all your loans and EMIs easily.",
    checkEligibility: "Check My Eligibility",
    schemesCatalog: "Government Schemes",
    loansTracker: "My Loans & EMIs",
    save3Percent: "Save 3% with prompt repayment on time!",
    paidUpdated: "Payment updated successfully",
    addedToTracker: "Scheme successfully added to your loan tracker!"
  },
  hi: {
    welcomeSpeech: "किसान सहाय में आपका स्वागत है। यहाँ आप सरकारी योजनाओं की पात्रता जांच सकते हैं और अपने सभी ऋण और किस्तों का हिसाब रख सकते हैं।",
    checkEligibility: "पात्रता जांचें",
    schemesCatalog: "सरकारी योजनाएं",
    loansTracker: "मेरे ऋण और किस्तें",
    save3Percent: "समय पर भुगतान करने पर 3% ब्याज की छूट पाएं!",
    paidUpdated: "भुगतान सफलतापूर्वक अपडेट किया गया",
    addedToTracker: "योजना आपके ऋण ट्रैकर में जोड़ दी गई है!"
  }
};

// DOM Elements
const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.page-view'),
  langToggleBtn: document.getElementById('lang-toggle-btn'),
  langText: document.getElementById('lang-text'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  mobileDrawer: document.getElementById('mobile-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  drawerCloseBtn: document.getElementById('drawer-close-btn'),
  
  // Audio Voice Reader
  floatingSpeakerBtn: document.getElementById('floating-speaker-btn'),

  // Eligibility Form
  cropInput: document.getElementById('crop-input'),
  cropChips: document.querySelectorAll('.crop-chip'),
  incomeInput: document.getElementById('income-input'),
  landInput: document.getElementById('land-input'),
  farmerTypeOptions: document.querySelectorAll('.farmer-type-option'),
  aadhaarToggle: document.getElementById('aadhaar-toggle'),
  btnCheckEligibility: document.getElementById('btn-check-eligibility'),
  eligibilityResultsContainer: document.getElementById('eligibility-results-container'),

  // Schemes Catalog
  schemesGrid: document.getElementById('schemes-grid'),
  filterChips: document.querySelectorAll('.filter-chip'),

  // Loan Tracker
  statBorrowed: document.getElementById('stat-borrowed'),
  statPaid: document.getElementById('stat-paid'),
  statDue: document.getElementById('stat-due'),
  statEmi: document.getElementById('stat-emi'),
  loansList: document.getElementById('loans-list'),
  btnOpenAddLoanModal: document.getElementById('btn-open-add-loan-modal'),

  // Modals
  checklistModal: document.getElementById('checklist-modal'),
  checklistModalTitle: document.getElementById('checklist-modal-title'),
  checklistItemsContainer: document.getElementById('checklist-items-container'),
  checklistCloseBtn: document.getElementById('checklist-close-btn'),
  btnApplyFromChecklist: document.getElementById('btn-apply-from-checklist'),

  addLoanModal: document.getElementById('add-loan-modal'),
  addLoanCloseBtn: document.getElementById('add-loan-close-btn'),
  addLoanForm: document.getElementById('add-loan-form')
};

// ==========================================================================
// Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupSpeechSynthesis();
  setupEligibilityForm();
  setupModals();
  await loadSchemes();
  await loadLoans();
});

// Format Indian Rupee Currency
function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

// ==========================================================================
// Navigation & Views
// ==========================================================================

function setupNavigation() {
  // Desktop & Drawer Nav item clicks
  document.querySelectorAll('.nav-item, .drawer-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetView = btn.getAttribute('data-view');
      if (targetView) {
        switchView(targetView);
        closeMobileDrawer();
      }
    });
  });

  // Mobile menu open/close
  if (elements.mobileMenuBtn) {
    elements.mobileMenuBtn.addEventListener('click', openMobileDrawer);
  }
  if (elements.drawerCloseBtn) {
    elements.drawerCloseBtn.addEventListener('click', closeMobileDrawer);
  }
  if (elements.drawerOverlay) {
    elements.drawerOverlay.addEventListener('click', closeMobileDrawer);
  }

  // Language switch
  if (elements.langToggleBtn) {
    elements.langToggleBtn.addEventListener('click', toggleLanguage);
  }
}

function openMobileDrawer() {
  elements.mobileDrawer.classList.add('open');
  elements.drawerOverlay.classList.add('open');
}

function closeMobileDrawer() {
  elements.mobileDrawer.classList.remove('open');
  elements.drawerOverlay.classList.remove('open');
}

function switchView(viewName) {
  state.currentTab = viewName;

  // Update header nav buttons
  elements.navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update visible view
  elements.views.forEach(view => {
    if (view.id === `view-${viewName}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Language Switcher
function toggleLanguage() {
  state.currentLang = state.currentLang === 'en' ? 'hi' : 'en';
  elements.langText.textContent = state.currentLang === 'en' ? 'English' : 'हिंदी';
  
  const msg = state.currentLang === 'hi' 
    ? 'भाषा बदलकर हिंदी कर दी गई है।' 
    : 'Language changed to English.';
  speakText(msg);
}

// ==========================================================================
// Accessibility: Text-to-Speech Audio Reader (Speaker 🔊)
// ==========================================================================

function setupSpeechSynthesis() {
  if (elements.floatingSpeakerBtn) {
    elements.floatingSpeakerBtn.addEventListener('click', () => {
      if (state.isSpeaking) {
        stopSpeaking();
      } else {
        // Read current page overview
        let textToRead = '';
        if (state.currentTab === 'home') {
          textToRead = state.currentLang === 'hi' 
            ? "किसान सहाय। पात्रता जांचें, सरकारी योजनाएं देखें, और अपने सभी ऋण और किस्तों का हिसाब एक जगह रखें।"
            : "KisanSahay. Check your eligibility for government loans and schemes, get your document checklist, and track your EMIs — all in one simple place.";
        } else if (state.currentTab === 'eligibility') {
          textToRead = state.currentLang === 'hi'
            ? "पात्रता जांचें। अपनी फसल, वार्षिक आय और जमीन का विवरण दर्ज करें और जानें कि आप किन सरकारी योजनाओं के लिए पात्र हैं।"
            : "Check your eligibility. Enter your crop type, annual income, and land details to see which government schemes you qualify for.";
        } else if (state.currentTab === 'loans') {
          textToRead = state.currentLang === 'hi'
            ? `ऋण ट्रैकर। कुल लिया गया ऋण: ${formatINR(state.loanSummary.totalBorrowed)}, कुल चुकाया गया: ${formatINR(state.loanSummary.totalPaid)}, बाकी राशि: ${formatINR(state.loanSummary.totalDue)}.`
            : `Loan Tracker. Total borrowed: ${formatINR(state.loanSummary.totalBorrowed)}, Total paid: ${formatINR(state.loanSummary.totalPaid)}, Remaining balance due: ${formatINR(state.loanSummary.totalDue)}.`;
        } else {
          textToRead = state.currentLang === 'hi'
            ? "सरकारी योजनाएं। केसीसी, एमआईएसएस 4 प्रतिशत ऋण, पीएम किसान 6000 रुपये सहायता, और कृषि इन्फ्रास्ट्रक्चर फंड की पूरी जानकारी।"
            : "Government Schemes Directory. Complete details on KCC 4% loans, MISS subvention, PM-KISAN, and Infrastructure Funds.";
        }
        speakText(textToRead);
      }
    });
  }
}

function speakText(text) {
  if (!state.speechSynth) return;

  state.speechSynth.cancel(); // Stop any previous speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Friendly, clear pacing for farmers
  utterance.pitch = 1.0;
  utterance.lang = state.currentLang === 'hi' ? 'hi-IN' : 'en-IN';

  utterance.onstart = () => {
    state.isSpeaking = true;
    if (elements.floatingSpeakerBtn) {
      elements.floatingSpeakerBtn.classList.add('speaking');
    }
  };

  utterance.onend = () => {
    state.isSpeaking = false;
    if (elements.floatingSpeakerBtn) {
      elements.floatingSpeakerBtn.classList.remove('speaking');
    }
  };

  utterance.onerror = () => {
    state.isSpeaking = false;
    if (elements.floatingSpeakerBtn) {
      elements.floatingSpeakerBtn.classList.remove('speaking');
    }
  };

  state.activeUtterance = utterance;
  state.speechSynth.speak(utterance);
}

function stopSpeaking() {
  if (state.speechSynth) {
    state.speechSynth.cancel();
  }
  state.isSpeaking = false;
  if (elements.floatingSpeakerBtn) {
    elements.floatingSpeakerBtn.classList.remove('speaking');
  }
}

// ==========================================================================
// Schemes Data & Directory
// ==========================================================================

async function loadSchemes() {
  try {
    const res = await fetch('/api/schemes');
    const json = await res.json();
    if (json.success) {
      state.schemes = json.data;
      renderSchemesCatalog(state.schemes);
    }
  } catch (err) {
    console.error('Failed to load schemes:', err);
  }
}

function renderSchemesCatalog(schemesList) {
  if (!elements.schemesGrid) return;
  elements.schemesGrid.innerHTML = '';

  schemesList.forEach(scheme => {
    const card = document.createElement('div');
    card.className = 'scheme-card';

    let rateHighlight = '';
    if (scheme.effectiveRate > 0) {
      rateHighlight = `${scheme.effectiveRate}% Effective Rate`;
    } else if (scheme.id === 'pm-kisan') {
      rateHighlight = '100% Direct Grant';
    } else {
      rateHighlight = '3% Interest Subvention';
    }

    card.innerHTML = `
      <div>
        <div class="scheme-header-row">
          <div class="scheme-icon-title">
            <div class="scheme-icon-circle">${scheme.icon}</div>
            <div>
              <span class="scheme-badge green">${scheme.badge}</span>
            </div>
          </div>
          <button class="card-floating-speaker" title="Listen to scheme details" onclick="speakScheme('${scheme.id}')">🔊</button>
        </div>

        <h3 class="scheme-title">${scheme.name}</h3>
        <p class="scheme-tagline">${scheme.tagline}</p>

        <div class="scheme-quick-stats">
          <div class="quick-stat-item">
            <div class="stat-label">Interest / Grant</div>
            <div class="stat-value" style="color: #15803d;">${rateHighlight}</div>
          </div>
          <div class="quick-stat-item">
            <div class="stat-label">Maximum Limit</div>
            <div class="stat-value">${scheme.maxLimit >= 10000000 ? '₹' + (scheme.maxLimit / 10000000) + ' Crore' : (scheme.maxLimit >= 100000 ? '₹' + (scheme.maxLimit / 100000) + ' Lakh' : formatINR(scheme.maxLimit))}</div>
          </div>
        </div>

        <p style="font-size: 0.9rem; color: #475569; margin-bottom: 1.2rem; line-height: 1.5;">
          ${scheme.whatItIs}
        </p>
      </div>

      <div style="display: flex; gap: 0.8rem; margin-top: 1rem; flex-wrap: wrap;">
        <button class="btn-secondary" onclick="openDocumentChecklist('${scheme.id}')">
          📋 Document Checklist (${scheme.documents.length})
        </button>
        <button class="btn-primary-sm" onclick="applyDirectlyToTracker('${scheme.id}')">
          ➕ Track This Loan
        </button>
      </div>
    `;

    elements.schemesGrid.appendChild(card);
  });

  // Schemes Filter setup
  elements.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filter = chip.getAttribute('data-filter');
      if (filter === 'all') {
        renderSchemesCatalog(state.schemes);
      } else {
        const filtered = state.schemes.filter(s => {
          if (filter === 'crop') return s.id === 'kcc' || s.id === 'miss';
          if (filter === 'income') return s.id === 'pm-kisan';
          if (filter === 'infra') return s.id === 'aif' || s.id === 'ahidf';
          return true;
        });
        renderSchemesCatalog(filtered);
      }
    });
  });
}

window.speakScheme = function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;
  const speech = `${scheme.name}. ${scheme.tagline}. ${scheme.whatItIs}. Interest rate: ${scheme.effectiveRate || 'zero'} percent.`;
  speakText(speech);
};

// ==========================================================================
// Custom Eligibility Checker
// ==========================================================================

function setupEligibilityForm() {
  // Quick Crop Chips
  elements.cropChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.cropChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      elements.cropInput.value = chip.getAttribute('data-crop');
    });
  });

  // Farmer Type selection
  elements.farmerTypeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      elements.farmerTypeOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Check Eligibility Button
  if (elements.btnCheckEligibility) {
    elements.btnCheckEligibility.addEventListener('click', checkEligibility);
  }
}

async function checkEligibility() {
  const cropType = elements.cropInput.value.trim() || 'Wheat';
  const annualIncome = Number(elements.incomeInput.value) || 120000;
  const landSize = Number(elements.landInput.value) || 2.5;
  
  const selectedFarmerTypeElem = document.querySelector('.farmer-type-option.selected');
  const farmerType = selectedFarmerTypeElem ? selectedFarmerTypeElem.getAttribute('data-type') : 'owner';
  const hasAadhaar = elements.aadhaarToggle.checked;

  try {
    elements.btnCheckEligibility.innerHTML = 'Evaluating Schemes...';
    elements.btnCheckEligibility.disabled = true;

    const res = await fetch('/api/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cropType, annualIncome, landSize, farmerType, hasAadhaar })
    });

    const data = await res.json();
    renderEligibilityResults(data.results);

    // Speak results summary
    const eligibleCount = data.results.filter(r => r.eligible).length;
    const voiceMsg = state.currentLang === 'hi'
      ? `बधाई हो, आप ${eligibleCount} सरकारी योजनाओं के लिए पात्र हैं।`
      : `Great news! You are eligible for ${eligibleCount} government schemes based on your farm details.`;
    speakText(voiceMsg);

  } catch (err) {
    console.error('Eligibility check error:', err);
  } finally {
    elements.btnCheckEligibility.innerHTML = 'Check My Eligibility & Matches →';
    elements.btnCheckEligibility.disabled = false;
  }
}

function renderEligibilityResults(results) {
  if (!elements.eligibilityResultsContainer) return;
  elements.eligibilityResultsContainer.innerHTML = '';

  results.forEach(item => {
    const scheme = item.scheme;
    const card = document.createElement('div');
    card.className = `result-card ${item.eligible ? 'eligible' : 'conditional'}`;

    let reasonsHtml = item.reasons.map(r => `<li>✅ ${r}</li>`).join('');
    let warningsHtml = item.warnings.map(w => `<div class="result-warning-box">⚠️ ${w}</div>`).join('');

    card.innerHTML = `
      <div class="result-card-header">
        <div>
          <span class="scheme-badge ${item.eligible ? 'green' : 'amber'}">${item.badge}</span>
          <h3 class="result-title" style="margin-top: 0.4rem;">${scheme.name}</h3>
        </div>
        <button class="card-floating-speaker" title="Listen" onclick="speakScheme('${scheme.id}')">🔊</button>
      </div>

      <div class="result-subvention-box">
        💡 ${item.subventionNote || scheme.tagline}
      </div>

      ${warningsHtml}

      <ul class="result-reasons">
        ${reasonsHtml}
      </ul>

      <div class="result-actions">
        <button class="btn-secondary" onclick="openDocumentChecklist('${scheme.id}')">
          📋 Required Documents (${scheme.documents.length})
        </button>
        <button class="btn-primary-sm" onclick="applyDirectlyToTracker('${scheme.id}')">
          ➕ Apply & Track Loan
        </button>
      </div>
    `;

    elements.eligibilityResultsContainer.appendChild(card);
  });
}

// ==========================================================================
// Document Checklist Modal
// ==========================================================================

function setupModals() {
  if (elements.checklistCloseBtn) {
    elements.checklistCloseBtn.addEventListener('click', () => {
      elements.checklistModal.classList.remove('active');
    });
  }

  if (elements.addLoanCloseBtn) {
    elements.addLoanCloseBtn.addEventListener('click', () => {
      elements.addLoanModal.classList.remove('active');
    });
  }

  if (elements.btnOpenAddLoanModal) {
    elements.btnOpenAddLoanModal.addEventListener('click', () => {
      elements.addLoanModal.classList.add('active');
    });
  }

  if (elements.btnApplyFromChecklist) {
    elements.btnApplyFromChecklist.addEventListener('click', () => {
      if (state.selectedSchemeForChecklist) {
        applyDirectlyToTracker(state.selectedSchemeForChecklist.id);
        elements.checklistModal.classList.remove('active');
      }
    });
  }

  if (elements.addLoanForm) {
    elements.addLoanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleCreateCustomLoan();
    });
  }
}

window.openDocumentChecklist = function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

  state.selectedSchemeForChecklist = scheme;
  elements.checklistModalTitle.textContent = `${scheme.name} - Document Checklist`;
  elements.checklistItemsContainer.innerHTML = '';

  scheme.documents.forEach((doc, idx) => {
    const item = document.createElement('label');
    item.className = 'checklist-item';
    item.innerHTML = `
      <input type="checkbox" id="chk-${doc.id}" checked>
      <div class="checklist-item-text">
        <div class="item-title">${doc.name}</div>
        <div class="item-desc">${doc.desc}</div>
      </div>
    `;
    elements.checklistItemsContainer.appendChild(item);
  });

  elements.checklistModal.classList.add('active');
};

// ==========================================================================
// Multi-Loan & EMI Tracker (With Already Paid Input & Multi-Loan Tracking)
// ==========================================================================

async function loadLoans() {
  try {
    const res = await fetch('/api/loans');
    const json = await res.json();
    if (json.success) {
      state.loans = json.data;
      state.loanSummary = json.summary;
      renderLoanSummary();
      renderLoansList();
    }
  } catch (err) {
    console.error('Failed to load loans:', err);
  }
}

function renderLoanSummary() {
  if (elements.statBorrowed) elements.statBorrowed.textContent = formatINR(state.loanSummary.totalBorrowed);
  if (elements.statPaid) elements.statPaid.textContent = formatINR(state.loanSummary.totalPaid);
  if (elements.statDue) elements.statDue.textContent = formatINR(state.loanSummary.totalDue);
  if (elements.statEmi) elements.statEmi.textContent = formatINR(state.loanSummary.totalMonthlyEmi) + '/mo';
}

function renderLoansList() {
  if (!elements.loansList) return;
  elements.loansList.innerHTML = '';

  if (state.loans.length === 0) {
    elements.loansList.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: #fff; border-radius: 16px; border: 1px dashed #cbd5e1;">
        <p style="font-size: 1.1rem; color: #64748b; margin-bottom: 1rem;">No active loans or schemes currently being tracked.</p>
        <button class="btn-primary-sm" onclick="switchView('schemes')">Browse Schemes to Apply & Track</button>
      </div>
    `;
    return;
  }

  state.loans.forEach(loan => {
    const card = document.createElement('div');
    card.className = 'loan-item-card';

    const percentPaid = loan.percentPaid || 0;
    const isMissOrKcc = loan.schemeId === 'kcc' || loan.schemeId === 'miss';

    card.innerHTML = `
      <div class="loan-card-top">
        <div class="loan-bank-info">
          <div class="bank-logo-badge">🏛️</div>
          <div>
            <h3 class="loan-title-main">${loan.schemeName}</h3>
            <div class="loan-account-meta">${loan.bankName} • ${loan.accountNumber} • ${loan.cropOrPurpose}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="loan-incentive-pill">
            ${isMissOrKcc ? '⚡ 4% Prompt Rate Active' : (loan.status || 'Active')}
          </span>
          <button class="btn-delete-loan" title="Remove from Tracker" onclick="deleteLoan('${loan.id}')">🗑️</button>
        </div>
      </div>

      <!-- Repayment Progress Bar -->
      <div class="repayment-progress-wrap">
        <div class="progress-labels-row">
          <span class="paid-stat">✅ Paid: ${formatINR(loan.paidAmount)} (${percentPaid}%)</span>
          <span class="due-stat">⏳ Balance Due: ${formatINR(loan.dueAmount)}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percentPaid}%;"></div>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div class="loan-financials-grid">
        <div class="fin-metric">
          <div class="fin-label">Total Loan</div>
          <div class="fin-val">${formatINR(loan.totalAmount)}</div>
        </div>
        <div class="fin-metric">
          <div class="fin-label">Interest Rate</div>
          <div class="fin-val" style="color: #15803d;">${loan.interestRate}% ${loan.promptIncentive ? '(Subsidized)' : ''}</div>
        </div>
        <div class="fin-metric">
          <div class="fin-label">Next Due Date</div>
          <div class="fin-val">${loan.dueDate}</div>
        </div>
        <div class="fin-metric">
          <div class="fin-label">Est. EMI / Instalment</div>
          <div class="fin-val">${formatINR(loan.emiAmount)}</div>
        </div>
      </div>

      <!-- Farmer Paid Input & Action Row (Explicit User Requirement) -->
      <div class="paid-update-row">
        <div class="paid-input-group">
          <label for="input-paid-${loan.id}">💰 Amount Already Paid:</label>
          <input type="number" id="input-paid-${loan.id}" class="paid-money-input" value="${loan.paidAmount}" min="0" max="${loan.totalAmount}">
          <button class="btn-update-paid" onclick="updatePaidAmount('${loan.id}')">Update Paid Amount</button>
        </div>
        <div style="font-size: 0.85rem; color: #166534; font-weight: 600;">
          ${isMissOrKcc ? '✨ Tip: Pay on time before ' + loan.dueDate + ' to keep 3% prompt discount!' : ''}
        </div>
      </div>
    `;

    elements.loansList.appendChild(card);
  });
}

// Update Paid Amount (Input where farmer can input amount of money they already paid)
window.updatePaidAmount = async function(loanId) {
  const inputElem = document.getElementById(`input-paid-${loanId}`);
  if (!inputElem) return;

  const newPaidAmount = Number(inputElem.value);

  try {
    const res = await fetch(`/api/loans/${loanId}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paidAmount: newPaidAmount, note: 'Updated by farmer' })
    });

    const json = await res.json();
    if (json.success) {
      await loadLoans();
      const msg = state.currentLang === 'hi' 
        ? `भुगतान अपडेट हो गया। अब बाकी राशि ${formatINR(json.data.dueAmount)} है।`
        : `Payment updated. Remaining balance due is ${formatINR(json.data.dueAmount)}.`;
      speakText(msg);
    }
  } catch (err) {
    console.error('Failed to update paid amount:', err);
  }
};

// One-Click Apply & Add to Loan Tracker
window.applyDirectlyToTracker = async function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

  const defaultTotal = scheme.id === 'pm-kisan' ? 6000 : (scheme.id === 'miss' ? 120000 : (scheme.id === 'kcc' ? 150000 : 500000));
  const defaultPaid = scheme.id === 'pm-kisan' ? 2000 : 0;

  try {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemeId: scheme.id,
        schemeName: scheme.name,
        bankName: 'Gramin Kisan Cooperative Bank',
        accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
        cropOrPurpose: scheme.category,
        totalAmount: defaultTotal,
        paidAmount: defaultPaid,
        interestRate: scheme.effectiveRate,
        tenureMonths: 12
      })
    });

    const json = await res.json();
    if (json.success) {
      await loadLoans();
      switchView('loans');
      const msg = state.currentLang === 'hi'
        ? `${scheme.shortName} आपके ऋण ट्रैकर में जोड़ दिया गया है।`
        : `${scheme.shortName} added to your loan tracker!`;
      speakText(msg);
    }
  } catch (err) {
    console.error('Failed to apply scheme:', err);
  }
};

// Delete Loan
window.deleteLoan = async function(loanId) {
  if (!confirm('Are you sure you want to remove this loan from tracking?')) return;

  try {
    const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      await loadLoans();
    }
  } catch (err) {
    console.error('Failed to delete loan:', err);
  }
};

// Create Custom Loan from Modal
async function handleCreateCustomLoan() {
  const name = document.getElementById('modal-loan-name').value;
  const bank = document.getElementById('modal-bank-name').value;
  const total = Number(document.getElementById('modal-total-amount').value) || 50000;
  const paid = Number(document.getElementById('modal-paid-amount').value) || 0;
  const rate = Number(document.getElementById('modal-interest-rate').value) || 4.0;
  const tenure = Number(document.getElementById('modal-tenure').value) || 12;

  try {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemeId: 'custom',
        schemeName: name,
        bankName: bank,
        cropOrPurpose: 'Custom Farm Credit',
        totalAmount: total,
        paidAmount: paid,
        interestRate: rate,
        tenureMonths: tenure
      })
    });

    const json = await res.json();
    if (json.success) {
      await loadLoans();
      elements.addLoanModal.classList.remove('active');
      elements.addLoanForm.reset();
      speakText('New loan successfully added to your tracker.');
    }
  } catch (err) {
    console.error('Failed to add custom loan:', err);
  }
}
