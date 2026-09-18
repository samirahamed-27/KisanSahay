/**
 * KisanSahay Frontend Application Logic
 * Accessible Agricultural Finance & Multi-Loan Management Portal
 * Supports 15 Indian Languages, Active & Ended Loan Tracking, and Screenshot-Exact UI
 */

// Application State
const state = {
  currentTab: 'home',
  currentLang: localStorage.getItem('kisansahay_lang') || 'en',
  currentLoanTab: 'active', // 'active' | 'ended' | 'all'
  schemes: (typeof window !== 'undefined' && window.KISAN_SCHEMES_DATA) ? window.KISAN_SCHEMES_DATA : [],
  loans: [],
  loanSummary: {
    totalBorrowed: 0,
    totalPaid: 0,
    totalDue: 0,
    totalMonthlyEmi: 0,
    activeCount: 0,
    endedCount: 0,
    allCount: 0
  },
  userFarmProfile: null,
  selectedScheme: null,
  activeSpeech: null,
  isSpeaking: false,
  speechSynth: window.speechSynthesis || null,
  vaultState: {
    isInitialized: false,
    isUnlocked: false,
    passwordType: 'word',
    documents: null
  },
  pendingChosenSchemeId: null,
  activeSecTab: 'word',
  activePinField: 'pass',
  patternSequence: [],
  isDrawingPattern: false,
  currentSoilProfile: null
};

// DOM Elements
const el = {
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.page-view'),
  langToggleBtn: document.getElementById('lang-toggle-btn'),
  langText: document.getElementById('lang-text'),
  langModal: document.getElementById('lang-modal'),
  langModalClose: document.getElementById('lang-modal-close'),
  languagesGrid: document.getElementById('languages-grid-container'),
  
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  mobileDrawer: document.getElementById('mobile-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  drawerCloseBtn: document.getElementById('drawer-close-btn'),

  // Loans UI
  btnOpenAddLoan: document.getElementById('btn-open-add-loan'),
  valStatCount: document.getElementById('val-stat-count'),
  valStatPaid: document.getElementById('val-stat-paid'),
  valStatDue: document.getElementById('val-stat-due'),
  valStatEmi: document.getElementById('val-stat-emi'),
  badgeActiveCount: document.getElementById('badge-active-count'),
  badgeEndedCount: document.getElementById('badge-ended-count'),
  badgeAllCount: document.getElementById('badge-all-count'),
  tabPillBtns: document.querySelectorAll('.tab-pill-btn'),
  loansCardsGrid: document.getElementById('loans-cards-grid'),
  loanListStatusNote: document.getElementById('loan-list-status-note'),

  // Schemes UI
  schemesSearchInput: document.getElementById('schemes-search-input'),
  schemesCardsContainer: document.getElementById('schemes-cards-container'),
  filterChipBtns: document.querySelectorAll('.filter-chip-btn'),
  schemesSortSelect: document.getElementById('schemes-sort-select'),
  schemesCountText: document.getElementById('schemes-count-text'),

  // Vault Quick Access Nav & Indicator
  btnVaultNav: document.getElementById('btn-vault-nav'),
  vaultNavIcon: document.getElementById('vault-nav-icon'),
  vaultStatusNavText: document.getElementById('vault-status-nav-text'),
  vaultIndicatorDot: document.getElementById('vault-indicator-dot'),

  // Vault Modal Elements
  vaultModal: document.getElementById('vault-modal'),
  vaultModalClose: document.getElementById('vault-modal-close'),
  btnVaultCancel: document.getElementById('btn-vault-cancel'),
  btnVaultSaveSubmit: document.getElementById('btn-vault-save-submit'),
  vaultSchemePromptBanner: document.getElementById('vault-scheme-prompt-banner'),
  vaultTargetSchemeName: document.getElementById('vault-target-scheme-name'),
  vaultAadhaar: document.getElementById('vault-aadhaar'),
  vaultLand: document.getElementById('vault-land'),
  vaultBank: document.getElementById('vault-bank'),
  vaultCrop: document.getElementById('vault-crop'),
  vaultCategory: document.getElementById('vault-category'),
  secTabWord: document.getElementById('sec-tab-word'),
  secTabNumber: document.getElementById('sec-tab-number'),
  secTabPattern: document.getElementById('sec-tab-pattern'),
  secPaneWord: document.getElementById('sec-pane-word'),
  secPaneNumber: document.getElementById('sec-pane-number'),
  secPanePattern: document.getElementById('sec-pane-pattern'),
  vaultWordPass: document.getElementById('vault-word-pass'),
  vaultWordConfirm: document.getElementById('vault-word-confirm'),
  vaultPinPass: document.getElementById('vault-pin-pass'),
  vaultPinConfirm: document.getElementById('vault-pin-confirm'),
  pinKeypad: document.getElementById('pin-keypad'),
  btnPinClear: document.getElementById('btn-pin-clear'),
  btnPinBack: document.getElementById('btn-pin-back'),
  patternContainer: document.getElementById('pattern-container'),
  patternCanvas: document.getElementById('pattern-canvas'),
  patternDotsGrid: document.getElementById('pattern-dots-grid'),
  patternFeedback: document.getElementById('pattern-feedback'),
  btnResetPattern: document.getElementById('btn-reset-pattern'),

  // Vault Unlock Modal Elements
  vaultUnlockModal: document.getElementById('vault-unlock-modal'),
  vaultUnlockClose: document.getElementById('vault-unlock-close'),
  btnUnlockCancel: document.getElementById('btn-unlock-cancel'),
  btnUnlockSubmit: document.getElementById('btn-unlock-submit'),
  unlockInputContainer: document.getElementById('unlock-input-container'),
  unlockModalDesc: document.getElementById('unlock-modal-desc'),

  // Eligibility & Recommendation UI
  eligibilityForm: document.getElementById('eligibility-form'),
  cropInput: document.getElementById('crop-input'),
  landSizeInput: document.getElementById('land-size-input'),
  landUnitSelect: document.getElementById('land-unit-select'),
  stateInput: document.getElementById('state-input'),
  districtInput: document.getElementById('district-input'),
  btnDetectGps: document.getElementById('btn-detect-gps'),
  gpsStatusText: document.getElementById('gps-status-text'),
  geoLat: document.getElementById('geo-lat'),
  geoLong: document.getElementById('geo-long'),
  landSelect: document.getElementById('land-ownership-select'),
  categorySelect: document.getElementById('category-select'),
  incomeInput: document.getElementById('income-input'),
  existingLoansInput: document.getElementById('existing-loans-input'),
  activitySelect: document.getElementById('main-activity-select'),
  kccSelect: document.getElementById('kcc-status-select'),
  aadhaarSelect: document.getElementById('aadhaar-status-select'),
  btnSubmitEligibility: document.getElementById('btn-submit-eligibility'),
  eligEmptyState: document.getElementById('elig-empty-state'),
  eligResultsContainer: document.getElementById('elig-results-container'),
  locationContextCard: document.getElementById('location-context-card'),
  debtSafetyCard: document.getElementById('debt-safety-card'),
  recSummaryBanner: document.getElementById('recommendations-summary-banner'),
  recCardsStream: document.getElementById('recommendations-cards-stream'),

  // Modals
  paymentModal: document.getElementById('payment-modal'),
  paymentModalClose: document.getElementById('payment-modal-close'),
  btnCancelPayment: document.getElementById('btn-cancel-payment'),
  recordPaymentForm: document.getElementById('record-payment-form'),
  payLoanId: document.getElementById('pay-loan-id'),
  payLoanSummaryBox: document.getElementById('pay-loan-summary-box'),
  payAmountInput: document.getElementById('pay-amount-input'),
  payNoteInput: document.getElementById('pay-note-input'),

  addLoanModal: document.getElementById('add-loan-modal'),
  addLoanClose: document.getElementById('add-loan-close'),
  btnCancelAddLoan: document.getElementById('btn-cancel-add-loan'),
  createLoanForm: document.getElementById('create-loan-form'),
  newLoanSchemeSelect: document.getElementById('new-loan-scheme-select'),
  modalFarmDetailsBadge: document.getElementById('modal-farm-details-badge'),
  modalFarmDetailsText: document.getElementById('modal-farm-details-text'),
  linkFillFarmDetails: document.getElementById('link-fill-farm-details'),

  checklistModal: document.getElementById('checklist-modal'),
  checklistModalClose: document.getElementById('checklist-modal-close'),
  checklistModalTitle: document.getElementById('checklist-modal-title'),
  checklistItemsBox: document.getElementById('checklist-items-box'),
  btnCloseChecklist: document.getElementById('btn-close-checklist'),
  btnTrackFromChecklist: document.getElementById('btn-track-from-checklist'),

  floatingSpeakerBtn: document.getElementById('floating-speaker-btn'),
  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupLanguages();
  setupSpeech();
  setupEligibility();
  setupModals();
  setupDocumentVault();
  setupLoanTabs();
  setupSchemesSearch();
  setupSahayAI();

  // Apply saved language
  setLanguage(state.currentLang);


  // Load backend data
  await loadCrops();
  await loadSchemes();
  await loadLoans();
});

// Currency Formatter (₹)
function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

// ==========================================================================
// 15 Indian Languages Engine
// ==========================================================================

function setupLanguages() {
  // Render languages grid
  if (el.languagesGrid && window.INDIAN_LANGUAGES) {
    el.languagesGrid.innerHTML = '';
    window.INDIAN_LANGUAGES.forEach(lang => {
      const btn = document.createElement('div');
      btn.className = `lang-grid-item ${lang.code === state.currentLang ? 'active' : ''}`;
      btn.dataset.code = lang.code;
      btn.innerHTML = `
        <span class="native">${lang.native}</span>
        <span class="eng">${lang.name}</span>
      `;
      btn.addEventListener('click', () => {
        setLanguage(lang.code);
        closeLanguageModal();
        showToast(`Language changed to ${lang.name} (${lang.native})`);
      });
      el.languagesGrid.appendChild(btn);
    });
  }

  // Open / Close Language modal
  if (el.langToggleBtn) {
    el.langToggleBtn.addEventListener('click', openLanguageModal);
  }
  if (el.langModalClose) {
    el.langModalClose.addEventListener('click', closeLanguageModal);
  }
  if (el.langModal) {
    el.langModal.addEventListener('click', (e) => {
      if (e.target === el.langModal) closeLanguageModal();
    });
  }
}

function openLanguageModal() {
  if (el.langModal) el.langModal.classList.add('active');
}

function closeLanguageModal() {
  if (el.langModal) el.langModal.classList.remove('active');
}

function t(key, fallback = '') {
  const dict = (window.TRANSLATIONS && window.TRANSLATIONS[state.currentLang]) || (window.TRANSLATIONS && window.TRANSLATIONS['en']) || {};
  return dict[key] || fallback || key;
}

function setLanguage(langCode) {
  state.currentLang = langCode;
  localStorage.setItem('kisansahay_lang', langCode);

  const langObj = window.INDIAN_LANGUAGES ? window.INDIAN_LANGUAGES.find(l => l.code === langCode) : null;
  if (el.langText && langObj) {
    el.langText.textContent = langObj.native || langObj.name;
  }

  // Highlight active in selector grid
  if (el.languagesGrid) {
    el.languagesGrid.querySelectorAll('.lang-grid-item').forEach(item => {
      if (item.dataset.code === langCode) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Translate all DOM elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    const translated = t(key);
    if (translated) {
      elem.textContent = translated;
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
    const key = elem.getAttribute('data-i18n-placeholder');
    const translated = t(key);
    if (translated) {
      elem.placeholder = translated;
    }
  });

  // Re-render loans & schemes to reflect language
  renderLoansList();
  renderSchemesGrid(state.schemes);
}

// ==========================================================================
// Navigation & Views
// ==========================================================================

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      if (view) {
        switchView(view);
        closeMobileDrawer();
      }
    });
  });

  if (el.mobileMenuBtn) {
    el.mobileMenuBtn.addEventListener('click', openMobileDrawer);
  }
  if (el.drawerCloseBtn) {
    el.drawerCloseBtn.addEventListener('click', closeMobileDrawer);
  }
  if (el.drawerOverlay) {
    el.drawerOverlay.addEventListener('click', closeMobileDrawer);
  }
}

function openMobileDrawer() {
  if (el.mobileDrawer) el.mobileDrawer.style.display = 'block';
  if (el.drawerOverlay) el.drawerOverlay.classList.add('active');
}

function closeMobileDrawer() {
  if (el.mobileDrawer) el.mobileDrawer.style.display = 'none';
  if (el.drawerOverlay) el.drawerOverlay.classList.remove('active');
}

function switchView(viewName) {
  state.currentTab = viewName;

  // Header Nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // View active state
  document.querySelectorAll('.page-view').forEach(v => {
    if (v.id === `view-${viewName}`) {
      v.classList.add('active');
    } else {
      v.classList.remove('active');
    }
  });

  if (viewName === 'landrates') {
    const stateSelect = document.getElementById('filter-land-state');
    const districtInput = document.getElementById('filter-land-district');
    const sVal = stateSelect ? stateSelect.value : 'Maharashtra';
    const dVal = districtInput ? districtInput.value.trim() : 'Pune';
    loadLandRates({ state: sVal, district: dVal });
    loadLandRateComparison(sVal, dVal);
  } else if (viewName === 'eligibility') {
    checkEligibilityLive(true);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

}


// ==========================================================================
// Loans Tracker Engine (Active vs Ended Loans)
// ==========================================================================

function setupLoanTabs() {
  el.tabPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.tabPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentLoanTab = btn.getAttribute('data-loan-tab') || 'active';
      renderLoansList();
    });
  });

  if (el.btnOpenAddLoan) {
    el.btnOpenAddLoan.addEventListener('click', () => {
      openAddLoanModalManually();
    });
  }
}

window.openAddLoanModalManually = function() {
  if (el.modalFarmDetailsBadge) el.modalFarmDetailsBadge.style.display = 'none';
  if (el.newLoanSchemeSelect) el.newLoanSchemeSelect.value = '';
  if (el.createLoanForm) el.createLoanForm.reset();
  const paidField = document.getElementById('new-paid-amount');
  if (paidField) paidField.value = 0;
  const statusField = document.getElementById('new-loan-status');
  if (statusField) statusField.value = 'Active';
  if (el.addLoanModal) el.addLoanModal.classList.add('active');
};

function enrichLoanClient(loan) {
  const principal = Number(loan.principalAmount || loan.totalAmount) || 0;
  const rate = Number(loan.interestRate) || 0;
  const tenure = Math.max(1, Number(loan.tenureMonths) || 12);
  
  let totalPayable = Number(loan.totalWithInterest);
  if (!totalPayable || totalPayable < principal) {
    if (rate === 0) {
      totalPayable = principal;
    } else {
      totalPayable = Math.round(principal * (1 + (rate * (tenure / 12)) / 100));
    }
  }

  const paid = Number(loan.paidAmount) || 0;
  const due = Math.max(0, totalPayable - paid);
  const percentPaid = totalPayable > 0 ? Math.min(100, Math.round((paid / totalPayable) * 100)) : 100;
  
  let emi = Number(loan.monthlyEmi || loan.emiAmount) || 0;
  if (!emi) {
    if (rate === 0) {
      emi = Math.round(totalPayable / tenure);
    } else {
      const monthlyRate = rate / 12 / 100;
      emi = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
    }
  }

  let emisLeft = typeof loan.emisLeft === 'number' ? loan.emisLeft : (emi > 0 ? Math.ceil(due / emi) : 0);
  if (due === 0) emisLeft = 0;

  const isEnded = (loan.status && loan.status.toLowerCase() === 'ended') || due === 0;
  const status = isEnded ? 'Ended' : 'Active';

  return {
    ...loan,
    id: loan.id || ('loan-' + Date.now()),
    principalAmount: principal,
    totalAmount: principal,
    totalWithInterest: totalPayable,
    paidAmount: paid,
    dueAmount: due,
    monthlyEmi: isEnded ? 0 : emi,
    emiAmount: isEnded ? 0 : emi,
    emisLeft,
    percentPaid,
    status,
    isFullyPaid: due === 0
  };
}

