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

  // Eligibility UI
  eligibilityForm: document.getElementById('eligibility-form'),
  cropInput: document.getElementById('crop-input'),
  incomeInput: document.getElementById('income-input'),
  districtInput: document.getElementById('district-input'),
  landSelect: document.getElementById('land-ownership-select'),
  activitySelect: document.getElementById('main-activity-select'),
  kccSelect: document.getElementById('kcc-status-select'),
  aadhaarSelect: document.getElementById('aadhaar-status-select'),
  btnSubmitEligibility: document.getElementById('btn-submit-eligibility'),
  eligEmptyState: document.getElementById('elig-empty-state'),
  eligResultsContainer: document.getElementById('elig-results-container'),

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

// Client-side Eligibility Evaluation Engine (Runs seamlessly on Live Server port 5500)
function evaluateEligibilityClient(userInput, schemesList) {
  const {
    cropType = '',
    annualIncome = 0,
    district = '',
    landOwnership = 'owner',
    mainActivity = 'crop',
    hasKcc = 'yes',
    hasAadhaar = 'yes'
  } = userInput;

  const normalizedCrop = String(cropType).trim().toLowerCase();
  const income = Number(annualIncome) || 0;
  const isAadhaarLinked = String(hasAadhaar).toLowerCase() === 'yes' || hasAadhaar === true;
  const isKccHolder = String(hasKcc).toLowerCase() === 'yes' || hasKcc === true;

  return (schemesList || []).map(scheme => {
    let eligible = true;
    const reasons = [];
    const warnings = [];

    // 1. Aadhaar check
    if (scheme.eligibility && scheme.eligibility.requiresAadhaar && !isAadhaarLinked) {
      eligible = false;
      warnings.push('Aadhaar linking is mandatory for this scheme and interest subvention.');
    } else {
      reasons.push('Aadhaar is linked with bank account for direct benefit transfer (DBT).');
    }

    // 2. Land Ownership / Farmer Category check
    const allowedTypes = scheme.eligibility ? scheme.eligibility.farmerTypes || [] : ['all'];
    if (!allowedTypes.includes(landOwnership) && !allowedTypes.includes('all')) {
      if (scheme.id === 'pm-kisan' && landOwnership !== 'owner') {
        eligible = false;
        warnings.push('PM-KISAN requires cultivable land in your own name; tenant and leaseholder farmers are not covered.');
      } else if ((landOwnership === 'tenant' || landOwnership === 'sharecropper') && (scheme.id === 'kcc' || scheme.id === 'miss')) {
        reasons.push('Eligible under tenant farmer & Joint Liability Group (JLG) guidelines.');
        warnings.push('Bank branch will require a registered tenancy agreement or local cultivation certificate.');
      } else if (scheme.id === 'aif' || scheme.id === 'ahidf') {
        reasons.push('Eligible as landholder, agri-enterprise, or farmer group member.');
      }
    } else {
      reasons.push(`Matched landholding status: ${landOwnership.toUpperCase()}`);
    }

    // 3. Activity / Crop check
    if (scheme.id === 'ahidf' && mainActivity !== 'dairy' && mainActivity !== 'poultry' && !['dairy', 'meat', 'feed', 'cattle', 'milk'].some(k => normalizedCrop.includes(k))) {
      warnings.push('Specialized for dairy, animal husbandry, and feed processing infrastructure.');
    } else if (scheme.id === 'pm-kusum' && mainActivity === 'infra') {
      reasons.push('Solar pump installation qualifies for 60% capital subsidy.');
    } else if (scheme.id === 'smam') {
      reasons.push('40-50% subsidy available for tractors and farm machinery.');
    } else {
      reasons.push(`Supports activity: ${cropType || mainActivity.toUpperCase()}`);
    }

    // 4. KCC synergy
    if (scheme.id === 'miss' || scheme.id === 'kcc') {
      if (isKccHolder) {
        reasons.push('Active KCC holder: eligible for immediate 3% prompt repayment subvention (4% net rate).');
      } else {
        warnings.push('Must be applied through or linked with a Kisan Credit Card (KCC) account.');
      }
    }

    // 5. Income Exclusions
    if (scheme.id === 'pm-kisan' && income > 2500000) {
      warnings.push('Higher income tax payers are excluded under statutory PM-KISAN guidelines.');
    }

    let badge = eligible ? 'Eligible' : 'Conditional / Review Needed';
    let subventionNote = scheme.highlights ? scheme.highlights[0] : (scheme.tagline || 'Government Supported Credit Facility');

    return {
      scheme,
      eligible,
      badge,
      reasons,
      warnings,
      subventionNote
    };
  });
}

// ==========================================================================
// Eligibility Engine (Matching Screenshot 4)
// ==========================================================================

function setupEligibility() {
  if (el.eligibilityForm) {
    el.eligibilityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await checkEligibility();
    });
  }
}

