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
  schemes: [],
  loans: [],
  loanSummary: {
    totalBorrowed: 0,
    totalPaid: 950000,
    totalDue: 4218304,
    totalMonthlyEmi: 76183,
    activeCount: 5,
    endedCount: 2,
    allCount: 7
  },
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
      el.addLoanModal.classList.add('active');
    });
  }
}

async function loadLoans() {
  try {
    const res = await fetch('/api/loans');
    const json = await res.json();
    if (json.success) {
      state.loans = json.data;
      state.loanSummary = json.summary;
      updateLoanSummaryUI();
      renderLoansList();
    }
  } catch (err) {
    console.error('Failed to load loans:', err);
  }
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
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #ffffff; border-radius: var(--radius-md); border: 1.5px dashed var(--border-color);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">💳</div>
        <p style="color: #64748b; font-size: 1.05rem; font-weight: 600;">${msg}</p>
        <button class="btn-add-loan-top" style="margin-top: 1rem;" onclick="el.addLoanModal.classList.add('active')">
          ${t('btnAddLoan')}
        </button>
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
      const note = el.payNoteInput.value.trim() || 'Payment made';

      try {
        const res = await fetch(`/api/loans/${loanId}/payment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, note })
        });
        const data = await res.json();
        if (data.success) {
          el.paymentModal.classList.remove('active');
          showToast(data.message);
          await loadLoans();
          speakText(`Payment of ${formatINR(amount)} recorded. Remaining balance is ${formatINR(data.data.dueAmount)}.`);
        }
      } catch (err) {
        console.error('Payment error:', err);
      }
    });
  }

  // Add Loan Modal Close
  if (el.addLoanClose) {
    el.addLoanClose.addEventListener('click', () => el.addLoanModal.classList.remove('active'));
  }
  if (el.btnCancelAddLoan) {
    el.btnCancelAddLoan.addEventListener('click', () => el.addLoanModal.classList.remove('active'));
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

      try {
        const res = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schemeName: name,
            bankName: bank,
            principalAmount: totalAmount,
            paidAmount,
            interestRate,
            tenureMonths,
            status
          })
        });
        const data = await res.json();
        if (data.success) {
          el.addLoanModal.classList.remove('active');
          el.createLoanForm.reset();
          showToast('New loan successfully added to your tracker!');
          await loadLoans();
        }
      } catch (err) {
        console.error('Failed to create loan:', err);
      }
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
        applySchemeToTracker(state.selectedScheme.id);
        el.checklistModal.classList.remove('active');
      }
    });
  }
}

// Delete Loan
window.deleteLoan = async function(loanId) {
  if (!confirm('Are you sure you want to remove this loan record from your tracker?')) return;
  try {
    const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Loan removed from tracker');
      await loadLoans();
    }
  } catch (err) {
    console.error('Delete loan error:', err);
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
  try {
    const res = await fetch('/api/schemes');
    const json = await res.json();
    if (json.success) {
      state.schemes = json.data;
      renderSchemesGrid(state.schemes);
    }
  } catch (err) {
    console.error('Failed to load schemes:', err);
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

        <!-- View Details Button -->
        <button class="btn-view-details ${themeColor}" onclick="openChecklist('${scheme.id}')">
          <span>${t('viewDetails')}</span>
          <span>→</span>
        </button>
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

// One-Click Apply & Add to Loan Tracker
window.applySchemeToTracker = async function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

  const defaultPrincipal = scheme.id === 'pm-kisan' ? 6000 : (scheme.id === 'miss' ? 300000 : (scheme.id === 'aif' ? 2000000 : 500000));
  const defaultRate = scheme.effectiveRate || scheme.baseRate || 7.0;

  try {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemeId: scheme.id,
        schemeName: scheme.name,
        schemeSub: `${scheme.shortName} - Loan`,
        bankName: 'Gramin Kisan Cooperative Bank',
        principalAmount: defaultPrincipal,
        paidAmount: 0,
        interestRate: defaultRate,
        tenureMonths: 60,
        status: 'Active'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${scheme.shortName} added to My Loans & EMIs!`);
      await loadLoans();
      switchView('loans');
    }
  } catch (err) {
    console.error('Failed to apply scheme:', err);
  }
};

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
  const cropType = el.cropInput.value.trim() || 'Rice, Wheat';
  const annualIncome = Number(el.incomeInput.value) || 150000;
  const district = el.districtInput.value.trim() || 'Pune';
  const landOwnership = el.landSelect.value || 'owner';
  const mainActivity = el.activitySelect.value || 'crop';
  const hasKcc = el.kccSelect.value || 'yes';
  const hasAadhaar = el.aadhaarSelect.value || 'yes';

  try {
    el.btnSubmitEligibility.disabled = true;
    el.btnSubmitEligibility.innerHTML = '<span>⏳</span> Evaluating...';

    const res = await fetch('/api/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cropType,
        annualIncome,
        district,
        landOwnership,
        mainActivity,
        hasKcc,
        hasAadhaar
      })
    });

    const data = await res.json();
    if (data.success) {
      renderEligibilityResults(data.results);
      const eligibleCount = data.results.filter(r => r.eligible).length;
      showToast(`Matched with ${eligibleCount} eligible government schemes!`);
      speakText(`Found ${eligibleCount} government schemes matching your farm profile.`);
    }
  } catch (err) {
    console.error('Eligibility evaluation error:', err);
  } finally {
    el.btnSubmitEligibility.disabled = false;
    el.btnSubmitEligibility.innerHTML = `<span>🔍</span> <span>${t('btnCheckElig')}</span>`;
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

      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
        <button class="btn-icon-secondary" style="width: auto; padding: 0.5rem 1rem; border-radius: var(--radius-pill); font-size: 0.85rem;" onclick="openChecklist('${scheme.id}')">
          📋 ${t('docChecklistTitle')}
        </button>
        <button class="btn-add-payment-action" style="flex: initial; padding: 0.5rem 1.2rem; font-size: 0.85rem;" onclick="applySchemeToTracker('${scheme.id}')">
          ➕ ${t('btnAddToTracker')}
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