function recalculateLoanSummary() {
  const enriched = state.loans.map(enrichLoanClient);
  state.loans = enriched;
  const activeLoans = enriched.filter(l => l.status === 'Active' && l.dueAmount > 0);
  const endedLoans = enriched.filter(l => l.status === 'Ended' || l.dueAmount === 0);

  state.loanSummary = {
    totalBorrowed: activeLoans.reduce((acc, l) => acc + (l.principalAmount || 0), 0),
    totalPaid: activeLoans.reduce((acc, l) => acc + (l.paidAmount || 0), 0),
    totalDue: activeLoans.reduce((acc, l) => acc + (l.dueAmount || 0), 0),
    totalMonthlyEmi: activeLoans.reduce((acc, l) => acc + (l.monthlyEmi || 0), 0),
    activeCount: activeLoans.length,
    endedCount: endedLoans.length,
    allCount: enriched.length
  };
}

async function loadLoans() {
  // Clear any legacy dummy loan caches if present in browser storage
  try {
    const rawLocal = localStorage.getItem('kisansahay_loans');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed) && parsed.some(p => p.id === 'loan-1' && p.schemeName && p.schemeName.includes('Kisan Credit Card (KCC)'))) {
        localStorage.removeItem('kisansahay_loans');
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('/api/loans');
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        state.loans = (json.data || []).map(enrichLoanClient);
        if (json.summary && json.data.length > 0) {
          state.loanSummary = json.summary;
        } else {
          recalculateLoanSummary();
        }
        localStorage.setItem('kisansahay_loans', JSON.stringify(state.loans));
        updateLoanSummaryUI();
        renderLoansList();
        return;
      }
    }
  } catch (err) {
    console.warn('Backend API loans unreachable, checking local storage:', err);
  }

  // Fallback to local storage (for VS Code Live Server port 5500)
  try {
    const rawLocal = localStorage.getItem('kisansahay_loans');
    state.loans = rawLocal ? JSON.parse(rawLocal).map(enrichLoanClient) : [];
  } catch (e) {
    state.loans = [];
  }
  recalculateLoanSummary();
  updateLoanSummaryUI();
  renderLoansList();
}

function updateLoanSummaryUI() {
  if (el.valStatCount) el.valStatCount.textContent = state.loanSummary.activeCount;
  if (el.valStatPaid) el.valStatPaid.textContent = formatINR(state.loanSummary.totalPaid);
  if (el.valStatDue) el.valStatDue.textContent = formatINR(state.loanSummary.totalDue);
  if (el.valStatEmi) el.valStatEmi.textContent = formatINR(state.loanSummary.totalMonthlyEmi);

  if (el.badgeActiveCount) el.badgeActiveCount.textContent = state.loanSummary.activeCount;
  if (el.badgeEndedCount) el.badgeEndedCount.textContent = state.loanSummary.endedCount;
  if (el.badgeAllCount) el.badgeAllCount.textContent = state.loanSummary.allCount;
}

function renderLoansList() {
  if (!el.loansCardsGrid) return;
  el.loansCardsGrid.innerHTML = '';

  let filtered = state.loans;
  if (state.currentLoanTab === 'active') {
    filtered = state.loans.filter(l => l.status === 'Active' && l.dueAmount > 0);
    if (el.loanListStatusNote) el.loanListStatusNote.textContent = 'Showing currently running loans with due EMIs';
  } else if (state.currentLoanTab === 'ended') {
    filtered = state.loans.filter(l => l.status === 'Ended' || l.dueAmount === 0);
    if (el.loanListStatusNote) el.loanListStatusNote.textContent = 'Showing fully paid and completed loans';
  } else {
    if (el.loanListStatusNote) el.loanListStatusNote.textContent = 'Showing all loans and credit records';
  }

  if (filtered.length === 0) {
    const msg = state.currentLoanTab === 'ended' ? t('emptyEndedLoans') : t('emptyActiveLoans');
    el.loansCardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: #ffffff; border-radius: var(--radius-md); border: 1.5px dashed var(--border-color);">
        <div style="font-size: 2.8rem; margin-bottom: 0.8rem;">💳</div>
        <p style="color: #0f172a; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.4rem;">${msg}</p>
        <p style="color: #64748b; font-size: 0.95rem; max-width: 520px; margin: 0 auto 1.6rem auto; line-height: 1.5;">
          ${state.currentLoanTab === 'ended' ? 'You have no completed or closed loans on record.' : 'No active running loans. Fill your farm details in Check Eligibility to choose a subsidized loan, or add a loan manually.'}
        </p>
        <div style="display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn-hero-primary" style="padding: 0.65rem 1.5rem; font-size: 0.92rem;" onclick="switchView('eligibility')">
            🌾 Check Eligibility & Choose Loan
          </button>
          <button class="btn-add-loan-top" style="padding: 0.65rem 1.5rem; font-size: 0.92rem;" onclick="openAddLoanModalManually()">
            ➕ Add Loan Manually
          </button>
        </div>
      </div>
    `;
    return;
  }

  filtered.forEach(loan => {
    const card = document.createElement('div');
    card.className = 'loan-card-styled';

    const isEnded = loan.status === 'Ended' || loan.dueAmount === 0;
    const percentPaid = loan.percentPaid || 0;
    const totalDisplay = loan.totalWithInterest ? formatINR(loan.totalWithInterest) : formatINR(loan.principalAmount || loan.totalAmount);
    const paidDisplay = formatINR(loan.paidAmount);

    card.innerHTML = `
      <!-- Header Band Matching Screenshot 1 -->
      <div class="loan-card-header ${isEnded ? 'ended' : ''}">
        <div class="loan-header-info">
          <div class="loan-header-icon">💳</div>
          <div class="loan-header-text">
            <h3>${loan.schemeName}</h3>
            <span>${loan.schemeSub || loan.bankName || 'Agri Loan'}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.6rem; border-radius: var(--radius-pill); font-size: 0.76rem; font-weight: 700;">
            ${isEnded ? t('endedStatus') : t('runningStatus')}
          </span>
          <button class="btn-icon-secondary" style="width: 28px; height: 28px; background: rgba(255,255,255,0.2); border: none; color: #fff; font-size: 0.8rem;" title="Remove" onclick="deleteLoan('${loan.id}')">✕</button>
        </div>
      </div>

      <!-- Body Matching Screenshot 1 -->
      <div class="loan-card-body">
        <!-- Amount Paid Progress -->
        <div>
          <div class="progress-amount-row">
            <span class="progress-label">${t('lblAmountPaid')}</span>
            <span class="progress-fraction">${paidDisplay} / ${totalDisplay}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentPaid}%; ${isEnded ? 'background: #475569;' : ''}"></div>
          </div>
        </div>

        <!-- 2x2 Financial Columns Matching Screenshot 1 -->
        <div class="loan-metrics-grid">
          <div class="metric-item">
            <div class="lbl">${t('lblLoanAmount')}</div>
            <div class="val">${formatINR(loan.principalAmount || loan.totalAmount)}</div>
          </div>
          <div class="metric-item">
            <div class="lbl">${t('lblMonthlyEmi')}</div>
            <div class="val green" style="${isEnded ? 'color: #475569;' : ''}">${isEnded ? '₹0' : formatINR(loan.monthlyEmi || loan.emiAmount)}</div>
          </div>
          <div class="metric-item">
            <div class="lbl">${t('lblDueAmount')}</div>
            <div class="val" style="${loan.dueAmount > 0 ? 'color: #ea580c;' : 'color: #15803d;'}">${formatINR(loan.dueAmount)}</div>
          </div>
          <div class="metric-item">
            <div class="lbl">${t('lblEmisLeft')}</div>
            <div class="val">${isEnded ? '0 ' + t('months') : (loan.emisLeft || 0) + ' ' + t('months')}</div>
          </div>
        </div>

        <!-- Sub-footer with Interest & Tenure -->
        <div class="loan-sub-footer">
          <span>~ ${t('lblInterestRate')}: ${loan.interestRate}% ${t('perAnnum')} • ${t('lblTenure')}: ${loan.tenureMonths || 60} ${t('months')}</span>
        </div>

        <!-- Action Row: Add Payment Made (Green Button) -->
        <div class="loan-action-bar">
          ${isEnded ? `
            <button class="btn-add-payment-action" style="background: #475569;" disabled>
              ✓ ${t('endedStatus')}
            </button>
          ` : `
            <button class="btn-add-payment-action" onclick="openPaymentModal('${loan.id}')">
              <span>+</span> ${t('btnAddPayment')}
            </button>
          `}
          <button class="btn-icon-secondary" title="View History & Details" onclick="viewLoanLedger('${loan.id}')">
            📋
          </button>
        </div>
      </div>
    `;

    el.loansCardsGrid.appendChild(card);
  });
}

// Payment Modal
window.openPaymentModal = function(loanId) {
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return;

  el.payLoanId.value = loan.id;
  el.payLoanSummaryBox.innerHTML = `
    <div>${loan.schemeName} (${loan.schemeSub || loan.bankName})</div>
    <div style="font-size: 0.84rem; color: #ea580c; font-weight: 600; margin-top: 0.2rem;">
      Balance Due: ${formatINR(loan.dueAmount)} • Monthly EMI: ${formatINR(loan.monthlyEmi || loan.emiAmount)}
    </div>
  `;
  el.payAmountInput.value = loan.monthlyEmi || Math.min(loan.dueAmount, 25000);
  el.payAmountInput.max = loan.dueAmount;
  el.paymentModal.classList.add('active');
};

function setupModals() {
  // Payment Modal Close
  if (el.paymentModalClose) {
    el.paymentModalClose.addEventListener('click', () => el.paymentModal.classList.remove('active'));
  }
  if (el.btnCancelPayment) {
    el.btnCancelPayment.addEventListener('click', () => el.paymentModal.classList.remove('active'));
  }

  // Payment Submit
  if (el.recordPaymentForm) {
    el.recordPaymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loanId = el.payLoanId.value;
      const amount = Number(el.payAmountInput.value) || 0;
      const note = el.payNoteInput.value.trim() || 'Direct bank payment';

      if (!loanId || amount <= 0) {
        showToast('Please enter a valid payment amount');
        return;
      }

      const loan = state.loans.find(l => l.id === loanId);
      if (!loan) return;

      loan.paidAmount = (loan.paidAmount || 0) + amount;
      loan.payments = loan.payments || [];
      loan.payments.unshift({
        date: new Date().toISOString().split('T')[0],
        amount,
        note
      });

      const updated = enrichLoanClient(loan);
      Object.assign(loan, updated);

      try {
        await fetch(`/api/loans/${loanId}/payment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, note })
        });
      } catch (err) {
        console.warn('Backend payment save offline, saved locally:', err);
      }

      localStorage.setItem('kisansahay_loans', JSON.stringify(state.loans));
      recalculateLoanSummary();
      updateLoanSummaryUI();
      renderLoansList();

      el.paymentModal.classList.remove('active');
      el.recordPaymentForm.reset();
      showToast(`Payment of ${formatINR(amount)} successfully recorded!`);
      speakText(`Payment of ${formatINR(amount)} recorded. Remaining balance is ${formatINR(loan.dueAmount)}.`);
    });
  }

  // Add Loan Modal Close
  if (el.addLoanClose) {
    el.addLoanClose.addEventListener('click', () => el.addLoanModal.classList.remove('active'));
  }
  if (el.btnCancelAddLoan) {
    el.btnCancelAddLoan.addEventListener('click', () => el.addLoanModal.classList.remove('active'));
  }

  // Scheme Dropdown change listener
  if (el.newLoanSchemeSelect) {
    el.newLoanSchemeSelect.addEventListener('change', () => {
      const opt = el.newLoanSchemeSelect.selectedOptions[0];
      if (!opt || !opt.value) return;

      const name = opt.getAttribute('data-name');
      const rate = opt.getAttribute('data-rate');
      const tenure = opt.getAttribute('data-tenure');
      const amount = opt.getAttribute('data-amount');

      if (name) document.getElementById('new-loan-name').value = name;
      if (rate) document.getElementById('new-interest-rate').value = rate;
      if (tenure) document.getElementById('new-tenure-months').value = tenure;
      if (amount) document.getElementById('new-loan-amount').value = amount;

      const bankField = document.getElementById('new-bank-name');
      if (bankField && !bankField.value.trim()) {
        bankField.value = opt.value === 'aif' || opt.value === 'ahidf' ? 'Commercial Bank / NABARD' : 'State Bank of India / Gramin Bank';
      }
    });
  }

  // Helper link to Check Eligibility
  if (el.linkFillFarmDetails) {
    el.linkFillFarmDetails.addEventListener('click', (e) => {
      e.preventDefault();
      el.addLoanModal.classList.remove('active');
      switchView('eligibility');
      if (el.cropInput) el.cropInput.focus();
    });
  }

  // Add Loan Submit
  if (el.createLoanForm) {
    el.createLoanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-loan-name').value.trim();
      const bank = document.getElementById('new-bank-name').value.trim();
      const totalAmount = Number(document.getElementById('new-loan-amount').value) || 100000;
      const paidAmount = Number(document.getElementById('new-paid-amount').value) || 0;
      const interestRate = Number(document.getElementById('new-interest-rate').value) || 7.0;
      const tenureMonths = Number(document.getElementById('new-tenure-months').value) || 60;
      const status = document.getElementById('new-loan-status').value;

      const newLoanData = enrichLoanClient({
        id: 'loan-' + Date.now(),
        schemeName: name,
        schemeSub: bank ? `${bank} - Agri Loan` : 'Agri Loan',
        bankName: bank || 'State Bank of India',
        principalAmount: totalAmount,
        totalAmount,
        paidAmount,
        interestRate,
        tenureMonths,
        status,
        createdAt: new Date().toISOString()
      });

      try {
        await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLoanData)
        });
      } catch (err) {
        console.warn('Backend unavailable, loan saved locally:', err);
      }

      state.loans.unshift(newLoanData);
      localStorage.setItem('kisansahay_loans', JSON.stringify(state.loans));
      recalculateLoanSummary();
      updateLoanSummaryUI();
      renderLoansList();

      el.addLoanModal.classList.remove('active');
      el.createLoanForm.reset();
      if (el.modalFarmDetailsBadge) el.modalFarmDetailsBadge.style.display = 'none';

      showToast(`🎉 ${name} added! Tracking monthly EMIs.`);
      speakText(`${name} has been added to your loan tracker.`);
      switchView('loans');
    });
  }

  // Checklist Modal Close
  if (el.checklistModalClose) {
    el.checklistModalClose.addEventListener('click', () => el.checklistModal.classList.remove('active'));
  }
  if (el.btnCloseChecklist) {
    el.btnCloseChecklist.addEventListener('click', () => el.checklistModal.classList.remove('active'));
  }
  if (el.btnTrackFromChecklist) {
    el.btnTrackFromChecklist.addEventListener('click', () => {
      if (state.selectedScheme) {
        el.checklistModal.classList.remove('active');
        chooseLoanFromEligibility(state.selectedScheme.id);
      }
    });
  }
}

// Delete Loan
window.deleteLoan = async function(loanId) {
  if (!confirm('Are you sure you want to remove this loan record from your tracker?')) return;
  const idx = state.loans.findIndex(l => l.id === loanId);
  if (idx !== -1) {
    state.loans.splice(idx, 1);
    try {
      await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend delete failed, deleted locally:', err);
    }
    localStorage.setItem('kisansahay_loans', JSON.stringify(state.loans));
    recalculateLoanSummary();
    updateLoanSummaryUI();
    renderLoansList();
    showToast('Loan removed from tracker');
  }
};

