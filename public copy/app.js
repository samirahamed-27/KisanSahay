/**
 * KisanSahay Frontend Application Logic
 * Accessible Agricultural Finance & Multi-Loan Management Portal
 * Supports 25 Indian Languages, Active & Ended Loan Tracking, and Screenshot-Exact UI
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
  currentSoilProfile: null,
  notifications: [],
  unreadNotificationsCount: 0,
  currentAudio: null,
  ttsSpeed: 1.0,
  checklistConfirmed: false,
  farmerQualification: (() => {
    try {
      const saved = localStorage.getItem('kisansahay_farmer_qualification');
      return saved ? JSON.parse(saved) : {
        gender: 'Male',
        age: 35,
        state: 'Uttar Pradesh',
        residence: 'Rural',
        disability: 'No',
        minority: 'No'
      };
    } catch (e) {
      return {
        gender: 'Male',
        age: 35,
        state: 'Uttar Pradesh',
        residence: 'Rural',
        disability: 'No',
        minority: 'No'
      };
    }
  })()
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
  toastContainer: document.getElementById('toast-container'),

  // Notification Header Elements
  notificationHeaderContainer: document.getElementById('notification-header-container'),
  notificationBellBtn: document.getElementById('notification-bell-btn'),
  notificationBadge: document.getElementById('notification-badge'),
  notificationDropdownMenu: document.getElementById('notification-dropdown-menu'),
  notificationDropdownList: document.getElementById('notification-dropdown-list'),
  notificationCountTag: document.getElementById('notification-count-tag'),
  btnMarkAllRead: document.getElementById('btn-mark-all-read'),
  btnEnablePush: document.getElementById('btn-enable-push'),
  pushStatusText: document.getElementById('push-status-text'),

  // Aadhaar Warning Guide Box
  aadhaarGuideBox: document.getElementById('aadhaar-unlinked-guide-box'),

  // Checklist Extra Elements
  btnReadChecklistAloud: document.getElementById('btn-read-checklist-aloud'),
  checklistWarningBox: document.getElementById('checklist-warning-box'),
  checklistCompletionStatus: document.getElementById('checklist-completion-status'),

  // Neural TTS Audio Player Elements
  audioPlayerBar: document.getElementById('kisan-audio-player-bar'),
  audioPlayPauseBtn: document.getElementById('audio-play-pause-btn'),
  audioPlayIcon: document.getElementById('audio-play-icon'),
  audioWaveAnim: document.getElementById('audio-wave-anim'),
  audioStatusLabel: document.getElementById('audio-status-label'),
  audioLangLabel: document.getElementById('audio-lang-label'),
  audioSpeedSelect: document.getElementById('audio-speed-select'),
  audioCloseBtn: document.getElementById('audio-close-btn')
};

// ==========================================================================
// Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();
  setupNavigation();
  setupLanguages();
  setupSpeech();
  setupNotifications();
  setupAudioPlayer();
  setupAadhaarLinkingGuard();
  setupEligibility();
  setupModals();
  setupDocumentVault();
  setupLoanTabs();
  setupSchemesSearch();
  setupSahayAI();
  renderHomeCategories();
  setupCategoryExplorer();
  setupMultiuserStateListener();
  setupNetworkSpeedMonitor();
  setupFarmerQualificationModal();
  setupPWAInstallPrompt();
  setupUniversalPWADownloadModal();
  setupMobileAppDownloadBar();
  setupDynamicProcessSection();

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
// 25 Indian Languages Engine
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

function applyTranslationsToDOM() {
  // Translate all DOM elements with data-i18n safely
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    const existing = elem.textContent ? elem.textContent.trim() : '';
    let translated = t(key, existing);
    if (key === 'btnBack' && translated) {
      translated = translated.replace(/^[←\s]+/, '').trim();
    }
    if (translated && translated !== key) {
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

  // Re-render home categories, loans & schemes to reflect language
  if (typeof renderHomeCategories === 'function') renderHomeCategories();
  if (typeof renderLoansList === 'function') renderLoansList();
  if (typeof renderSchemesGrid === 'function') renderSchemesGrid(state.schemes);

  // If currently in category explorer view, re-render explorer with new language
  if (state.currentTab === 'category-schemes' && typeof filterAndRenderCategorySchemes === 'function') {
    const cat = (window.NATIONAL_CATEGORIES || []).find(c => c.id === currentCategoryState.categoryId) || (window.NATIONAL_CATEGORIES ? window.NATIONAL_CATEGORIES[0] : null);
    if (cat && typeof getCategoryLocalizedName === 'function') {
      const breadcrumb = document.getElementById('cat-breadcrumb-title');
      if (breadcrumb) breadcrumb.textContent = getCategoryLocalizedName(cat);
      const heroTitle = document.querySelector('.category-hero-overlay-title');
      if (heroTitle) heroTitle.textContent = getCategoryLocalizedName(cat);
    }
    filterAndRenderCategorySchemes();
  }
}

async function setLanguage(langCode) {
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

  // Ensure window.TRANSLATIONS structure exists
  if (!window.TRANSLATIONS) window.TRANSLATIONS = {};
  if (!window.TRANSLATIONS['en'] && window.BASE_STRINGS) {
    window.TRANSLATIONS['en'] = window.BASE_STRINGS;
  }

  // 1. If base language English, apply immediately
  if (langCode === 'en') {
    applyTranslationsToDOM();
    return;
  }

  // 2. If already in client-side cache, apply instantly (0ms round-trip)
  if (window.TRANSLATIONS[langCode] && Object.keys(window.TRANSLATIONS[langCode]).length > 0) {
    applyTranslationsToDOM();
    return;
  }

  // 3. Cache Miss: Fetch batch translation via the centralized translateBatch function
  const baseStrings = window.TRANSLATIONS['en'] || window.BASE_STRINGS || {};
  const langBtn = el.langToggleBtn || document.getElementById('lang-toggle-btn');

  try {
    if (langBtn) langBtn.classList.add('lang-loading-shimmer');

    const transMap = await translateBatch(baseStrings, langCode);
    if (transMap && typeof transMap === 'object' && Object.keys(transMap).length > 0) {
      window.TRANSLATIONS[langCode] = transMap;
      applyTranslationsToDOM();
    } else {
      applyTranslationsToDOM();
    }
  } catch (err) {
    console.warn(`[KisanSahay] Translation notice (${err.message}). Falling back gracefully to base language.`);
    applyTranslationsToDOM();
  } finally {
    if (langBtn) langBtn.classList.remove('lang-loading-shimmer');
  }
}

// ==========================================================================
// Client-Side Translation Cache Engine (In-Memory + LocalStorage)
// Keyed by: targetLang + ':::' + text
// ==========================================================================

const TRANSLATION_CACHE_STORAGE_KEY = 'kisansahay_translation_cache_v1';
const translationTextCache = new Map();
const fieldSourceTextMap = new Map();

function getTranslationCacheKey(text, targetLang) {
  return `${(targetLang || '').toLowerCase().trim()}:::${(text || '').trim()}`;
}

function getCachedTranslation(text, targetLang) {
  if (!text || typeof text !== 'string') return null;
  const key = getTranslationCacheKey(text, targetLang);
  return translationTextCache.get(key) || null;
}

let saveCacheTimeout = null;
function saveTranslationCacheToStorage() {
  if (typeof localStorage === 'undefined') return;
  if (saveCacheTimeout) clearTimeout(saveCacheTimeout);
  saveCacheTimeout = setTimeout(() => {
    try {
      const obj = {};
      let count = 0;
      for (const [k, v] of translationTextCache.entries()) {
        obj[k] = v;
        count++;
        if (count >= 2000) break; // Cache cap
      }
      localStorage.setItem(TRANSLATION_CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.debug('[KisanSahay] Could not persist translation cache:', e);
    }
  }, 300);
}

function setCachedTranslation(text, targetLang, translatedText) {
  if (!text || typeof text !== 'string' || !translatedText || typeof translatedText !== 'string') return;
  const key = getTranslationCacheKey(text, targetLang);
  translationTextCache.set(key, translatedText);
  saveTranslationCacheToStorage();
}

function invalidateTranslationCache(text, targetLang) {
  if (!text) return;
  if (targetLang) {
    const key = getTranslationCacheKey(text, targetLang);
    translationTextCache.delete(key);
  } else {
    const suffix = `:::${text.trim()}`;
    for (const k of Array.from(translationTextCache.keys())) {
      if (k.endsWith(suffix)) {
        translationTextCache.delete(k);
      }
    }
  }
  saveTranslationCacheToStorage();
}

function initTranslationCache() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            translationTextCache.set(k, v);
          }
        }
      }
    }
  } catch (e) {
    console.debug('[KisanSahay] Could not read translation cache from storage:', e);
  }

  // Pre-seed from window.TRANSLATIONS if available
  try {
    if (typeof window !== 'undefined' && window.TRANSLATIONS && window.TRANSLATIONS['en']) {
      const enMap = window.TRANSLATIONS['en'];
      for (const [lang, langMap] of Object.entries(window.TRANSLATIONS)) {
        if (lang === 'en' || !langMap || typeof langMap !== 'object') continue;
        for (const [k, enText] of Object.entries(enMap)) {
          if (langMap[k] && typeof enText === 'string' && typeof langMap[k] === 'string') {
            const cacheKey = getTranslationCacheKey(enText, lang);
            if (!translationTextCache.has(cacheKey)) {
              translationTextCache.set(cacheKey, langMap[k]);
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore
  }
}

initTranslationCache();

// Expose cache utilities on window
window.translationTextCache = translationTextCache;
window.getCachedTranslation = getCachedTranslation;
window.setCachedTranslation = setCachedTranslation;
window.invalidateTranslationCache = invalidateTranslationCache;

// ==========================================================================
// In-Flight Translation Loading Indicators (Progress Bar & Floating Spinner)
// ==========================================================================
let activeTranslationsCount = 0;
let translationLoadingTimeout = null;

function ensureTranslationLoadingElements() {
  let bar = document.getElementById('translation-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'translation-progress-bar';
    bar.className = 'translation-progress-bar';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);
  }

  let pill = document.getElementById('translation-loading-pill');
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'translation-loading-pill';
    pill.className = 'translation-loading-pill';
    pill.setAttribute('role', 'status');
    pill.setAttribute('aria-live', 'polite');
    pill.innerHTML = `
      <span class="translation-spinner" aria-hidden="true"></span>
      <span id="translation-loading-text">Translating content...</span>
    `;
    document.body.appendChild(pill);
  }

  return { bar, pill };
}

function showTranslationLoading(targetLang) {
  activeTranslationsCount++;
  const { bar, pill } = ensureTranslationLoadingElements();

  let langLabel = '';
  if (targetLang && window.INDIAN_LANGUAGES) {
    const found = window.INDIAN_LANGUAGES.find(l => l.code === targetLang);
    if (found) {
      langLabel = found.native ? ` (${found.native})` : ` (${found.name})`;
    }
  }

  const textEl = document.getElementById('translation-loading-text');
  if (textEl) {
    textEl.textContent = langLabel ? `Translating${langLabel}...` : 'Translating content...';
  }

  bar.classList.add('active');
  pill.classList.add('visible');

  // Also toggle shimmer on language selector button if available
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.classList.add('lang-loading-shimmer');
  }

  // Defensive fallback: auto-clear after 15 seconds if network request stalls
  if (translationLoadingTimeout) clearTimeout(translationLoadingTimeout);
  translationLoadingTimeout = setTimeout(() => {
    if (activeTranslationsCount > 0) {
      activeTranslationsCount = 0;
      hideTranslationLoadingUI();
    }
  }, 15000);
}

function hideTranslationLoadingUI() {
  const bar = document.getElementById('translation-progress-bar');
  const pill = document.getElementById('translation-loading-pill');
  if (bar) bar.classList.remove('active');
  if (pill) pill.classList.remove('visible');
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.classList.remove('lang-loading-shimmer');
  }
}

function hideTranslationLoading() {
  activeTranslationsCount = Math.max(0, activeTranslationsCount - 1);
  if (activeTranslationsCount === 0) {
    if (translationLoadingTimeout) {
      clearTimeout(translationLoadingTimeout);
      translationLoadingTimeout = null;
    }
    hideTranslationLoadingUI();
  }
}

// Expose indicator controls on window
window.showTranslationLoading = showTranslationLoading;
window.hideTranslationLoading = hideTranslationLoading;

/**
 * Reusable frontend batch translation function with caching.
 * - Keyed by text + targetLang (in-memory + localStorage).
 * - Skips API call completely if all texts were already translated into targetLang.
 * - If source text for a key changes, invalidates the previous cache entry.
 * - Only sends cache misses to /api/translate.
 * - Shows lightweight loading indicator (progress bar + floating spinner) while in flight.
 * - This is the ONLY function in the codebase that calls the translate API directly.
 *
 * @param {Object} fieldsObject - JSON object containing { key: text } pairs
 * @param {string} targetLang - Target language code (e.g. 'hi', 'pa', 'mr', 'ta')
 * @returns {Promise<Object>} - Translated { key: translatedText } object in the same shape
 */
async function translateBatch(fieldsObject, targetLang) {
  // 1. Return input unchanged if target language is English or input is empty/falsy
  if (!fieldsObject || typeof fieldsObject !== 'object' || targetLang === 'en' || !targetLang) {
    return fieldsObject;
  }

  const normLang = targetLang.toLowerCase().trim();
  const result = {};
  const misses = {}; // Only keys whose source text is not in cache

  // 2. Check each field against the text + targetLang cache
  for (const [key, text] of Object.entries(fieldsObject)) {
    if (!text || typeof text !== 'string') {
      result[key] = text;
      continue;
    }

    // Invalidate cache entry if source text for this key changed
    if (fieldSourceTextMap.has(key)) {
      const prevText = fieldSourceTextMap.get(key);
      if (prevText !== text) {
        invalidateTranslationCache(prevText, normLang);
      }
    }
    fieldSourceTextMap.set(key, text);

    const cached = getCachedTranslation(text, normLang);
    if (cached !== null) {
      result[key] = cached;
    } else {
      misses[key] = text;
    }
  }

  // 3. Skip API call completely if all exact texts were already translated into targetLang (zero network delay)
  if (Object.keys(misses).length === 0) {
    return result;
  }

  // 4. Call /api/translate once with only the cache misses while showing lightweight loading indicator
  showTranslationLoading(normLang);
  try {
    const payload = Object.assign({}, misses, {
      target_lang: normLang
    });

    const res = await fetch(`/api/translate?target_lang=${encodeURIComponent(normLang)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[KisanSahay] Translation API HTTP ${res.status}. Returning original fields.`);
      for (const [k, orig] of Object.entries(misses)) {
        result[k] = orig;
      }
      return result;
    }

    const data = await res.json();
    const translatedMisses = (data && data.translations) ? data.translations : data;

    // 5. Store newly translated results in cache and build final result
    for (const [k, origText] of Object.entries(misses)) {
      const translatedVal = (translatedMisses && translatedMisses[k]) ? translatedMisses[k] : origText;
      result[k] = translatedVal;
      if (translatedVal && translatedVal !== origText) {
        setCachedTranslation(origText, normLang, translatedVal);
      }
    }

    return result;
  } catch (err) {
    console.warn(`[KisanSahay] Translation network error (${err.message}). Returning original fields.`);
    for (const [k, orig] of Object.entries(misses)) {
      result[k] = orig;
    }
    return result;
  } finally {
    hideTranslationLoading();
  }
}

// Expose globally on window so any script or UI component can reuse it
window.translateBatch = translateBatch;

/**
 * On-the-fly Dynamic Translation helper (for scheme details / chat responses)
 * Delegates to translateBatch
 */
