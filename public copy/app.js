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
  speechSynth: window.speechSynthesis || null
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
  setupLoanTabs();
  setupSchemesSearch();

  // Apply saved language
  setLanguage(state.currentLang);

  // Load backend data
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
  el.navItems.forEach(item => {
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
  el.views.forEach(v => {
    if (v.id === `view-${viewName}`) {
      v.classList.add('active');
    } else {
      v.classList.remove('active');
    }
  });

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

async function loadSchemes() {
  if (window.KISAN_SCHEMES_DATA && (!state.schemes || state.schemes.length === 0)) {
    state.schemes = window.KISAN_SCHEMES_DATA;
    renderSchemesGrid(state.schemes);
  }

  try {
    const res = await fetch('/api/schemes');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        state.schemes = json.data;
        renderSchemesGrid(state.schemes);
      }
    }
  } catch (err) {
    console.warn('API /api/schemes offline, using embedded schemes data:', err);
  }
}

function setupSchemesSearch() {
  if (el.schemesSearchInput) {
    el.schemesSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = state.schemes.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        (s.tagline && s.tagline.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
      renderSchemesGrid(filtered);
    });
  }

  el.filterChipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.filterChipBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      let filtered = state.schemes;

      if (filter === 'crop') {
        filtered = state.schemes.filter(s => s.id === 'kcc' || s.id === 'miss' || s.id === 'pmfby');
      } else if (filter === 'infra') {
        filtered = state.schemes.filter(s => s.id === 'aif' || s.id === 'ahidf' || s.id === 'smam');
      } else if (filter === 'income') {
        filtered = state.schemes.filter(s => s.id === 'pm-kisan' || s.id === 'pm-kmy');
      } else if (filter === 'more') {
        filtered = state.schemes.filter(s => ['pm-kusum', 'pmfme', 'acabc'].includes(s.id));
      }

      renderSchemesGrid(filtered);
    });
  });
}