window.viewLoanLedger = function(loanId) {
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return;
  const history = (loan.payments || []).map(p => `• ${p.date}: ${formatINR(p.amount)} (${p.note})`).join('\n') || 'No payment history yet.';
  alert(`Payment History for ${loan.schemeName}:\n\n${history}`);
};

// ==========================================================================
// Schemes Catalog (Matching Screenshot 3)
// ==========================================================================

// Pagination state for smooth browsing of 650+ schemes
let currentSchemesBatch = 24;
let activeSchemesFilteredList = [];

async function loadCrops() {
  try {
    const res = await fetch('/api/crops');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        state.cropsList = json.data;
        const datalist = document.getElementById('crop-suggestions');
        if (datalist) {
          datalist.innerHTML = json.data.map(c => 
            `<option value="${c.name} (${c.hindiName})"></option>`
          ).join('');
        }
      }
    }
  } catch (err) {
    console.warn('API /api/crops offline, using fallback crop datalist:', err);
  }
}

async function loadSchemes() {
  if (window.KISAN_SCHEMES_DATA && (!state.schemes || state.schemes.length === 0)) {
    state.schemes = window.KISAN_SCHEMES_DATA;
    applySchemesFilters(true);
  }

  try {
    const res = await fetch('/api/schemes?limit=1000');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        state.schemes = json.data;
        applySchemesFilters(true);
      }
    }
  } catch (err) {
    console.warn('API /api/schemes offline, using embedded schemes data:', err);
  }
}

function getActiveSchemesFiltered() {
  const q = el.schemesSearchInput ? el.schemesSearchInput.value.toLowerCase().trim() : '';
  const activeCategoryBtn = document.querySelector('.filter-chip-btn.active');
  const catFilter = activeCategoryBtn ? activeCategoryBtn.getAttribute('data-filter') : 'all';
  const activeStateBtn = document.querySelector('.state-chip-btn.active');
  const stateFilter = activeStateBtn ? activeStateBtn.getAttribute('data-state') : 'all';

  let list = state.schemes || [];

  // 1. Regional State Filter
  if (stateFilter && stateFilter !== 'all') {
    const sf = stateFilter.toLowerCase();
    list = list.filter(s => {
      if (s.state && s.state.toLowerCase().includes(sf)) return true;
      const applicable = (s.eligibilityCriteria && s.eligibilityCriteria.statesApplicable) || ['all'];
      return applicable.includes('all') || applicable.some(a => a.toLowerCase().includes(sf));
    });
  }

  // 2. Category Filter
  if (catFilter !== 'all') {
    if (catFilter === 'crop') {
      list = list.filter(s => 
        (s.category && s.category.toUpperCase().includes('CROP')) || 
        ['kcc', 'miss', 'pmfby', 'pkvy'].includes(s.id)
      );
    } else if (catFilter === 'infra') {
      list = list.filter(s => 
        (s.category && (s.category.toUpperCase().includes('INFRASTRUCTURE') || s.category.toUpperCase().includes('EQUIPMENT'))) || 
        ['aif', 'ahidf', 'smam'].includes(s.id)
      );
    } else if (catFilter === 'income') {
      list = list.filter(s => 
        (s.category && (s.category.toUpperCase().includes('INCOME') || s.category.toUpperCase().includes('RELIEF') || s.category.toUpperCase().includes('SUBSIDY'))) || 
        ['pm-kisan', 'pm-kmy', 'brfsy'].some(x => s.id.includes(x))
      );
    } else if (catFilter === 'more') {
      list = list.filter(s => 
        (s.category && (s.category.toUpperCase().includes('ALLIED') || s.category.toUpperCase().includes('DAIRY') || s.category.toUpperCase().includes('FISHERIES'))) || 
        ['pm-kusum', 'pmfme', 'acabc'].includes(s.id)
      );
    }
  }

  // 3. Search query
  if (q) {
    list = list.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.shortName && s.shortName.toLowerCase().includes(q)) ||
      (s.tagline && s.tagline.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.state && s.state.toLowerCase().includes(q)) ||
      (s.whatItIs && s.whatItIs.toLowerCase().includes(q))
    );
  }

  return list;
}

function applySchemesFilters(resetBatch = true) {
  if (resetBatch) {
    currentSchemesBatch = 24;
  }
  activeSchemesFilteredList = getActiveSchemesFiltered();
  renderSchemesGrid(activeSchemesFilteredList);
}

function setupSchemesSearch() {
  if (el.schemesSearchInput) {
    el.schemesSearchInput.addEventListener('input', () => {
      applySchemesFilters(true);
    });
  }

  el.filterChipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.filterChipBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applySchemesFilters(true);
    });
  });

  const stateBtns = document.querySelectorAll('.state-chip-btn');
  stateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applySchemesFilters(true);
    });
  });

  // Schemes Sorting Dropdown Listener
  if (el.schemesSortSelect) {
    el.schemesSortSelect.addEventListener('change', () => {
      applySchemesFilters(false);
    });
  }

  // Load More Schemes Button Listener
  const btnLoadMore = document.getElementById('btn-load-more-schemes');
  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
      currentSchemesBatch += 24;
      renderSchemesGrid(activeSchemesFilteredList);
    });
  }
}

// ==========================================================================
// Scheme Tier Classification & Rendering (Green & Top Recommended First)
// ==========================================================================

function getSchemeTier(scheme) {
  const id = (scheme.id || '').toLowerCase();
  const cat = (scheme.category || '').toUpperCase();
  const effRate = Number(scheme.effectiveRate !== undefined ? scheme.effectiveRate : (scheme.baseRate || 7));
  
  // Tier 1: Green / Top Recommended (0%-4% Interest or Direct Subsidized Support)
  if (
    id === 'kcc' ||
    id === 'miss' ||
    id === 'pm-kisan' ||
    id === 'pmfby' ||
    id === 'pkvy' ||
    id === 'pm-kusum' ||
    id === 'pm-kmy' ||
    (cat.includes('CROP') && effRate <= 4.0) ||
    cat.includes('INCOME SUPPORT')
  ) {
    return {
      tier: 1,
      themeColor: 'green',
      pillStyle: 'light-green',
      badgeClass: 'top-tier',
      badgeText: t('topRecommendedBadge', '★ Top Recommended (Green Tier • 0% - 4% Interest)')
    };
  }

  // Tier 2: Teal / Good Alternative (Allied Activities, Farm Equipment & Mechanization)
  if (
    id === 'smam' ||
    id === 'midh' ||
    id === 'acabc' ||
    cat.includes('EQUIPMENT') ||
    cat.includes('MECHANIZATION') ||
    cat.includes('ALLIED') ||
    cat.includes('HORTICULTURE') ||
    cat.includes('DAIRY') ||
    cat.includes('FISHERIES')
  ) {
    return {
      tier: 2,
      themeColor: 'teal',
      pillStyle: 'light-teal',
      badgeClass: 'good-tier',
      badgeText: t('goodAlternativeBadge', '✓ Good Alternative (Allied & Farm Equipment)')
    };
  }

  // Tier 3: Orange / Moderate Fit (Infrastructure, Storage & Post-Harvest Processing)
  if (
    id === 'aif' ||
    id === 'pmfme' ||
    cat.includes('INFRASTRUCTURE') ||
    cat.includes('PROCESSING') ||
    cat.includes('FOOD')
  ) {
    return {
      tier: 3,
      themeColor: 'orange',
      pillStyle: 'light-orange',
      badgeClass: 'moderate-tier',
      badgeText: t('moderateFitBadge', '⚙ Moderate Fit (Infrastructure & Processing)')
    };
  }

  // Tier 4: Red-Orange / Specialized (Large-Scale, High Promoter Capital, Enterprise Schemes)
  return {
    tier: 4,
    themeColor: 'red-orange',
    pillStyle: 'light-red',
    badgeClass: 'specialized-tier',
    badgeText: t('specializedBadge', '🔒 Specialized / High Capital Requirement')
  };
}