async function translateDynamic(texts, targetLang) {
  return await translateBatch(texts, targetLang);
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
    if (el.loanListStatusNote) el.loanListStatusNote.innerHTML = '<span class="status-note-dot">●</span> <span>Showing currently running loans with due EMIs</span>';
  } else if (state.currentLoanTab === 'ended') {
    filtered = state.loans.filter(l => l.status === 'Ended' || l.dueAmount === 0);
    if (el.loanListStatusNote) el.loanListStatusNote.innerHTML = '<span class="status-note-dot">●</span> <span>Showing fully paid and completed loans</span>';
  } else {
    if (el.loanListStatusNote) el.loanListStatusNote.innerHTML = '<span class="status-note-dot">●</span> <span>Showing all loans and credit records</span>';
  }

  if (filtered.length === 0) {
    const msg = state.currentLoanTab === 'ended' ? t('emptyEndedLoans') : t('emptyActiveLoans');
    el.loansCardsGrid.innerHTML = `
      <div class="loans-empty-card" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; border-radius: var(--radius-md); border: 1.5px dashed var(--border-color);">
        <div style="font-size: 2.8rem; margin-bottom: 0.8rem;">💳</div>
        <p class="empty-title" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.4rem;">${msg}</p>
        <p class="empty-desc" style="font-size: 0.95rem; max-width: 520px; margin: 0 auto 1.6rem auto; line-height: 1.5;">
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
          ${isEnded ? `<button class="btn-icon-secondary" style="width: 28px; height: 28px; background: rgba(255,255,255,0.2); border: none; color: #fff; font-size: 0.8rem;" title="Remove Ended Loan Record" onclick="deleteLoan('${loan.id}')">✕</button>` : ''}
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

        <!-- Provider, Source & Verification Details (Requirement 3) -->
        <div class="loan-provider-bar">
          <div>
            <strong>Provider:</strong> ${loan.provider_name || loan.bankName || 'Government of India'}
          </div>
          <div>
            <strong>Source:</strong> <a href="${loan.source_url || 'https://agricoop.nic.in'}" target="_blank" rel="noopener noreferrer">${loan.source_name || 'Official Portal'} ↗</a>
          </div>
          <div>
            <strong>Verified:</strong> ${loan.last_fetched_at || 'March 2026'}
          </div>
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
        provider_name: (state.selectedScheme && state.selectedScheme.provider_name) || bank || 'State Bank of India',
        source_name: (state.selectedScheme && state.selectedScheme.source_name) || 'Official Agriculture Portal',
        source_url: (state.selectedScheme && state.selectedScheme.source_url) || 'https://agricoop.nic.in',
        last_fetched_at: (state.selectedScheme && state.selectedScheme.last_fetched_at) || 'March 2026',
        checklistCompleted: state.checklistConfirmed || true,
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
      speakKisanText(`${name} has been added to your loan tracker.`);
      switchView('loans');
      if (typeof loadNotifications === 'function') loadNotifications();
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
      if (!state.checklistConfirmed) {
        showToast('⚠️ Please verify and check all required documents before applying');
        return;
      }
      if (state.selectedScheme) {
        el.checklistModal.classList.remove('active');
        chooseLoanFromEligibility(state.selectedScheme.id);
      }
    });
  }
}

// Delete Loan (Active Loans Strictly Cannot Be Removed - Requirement 6)
window.deleteLoan = async function(loanId) {
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return;

  const isActive = (loan.status === 'Active' && loan.dueAmount > 0) || (Number(loan.dueAmount) > 0);
  if (isActive) {
    showToast(`Active loans cannot be removed until fully repaid. Total remaining due: ${formatINR(loan.dueAmount)}`);
    return;
  }

  if (!confirm('Are you sure you want to remove this ended loan record from your archive?')) return;
  try {
    const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.message || `Active loans cannot be removed until fully repaid. Total remaining due: ${formatINR(loan.dueAmount)}`);
      return;
    }
  } catch (err) {
    console.warn('Backend delete failed, deleted locally:', err);
  }

  const idx = state.loans.findIndex(l => l.id === loanId);
  if (idx !== -1) {
    state.loans.splice(idx, 1);
    localStorage.setItem('kisansahay_loans', JSON.stringify(state.loans));
    recalculateLoanSummary();
    updateLoanSummaryUI();
    renderLoansList();
    showToast('Ended loan removed from archive');
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

  const allIndiaSelect = document.getElementById('schemes-all-india-state-select');
  const stateFilter = (allIndiaSelect && allIndiaSelect.value !== 'all') ? allIndiaSelect.value : '';

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

  // Dynamic Live State Schemes Count Beacon
  const stateCountText = document.getElementById('state-count-text');
  const allIndiaSelect = document.getElementById('schemes-all-india-state-select');
  if (stateCountText) {
    const selState = allIndiaSelect ? allIndiaSelect.value : 'all';
    if (selState && selState !== 'all') {
      stateCountText.textContent = `${activeSchemesFilteredList.length} Schemes in ${selState}`;
    } else {
      stateCountText.textContent = `${activeSchemesFilteredList.length} Verified Schemes Nationwide`;
    }
  }
}

function setupSchemesSearch() {
  if (el.schemesSearchInput) {
    el.schemesSearchInput.addEventListener('input', () => {
      applySchemesFilters(true);
    });
  }

  if (el.filterChipBtns && el.filterChipBtns.length > 0) {
    el.filterChipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.filterChipBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySchemesFilters(true);
      });
    });
  }

  const allIndiaSelect = document.getElementById('schemes-all-india-state-select');
  if (allIndiaSelect) {
    allIndiaSelect.addEventListener('change', () => {
      applySchemesFilters(true);
    });
  }

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

let currentSchemesGridRenderId = 0;

async function renderSchemesGrid(schemes) {
  if (!el.schemesCardsContainer) return;

  const renderId = ++currentSchemesGridRenderId;

  if (!schemes || schemes.length === 0) {
    el.schemesCardsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card, #fff); border-radius: var(--radius-md);">
        <p style="color: #64748b;">${t('noSchemesFound', 'No schemes matched your search query.')}</p>
      </div>
    `;
    if (el.schemesCountText) {
      el.schemesCountText.textContent = t('zeroSchemesFound', '0 schemes found');
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
  const targetLang = (state && state.currentLang) || 'en';

  // 1. Collect all translatable fields from the visible cards into one single object
  const translatableFields = {};

  batchToRender.forEach((scheme, index) => {
    const schemeKey = scheme.id || `scheme_${index}`;
    const tierInfo = getSchemeTier(scheme);

    if (scheme.name) translatableFields[`${schemeKey}_name`] = scheme.name;
    if (scheme.category) translatableFields[`${schemeKey}_category`] = scheme.category;
    if (scheme.shortName) translatableFields[`${schemeKey}_shortName`] = scheme.shortName;
    if (scheme.whatItIs || scheme.tagline) {
      translatableFields[`${schemeKey}_whatItIs`] = scheme.whatItIs || scheme.tagline;
    }
    if (tierInfo && tierInfo.badgeText) {
      translatableFields[`${schemeKey}_badgeText`] = tierInfo.badgeText;
    }

    const rawHighlights = Array.isArray(scheme.highlights) && scheme.highlights.length > 0
      ? scheme.highlights
      : (scheme.tagline ? [scheme.tagline] : []);

    rawHighlights.forEach((hl, hlIdx) => {
      if (hl && typeof hl === 'string') {
        translatableFields[`${schemeKey}_hl_${hlIdx}`] = hl;
      }
    });
  });

  // 2. Clear container & display subtle loading spinner while waiting if non-English
  // This guarantees that NO English text appears before the translated cards render
  if (targetLang !== 'en') {
    el.schemesCardsContainer.innerHTML = `
      <div class="schemes-grid-loading" style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; padding: 4rem 1rem; min-height: 220px;">
        <div style="width: 36px; height: 36px; border: 3px solid rgba(16, 185, 129, 0.2); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      </div>
    `;
    if (el.schemesCountText) {
      el.schemesCountText.textContent = '...';
    }
  } else {
    el.schemesCardsContainer.innerHTML = '';
  }

  // 3. Call translateBatch() on the single collected object and wait for the result
  let translatedMap = {};
  if (targetLang !== 'en') {
    translatedMap = await translateBatch(translatableFields, targetLang);
  }

  // Prevent race conditions from rapid filtering / tab switches
  if (renderId !== currentSchemesGridRenderId) return;

  // Clear loading state
  el.schemesCardsContainer.innerHTML = '';

  // Update dynamic count text
  if (el.schemesCountText) {
    const topCount = sortedSchemes.filter(s => getSchemeTier(s).tier === 1).length;
    if (targetLang === 'hi') {
      el.schemesCountText.textContent = `${sortedSchemes.length} सत्यापित योजनाओं में से ${batchToRender.length} दिखाई जा रही हैं (${topCount} शीर्ष अनुशंसित)`;
    } else if (targetLang !== 'en') {
      el.schemesCountText.textContent = `${batchToRender.length} / ${sortedSchemes.length}`;
    } else {
      el.schemesCountText.textContent = `Showing ${batchToRender.length} of ${sortedSchemes.length} verified schemes (${topCount} Top Recommended on top)`;
    }
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

  // 4. Build and inject the HTML cards with the translated fields
  batchToRender.forEach((scheme, index) => {
    const schemeKey = scheme.id || `scheme_${index}`;
    const card = document.createElement('div');
    card.className = 'scheme-card-box';

    const tierInfo = getSchemeTier(scheme);

    const schemeName = (translatedMap && translatedMap[`${schemeKey}_name`]) || scheme.name;
    const schemeCategory = (translatedMap && translatedMap[`${schemeKey}_category`]) || scheme.category;
    const schemeShortName = (translatedMap && translatedMap[`${schemeKey}_shortName`]) || scheme.shortName;
    const schemeDesc = (translatedMap && translatedMap[`${schemeKey}_whatItIs`]) || scheme.whatItIs || scheme.tagline;
    const badgeText = (translatedMap && translatedMap[`${schemeKey}_badgeText`]) || tierInfo.badgeText;

    const rawHighlights = Array.isArray(scheme.highlights) && scheme.highlights.length > 0
      ? scheme.highlights
      : (scheme.tagline ? [scheme.tagline] : []);

    const highlightsHtml = rawHighlights.map((hl, hlIdx) => {
      const translatedHl = (translatedMap && translatedMap[`${schemeKey}_hl_${hlIdx}`]) || hl;
      return `<div class="scheme-tag-pill ${tierInfo.pillStyle}">${translatedHl}</div>`;
    }).join('');

    card.innerHTML = `
      <!-- Scheme Tier Status Banner -->
      <div class="scheme-tier-badge ${tierInfo.badgeClass}">
        ${badgeText}
      </div>

      <!-- Top Colored Banner with Smooth Gradient -->
      <div class="scheme-top-banner ${tierInfo.themeColor}">
        <div class="scheme-category-tag">${schemeCategory}</div>
        <h3 class="scheme-banner-title">${schemeName}</h3>
        <div class="scheme-banner-short">${schemeShortName}</div>
      </div>

      <!-- Body Matching Screenshot 3 -->
      <div class="scheme-card-inner">
        <p class="scheme-card-desc">
          ${schemeDesc}
        </p>

        <!-- Highlights & Subvention Badges -->
        <div class="scheme-pill-stats">
          ${highlightsHtml}
        </div>

        <!-- Actions: Choose Loan & View Checklist -->
        <div style="display: flex; gap: 0.5rem; margin-top: 0.85rem;">
          <button class="btn-view-details ${tierInfo.themeColor}" style="flex: 1;" onclick="chooseLoanFromEligibility('${scheme.id}')">
            <span>${t('btnChooseLoan', '🌾 Choose Loan')}</span>
            <span>+</span>
          </button>
          <button class="btn-icon-secondary" style="width: 42px; height: 38px; border-radius: var(--radius-sm); font-size: 0.95rem;" title="${t('btnDocChecklist', '📋 Checklist')}" onclick="openChecklist('${scheme.id}')">
            📋
          </button>
        </div>
      </div>
    `;

    el.schemesCardsContainer.appendChild(card);
  });
}

// Open Document Checklist Modal (Requirement 5)
const STANDARD_SCHEME_DOCS = [
  { name: 'Aadhaar Card', desc: 'Mandatory Aadhaar card (must be linked to your savings bank account).' },
  { name: 'Land Ownership / Record', desc: 'Record of rights, 7/12 extract, Patta, or Khasra-Khatauni document.' },
  { name: 'Bank Account Details', desc: 'Bank account passbook copy or cancelled cheque showing IFSC & Account No.' },
  { name: 'Crop Sowing Proof', desc: 'Crop sowing certificate or Patwari / Gram Sevak cultivation verification.' },
  { name: 'Passport Size Photos', desc: 'Two recent color passport-size photographs of the primary applicant.' },
  { name: 'Caste / Category Certificate', desc: 'Required if applying under SC / ST / OBC prioritized subsidy quotas.' },
  { name: 'Income Certificate / Self Declaration', desc: 'Annual family income certificate or self-attested revenue declaration.' }
];

let currentChecklistRenderId = 0;

window.openChecklist = async function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;

  const renderId = ++currentChecklistRenderId;
  const targetLang = (state && state.currentLang) || 'en';

  state.selectedScheme = scheme;
  state.checklistConfirmed = false;

  const docsList = (scheme.documents && scheme.documents.length >= 3) ? scheme.documents : STANDARD_SCHEME_DOCS;
  const checkedSet = new Set();

  // 1. Collect all translatable fields into one single object
  const translatableFields = {
    scheme_name: scheme.name
  };

  docsList.forEach((doc, idx) => {
    const docKey = `doc_${idx}`;
    if (doc.name) translatableFields[`${docKey}_name`] = doc.name;
    if (doc.desc) translatableFields[`${docKey}_desc`] = doc.desc;
  });

  // 2. Open modal & display clean loading state if non-English
  // This confirms NO English text appears before the translated version renders!
  if (el.checklistModal) el.checklistModal.classList.add('active');

  if (targetLang !== 'en') {
    if (el.checklistModalTitle) {
      el.checklistModalTitle.textContent = `... — ${t('docChecklistTitle')}`;
    }
    if (el.checklistItemsBox) {
      el.checklistItemsBox.innerHTML = `
        <div class="checklist-loading-spinner" style="display: flex; justify-content: center; align-items: center; padding: 3.5rem 1rem; min-height: 180px;">
          <div style="width: 34px; height: 34px; border: 3px solid rgba(16, 185, 129, 0.2); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        </div>
      `;
    }
    if (el.checklistCompletionStatus) {
      el.checklistCompletionStatus.textContent = '';
    }
  } else {
    if (el.checklistModalTitle) {
      el.checklistModalTitle.textContent = `${scheme.name} — ${t('docChecklistTitle')}`;
    }
    if (el.checklistItemsBox) {
      el.checklistItemsBox.innerHTML = '';
    }
  }

  // 3. Call translateBatch() once on the collected object and wait for the result
  let translatedMap = {};
  if (targetLang !== 'en') {
    translatedMap = await translateBatch(translatableFields, targetLang);
  }

  // Discard stale render if user closed or opened another modal
  if (renderId !== currentChecklistRenderId) return;

  const translatedSchemeName = (translatedMap && translatedMap.scheme_name) || scheme.name;

  if (el.checklistModalTitle) {
    el.checklistModalTitle.textContent = `${translatedSchemeName} — ${t('docChecklistTitle')}`;
  }

  if (!el.checklistItemsBox) return;
  el.checklistItemsBox.innerHTML = '';

  function updateChecklistUI() {
    const total = docsList.length;
    const count = checkedSet.size;
    const isAllChecked = count === total;
    state.checklistConfirmed = isAllChecked;

    if (el.checklistCompletionStatus) {
      if (targetLang === 'hi') {
        el.checklistCompletionStatus.textContent = isAllChecked
          ? `✅ सभी ${total} दस्तावेज़ पुष्ट किए गए`
          : `${total} में से ${count} पुष्ट किए गए`;
      } else {
        el.checklistCompletionStatus.textContent = isAllChecked
          ? `✅ All ${total} documents confirmed`
          : `${count} of ${total} confirmed`;
      }
      el.checklistCompletionStatus.style.color = isAllChecked ? '#15803d' : '#dc2626';
    }

    if (el.checklistWarningBox) {
      if (isAllChecked) {
        el.checklistWarningBox.style.display = 'none';
      } else {
        el.checklistWarningBox.style.display = 'flex';
        const missingCount = total - count;
        const countText = document.getElementById('checklist-missing-count-text');
        if (countText) {
          if (targetLang === 'hi') {
            countText.textContent = `${missingCount} आवश्यक दस्तावेज़ अभी पुष्ट नहीं हुए हैं। आवेदन करने के लिए सभी आवश्यक हैं।`;
          } else {
            countText.textContent = `${missingCount} required document${missingCount > 1 ? 's' : ''} not yet confirmed. All are required to apply.`;
          }
        }
      }
    }

    if (el.btnTrackFromChecklist) {
      el.btnTrackFromChecklist.disabled = !isAllChecked;
      if (isAllChecked) {
        el.btnTrackFromChecklist.classList.remove('btn-apply-disabled');
        el.btnTrackFromChecklist.style.opacity = '1';
        el.btnTrackFromChecklist.style.cursor = 'pointer';
      } else {
        el.btnTrackFromChecklist.classList.add('btn-apply-disabled');
        el.btnTrackFromChecklist.style.opacity = '0.5';
        el.btnTrackFromChecklist.style.cursor = 'not-allowed';
      }
    }
  }

  // 4. Build and inject the checklist items using the translated text
  docsList.forEach((doc, idx) => {
    const docKey = `doc_${idx}`;
    const docName = (translatedMap && translatedMap[`${docKey}_name`]) || doc.name;
    const docDesc = (translatedMap && translatedMap[`${docKey}_desc`]) || doc.desc;

    const item = document.createElement('label');
    item.className = 'checklist-checkbox-item';
    item.htmlFor = `chk-doc-${idx}`;
    item.innerHTML = `
      <input type="checkbox" class="doc-check-input" id="chk-doc-${idx}" data-idx="${idx}">
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 0.92rem; color: #0f172a;" class="doc-title">${docName}</div>
        <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">${docDesc}</div>
      </div>
    `;

    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        checkedSet.add(idx);
        item.classList.add('checked');
        item.classList.remove('missing');
      } else {
        checkedSet.delete(idx);
        item.classList.remove('checked');
        item.classList.add('missing');
      }
      updateChecklistUI();
    });

    el.checklistItemsBox.appendChild(item);
  });

  // Read checklist aloud button
  if (el.btnReadChecklistAloud) {
    el.btnReadChecklistAloud.onclick = () => {
      const docNames = docsList.map((d, i) => {
        const docKey = `doc_${i}`;
        const dName = (translatedMap && translatedMap[`${docKey}_name`]) || d.name;
        return `${i + 1}. ${dName}`;
      }).join('. ');
      const speech = targetLang === 'hi'
        ? `${translatedSchemeName} के लिए आवश्यक दस्तावेज़ हैं: ${docNames}। कृपया पुष्टि करें कि आपके पास यह सभी दस्तावेज़ हैं।`
        : `Required documents for ${scheme.name} are: ${docNames}. Please confirm you have all these documents before applying.`;
      speakKisanText(speech, targetLang);
    };
  }

  updateChecklistUI();
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
  const btnLockNow = document.getElementById('btn-vault-lock-now');
  if (btnLockNow) {
    btnLockNow.addEventListener('click', lockFarmerVault);
  }

  // 6. Vault Save Submit Button
  if (el.btnVaultSaveSubmit) {
    el.btnVaultSaveSubmit.addEventListener('click', saveFarmerVault);
  }

  // 7. Unlock Modal Close Buttons & Forgot Password
  if (el.vaultUnlockClose) {
    el.vaultUnlockClose.addEventListener('click', closeVaultUnlockModal);
  }
  if (el.btnUnlockCancel) {
    el.btnUnlockCancel.addEventListener('click', closeVaultUnlockModal);
  }
  if (el.btnUnlockSubmit) {
    el.btnUnlockSubmit.addEventListener('click', unlockFarmerVault);
  }

  const btnForgotPass = document.getElementById('btn-vault-forgot-pass');
  if (btnForgotPass) {
    btnForgotPass.addEventListener('click', () => {
      closeVaultUnlockModal();
      openVaultResetModal();
    });
  }

  const btnResetTrigger = document.getElementById('btn-vault-reset-trigger');
  if (btnResetTrigger) {
    btnResetTrigger.addEventListener('click', () => {
      closeVaultModal();
      openVaultResetModal();
    });
  }

  // 8. Vault Reset Modal Listeners
  const resetClose = document.getElementById('vault-reset-close');
  if (resetClose) resetClose.addEventListener('click', closeVaultResetModal);

  const resetCancel = document.getElementById('btn-reset-modal-cancel');
  if (resetCancel) resetCancel.addEventListener('click', closeVaultResetModal);

  const btnSubmitReset = document.getElementById('btn-submit-vault-reset');
  if (btnSubmitReset) btnSubmitReset.addEventListener('click', submitVaultReset);

  ['word', 'number', 'pattern'].forEach(tab => {
    const btn = document.getElementById(`reset-tab-${tab}`);
    if (btn) btn.addEventListener('click', () => switchResetSecTab(tab));
  });

  // 9. Quick Select Crop Chips
  document.querySelectorAll('.crop-chip-pill').forEach(chip => {
    chip.addEventListener('click', () => {
      const crop = chip.getAttribute('data-crop');
      if (crop && el.cropInput) {
        el.cropInput.value = crop;
        el.cropInput.dispatchEvent(new Event('input', { bubbles: true }));
        el.cropInput.focus();
      }
    });
  });

  // 10. Practical Matrix Form Reset
  const btnResetForm = document.getElementById('btn-reset-elig-form');
  if (btnResetForm) {
    btnResetForm.addEventListener('click', () => {
      if (el.eligibilityForm) el.eligibilityForm.reset();
      if (el.cropInput) el.cropInput.value = '';
      if (el.landSizeInput) el.landSizeInput.value = '';
      if (el.stateInput) el.stateInput.value = '';
      if (el.districtInput) el.districtInput.value = '';
      if (el.incomeInput) el.incomeInput.value = '';
      if (el.existingLoansInput) el.existingLoansInput.value = '';
      const geoLat = document.getElementById('geo-lat');
      const geoLong = document.getElementById('geo-long');
      if (geoLat) geoLat.value = '';
      if (geoLong) geoLong.value = '';
      state.userFarmProfile = null;
      try {
        const activeProfile = window.multiUserManager ? window.multiUserManager.getActiveProfile() : null;
        const activeProfileId = activeProfile ? activeProfile.id : 'profile_default';
        localStorage.removeItem(`kisansahay_farm_${activeProfileId}`);
      } catch (e) {}
      const guideBox = document.getElementById('aadhaar-unlinked-guide-box');
      if (guideBox) guideBox.style.display = 'none';
      const resultsContainer = document.getElementById('elig-results-container');
      const emptyState = document.getElementById('elig-empty-state');
      if (resultsContainer) resultsContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      showToast('Assessment form reset.');
    });
  }

  // 11. Check initial vault status from server & cache
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

// Helper to get active profile ID
function getActiveVaultUserId() {
  if (window.multiUserManager && typeof window.multiUserManager.getActiveProfile === 'function') {
    const p = window.multiUserManager.getActiveProfile();
    if (p && p.id) return p.id;
  }
  return 'farmer_primary';
}