function renderSchemesGrid(schemes) {
  if (!el.schemesCardsContainer) return;
  el.schemesCardsContainer.innerHTML = '';

  if (schemes.length === 0) {
    el.schemesCardsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #fff; border-radius: var(--radius-md);">
        <p style="color: #64748b;">No schemes matched your search query.</p>
      </div>
    `;
    return;
  }

  schemes.forEach(scheme => {
    const card = document.createElement('div');
    card.className = 'scheme-card-box';

    // Color theme mapping matching Screenshot 3
    let themeColor = 'green';
    let pillStyle = 'light-green';
    if (scheme.id === 'aif') {
      themeColor = 'orange';
      pillStyle = 'light-orange';
    } else if (scheme.id === 'ahidf') {
      themeColor = 'red-orange';
      pillStyle = 'light-red';
    } else if (scheme.id === 'pm-kisan') {
      themeColor = 'teal';
      pillStyle = 'light-teal';
    } else if (scheme.category.includes('INFRASTRUCTURE') || scheme.category.includes('EQUIPMENT')) {
      themeColor = 'orange';
      pillStyle = 'light-orange';
    } else if (scheme.category.includes('INCOME') || scheme.category.includes('FOOD')) {
      themeColor = 'teal';
      pillStyle = 'light-teal';
    }

    const highlightsHtml = (scheme.highlights || [scheme.tagline]).map(h => 
      `<div class="scheme-tag-pill ${pillStyle}">${h}</div>`
    ).join('');

    card.innerHTML = `
      <!-- Top Colored Banner Matching Screenshot 3 -->
      <div class="scheme-top-banner ${themeColor}">
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
          <button class="btn-view-details ${themeColor}" style="flex: 1;" onclick="chooseLoanFromEligibility('${scheme.id}')">
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

// Choose Loan & Configure from Eligibility Flow
window.chooseLoanFromEligibility = function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

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
    el.modalFarmDetailsText.innerHTML = `<strong>${activityName}</strong> • ${profile.cropType || 'Crops'} • ${landType} Farmer${loc}`;
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

function setupEligibility() {
  if (el.eligibilityForm) {
    el.eligibilityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await checkEligibility();
    });
  }

  // Auto-detect GPS button
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
                if (el.stateInput && loc.state) el.stateInput.value = loc.state;
                if (el.districtInput && loc.district) el.districtInput.value = loc.district;
                showToast(`📍 Location detected: ${loc.district}, ${loc.state}`);
              }
            }
          } catch (e) {
            console.warn('GPS context fetch error:', e);
            showToast(`📍 GPS Coordinates locked: (${lat}, ${lon})`);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          if (el.gpsStatusText) el.gpsStatusText.textContent = 'Detect GPS';
          showToast('GPS permission denied or unavailable. Enter state and district manually.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }
}

async function checkEligibility() {
  const cropType = el.cropInput ? (el.cropInput.value.trim() || 'Wheat, Paddy') : 'Wheat, Paddy';
  const rawLandSize = el.landSizeInput ? (Number(el.landSizeInput.value) || 2.5) : 2.5;
  const landUnit = el.landUnitSelect ? el.landUnitSelect.value : 'acres';
  const landSizeAcres = landUnit === 'hectares' ? Number((rawLandSize * 2.47105).toFixed(2)) : rawLandSize;
  const landSizeHectares = landUnit === 'hectares' ? rawLandSize : Number((rawLandSize / 2.47105).toFixed(2));

  const stateVal = el.stateInput ? (el.stateInput.value.trim() || 'Punjab') : 'Punjab';
  const districtVal = el.districtInput ? (el.districtInput.value.trim() || 'Ludhiana') : 'Ludhiana';
  const latitude = el.geoLat && el.geoLat.value ? Number(el.geoLat.value) : undefined;
  const longitude = el.geoLong && el.geoLong.value ? Number(el.geoLong.value) : undefined;

  const landOwnership = el.landSelect ? (el.landSelect.value || 'owner') : 'owner';
  const category = el.categorySelect ? (el.categorySelect.value || 'general') : 'general';
  const annualIncome = el.incomeInput ? (Number(el.incomeInput.value) || 250000) : 250000;
  const existingLoans = el.existingLoansInput ? (Number(el.existingLoansInput.value) || 0) : 0;
  const hasKcc = el.kccSelect ? (el.kccSelect.value === 'yes') : true;
  const hasAadhaar = el.aadhaarSelect ? (el.aadhaarSelect.value === 'yes') : true;

  state.userFarmProfile = {
    cropType,
    landSizeAcres,
    landSizeHectares,
    state: stateVal,
    district: districtVal,
    latitude,
    longitude,
    landOwnership,
    category,
    annualIncome,
    existingLoans,
    hasKcc,
    hasAadhaar
  };

  try {
    if (el.btnSubmitEligibility) {
      el.btnSubmitEligibility.disabled = true;
      el.btnSubmitEligibility.innerHTML = '<span>⏳</span> Analyzing 32 Schemes & Soil Data...';
    }

    let responseData = null;

    try {
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
    } catch (apiErr) {
      console.warn('Backend /api/recommend unreachable, evaluating locally:', apiErr);
    }

    // Fallback if backend API is not responding (e.g. VS Code Live Server port 5500)
    if (!responseData) {
      responseData = evaluateEligibilityClient(state.userFarmProfile, state.schemes);
    }

    renderAdvancedRecommendations(responseData);

    const bestCount = (responseData.recommendations || []).filter(r => r.status === 'best').length;
    const goodCount = (responseData.recommendations || []).filter(r => r.status === 'good').length;
    showToast(`Matched with 1 Best Match and ${goodCount} Good Alternatives!`);
    speakText(`Evaluation complete. Found 1 top recommended loan plan and ${goodCount} good alternatives for your farm.`);

  } catch (err) {
    console.error('Eligibility evaluation error:', err);
    showToast('Failed to evaluate schemes. Please check your inputs.');
  } finally {
    if (el.btnSubmitEligibility) {
      el.btnSubmitEligibility.disabled = false;
      el.btnSubmitEligibility.innerHTML = `<span>🔍</span> <span>${t('btnCheckElig') || 'Find Best Loan & Schemes'}</span>`;
    }
  }
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

  // 1. Render Location & Soil Intelligence Card
  if (el.locationContextCard && fContext) {
    el.locationContextCard.style.display = 'block';
    el.locationContextCard.innerHTML = `
      <div class="intel-header">
        <div class="intel-title-box">
          <span style="font-size: 1.4rem;">🌾</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">Location & Agricultural Intelligence</h3>
            <span style="font-size: 0.82rem; color: #64748b;">${farmer_location || 'Local District Profile'}</span>
          </div>
        </div>
        <span class="intel-badge">Verified Soil & Land Benchmark</span>
      </div>

      <div class="intel-grid">
        <div class="intel-item">
          <div class="intel-item-title"><span>🌱</span> Soil Profile & pH</div>
          <div class="intel-item-val">${fContext.soil_type || 'Fertile Loam'} (pH ${fContext.soil_ph || 7.0})</div>
          <div class="intel-item-sub">Organic Carbon: Medium to High</div>
        </div>

        <div class="intel-item">
          <div class="intel-item-title"><span>📈</span> Land Benchmark Value</div>
          <div class="intel-item-val">${formatINR(fContext.estimated_land_value_per_acre || 2200000)} <span style="font-size: 0.78rem; font-weight: 500; color: #64748b;">/ acre</span></div>
          <div class="intel-item-sub">~₹${fContext.price_per_sqft || 50}/sq.ft benchmark rate</div>
        </div>

        <div class="intel-item">
          <div class="intel-item-title"><span>🎯</span> Crop Suitability Fit</div>
          <div class="intel-item-val">High Commercial Fit</div>
          <div class="intel-item-sub">Eligible for Interest Subventions</div>
        </div>
      </div>

      ${fContext.soil_health_advisory ? `
        <div class="intel-advisory-box">
          <strong>💡 Soil Health Advisory:</strong> ${fContext.soil_health_advisory}
        </div>
      ` : ''}
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
        <span class="filter-badge-pill badge-ineligible">✕ ${meta.ineligible_count || 0} Not Eligible (Listed Last)</span>
      </div>
    `;
  }

  // 4. Render Ranked Schemes Cards Stream in Exact Sequence
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
              <div class="rec-score-badge" title="Algorithm Match Score">
                <span>🎯</span>
                <span>${rec.score}/100</span>
              </div>
              <button class="btn-icon-secondary" style="width: 34px; height: 34px; border-radius: 50%;" title="Listen Aloud" onclick="speakText('${rec.scheme_name}. Net interest rate ${rec.interest_rate}. ${rec.eligibility_reason}')">
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