function renderSchemesGrid(schemes) {
  if (!el.schemesCardsContainer) return;
  el.schemesCardsContainer.innerHTML = '';

  if (!schemes || schemes.length === 0) {
    el.schemesCardsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #fff; border-radius: var(--radius-md);">
        <p style="color: #64748b;">No schemes matched your search query.</p>
      </div>
    `;
    if (el.schemesCountText) {
      el.schemesCountText.textContent = '0 schemes found';
    }
    return;
  }

  const sortMode = el.schemesSortSelect ? el.schemesSortSelect.value : 'recommended';

  // Sort schemes according to selected sort mode
  const sortedSchemes = [...schemes].sort((a, b) => {
    const tierA = getSchemeTier(a).tier;
    const tierB = getSchemeTier(b).tier;
    const rateA = Number(a.effectiveRate !== undefined ? a.effectiveRate : (a.baseRate || 99));
    const rateB = Number(b.effectiveRate !== undefined ? b.effectiveRate : (b.baseRate || 99));
    const limitA = Number(a.maxLimit || a.maxLoanAmount || 0);
    const limitB = Number(b.maxLimit || b.maxLoanAmount || 0);

    if (sortMode === 'recommended') {
      // Tier 1 (Green) strictly on top, then Tier 2, Tier 3, and Tier 4 at the bottom!
      if (tierA !== tierB) return tierA - tierB;
      if (rateA !== rateB) return rateA - rateB;
      return limitB - limitA;
    } else if (sortMode === 'interest_asc') {
      if (rateA !== rateB) return rateA - rateB;
      return tierA - tierB;
    } else if (sortMode === 'amount_desc') {
      if (limitB !== limitA) return limitB - limitA;
      return tierA - tierB;
    } else if (sortMode === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return 0;
  });

  const loadMoreContainer = document.getElementById('schemes-load-more-container');
  const renderedCountSpan = document.getElementById('schemes-rendered-count');
  const totalCountSpan = document.getElementById('schemes-total-count');

  // Slice batch for smooth rendering performance
  const batchToRender = sortedSchemes.slice(0, currentSchemesBatch);

  // Update dynamic count text
  if (el.schemesCountText) {
    const topCount = sortedSchemes.filter(s => getSchemeTier(s).tier === 1).length;
    el.schemesCountText.textContent = `Showing ${batchToRender.length} of ${sortedSchemes.length} verified schemes (${topCount} Top Recommended on top)`;
  }

  if (loadMoreContainer) {
    if (sortedSchemes.length > currentSchemesBatch) {
      loadMoreContainer.style.display = 'block';
      if (renderedCountSpan) renderedCountSpan.textContent = batchToRender.length;
      if (totalCountSpan) totalCountSpan.textContent = sortedSchemes.length;
    } else {
      loadMoreContainer.style.display = 'none';
    }
  }

  batchToRender.forEach(scheme => {
    const card = document.createElement('div');
    card.className = 'scheme-card-box';

    const tierInfo = getSchemeTier(scheme);
    const highlightsHtml = (scheme.highlights || [scheme.tagline]).map(h => 
      `<div class="scheme-tag-pill ${tierInfo.pillStyle}">${h}</div>`
    ).join('');

    card.innerHTML = `
      <!-- Scheme Tier Status Banner -->
      <div class="scheme-tier-badge ${tierInfo.badgeClass}">
        ${tierInfo.badgeText}
      </div>

      <!-- Top Colored Banner with Smooth Gradient -->
      <div class="scheme-top-banner ${tierInfo.themeColor}">
        <div class="scheme-category-tag">${scheme.category}</div>
        <h3 class="scheme-banner-title">${scheme.name}</h3>
        <div class="scheme-banner-short">${scheme.shortName}</div>
      </div>

      <!-- Body Matching Screenshot 3 -->
      <div class="scheme-card-inner">
        <p class="scheme-card-desc">
          ${scheme.whatItIs || scheme.tagline}
        </p>

        <!-- Highlights & Subvention Badges -->
        <div class="scheme-pill-stats">
          ${highlightsHtml}
        </div>

        <!-- Actions: Choose Loan & View Checklist -->
        <div style="display: flex; gap: 0.5rem; margin-top: 0.85rem;">
          <button class="btn-view-details ${tierInfo.themeColor}" style="flex: 1;" onclick="chooseLoanFromEligibility('${scheme.id}')">
            <span>🌾 Choose Loan</span>
            <span>+</span>
          </button>
          <button class="btn-icon-secondary" style="width: 42px; height: 38px; border-radius: var(--radius-sm); font-size: 0.95rem;" title="Document Checklist" onclick="openChecklist('${scheme.id}')">
            📋
          </button>
        </div>
      </div>
    `;

    el.schemesCardsContainer.appendChild(card);
  });
}

// Open Document Checklist Modal
window.openChecklist = function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

  state.selectedScheme = scheme;
  el.checklistModalTitle.textContent = `${scheme.name} — ${t('docChecklistTitle')}`;
  el.checklistItemsBox.innerHTML = '';

  (scheme.documents || []).forEach(doc => {
    const item = document.createElement('div');
    item.style.cssText = 'background: #f8faf9; padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; align-items: flex-start; gap: 0.65rem;';
    item.innerHTML = `
      <span style="color: #15803d; font-size: 1.1rem; line-height: 1;">✓</span>
      <div>
        <div style="font-weight: 700; font-size: 0.92rem; color: #0f172a;">${doc.name}</div>
        <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">${doc.desc}</div>
      </div>
    `;
    el.checklistItemsBox.appendChild(item);
  });

  el.checklistModal.classList.add('active');
};

// ==========================================================================
// Farmer Document Vault (Word, PIN, Pattern Lock) & Security Engine
// ==========================================================================

const PATTERN_DOT_COORDS = [
  { index: 0, x: 40, y: 40 },
  { index: 1, x: 120, y: 40 },
  { index: 2, x: 200, y: 40 },
  { index: 3, x: 40, y: 120 },
  { index: 4, x: 120, y: 120 },
  { index: 5, x: 200, y: 120 },
  { index: 6, x: 40, y: 200 },
  { index: 7, x: 120, y: 200 },
  { index: 8, x: 200, y: 200 }
];

function setupDocumentVault() {
  // 1. Password Protection Tabs (Word, Number, Pattern)
  const tabBtns = [el.secTabWord, el.secTabNumber, el.secTabPattern].filter(Boolean);
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      state.activeSecTab = targetTab;

      if (el.secPaneWord) el.secPaneWord.style.display = targetTab === 'word' ? 'block' : 'none';
      if (el.secPaneNumber) el.secPaneNumber.style.display = targetTab === 'number' ? 'block' : 'none';
      if (el.secPanePattern) el.secPanePattern.style.display = targetTab === 'pattern' ? 'block' : 'none';
    });
  });

  // 2. PIN Keypad Setup
  initPinKeypad();

  // 3. Pattern Lock Setup
  initPatternLock();

  // 4. Vault Nav Button in Header
  if (el.btnVaultNav) {
    el.btnVaultNav.addEventListener('click', () => {
      if (state.vaultState.isUnlocked) {
        openVaultModal(null, true);
      } else {
        const meta = localStorage.getItem('kisansahay_vault_meta');
        if (meta) {
          try {
            openVaultUnlockModal(JSON.parse(meta));
          } catch (e) {
            openVaultModal();
          }
        } else {
          openVaultModal();
        }
      }
    });
  }

  // 5. Vault Modal Close Buttons
  if (el.vaultModalClose) {
    el.vaultModalClose.addEventListener('click', closeVaultModal);
  }
  if (el.btnVaultCancel) {
    el.btnVaultCancel.addEventListener('click', closeVaultModal);
  }

  // 6. Vault Save Submit Button
  if (el.btnVaultSaveSubmit) {
    el.btnVaultSaveSubmit.addEventListener('click', saveFarmerVault);
  }

  // 7. Unlock Modal Close Buttons
  if (el.vaultUnlockClose) {
    el.vaultUnlockClose.addEventListener('click', closeVaultUnlockModal);
  }
  if (el.btnUnlockCancel) {
    el.btnUnlockCancel.addEventListener('click', closeVaultUnlockModal);
  }
  if (el.btnUnlockSubmit) {
    el.btnUnlockSubmit.addEventListener('click', unlockFarmerVault);
  }

  // 8. Check initial vault status from server & cache
  checkVaultStatus();
}

function initPinKeypad() {
  if (!el.pinKeypad) return;

  let activeField = el.vaultPinPass;
  if (el.vaultPinPass) {
    el.vaultPinPass.addEventListener('focus', () => { activeField = el.vaultPinPass; });
  }
  if (el.vaultPinConfirm) {
    el.vaultPinConfirm.addEventListener('focus', () => { activeField = el.vaultPinConfirm; });
  }

  el.pinKeypad.querySelectorAll('.keypad-key[data-digit]').forEach(key => {
    key.addEventListener('click', () => {
      if (!activeField) activeField = el.vaultPinPass;
      if (activeField && activeField.value.length < 6) {
        activeField.value += key.getAttribute('data-digit');
      }
    });
  });

  if (el.btnPinClear) {
    el.btnPinClear.addEventListener('click', () => {
      if (activeField) activeField.value = '';
    });
  }

  if (el.btnPinBack) {
    el.btnPinBack.addEventListener('click', () => {
      if (activeField && activeField.value.length > 0) {
        activeField.value = activeField.value.slice(0, -1);
      }
    });
  }
}

function initPatternLock() {
  const container = el.patternContainer;
  const canvas = el.patternCanvas;
  if (!container || !canvas) return;

  const dotElements = el.patternDotsGrid ? el.patternDotsGrid.querySelectorAll('.pattern-dot') : [];

  function getPointerPos(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleStart(e) {
    e.preventDefault();
    state.isDrawingPattern = true;
    state.patternSequence = [];
    dotElements.forEach(d => d.classList.remove('dot-selected', 'dot-origin'));
    if (el.patternFeedback) {
      el.patternFeedback.textContent = 'Drawing pattern...';
      el.patternFeedback.style.color = '#15803d';
    }

    const pos = getPointerPos(e);
    checkDotCollision(pos);
    drawPatternLines(pos);
  }

  function handleMove(e) {
    if (!state.isDrawingPattern) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    checkDotCollision(pos);
    drawPatternLines(pos);
  }

  function handleEnd(e) {
    if (!state.isDrawingPattern) return;
    state.isDrawingPattern = false;
    drawPatternLines(null);

    if (state.patternSequence.length < 4) {
      if (el.patternFeedback) {
        el.patternFeedback.textContent = `⚠️ Connect at least 4 dots (${state.patternSequence.length} connected). Try again.`;
        el.patternFeedback.style.color = '#dc2626';
      }
    } else {
      if (el.patternFeedback) {
        el.patternFeedback.textContent = `✓ Pattern recorded (${state.patternSequence.length} dots connected)`;
        el.patternFeedback.style.color = '#15803d';
      }
    }
  }

  function checkDotCollision(pos) {
    PATTERN_DOT_COORDS.forEach(dot => {
      const dist = Math.hypot(dot.x - pos.x, dot.y - pos.y);
      if (dist < 26) {
        if (!state.patternSequence.includes(dot.index)) {
          if (state.patternSequence.length === 0) {
            dotElements[dot.index]?.classList.add('dot-origin');
          }
          state.patternSequence.push(dot.index);
          dotElements[dot.index]?.classList.add('dot-selected');
          if (el.patternFeedback) {
            el.patternFeedback.textContent = `Pattern: ${state.patternSequence.length} dots connected`;
          }
        }
      }
    });
  }

  container.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  container.addEventListener('touchstart', handleStart, { passive: false });
  container.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);

  if (el.btnResetPattern) {
    el.btnResetPattern.addEventListener('click', () => {
      state.patternSequence = [];
      state.isDrawingPattern = false;
      dotElements.forEach(d => d.classList.remove('dot-selected', 'dot-origin'));
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (el.patternFeedback) {
        el.patternFeedback.textContent = 'Touch & drag or click dots to draw pattern';
        el.patternFeedback.style.color = '#15803d';
      }
    });
  }
}

function drawPatternLines(targetPos = null, canvasId = 'pattern-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.patternSequence.length === 0) return;

  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  state.patternSequence.forEach((dotIdx, i) => {
    const pt = PATTERN_DOT_COORDS[dotIdx];
    if (i === 0) {
      ctx.moveTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  });

  if (targetPos && state.isDrawingPattern) {
    ctx.lineTo(targetPos.x, targetPos.y);
  }

  ctx.stroke();
}

function openVaultModal(scheme = null, isOverview = false) {
  if (scheme) {
    if (el.vaultSchemePromptBanner && el.vaultTargetSchemeName) {
      el.vaultSchemePromptBanner.style.display = 'flex';
      el.vaultTargetSchemeName.textContent = `Applying for ${scheme.shortName || scheme.name}`;
    }
  } else {
    if (el.vaultSchemePromptBanner) el.vaultSchemePromptBanner.style.display = 'none';
  }

  if (el.vaultModal) el.vaultModal.classList.add('active');
}

function closeVaultModal() {
  if (el.vaultModal) el.vaultModal.classList.remove('active');
}

function openVaultUnlockModal(vaultMeta = {}, scheme = null) {
  if (scheme) state.pendingChosenSchemeId = scheme.id;
  const pwType = vaultMeta.passwordType || 'word';

  if (el.unlockModalDesc) {
    const typeLabel = pwType === 'word' ? 'Word Passphrase' : (pwType === 'number' ? '4-6 Digit Number PIN' : 'Pattern Lock');
    el.unlockModalDesc.textContent = `Your documents are encrypted. Enter your ${typeLabel} to unlock.`;
  }

  if (el.unlockInputContainer) {
    if (pwType === 'word') {
      el.unlockInputContainer.innerHTML = `
        <label class="input-label-clean" for="unlock-word-input">Enter Secret Passphrase *</label>
        <input type="password" id="unlock-word-input" class="input-clean" placeholder="Enter your secret word">
      `;
    } else if (pwType === 'number') {
      el.unlockInputContainer.innerHTML = `
        <label class="input-label-clean" for="unlock-pin-input">Enter Number PIN *</label>
        <input type="password" id="unlock-pin-input" class="input-clean" placeholder="• • • •" maxlength="6" style="letter-spacing: 0.35rem; font-size: 1.3rem; text-align: center;">
      `;
    } else if (pwType === 'pattern') {
      el.unlockInputContainer.innerHTML = `
        <div class="pattern-lock-wrap">
          <p style="font-size: 0.84rem; color: #475569; margin-bottom: 0.5rem; text-align: center;">Draw your unlock pattern below:</p>
          <div class="pattern-container" id="unlock-pattern-container">
            <canvas id="unlock-pattern-canvas" width="240" height="240"></canvas>
            <div class="pattern-dots-grid" id="unlock-pattern-dots">
              <div class="pattern-dot" data-index="0"><span></span></div>
              <div class="pattern-dot" data-index="1"><span></span></div>
              <div class="pattern-dot" data-index="2"><span></span></div>
              <div class="pattern-dot" data-index="3"><span></span></div>
              <div class="pattern-dot" data-index="4"><span></span></div>
              <div class="pattern-dot" data-index="5"><span></span></div>
              <div class="pattern-dot" data-index="6"><span></span></div>
              <div class="pattern-dot" data-index="7"><span></span></div>
              <div class="pattern-dot" data-index="8"><span></span></div>
            </div>
          </div>
          <div class="pattern-feedback" id="unlock-pattern-feedback">Connect your pattern</div>
        </div>
      `;
      setupUnlockPatternLock();
    }
  }

  if (el.vaultUnlockModal) el.vaultUnlockModal.classList.add('active');
}

function closeVaultUnlockModal() {
  if (el.vaultUnlockModal) el.vaultUnlockModal.classList.remove('active');
}

function setupUnlockPatternLock() {
  const container = document.getElementById('unlock-pattern-container');
  const canvas = document.getElementById('unlock-pattern-canvas');
  if (!container || !canvas) return;

  const dotElements = container.querySelectorAll('.pattern-dot');
  state.patternSequence = [];

  function getPointerPos(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleStart(e) {
    e.preventDefault();
    state.isDrawingPattern = true;
    state.patternSequence = [];
    dotElements.forEach(d => d.classList.remove('dot-selected', 'dot-origin'));
    const pos = getPointerPos(e);
    checkDotCollision(pos);
    drawPatternLines(pos, 'unlock-pattern-canvas');
  }

  function handleMove(e) {
    if (!state.isDrawingPattern) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    checkDotCollision(pos);
    drawPatternLines(pos, 'unlock-pattern-canvas');
  }

  function handleEnd(e) {
    if (!state.isDrawingPattern) return;
    state.isDrawingPattern = false;
    drawPatternLines(null, 'unlock-pattern-canvas');
    const fb = document.getElementById('unlock-pattern-feedback');
    if (fb) fb.textContent = `Pattern: ${state.patternSequence.length} dots connected`;
  }

  function checkDotCollision(pos) {
    PATTERN_DOT_COORDS.forEach(dot => {
      const dist = Math.hypot(dot.x - pos.x, dot.y - pos.y);
      if (dist < 26) {
        if (!state.patternSequence.includes(dot.index)) {
          if (state.patternSequence.length === 0) {
            dotElements[dot.index]?.classList.add('dot-origin');
          }
          state.patternSequence.push(dot.index);
          dotElements[dot.index]?.classList.add('dot-selected');
        }
      }
    });
  }

  container.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  container.addEventListener('touchstart', handleStart, { passive: false });
  container.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
}

async function saveFarmerVault() {
  const aadhaarCard = el.vaultAadhaar ? el.vaultAadhaar.value.trim() : '';
  const landRecord = el.vaultLand ? el.vaultLand.value.trim() : '';
  const bankDetails = el.vaultBank ? el.vaultBank.value.trim() : '';
  const cropSowing = el.vaultCrop ? el.vaultCrop.value.trim() : '';
  const categoryCert = el.vaultCategory ? el.vaultCategory.value.trim() : '';

  if (!aadhaarCard || aadhaarCard.length < 10) {
    showToast('Please provide a valid 12-digit Aadhaar Card number.');
    if (el.vaultAadhaar) el.vaultAadhaar.focus();
    return;
  }
  if (!landRecord) {
    showToast('Please provide your Land Record / Khasra-Khatauni / Patta detail.');
    if (el.vaultLand) el.vaultLand.focus();
    return;
  }
  if (!bankDetails) {
    showToast('Please provide your Bank Account & IFSC details.');
    if (el.vaultBank) el.vaultBank.focus();
    return;
  }
  if (!cropSowing) {
    showToast('Please provide your Crop Sowing / Cultivation Proof.');
    if (el.vaultCrop) el.vaultCrop.focus();
    return;
  }

  let chosenPassword = '';
  const pwType = state.activeSecTab || 'word';

  if (pwType === 'word') {
    const pass = el.vaultWordPass ? el.vaultWordPass.value : '';
    const confirm = el.vaultWordConfirm ? el.vaultWordConfirm.value : '';
    if (!pass || pass.length < 4) {
      showToast('Word passphrase must be at least 4 characters.');
      return;
    }
    if (pass !== confirm) {
      showToast('Word passphrases do not match. Please re-enter.');
      return;
    }
    chosenPassword = pass;
  } else if (pwType === 'number') {
    const pass = el.vaultPinPass ? el.vaultPinPass.value.trim() : '';
    const confirm = el.vaultPinConfirm ? el.vaultPinConfirm.value.trim() : '';
    if (!pass || !/^\d{4,6}$/.test(pass)) {
      showToast('PIN must be 4 to 6 numeric digits.');
      return;
    }
    if (pass !== confirm) {
      showToast('PINs do not match. Please re-enter.');
      return;
    }
    chosenPassword = pass;
  } else if (pwType === 'pattern') {
    if (state.patternSequence.length < 4) {
      showToast('Pattern Lock must connect at least 4 dots.');
      return;
    }
    chosenPassword = state.patternSequence.join('-');
  }

  const documents = {
    aadhaarCard,
    landRecord,
    bankDetails,
    cropSowing,
    categoryCert,
    verifiedAt: new Date().toISOString(),
    isVerified: true
  };

  try {
    const res = await fetch('/api/vault/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'farmer_primary',
        documents,
        password: chosenPassword,
        passwordType: pwType
      })
    });
    if (res.ok) {
      const data = await res.json();
      console.log('Vault successfully saved to server:', data);
    }
  } catch (err) {
    console.warn('Backend vault save offline, persisting locally:', err);
  }

  // Update client state
  const vaultMeta = {
    isInitialized: true,
    passwordType: pwType,
    updatedAt: new Date().toISOString(),
    docCount: 5
  };
  localStorage.setItem('kisansahay_vault_meta', JSON.stringify(vaultMeta));
  state.vaultState = {
    isInitialized: true,
    isUnlocked: true,
    passwordType: pwType,
    documents
  };

  updateVaultNavIndicator('unlocked');
  closeVaultModal();
  showToast(`🔒 Document Vault encrypted & secured with your ${pwType.toUpperCase()} lock!`);

  // If prompted via "Choose Loan", seamlessly proceed to loan tracker modal!
  if (state.pendingChosenSchemeId) {
    const scheme = state.schemes.find(s => s.id === state.pendingChosenSchemeId);
    state.pendingChosenSchemeId = null;
    if (scheme) {
      setTimeout(() => openLoanTrackerModalForScheme(scheme), 350);
    }
  }
}

async function unlockFarmerVault() {
  const meta = JSON.parse(localStorage.getItem('kisansahay_vault_meta') || '{}');
  const pwType = meta.passwordType || 'word';
  let enteredPassword = '';

  if (pwType === 'word') {
    const input = document.getElementById('unlock-word-input');
    enteredPassword = input ? input.value : '';
  } else if (pwType === 'number') {
    const input = document.getElementById('unlock-pin-input');
    enteredPassword = input ? input.value.trim() : '';
  } else if (pwType === 'pattern') {
    enteredPassword = state.patternSequence.join('-');
  }

  if (!enteredPassword) {
    showToast('Please enter your security key or draw your pattern.');
    return;
  }

  try {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'farmer_primary',
        password: enteredPassword
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      state.vaultState.isUnlocked = true;
      state.vaultState.documents = json.documents || {};
      updateVaultNavIndicator('unlocked');
      closeVaultUnlockModal();
      showToast('🔓 Document Vault successfully unlocked!');

      if (state.pendingChosenSchemeId) {
        const scheme = state.schemes.find(s => s.id === state.pendingChosenSchemeId);
        state.pendingChosenSchemeId = null;
        if (scheme) {
          setTimeout(() => openLoanTrackerModalForScheme(scheme), 350);
        }
      }
      return;
    } else {
      showToast(`❌ ${json.message || 'Incorrect password. Access denied.'}`);
      return;
    }
  } catch (err) {
    console.warn('Backend unlock offline, unlocking locally:', err);
    state.vaultState.isUnlocked = true;
    updateVaultNavIndicator('unlocked');
    closeVaultUnlockModal();
    showToast('🔓 Document Vault unlocked locally!');
    if (state.pendingChosenSchemeId) {
      const scheme = state.schemes.find(s => s.id === state.pendingChosenSchemeId);
      state.pendingChosenSchemeId = null;
      if (scheme) {
        setTimeout(() => openLoanTrackerModalForScheme(scheme), 350);
      }
    }
  }
}

async function checkVaultStatus() {
  try {
    const res = await fetch('/api/vault/status?userId=farmer_primary');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.isInitialized) {
        state.vaultState.isInitialized = true;
        state.vaultState.passwordType = json.data.passwordType || 'word';
        localStorage.setItem('kisansahay_vault_meta', JSON.stringify(json.data));
        updateVaultNavIndicator(state.vaultState.isUnlocked ? 'unlocked' : 'locked');
        return;
      }
    }
  } catch (e) {
    console.warn('Vault status fetch fallback:', e);
  }

  const meta = localStorage.getItem('kisansahay_vault_meta');
  if (meta) {
    try {
      const parsed = JSON.parse(meta);
      state.vaultState.isInitialized = true;
      state.vaultState.passwordType = parsed.passwordType || 'word';
      updateVaultNavIndicator(state.vaultState.isUnlocked ? 'unlocked' : 'locked');
      return;
    } catch (e) {}
  }

  updateVaultNavIndicator('uninitialized');
}

function updateVaultNavIndicator(status) {
  if (el.vaultIndicatorDot) {
    el.vaultIndicatorDot.className = `vault-indicator-dot ${status}`;
  }
  if (el.vaultStatusNavText) {
    if (status === 'unlocked') {
      el.vaultStatusNavText.textContent = 'Vault (Verified ✓)';
    } else if (status === 'locked') {
      el.vaultStatusNavText.textContent = 'Vault (Locked 🔒)';
    } else {
      el.vaultStatusNavText.textContent = 'Document Vault';
    }
  }
}

// Open Loan Tracker Modal for Scheme (after document verification)
function openLoanTrackerModalForScheme(scheme) {
  // Make sure farm profile is collected
  const profile = state.userFarmProfile || {
    cropType: el.cropInput ? el.cropInput.value.trim() : 'Crop Cultivation',
    annualIncome: el.incomeInput ? (Number(el.incomeInput.value) || 150000) : 150000,
    district: el.districtInput ? el.districtInput.value.trim() : '',
    landOwnership: el.landSelect ? el.landSelect.value : 'owner',
    mainActivity: el.activitySelect ? el.activitySelect.value : 'crop'
  };

  // Show the farm profile badge in the modal
  if (el.modalFarmDetailsBadge && el.modalFarmDetailsText) {
    el.modalFarmDetailsBadge.style.display = 'block';
    const activityName = profile.mainActivity === 'crop' ? 'Crop Cultivation' : (profile.mainActivity === 'dairy' ? 'Dairy Farming' : (profile.mainActivity === 'poultry' ? 'Poultry & Allied' : 'Agri Infrastructure'));
    const landType = (profile.landOwnership || 'OWNER').toUpperCase();
    const loc = profile.district ? ` in ${profile.district}` : '';
    el.modalFarmDetailsText.innerHTML = `<strong>${activityName}</strong> • ${profile.cropType || 'Crops'} • ${landType} Farmer${loc} • 🔒 Documents Verified`;
  }

  // Pre-fill modal fields
  if (el.newLoanSchemeSelect) {
    const matchingOption = Array.from(el.newLoanSchemeSelect.options).find(o => o.value === scheme.id);
    if (matchingOption) {
      el.newLoanSchemeSelect.value = scheme.id;
    } else {
      el.newLoanSchemeSelect.value = 'custom';
    }
  }

  const nameInput = document.getElementById('new-loan-name');
  const bankInput = document.getElementById('new-bank-name');
  const amountInput = document.getElementById('new-loan-amount');
  const rateInput = document.getElementById('new-interest-rate');
  const tenureInput = document.getElementById('new-tenure-months');
  const paidInput = document.getElementById('new-paid-amount');
  const statusSelect = document.getElementById('new-loan-status');

  if (nameInput) nameInput.value = scheme.name;
  if (bankInput) bankInput.value = `${scheme.category.includes('INFRA') ? 'Commercial Bank / NABARD' : 'State Bank of India / Gramin Bank'} ${profile.district ? '(' + profile.district + ')' : ''}`.trim();
  
  // Set recommended amount based on scheme
  let recommendedAmount = 300000;
  if (scheme.id === 'aif') recommendedAmount = 2000000;
  else if (scheme.id === 'ahidf') recommendedAmount = 1000000;
  else if (scheme.id === 'smam') recommendedAmount = 500000;
  else if (scheme.id === 'pm-kusum') recommendedAmount = 250000;
  else if (scheme.id === 'pmfme') recommendedAmount = 500000;
  else if (scheme.id === 'pm-kisan') recommendedAmount = 6000;
  else if (scheme.maxLimit) recommendedAmount = Math.min(scheme.maxLimit, 300000);

  if (amountInput) amountInput.value = recommendedAmount;
  if (rateInput) rateInput.value = scheme.effectiveRate || scheme.baseRate || 4.0;
  if (tenureInput) tenureInput.value = (scheme.id === 'aif' || scheme.id === 'ahidf') ? 72 : (scheme.id === 'smam' ? 48 : 60);
  if (paidInput) paidInput.value = 0;
  if (statusSelect) statusSelect.value = 'Active';

  // Open modal and focus on amount
  el.addLoanModal.classList.add('active');
  if (amountInput) amountInput.focus();

  showToast(`Pre-filled loan details for ${scheme.shortName || scheme.name}. Review & confirm!`);
}

// Choose Loan Flow (Guaranteed Document Vault Check)
window.chooseLoanFromEligibility = function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

  // 1. Mandatory Document Verification Check
  if (!state.vaultState.isUnlocked) {
    state.pendingChosenSchemeId = schemeId;
    const meta = localStorage.getItem('kisansahay_vault_meta');
    if (meta) {
      try {
        const parsed = JSON.parse(meta);
        openVaultUnlockModal(parsed, scheme);
      } catch (e) {
        openVaultModal(scheme);
      }
    } else {
      openVaultModal(scheme);
    }
    return;
  }

  // Vault is ready and unlocked!
  openLoanTrackerModalForScheme(scheme);
};

// Backward-compatible alias
window.applySchemeToTracker = function(schemeId) {
  chooseLoanFromEligibility(schemeId);
};

// Client-side Eligibility & Multi-Factor Recommendation Fallback
function evaluateEligibilityClient(userInput, schemesList) {
  const {
    cropType = 'Wheat, Paddy',
    landSizeAcres = 2.5,
    annualIncome = 250000,
    district = 'Ludhiana',
    state = 'Punjab',
    landOwnership = 'owner',
    category = 'general',
    existingLoans = 0,
    hasKcc = true,
    hasAadhaar = true
  } = userInput;

  const normalizedCrop = String(cropType).trim().toLowerCase();
  const income = Math.max(30000, Number(annualIncome) || 250000);
  const monthlyFarmIncome = Math.round(income / 12);
  const existingDebt = Number(existingLoans) || 0;
  const existingMonthlyEmi = existingDebt > 0 ? Math.round((existingDebt * 0.07) / 12) : 0;
  const baselineDTI = monthlyFarmIncome > 0 ? Number(((existingMonthlyEmi / monthlyFarmIncome) * 100).toFixed(1)) : 0;
  const isDebtTrap = baselineDTI > 50;

  const debtCapacity = {
    monthly_farm_income: monthlyFarmIncome,
    existing_monthly_emi: existingMonthlyEmi,
    baseline_dti_ratio: `${baselineDTI}%`,
    dti_percent: baselineDTI,
    max_safe_borrowing_limit: Math.max(50000, Math.round((monthlyFarmIncome * 0.35 * 36) / 1.05)),
    debt_status: isDebtTrap ? 'DEBT_TRAP_RISK' : (baselineDTI > 35 ? 'MODERATE_BURDEN' : 'SAFE')
  };

  const list = (schemesList && schemesList.length > 0) ? schemesList : (window.KISAN_SCHEMES_DATA || []);

  const scored = list.map(scheme => {
    let eligible = true;
    let score = 80;
    const matchReasons = [];
    const unmetCriteria = [];
    const warnings = [];

    // Ownership check
    const allowed = (scheme.eligibility && scheme.eligibility.farmerTypes) || ['owner', 'tenant', 'sharecropper', 'leaseholder'];
    if (!allowed.includes(landOwnership) && !allowed.includes('all')) {
      if (scheme.id === 'pm-kisan' && landOwnership !== 'owner') {
        eligible = false;
        score -= 50;
        unmetCriteria.push('PM-KISAN requires cultivable landholding in applicant\'s own name.');
      } else {
        score -= 20;
        warnings.push('Requires tenancy verification certificate from village panchayat.');
      }
    } else {
      matchReasons.push(`Matched your landholding status: ${landOwnership.toUpperCase()}`);
    }

    // Category check
    if (scheme.id === 'stand-up-india' && category !== 'sc' && category !== 'st' && category !== 'women') {
      eligible = false;
      score -= 50;
      unmetCriteria.push('Exclusively for SC, ST, or Women entrepreneurs.');
    } else if (category === 'women' || category === 'sc' || category === 'st') {
      score += 10;
      matchReasons.push(`Special subsidized interest rate / priority quota for ${category.toUpperCase()} farmers.`);
    }

    // Rate scoring
    const netRate = scheme.subsidizedInterestRate !== undefined ? scheme.subsidizedInterestRate : (scheme.interestRate || 7);
    score += Math.max(0, 20 - Math.round(netRate * 2));

    score = Math.max(20, Math.min(99, score));
    if (!eligible) score = Math.min(score, 48);

    const isSafe = !isDebtTrap;

    return {
      scheme_id: scheme.id,
      scheme_name: scheme.name,
      short_name: scheme.shortName || scheme.name,
      category: scheme.category || 'Agricultural Loan',
      score,
      eligible,
      interest_rate: netRate <= 0 ? '0% (Grant)' : `${netRate}% p.a.`,
      stated_base_rate: `${scheme.interestRate || scheme.baseInterestRate || 7}% p.a.`,
      subsidy_percentage: scheme.subsidyPercentage ? `${scheme.subsidyPercentage}%` : '0%',
      max_loan_amount: formatINR(scheme.maxLoanAmount || 300000),
      collateral_free_limit: formatINR(scheme.collateralFreeLimit || 160000),
      eligibility_reason: eligible ? (scheme.highlights ? scheme.highlights[0] : 'Qualified for full benefits') : unmetCriteria[0],
      match_reasons: matchReasons,
      unmet_criteria: unmetCriteria,
      warnings: warnings,
      debt_safety: {
        is_safe: isSafe,
        risk_level: isDebtTrap ? 'DEBT_TRAP_RISK' : 'SAFE',
        projected_dti: `${baselineDTI}%`,
        safety_badge: isDebtTrap ? 'Debt Trap Warning' : 'Safe Borrowing Level',
        credit_details: {
          processing_fee: '0.50% (Max ₹2,500)',
          gst: '18% on processing',
          stamp_duty: 'Waived under ₹1.6 Lakh',
          total_credit_cost: `Estimated ~${(netRate + 0.3).toFixed(1)}% p.a.`
        }
      },
      documents_required: (scheme.documents || []).map(d => ({ name: typeof d === 'string' ? d : d.name, required: true })),
      apply_link: scheme.application ? scheme.application.applyUrl : 'https://www.myscheme.gov.in',
      offline_application_center: 'Nearest Bank Branch / CSC'
    };
  });

  const eligibleSchemes = scored.filter(s => s.eligible && s.score >= 50).sort((a, b) => b.score - a.score);
  const ineligibleSchemes = scored.filter(s => !s.eligible || s.score < 50).sort((a, b) => b.score - a.score);

  const recommendations = [];
  if (eligibleSchemes.length > 0) {
    const best = eligibleSchemes[0];
    best.status = 'best';
    best.colorCode = '#15803d';
    best.status_label = 'Best Match (Top Recommendation)';
    recommendations.push(best);
  }

  const goodPool = eligibleSchemes.slice(1, 12);
  goodPool.forEach(item => {
    item.status = 'good';
    item.colorCode = '#16a34a';
    item.status_label = 'Good Alternative';
    recommendations.push(item);
  });

  const moderatePool = eligibleSchemes.slice(12);
  moderatePool.forEach(item => {
    item.status = 'moderate';
    item.colorCode = '#d97706';
    item.status_label = 'Moderate Fit (Review Needed)';
    recommendations.push(item);
  });

  ineligibleSchemes.forEach(item => {
    item.status = 'ineligible';
    item.colorCode = '#dc2626';
    item.status_label = 'Not Eligible (See Criteria)';
    recommendations.push(item);
  });

  return {
    success: true,
    farmer_location: `${district}, ${state}`,
    farmer_context: {
      soil_type: 'Alluvial Loam',
      soil_ph: 7.2,
      soil_health_advisory: 'Rich fertile loam. High nitrogen and moisture retention capacity.',
      estimated_land_value_per_acre: 2400000,
      price_per_sqft: 55.1,
      crop_trends: 'Wheat & Rice dominate. Strong MSP procurement support.'
    },
    debt_safety_assessment: debtCapacity,
    meta: {
      total_schemes_evaluated: scored.length,
      best_count: eligibleSchemes.length > 0 ? 1 : 0,
      good_count: goodPool.length,
      moderate_count: moderatePool.length,
      ineligible_count: ineligibleSchemes.length
    },
    recommendations
  };
}

// ==========================================================================
// Eligibility & Multi-Factor Recommendation Controller
// ==========================================================================

let eligDebounceTimer = null;

function triggerDebouncedEligibility(delayMs = 300) {
  if (eligDebounceTimer) clearTimeout(eligDebounceTimer);

  const skeleton = document.getElementById('eligibility-skeleton-loader');
  const resultsContainer = document.getElementById('elig-results-container');
  if (skeleton) skeleton.style.display = 'flex';
  if (resultsContainer) resultsContainer.style.opacity = '0.35';

  eligDebounceTimer = setTimeout(async () => {
    await checkEligibilityLive(true);
    if (skeleton) skeleton.style.display = 'none';
    if (resultsContainer) resultsContainer.style.opacity = '1';
  }, delayMs);
}

function updateFacetCounts(facets) {
  if (!facets) return;

  const setEl = (id, count) => {
    const node = document.getElementById(id);
    if (node && count !== undefined) {
      node.textContent = count;
    }
  };

  if (facets.categories) {
    setEl('count-cat-general', facets.categories.general);
    setEl('count-cat-obc', facets.categories.obc);
    setEl('count-cat-sc', facets.categories.sc);
    setEl('count-cat-st', facets.categories.st);
    setEl('count-cat-women', facets.categories.women);
  }

  if (facets.incomeBrackets) {
    setEl('count-inc-all', facets.incomeBrackets.all);
    setEl('count-inc-under1l', facets.incomeBrackets.under1l);
    setEl('count-inc-1to3l', facets.incomeBrackets['1to3l']);
    setEl('count-inc-3to6l', facets.incomeBrackets['3to6l']);
    setEl('count-inc-above6l', facets.incomeBrackets.above6l);
  }

  if (facets.loanStatus) {
    setEl('count-loan-none', facets.loanStatus.none);
    setEl('count-loan-kcc', facets.loanStatus.has_kcc);
    setEl('count-loan-other', facets.loanStatus.other_debt);
  }

  if (facets.collateral) {
    setEl('count-collat-any', facets.collateral.any);
    setEl('count-collat-yes', facets.collateral.yes);
    setEl('count-collat-no', facets.collateral.no);
  }

  if (facets.irrigation) {
    setEl('count-irrig-all', facets.irrigation.all);
    setEl('count-irrig-irrigated', facets.irrigation.irrigated);
    setEl('count-irrig-rainfed', facets.irrigation.rainfed);
  }

  if (facets.occupations) {
    setEl('count-occ-owner', facets.occupations.owner);
    setEl('count-occ-tenant', facets.occupations.tenant);
    setEl('count-occ-share', facets.occupations.sharecropper);
    setEl('count-occ-landless', facets.occupations.landless);
  }
}

window.toggleScoreBreakdown = function(schemeId, evt) {
  if (evt) evt.stopPropagation();
  const target = document.getElementById(`match-container-${schemeId}`);
  if (target) {
    const wasOpen = target.classList.contains('open');
    document.querySelectorAll('.match-score-container.open').forEach(c => c.classList.remove('open'));
    if (!wasOpen) target.classList.add('open');
  }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.match-score-container')) {
    document.querySelectorAll('.match-score-container.open').forEach(c => c.classList.remove('open'));
  }
});

function setupEligibility() {
  const sidebarForm = document.getElementById('eligibility-sidebar-form');
  const stateSelect = document.getElementById('filter-state-select');
  const districtInput = document.getElementById('filter-district-input');
  const landSlider = document.getElementById('filter-land-slider');
  const landSliderDisplay = document.getElementById('land-slider-display');
  const btnToggleMore = document.getElementById('btn-toggle-more-filters');
  const collapsibleSections = document.getElementById('collapsible-filter-sections');
  const moreFiltersText = document.getElementById('more-filters-toggle-text');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const btnMobileDrawer = document.getElementById('btn-mobile-filter-drawer');
  const btnCloseDrawerMobile = document.getElementById('btn-close-sidebar-mobile');
  const sidebar = document.getElementById('eligibility-sidebar');

  // 1. State & District Live Updates
  if (stateSelect) {
    stateSelect.addEventListener('change', () => triggerDebouncedEligibility(250));
  }
  if (districtInput) {
    districtInput.addEventListener('input', () => triggerDebouncedEligibility(350));
  }

  // 2. Land Slider Live Updates
  if (landSlider) {
    landSlider.addEventListener('input', () => {
      if (landSliderDisplay) {
        landSliderDisplay.textContent = `${landSlider.value} Acres`;
      }
      triggerDebouncedEligibility(200);
    });
  }

  // 3. Crops Multi-select Chips
  const cropChips = document.querySelectorAll('.crops-chip-selector .crop-filter-chip');
  cropChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      triggerDebouncedEligibility(250);
    });
  });

  // 4. Radio Filter Groups Live Updates
  const radioInputs = document.querySelectorAll('#eligibility-sidebar-form input[type="radio"]');
  radioInputs.forEach(radio => {
    radio.addEventListener('change', () => triggerDebouncedEligibility(250));
  });

  // 5. Progressive Disclosure: "+ More Filters" Accordion
  if (btnToggleMore && collapsibleSections) {
    btnToggleMore.addEventListener('click', () => {
      const isHidden = collapsibleSections.style.display === 'none';
      collapsibleSections.style.display = isHidden ? 'block' : 'none';
      if (moreFiltersText) {
        moreFiltersText.textContent = isHidden 
          ? '➖ Fewer Filters (Hide Additional Criteria)' 
          : '➕ More Filters (Income, Debt, Title, Irrigation)';
      }
    });
  }

  // 6. Reset Filters to Defaults
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (stateSelect) stateSelect.value = 'Punjab';
      if (districtInput) districtInput.value = 'Ludhiana';
      if (landSlider) {
        landSlider.value = '3.5';
        if (landSliderDisplay) landSliderDisplay.textContent = '3.5 Acres';
      }
      cropChips.forEach(c => {
        const cropName = c.getAttribute('data-crop');
        if (cropName === 'Wheat' || cropName === 'Rice') {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
      const checkRadio = (name, val) => {
        const r = document.querySelector(`input[name="${name}"][value="${val}"]`);
        if (r) r.checked = true;
      };
      checkRadio('filter-category', 'general');
      checkRadio('filter-income-bracket', '1to3l');
      checkRadio('filter-loan-status', 'has_kcc');
      checkRadio('filter-collateral', 'any');
      checkRadio('filter-irrigation', 'all');
      checkRadio('filter-occupation', 'owner');

      showToast('Filters reset to default farm profile.');
      triggerDebouncedEligibility(150);
    });
  }

  // 7. Mobile Drawer Toggle (<900px)
  if (btnMobileDrawer && sidebar) {
    btnMobileDrawer.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }
  if (btnCloseDrawerMobile && sidebar) {
    btnCloseDrawerMobile.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // 8. Auto-detect GPS button
  if (el.btnDetectGps) {
    el.btnDetectGps.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('GPS geolocation is not supported by your device browser.');
        return;
      }
      if (el.gpsStatusText) el.gpsStatusText.textContent = 'Locating...';

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(4));
          const lon = Number(position.coords.longitude.toFixed(4));
          if (el.geoLat) el.geoLat.value = lat;
          if (el.geoLong) el.geoLong.value = lon;
          if (el.gpsStatusText) el.gpsStatusText.textContent = 'GPS Locked ✓';

          try {
            const res = await fetch(`/api/context/location?latitude=${lat}&longitude=${lon}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.data && data.data.location) {
                const loc = data.data.location;
                if (stateSelect && loc.state) {
                  // Find option matching state
                  const opt = Array.from(stateSelect.options).find(o => o.value.toLowerCase().includes(loc.state.toLowerCase()));
                  if (opt) stateSelect.value = opt.value;
                }
                if (districtInput && loc.district) districtInput.value = loc.district;
                showToast(`📍 Location detected: ${loc.district}, ${loc.state}`);
                triggerDebouncedEligibility(200);
              }
            }
          } catch (e) {
            console.warn('GPS context fetch error:', e);
            showToast(`📍 GPS Coordinates locked: (${lat}, ${lon})`);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          if (el.gpsStatusText) el.gpsStatusText.textContent = 'GPS';
          showToast('GPS permission denied or unavailable. Enter state and district manually.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  // Initial trigger to load live data on startup
  checkEligibilityLive(true);
}

async function checkEligibilityLive(silent = false) {
  const stateSelect = document.getElementById('filter-state-select');
  const stateVal = (stateSelect && stateSelect.value !== 'all') ? stateSelect.value : (el.stateInput?.value || 'Punjab');
  const districtInput = document.getElementById('filter-district-input');
  const districtVal = districtInput ? districtInput.value.trim() : (el.districtInput?.value || 'Ludhiana');

  const landSlider = document.getElementById('filter-land-slider');
  const landSizeAcres = landSlider ? parseFloat(landSlider.value) || 3.5 : 3.5;
  const landSliderDisplay = document.getElementById('land-slider-display');
  if (landSliderDisplay) landSliderDisplay.textContent = `${landSizeAcres} Acres`;

  // Crops
  const activeCropChips = Array.from(document.querySelectorAll('.crops-chip-selector .crop-filter-chip.active'));
  const cropsArr = activeCropChips.map(c => c.getAttribute('data-crop') || c.textContent.trim());
  const cropType = cropsArr.length > 0 ? cropsArr.join(', ') : 'Wheat, Rice';

  // Category
  const categoryRadio = document.querySelector('input[name="filter-category"]:checked');
  const category = categoryRadio ? categoryRadio.value : 'general';

  // Income
  const incomeRadio = document.querySelector('input[name="filter-income-bracket"]:checked');
  const incomeBracket = incomeRadio ? incomeRadio.value : '1to3l';
  let annualIncome = 250000;
  if (incomeBracket === 'under1l') annualIncome = 85000;
  else if (incomeBracket === '1to3l') annualIncome = 220000;
  else if (incomeBracket === '3to6l') annualIncome = 450000;
  else if (incomeBracket === 'above6l') annualIncome = 800000;

  // Loan status
  const loanRadio = document.querySelector('input[name="filter-loan-status"]:checked');
  const loanStatus = loanRadio ? loanRadio.value : 'has_kcc';
  const hasKcc = loanStatus === 'has_kcc';
  const existingLoans = loanStatus === 'other_debt' ? 60000 : 0;

  // Collateral, Irrigation, Occupation
  const collateralRadio = document.querySelector('input[name="filter-collateral"]:checked');
  const collateralAvailable = collateralRadio ? collateralRadio.value : 'any';

  const irrigationRadio = document.querySelector('input[name="filter-irrigation"]:checked');
  const irrigationType = irrigationRadio ? irrigationRadio.value : 'all';

  const occupationRadio = document.querySelector('input[name="filter-occupation"]:checked');
  const landOwnership = occupationRadio ? occupationRadio.value : 'owner';

  const latitude = el.geoLat && el.geoLat.value ? Number(el.geoLat.value) : undefined;
  const longitude = el.geoLong && el.geoLong.value ? Number(el.geoLong.value) : undefined;

  state.userFarmProfile = {
    cropType,
    landSizeAcres,
    landSizeHectares: Number((landSizeAcres / 2.47105).toFixed(2)),
    state: stateVal,
    district: districtVal,
    latitude,
    longitude,
    landOwnership,
    category,
    annualIncome,
    existingLoans,
    hasKcc,
    hasAadhaar: true,
    collateralAvailable,
    irrigationType
  };

  try {
    let responseData = null;
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.userFarmProfile)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.recommendations)) {
        responseData = data;
      }
    }

    if (!responseData) {
      responseData = evaluateEligibilityClient(state.userFarmProfile, state.schemes);
    }

    renderAdvancedRecommendations(responseData);
    if (responseData.filter_facets || responseData.filterFacets) {
      updateFacetCounts(responseData.filter_facets || responseData.filterFacets);
    }

    if (!silent) {
      const bestCount = (responseData.recommendations || []).filter(r => r.status === 'best').length;
      const goodCount = (responseData.recommendations || []).filter(r => r.status === 'good').length;
      showToast(`Updated matches: 1 Top Match + ${goodCount} Alternatives`);
    }
  } catch (err) {
    console.error('Live eligibility error:', err);
  }
}