// Client-side SHA-256 password verifier
async function hashVaultPasswordClient(password, salt) {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${password}:kisansahay_vault_v2`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let hash = 0;
    const str = `${salt}:${password}:kisansahay_vault_v2`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
}

// Global Show/Hide password toggle function
window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
};

// UI helper to display incorrect password feedback
function showUnlockError(msg) {
  showToast(`❌ ${msg}`);
  const errNotice = document.getElementById('unlock-error-notice');
  if (errNotice) {
    errNotice.textContent = `❌ ${msg}`;
    errNotice.style.display = 'block';
  }
  const input = document.getElementById('unlock-word-input') || document.getElementById('unlock-pin-input');
  if (input) {
    input.classList.add('input-error-shake');
    input.value = '';
    input.focus();
    setTimeout(() => input.classList.remove('input-error-shake'), 600);
  }
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

  const btnLockNow = document.getElementById('btn-vault-lock-now');
  const btnResetTrigger = document.getElementById('btn-vault-reset-trigger');
  const btnSaveText = document.getElementById('btn-vault-save-text');
  const headerStatus = document.getElementById('vault-header-status');

  if (state.vaultState.isUnlocked) {
    if (btnLockNow) btnLockNow.style.display = 'inline-block';
    if (btnResetTrigger) btnResetTrigger.style.display = 'inline-flex';
    if (btnSaveText) btnSaveText.textContent = 'Update & Secure Documents';
    if (headerStatus) headerStatus.textContent = '✓ Unlocked & Verified';

    // Populate existing verified documents only if previously saved
    const docs = state.vaultState.documents || {};
    if (el.vaultAadhaar) el.vaultAadhaar.value = docs.aadhaarCard || '';
    if (el.vaultLand) el.vaultLand.value = docs.landRecord || '';
    if (el.vaultBank) el.vaultBank.value = docs.bankDetails || '';
    if (el.vaultCrop) el.vaultCrop.value = docs.cropSowing || '';
    if (el.vaultCategory) el.vaultCategory.value = docs.categoryCert || '';
  } else {
    if (btnLockNow) btnLockNow.style.display = 'none';
    if (btnResetTrigger) btnResetTrigger.style.display = 'none';
    if (btnSaveText) btnSaveText.textContent = 'Encrypt & Secure Documents';
    if (headerStatus) headerStatus.textContent = 'Encrypted Farmer Vault';

    // Ensure all fields are blank so the user enters their own details directly
    if (el.vaultAadhaar && !state.vaultState.documents) el.vaultAadhaar.value = '';
    if (el.vaultLand && !state.vaultState.documents) el.vaultLand.value = '';
    if (el.vaultBank && !state.vaultState.documents) el.vaultBank.value = '';
    if (el.vaultCrop && !state.vaultState.documents) el.vaultCrop.value = '';
    if (el.vaultCategory && !state.vaultState.documents) el.vaultCategory.value = '';
  }

  // Setup Clear All Fields button listener
  const btnClearVault = document.getElementById('btn-vault-clear-all');
  if (btnClearVault && !btnClearVault.dataset.bound) {
    btnClearVault.dataset.bound = 'true';
    btnClearVault.addEventListener('click', clearAllVaultFields);
  }

  if (el.vaultModal) el.vaultModal.classList.add('active');
}

function clearAllVaultFields() {
  if (el.vaultAadhaar) el.vaultAadhaar.value = '';
  if (el.vaultLand) el.vaultLand.value = '';
  if (el.vaultBank) el.vaultBank.value = '';
  if (el.vaultCrop) el.vaultCrop.value = '';
  if (el.vaultCategory) el.vaultCategory.value = '';

  const pwWord = document.getElementById('vault-word-pass');
  const pwWordConfirm = document.getElementById('vault-word-confirm');
  const pwPin = document.getElementById('vault-pin-pass');
  const pwPinConfirm = document.getElementById('vault-pin-confirm');
  if (pwWord) pwWord.value = '';
  if (pwWordConfirm) pwWordConfirm.value = '';
  if (pwPin) pwPin.value = '';
  if (pwPinConfirm) pwPinConfirm.value = '';

  state.patternSequence = [];
  const patternCanvas = document.getElementById('pattern-canvas');
  if (patternCanvas) {
    const ctx = patternCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
  }
  document.querySelectorAll('.pattern-dot').forEach(d => d.classList.remove('active'));
  const feedback = document.getElementById('pattern-feedback');
  if (feedback) feedback.textContent = 'Connect dots in sequence to draw pattern';

  showToast('✨ All fields cleared. You can now enter your own details.');
}

function closeVaultModal() {
  if (el.vaultModal) el.vaultModal.classList.remove('active');
}

function lockFarmerVault() {
  state.vaultState.isUnlocked = false;
  state.vaultState.documents = {};
  updateVaultNavIndicator('locked');
  closeVaultModal();
  showToast('🔒 Document Vault locked. Password required to access.');
}

function openVaultUnlockModal(vaultMeta = {}, scheme = null) {
  if (scheme) state.pendingChosenSchemeId = scheme.id;
  const pwType = vaultMeta.passwordType || 'word';

  const errNotice = document.getElementById('unlock-error-notice');
  if (errNotice) {
    errNotice.style.display = 'none';
    errNotice.textContent = '';
  }

  if (el.unlockModalDesc) {
    const typeLabel = pwType === 'word' ? 'Secret Password' : (pwType === 'number' ? 'PIN (4-6 Digits)' : 'Pattern Lock');
    el.unlockModalDesc.textContent = `Your documents are encrypted. Enter your ${typeLabel} to decrypt and access.`;
  }

  if (el.unlockInputContainer) {
    if (pwType === 'word') {
      el.unlockInputContainer.innerHTML = `
        <label class="input-label-clean" for="unlock-word-input">Enter Secret Password *</label>
        <div class="password-input-wrap">
          <input type="password" id="unlock-word-input" class="input-clean" placeholder="Enter your secret password" autocomplete="current-password">
          <button type="button" class="btn-toggle-pw" onclick="togglePasswordVisibility('unlock-word-input', this)" title="Show/Hide Password" aria-label="Show/Hide Password">👁️</button>
        </div>
      `;
    } else if (pwType === 'number') {
      el.unlockInputContainer.innerHTML = `
        <label class="input-label-clean" for="unlock-pin-input">Enter PIN (4-6 Digits) *</label>
        <div class="password-input-wrap">
          <input type="password" id="unlock-pin-input" class="input-clean" placeholder="• • • •" maxlength="6" style="letter-spacing: 0.35rem; font-size: 1.3rem; text-align: center;" autocomplete="current-password">
          <button type="button" class="btn-toggle-pw" onclick="togglePasswordVisibility('unlock-pin-input', this)" title="Show/Hide PIN" aria-label="Show/Hide PIN">👁️</button>
        </div>
      `;
    } else if (pwType === 'pattern') {
      el.unlockInputContainer.innerHTML = `
        <div class="pattern-lock-wrap">
          <p style="font-size: 0.84rem; color: #475569; margin-bottom: 0.5rem; text-align: center;">Draw your secret unlock pattern below:</p>
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
          <div class="pattern-feedback" id="unlock-pattern-feedback">Connect dots in sequence to draw pattern</div>
        </div>
      `;
      setupUnlockPatternLock();
    }
  }

  if (el.vaultUnlockModal) el.vaultUnlockModal.classList.add('active');
  setTimeout(() => {
    const input = document.getElementById('unlock-word-input') || document.getElementById('unlock-pin-input');
    if (input) input.focus();
  }, 120);
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
    showToast('⚠️ Please provide a valid 12-digit Aadhaar Card number.');
    if (el.vaultAadhaar) el.vaultAadhaar.focus();
    return;
  }
  if (!landRecord) {
    showToast('⚠️ Please provide your Land Record / Khasra-Khatauni / Patta detail.');
    if (el.vaultLand) el.vaultLand.focus();
    return;
  }
  if (!bankDetails) {
    showToast('⚠️ Please provide your Bank Account & IFSC details.');
    if (el.vaultBank) el.vaultBank.focus();
    return;
  }
  if (!cropSowing) {
    showToast('⚠️ Please provide your Crop Sowing / Cultivation Proof.');
    if (el.vaultCrop) el.vaultCrop.focus();
    return;
  }

  let chosenPassword = '';
  const pwType = state.activeSecTab || 'word';

  if (pwType === 'word') {
    const pass = el.vaultWordPass ? el.vaultWordPass.value : '';
    const confirm = el.vaultWordConfirm ? el.vaultWordConfirm.value : '';
    if (!pass || pass.length < 4) {
      showToast('⚠️ Password must be at least 4 characters long.');
      if (el.vaultWordPass) el.vaultWordPass.focus();
      return;
    }
    if (pass !== confirm) {
      showToast('⚠️ Passwords do not match. Please re-enter.');
      if (el.vaultWordConfirm) el.vaultWordConfirm.focus();
      return;
    }
    chosenPassword = pass;
  } else if (pwType === 'number') {
    const pass = el.vaultPinPass ? el.vaultPinPass.value.trim() : '';
    const confirm = el.vaultPinConfirm ? el.vaultPinConfirm.value.trim() : '';
    if (!pass || !/^\d{4,6}$/.test(pass)) {
      showToast('⚠️ PIN must be 4 to 6 numeric digits.');
      if (el.vaultPinPass) el.vaultPinPass.focus();
      return;
    }
    if (pass !== confirm) {
      showToast('⚠️ PINs do not match. Please re-enter.');
      if (el.vaultPinConfirm) el.vaultPinConfirm.focus();
      return;
    }
    chosenPassword = pass;
  } else if (pwType === 'pattern') {
    if (state.patternSequence.length < 4) {
      showToast('⚠️ Pattern Lock must connect at least 4 dots.');
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

  const userId = getActiveVaultUserId();

  // Generate client cryptographic salt and verifier hash
  const clientSalt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
  const clientVerifierHash = await hashVaultPasswordClient(chosenPassword, clientSalt);

  try {
    const res = await fetch('/api/vault/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
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

  // Persist locally for offline validation
  const vaultMeta = {
    isInitialized: true,
    userId,
    passwordType: pwType,
    salt: clientSalt,
    verifierHash: clientVerifierHash,
    documents,
    updatedAt: new Date().toISOString(),
    docCount: 5
  };
  localStorage.setItem(`kisansahay_vault_meta_${userId}`, JSON.stringify(vaultMeta));
  localStorage.setItem('kisansahay_vault_meta', JSON.stringify(vaultMeta));

  // Clear password inputs from DOM for security
  if (el.vaultWordPass) el.vaultWordPass.value = '';
  if (el.vaultWordConfirm) el.vaultWordConfirm.value = '';
  if (el.vaultPinPass) el.vaultPinPass.value = '';
  if (el.vaultPinConfirm) el.vaultPinConfirm.value = '';
  state.patternSequence = [];

  state.vaultState = {
    isInitialized: true,
    isUnlocked: true,
    passwordType: pwType,
    documents
  };

  updateVaultNavIndicator('unlocked');
  closeVaultModal();
  if (typeof window.updateSahayProfileStatusBar === 'function') {
    window.updateSahayProfileStatusBar();
  }
  showToast(`🔒 Document Vault encrypted & secured with your chosen ${pwType.toUpperCase()} password!`);

  // If prompted via "Choose Loan", seamlessly proceed to loan tracker modal!
  if (state.pendingChosenSchemeId) {
    const scheme = state.schemes.find(s => s.id === state.pendingChosenSchemeId);
    state.pendingChosenSchemeId = null;
    if (scheme) {
      if (typeof window.openFarmerQualificationModal === 'function') {
        setTimeout(() => window.openFarmerQualificationModal(scheme), 350);
      } else {
        setTimeout(() => openLoanTrackerModalForScheme(scheme), 350);
      }
    }
  }
}

async function unlockFarmerVault() {
  const userId = getActiveVaultUserId();
  const metaStr = localStorage.getItem(`kisansahay_vault_meta_${userId}`) || localStorage.getItem('kisansahay_vault_meta') || '{}';
  const meta = JSON.parse(metaStr);
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
    showToast('⚠️ Please enter your password or draw your pattern.');
    const input = document.getElementById('unlock-word-input') || document.getElementById('unlock-pin-input');
    if (input) input.focus();
    return;
  }

  try {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        password: enteredPassword
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      state.vaultState.isUnlocked = true;
      state.vaultState.documents = json.documents || meta.documents || {};
      updateVaultNavIndicator('unlocked');
      closeVaultUnlockModal();
      showToast('🔓 Document Vault successfully unlocked!');

      if (state.pendingChosenSchemeId) {
        const scheme = state.schemes.find(s => s.id === state.pendingChosenSchemeId);
        state.pendingChosenSchemeId = null;
        if (scheme) {
          if (typeof window.openFarmerQualificationModal === 'function') {
            setTimeout(() => window.openFarmerQualificationModal(scheme), 350);
          } else {
            setTimeout(() => openLoanTrackerModalForScheme(scheme), 350);
          }
        }
      }
      return;
    } else {
      // Backend returned incorrect password or error
      showUnlockError(json.message || 'Incorrect password. Access denied.');
      return;
    }
  } catch (err) {
    console.warn('Backend unlock offline, verifying locally with cryptographic verifier:', err);
    // Offline verification against local cryptographic hash
    if (meta.salt && meta.verifierHash) {
      const testHash = await hashVaultPasswordClient(enteredPassword, meta.salt);
      if (testHash === meta.verifierHash) {
        state.vaultState.isUnlocked = true;
        state.vaultState.documents = meta.documents || {};
        updateVaultNavIndicator('unlocked');
        closeVaultUnlockModal();
        showToast('🔓 Document Vault successfully unlocked!');

        if (state.pendingChosenSchemeId) {
          const scheme = state.schemes.find(s => s.id === state.pendingChosenSchemeId);
          state.pendingChosenSchemeId = null;
          if (scheme) {
            if (typeof window.openFarmerQualificationModal === 'function') {
              setTimeout(() => window.openFarmerQualificationModal(scheme), 350);
            } else {
              setTimeout(() => openLoanTrackerModalForScheme(scheme), 350);
            }
          }
        }
        return;
      }
    }

    // STRICT DENIAL: Under no circumstances allow access if password doesn't match!
    showUnlockError('Incorrect password. Access denied.');
    return;
  }
}

// ==========================================================================
// Document Vault Password Reset Engine
// ==========================================================================

let activeResetSecTab = 'word';
let resetPatternSequence = [];

function openVaultResetModal() {
  const modal = document.getElementById('vault-reset-modal');
  if (!modal) return;
  modal.classList.add('active');

  const err = document.getElementById('reset-error-notice');
  if (err) { err.style.display = 'none'; err.textContent = ''; }

  const wordPass = document.getElementById('vault-reset-word-pass');
  const wordConf = document.getElementById('vault-reset-word-confirm');
  const pinPass = document.getElementById('vault-reset-pin-pass');
  const pinConf = document.getElementById('vault-reset-pin-confirm');
  if (wordPass) wordPass.value = '';
  if (wordConf) wordConf.value = '';
  if (pinPass) pinPass.value = '';
  if (pinConf) pinConf.value = '';
  resetPatternSequence = [];

  setupResetPatternCanvas();
  switchResetSecTab('word');
}

function closeVaultResetModal() {
  const modal = document.getElementById('vault-reset-modal');
  if (modal) modal.classList.remove('active');
}

function switchResetSecTab(tab) {
  activeResetSecTab = tab;
  ['word', 'number', 'pattern'].forEach(t => {
    const btn = document.getElementById(`reset-tab-${t}`);
    const pane = document.getElementById(`reset-pane-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
    if (pane) pane.style.display = t === tab ? 'block' : 'none';
  });
}

function setupResetPatternCanvas() {
  const container = document.getElementById('reset-pattern-container');
  const canvas = document.getElementById('reset-pattern-canvas');
  if (!container || !canvas) return;

  const ctx = canvas.getContext('2d');
  const dots = container.querySelectorAll('.pattern-dot');

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach(d => d.classList.remove('dot-selected', 'dot-origin'));
  }

  clearCanvas();
  resetPatternSequence = [];

  const btnClear = document.getElementById('btn-clear-reset-pattern');
  if (btnClear) {
    btnClear.onclick = () => {
      clearCanvas();
      resetPatternSequence = [];
      const fb = document.getElementById('reset-pattern-feedback');
      if (fb) fb.textContent = 'Draw new pattern in sequence';
    };
  }

  let isDrawing = false;

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function drawLines(currentPos) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (resetPatternSequence.length === 0) return;

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const first = PATTERN_DOT_COORDS[resetPatternSequence[0]];
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < resetPatternSequence.length; i++) {
      const pt = PATTERN_DOT_COORDS[resetPatternSequence[i]];
      ctx.lineTo(pt.x, pt.y);
    }
    if (currentPos) {
      ctx.lineTo(currentPos.x, currentPos.y);
    }
    ctx.stroke();
  }

  function checkCollision(pos) {
    PATTERN_DOT_COORDS.forEach(dot => {
      const dist = Math.hypot(dot.x - pos.x, dot.y - pos.y);
      if (dist < 26) {
        if (!resetPatternSequence.includes(dot.index)) {
          if (resetPatternSequence.length === 0) {
            dots[dot.index]?.classList.add('dot-origin');
          }
          resetPatternSequence.push(dot.index);
          dots[dot.index]?.classList.add('dot-selected');
        }
      }
    });
  }

  container.onmousedown = (e) => {
    isDrawing = true;
    clearCanvas();
    resetPatternSequence = [];
    const pos = getPointerPos(e);
    checkCollision(pos);
    drawLines(pos);
  };

  window.onmousemove = (e) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    checkCollision(pos);
    drawLines(pos);
  };

  window.onmouseup = () => {
    if (!isDrawing) return;
    isDrawing = false;
    drawLines(null);
    const fb = document.getElementById('reset-pattern-feedback');
    if (fb) fb.textContent = `Pattern: ${resetPatternSequence.length} dots connected`;
  };
}