async function checkEligibility() {
  const cropType = el.cropInput ? (el.cropInput.value.trim() || 'Rice, Wheat') : 'Rice, Wheat';
  const annualIncome = el.incomeInput ? (Number(el.incomeInput.value) || 150000) : 150000;
  const district = el.districtInput ? (el.districtInput.value.trim() || 'My District') : 'My District';
  const landOwnership = el.landSelect ? (el.landSelect.value || 'owner') : 'owner';
  const mainActivity = el.activitySelect ? (el.activitySelect.value || 'crop') : 'crop';
  const hasKcc = el.kccSelect ? (el.kccSelect.value || 'yes') : 'yes';
  const hasAadhaar = el.aadhaarSelect ? (el.aadhaarSelect.value || 'yes') : 'yes';

  state.userFarmProfile = {
    cropType,
    annualIncome,
    district,
    landOwnership,
    mainActivity,
    hasKcc,
    hasAadhaar
  };

  try {
    if (el.btnSubmitEligibility) {
      el.btnSubmitEligibility.disabled = true;
      el.btnSubmitEligibility.innerHTML = '<span>⏳</span> Evaluating...';
    }

    let results = null;

    try {
      const res = await fetch('/api/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.userFarmProfile)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          results = data.results;
        }
      }
    } catch (apiErr) {
      console.warn('Backend /api/eligibility unreachable, evaluating locally:', apiErr);
    }

    // Fallback if backend API is not responding (e.g. VS Code Live Server port 5500)
    if (!results) {
      results = evaluateEligibilityClient(state.userFarmProfile, state.schemes);
    }

    renderEligibilityResults(results);
    const eligibleCount = results.filter(r => r.eligible).length;
    showToast(`Matched with ${eligibleCount} eligible government schemes!`);
    speakText(`Found ${eligibleCount} government schemes matching your farm profile.`);

  } catch (err) {
    console.error('Eligibility evaluation error:', err);
  } finally {
    if (el.btnSubmitEligibility) {
      el.btnSubmitEligibility.disabled = false;
      el.btnSubmitEligibility.innerHTML = `<span>🔍</span> <span>${t('btnCheckElig')}</span>`;
    }
  }
}

function renderEligibilityResults(results) {
  if (!el.eligResultsContainer) return;

  if (el.eligEmptyState) el.eligEmptyState.style.display = 'none';
  el.eligResultsContainer.style.display = 'flex';
  el.eligResultsContainer.innerHTML = '';

  results.forEach(item => {
    const scheme = item.scheme;
    const card = document.createElement('div');
    card.className = `elig-result-card ${item.eligible ? '' : 'conditional'}`;

    const reasonsHtml = (item.reasons || []).map(r => `
      <div style="font-size: 0.86rem; color: #166534; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem;">
        ✓ ${r}
      </div>
    `).join('');

    const warningsHtml = (item.warnings || []).map(w => `
      <div style="font-size: 0.84rem; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; padding: 0.45rem 0.8rem; border-radius: var(--radius-sm); margin-bottom: 0.4rem;">
        ⚠️ ${w}
      </div>
    `).join('');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span style="background: ${item.eligible ? '#dcfce7' : '#fef3c7'}; color: ${item.eligible ? '#166534' : '#92400e'}; padding: 0.25rem 0.75rem; border-radius: var(--radius-pill); font-size: 0.78rem; font-weight: 700;">
            ${item.badge}
          </span>
          <h3 style="font-size: 1.25rem; color: #0f172a; margin-top: 0.4rem;">${scheme.name}</h3>
        </div>
        <button class="btn-icon-secondary" style="width: 32px; height: 32px;" title="Listen" onclick="speakText('${scheme.name}. ${item.subventionNote}')">🔊</button>
      </div>

      <div style="background: #f0fdf4; border-left: 4px solid #15803d; padding: 0.6rem 0.9rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.88rem; font-weight: 600; color: #166534; margin-bottom: 0.8rem;">
        💡 ${item.subventionNote}
      </div>

      ${warningsHtml}
      <div style="margin-bottom: 1rem;">${reasonsHtml}</div>

      <div style="display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: center;">
        <button class="btn-add-payment-action" style="flex: initial; padding: 0.6rem 1.4rem; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #15803d, #16a34a); box-shadow: 0 4px 12px rgba(22,163,74,0.25);" onclick="chooseLoanFromEligibility('${scheme.id}')">
          🌾 Choose This Loan & Apply
        </button>
        <button class="btn-icon-secondary" style="width: auto; padding: 0.6rem 1.2rem; border-radius: var(--radius-pill); font-size: 0.85rem;" onclick="openChecklist('${scheme.id}')">
          📋 ${t('docChecklistTitle')}
        </button>
      </div>
    `;

    el.eligResultsContainer.appendChild(card);
  });
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