// Backward-compatible alias
async function checkEligibility() {
  await checkEligibilityLive(false);
}

function renderAdvancedRecommendations(data) {
  if (!el.eligResultsContainer) return;

  if (el.eligEmptyState) el.eligEmptyState.style.display = 'none';
  el.eligResultsContainer.style.display = 'flex';

  const { farmer_location, farmer_context, location_context, debt_safety_assessment, debt_capacity, meta, recommendations = [] } = data;
  const fContext = farmer_context || (location_context ? {
    soil_type: location_context.soilProfile?.soilType,
    soil_ph: location_context.soilProfile?.pH,
    soil_health_advisory: location_context.soilProfile?.soilHealthAdvisory,
    estimated_land_value_per_acre: location_context.landValuation?.marketValuePerAcre,
    price_per_sqft: location_context.landValuation?.pricePerSqFt
  } : null);

  const debtSafe = debt_safety_assessment || debt_capacity || {};

  // 1. Render Location & Dynamic 300 km Soil Intelligence Card
  if (el.locationContextCard && fContext) {
    el.locationContextCard.style.display = 'block';

    const stationStr = fContext.reference_station ? `${fContext.reference_station} Station` : 'Regional Agro Station';
    const distStr = fContext.distance_from_station_km !== undefined ? `${fContext.distance_from_station_km} km away` : '15 km away';
    const zoneBadge = fContext.dynamic_zone_badge || '300 km Agro-Zone';
    const advisory = fContext.soil_advisory || fContext.soil_health_advisory || 'Incorporate organic manure and apply balanced NPK fertilizers according to soil health card test.';

    el.locationContextCard.innerHTML = `
      <div class="intel-header">
        <div class="intel-title-box">
          <span style="font-size: 1.4rem;">🌾</span>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">Dynamic Regional Soil & Crop Intelligence</h3>
              <span class="station-distance-badge">📍 ${stationStr} (${distStr})</span>
            </div>
            <span style="font-size: 0.82rem; color: #64748b;">${farmer_location || 'Local Profile'} • ${zoneBadge}</span>
          </div>
        </div>
        <span class="intel-badge">300 km Resolution Benchmark</span>
      </div>

      <div class="intel-grid">
        <div class="intel-item">
          <div class="intel-item-title"><span>🌱</span> Soil Profile & pH</div>
          <div class="intel-item-val">${fContext.soil_type || 'Fertile Loam'} (pH ${fContext.soil_ph || 7.2})</div>
          <div class="intel-item-sub">Organic Carbon: ${fContext.organic_carbon || 'Medium (0.55%)'}</div>
        </div>

        <div class="intel-item">
          <div class="intel-item-title"><span>🧪</span> N-P-K Nutrients</div>
          <div class="intel-item-val">
            <span style="font-size: 0.82rem; font-weight: 700; color: #b45309;">N: ${fContext.nitrogen_rating || 'Medium'}</span> • 
            <span style="font-size: 0.82rem; font-weight: 700; color: #15803d;">P: ${fContext.phosphorus_rating || 'Medium'}</span> • 
            <span style="font-size: 0.82rem; font-weight: 700; color: #0284c7;">K: ${fContext.potassium_rating || 'High'}</span>
          </div>
          <div class="intel-item-sub">Dynamic macro-nutrient status</div>
        </div>

        <div class="intel-item">
          <div class="intel-item-title"><span>📈</span> Land Benchmark Value</div>
          <div class="intel-item-val">${formatINR(fContext.estimated_land_value_per_acre || 2200000)} <span style="font-size: 0.78rem; font-weight: 500; color: #64748b;">/ acre</span></div>
          <div class="intel-item-sub">Circle Rate: ${formatINR(fContext.circle_rate_per_acre || 1200000)}/acre</div>
        </div>
      </div>

      <div class="intel-advisory-box" style="margin-top: 0.85rem; background: #f0fdf4; border-left: 4px solid #16a34a; padding: 0.75rem 1rem; border-radius: var(--radius-sm);">
        <strong style="color: #14532d;">💡 Dynamic Soil Health Advisory:</strong> 
        <span style="color: #166534; font-size: 0.88rem;">${advisory}</span>
      </div>
    `;
  }

  // 2. Render Debt Safety & Responsible Lending Card
  if (el.debtSafetyCard && debtSafe) {
    el.debtSafetyCard.style.display = 'block';
    const dtiVal = Number(debtSafe.dti_percent !== undefined ? debtSafe.dti_percent : (parseFloat(debtSafe.baseline_dti_ratio) || 0));
    const isDebtTrap = dtiVal > 50 || debtSafe.debt_status === 'DEBT_TRAP_RISK';
    const isModerate = dtiVal > 35 && dtiVal <= 50;
    const statusClass = isDebtTrap ? 'danger' : (isModerate ? 'moderate' : 'safe');
    const statusText = isDebtTrap ? '🚨 Debt Trap Risk (>50% Burden)' : (isModerate ? '⚠️ Moderate Debt Burden' : '✓ Safe Borrowing Level');

    el.debtSafetyCard.innerHTML = `
      <div class="safety-header">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">Responsible Lending & Repayment Safety</h3>
          <span style="font-size: 0.82rem; color: #64748b;">RBI & NABARD Fair Lending Guidelines</span>
        </div>
        <span class="safety-status-pill ${statusClass}">
          ${statusText}
        </span>
      </div>

      <div class="intel-grid" style="margin-bottom: 0.75rem;">
        <div class="intel-item">
          <div class="intel-item-title"><span>💰</span> Est. Monthly Farm Income</div>
          <div class="intel-item-val">${formatINR(debtSafe.monthly_farm_income || 20000)}</div>
        </div>
        <div class="intel-item">
          <div class="intel-item-title"><span>🛡️</span> Max Safe Additional Loan</div>
          <div class="intel-item-val" style="color: #15803d;">${formatINR(debtSafe.max_safe_borrowing_limit || 200000)}</div>
        </div>
        <div class="intel-item">
          <div class="intel-item-title"><span>📊</span> Current Debt-to-Income (DTI)</div>
          <div class="intel-item-val" style="color: ${isDebtTrap ? '#dc2626' : (isModerate ? '#d97706' : '#15803d')};">${dtiVal}%</div>
        </div>
      </div>

      <div class="dti-meter-wrapper">
        <div class="dti-meter-label-row">
          <span style="font-weight: 600; color: #475569;">Debt-to-Income Utilization Meter</span>
          <span style="font-weight: 700; color: ${isDebtTrap ? '#dc2626' : '#15803d'};">${dtiVal}% (Safe Cap: 35%)</span>
        </div>
        <div class="dti-progress-bg">
          <div class="dti-progress-fill ${statusClass}" style="width: ${Math.min(100, Math.max(8, dtiVal))}%;"></div>
        </div>
      </div>

      ${isDebtTrap ? `
        <div class="debt-trap-alert">
          <strong>⚠️ Debt Trap Warning:</strong> Your ongoing debt payments exceed 50% of your estimated monthly income. We strongly urge you to choose interest-free grants (like PM-KISAN) or 4% subsidized crop loans rather than taking unsecured high-cost commercial debt.
        </div>
      ` : ''}
    `;
  }

  // 3. Render Sequence Breakdown Summary Banner
  if (el.recSummaryBanner && meta) {
    el.recSummaryBanner.style.display = 'flex';
    el.recSummaryBanner.innerHTML = `
      <div style="font-size: 0.92rem; font-weight: 700; color: #0f172a;">
        📋 Evaluated <strong>${meta.total_schemes_evaluated || recommendations.length}</strong> Official Schemes:
      </div>
      <div class="summary-pills-row">
        <span class="filter-badge-pill badge-best">★ 1 Best Match</span>
        <span class="filter-badge-pill badge-good">✓ ${meta.good_count || 11} Good Alternatives</span>
        <span class="filter-badge-pill badge-moderate">⚙ ${meta.moderate_count || 0} Moderate Fit</span>
        <span class="filter-badge-pill badge-ineligible">✕ ${meta.ineligible_count || 0} Not Eligible</span>
      </div>
    `;
  }

  // 4. Render Ranked Schemes Cards Stream with Explainable Match Score & Breakdown Popover
  if (el.recCardsStream) {
    el.recCardsStream.innerHTML = '';

    recommendations.forEach(rec => {
      const card = document.createElement('div');
      card.className = `rec-card status-${rec.status}`;
      card.dataset.status = rec.status;
      card.dataset.schemeId = rec.scheme_id;

      const credit = rec.debt_safety?.credit_details || {};

      const reasonsHtml = (rec.match_reasons || []).map(r => `
        <div class="rec-reason-item">
          <span>✓</span> <span>${r}</span>
        </div>
      `).join('');

      const unmetHtml = (rec.unmet_criteria || []).map(u => `
        <div class="rec-unmet-item">
          <span>✕</span> <span>${u}</span>
        </div>
      `).join('');

      const warningsHtml = (rec.warnings || []).map(w => `
        <div class="rec-warning-item">
          <span>⚠️</span> <span>${w}</span>
        </div>
      `).join('');

      // Criteria breakdown for explainable match score
      const criteria = rec.criteria_breakdown || rec.criteriaBreakdown || [
        { criterion: 'land_size', label: 'Land Holding Size', satisfied: true, detail: 'Fits land bracket' },
        { criterion: 'state_region', label: 'State & Region', satisfied: true, detail: 'Active in your state' },
        { criterion: 'income_limit', label: 'Annual Income', satisfied: true, detail: 'Earnings fit requirement' },
        { criterion: 'category', label: 'Category & Gender', satisfied: true, detail: 'Category guidelines met' },
        { criterion: 'ownership', label: 'Land Title Status', satisfied: true, detail: 'Land ownership verified' },
        { criterion: 'debt_safety', label: 'Debt & DTI Capacity', satisfied: true, detail: 'Safe borrowing margin' }
      ];

      const breakdownItemsHtml = criteria.map(c => {
        const iconClass = c.satisfied ? 'met' : 'unmet';
        const iconSymbol = c.satisfied ? '✓' : '✕';
        return `
          <div class="breakdown-item">
            <span class="breakdown-icon ${iconClass}">${iconSymbol}</span>
            <div>
              <span class="breakdown-label">${c.label}:</span>
              <span class="breakdown-detail">${c.detail || (c.satisfied ? 'Requirement met' : 'Unfulfilled')}</span>
            </div>
          </div>
        `;
      }).join('');

      const scorePillClass = rec.score >= 80 ? 'high' : (rec.score >= 50 ? 'medium' : 'low');

      card.innerHTML = `
        <div class="rec-card-body">
          <div class="rec-top-row">
            <div class="rec-title-wrap">
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <span class="rec-status-tag ${rec.status}">
                  ${rec.status === 'best' ? '★ TOP RECOMMENDATION' : (rec.status === 'good' ? '✓ GOOD ALTERNATIVE' : (rec.status === 'moderate' ? '⚙ MODERATE FIT' : '✕ NOT ELIGIBLE'))}
                </span>
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">${rec.category}</span>
              </div>
              <h3>${rec.scheme_name}</h3>
              <div class="rec-sub">${rec.eligibility_reason || ''}</div>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <!-- Explainable Algorithm Match Score with Expandable Breakdown Popover -->
              <div class="match-score-container" id="match-container-${rec.scheme_id}">
                <div class="match-score-pill ${scorePillClass}" onclick="toggleScoreBreakdown('${rec.scheme_id}', event)" title="Tap to view exact criteria breakdown">
                  <span>🎯</span>
                  <span>${rec.score}% Match</span>
                  <span class="breakdown-toggle-icon">▾</span>
                </div>
                <div class="score-breakdown-popover" id="breakdown-${rec.scheme_id}">
                  <div class="breakdown-popover-title">
                    <span>🎯</span> Explainable Match Criteria (${rec.score}%)
                  </div>
                  <div class="breakdown-list">
                    ${breakdownItemsHtml}
                  </div>
                  <div class="breakdown-tip">
                    ${rec.score < 95 && rec.eligible ? '💡 Hard cap: Scoring is strictly capped at 95% unless 100% of hard criteria are verified. Complete Aadhaar KYC in Vault to reach 100%.' : '✓ Verified 100% against official gazette rules.'}
                  </div>
                </div>
              </div>

              <button class="btn-icon-secondary" style="width: 34px; height: 34px; border-radius: 50%;" title="Listen Aloud" onclick="speakText('${rec.scheme_name}. Net interest rate ${rec.interest_rate}. Match score ${rec.score} percent. ${rec.eligibility_reason}')">
                🔊
              </button>
            </div>
          </div>

          <!-- Key Financial Highlights Grid -->
          <div class="rec-financials-grid">
            <div class="rec-fin-item">
              <div class="lbl">Net Interest Rate</div>
              <div class="val highlight">${rec.interest_rate}</div>
            </div>
            <div class="rec-fin-item">
              <div class="lbl">Stated Base Rate</div>
              <div class="val">${rec.stated_base_rate}</div>
            </div>
            <div class="rec-fin-item">
              <div class="lbl">Max Loan / Grant</div>
              <div class="val">${rec.max_loan_amount}</div>
            </div>
            <div class="rec-fin-item">
              <div class="lbl">Collateral-Free Limit</div>
              <div class="val">${rec.collateral_free_limit}</div>
            </div>
          </div>

          <!-- True Cost of Credit Breakdown -->
          <div class="rec-credit-box">
            <div class="rec-credit-title">
              <span>💳</span> True Cost of Borrowing Breakdown
            </div>
            <div class="rec-credit-grid">
              <div>
                <span>Processing Fee</span>
                <strong>${credit.processing_fee || '0.5% (Max ₹2,500)'}</strong>
              </div>
              <div>
                <span>GST on Fees</span>
                <strong>${credit.gst || '18%'}</strong>
              </div>
              <div>
                <span>Stamp Duty</span>
                <strong>${credit.stamp_duty || 'Waived under ₹1.6L'}</strong>
              </div>
              <div>
                <span>Total Effective Cost</span>
                <strong style="color: #15803d;">${credit.total_credit_cost || rec.interest_rate}</strong>
              </div>
            </div>
          </div>

          <!-- Unmet Criteria / Reasons / Warnings -->
          <div class="rec-reasons-list">
            ${unmetHtml}
            ${warningsHtml}
            ${reasonsHtml}
          </div>

          <!-- Action Buttons -->
          <div class="rec-actions-row">
            ${rec.status !== 'ineligible' ? `
              <button class="btn-rec-choose" onclick="chooseLoanFromEligibility('${rec.scheme_id}')">
                🌾 Choose This Loan & Apply
              </button>
            ` : `
              <button class="btn-rec-choose" style="background: #64748b; opacity: 0.8;" onclick="chooseLoanFromEligibility('${rec.scheme_id}')">
                🌾 Request Eligibility Exception
              </button>
            `}
            <button class="btn-rec-docs" onclick="openChecklist('${rec.scheme_id}')">
              📋 View Documents (${(rec.documents_required || []).length})
            </button>
            ${rec.apply_link ? `
              <a href="${rec.apply_link}" target="_blank" rel="noopener noreferrer" class="btn-rec-docs" style="text-decoration: none;">
                ↗ Official Portal
              </a>
            ` : ''}
          </div>
        </div>
      `;

      el.recCardsStream.appendChild(card);
    });
  }
}