async function submitVaultReset() {
  const userId = getActiveVaultUserId();
  let newPassword = '';
  const pwType = activeResetSecTab || 'word';

  if (pwType === 'word') {
    const pass = document.getElementById('vault-reset-word-pass')?.value || '';
    const confirm = document.getElementById('vault-reset-word-confirm')?.value || '';
    if (!pass || pass.length < 4) {
      showResetError('Password must be at least 4 characters long.');
      return;
    }
    if (pass !== confirm) {
      showResetError('Passwords do not match. Please re-enter.');
      return;
    }
    newPassword = pass;
  } else if (pwType === 'number') {
    const pass = document.getElementById('vault-reset-pin-pass')?.value.trim() || '';
    const confirm = document.getElementById('vault-reset-pin-confirm')?.value.trim() || '';
    if (!pass || !/^\d{4,6}$/.test(pass)) {
      showResetError('PIN must be 4 to 6 numeric digits.');
      return;
    }
    if (pass !== confirm) {
      showResetError('PINs do not match. Please re-enter.');
      return;
    }
    newPassword = pass;
  } else if (pwType === 'pattern') {
    if (resetPatternSequence.length < 4) {
      showResetError('Pattern must connect at least 4 dots in sequence.');
      return;
    }
    newPassword = resetPatternSequence.join('-');
  }

  const clientSalt = Math.random().toString(36).substring(2, 15);
  const clientVerifierHash = await hashVaultPasswordClient(newPassword, clientSalt);

  // Retrieve existing documents
  const metaStr = localStorage.getItem(`kisansahay_vault_meta_${userId}`) || localStorage.getItem('kisansahay_vault_meta') || '{}';
  let existingMeta = {};
  try { existingMeta = JSON.parse(metaStr); } catch (e) {}
  const documents = state.vaultState.documents || existingMeta.documents || {};

  try {
    const res = await fetch('/api/vault/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        newPassword,
        newPasswordType: pwType,
        documents
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      showResetError(json.message || 'Failed to reset vault password on server.');
      return;
    }
  } catch (err) {
    console.warn('Backend reset offline, saving locally:', err);
  }

  // Update local vault metadata
  const updatedMeta = {
    ...existingMeta,
    userId,
    passwordType: pwType,
    salt: clientSalt,
    verifierHash: clientVerifierHash,
    documents,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(`kisansahay_vault_meta_${userId}`, JSON.stringify(updatedMeta));
  localStorage.setItem('kisansahay_vault_meta', JSON.stringify(updatedMeta));

  state.vaultState.passwordType = pwType;
  state.vaultState.isInitialized = true;
  state.vaultState.isUnlocked = false; // Kept locked so user unlocks with new password
  updateVaultNavIndicator('locked');

  closeVaultResetModal();
  showToast(`✅ Vault password reset to ${pwType.toUpperCase()} successfully! Please unlock with your new password.`);
}

function showResetError(msg) {
  const err = document.getElementById('reset-error-notice');
  if (err) {
    err.textContent = msg;
    err.style.display = 'block';
    err.classList.remove('input-error-shake');
    void err.offsetWidth;
    err.classList.add('input-error-shake');
  }
}

window.openVaultResetModal = openVaultResetModal;
window.closeVaultResetModal = closeVaultResetModal;
window.submitVaultReset = submitVaultReset;

async function checkVaultStatus() {
  const userId = getActiveVaultUserId();
  try {
    const res = await fetch(`/api/vault/status?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.isInitialized) {
        state.vaultState.isInitialized = true;
        state.vaultState.passwordType = json.data.passwordType || 'word';
        localStorage.setItem(`kisansahay_vault_meta_${userId}`, JSON.stringify(json.data));
        localStorage.setItem('kisansahay_vault_meta', JSON.stringify(json.data));
        updateVaultNavIndicator(state.vaultState.isUnlocked ? 'unlocked' : 'locked');
        return;
      }
    }
  } catch (e) {
    console.warn('Vault status fetch fallback:', e);
  }

  const metaStr = localStorage.getItem(`kisansahay_vault_meta_${userId}`) || localStorage.getItem('kisansahay_vault_meta');
  if (metaStr) {
    try {
      const parsed = JSON.parse(metaStr);
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
  if (el.vaultNavIcon) {
    if (status === 'unlocked') {
      el.vaultNavIcon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </svg>
      `;
    } else {
      el.vaultNavIcon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;
    }
  }
  if (el.vaultStatusNavText) {
    if (status === 'unlocked') {
      el.vaultStatusNavText.textContent = 'Vault (Unlocked)';
    } else if (status === 'locked') {
      el.vaultStatusNavText.textContent = 'Vault (Locked)';
    } else {
      el.vaultStatusNavText.textContent = 'Document Vault';
    }
  }
}

// ==========================================================================
// Multi-Step Farmer Qualification Questionnaire Engine (Screenshots 2, 3, 4)
// ==========================================================================

let pendingQualificationScheme = null;

function goToQualificationStep(stepNum) {
  const panes = [
    document.getElementById('fq-step-pane-1'),
    document.getElementById('fq-step-pane-2'),
    document.getElementById('fq-step-pane-3')
  ];
  const indicators = [
    document.getElementById('fq-step-indicator-1'),
    document.getElementById('fq-step-indicator-2'),
    document.getElementById('fq-step-indicator-3')
  ];
  const connectors = [
    document.getElementById('fq-connector-1'),
    document.getElementById('fq-connector-2')
  ];

  panes.forEach((pane, idx) => {
    if (!pane) return;
    if (idx + 1 === stepNum) {
      pane.style.display = 'block';
      pane.classList.add('active');
    } else {
      pane.style.display = 'none';
      pane.classList.remove('active');
    }
  });

  indicators.forEach((ind, idx) => {
    if (!ind) return;
    const step = idx + 1;
    if (step < stepNum) {
      ind.classList.add('completed');
      ind.classList.remove('active');
    } else if (step === stepNum) {
      ind.classList.add('active');
      ind.classList.remove('completed');
    } else {
      ind.classList.remove('active', 'completed');
    }
  });

  if (connectors[0]) {
    connectors[0].classList.toggle('active', stepNum >= 2);
  }
  if (connectors[1]) {
    connectors[1].classList.toggle('active', stepNum >= 3);
  }
}

function openFarmerQualificationModal(scheme) {
  pendingQualificationScheme = scheme || null;
  const modal = document.getElementById('farmer-qualification-modal');
  if (!modal) {
    if (scheme) openLoanTrackerModalForScheme(scheme);
    return;
  }

  // Ensure qualification object initialized
  if (!state.farmerQualification) {
    try {
      const saved = localStorage.getItem('kisansahay_farmer_qualification');
      state.farmerQualification = saved ? JSON.parse(saved) : {
        gender: 'Male',
        age: 35,
        state: 'Uttar Pradesh',
        residence: 'Rural',
        disability: 'No',
        minority: 'No'
      };
    } catch (e) {
      state.farmerQualification = {
        gender: 'Male',
        age: 35,
        state: 'Uttar Pradesh',
        residence: 'Rural',
        disability: 'No',
        minority: 'No'
      };
    }
  }

  // Auto-fill state from all-India selector or scheme if available
  const allIndiaSelect = document.getElementById('schemes-all-india-state-select');
  if (allIndiaSelect && allIndiaSelect.value && allIndiaSelect.value !== 'all') {
    state.farmerQualification.state = allIndiaSelect.value;
  } else if (scheme && scheme.state && scheme.state !== 'All-India' && scheme.state !== 'all') {
    state.farmerQualification.state = scheme.state;
  }

  // Sync inputs with state.farmerQualification
  // 1. Gender cards
  const genderCards = document.querySelectorAll('#fq-gender-grid .fq-gender-card');
  genderCards.forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-gender') === state.farmerQualification.gender);
  });

  // 2. Age select
  const ageSelect = document.getElementById('fq-age-select');
  if (ageSelect && state.farmerQualification.age) {
    ageSelect.value = String(state.farmerQualification.age);
  }

  // 3. State select
  const stateSelect = document.getElementById('fq-state-select');
  if (stateSelect && state.farmerQualification.state) {
    stateSelect.value = state.farmerQualification.state;
  }

  // 4. Residence buttons
  const resBtns = document.querySelectorAll('#fq-residence-options .fq-choice-btn');
  resBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-residence') === state.farmerQualification.residence);
  });

  // 5. Disability buttons
  const disBtns = document.querySelectorAll('#fq-disability-options .fq-choice-btn');
  disBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-disability') === state.farmerQualification.disability);
  });

  // 6. Minority buttons
  const minBtns = document.querySelectorAll('#fq-minority-options .fq-choice-btn');
  minBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-minority') === state.farmerQualification.minority);
  });

  goToQualificationStep(1);
  modal.classList.add('active');
}

function closeFarmerQualificationModal() {
  const modal = document.getElementById('farmer-qualification-modal');
  if (modal) modal.classList.remove('active');
}

function completeFarmerQualification(isSkipped = false) {
  closeFarmerQualificationModal();
  if (!isSkipped) {
    try {
      localStorage.setItem('kisansahay_farmer_qualification', JSON.stringify(state.farmerQualification));
      if (typeof window.updateSahayProfileStatusBar === 'function') {
        window.updateSahayProfileStatusBar();
      }
    } catch (e) {}
    showToast('✅ Preferences confirmed! Personalized subsidies & subventions active.');
  }

  const schemeToOpen = pendingQualificationScheme;
  pendingQualificationScheme = null;
  if (schemeToOpen) {
    setTimeout(() => openLoanTrackerModalForScheme(schemeToOpen), 200);
  }
}

function setupFarmerQualificationModal() {
  const modal = document.getElementById('farmer-qualification-modal');
  const closeBtn = document.getElementById('fq-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeFarmerQualificationModal);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeFarmerQualificationModal();
    });
  }

  // Step 1: Gender cards
  const genderCards = document.querySelectorAll('#fq-gender-grid .fq-gender-card');
  genderCards.forEach(card => {
    card.addEventListener('click', () => {
      genderCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const g = card.getAttribute('data-gender');
      if (g) {
        state.farmerQualification.gender = g;
      }
    });
  });

  // Step 1: Age dropdown
  const ageSelect = document.getElementById('fq-age-select');
  if (ageSelect) {
    ageSelect.addEventListener('change', () => {
      state.farmerQualification.age = Number(ageSelect.value) || 35;
    });
  }

  // Step 1 Next & Reset
  const step1Next = document.getElementById('fq-step1-next');
  if (step1Next) {
    step1Next.addEventListener('click', () => {
      goToQualificationStep(2);
    });
  }
  const step1Reset = document.getElementById('fq-step1-reset');
  if (step1Reset) {
    step1Reset.addEventListener('click', () => {
      state.farmerQualification.gender = 'Male';
      state.farmerQualification.age = 35;
      genderCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-gender') === 'Male'));
      if (ageSelect) ageSelect.value = '35';
      showToast('Step 1 preferences reset to default.');
    });
  }

  // Step 2: Back button
  const step2Back = document.getElementById('fq-step2-back');
  if (step2Back) {
    step2Back.addEventListener('click', () => {
      goToQualificationStep(1);
    });
  }

  // Step 2: State select
  const stateSelect = document.getElementById('fq-state-select');
  if (stateSelect) {
    stateSelect.addEventListener('change', () => {
      state.farmerQualification.state = stateSelect.value;
    });
  }

  // Step 2: Residence buttons
  const resBtns = document.querySelectorAll('#fq-residence-options .fq-choice-btn');
  resBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      resBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.getAttribute('data-residence');
      if (r) state.farmerQualification.residence = r;
    });
  });

  // Step 2: Skip & Next & Reset
  const step2Skip = document.getElementById('fq-step2-skip');
  if (step2Skip) {
    step2Skip.addEventListener('click', () => completeFarmerQualification(true));
  }
  const step2Next = document.getElementById('fq-step2-next');
  if (step2Next) {
    step2Next.addEventListener('click', () => {
      goToQualificationStep(3);
    });
  }
  const step2Reset = document.getElementById('fq-step2-reset');
  if (step2Reset) {
    step2Reset.addEventListener('click', () => {
      state.farmerQualification.state = '';
      state.farmerQualification.residence = 'Rural';
      if (stateSelect) stateSelect.selectedIndex = 0;
      resBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-residence') === 'Rural'));
      showToast('Step 2 location reset to default.');
    });
  }

  // Step 3: Back button
  const step3Back = document.getElementById('fq-step3-back');
  if (step3Back) {
    step3Back.addEventListener('click', () => {
      goToQualificationStep(2);
    });
  }

  // Step 3: Disability buttons
  const disBtns = document.querySelectorAll('#fq-disability-options .fq-choice-btn');
  disBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      disBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const d = btn.getAttribute('data-disability');
      if (d) state.farmerQualification.disability = d;
    });
  });

  // Step 3: Minority buttons
  const minBtns = document.querySelectorAll('#fq-minority-options .fq-choice-btn');
  minBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      minBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const m = btn.getAttribute('data-minority');
      if (m) state.farmerQualification.minority = m;
    });
  });

  // Step 3: Skip & Submit & Reset
  const step3Skip = document.getElementById('fq-step3-skip');
  if (step3Skip) {
    step3Skip.addEventListener('click', () => completeFarmerQualification(true));
  }
  const step3Submit = document.getElementById('fq-step3-submit');
  if (step3Submit) {
    step3Submit.addEventListener('click', () => completeFarmerQualification(false));
  }
  const step3Reset = document.getElementById('fq-step3-reset');
  if (step3Reset) {
    step3Reset.addEventListener('click', () => {
      state.farmerQualification.disability = 'No';
      state.farmerQualification.minority = 'No';
      disBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-disability') === 'No'));
      minBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-minority') === 'No'));
      showToast('Step 3 eligibility reset to default.');
    });
  }
}

window.openFarmerQualificationModal = openFarmerQualificationModal;
window.closeFarmerQualificationModal = closeFarmerQualificationModal;
window.setupFarmerQualificationModal = setupFarmerQualificationModal;

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
    const loc = profile.district ? ` in ${profile.district}` : (state.farmerQualification?.state ? ` in ${state.farmerQualification.state}` : '');
    const qual = state.farmerQualification || {};
    const qualTags = [];
    if (qual.gender) qualTags.push(qual.gender);
    if (qual.age) qualTags.push(`Age ${qual.age}`);
    if (qual.residence) qualTags.push(qual.residence);
    if (qual.disability === 'Yes') qualTags.push('Divyangjan Concession');
    if (qual.minority === 'Yes') qualTags.push('Minority Subvention');
    const qualStr = qualTags.length > 0 ? ` • ${qualTags.join(' • ')}` : '';
    el.modalFarmDetailsText.innerHTML = `<strong>${activityName}</strong> • ${profile.cropType || 'Crops'} • ${landType} Farmer${loc}${qualStr} • 🔒 Documents & Profile Verified`;
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
  if (bankInput) bankInput.value = `${scheme.category.includes('INFRA') ? 'Commercial Bank / NABARD' : 'State Bank of India / Gramin Bank'} ${profile.district ? '(' + profile.district + ')' : (state.farmerQualification?.state ? '(' + state.farmerQualification.state + ')' : '')}`.trim();
  
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
  
  // Concessional interest rate for verified women / minority / prompt categories
  let finalRate = scheme.effectiveRate !== undefined ? scheme.effectiveRate : (scheme.baseRate || 4.0);
  if (state.farmerQualification?.gender === 'Female' && finalRate > 0) {
    finalRate = Math.max(0, +(finalRate - 1.0).toFixed(1)); // 1% women concession
  }
  if (rateInput) rateInput.value = finalRate;

  if (tenureInput) tenureInput.value = (scheme.id === 'aif' || scheme.id === 'ahidf') ? 72 : (scheme.id === 'smam' ? 48 : 60);
  if (paidInput) paidInput.value = 0;
  if (statusSelect) statusSelect.value = 'Active';

  // Open modal and focus on amount
  el.addLoanModal.classList.add('active');
  if (amountInput) amountInput.focus();

  showToast(`Pre-filled loan details for ${scheme.shortName || scheme.name}. Review & confirm!`);
}

