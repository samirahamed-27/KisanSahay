/**
 * KisanSahay — Voice Input & Advance Ask Me Engine
 * Supports 15 Indian Languages, Spoken Numbers to Digits Parsing,
 * and Voice-Guided Step-by-Step Form Entry for Indian Farmers.
 */

(function () {
  'use strict';

  // Language Code mapping for SpeechRecognition (BCP-47)
  const SPEECH_LANG_MAP = {
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

  // Indian Number Words Mapping
  const NUM_WORDS_EN = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
    lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000, crore: 10000000, crores: 10000000
  };

  const NUM_WORDS_HI = {
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6,
    'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10, 'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14,
    'पंद्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'तीस': 30,
    'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'सौ': 100,
    'हजार': 1000, 'हज़ार': 1000, 'लाख': 100000, 'करोड़': 10000000, 'करोड': 10000000,
    'आधा': 0.5, 'डेढ़': 1.5, 'ढाई': 2.5
  };

  /**
   * Convert spoken text containing numbers into numerical digits
   * Examples: "two point five" -> 2.5, "two acres" -> 2, "एक लाख" -> 100000
   */
  function convertSpokenNumberToDigits(text, lang = 'hi') {
    if (!text) return '';
    let cleaned = text.trim().toLowerCase();

    // Remove filler terms like "acres", "acre", "एकड़", "रुपये", "rupees", "rs"
    cleaned = cleaned.replace(/\b(acres|acre|hectares|hectare|rupees|rupee|rs|inr)\b/gi, '').trim();
    cleaned = cleaned.replace(/(एकड़|हेक्टेयर|रुपये|रुपया)/g, '').trim();

    // Check if directly a number string (e.g. "250000" or "3.5")
    const directNumMatch = cleaned.match(/^[0-9]+(\.[0-9]+)?$/);
    if (directNumMatch) {
      return parseFloat(directNumMatch[0]);
    }

    // Common fractions in Hindi
    if (cleaned === 'आधा') return 0.5;
    if (cleaned === 'डेढ़') return 1.5;
    if (cleaned === 'ढाई') return 2.5;

    // Check Hindi numbers parsing
    let total = 0;
    let current = 0;
    const hiTokens = cleaned.split(/[\s,]+/);
    let matchedHi = false;

    for (const t of hiTokens) {
      if (NUM_WORDS_HI[t] !== undefined) {
        matchedHi = true;
        const val = NUM_WORDS_HI[t];
        if (val === 10000000 || val === 100000 || val === 1000 || val === 100) {
          if (current === 0) current = 1;
          total += current * val;
          current = 0;
        } else {
          current += val;
        }
      } else if (!isNaN(parseFloat(t))) {
        matchedHi = true;
        current += parseFloat(t);
      }
    }
    if (matchedHi && (total > 0 || current > 0)) {
      return total + current;
    }

    // Check English numbers parsing
    const enTokens = cleaned.split(/[\s,]+/);
    let matchedEn = false;
    total = 0;
    current = 0;

    for (let i = 0; i < enTokens.length; i++) {
      const t = enTokens[i];
      if (t === 'point' && i + 1 < enTokens.length) {
        const nextVal = NUM_WORDS_EN[enTokens[i + 1]] || parseFloat(enTokens[i + 1]);
        if (!isNaN(nextVal)) {
          current = parseFloat(`${current}.${nextVal}`);
          i++;
          matchedEn = true;
          continue;
        }
      }

      if (NUM_WORDS_EN[t] !== undefined) {
        matchedEn = true;
        const val = NUM_WORDS_EN[t];
        if (val === 10000000 || val === 100000 || val === 1000 || val === 100) {
          if (current === 0) current = 1;
          total += current * val;
          current = 0;
        } else {
          current += val;
        }
      } else if (!isNaN(parseFloat(t))) {
        matchedEn = true;
        current += parseFloat(t);
      }
    }

    if (matchedEn && (total > 0 || current > 0)) {
      return total + current;
    }

    // Fallback: extract any digits found in string
    const match = cleaned.match(/[0-9]+(\.[0-9]+)?/);
    if (match) {
      return parseFloat(match[0]);
    }

    return text;
  }

  /**
   * Parse affirmative / negative response for Yes/No fields
   */
  function parseYesNo(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    const yesList = [
      'yes', 'yeah', 'yep', 'correct', 'true', 'done',
      'हाँ', 'हा', 'हाँजी', 'हां', 'सही', 'बिल्कुल',
      'ஆமாம்', 'ஆம்', 'ಹೌದು', 'ಅವುನು', 'होय', 'हो', 'হ্যাঁ', 'હા', 'ਹਾਂ'
    ];
    const noList = [
      'no', 'nope', 'not', 'false', 'never',
      'नहीं', 'ना', 'नही', 'नाही',
      'இல்லை', 'ಇಲ್ಲ', 'కాదు', 'লেদ', 'না', 'ના', 'ਨਹੀਂ'
    ];

    for (const y of yesList) {
      if (lower.includes(y)) return 'yes';
    }
    for (const n of noList) {
      if (lower.includes(n)) return 'no';
    }
    return null;
  }

  // Active Speech Recognition instance
  let activeRecognition = null;
  let activeTargetInput = null;

  /**
   * Start Speech Recognition for a specific target input field
   */
  function startListeningForField(inputEl, btnEl) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (window.showToast) {
        window.showToast('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      } else {
        alert('Voice input is not supported in this browser.');
      }
      return;
    }

    if (activeRecognition) {
      try {
        activeRecognition.abort();
      } catch (e) { }
      activeRecognition = null;
    }

    const currentLang = localStorage.getItem('kisansahay_lang') || 'hi';
    const bcpLang = SPEECH_LANG_MAP[currentLang] || 'hi-IN';

    const recognition = new SpeechRecognition();
    recognition.lang = bcpLang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    activeTargetInput = inputEl;

    // Show listening indicator on button
    btnEl.classList.add('listening');
    showVoiceStatusPill(`Listening in ${bcpLang}... Speak clearly / बोलिए...`, true);

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      showVoiceStatusPill(`Heard: "${transcript}"`, false);

      if (inputEl.type === 'number') {
        const parsed = convertSpokenNumberToDigits(transcript, currentLang);
        inputEl.value = isNaN(parsed) ? transcript : parsed;
      } else if (inputEl.tagName === 'SELECT') {
        const yn = parseYesNo(transcript);
        if (yn) {
          inputEl.value = yn;
        } else {
          // Check matching options
          for (let i = 0; i < inputEl.options.length; i++) {
            if (inputEl.options[i].text.toLowerCase().includes(transcript.toLowerCase()) ||
              inputEl.options[i].value.toLowerCase().includes(transcript.toLowerCase())) {
              inputEl.selectedIndex = i;
              break;
            }
          }
        }
      } else {
        inputEl.value = transcript;
      }

      // Trigger standard change and input events
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));

      if (window.showToast) {
        window.showToast(`🎤 Recognized: "${inputEl.value}"`);
      }
    };

    recognition.onerror = function (event) {
      console.warn('SpeechRecognition error:', event.error);
      hideVoiceStatusPill();
      btnEl.classList.remove('listening');
      if (event.error !== 'no-speech' && window.showToast) {
        window.showToast(`Microphone error: ${event.error}`);
      }
    };

    recognition.onend = function () {
      btnEl.classList.remove('listening');
      setTimeout(hideVoiceStatusPill, 2000);
      activeRecognition = null;
    };

    activeRecognition = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      btnEl.classList.remove('listening');
      hideVoiceStatusPill();
    }
  }

  // Floating Voice Recognition Feedback Pill
  function showVoiceStatusPill(text, isListening) {
    let pill = document.getElementById('voice-status-pill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'voice-status-pill';
      pill.className = 'voice-status-pill';
      document.body.appendChild(pill);
    }
    pill.innerHTML = `
      <div class="voice-wave ${isListening ? 'active' : ''}">
        <span></span><span></span><span></span><span></span>
      </div>
      <span class="voice-pill-text">${text}</span>
    `;
    pill.classList.add('active');
  }

  function hideVoiceStatusPill() {
    const pill = document.getElementById('voice-status-pill');
    if (pill) {
      pill.classList.remove('active');
    }
  }

  // ==========================================================================
  // "Advance Ask Me" Voice-Guided Questionnaire Engine
  // ==========================================================================

  const VOICE_GUIDED_STEPS = [
    {
      id: 'crop',
      targetId: 'crop-input',
      type: 'text',
      prompt: {
        en: 'What primary crop do you cultivate? For example: Rice, Wheat, Cotton, or Sugarcane.',
        hi: 'आप मुख्य रूप से कौन सी फसल उगाते हैं? जैसे धान, गेहूं, कपास, या गन्ना।'
      }
    },
    {
      id: 'land',
      targetId: 'land-size-input',
      type: 'number',
      prompt: {
        en: 'How many acres is your agricultural land holding? For example: 2.5 acres, or 5 acres.',
        hi: 'आपकी कृषि भूमि कितने एकड़ है? जैसे दो एकड़, या पांच एकड़।'
      }
    },
    {
      id: 'state',
      targetId: 'state-input',
      type: 'text',
      prompt: {
        en: 'In which State is your farm located? For example: Punjab, Maharashtra, or Uttar Pradesh.',
        hi: 'आपका खेत किस राज्य में है? जैसे पंजाब, महाराष्ट्र, या उत्तर प्रदेश।'
      }
    },
    {
      id: 'district',
      targetId: 'district-input',
      type: 'text',
      prompt: {
        en: 'Which district or locality is your farm in? For example: Ludhiana, Pune, or Karnal.',
        hi: 'आपका खेत किस जिले में है? जैसे लुधियाना, पुणे, या करनाल।'
      }
    },
    {
      id: 'income',
      targetId: 'income-input',
      type: 'number',
      prompt: {
        en: 'What is your estimated annual farm income in rupees? For example: Two Lakh, or 50,000.',
        hi: 'आपकी अनुमानित वार्षिक कृषि आय कितने रुपये है? जैसे दो लाख, या पचास हजार रुपये।'
      }
    },
    {
      id: 'existingLoans',
      targetId: 'existing-loans-input',
      type: 'number',
      prompt: {
        en: 'What is your current outstanding debt or existing loan balance in rupees? Say zero if debt-free.',
        hi: 'आपका वर्तमान बकाया ऋण या कर्ज कितने रुपये है? यदि कोई कर्ज नहीं है तो शून्य बोलें।'
      }
    },
    {
      id: 'aadhaar',
      targetId: 'aadhaar-status-select',
      type: 'yesno',
      prompt: {
        en: 'Is your Aadhaar card linked with your bank account? Say Yes or No.',
        hi: 'क्या आपका आधार कार्ड आपके बैंक खाते से लिंक है? हाँ या नहीं बोलिए।'
      }
    }
  ];

  class VoiceGuidedAssistant {
    constructor() {
      this.currentStep = 0;
      this.isListening = false;
      this.modalEl = null;
      this.recognition = null;
    }

    initModal() {
      if (document.getElementById('voice-guided-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'voice-guided-modal';
      modal.className = 'modal-overlay voice-guided-overlay';
      modal.innerHTML = `
        <div class="modal-dialog voice-guided-dialog">
          <div class="voice-dialog-header">
            <div class="voice-assistant-badge">
              <span class="pulse-ring"></span>
              <span class="bot-icon">🎙️</span>
              <div>
                <strong>Advance Ask Me Assistant</strong>
                <div class="voice-subtext">Voice-Guided Farmers Eligibility Mode</div>
              </div>
            </div>
            <button class="modal-close-x" id="btn-close-voice-guided">✕</button>
          </div>

          <div class="voice-step-progress">
            <div class="voice-progress-bar" id="voice-progress-fill" style="width: 14%;"></div>
          </div>

          <div class="voice-dialog-body">
            <div class="voice-prompt-card">
              <div class="voice-step-indicator" id="voice-step-indicator">Step 1 of 7</div>
              <h3 class="voice-question-text" id="voice-question-text">Listening...</h3>
              <div class="voice-helper-tip" id="voice-helper-tip">Speak clearly after the beep</div>
            </div>

            <!-- Listening Visualizer Animation -->
            <div class="voice-visualizer-container" id="voice-visualizer">
              <div class="vbar"></div><div class="vbar"></div><div class="vbar"></div>
              <div class="vbar"></div><div class="vbar"></div><div class="vbar"></div>
              <div class="vbar"></div><div class="vbar"></div>
            </div>

            <div class="voice-response-box">
              <span class="resp-label">Recognized Answer:</span>
              <span class="resp-value" id="voice-recognized-value">—</span>
            </div>
          </div>

          <div class="voice-dialog-footer">
            <button type="button" class="btn-voice-nav" id="btn-voice-prev" disabled>◀ Previous</button>
            <button type="button" class="btn-voice-action" id="btn-voice-speak-now">
              <span>🎤</span> <span id="voice-btn-status-label">Tap to Speak</span>
            </button>
            <button type="button" class="btn-voice-nav" id="btn-voice-next">Skip / Next ▶</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btn-close-voice-guided').addEventListener('click', () => this.close());
      document.getElementById('btn-voice-prev').addEventListener('click', () => this.previousStep());
      document.getElementById('btn-voice-next').addEventListener('click', () => this.nextStep());
      document.getElementById('btn-voice-speak-now').addEventListener('click', () => this.triggerListen());
    }

    open() {
      this.initModal();
      this.currentStep = 0;
      const modal = document.getElementById('voice-guided-modal');
      modal.classList.add('active');
      this.runStep(0);
    }

    close() {
      const modal = document.getElementById('voice-guided-modal');
      if (modal) modal.classList.remove('active');
      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) { }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }

    runStep(stepIdx) {
      if (stepIdx >= VOICE_GUIDED_STEPS.length) {
        this.completeFlow();
        return;
      }

      this.currentStep = stepIdx;
      const step = VOICE_GUIDED_STEPS[stepIdx];
      const lang = localStorage.getItem('kisansahay_lang') || 'hi';
      const promptText = (step.prompt[lang] || step.prompt['hi'] || step.prompt['en']);

      // Update UI elements
      const progressFill = document.getElementById('voice-progress-fill');
      const stepIndicator = document.getElementById('voice-step-indicator');
      const questionText = document.getElementById('voice-question-text');
      const recognizedValue = document.getElementById('voice-recognized-value');
      const prevBtn = document.getElementById('btn-voice-prev');

      if (progressFill) progressFill.style.width = `${Math.round(((stepIdx + 1) / VOICE_GUIDED_STEPS.length) * 100)}%`;
      if (stepIndicator) stepIndicator.textContent = `Step ${stepIdx + 1} of ${VOICE_GUIDED_STEPS.length}`;
      if (questionText) questionText.textContent = promptText;
      if (recognizedValue) recognizedValue.textContent = 'Listening...';
      if (prevBtn) prevBtn.disabled = stepIdx === 0;

      // Speak prompt using natural TTS or speechSynthesis
      if (window.speakKisanText) {
        window.speakKisanText(promptText, lang, () => {
          this.triggerListen();
        });
      } else {
        this.triggerListen();
      }
    }

    triggerListen() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        document.getElementById('voice-recognized-value').textContent = 'Voice input not supported in this browser.';
        return;
      }

      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) { }
      }

      const currentLang = localStorage.getItem('kisansahay_lang') || 'hi';
      const bcpLang = SPEECH_LANG_MAP[currentLang] || 'hi-IN';

      const recognition = new SpeechRecognition();
      recognition.lang = bcpLang;
      recognition.continuous = false;
      recognition.interimResults = false;

      const visualizer = document.getElementById('voice-visualizer');
      const statusLabel = document.getElementById('voice-btn-status-label');
      if (visualizer) visualizer.classList.add('active');
      if (statusLabel) statusLabel.textContent = 'Listening... Speak now';

      const step = VOICE_GUIDED_STEPS[this.currentStep];

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const recognizedValue = document.getElementById('voice-recognized-value');
        const targetEl = document.getElementById(step.targetId);

        let finalValue = transcript;

        if (step.type === 'number') {
          const parsed = convertSpokenNumberToDigits(transcript, currentLang);
          finalValue = parsed;
          if (targetEl) targetEl.value = parsed;
        } else if (step.type === 'yesno') {
          const yn = parseYesNo(transcript);
          finalValue = yn === 'yes' ? 'Yes (हाँ)' : (yn === 'no' ? 'No (नहीं)' : transcript);
          if (targetEl && yn) {
            targetEl.value = yn;
          }
        } else {
          if (targetEl) targetEl.value = transcript;
        }

        if (targetEl) {
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (recognizedValue) {
          recognizedValue.textContent = `"${finalValue}"`;
        }

        // Advance to next question after 1.5s pause
        setTimeout(() => {
          this.nextStep();
        }, 1500);
      };

      recognition.onerror = (err) => {
        if (visualizer) visualizer.classList.remove('active');
        if (statusLabel) statusLabel.textContent = 'Tap to Speak';
        console.warn('Voice-guided recognition error:', err.error);
      };

      recognition.onend = () => {
        if (visualizer) visualizer.classList.remove('active');
        if (statusLabel) statusLabel.textContent = 'Tap to Speak';
      };

      this.recognition = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }

    previousStep() {
      if (this.currentStep > 0) {
        this.runStep(this.currentStep - 1);
      }
    }

    nextStep() {
      if (this.currentStep < VOICE_GUIDED_STEPS.length - 1) {
        this.runStep(this.currentStep + 1);
      } else {
        this.completeFlow();
      }
    }

    completeFlow() {
      this.close();
      if (window.showToast) {
        window.showToast('✅ Voice-guided questionnaire completed! Finding matching schemes...');
      }
      const submitBtn = document.getElementById('btn-submit-eligibility');
      if (submitBtn) {
        submitBtn.click();
      }
    }
  }

  // Export globally
  window.VoiceGuidedAssistant = new VoiceGuidedAssistant();
  window.startListeningForField = startListeningForField;
  window.convertSpokenNumberToDigits = convertSpokenNumberToDigits;
  window.parseYesNo = parseYesNo;

  // Auto-bind microphone buttons on inputs
  function bindInputMicrophoneButtons() {
    const micButtons = document.querySelectorAll('.btn-field-mic');
    micButtons.forEach((btn) => {
      const targetId = btn.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (targetInput && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          startListeningForField(targetInput, btn);
        });
      }
    });

    const askMeBtn = document.getElementById('btn-launch-ask-me');
    if (askMeBtn && !askMeBtn.dataset.bound) {
      askMeBtn.dataset.bound = 'true';
      askMeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.VoiceGuidedAssistant.open();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindInputMicrophoneButtons);
  } else {
    bindInputMicrophoneButtons();
  }

  window.bindInputMicrophoneButtons = bindInputMicrophoneButtons;
})();