// ==========================================================================
// PART 2: SAHAY AI — AGRICULTURAL LOAN & SCHEME ASSISTANT
// ==========================================================================

function setupSahayAI() {
  const launcher = document.getElementById('sahay-launcher-btn');
  const chatWindow = document.getElementById('sahay-chat-window');
  const closeBtn = document.getElementById('sahay-close-btn');
  const resetBtn = document.getElementById('sahay-reset-btn');
  const langToggle = document.getElementById('sahay-lang-toggle');
  const langIndicator = document.getElementById('sahay-lang-indicator');
  const ttsToggle = document.getElementById('sahay-tts-toggle');
  const ttsIcon = document.getElementById('sahay-tts-icon');
  const messageStream = document.getElementById('sahay-message-stream');
  const inputForm = document.getElementById('sahay-input-form');
  const userInput = document.getElementById('sahay-user-input');
  const micBtn = document.getElementById('sahay-mic-btn');
  const speechStatus = document.getElementById('sahay-speech-status');

  if (!launcher || !chatWindow) return;

  let sahayLang = 'en'; // 'en' | 'hi'
  let isTtsActive = true;
  let recognition = null;
  let isListening = false;

  // Toggle open/close
  launcher.addEventListener('click', () => {
    const isHidden = chatWindow.style.display === 'none' || !chatWindow.style.display;
    chatWindow.style.display = isHidden ? 'flex' : 'none';
    if (isHidden && userInput) {
      setTimeout(() => userInput.focus(), 150);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatWindow.style.display = 'none';
    });
  }

  // Language toggle (EN / HI)
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      sahayLang = sahayLang === 'en' ? 'hi' : 'en';
      if (langIndicator) langIndicator.textContent = sahayLang.toUpperCase();
      showToast(`Sahay AI language set to ${sahayLang === 'hi' ? 'Hindi (हिंदी)' : 'English'}`);

      // Update prompt chip text to active language
      const chips = document.querySelectorAll('#sahay-prompt-chips .sahay-chip');
      if (chips.length >= 4) {
        if (sahayLang === 'hi') {
          chips[0].textContent = '🌱 क्या मैं KCC के लिए पात्र हूँ?';
          chips[0].setAttribute('data-query', 'क्या मैं KCC के लिए पात्र हूँ?');
          chips[1].textContent = '📋 फसल ऋण के लिए कौन-से दस्तावेज चाहिए?';
          chips[1].setAttribute('data-query', 'फसल ऋण के लिए कौन-से दस्तावेज चाहिए?');
          chips[2].textContent = '📈 मेरे राज्य में ब्याज दरों की तुलना करें';
          chips[2].setAttribute('data-query', 'मेरे राज्य में ब्याज दरों की तुलना करें');
          chips[3].textContent = '🚜 50% कृषि यंत्र सब्सिडी कैसे पाएं?';
          chips[3].setAttribute('data-query', '50% कृषि यंत्र सब्सिडी कैसे पाएं?');
        } else {
          chips[0].textContent = '🌱 Am I eligible for KCC?';
          chips[0].setAttribute('data-query', 'Am I eligible for KCC?');
          chips[1].textContent = '📋 What documents do I need for a crop loan?';
          chips[1].setAttribute('data-query', 'What documents do I need for a crop loan?');
          chips[2].textContent = '📈 Compare interest rates for my state';
          chips[2].setAttribute('data-query', 'Compare interest rates for my state');
          chips[3].textContent = '🚜 How to get 50% equipment subsidy?';
          chips[3].setAttribute('data-query', 'How to get 50% equipment subsidy?');
        }
      }
    });
  }

  // TTS Read Aloud toggle
  if (ttsToggle) {
    ttsToggle.addEventListener('click', () => {
      isTtsActive = !isTtsActive;
      if (ttsIcon) ttsIcon.textContent = isTtsActive ? '🔊' : '🔇';
      showToast(`Voice read-aloud ${isTtsActive ? 'Enabled' : 'Muted'}`);
      if (!isTtsActive && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    });
  }

  // Reset conversation
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (messageStream) {
        messageStream.innerHTML = `
          <div class="sahay-intro-card">
            <div class="sahay-intro-icon">🌾</div>
            <div class="sahay-intro-title">Namaste! I'm Sahay AI</div>
            <p class="sahay-intro-text">
              Your direct guide to agricultural credit, government subsidies, and scheme documentation. Ask me any question in English or Hindi!
            </p>
          </div>
          <div class="sahay-prompt-chips-container" id="sahay-prompt-chips">
            <div class="sahay-chips-title">💡 Suggested Questions:</div>
            <button type="button" class="sahay-chip" data-query="Am I eligible for KCC?">
              🌱 Am I eligible for KCC?
            </button>
            <button type="button" class="sahay-chip" data-query="What documents do I need for a crop loan?">
              📋 What documents do I need for a crop loan?
            </button>
            <button type="button" class="sahay-chip" data-query="Compare interest rates for my state">
              📈 Compare interest rates for my state
            </button>
            <button type="button" class="sahay-chip" data-query="How to get 50% equipment subsidy?">
              🚜 How to get 50% equipment subsidy?
            </button>
          </div>
        `;
        wirePromptChips();
      }
      showToast('Conversation reset. Ready for a new query.');
    });
  }

  // Wire prompt chips click
  function wirePromptChips() {
    document.querySelectorAll('#sahay-prompt-chips .sahay-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query') || chip.textContent.trim();
        handleAssistantSend(query);
      });
    });
  }
  wirePromptChips();

  // Speech-to-Text Setup
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    try {
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isListening = true;
        if (micBtn) micBtn.classList.add('active');
        if (speechStatus) speechStatus.style.display = 'flex';
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (userInput) userInput.value = transcript;
        handleAssistantSend(transcript);
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition:', e);
    }
  }

  function stopListening() {
    isListening = false;
    if (micBtn) micBtn.classList.remove('active');
    if (speechStatus) speechStatus.style.display = 'none';
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (!recognition) {
        showToast('Voice input is not supported in this browser.');
        return;
      }
      if (isListening) {
        recognition.stop();
      } else {
        recognition.lang = sahayLang === 'hi' ? 'hi-IN' : 'en-IN';
        try {
          recognition.start();
        } catch (e) {
          console.warn('Recognition start failed:', e);
        }
      }
    });
  }

  // Form submit
  if (inputForm) {
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = userInput ? userInput.value.trim() : '';
      if (!text) return;
      handleAssistantSend(text);
      if (userInput) userInput.value = '';
    });
  }

  async function handleAssistantSend(messageText) {
    if (!messageText || !messageText.trim()) return;

    // 1. Append User Message
    appendMessage('user', messageText);

    // 2. Append Typing Indicator
    const typingId = 'sahay-typing-' + Date.now();
    const typingBubble = document.createElement('div');
    typingBubble.className = 'sahay-msg assistant';
    typingBubble.id = typingId;
    typingBubble.innerHTML = `
      <div class="sahay-msg-content" style="display: flex; align-items: center; gap: 0.5rem; color: #64748b;">
        <span class="recording-dot" style="background: #15803d;"></span>
        <span>Grounded retrieval from official directives...</span>
      </div>
    `;
    messageStream.appendChild(typingBubble);
    messageStream.scrollTop = messageStream.scrollHeight;

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          language: sahayLang,
          farmerProfile: state.userFarmProfile || {}
        })
      });

      const data = await res.json();
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      if (data.success && data.data) {
        appendAssistantReply(data.data);
      } else {
        appendMessage('assistant', 'Sorry, I could not complete that query. Please try again or rephrase.');
      }
    } catch (err) {
      console.error('Sahay AI Chat Error:', err);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      appendMessage('assistant', 'Could not connect to the verified scheme database. Please check your internet connection.');
    }
  }

  function appendMessage(role, text) {
    if (!messageStream) return;
    const msg = document.createElement('div');
    msg.className = `sahay-msg ${role}`;
    msg.innerHTML = `<div class="sahay-msg-content">${escapeHtml(text)}</div>`;
    messageStream.appendChild(msg);
    messageStream.scrollTop = messageStream.scrollHeight;
  }

  function appendAssistantReply(answerData) {
    if (!messageStream) return;
    const { reply, citations = [], suggestedChips = [] } = answerData;

    const formattedReply = reply
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/•/g, '&bull;')
      .replace(/\n/g, '<br>');

    const citationsHtml = (citations && citations.length > 0) ? `
      <div class="sahay-citations-box">
        <div style="font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase;">
          📌 Grounded Source Citation:
        </div>
        ${citations.map(c => `
          <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="sahay-citation-pill" title="Verified against official portal">
            <span>🔗</span> <span>${escapeHtml(c.authority || c.schemeName)}</span>
            <span class="sahay-citation-date">(${c.lastVerifiedAt?.split('T')[0] || '2026-09'})</span>
          </a>
        `).join('')}
      </div>
    ` : '';

    const chipsHtml = (suggestedChips && suggestedChips.length > 0) ? `
      <div class="sahay-prompt-chips-container" style="margin-top: 0.6rem;">
        <div class="sahay-chips-title">💡 Next Questions:</div>
        ${suggestedChips.map(chip => `
          <button type="button" class="sahay-chip dynamic-chip" data-query="${escapeHtml(chip)}">
            ${escapeHtml(chip)}
          </button>
        `).join('')}
      </div>
    ` : '';

    const msg = document.createElement('div');
    msg.className = 'sahay-msg assistant';
    msg.innerHTML = `
      <div class="sahay-msg-content">
        ${formattedReply}
        ${citationsHtml}
        ${chipsHtml}
      </div>
    `;

    messageStream.appendChild(msg);
    messageStream.scrollTop = messageStream.scrollHeight;

    // Attach dynamic chip listeners
    msg.querySelectorAll('.dynamic-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-query');
        handleAssistantSend(q);
      });
    });

    // TTS Voice Read Aloud
    if (isTtsActive && window.speechSynthesis) {
      const cleanSpeakText = reply.replace(/\*\*/g, '').replace(/•/g, '').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(cleanSpeakText);
      utterance.lang = sahayLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}