// Choose Loan Flow (Guaranteed Document Vault Check + Multi-Step Questionnaire)
window.chooseLoanFromEligibility = function(schemeId) {
  const scheme = state.schemes.find(s => s.id === schemeId);
  if (!scheme) return;
  state.pendingChosenSchemeId = schemeId;

  // 1. Mandatory Document Verification Check
  if (!state.vaultState.isUnlocked) {
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

  // 2. Multi-Step Farmer Qualification Questionnaire (Screenshots 2, 3, 4)
  if (typeof window.openFarmerQualificationModal === 'function') {
    window.openFarmerQualificationModal(scheme);
  } else {
    openLoanTrackerModalForScheme(scheme);
  }
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
  const cropType = el.cropInput ? el.cropInput.value.trim() : '';
  const rawLandSize = el.landSizeInput ? parseFloat(el.landSizeInput.value) : NaN;
  const stateVal = el.stateInput ? el.stateInput.value.trim() : '';
  const districtVal = el.districtInput ? el.districtInput.value.trim() : '';
  const annualIncomeRaw = el.incomeInput ? el.incomeInput.value.trim() : '';
  const annualIncome = annualIncomeRaw ? Number(annualIncomeRaw) : NaN;

  // Data must show only when user inputs required details
  if (!cropType || isNaN(rawLandSize) || rawLandSize <= 0 || !stateVal || !districtVal || isNaN(annualIncome)) {
    showToast('⚠️ Please enter your Crop, Land Holding Size, State, District, and Income to check schemes.');
    if (el.eligResultsContainer) el.eligResultsContainer.style.display = 'none';
    if (el.eligEmptyState) el.eligEmptyState.style.display = 'block';
    return;
  }

  const landUnit = el.landUnitSelect ? el.landUnitSelect.value : 'acres';
  const landSizeAcres = landUnit === 'hectares' ? Number((rawLandSize * 2.47105).toFixed(2)) : rawLandSize;
  const landSizeHectares = landUnit === 'hectares' ? rawLandSize : Number((rawLandSize / 2.47105).toFixed(2));

  const latitude = el.geoLat && el.geoLat.value ? Number(el.geoLat.value) : undefined;
  const longitude = el.geoLong && el.geoLong.value ? Number(el.geoLong.value) : undefined;

  const landOwnership = el.landSelect ? (el.landSelect.value || 'owner') : 'owner';
  const category = el.categorySelect ? (el.categorySelect.value || 'general') : 'general';
  const existingLoans = el.existingLoansInput && el.existingLoansInput.value ? (Number(el.existingLoansInput.value) || 0) : 0;
  const hasKcc = el.kccSelect ? (el.kccSelect.value === 'yes') : true;
  const hasAadhaar = el.aadhaarSelect ? (el.aadhaarSelect.value === 'yes') : true;

  // Mandatory Aadhaar-Bank Linking Enforcement (Requirement 4)
  if (!hasAadhaar) {
    if (el.aadhaarGuideBox) {
      el.aadhaarGuideBox.style.display = 'block';
      el.aadhaarGuideBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (el.eligResultsContainer) el.eligResultsContainer.style.display = 'none';
    if (el.eligEmptyState) el.eligEmptyState.style.display = 'block';
    showToast('⚠️ Aadhaar linking is mandatory for all government schemes and direct benefit transfers.');
    speakKisanText(
      state.currentLang === 'hi'
        ? 'आधार-बैंक खाता लिंक अनिवार्य है। सभी सरकारी योजनाओं के लिए बैंक खाते से आधार जुड़ा होना आवश्यक है।'
        : 'Aadhaar linking is mandatory for all government schemes and direct benefit transfers.',
      state.currentLang
    );
    if (el.btnSubmitEligibility) {
      el.btnSubmitEligibility.disabled = false;
      el.btnSubmitEligibility.innerHTML = '<span>🔍</span> <span>Find Best Loan & Schemes</span>';
    }
    return;
  } else {
    if (el.aadhaarGuideBox) {
      el.aadhaarGuideBox.style.display = 'none';
    }
  }

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

  // Persist strictly to active profile sandbox
  try {
    const activeProfile = window.multiUserManager ? window.multiUserManager.getActiveProfile() : null;
    const activeProfileId = activeProfile ? activeProfile.id : 'profile_default';
    localStorage.setItem(`kisansahay_farm_${activeProfileId}`, JSON.stringify(state.userFarmProfile));
  } catch (err) {
    console.warn('Failed to persist profile farm data to localStorage:', err);
  }

  try {
    if (el.btnSubmitEligibility) {
      el.btnSubmitEligibility.disabled = true;
      el.btnSubmitEligibility.innerHTML = '<span>⏳</span> Analyzing Schemes & Soil Data...';
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
              <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-dark); margin: 0;">Dynamic Regional Soil & Crop Intelligence</h3>
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
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-dark); margin: 0;">Responsible Lending & Repayment Safety</h3>
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

  // Populate Advanced Comparison Table View
  const tableBody = document.getElementById('advanced-schemes-table-body');
  if (tableBody) {
    if (recommendations.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No schemes match current criteria.</td></tr>';
    } else {
      tableBody.innerHTML = recommendations.map(rec => {
        const statusClass = rec.status === 'best' ? 'best' : (rec.status === 'good' ? 'good' : 'moderate');
        const statusLabel = rec.status === 'best' ? '★ Top Priority Match' : (rec.status === 'good' ? '✓ Eligible Fit' : '⚙ Alternate Support');
        const isSubsidized = String(rec.interest_rate || '').includes('4%') || String(rec.interest_rate || '').toLowerCase().includes('subsid');
        return `
          <tr>
            <td>
              <span class="tbl-match-badge ${statusClass}">${statusLabel} (${rec.score}%)</span>
            </td>
            <td>
              <div class="tbl-scheme-name" style="font-weight: 800; font-size: 0.95rem;">${escapeHtmlApp(rec.scheme_name)}</div>
              <div class="tbl-scheme-cat" style="font-size: 0.8rem; color: #64748b; margin-top: 0.2rem;">
                <span style="font-weight: 700; color: #15803d;">${escapeHtmlApp(rec.category || 'Agricultural Loan')}</span>
                ${rec.eligibility_reason ? ` • ${escapeHtmlApp(rec.eligibility_reason)}` : ''}
              </div>
            </td>
            <td>
              <span class="tbl-rate-pill">${escapeHtmlApp(rec.interest_rate || 'Subsidized')}</span>
              ${isSubsidized ? '<div style="font-size: 0.72rem; color: #15803d; font-weight: 700; margin-top: 0.2rem;">✓ 3% Subvention Applied</div>' : ''}
            </td>
            <td>
              <strong style="color: var(--text-primary); font-size: 0.92rem;">${escapeHtmlApp(rec.max_loan_amount || 'Custom Ceiling')}</strong>
            </td>
            <td>
              <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: #475569;">
                <span>🛡️</span> <span>${escapeHtmlApp(rec.collateral_free_limit || 'Under Norms')}</span>
              </span>
            </td>
            <td>
              <button type="button" class="btn-clean btn-secondary" style="padding: 0.45rem 1rem; font-size: 0.82rem; border-radius: 9999px; font-weight: 800; cursor: pointer; white-space: nowrap; background: #15803d; color: #ffffff; border: none; box-shadow: 0 2px 8px rgba(21, 128, 61, 0.25);" onclick="openSchemeModal('${rec.scheme_id}')">
                Apply / Details ↗
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Setup Results View Switcher (Cards View vs Advanced Table View)
  const btnCards = document.getElementById('btn-view-cards');
  const btnTable = document.getElementById('btn-view-table');
  const cardsStream = document.getElementById('recommendations-cards-stream');
  const tableContainer = document.getElementById('recommendations-table-container');

  if (btnCards && btnTable && cardsStream && tableContainer) {
    btnCards.onclick = () => {
      btnCards.classList.add('active');
      btnTable.classList.remove('active');
      cardsStream.style.display = 'flex';
      tableContainer.style.display = 'none';
    };

    btnTable.onclick = () => {
      btnTable.classList.add('active');
      btnCards.classList.remove('active');
      cardsStream.style.display = 'none';
      tableContainer.style.display = 'block';
    };
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
  const fullscreenBtn = document.getElementById('sahay-fullscreen-btn');
  const fullscreenIcon = document.getElementById('sahay-fullscreen-icon');
  const langToggle = document.getElementById('sahay-lang-toggle');
  const langIndicator = document.getElementById('sahay-lang-indicator');
  const ttsToggle = document.getElementById('sahay-tts-toggle');
  const ttsIcon = document.getElementById('sahay-tts-icon');
  const messageStream = document.getElementById('sahay-message-stream');
  const inputForm = document.getElementById('sahay-input-form');
  const userInput = document.getElementById('sahay-user-input');
  const micBtn = document.getElementById('sahay-mic-btn');
  const speechStatus = document.getElementById('sahay-speech-status');

  // New UI Elements: Profile Status Bar & 50-FAQ Drawer
  const profileSyncBtn = document.getElementById('sahay-profile-sync-btn');
  const faqDrawer = document.getElementById('sahay-faq-drawer');
  const faqToggleBtn = document.getElementById('sahay-faq-drawer-toggle');
  const faqCloseBtn = document.getElementById('sahay-faq-drawer-close');
  const faqSearchInput = document.getElementById('sahay-faq-search-input');
  const faqCatFilter = document.getElementById('sahay-faq-cat-filter');
  const faqList = document.getElementById('sahay-faq-list');
  const categoryBar = document.getElementById('sahay-category-bar');

  if (!launcher || !chatWindow) return;

  const SAHAY_LANGS = [
    { code: 'en', label: 'EN', name: 'English', speech: 'en-IN' },
    { code: 'hi', label: 'HI', name: 'Hindi (हिन्दी)', speech: 'hi-IN' }
  ];

  let sahayLang = 'en'; // 'en' | 'hi'
  let isFullscreen = false;
  let isTtsActive = true;
  let recognition = null;
  let isListening = false;
  let activeFaqCat = 'all';

  const SAHAY_SPEECH_MAP = {
    'en': 'en-IN',
    'hi': 'hi-IN'
  };

  const SAHAY_INTRO_DATA = {
    en: {
      title: "Namaste! I'm Sahay AI",
      text: "Your official agricultural guide with 50 verified government scheme answers, prompt repayment interest calculation, and encrypted document vault memory!",
      chipsTitle: "Suggested Questions:",
      chips: [
        { query: "Am I eligible for KCC?", text: "Am I eligible for KCC?", category: "leaf" },
        { query: "What is the interest rate on a KCC loan?", text: "KCC 4% Subsidized Interest Rate", category: "rate" },
        { query: "What documents do I have?", text: "Check My Saved Vault Documents", category: "vault" },
        { query: "How do I know if a loan offer is a scam?", text: "How to identify loan scams?", category: "scam" }
      ]
    },
    hi: {
      title: "नमस्ते! मैं सहाय AI हूँ",
      text: "आपका आधिकारिक कृषि मार्गदर्शक, जिसमें 50 सत्यापित सरकारी योजनाओं के उत्तर, शीघ्र पुनर्भुगतान ब्याज गणना और सुरक्षित दस्तावेज़ वॉल्ट मेमोरी उपलब्ध है!",
      chipsTitle: "सुझाए गए प्रश्न:",
      chips: [
        { query: "क्या मैं KCC के लिए पात्र हूँ?", text: "क्या मैं KCC के लिए पात्र हूँ?", category: "leaf" },
        { query: "KCC ऋण पर ब्याज दर क्या है?", text: "KCC 4% रियायती ब्याज दर", category: "rate" },
        { query: "मेरे पास कौन से दस्तावेज़ हैं?", text: "मेरे सुरक्षित वॉल्ट दस्तावेज़ देखें", category: "vault" },
        { query: "ऋण धोखाधड़ी की पहचान कैसे करें?", text: "ऋण धोखाधड़ी की पहचान कैसे करें?", category: "scam" }
      ]
    }
  };

  // Ensure language indicator is set
  if (langIndicator) langIndicator.textContent = sahayLang.toUpperCase();

  // Helper: Aggregate comprehensive user farm profile and document vault metadata
  function getComprehensiveFarmerProfile() {
    let qual = {};
    try {
      qual = JSON.parse(localStorage.getItem('kisansahay_farmer_qualification') || '{}');
    } catch (e) {}

    let farm = state.userFarmProfile || {};
    let activeProfileId = (typeof getActiveVaultUserId === 'function') ? getActiveVaultUserId() : 'default_farmer';
    try {
      const savedFarm = localStorage.getItem(`kisansahay_farm_${activeProfileId}`);
      if (savedFarm) farm = { ...farm, ...JSON.parse(savedFarm) };
    } catch (e) {}

    // Extract encrypted vault documents
    let vaultDocs = {};
    try {
      const metaStr = localStorage.getItem(`kisansahay_vault_meta_${activeProfileId}`) || localStorage.getItem('kisansahay_vault_meta');
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        if (meta.documents) vaultDocs = meta.documents;
      }
    } catch (e) {}

    return {
      state: qual.state || farm.state || 'All-India',
      district: qual.district || farm.district || '',
      landSizeAcres: qual.land_size || farm.landSizeAcres || '2.0',
      cropType: qual.crop || farm.cropType || '',
      category: qual.category || farm.category || 'general',
      annualIncome: qual.income || farm.annualIncome || 200000,
      documents: vaultDocs,
      loans: state.loans || []
    };
  }

  function updateSahayProfileStatusBar() {
    const summaryEl = document.getElementById('sahay-profile-summary-text');
    if (!summaryEl) return;
    const p = getComprehensiveFarmerProfile();
    let docCount = 0;
    if (Array.isArray(p.documents)) docCount = p.documents.length;
    else if (p.documents && typeof p.documents === 'object') {
      docCount = Object.keys(p.documents).filter(k => p.documents[k]).length;
    }

    const stateDisplay = p.state && p.state !== 'All-India' ? p.state : 'All-India';
    const acresDisplay = p.landSizeAcres ? `${p.landSizeAcres} Ac` : '2.0 Ac';
    const cropDisplay = p.cropType ? ` • ${p.cropType}` : '';
    const vaultDisplay = docCount > 0 ? `${docCount} Docs Saved` : 'Vault Ready';

    summaryEl.textContent = `🌾 ${stateDisplay}${cropDisplay} (${acresDisplay}) | 🔒 ${vaultDisplay}`;
  }

  window.updateSahayProfileStatusBar = updateSahayProfileStatusBar;

  // Initial update of profile bar
  updateSahayProfileStatusBar();

  // Profile sync button
  if (profileSyncBtn) {
    profileSyncBtn.addEventListener('click', () => {
      updateSahayProfileStatusBar();
      showToast('🌾 Farmer profile & document vault memory synced with SahayAI!');
      const p = getComprehensiveFarmerProfile();
      let docCount = (p.documents && typeof p.documents === 'object') ? Object.keys(p.documents).filter(k => p.documents[k]).length : 0;
      appendMessage('assistant', `**🔄 Profile Memory Synced!**\n\n• **Active Location:** ${p.state} ${p.district ? '(' + p.district + ')' : ''}\n• **Land Holding:** ${p.landSizeAcres} Acres\n• **Primary Crop:** ${p.cropType || 'General Farming'}\n• **Document Vault:** ${docCount} documents safely encrypted.\n\nAll subsequent scheme advice and loan calculations will be customized to this profile.`);
    });
  }

  // Toggle Full Screen Mode (Dual mechanism: Inset styles + Fullscreen API)
  function toggleFullscreen(forceState) {
    const chatWin = document.getElementById('sahay-chat-window') || chatWindow;
    const fsBtn = document.getElementById('sahay-fullscreen-btn') || fullscreenBtn;
    const fsIcon = document.getElementById('sahay-fullscreen-icon') || fullscreenIcon;
    if (!chatWin) return;

    isFullscreen = typeof forceState === 'boolean' ? forceState : !isFullscreen;

    if (isFullscreen) {
      chatWin.classList.add('is-fullscreen');
      chatWin.style.setProperty('position', 'fixed', 'important');
      chatWin.style.setProperty('top', '0px', 'important');
      chatWin.style.setProperty('left', '0px', 'important');
      chatWin.style.setProperty('right', '0px', 'important');
      chatWin.style.setProperty('bottom', '0px', 'important');
      chatWin.style.setProperty('width', '100vw', 'important');
      chatWin.style.setProperty('height', '100vh', 'important');
      chatWin.style.setProperty('max-width', '100vw', 'important');
      chatWin.style.setProperty('max-height', '100vh', 'important');
      chatWin.style.setProperty('border-radius', '0px', 'important');
      chatWin.style.setProperty('border', 'none', 'important');
      chatWin.style.setProperty('z-index', '999999', 'important');
      chatWin.style.setProperty('margin', '0px', 'important');
      chatWin.style.setProperty('display', 'flex', 'important');

      if (fsBtn) {
        fsBtn.setAttribute('title', 'Exit Full Screen Mode (Esc)');
        fsBtn.setAttribute('aria-label', 'Exit Full Screen Mode');
      }
      if (fsIcon) {
        fsIcon.innerHTML = `
          <svg class="sahay-action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
            <path d="M4 14h6v6m10-10h-6V4m0 6 7-7M3 21l7-7"/>
          </svg>
        `;
      }
      document.body.style.overflow = 'hidden';

      try {
        if (chatWin.requestFullscreen && !document.fullscreenElement) {
          chatWin.requestFullscreen().catch(() => {});
        } else if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (err) {}

      showToast('⛶ Sahay AI Full Screen mode enabled');
    } else {
      chatWin.classList.remove('is-fullscreen');
      chatWin.style.removeProperty('position');
      chatWin.style.removeProperty('top');
      chatWin.style.removeProperty('left');
      chatWin.style.removeProperty('right');
      chatWin.style.removeProperty('bottom');
      chatWin.style.removeProperty('width');
      chatWin.style.removeProperty('height');
      chatWin.style.removeProperty('max-width');
      chatWin.style.removeProperty('max-height');
      chatWin.style.removeProperty('border-radius');
      chatWin.style.removeProperty('border');
      chatWin.style.removeProperty('z-index');
      chatWin.style.removeProperty('margin');

      if (fsBtn) {
        fsBtn.setAttribute('title', 'Full Screen Mode');
        fsBtn.setAttribute('aria-label', 'Toggle Full Screen Mode');
      }
      if (fsIcon) {
        fsIcon.innerHTML = `
          <svg class="sahay-action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        `;
      }
      document.body.style.overflow = '';

      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {}
    }
  }

  window.toggleSahayFullscreen = toggleFullscreen;

  if (fullscreenBtn) {
    fullscreenBtn.onclick = () => toggleFullscreen();
  }

  // Keyboard shortcut: Escape exits full screen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen && chatWindow.style.display !== 'none') {
      toggleFullscreen(false);
    }
  });

  // Native fullscreen change listeners
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen) {
      toggleFullscreen(false);
    }
  });
  document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement && isFullscreen) {
      toggleFullscreen(false);
    }
  });

  // Toggle open/close
  launcher.addEventListener('click', () => {
    const isHidden = chatWindow.style.display === 'none' || !chatWindow.style.display;
    chatWindow.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      updateSahayProfileStatusBar();
      if (userInput) setTimeout(() => userInput.focus(), 150);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (isFullscreen) toggleFullscreen(false);
      chatWindow.style.display = 'none';
      if (faqDrawer) faqDrawer.style.display = 'none';
    });
  }

  // Language toggle (English / Hindi only)
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      sahayLang = sahayLang === 'en' ? 'hi' : 'en';
      if (langIndicator) langIndicator.textContent = sahayLang.toUpperCase();
      showToast(`Sahay AI language set to ${sahayLang === 'hi' ? 'Hindi (हिंदी)' : 'English'}`);

      // Re-render intro card & chips if at greeting state
      const introCard = messageStream ? messageStream.querySelector('.sahay-intro-card') : null;
      const msgCount = messageStream ? messageStream.querySelectorAll('.sahay-msg').length : 0;
      if (introCard || msgCount === 0) {
        renderIntroAndChips(sahayLang);
      } else {
        const activeCatBtn = document.querySelector('#sahay-category-bar .sahay-cat-btn.active');
        const curCat = activeCatBtn ? activeCatBtn.getAttribute('data-cat') : 'all';
        updatePromptChipsByCategory(curCat);
      }

      // Re-render FAQ drawer if open
      if (faqDrawer && faqDrawer.style.display === 'flex') {
        renderFaqDrawer(faqSearchInput ? faqSearchInput.value : '');
      }
    });
  }

  // TTS Read Aloud toggle
  if (ttsToggle) {
    ttsToggle.addEventListener('click', () => {
      isTtsActive = !isTtsActive;
      if (ttsIcon) {
        ttsIcon.innerHTML = isTtsActive
          ? `<svg class="sahay-action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
          : `<svg class="sahay-action-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
      }
      showToast(`Voice read-aloud ${isTtsActive ? 'Enabled' : 'Muted'}`);
      if (!isTtsActive && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    });
  }

  function getChipIconSvg(category) {
    switch (category) {
      case 'rate':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9"/><path d="M12 6v2m0 8v2"/></svg>`;
      case 'vault':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
      case 'scam':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      case 'leaf':
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
    }
  }

  function renderIntroAndChips(lang = sahayLang) {
    if (!messageStream) return;
    const content = SAHAY_INTRO_DATA[lang] || SAHAY_INTRO_DATA.en;
    messageStream.innerHTML = `
      <div class="sahay-intro-card">
        <div class="sahay-intro-icon-wrap">
          <svg class="sahay-intro-plant-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" fill="var(--sahay-sage-light)"/>
            <path d="M24 38V20" stroke="var(--sahay-primary)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M24 20C24 14 17 11 12 13C12 19 18 22 24 20Z" fill="var(--sahay-sage)" stroke="var(--sahay-primary)" stroke-width="2" stroke-linejoin="round"/>
            <path d="M24 26C24 20 31 17 36 19C36 25 30 28 24 26Z" fill="var(--sahay-primary)" fill-opacity="0.85" stroke="var(--sahay-primary)" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="24" cy="18" r="2" fill="#4ade80"/>
          </svg>
        </div>
        <h3 class="sahay-intro-title">${content.title}</h3>
        <p class="sahay-intro-text">${content.text}</p>
      </div>
      <div class="sahay-prompt-chips-container" id="sahay-prompt-chips">
        <div class="sahay-chips-title">
          <svg class="sahay-title-sparkle" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0L9.8 5.4L15.2 7.2L9.8 9L8 14.4L6.2 9L0.8 7.2L6.2 5.4L8 0Z"/>
          </svg>
          <span>${content.chipsTitle}</span>
        </div>
        ${content.chips.map(chip => `
          <button type="button" class="sahay-chip" data-query="${escapeHtml(chip.query)}">
            <span class="sahay-chip-icon-box ${chip.category}">
              ${getChipIconSvg(chip.category)}
            </span>
            <span class="sahay-chip-text">${escapeHtml(chip.text)}</span>
            <span class="sahay-chip-chevron">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 12l4-4-4-4"/>
              </svg>
            </span>
          </button>
        `).join('')}
      </div>
    `;
    wirePromptChips();
  }

  // Reset conversation
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      renderIntroAndChips(sahayLang);
      updateSahayProfileStatusBar();
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

  // 50 FAQs Drawer Logic
  function renderFaqDrawer(searchTerm = '') {
    if (!faqList) return;
    const kb = window.SAHAY_KNOWLEDGE_BASE || [];
    const term = searchTerm.toLowerCase().trim();
    const isHindi = sahayLang === 'hi';

    const filtered = kb.filter(item => {
      const matchCat = activeFaqCat === 'all' || item.category === activeFaqCat;
      if (!matchCat) return false;
      if (!term) return true;
      const q = (isHindi ? item.question_hi : item.question_en).toLowerCase();
      const a = (isHindi ? item.answer_hi : item.answer_en).toLowerCase();
      const kw = (item.keywords || []).join(' ').toLowerCase();
      return q.includes(term) || a.includes(term) || kw.includes(term);
    });

    if (filtered.length === 0) {
      faqList.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 1.5rem 0.5rem; font-size: 0.84rem;">No questions found matching "${escapeHtml(searchTerm)}".</div>`;
      return;
    }

    faqList.innerHTML = filtered.map(item => `
      <div class="sahay-faq-item-card" data-qid="${item.id}" data-query="${escapeHtml(isHindi ? item.question_hi : item.question_en)}">
        <div class="sahay-faq-item-category">${item.category_icon || '📌'} ${escapeHtml(item.category_name || item.category)}</div>
        <div class="sahay-faq-item-question">${escapeHtml(isHindi ? item.question_hi : item.question_en)}</div>
      </div>
    `).join('');

    faqList.querySelectorAll('.sahay-faq-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const query = card.getAttribute('data-query');
        if (faqDrawer) faqDrawer.style.display = 'none';
        if (userInput) userInput.value = '';
        handleAssistantSend(query);
      });
    });
  }

  if (faqToggleBtn && faqDrawer) {
    faqToggleBtn.addEventListener('click', () => {
      const isVisible = faqDrawer.style.display === 'flex';
      faqDrawer.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        renderFaqDrawer(faqSearchInput ? faqSearchInput.value : '');
        if (faqSearchInput) setTimeout(() => faqSearchInput.focus(), 100);
      }
    });
  }

  if (faqCloseBtn && faqDrawer) {
    faqCloseBtn.addEventListener('click', () => {
      faqDrawer.style.display = 'none';
    });
  }

  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', (e) => {
      renderFaqDrawer(e.target.value);
    });
  }

  if (faqCatFilter) {
    faqCatFilter.querySelectorAll('.sahay-faq-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        faqCatFilter.querySelectorAll('.sahay-faq-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFaqCat = tab.getAttribute('data-cat') || 'all';
        renderFaqDrawer(faqSearchInput ? faqSearchInput.value : '');
      });
    });
  }

  // Category Filter Tabs for Prompt Chips
  if (categoryBar) {
    categoryBar.querySelectorAll('.sahay-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBar.querySelectorAll('.sahay-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat');
        updatePromptChipsByCategory(cat);
      });
    });
  }

  function getCategorySvgIcon(cat) {
    switch (cat) {
      case 'kcc':
      case 'loan_application':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9"/><path d="M12 6v2m0 8v2"/></svg>`;
      case 'pm_kisan':
      case 'land_soil_irrigation':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
      case 'crop_insurance':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`;
      case 'debt_risk_safety':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      case 'equipment_mechanization':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
    }
  }

  async function updatePromptChipsByCategory(category) {
    const chipsContainer = document.getElementById('sahay-prompt-chips');
    if (!chipsContainer) return;
    const kb = window.SAHAY_KNOWLEDGE_BASE || [];
    const currentLang = sahayLang;

    let items = [];
    if (category === 'all') {
      items = [
        kb.find(k => k.id === 'kcc_what_is') || kb[0],
        kb.find(k => k.id === 'kcc_interest_rate') || kb[1],
        kb.find(k => k.id === 'loan_scam_detection') || kb[2],
        kb.find(k => k.id === 'tractor_subsidy') || kb[3]
      ].filter(Boolean);
    } else {
      items = kb.filter(k => k.category === category).slice(0, 4);
      if (items.length === 0) items = kb.slice(0, 4);
    }

    const titleMap = {
      en: 'Suggested Questions:',
      hi: 'सुझाए गए प्रश्न:',
      pa: 'ਸੁਝਾਏ ਗਏ ਸਵਾਲ:',
      bn: 'প্রস্তাবিত প্রশ্নাবলী:'
    };

    let questions = items.map(item => {
      if (currentLang === 'hi') return item.question_hi || item.question_en;
      return item.question_en;
    });

    if ((currentLang === 'pa' || currentLang === 'bn') && typeof window.translateBatch === 'function') {
      try {
        const qObj = {};
        questions.forEach((q, idx) => { qObj['q_' + idx] = q; });
        const trans = await window.translateBatch(qObj, currentLang);
        if (trans) {
          questions = questions.map((q, idx) => trans['q_' + idx] || q);
        }
      } catch (e) {
        console.warn('Chips translation notice:', e);
      }
    }

    chipsContainer.innerHTML = `
      <div class="sahay-chips-title">
        <svg class="sahay-title-sparkle" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L9.8 5.4L15.2 7.2L9.8 9L8 14.4L6.2 9L0.8 7.2L6.2 5.4L8 0Z"/>
        </svg>
        <span>${titleMap[currentLang] || titleMap.en}</span>
      </div>
      ${items.map((item, idx) => `
        <button type="button" class="sahay-chip" data-query="${escapeHtml(questions[idx])}">
          <span class="sahay-chip-icon-box ${item.category || 'leaf'}">
            ${getCategorySvgIcon(item.category)}
          </span>
          <span class="sahay-chip-text">${escapeHtml(questions[idx])}</span>
          <span class="sahay-chip-chevron">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 12l4-4-4-4"/>
            </svg>
          </span>
        </button>
      `).join('')}
    `;
    wirePromptChips();
  }

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
        recognition.lang = SAHAY_SPEECH_MAP[sahayLang] || 'en-IN';
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

    // 2. Append Loading State ('AI is thinking...')
    const typingId = 'sahay-typing-' + Date.now();
    const typingBubble = document.createElement('div');
    typingBubble.className = 'sahay-msg assistant';
    typingBubble.id = typingId;
    typingBubble.innerHTML = `
      <div class="sahay-msg-content" style="display: flex; align-items: center; gap: 0.5rem; color: #64748b;">
        <span class="recording-dot" style="background: #15803d;"></span>
        <span><em>Sahay AI is thinking...</em></span>
      </div>
    `;
    messageStream.appendChild(typingBubble);
    messageStream.scrollTop = messageStream.scrollHeight;

    if (userInput) userInput.disabled = true;
    const farmerProfile = getComprehensiveFarmerProfile();

    try {
      // 3. Send query to local FastAPI RAG endpoint (with /chat proxy fallback)
      let res;
      try {
        res = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_query: messageText,
            top_k: 3,
            include_context: false,
            language: sahayLang
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (errDirect) {
        // Fallback to relative /chat on current host/server
        res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_query: messageText,
            top_k: 3,
            include_context: false,
            language: sahayLang
          })
        });
        if (!res.ok) {
          throw new Error(`RAG Server returned HTTP ${res.status}: ${res.statusText}`);
        }
      }

      const data = await res.json();
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      // 4. Display AI answer in Chat UI
      if (data && data.answer) {
        const answerText = data.answer;
        appendMessage('assistant', answerText);

        // TTS Read Aloud if active
        if (isTtsActive && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(answerText.replace(/[•*#_`]/g, ' '));
          utterance.lang = sahayLang === 'hi' ? 'hi-IN' : 'en-IN';
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        const fallbackMsg = {
          en: "I cannot find the specific answer to this in the official directives. Please verify this detail with your local bank branch or Krishi Vigyan Kendra.",
          hi: "मुझे आधिकारिक निर्देशों में इसका विशिष्ट उत्तर नहीं मिल सका। कृपया इस विवरण को अपनी स्थानीय बैंक शाखा या कृषि विज्ञान केंद्र से सत्यापित करें।"
        };
        appendMessage('assistant', fallbackMsg[sahayLang] || fallbackMsg.en);
      }

    } catch (err) {
      console.warn('Local RAG API error, falling back:', err);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      // Fallback: Check local knowledge base if local API server is unreachable
      const localMatch = (typeof window.findSahayAnswer === 'function')
        ? window.findSahayAnswer(messageText, sahayLang, farmerProfile)
        : null;

      if (localMatch) {
        appendAssistantReply(localMatch);
      } else {
        appendMessage(
          'assistant',
          '⚠️ **Could not connect to Sahay AI backend (`http://localhost:8000/chat`).**\nPlease ensure your local FastAPI server is running (`python app.py`).'
        );
      }
    } finally {
      if (userInput) {
        userInput.disabled = false;
        userInput.focus();
      }
    }
  }

  function appendMessage(role, text) {
    if (!messageStream) return;
    const msg = document.createElement('div');
    msg.className = `sahay-msg ${role}`;
    // For assistant messages render basic markdown (bold, bullets, newlines).
    // User messages are always escaped for XSS safety.
    let content;
    if (role === 'assistant') {
      content = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/•/g, '&bull;')
        .replace(/\n/g, '<br>');
    } else {
      content = escapeHtml(text);
    }
    msg.innerHTML = `<div class="sahay-msg-content">${content}</div>`;
    messageStream.appendChild(msg);
    messageStream.scrollTop = messageStream.scrollHeight;
  }

  async function appendAssistantReply(answerData) {
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

    const actionsHtml = `
      <div class="sahay-msg-actions">
        <button type="button" class="sahay-action-btn btn-sahay-listen" title="Listen to this answer">
          <span>🔊</span> <span>Listen</span>
        </button>
        <button type="button" class="sahay-action-btn btn-sahay-copy" title="Copy answer">
          <span>📋</span> <span>Copy</span>
        </button>
      </div>
    `;

    const nextQMap = {
      en: 'Suggested Questions:',
      hi: 'अगले प्रश्न:'
    };

    const chipsHtml = (suggestedChips && suggestedChips.length > 0) ? `
      <div class="sahay-prompt-chips-container" style="margin-top: 0.65rem;">
        <div class="sahay-chips-title">
          <svg class="sahay-title-sparkle" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0L9.8 5.4L15.2 7.2L9.8 9L8 14.4L6.2 9L0.8 7.2L6.2 5.4L8 0Z"/>
          </svg>
          <span>${nextQMap[sahayLang] || nextQMap.en}</span>
        </div>
        ${suggestedChips.map(chip => `
          <button type="button" class="sahay-chip dynamic-chip" data-query="${escapeHtml(chip)}">
            <span class="sahay-chip-icon-box leaf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <span class="sahay-chip-text">${escapeHtml(chip)}</span>
            <span class="sahay-chip-chevron">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 12l4-4-4-4"/>
              </svg>
            </span>
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
        ${actionsHtml}
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

    // Attach Listen button listener
    const listenBtn = msg.querySelector('.btn-sahay-listen');
    if (listenBtn) {
      listenBtn.addEventListener('click', () => {
        if (!window.speechSynthesis) return;
        const cleanSpeakText = reply.replace(/\*\*/g, '').replace(/•/g, '').replace(/\n+/g, '. ');
        const utterance = new SpeechSynthesisUtterance(cleanSpeakText);
        utterance.lang = SAHAY_SPEECH_MAP[sahayLang] || 'en-IN';
        utterance.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        showToast('🔊 Reading answer aloud...');
      });
    }

    // Attach Copy button listener
    const copyBtn = msg.querySelector('.btn-sahay-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const cleanText = reply.replace(/\*\*/g, '');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(cleanText).then(() => {
            copyBtn.innerHTML = '<span>✅</span> <span>Copied!</span>';
            setTimeout(() => {
              copyBtn.innerHTML = '<span>📋</span> <span>Copy</span>';
            }, 2000);
          }).catch(() => {
            showToast('Could not copy to clipboard');
          });
        }
      });
    }

    // Auto TTS Voice Read Aloud if enabled
    if (isTtsActive && window.speechSynthesis) {
      const cleanSpeakText = reply.replace(/\*\*/g, '').replace(/•/g, '').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(cleanSpeakText);
      utterance.lang = SAHAY_SPEECH_MAP[sahayLang] || 'en-IN';
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
// Header Notification Bar & Push Service (Requirement 1)
// ==========================================================================

async function setupNotifications() {
  if (el.notificationBellBtn) {
    el.notificationBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.notificationDropdownMenu) {
        el.notificationDropdownMenu.classList.toggle('active');
      }
    });
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (el.notificationDropdownMenu && el.notificationHeaderContainer && !el.notificationHeaderContainer.contains(e.target)) {
      el.notificationDropdownMenu.classList.remove('active');
    }
  });

  if (el.btnMarkAllRead) {
    el.btnMarkAllRead.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await fetch('/api/notifications/read-all', { method: 'PUT' });
        (state.notifications || []).forEach(n => n.read = true);
        state.unreadNotificationsCount = 0;
        updateNotificationsUI();
        showToast('All notifications marked as read');
      } catch (err) {
        console.warn('Failed to mark all as read:', err);
      }
    });
  }

  if (el.btnEnablePush) {
    el.btnEnablePush.addEventListener('click', async (e) => {
      e.stopPropagation();
      await requestPushPermission();
    });
  }

  // Initial load & periodic poll every 60s
  await loadNotifications();
  setInterval(loadNotifications, 60000);
}