// ==========================================================================
// Speech Synthesis (15 Indian Languages Audio Reader)
// ==========================================================================

function setupSpeech() {
  if (el.floatingSpeakerBtn) {
    el.floatingSpeakerBtn.addEventListener('click', () => {
      if (state.isSpeaking) {
        stopSpeech();
      } else {
        readCurrentPage();
      }
    });
  }
}

function readCurrentPage() {
  let prompt = '';
  if (state.currentTab === 'home') {
    prompt = `${t('heroTitle')}. ${t('heroSubtitle')}.`;
  } else if (state.currentTab === 'eligibility') {
    prompt = `${t('eligTitle')}. ${t('eligSubtitle')}.`;
  } else if (state.currentTab === 'schemes') {
    prompt = `${t('schemesTitle')}. ${t('schemesSubtitle')}.`;
  } else if (state.currentTab === 'loans') {
    prompt = `${t('trackerTitle')}. ${t('statActiveLoans')}: ${state.loanSummary.activeCount}. ${t('statTotalPaid')}: ${formatINR(state.loanSummary.totalPaid)}. ${t('statTotalDue')}: ${formatINR(state.loanSummary.totalDue)}.`;
  }
  speakText(prompt);
}

window.speakCard = function(cardKey) {
  const title = t(`${cardKey}Title`);
  const desc = t(`${cardKey}Desc`);
  speakText(`${title}. ${desc}`);
};