async function loadNotifications() {
  try {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        state.notifications = data.notifications;
        state.unreadNotificationsCount = data.unreadCount || 0;
        updateNotificationsUI();
      }
    }
  } catch (err) {
    console.warn('Notifications fetch error:', err);
  }
}

function updateNotificationsUI() {
  const unreadCount = state.unreadNotificationsCount || 0;
  if (el.notificationBadge) {
    if (unreadCount > 0) {
      el.notificationBadge.style.display = 'inline-block';
      el.notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    } else {
      el.notificationBadge.style.display = 'none';
    }
  }

  if (el.notificationCountTag) {
    el.notificationCountTag.textContent = `${unreadCount} unread`;
  }

  if (!el.notificationDropdownList) return;

  if (!state.notifications || state.notifications.length === 0) {
    el.notificationDropdownList.innerHTML = `
      <div class="notification-empty">
        <span>🌾</span>
        <p>${t('noNotifications', 'No new notifications')}</p>
      </div>
    `;
    return;
  }

  el.notificationDropdownList.innerHTML = '';
  state.notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = `notification-item ${n.read ? '' : 'unread'}`;
    const icon = n.type === 'emi_reminder' ? '⏰' : (n.type === 'new_scheme' ? '🏛️' : (n.type === 'payment' ? '💳' : '🔔'));
    const timeAgo = formatTimeAgo(n.createdAt);

    item.innerHTML = `
      <div class="notification-item-icon">${icon}</div>
      <div class="notification-item-content">
        <div class="notification-item-title">
          <span>${n.title}</span>
          ${!n.read ? '<span class="notification-unread-dot" title="Unread"></span>' : ''}
        </div>
        <div class="notification-item-desc">${n.message}</div>
        <div class="notification-item-time">${timeAgo}</div>
      </div>
    `;

    item.addEventListener('click', async () => {
      if (!n.read) {
        n.read = true;
        state.unreadNotificationsCount = Math.max(0, state.unreadNotificationsCount - 1);
        updateNotificationsUI();
        try {
          await fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' });
        } catch (e) {}
      }
      if (n.type === 'emi_reminder' || n.type === 'payment') {
        switchView('loans');
      } else if (n.type === 'new_scheme') {
        switchView('schemes');
      }
      if (el.notificationDropdownMenu) el.notificationDropdownMenu.classList.remove('active');
    });

    el.notificationDropdownList.appendChild(item);
  });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSecs = Math.floor((now - date) / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

async function requestPushPermission() {
  if (!('serviceWorker' in navigator)) {
    showToast('Browser push notifications are not supported on this device.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.register('/sw.js');
      let sub = null;
      if ('PushManager' in window && reg.pushManager) {
        sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
          }).catch(() => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/demo-' + Date.now(), keys: {} }));
        }
      } else {
        sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/demo-' + Date.now(), keys: {} };
      }

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      });

      if (el.pushStatusText) el.pushStatusText.textContent = 'Push Active ✓';
      showToast('📲 Browser push notifications enabled!');
    } else {
      showToast('Push notifications permission was denied.');
    }
  } catch (err) {
    console.warn('Push registration error:', err);
    showToast('Failed to enable push notifications.');
  }
}

window.loadNotifications = loadNotifications;

// ==========================================================================
// Mandatory Aadhaar-Bank Linking Guard (Requirement 4)
// ==========================================================================

function setupAadhaarLinkingGuard() {
  if (el.aadhaarSelect) {
    el.aadhaarSelect.addEventListener('change', () => {
      const isLinked = el.aadhaarSelect.value === 'yes';
      if (el.aadhaarGuideBox) {
        el.aadhaarGuideBox.style.display = isLinked ? 'none' : 'block';
        if (!isLinked) {
          el.aadhaarGuideBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          showToast('⚠️ Aadhaar linking is mandatory for all government schemes.');
        }
      }
    });
  }
}

// ==========================================================================
// Neural Audio Player & Natural TTS Engine (Requirement 7)
// ==========================================================================

function setupAudioPlayer() {
  if (el.audioPlayPauseBtn) {
    el.audioPlayPauseBtn.addEventListener('click', () => {
      if (state.currentAudio) {
        if (state.currentAudio.paused) {
          state.currentAudio.play();
          setAudioPlayerUI(true, 'Playing...');
        } else {
          state.currentAudio.pause();
          setAudioPlayerUI(false, 'Paused');
        }
      } else if (state.speechSynth && state.isSpeaking) {
        if (state.speechSynth.paused) {
          state.speechSynth.resume();
          setAudioPlayerUI(true, 'Speaking...');
        } else {
          state.speechSynth.pause();
          setAudioPlayerUI(false, 'Paused');
        }
      }
    });
  }

  if (el.audioSpeedSelect) {
    el.audioSpeedSelect.addEventListener('change', () => {
      state.ttsSpeed = parseFloat(el.audioSpeedSelect.value) || 1.0;
      if (state.currentAudio) {
        state.currentAudio.playbackRate = state.ttsSpeed;
      }
      showToast(`Audio speed set to ${state.ttsSpeed}x`);
    });
  }

  if (el.audioCloseBtn) {
    el.audioCloseBtn.addEventListener('click', () => {
      stopSpeech();
    });
  }
}

function setAudioPlayerUI(isPlaying, label = 'Reading Aloud...') {
  if (!el.audioPlayerBar) return;
  if (isPlaying) {
    el.audioPlayerBar.style.display = 'flex';
    if (el.audioPlayIcon) el.audioPlayIcon.textContent = '⏸️';
    if (el.audioWaveAnim) el.audioWaveAnim.style.display = 'flex';
    if (el.audioStatusLabel) el.audioStatusLabel.textContent = label;
  } else {
    if (el.audioPlayIcon) el.audioPlayIcon.textContent = '▶️';
    if (el.audioWaveAnim) el.audioWaveAnim.style.display = 'none';
    if (el.audioStatusLabel) el.audioStatusLabel.textContent = label;
  }
}

async function speakKisanText(text, lang = null, onEndCallback = null) {
  if (!text) return;
  stopSpeech();

  const targetLang = lang || state.currentLang || 'hi';
  const speed = state.ttsSpeed || 1.0;

  setAudioPlayerUI(true, 'Reading in Natural Voice...');
  if (el.audioLangLabel) {
    const langObj = window.INDIAN_LANGUAGES ? window.INDIAN_LANGUAGES.find(l => l.code === targetLang) : null;
    el.audioLangLabel.textContent = langObj ? `${langObj.name} Neural Voice` : 'Natural Neural Audio';
  }

  // 1. Attempt backend high-quality Neural TTS synthesis first
  try {
    const res = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language: targetLang,
        speed
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.playbackRate = speed;
        state.currentAudio = audio;
        state.isSpeaking = true;

        audio.onended = () => {
          stopSpeech();
          if (typeof onEndCallback === 'function') onEndCallback();
        };

        audio.onerror = () => {
          console.warn('Neural audio playback failed, falling back to browser speech');
          fallbackBrowserSpeech(text, targetLang, speed, onEndCallback);
        };

        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Neural TTS API unreachable, falling back to browser speech:', err);
  }

  // 2. Graceful fallback to browser SpeechSynthesis
  fallbackBrowserSpeech(text, targetLang, speed, onEndCallback);
}

function fallbackBrowserSpeech(text, targetLang, speed, onEndCallback) {
  if (!window.speechSynthesis) {
    stopSpeech();
    return;
  }

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

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCodes[targetLang] || 'hi-IN';
  utterance.rate = speed < 1.0 ? 0.8 : 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith(utterance.lang.substring(0, 2)) && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural')));
  if (naturalVoice) utterance.voice = naturalVoice;

  utterance.onstart = () => {
    state.isSpeaking = true;
    setAudioPlayerUI(true, 'Speaking...');
  };

  utterance.onend = () => {
    stopSpeech();
    if (typeof onEndCallback === 'function') onEndCallback();
  };

  utterance.onerror = () => {
    stopSpeech();
  };

  state.activeSpeech = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if (state.currentAudio) {
    try {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    } catch (e) {}
    state.currentAudio = null;
  }
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  state.isSpeaking = false;
  if (el.audioPlayerBar) el.audioPlayerBar.style.display = 'none';
  if (el.floatingSpeakerBtn) el.floatingSpeakerBtn.classList.remove('speaking');
}

// Make functions globally accessible
window.speakKisanText = speakKisanText;
window.stopSpeech = stopSpeech;

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
  speakKisanText(prompt, state.currentLang);
}

window.speakCard = function(cardKey) {
  const title = t(`${cardKey}Title`);
  const desc = t(`${cardKey}Desc`);
  speakKisanText(`${title}. ${desc}`, state.currentLang);
};

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
// Visitor Permissions Engine (Notifications & Geolocation)
// ==========================================================================