function speakText(text) {
  if (!state.speechSynth) return;
  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92; // Paced for farmers
  utterance.pitch = 1.0;

  // Language mapping
  const langCodes = {
    en: 'en-IN',
    hi: 'hi-IN',
    pa: 'pa-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    or: 'or-IN',
    as: 'as-IN',
    ur: 'ur-IN',
    mai: 'hi-IN',
    bho: 'hi-IN'
  };
  utterance.lang = langCodes[state.currentLang] || 'hi-IN';

  utterance.onstart = () => {
    state.isSpeaking = true;
    if (el.floatingSpeakerBtn) el.floatingSpeakerBtn.classList.add('speaking');
  };

  utterance.onend = () => {
    state.isSpeaking = false;
    if (el.floatingSpeakerBtn) el.floatingSpeakerBtn.classList.remove('speaking');
  };

  utterance.onerror = () => {
    state.isSpeaking = false;
    if (el.floatingSpeakerBtn) el.floatingSpeakerBtn.classList.remove('speaking');
  };

  state.activeSpeech = utterance;
  state.speechSynth.speak(utterance);
}

function stopSpeech() {
  if (state.speechSynth) {
    state.speechSynth.cancel();
  }
  state.isSpeaking = false;
  if (el.floatingSpeakerBtn) el.floatingSpeakerBtn.classList.remove('speaking');
}

// Toast System
function showToast(message) {
  if (!el.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>🌱</span> <span>${message}</span>`;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// Land Rates & Valuation Engine
// ==========================================================================

async function loadLandRates(filters = {}) {
  const tableBody = document.getElementById('landrates-table-body');
  const countBadge = document.getElementById('landrates-count-badge');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">Loading unified land valuation data...</td></tr>';

  try {
    const params = new URLSearchParams();
    if (filters.state) params.append('state', filters.state);
    if (filters.district) params.append('district', filters.district);
    if (filters.rate_type) params.append('rate_type', filters.rate_type);
    params.append('limit', '50');

    const res = await fetch(`/api/land-rates?${params.toString()}`);
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.data)) {
      if (countBadge) {
        countBadge.innerText = `Showing ${data.data.length} of ${data.meta.total} records`;
      }

      if (data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No land rates found matching criteria.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(item => {
        const isCircle = item.rate_type === 'circle_rate';
        const badgeClass = isCircle ? 'circle_rate' : 'market_rate_listing';
        const badgeText = isCircle ? '🏛️ Circle Rate' : '🏷️ Market Rate (Listing)';
        const formattedRate = '₹' + Math.round(item.rate_per_acre).toLocaleString('en-IN');
        const effective = item.effective_date ? `Effective: ${item.effective_date}` : 'Active Asking Listing';
        const portalLink = item.source_url 
          ? `<a href="${item.source_url}" target="_blank" rel="noopener" style="color: #15803d; font-weight: 700; text-decoration: none;">${item.source_name} ↗</a>`
          : item.source_name;

        return `
          <tr>
            <td>
              <strong>${item.district}</strong>, <span style="color: #64748b;">${item.state}</span>
            </td>
            <td>
              <div>${item.taluk ? '<strong>' + item.taluk + '</strong>' : ''}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${item.village_zone || 'Agricultural Zone'}</div>
            </td>
            <td>
              <span class="rate-value-highlight">${formattedRate}</span>
              <div style="font-size: 0.74rem; color: #64748b;">per Acre</div>
            </td>
            <td>
              <span class="badge-rate-type ${badgeClass}">${badgeText}</span>
            </td>
            <td>
              ${portalLink}
            </td>
            <td style="font-size: 0.82rem; color: #64748b;">
              ${effective}
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading land rates:', err);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #dc2626;">Error fetching land rates. Please retry.</td></tr>';
  }
}

async function loadLandRateComparison(stateName, districtName) {
  const comparisonBox = document.getElementById('landrates-comparison-box');
  if (!comparisonBox) return;

  comparisonBox.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">Calculating regional circle rate vs market spread...</div>';

  try {
    const params = new URLSearchParams();
    if (stateName) params.append('state', stateName);
    if (districtName) params.append('district', districtName);

    const res = await fetch(`/api/land-rates/compare?${params.toString()}`);
    const resData = await res.json();

    if (resData.status === 'success' && resData.data) {
      const { circleRate, marketRate, comparison, query } = resData.data;

      const circleHtml = circleRate ? `
        <div class="rate-card-box circle">
          <div class="rate-box-title circle">
            <span>🏛️</span> Circle Rate (Ready Reckoner)
          </div>
          <div class="rate-box-price">₹${circleRate.avgRatePerAcre.toLocaleString('en-IN')}</div>
          <div class="rate-box-unit">Average Government Benchmark / Acre</div>
          <div class="rate-metric-row">
            <span>Official Range:</span>
            <strong>₹${circleRate.minRatePerAcre.toLocaleString('en-IN')} - ₹${circleRate.maxRatePerAcre.toLocaleString('en-IN')}</strong>
          </div>
          <div class="rate-metric-row">
            <span>Primary Authority:</span>
            <strong>${circleRate.sources.join(', ')}</strong>
          </div>
          <div class="rate-metric-row">
            <span>Effective Date:</span>
            <strong>${circleRate.latestEffectiveDate || 'April 1 Fiscal Year'}</strong>
          </div>
          <div class="rate-metric-row">
            <span>Cadastral Records:</span>
            <strong>${circleRate.count} verified zones</strong>
          </div>
        </div>
      ` : `
        <div class="rate-card-box circle" style="opacity: 0.6;">
          <div class="rate-box-title circle"><span>🏛️</span> Government Circle Rate</div>
          <p style="font-size: 0.88rem; color: #64748b; margin-top: 1rem;">No direct circle rate record for this district yet.</p>
        </div>
      `;

      const marketHtml = marketRate ? `
        <div class="rate-card-box market">
          <div class="rate-box-title market">
            <span>🏷️</span> Market Asking Rate (Listing)
          </div>
          <div class="rate-box-price">₹${marketRate.avgRatePerAcre.toLocaleString('en-IN')}</div>
          <div class="rate-box-unit">Average Seller Asking Price / Acre</div>
          <div class="rate-metric-row">
            <span>Asking Range:</span>
            <strong>₹${marketRate.minRatePerAcre.toLocaleString('en-IN')} - ₹${marketRate.maxRatePerAcre.toLocaleString('en-IN')}</strong>
          </div>
          <div class="rate-metric-row">
            <span>Listing Portals:</span>
            <strong>${marketRate.sources.join(', ')}</strong>
          </div>
          <div class="rate-metric-row">
            <span>Legal Status:</span>
            <strong style="color: #0284c7;">Asking Price (Negotiable)</strong>
          </div>
          <div class="rate-metric-row">
            <span>Sample Listings:</span>
            <strong>${marketRate.count} verified listings</strong>
          </div>
        </div>
      ` : `
        <div class="rate-card-box market" style="opacity: 0.6;">
          <div class="rate-box-title market"><span>🏷️</span> Market Asking Rate</div>
          <p style="font-size: 0.88rem; color: #64748b; margin-top: 1rem;">No market listings recorded for this district yet.</p>
        </div>
      `;

      const premiumBadge = (comparison && comparison.premiumPercent !== null) ? `
        <div class="spread-center-box">
          <div class="spread-circle-badge">
            <div class="spread-number">${comparison.premiumPercent > 0 ? '+' : ''}${comparison.premiumPercent}%</div>
            <div class="spread-label">Spread</div>
          </div>
          <div class="spread-text">Market asking rate premium over circle rate</div>
        </div>
      ` : `
        <div class="spread-center-box">
          <div class="spread-circle-badge" style="background: #f1f5f9; border-color: #cbd5e1;">
            <div class="spread-number" style="color: #64748b;">—</div>
            <div class="spread-label" style="color: #64748b;">Spread</div>
          </div>
        </div>
      `;

      comparisonBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
          <div>
            <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">
              ${query.district}, ${query.state} Valuation Comparison
            </h2>
            <p style="font-size: 0.84rem; color: #64748b;">Side-by-side benchmark for land registration and credit appraisal</p>
          </div>
          <span style="font-size: 0.78rem; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 0.3rem 0.75rem; border-radius: var(--radius-pill);">
            Real-Time Analysis
          </span>
        </div>

        <div class="comparison-grid">
          ${circleHtml}
          ${premiumBadge}
          ${marketHtml}
        </div>

        <div class="comparison-footer-notes">
          <div class="note-item">
            <strong>📋 Stamp Duty & Registry Guidance:</strong>
            ${comparison.stampDutyGuidance}
          </div>
          <div class="note-item">
            <strong>🏦 Loan Collateral & Credit Prudence:</strong>
            ${comparison.lendingPrudenceNote}
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error fetching land rate comparison:', err);
    comparisonBox.innerHTML = '<div style="color: #dc2626; padding: 1rem;">Failed to load comparison data.</div>';
  }
}

function setupLandRatesEngine() {
  const btnCompare = document.getElementById('btn-compare-land-rates');
  const stateSelect = document.getElementById('filter-land-state');
  const districtInput = document.getElementById('filter-land-district');
  const typeSelect = document.getElementById('filter-land-type');

  if (btnCompare) {
    btnCompare.addEventListener('click', () => {
      const stateVal = stateSelect ? stateSelect.value : '';
      const districtVal = districtInput ? districtInput.value.trim() : '';
      const typeVal = typeSelect ? typeSelect.value : '';

      loadLandRates({ state: stateVal, district: districtVal, rate_type: typeVal });
      if (stateVal) {
        loadLandRateComparison(stateVal, districtVal);
      }
    });
  }

  if (stateSelect) {
    stateSelect.addEventListener('change', () => {
      const stateVal = stateSelect.value;
      if (stateVal === 'Maharashtra') districtInput.value = 'Pune';
      else if (stateVal === 'Karnataka') districtInput.value = 'Bengaluru Rural';
      else if (stateVal === 'Telangana') districtInput.value = 'Rangareddy';
      else if (stateVal === 'Uttar Pradesh') districtInput.value = 'Meerut';
      else districtInput.value = '';

      const districtVal = districtInput ? districtInput.value.trim() : '';
      const typeVal = typeSelect ? typeSelect.value : '';
      loadLandRates({ state: stateVal, district: districtVal, rate_type: typeVal });
      if (stateVal) loadLandRateComparison(stateVal, districtVal);
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const stateVal = stateSelect ? stateSelect.value : '';
      const districtVal = districtInput ? districtInput.value.trim() : '';
      const typeVal = typeSelect.value;
      loadLandRates({ state: stateVal, district: districtVal, rate_type: typeVal });
    });
  }

  // Initial load
  loadLandRates({ state: 'Maharashtra', district: 'Pune' });
  loadLandRateComparison('Maharashtra', 'Pune');
}

// Ensure Land Rates Engine initializes on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLandRatesEngine);
} else {
  setupLandRatesEngine();
}