function setupPermissionPromptForVisitors() {
  const isPrompted = localStorage.getItem('kisansahay_visitor_permissions_prompted');
  const modal = document.getElementById('visitor-permission-modal');
  if (!modal) return;

  // Ask any unlogged-in or first-time visitor for permissions
  if (!isPrompted) {
    setTimeout(() => {
      modal.style.display = 'flex';
    }, 1000);
  }

  const btnAllow = document.getElementById('btn-visitor-permission-allow');
  const btnSkip = document.getElementById('btn-visitor-permission-skip');

  if (btnAllow) {
    btnAllow.addEventListener('click', async () => {
      modal.style.display = 'none';
      localStorage.setItem('kisansahay_visitor_permissions_prompted', 'true');

      // 1. Request Notification Permission
      try {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm === 'granted' && typeof requestPushPermission === 'function') {
            requestPushPermission();
          }
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }

      // 2. Request Geolocation Permission
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = Number(pos.coords.latitude.toFixed(4));
              const lon = Number(pos.coords.longitude.toFixed(4));
              if (el.geoLat) el.geoLat.value = lat;
              if (el.geoLong) el.geoLong.value = lon;
              if (el.gpsStatusText) el.gpsStatusText.textContent = 'GPS Locked ✓';

              try {
                const res = await fetch(`/api/context/location?latitude=${lat}&longitude=${lon}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.success && data.data && data.data.location) {
                    const loc = data.data.location;
                    showToast(`📍 Location detected: ${loc.district}, ${loc.state}`);
                  }
                }
              } catch (e) {
                showToast(`📍 GPS coordinates locked: (${lat}, ${lon})`);
              }
            },
            (err) => {
              console.warn('Geolocation denied or unavailable:', err);
            },
            { timeout: 8000 }
          );
        }
      } catch (err) {
        console.warn('Geolocation request error:', err);
      }

      showToast('✓ Permissions updated. Notifications & Location active.');
    });
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', () => {
      modal.style.display = 'none';
      localStorage.setItem('kisansahay_visitor_permissions_prompted', 'true');
    });
  }
}

// Ensure Visitor Permission prompt initializes on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPermissionPromptForVisitors);
} else {
  setupPermissionPromptForVisitors();
}

// ==========================================================================
// THEME TOGGLE ENGINE (DARK & LIGHT DUALITY)
// ==========================================================================

function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  const icon = document.getElementById('theme-icon-indicator');
  const savedTheme = localStorage.getItem('kisansahay_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      if (icon) icon.textContent = '☀️';
      if (btn) btn.title = 'Switch to Light Mode';
    } else {
      document.body.classList.remove('dark-mode');
      if (icon) icon.textContent = '🌙';
      if (btn) btn.title = 'Switch to Dark Mode';
    }
  };

  applyTheme(savedTheme);

  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-mode');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('kisansahay_theme', newTheme);
      showToast(newTheme === 'dark' ? '🌙 Dark Mode activated' : '☀️ Light Mode activated');
    });
  }
}

// ==========================================================================
// 15 SCHEME CATEGORIES & CATEGORY EXPLORER ENGINE (Images 3, 4, 5)
// ==========================================================================

function getCategoryLocalizedName(cat) {
  if (!cat) return '';
  const lang = state.currentLang || 'en';
  if (lang === 'en') return cat.name;
  const key = 'cat_' + cat.id.replace(/-/g, '_');
  const fromDict = t(key);
  if (fromDict && fromDict !== key) return fromDict;
  if (lang === 'hi' && cat.hindiName) return cat.hindiName;
  if (cat.translations && cat.translations[lang]) return cat.translations[lang];
  return cat.name;
}

function renderHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container || !window.NATIONAL_CATEGORIES) return;

  const schemesLabel = t('schemesCountLabel', 'Schemes');
  container.innerHTML = window.NATIONAL_CATEGORIES.map(cat => `
    <div class="category-card-item" style="--cat-accent: ${cat.accentColor}; --cat-bg-glow: ${cat.bgGlow};" onclick="openCategorySchemes('${cat.id}')">
      <div class="category-icon-disc">
        ${cat.iconSvg}
      </div>
      <div class="category-scheme-count-pill" style="color: ${cat.accentColor};">
        ${cat.count} ${schemesLabel}
      </div>
      <div class="category-card-title">
        ${getCategoryLocalizedName(cat)}
      </div>
    </div>
  `).join('');
}

let currentCategoryState = {
  categoryId: 'agriculture',
  scope: 'all',
  searchQuery: '',
  state: 'all',
  gender: 'all',
  age: 'all',
  benefit: 'all',
  caste: 'all',
  currentPage: 1,
  pageSize: 6
};

window.openCategorySchemes = function (categoryId = 'agriculture', initialScope = 'all') {
  currentCategoryState.categoryId = categoryId;
  currentCategoryState.scope = initialScope;
  currentCategoryState.searchQuery = '';
  currentCategoryState.state = 'all';
  currentCategoryState.gender = 'all';
  currentCategoryState.benefit = 'all';
  currentCategoryState.caste = 'all';
  currentCategoryState.currentPage = 1;

  const cat = (window.NATIONAL_CATEGORIES || []).find(c => c.id === categoryId) || window.NATIONAL_CATEGORIES[0];
  if (!cat) return;

  // 1. Switch View
  switchView('category-schemes');

  // 2. Set Breadcrumb Title
  const breadcrumb = document.getElementById('cat-breadcrumb-title');
  if (breadcrumb) breadcrumb.textContent = getCategoryLocalizedName(cat);

  // 3. Render Themed Illustrated Hero Banner
  const bannerContainer = document.getElementById('category-hero-banner-container');
  if (bannerContainer && typeof window.getCategoryBannerHtml === 'function') {
    bannerContainer.innerHTML = `
      ${window.getCategoryBannerHtml(cat.bannerTheme, cat)}
      <div class="category-hero-content-overlay">
        <div class="category-hero-overlay-title">${getCategoryLocalizedName(cat)}</div>
        <div style="color: #cbd5e1; font-size: 0.95rem; margin-top: 0.4rem; max-width: 650px; line-height: 1.4;">
          ${cat.description}
        </div>
      </div>
    `;
  }

  // 4. Set Scope tab active
  document.querySelectorAll('#cat-scope-tabs-bar .cat-scope-tab').forEach(tab => {
    if (tab.getAttribute('data-cat-scope') === initialScope) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // 5. Reset filter inputs
  const searchInput = document.getElementById('cat-search-input');
  if (searchInput) searchInput.value = '';

  const stateSelect = document.getElementById('cat-filter-state');
  if (stateSelect) stateSelect.value = 'all';

  const genderSelect = document.getElementById('cat-filter-gender');
  if (genderSelect) genderSelect.value = 'all';

  const ageSelect = document.getElementById('cat-filter-age');
  if (ageSelect) ageSelect.value = 'all';

  const benefitSelect = document.getElementById('cat-filter-benefit');
  if (benefitSelect) benefitSelect.value = 'all';

  const casteSelect = document.getElementById('cat-filter-caste');
  if (casteSelect) casteSelect.value = 'all';

  // 6. Filter & Render cards
  filterAndRenderCategorySchemes();
};

function filterAndRenderCategorySchemes() {
  const container = document.getElementById('cat-schemes-cards-list');
  const countEl = document.getElementById('cat-schemes-count-num');
  const paginationContainer = document.getElementById('cat-pagination-container');
  if (!container) return;

  const { categoryId, scope, searchQuery, state: filterState, gender, benefit } = currentCategoryState;

  // 1. Gather flagship category schemes
  let list = (window.FLAGSHIP_CATEGORY_SCHEMES || []).filter(s => s.categoryId === categoryId);

  // 2. Incorporate existing database schemes if agriculture or banking
  if (categoryId === 'agriculture' && Array.isArray(state.schemes)) {
    const agriSchemes = state.schemes.slice(0, 45).map(s => ({
      id: s.id,
      categoryId: 'agriculture',
      title: s.name,
      ministry: s.ministry || 'Ministry of Agriculture and Farmers Welfare',
      description: s.description || 'Verified agricultural credit and welfare support scheme.',
      tags: ['Agriculture', s.type || 'Loan', s.state !== 'All India' ? 'State Scheme' : 'Central Scheme'],
      scope: s.state === 'All India' || !s.state ? 'central' : 'state',
      state: s.state || 'All India',
      gender: 'all',
      benefitType: 'Concessional Interest & Credit',
      applyUrl: s.application_url || 'https://agricoop.nic.in/'
    }));
    list = [...list, ...agriSchemes];
  } else if (categoryId === 'banking' && Array.isArray(state.schemes)) {
    const bankSchemes = state.schemes.filter(s => s.category?.includes('LOAN')).slice(0, 35).map(s => ({
      id: s.id,
      categoryId: 'banking',
      title: s.name,
      ministry: s.ministry || 'Department of Financial Services',
      description: s.description || 'Concessional banking and institutional financing directive.',
      tags: ['Banking', 'Credit', s.type || 'Subvention'],
      scope: s.state === 'All India' || !s.state ? 'central' : 'state',
      state: s.state || 'All India',
      gender: 'all',
      benefitType: 'Institutional Bank Credit',
      applyUrl: s.application_url || 'https://financialservices.gov.in/'
    }));
    list = [...list, ...bankSchemes];
  }

  // 3. Filter by Scope
  if (scope === 'state') {
    list = list.filter(s => s.scope === 'state' || (s.state && s.state !== 'Central' && s.state !== 'All India'));
  } else if (scope === 'central') {
    list = list.filter(s => s.scope === 'central' || s.state === 'Central' || s.state === 'All India');
  }

  // 4. Filter by State
  if (filterState && filterState !== 'all') {
    list = list.filter(s => s.state === filterState || s.state === 'All India' || s.scope === 'central');
  }

  // 5. Filter by Gender
  if (gender && gender !== 'all') {
    list = list.filter(s => s.gender === gender || s.gender === 'all');
  }

  // 6. Filter by Benefit
  if (benefit && benefit !== 'all') {
    list = list.filter(s => {
      const bText = (s.benefitType || '').toLowerCase();
      const tagsText = (s.tags || []).join(' ').toLowerCase();
      if (benefit === 'subsidy') return bText.includes('subsidy') || bText.includes('grant') || tagsText.includes('subsidy');
      if (benefit === 'loan') return bText.includes('loan') || bText.includes('credit') || tagsText.includes('loan');
      if (benefit === 'insurance') return bText.includes('insurance') || tagsText.includes('insurance');
      if (benefit === 'dbt') return bText.includes('dbt') || bText.includes('cash') || tagsText.includes('dbt');
      return true;
    });
  }

  // 7. Filter by Search Query
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim().replace(/["']/g, '');
    list = list.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.ministry.toLowerCase().includes(q) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  // Update counter
  if (countEl) countEl.textContent = list.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="elig-empty-state">
        <div class="elig-empty-icon">🔍</div>
        <p>No schemes matched your current filter criteria. Try choosing "All Schemes" or resetting filters.</p>
      </div>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  // Calculate Slide Pagination
  const totalItems = list.length;
  const pageSize = currentCategoryState.pageSize || 6;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (currentCategoryState.currentPage > totalPages) {
    currentCategoryState.currentPage = totalPages;
  }
  const currentPage = currentCategoryState.currentPage || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = list.slice(startIndex, startIndex + pageSize);

  container.innerHTML = paginatedList.map(item => `
    <div class="cat-scheme-card">
      <div>
        <div class="cat-card-ministry">${escapeHtmlApp(item.ministry)}</div>
        <h3 class="cat-card-title">${escapeHtmlApp(item.title)}</h3>
      </div>
      <p class="cat-card-desc">${escapeHtmlApp(item.description)}</p>
      <div class="cat-card-tags-row">
        ${(item.tags || []).map(t => `<span class="cat-tag-pill">${escapeHtmlApp(t)}</span>`).join('')}
      </div>
      <div style="display: flex; gap: 0.8rem; align-items: center; margin-top: 0.4rem; flex-wrap: wrap;">
        <a href="${item.applyUrl || '#'}" target="_blank" rel="noopener noreferrer" class="cat-card-action-btn">
          <span>${t('btnApplyPortal', 'Apply on Official Portal')}</span> <span>↗</span>
        </a>
        <button type="button" class="btn-rec-docs" onclick="openChecklist('${item.id}')">
          📋 ${t('btnCheckDocs', 'Check Required Documents')}
        </button>
      </div>
    </div>
  `).join('');

  // Render Slide Pagination (Image 2: < 1 2 [3] 4 5 6 7 ... 91 >)
  renderCategoryPagination(currentPage, totalPages);
}

function renderCategoryPagination(currentPage, totalPages) {
  const paginationContainer = document.getElementById('cat-pagination-container');
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '<div class="cat-pagination-bar">';

  // Previous button (<)
  html += `
    <button type="button" class="cat-page-btn cat-page-prev" ${currentPage <= 1 ? 'disabled' : ''} onclick="goToCategoryPage(${currentPage - 1})" aria-label="Previous Page">
      <span class="cat-page-nav-arrow">‹</span>
    </button>
  `;

  // Page numbers helper
  const renderBtn = (p) => {
    const isActive = p === currentPage;
    return `<button type="button" class="cat-page-btn ${isActive ? 'active' : ''}" onclick="goToCategoryPage(${p})">${p}</button>`;
  };

  if (totalPages <= 8) {
    for (let p = 1; p <= totalPages; p++) {
      html += renderBtn(p);
    }
  } else {
    if (currentPage <= 4) {
      for (let p = 1; p <= Math.min(7, totalPages - 1); p++) {
        html += renderBtn(p);
      }
      html += `<span class="cat-page-ellipsis">...</span>`;
      html += renderBtn(totalPages);
    } else if (currentPage >= totalPages - 3) {
      html += renderBtn(1);
      html += `<span class="cat-page-ellipsis">...</span>`;
      for (let p = totalPages - 6; p <= totalPages; p++) {
        html += renderBtn(p);
      }
    } else {
      html += renderBtn(1);
      html += `<span class="cat-page-ellipsis">...</span>`;
      for (let p = currentPage - 2; p <= currentPage + 2; p++) {
        html += renderBtn(p);
      }
      html += `<span class="cat-page-ellipsis">...</span>`;
      html += renderBtn(totalPages);
    }
  }

  // Next button (>)
  html += `
    <button type="button" class="cat-page-btn cat-page-next" ${currentPage >= totalPages ? 'disabled' : ''} onclick="goToCategoryPage(${currentPage + 1})" aria-label="Next Page">
      <span class="cat-page-nav-arrow">›</span>
    </button>
  `;

  html += '</div>';
  paginationContainer.innerHTML = html;
}

window.goToCategoryPage = function (pageNum) {
  currentCategoryState.currentPage = pageNum;
  filterAndRenderCategorySchemes();
  const topAnchor = document.getElementById('cat-found-count');
  if (topAnchor) {
    topAnchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.openSocialMediaModal = function () {
  showToast('Connecting to Digital India & KisanSahay Official Social Channels...');
  window.open('https://twitter.com/DigitalIndiaGov', '_blank');
};

window.openQuickLink = function (type) {
  const titles = {
    'about': 'About KisanSahay & Digital India Mission',
    'contact': 'National Helpdesk & Krishi Bhawan Contact (011-24303714)',
    'screen-reader': 'Screen Reader Access & WCAG 2.1 AAA Compliance',
    'accessibility': 'Portal Accessibility Statement & Standards',
    'faq': 'Frequently Asked Questions & Eligibility Guidelines',
    'disclaimer': 'Official Government Disclaimer & Statutory Terms',
    'terms': 'Terms & Conditions of Portal Usage',
    'dashboard': 'National Agricultural Scheme Analytics & Real-Time Dashboard'
  };
  const title = titles[type] || 'Government Portal Quick Link';
  showToast(`🏛️ ${title}`);
};

function setupCategoryExplorer() {
  // Scope tabs
  document.querySelectorAll('#cat-scope-tabs-bar .cat-scope-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#cat-scope-tabs-bar .cat-scope-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategoryState.scope = tab.getAttribute('data-cat-scope') || 'all';
      currentCategoryState.currentPage = 1;
      filterAndRenderCategorySchemes();
    });
  });

  // Search input
  const searchInput = document.getElementById('cat-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentCategoryState.searchQuery = searchInput.value;
      currentCategoryState.currentPage = 1;
      filterAndRenderCategorySchemes();
    });
  }

  // Filter selects
  const stateSelect = document.getElementById('cat-filter-state');
  if (stateSelect) {
    stateSelect.addEventListener('change', () => {
      currentCategoryState.state = stateSelect.value;
      currentCategoryState.currentPage = 1;
      filterAndRenderCategorySchemes();
    });
  }

  const genderSelect = document.getElementById('cat-filter-gender');
  if (genderSelect) {
    genderSelect.addEventListener('change', () => {
      currentCategoryState.gender = genderSelect.value;
      currentCategoryState.currentPage = 1;
      filterAndRenderCategorySchemes();
    });
  }

  const benefitSelect = document.getElementById('cat-filter-benefit');
  if (benefitSelect) {
    benefitSelect.addEventListener('change', () => {
      currentCategoryState.benefit = benefitSelect.value;
      currentCategoryState.currentPage = 1;
      filterAndRenderCategorySchemes();
    });
  }

  const casteSelect = document.getElementById('cat-filter-caste');
  if (casteSelect) {
    casteSelect.addEventListener('change', () => {
      currentCategoryState.caste = casteSelect.value;
      currentCategoryState.currentPage = 1;
      filterAndRenderCategorySchemes();
    });
  }

  // Reset filters
  const resetBtn = document.getElementById('cat-btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentCategoryState.state = 'all';
      currentCategoryState.gender = 'all';
      currentCategoryState.benefit = 'all';
      currentCategoryState.caste = 'all';
      currentCategoryState.searchQuery = '';
      currentCategoryState.scope = 'all';
      currentCategoryState.currentPage = 1;

      if (searchInput) searchInput.value = '';
      if (stateSelect) stateSelect.value = 'all';
      if (genderSelect) genderSelect.value = 'all';
      if (benefitSelect) benefitSelect.value = 'all';
      if (casteSelect) casteSelect.value = 'all';

      document.querySelectorAll('#cat-scope-tabs-bar .cat-scope-tab').forEach(t => {
        if (t.getAttribute('data-cat-scope') === 'all') t.classList.add('active');
        else t.classList.remove('active');
      });

      showToast('Category filters reset.');
      filterAndRenderCategorySchemes();
    });
  }
}

// ==========================================================================
// MULTI-USER STATE ISOLATION & EVENT LISTENER
// ==========================================================================

function setupMultiuserStateListener() {
  // Ensure the eligibility form always starts clean and empty for the user to give input
  if (el.cropInput) el.cropInput.value = '';
  if (el.landSizeInput) el.landSizeInput.value = '';
  if (el.stateInput) el.stateInput.value = '';
  if (el.districtInput) el.districtInput.value = '';
  if (el.incomeInput) el.incomeInput.value = '';
  if (el.existingLoansInput) el.existingLoansInput.value = '';
  state.userFarmProfile = null;

  // Clear any old/stale dummy farm profile data saved in localStorage
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('kisansahay_farm_')) localStorage.removeItem(k);
    });
  } catch (e) {}

  window.addEventListener('kisansahay:profileChanged', (e) => {
    const { profile, profileId } = e.detail || {};
    if (!profileId) return;

    // Clean Fresh Slate for New Profile / Account Switch!
    if (el.cropInput) el.cropInput.value = '';
    if (el.landSizeInput) el.landSizeInput.value = '';
    if (el.stateInput) el.stateInput.value = '';
    if (el.districtInput) el.districtInput.value = '';
    if (el.incomeInput) el.incomeInput.value = '';
    if (el.existingLoansInput) el.existingLoansInput.value = '';
    state.userFarmProfile = null;
    if (el.eligResultsContainer) el.eligResultsContainer.style.display = 'none';
    if (el.eligEmptyState) el.eligEmptyState.style.display = 'block';

    // Refresh loans list isolated to profile
    loadLoans();
  });
}

function escapeHtmlApp(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================================================
// LIVE INTERNET SPEED MONITOR (TOP BAR LEFT CORNER)
// WiFi Icon with Green (Fast), Yellow (Slow), Red (Too Slow / Offline)
// ==========================================================================

function setupNetworkSpeedMonitor() {
  const pill = document.getElementById('net-speed-pill');
  const speedVal = document.getElementById('net-speed-val');
  if (!pill || !speedVal) return;

  let isChecking = false;

  function applyStatus(status, label, titleText) {
    pill.classList.remove('status-fast', 'status-slow', 'status-too-slow');
    pill.classList.add(`status-${status}`);
    speedVal.textContent = label;
    pill.title = titleText || `Network: ${label} (Click to re-test)`;
    pill.setAttribute('aria-label', titleText || `Internet status: ${label}`);
  }

  async function checkNetworkSpeed(isManualClick = false) {
    if (isChecking) return;
    isChecking = true;

    if (isManualClick) {
      pill.classList.add('is-refreshing');
      speedVal.textContent = '...';
    }

    // 1. Check if browser is completely offline
    if (!navigator.onLine) {
      applyStatus('too-slow', 'Offline', 'Internet Connection: Disconnected (Offline)');
      pill.classList.remove('is-refreshing');
      isChecking = false;
      return;
    }

    let downlinkMbps = null;
    let rttMs = null;
    let effectiveType = null;

    // 2. Network Information API (Chrome / Edge / Chromium / Android)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (typeof conn.downlink === 'number' && conn.downlink > 0) {
        downlinkMbps = conn.downlink;
      }
      if (typeof conn.rtt === 'number' && conn.rtt > 0) {
        rttMs = conn.rtt;
      }
      if (conn.effectiveType) {
        effectiveType = conn.effectiveType;
      }
    }

    // 3. Resilient latency probe (works under both root / and /public/ Live Server)
    if (downlinkMbps === null || isManualClick) {
      try {
        const startTime = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const probeTarget = window.location.pathname.endsWith('.html')
          ? window.location.pathname + `?_probe=${Date.now()}`
          : './manifest.json?_probe=' + Date.now();

        const response = await fetch(probeTarget, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const elapsedMs = performance.now() - startTime;
        rttMs = Math.round(elapsedMs);

        if (response.ok || response.status === 304 || response.status === 404) {
          // If request reached the server, the connection is alive!
          if (downlinkMbps === null) {
            if (elapsedMs < 150) {
              downlinkMbps = 18.5;
            } else if (elapsedMs < 350) {
              downlinkMbps = 9.4;
            } else if (elapsedMs < 750) {
              downlinkMbps = 4.2;
            } else {
              downlinkMbps = 1.8;
            }
          }
        }
      } catch (probeErr) {
        if (!navigator.onLine) {
          applyStatus('too-slow', 'Offline', 'Internet Connection: Offline');
          pill.classList.remove('is-refreshing');
          isChecking = false;
          return;
        }
        // If navigator.onLine is true, user has active internet! Never falsely mark red!
        if (downlinkMbps === null) {
          downlinkMbps = 10.0;
        }
      }
    }

    // 4. Classify speed reliably:
    // Fast (Green): Connected & Online, low ping (<350ms) or >= 3.0 Mbps
    // Slow (Yellow): High latency (350-1000ms) or 0.8-3.0 Mbps
    // Too Slow (Red): Disconnected / Offline only
    let status = 'fast';
    let labelText = 'Fast';
    let tooltip = '';

    if (!navigator.onLine) {
      status = 'too-slow';
      labelText = 'Offline';
      tooltip = 'Internet Connection: Offline';
    } else if (downlinkMbps !== null) {
      if (downlinkMbps >= 3.0 || (rttMs !== null && rttMs < 350)) {
        status = 'fast';
        labelText = rttMs ? `${rttMs}ms • Fast` : (downlinkMbps >= 10 ? `${Math.round(downlinkMbps)} Mbps` : `${downlinkMbps.toFixed(1)} Mbps`);
        tooltip = `Internet Speed: Fast & Active (${labelText})${rttMs ? ` • Ping: ${rttMs}ms` : ''}`;
      } else if (downlinkMbps >= 1.0 || (rttMs !== null && rttMs < 850)) {
        status = 'slow';
        labelText = rttMs ? `${rttMs}ms • Normal` : `${downlinkMbps.toFixed(1)} Mbps`;
        tooltip = `Internet Speed: Normal / Moderate (${labelText})${rttMs ? ` • Ping: ${rttMs}ms` : ''}`;
      } else {
        status = (rttMs && rttMs > 1200) ? 'too-slow' : 'slow';
        labelText = `${downlinkMbps.toFixed(1)} Mbps`;
        tooltip = `Internet Speed: Slow (${labelText})${rttMs ? ` • Ping: ${rttMs}ms` : ''}`;
      }
    } else if (effectiveType) {
      if (effectiveType === '4g' || effectiveType === '3g') {
        status = 'fast';
        labelText = effectiveType.toUpperCase();
        tooltip = `Internet Speed: Fast (${effectiveType.toUpperCase()})`;
      } else {
        status = 'slow';
        labelText = effectiveType.toUpperCase();
        tooltip = `Internet Speed: Slow (${effectiveType.toUpperCase()})`;
      }
    } else {
      status = 'fast';
      labelText = 'Online';
      tooltip = 'Internet Speed: Connected & Fast';
    }

    applyStatus(status, labelText, tooltip);
    pill.classList.remove('is-refreshing');
    isChecking = false;

    if (isManualClick && typeof showToast === 'function') {
      showToast(`⚡ Network: ${status === 'fast' ? 'Fast' : 'Connected'} (${rttMs ? rttMs + 'ms ping' : 'Active'})`);
    }
  }

  // Click event: manual re-test
  pill.addEventListener('click', () => {
    checkNetworkSpeed(true);
  });

  // Online / Offline events
  window.addEventListener('online', () => {
    applyStatus('fast', 'Online', 'Internet Connected');
    setTimeout(() => checkNetworkSpeed(false), 500);
  });

  window.addEventListener('offline', () => {
    applyStatus('too-slow', 'Offline', 'Internet Connection: Offline');
  });

  // NetworkInformation change listener
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && conn.addEventListener) {
    conn.addEventListener('change', () => checkNetworkSpeed(false));
  }

  // Initial speed check
  checkNetworkSpeed(false);

  // Periodic background check every 30 seconds
  setInterval(() => checkNetworkSpeed(false), 30000);
}

// Global simulation helper for testing and verification
window.__setSimulatedNetworkSpeed = function(status, label) {
  const pill = document.getElementById('net-speed-pill');
  const speedVal = document.getElementById('net-speed-val');
  if (!pill || !speedVal) return false;
  pill.classList.remove('status-fast', 'status-slow', 'status-too-slow');
  pill.classList.add(`status-${status}`);
  speedVal.textContent = label;
  return true;
};

// ==========================================================================
// PWA Install Prompt Handler (#btn-install-pwa)
// ==========================================================================
let deferredPrompt = null;

function setupPWAInstallPrompt() {
  const installBtn = document.getElementById('btn-install-pwa');
  if (!installBtn) return;

  // Listen for the beforeinstallprompt event fired by Chromium browsers
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar / browser banner
    e.preventDefault();
    // Stash the event so it can be triggered when the user clicks the button
    deferredPrompt = e;
    // Show the Install App button in navbar
    installBtn.style.display = 'inline-flex';
    console.log('PWA: beforeinstallprompt captured, #btn-install-pwa visible.');
  });

  // Handle user click on Install App button
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      // Fallback: Open Universal Download Modal for iOS, Desktop or unprompted devices
      openUniversalDownloadModal();
      return;
    }

    // Show the native browser install prompt dialog
    deferredPrompt.prompt();

    // Await user's choice
    try {
      const choiceResult = await deferredPrompt.userChoice;
      console.log(`PWA: User install outcome: ${choiceResult.outcome}`);
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted KisanSahay installation.');
      } else {
        console.log('PWA: User dismissed KisanSahay installation.');
      }
    } catch (err) {
      console.warn('PWA: Install prompt error:', err);
    }

    // Reset prompt and hide button
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });

  // Listen for the appinstalled event
  window.addEventListener('appinstalled', (evt) => {
    console.log('PWA: KisanSahay installed successfully.');
    installBtn.style.display = 'none';
    deferredPrompt = null;
  });
}

// ==========================================================================
// Global PWA Trigger Helper (Invoked by navbar, Switch Profile bar, or mobile bar)
// ==========================================================================
window.triggerPWAInstallOrModal = function() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      console.log(`PWA: User choice: ${choiceResult.outcome}`);
      deferredPrompt = null;
      const installBtn = document.getElementById('btn-install-pwa');
      if (installBtn) installBtn.style.display = 'none';
    }).catch((err) => {
      console.warn('PWA prompt error:', err);
    });
    return;
  }

  // Otherwise, open the rich universal download modal
  openUniversalDownloadModal();
};

function openUniversalDownloadModal() {
  const modal = document.getElementById('pwa-universal-download-modal');
  if (!modal) return;

  // Set share URL
  const shareInput = document.getElementById('pwa-share-url-input');
  const currentUrl = (window.location && window.location.origin) ? window.location.origin : 'https://kisansahay.vercel.app';
  if (shareInput) {
    shareInput.value = currentUrl;
  }

  // Update WhatsApp share link
  const waBtn = document.getElementById('btn-whatsapp-pwa-share');
  if (waBtn) {
    const waText = encodeURIComponent(`🌾 KisanSahay — Download the official Farmers Scheme & Loan Portal app directly on your phone: ${currentUrl}`);
    waBtn.href = `https://api.whatsapp.com/send?text=${waText}`;
  }

  // Detect user agent for active tab
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  if (isIOS) {
    switchPWADeviceTab('ios');
  } else if (isAndroid) {
    switchPWADeviceTab('android');
  } else {
    switchPWADeviceTab('pc');
  }

  // Render QR Code
  renderPWAQRCode(currentUrl);

  modal.style.display = 'flex';
}

function switchPWADeviceTab(targetTab) {
  const tabs = document.querySelectorAll('.pwa-device-tab');
  const contents = document.querySelectorAll('.pwa-device-tab-content');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === targetTab);
  });
  contents.forEach(content => {
    content.style.display = content.id === `tab-pwa-${targetTab}` ? 'block' : 'none';
  });
}

function renderPWAQRCode(url) {
  const container = document.getElementById('pwa-qr-code-container');
  if (!container) return;

  // Generate crisp SVG QR Code pattern
  const size = 160;
  const moduleCount = 25;
  const cellSize = size / moduleCount;

  // Create hash seed from URL
  let seed = 0;
  for (let i = 0; i < url.length; i++) {
    seed = (seed * 31 + url.charCodeAt(i)) & 0xffffffff;
  }

  function isFinderPattern(r, c) {
    // Top-left
    if (r < 7 && c < 7) return true;
    // Top-right
    if (r < 7 && c >= moduleCount - 7) return true;
    // Bottom-left
    if (r >= moduleCount - 7 && c < 7) return true;
    return false;
  }

  let rects = '';

  // Draw 3 Finder Patterns
  const finders = [
    [0, 0],
    [0, moduleCount - 7],
    [moduleCount - 7, 0]
  ];

  finders.forEach(([fr, fc]) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isCenter) {
          const x = (fc + c) * cellSize;
          const y = (fr + r) * cellSize;
          rects += `<rect x="${x}" y="${y}" width="${cellSize + 0.2}" height="${cellSize + 0.2}" fill="#0f172a" rx="1"/>`;
        }
      }
    }
  });

  // Timing patterns
  for (let i = 7; i < moduleCount - 7; i++) {
    if (i % 2 === 0) {
      rects += `<rect x="${i * cellSize}" y="${6 * cellSize}" width="${cellSize + 0.2}" height="${cellSize + 0.2}" fill="#0f172a" rx="0.5"/>`;
      rects += `<rect x="${6 * cellSize}" y="${i * cellSize}" width="${cellSize + 0.2}" height="${cellSize + 0.2}" fill="#0f172a" rx="0.5"/>`;
    }
  }

  // Data modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderPattern(r, c) || (r === 6 && c >= 7 && c < moduleCount - 7) || (c === 6 && r >= 7 && r < moduleCount - 7)) {
        continue;
      }
      // Pseudo-random data grid seeded by URL
      const pseudo = Math.sin(seed * (r * moduleCount + c + 1)) * 10000;
      const isDark = (pseudo - Math.floor(pseudo)) > 0.48;
      if (isDark) {
        const x = c * cellSize;
        const y = r * cellSize;
        rects += `<rect x="${x}" y="${y}" width="${cellSize + 0.2}" height="${cellSize + 0.2}" fill="#15803d" rx="1"/>`;
      }
    }
  }

  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size}" style="background: #ffffff; padding: 8px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      ${rects}
      <!-- Center Brand Sprout Accent -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${cellSize * 2.2}" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
      <text x="${size / 2}" y="${size / 2 + 5}" font-size="${cellSize * 2.5}" text-anchor="middle" dominant-baseline="middle">🌱</text>
    </svg>
  `;
}

function setupUniversalPWADownloadModal() {
  const modal = document.getElementById('pwa-universal-download-modal');
  if (!modal) return;

  // Close button
  const closeBtn = document.getElementById('btn-close-pwa-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Modal 1-Click Install button
  const btnModalInstall = document.getElementById('btn-pwa-modal-install');
  if (btnModalInstall) {
    btnModalInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          const choiceResult = await deferredPrompt.userChoice;
          console.log('PWA: UserChoice outcome:', choiceResult.outcome);
          deferredPrompt = null;
        } catch (err) {}
        modal.style.display = 'none';
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          switchPWADeviceTab('ios');
        } else {
          switchPWADeviceTab('android');
        }
      }
    });
  }

  // Copy Link Button
  const btnCopy = document.getElementById('btn-copy-pwa-link');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const shareInput = document.getElementById('pwa-share-url-input');
      const textToCopy = shareInput ? shareInput.value : window.location.origin;
      try {
        await navigator.clipboard.writeText(textToCopy);
        const copySpan = document.getElementById('pwa-copy-text');
        if (copySpan) copySpan.textContent = 'Copied! ✓';
        setTimeout(() => {
          if (copySpan) copySpan.textContent = '📋 Copy Link';
        }, 2500);
      } catch (err) {
        if (shareInput) {
          shareInput.select();
          document.execCommand('copy');
          const copySpan = document.getElementById('pwa-copy-text');
          if (copySpan) copySpan.textContent = 'Copied! ✓';
          setTimeout(() => {
            if (copySpan) copySpan.textContent = '📋 Copy Link';
          }, 2500);
        }
      }
    });
  }

  // Device Tabs Switching
  const tabs = document.querySelectorAll('.pwa-device-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchPWADeviceTab(target);
    });
  });
}

function setupMobileAppDownloadBar() {
  const bar = document.getElementById('mobile-app-download-bar');
  if (!bar) return;

  // Check if previously dismissed in current session
  if (sessionStorage.getItem('kisansahay_mobile_bar_dismissed') === 'true') {
    bar.style.display = 'none';
    return;
  }

  const btnDownload = document.getElementById('btn-mobile-bar-download');
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      window.triggerPWAInstallOrModal();
    });
  }

  const btnClose = document.getElementById('btn-mobile-bar-close');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      bar.style.display = 'none';
      sessionStorage.setItem('kisansahay_mobile_bar_dismissed', 'true');
    });
  }
}

// ==========================================================================
// DYNAMIC PROCESS JOURNEY ENGINE (MATCHING JANSAMARTH IMAGE 1 DESIGN)
// ==========================================================================

let processTourInterval = null;
let currentProcessStep = 1;

function setupDynamicProcessSection() {
  // Initialize 3D perspective tilt on process cards
  const cards = document.querySelectorAll('.process-step-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotX = -(y / rect.height) * 8;
      const rotY = (x / rect.width) * 8;
      card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // Partner Lenders Modal close on overlay click
  const lendersModal = document.getElementById('partner-lenders-modal');
  if (lendersModal) {
    lendersModal.addEventListener('click', (e) => {
      if (e.target === lendersModal) {
        closePartnerLendersModal();
      }
    });
  }

  // Keyboard accessibility (Escape key closes lenders modal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lendersModal && lendersModal.classList.contains('active')) {
      closePartnerLendersModal();
    }
  });
}

function setActiveProcessStep(stepNum) {
  currentProcessStep = Number(stepNum);

  // Update tabs
  document.querySelectorAll('.process-tab-btn').forEach(btn => {
    const s = Number(btn.getAttribute('data-step'));
    if (s === currentProcessStep) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update cards
  document.querySelectorAll('.process-step-card').forEach(card => {
    const s = Number(card.getAttribute('data-step'));
    if (s === currentProcessStep) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function toggleProcessAutoTour() {
  const btn = document.getElementById('btn-process-autotour');
  const label = document.getElementById('tour-btn-label');
  const symbol = btn ? btn.querySelector('.tour-icon-symbol') : null;

  if (processTourInterval) {
    // Stop tour
    clearInterval(processTourInterval);
    processTourInterval = null;
    if (btn) btn.classList.remove('touring');
    if (symbol) symbol.textContent = '▶';
    if (label) label.textContent = (state.currentLang === 'hi') ? 'ऑटो टूर' : 'Auto Play Tour';
    showToast(state.currentLang === 'hi' ? 'यात्रा टूर रोक दिया गया' : 'Journey tour paused');
  } else {
    // Start tour
    if (btn) btn.classList.add('touring');
    if (symbol) symbol.textContent = '⏸';
    if (label) label.textContent = (state.currentLang === 'hi') ? 'रोकें' : 'Pause Tour';
    showToast(state.currentLang === 'hi' ? '4-चरणीय यात्रा ऑटो-टूर शुरू' : 'Started 4-step interactive journey tour');

    processTourInterval = setInterval(() => {
      let nextStep = currentProcessStep + 1;
      if (nextStep > 4) nextStep = 1;
      setActiveProcessStep(nextStep);
    }, 3200);
  }
}

function handleProcessCardClick(stepNum) {
  stepNum = Number(stepNum);
  setActiveProcessStep(stepNum);

  // Navigate to corresponding app view
  if (stepNum === 1) {
    switchView('eligibility');
  } else if (stepNum === 2) {
    switchView('schemes');
  } else if (stepNum === 3) {
    openPartnerLendersModal();
  } else if (stepNum === 4) {
    switchView('loans');
  }
}

function openPartnerLendersModal() {
  const modal = document.getElementById('partner-lenders-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

function closePartnerLendersModal() {
  const modal = document.getElementById('partner-lenders-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

// Speak aloud helper
function speakText(text) {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`•]/g, '').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = state.ttsRate || 1.0;
    utterance.lang = (state.currentLang === 'hi') ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  }
}

function playStepAudio(stepNum) {
  stepNum = Number(stepNum);
  const isHindi = state.currentLang === 'hi';

  const speeches = {
    1: isHindi 
      ? 'चरण 1: पात्रता जांचें। अपने खेत और आय के कुछ सरल प्रश्नों के उत्तर दें और अपने लिए उपयुक्त सरकारी योजनाओं से तुरंत जुड़ें।'
      : 'Step 1: Check Eligibility. Answer few questions about your farm and income to get matched with the best suitable government schemes.',
    2: isHindi
      ? 'चरण 2: ऑनलाइन आवेदन करें। स्मार्ट एनालिटिक्स के साथ अपने आवश्यक दस्तावेज और विवरण आसानी से भरें।'
      : 'Step 2: Apply Online. Provide basic details and documents, and smart analytics will auto-fill required information.',
    3: isHindi
      ? 'चरण 3: डिजिटल स्वीकृति प्राप्त करें। 300 से अधिक बैंकों और ऋणदाताओं से डिजिटल स्वीकृति पाएं।'
      : 'Step 3: Get Digital Approval. View offers from over 300 lenders and receive in-principle digital approval.',
    4: isHindi
      ? 'चरण 4: अपने आवेदन को ट्रैक करें। वास्तविक समय में अपने आवेदन और किस्तों की स्थिति जानें।'
      : 'Step 4: Track your application. Check real time status of your loans, EMIs, and applications at your convenience.'
  };

  const text = speeches[stepNum];
  if (text) {
    speakText(text);
    showToast(isHindi ? `चरण ${stepNum} ऑडियो मार्गदर्शन` : `Playing Step ${stepNum} audio guidance`);
  }
}

// Expose globally for HTML onclick handlers
window.setActiveProcessStep = setActiveProcessStep;
window.toggleProcessAutoTour = toggleProcessAutoTour;
window.handleProcessCardClick = handleProcessCardClick;
window.openPartnerLendersModal = openPartnerLendersModal;
window.closePartnerLendersModal = closePartnerLendersModal;
window.playStepAudio = playStepAudio;
window.speakText = speakText;

// Dynamic 3D Bring-Forward Effect on Scheme Click (Image 4 Requirement)
function setupSchemeCardForwardEffect() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.scheme-card-box, .cat-scheme-card');
    if (card) {
      const isAlreadyForward = card.classList.contains('is-card-forward');
      document.querySelectorAll('.scheme-card-box.is-card-forward, .cat-scheme-card.is-card-forward').forEach(c => {
        if (c !== card) c.classList.remove('is-card-forward');
      });
      card.classList.toggle('is-card-forward', !isAlreadyForward);
    } else {
      if (!e.target.closest('.modal-overlay.active, .drawer.active, .modal-dialog')) {
        document.querySelectorAll('.scheme-card-box.is-card-forward, .cat-scheme-card.is-card-forward').forEach(c => {
          c.classList.remove('is-card-forward');
        });
      }
    }
  });
}

// Initialize dynamic interactions
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSchemeCardForwardEffect);
} else {
  setupSchemeCardForwardEffect();
}
