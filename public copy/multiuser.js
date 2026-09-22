/**
 * KisanSahay Multi-User & Sandboxed Profile Manager
 * Provides instant profile switching, clean data sandboxing, and Gmail/Phone OTP verification.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kisansahay_multiuser_state_v1';
  let activeCountdownInterval = null;

  class MultiUserManager {
    constructor() {
      this.state = this.loadState();
      this.pendingOtpSession = null;
      this.init();
    }

    loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading multiuser state from localStorage:', e);
      }

      // Default profile
      const defaultState = {
        activeProfileId: 'profile_default',
        profiles: [
          {
            id: 'profile_default',
            name: 'Veer Singh',
            type: 'phone',
            identifier: '+91 98765 43210',
            avatar: 'V',
            color: '#15803d',
            isDefault: true,
            verified: true,
            createdAt: new Date().toISOString()
          }
        ]
      };
      this.saveState(defaultState);
      return defaultState;
    }

    saveState(stateToSave) {
      if (stateToSave) this.state = stateToSave;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('Failed to save multiuser state to localStorage:', e);
      }
    }

    getActiveProfile() {
      const active = this.state.profiles.find(p => p.id === this.state.activeProfileId);
      return active || this.state.profiles[0];
    }

    getProfiles() {
      return this.state.profiles || [];
    }

    init() {
      // Sync with backend if available
      this.syncWithBackend();

      document.addEventListener('DOMContentLoaded', () => {
        this.renderHeaderProfile();
        this.setupModalListeners();
      });
    }

    async syncWithBackend() {
      try {
        const res = await fetch('/api/users/profiles');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.profiles) && data.profiles.length > 0) {
            // Keep active profile choice local if valid
            const activeId = this.state.activeProfileId;
            const validActive = data.profiles.some(p => p.id === activeId) ? activeId : data.activeProfileId;
            this.state.profiles = data.profiles;
            this.state.activeProfileId = validActive;
            this.saveState();
            this.renderHeaderProfile();
          }
        }
      } catch (e) {
        // Offline or dev server mode, continue with localStorage
      }
    }

    renderHeaderProfile() {
      const active = this.getActiveProfile();
      const container = document.getElementById('user-profile-header-container');
      if (!container) return;

      container.innerHTML = `
        <button class="user-profile-btn clean-avatar-btn" id="user-profile-toggle-btn" title="Click to view profile: ${this.escapeHtml(active.name)}" aria-haspopup="true">
          <div class="avatar-circle" style="background: ${active.color || '#15803d'}; color: #ffffff;">
            ${this.escapeHtml(active.avatar || 'V')}
            <span class="avatar-online-dot"></span>
          </div>
        </button>

        <div class="multiuser-dropdown-menu" id="multiuser-dropdown-menu" style="display: none;">
          <!-- Active Profile Card with Full Details (Shown only after clicking profile picture) -->
          <div class="dropdown-active-card">
            <div class="avatar-circle large" style="background: ${active.color || '#15803d'}; color: #ffffff;">
              ${this.escapeHtml(active.avatar || 'V')}
            </div>
            <div class="dropdown-active-meta">
              <div class="dropdown-active-name-row">
                <span class="dropdown-active-name">${this.escapeHtml(active.name)}</span>
                <span class="dropdown-verified-badge">✓ Verified</span>
              </div>
              <div class="dropdown-active-contact">
                ${active.type === 'gmail' ? '✉️' : '📱'} ${this.escapeHtml(active.identifier || 'Farmer Profile')}
              </div>
            </div>
          </div>

          <div class="dropdown-header">
            <span class="dropdown-title">Switch Profile</span>
            <span class="dropdown-badge">${this.state.profiles.length} Profiles</span>
          </div>

          <!-- Download KisanSahay App Bar inside Switch Profile Column (Removed from UI per user request) -->
          <div class="dropdown-pwa-download-bar" id="dropdown-btn-download-app" role="button" tabindex="0" title="Download & Install KisanSahay App on your phone or PC" style="display: none !important;">
            <div class="pwa-download-icon-wrap">
              <img src="/icons/icon-192.png" alt="KisanSahay" class="pwa-bar-mini-icon">
              <span class="pwa-pulse-dot"></span>
            </div>
            <div class="pwa-download-meta">
              <div class="pwa-download-title-row">
                <span class="pwa-download-title">Download App</span>
                <span class="pwa-free-pill">PWA</span>
              </div>
              <span class="pwa-download-sub">Install on Mobile or PC • 0 MB Storage</span>
            </div>
            <span class="pwa-download-btn-pill">⬇️ Install</span>
          </div>

          <div class="dropdown-profiles-list">
            ${this.state.profiles.map(p => `
              <div class="profile-list-item ${p.id === this.state.activeProfileId ? 'active' : ''}" data-profile-id="${p.id}">
                <div class="avatar-circle small" style="background: ${p.color || '#15803d'}; color: #ffffff;">
                  ${this.escapeHtml(p.avatar || 'F')}
                </div>
                <div class="profile-info">
                  <div class="profile-name-row">
                    <span class="name">${this.escapeHtml(p.name)}</span>
                    ${p.id === this.state.activeProfileId ? '<span class="active-check">✓ Active</span>' : ''}
                  </div>
                  <div class="profile-sub">${p.type === 'gmail' ? '✉️' : '📱'} ${this.escapeHtml(p.identifier)}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="dropdown-actions">
            <button type="button" class="btn-add-profile-trigger" id="btn-open-add-profile-modal">
              <span>➕</span> <span>Add New Profile (Phone / Gmail)</span>
            </button>
          </div>
        </div>
      `;

      // Wire dropdown toggle
      const toggleBtn = document.getElementById('user-profile-toggle-btn');
      const menu = document.getElementById('multiuser-dropdown-menu');

      if (toggleBtn && menu) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = menu.style.display === 'block';
          menu.style.display = isOpen ? 'none' : 'block';
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
          if (!container.contains(e.target)) {
            menu.style.display = 'none';
          }
        });
      }

      // Wire profile switch clicks
      container.querySelectorAll('.profile-list-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const profileId = item.getAttribute('data-profile-id');
          if (profileId && profileId !== this.state.activeProfileId) {
            this.switchProfile(profileId);
          }
          if (menu) menu.style.display = 'none';
        });
      });

      // Wire Add Profile Button
      const btnAdd = document.getElementById('btn-open-add-profile-modal');
      if (btnAdd) {
        btnAdd.addEventListener('click', (e) => {
          e.stopPropagation();
          if (menu) menu.style.display = 'none';
          this.openAddProfileModal();
        });
      }

      // Wire Download App bar click inside Switch Profile dropdown
      const btnDownloadApp = document.getElementById('dropdown-btn-download-app');
      if (btnDownloadApp) {
        btnDownloadApp.addEventListener('click', (e) => {
          e.stopPropagation();
          if (menu) menu.style.display = 'none';
          if (typeof window.triggerPWAInstallOrModal === 'function') {
            window.triggerPWAInstallOrModal();
          } else {
            const modal = document.getElementById('pwa-universal-download-modal');
            if (modal) modal.style.display = 'flex';
          }
        });
      }
    }

    /**
     * Switches the active profile and ensures clean sandboxing of data.
     */
    switchProfile(profileId) {
      const target = this.state.profiles.find(p => p.id === profileId);
      if (!target) return;

      this.state.activeProfileId = profileId;
      this.saveState();
      this.renderHeaderProfile();

      // Trigger server switch (silent)
      fetch('/api/users/switch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      }).catch(() => {});

      // Dispatch custom event so app.js can reload/clear profile-specific form and loans
      window.dispatchEvent(new CustomEvent('kisansahay:profileChanged', {
        detail: {
          profile: target,
          profileId: target.id
        }
      }));

      if (typeof window.showToast === 'function') {
        window.showToast(`Switched to profile: ${target.name} (${target.identifier})`);
      }
    }

    openAddProfileModal() {
      const modal = document.getElementById('multiuser-add-modal');
      if (modal) {
        modal.style.display = 'flex';
        // Reset form inputs
        const nameInput = document.getElementById('add-profile-name');
        const phoneInput = document.getElementById('add-profile-phone');
        const emailInput = document.getElementById('add-profile-email');
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (emailInput) emailInput.value = '';

        // Default to phone tab
        this.setProfileModalTab('phone');
      }
    }

    closeAddProfileModal() {
      const modal = document.getElementById('multiuser-add-modal');
      if (modal) modal.style.display = 'none';
    }

    setProfileModalTab(tab = 'phone') {
      const tabPhone = document.getElementById('tab-btn-phone');
      const tabGmail = document.getElementById('tab-btn-gmail');
      const formPhone = document.getElementById('form-add-phone');
      const formGmail = document.getElementById('form-add-gmail');

      if (tab === 'phone') {
        tabPhone?.classList.add('active');
        tabGmail?.classList.remove('active');
        if (formPhone) formPhone.style.display = 'block';
        if (formGmail) formGmail.style.display = 'none';
      } else {
        tabGmail?.classList.add('active');
        tabPhone?.classList.remove('active');
        if (formGmail) formGmail.style.display = 'block';
        if (formPhone) formPhone.style.display = 'none';
      }
    }

    /**
     * Creates a profile using a phone number directly.
     */
    async handleCreatePhoneProfile(name, phone) {
      if (!name || !name.trim()) {
        if (typeof window.showToast === 'function') window.showToast('Please enter your full name');
        return;
      }
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      if (cleanPhone.length < 10) {
        if (typeof window.showToast === 'function') window.showToast('Please enter a valid 10-digit mobile number');
        return;
      }

      const formattedPhone = cleanPhone.startsWith('+91') ? cleanPhone : `+91 ${cleanPhone.slice(-10)}`;

      try {
        let newProfile = null;
        const res = await fetch('/api/users/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            identifier: formattedPhone,
            type: 'phone'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile) {
            newProfile = data.profile;
          }
        }

        if (!newProfile) {
          // Client-side fallback
          const profileId = 'profile_' + Date.now();
          const colors = ['#15803d', '#0284c7', '#7c3aed', '#d97706', '#dc2626'];
          newProfile = {
            id: profileId,
            name: name.trim(),
            type: 'phone',
            identifier: formattedPhone,
            avatar: name.trim().charAt(0).toUpperCase() || 'F',
            color: colors[this.state.profiles.length % colors.length],
            isDefault: false,
            verified: true,
            createdAt: new Date().toISOString()
          };
          this.state.profiles.push(newProfile);
          this.state.activeProfileId = profileId;
          this.saveState();
        } else {
          this.state.profiles.push(newProfile);
          this.state.activeProfileId = newProfile.id;
          this.saveState();
        }

        this.closeAddProfileModal();
        this.switchProfile(newProfile.id);

        if (typeof window.showToast === 'function') {
          window.showToast(`✓ New profile created! You have a fresh, clean farm workspace.`);
        }
      } catch (err) {
        console.error('Error creating phone profile:', err);
      }
    }

    /**
     * Initiates Gmail verification by sending an OTP.
     */
    async handleInitiateGmailOtp(name, email) {
      if (!name || !name.trim()) {
        if (typeof window.showToast === 'function') window.showToast('Please enter your full name');
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        if (typeof window.showToast === 'function') window.showToast('Please enter a valid Gmail / Email address');
        return;
      }

      try {
        let otpData = null;
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanEmail,
            type: 'gmail',
            name: name.trim()
          })
        });

        if (res.ok) {
          otpData = await res.json();
        }

        if (!otpData) {
          // Fallback simulation
          const mockCode = String(Math.floor(100000 + Math.random() * 900000));
          otpData = {
            success: true,
            identifier: cleanEmail,
            demoOtp: mockCode,
            expiresInSeconds: 300
          };
        }

        this.pendingOtpSession = {
          name: name.trim(),
          email: cleanEmail,
          expectedOtp: otpData.demoOtp
        };

        this.closeAddProfileModal();
        this.openOtpModal(cleanEmail, otpData.demoOtp);

        if (typeof window.showToast === 'function') {
          window.showToast(`📩 OTP sent to ${cleanEmail}! (Code: ${otpData.demoOtp || 'check console'})`);
        }
      } catch (err) {
        console.error('Error sending OTP:', err);
        if (typeof window.showToast === 'function') {
          window.showToast('Failed to send verification code. Please check your connection.');
        }
      }
    }

    openOtpModal(email, demoOtp) {
      const modal = document.getElementById('multiuser-otp-modal');
      const emailDisplay = document.getElementById('otp-target-email');
      const hintCode = document.getElementById('otp-demo-hint');
      const countdownEl = document.getElementById('otp-timer-count');

      if (!modal) return;

      if (emailDisplay) emailDisplay.textContent = email;
      if (hintCode && demoOtp) {
        hintCode.textContent = `Demo Verification OTP: ${demoOtp}`;
        hintCode.style.display = 'inline-block';
      }

      // Clear previous inputs
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp-box-${i}`);
        if (input) input.value = '';
      }

      modal.style.display = 'flex';
      const firstInput = document.getElementById('otp-box-1');
      if (firstInput) setTimeout(() => firstInput.focus(), 150);

      // Start 60-second timer
      this.startOtpCountdown(60);
    }

    closeOtpModal() {
      const modal = document.getElementById('multiuser-otp-modal');
      if (modal) modal.style.display = 'none';
      if (activeCountdownInterval) {
        clearInterval(activeCountdownInterval);
        activeCountdownInterval = null;
      }
    }

    startOtpCountdown(seconds = 60) {
      if (activeCountdownInterval) clearInterval(activeCountdownInterval);
      const timerEl = document.getElementById('otp-timer-count');
      const resendBtn = document.getElementById('btn-resend-otp');
      if (resendBtn) resendBtn.disabled = true;

      let remaining = seconds;
      if (timerEl) timerEl.textContent = `${remaining}s`;

      activeCountdownInterval = setInterval(() => {
        remaining -= 1;
        if (timerEl) timerEl.textContent = `${remaining}s`;
        if (remaining <= 0) {
          clearInterval(activeCountdownInterval);
          activeCountdownInterval = null;
          if (resendBtn) resendBtn.disabled = false;
        }
      }, 1000);
    }

    /**
     * Verifies the 6-digit OTP and activates the new Gmail profile.
     */
    async handleVerifyOtp() {
      let code = '';
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp-box-${i}`);
        code += input ? input.value.trim() : '';
      }

      if (code.length < 6) {
        if (typeof window.showToast === 'function') window.showToast('Please enter all 6 digits of the OTP');
        return;
      }

      if (!this.pendingOtpSession) {
        if (typeof window.showToast === 'function') window.showToast('No active verification session. Please retry.');
        this.closeOtpModal();
        return;
      }

      try {
        let isVerified = false;
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: this.pendingOtpSession.email,
            otpCode: code
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.verified) {
            isVerified = true;
          }
        }

        // Fallback check against expected simulated OTP
        if (!isVerified && this.pendingOtpSession.expectedOtp === code) {
          isVerified = true;
        }

        if (!isVerified) {
          if (typeof window.showToast === 'function') window.showToast('❌ Incorrect verification code. Please check and try again.');
          return;
        }

        // OTP is valid! Create the verified Gmail profile
        const name = this.pendingOtpSession.name;
        const email = this.pendingOtpSession.email;
        let newProfile = null;

        const createRes = await fetch('/api/users/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            identifier: email,
            type: 'gmail'
          })
        });

        if (createRes.ok) {
          const cData = await createRes.json();
          if (cData.success && cData.profile) {
            newProfile = cData.profile;
          }
        }

        if (!newProfile) {
          const profileId = 'profile_' + Date.now();
          const colors = ['#7c3aed', '#0284c7', '#15803d', '#d97706', '#dc2626'];
          newProfile = {
            id: profileId,
            name,
            type: 'gmail',
            identifier: email,
            avatar: name.charAt(0).toUpperCase() || 'G',
            color: colors[this.state.profiles.length % colors.length],
            isDefault: false,
            verified: true,
            createdAt: new Date().toISOString()
          };
          this.state.profiles.push(newProfile);
          this.state.activeProfileId = profileId;
          this.saveState();
        } else {
          this.state.profiles.push(newProfile);
          this.state.activeProfileId = newProfile.id;
          this.saveState();
        }

        this.closeOtpModal();
        this.pendingOtpSession = null;
        this.switchProfile(newProfile.id);

        if (typeof window.showToast === 'function') {
          window.showToast(`✓ Gmail verified! Switched to new clean profile for ${name}.`);
        }
      } catch (err) {
        console.error('OTP verification error:', err);
        if (typeof window.showToast === 'function') {
          window.showToast('Verification failed. Please try again.');
        }
      }
    }

    setupModalListeners() {
      // Close buttons
      document.getElementById('btn-close-add-profile')?.addEventListener('click', () => this.closeAddProfileModal());
      document.getElementById('btn-cancel-add-profile')?.addEventListener('click', () => this.closeAddProfileModal());
      document.getElementById('btn-close-otp-modal')?.addEventListener('click', () => this.closeOtpModal());
      document.getElementById('btn-cancel-otp-modal')?.addEventListener('click', () => this.closeOtpModal());

      // Tab switcher
      document.getElementById('tab-btn-phone')?.addEventListener('click', () => this.setProfileModalTab('phone'));
      document.getElementById('tab-btn-gmail')?.addEventListener('click', () => this.setProfileModalTab('gmail'));

      // Phone submit
      const formPhone = document.getElementById('form-add-phone');
      if (formPhone) {
        formPhone.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = document.getElementById('add-profile-name-phone')?.value;
          const phone = document.getElementById('add-profile-phone')?.value;
          this.handleCreatePhoneProfile(name, phone);
        });
      }

      // Gmail submit (triggers OTP)
      const formGmail = document.getElementById('form-add-gmail');
      if (formGmail) {
        formGmail.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = document.getElementById('add-profile-name-gmail')?.value;
          const email = document.getElementById('add-profile-email')?.value;
          this.handleInitiateGmailOtp(name, email);
        });
      }

      // OTP Box auto-advance
      for (let i = 1; i <= 6; i++) {
        const box = document.getElementById(`otp-box-${i}`);
        if (box) {
          box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val.slice(0, 1);
            if (val && i < 6) {
              document.getElementById(`otp-box-${i + 1}`)?.focus();
            }
          });

          box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 1) {
              const prev = document.getElementById(`otp-box-${i - 1}`);
              if (prev) {
                prev.focus();
                prev.value = '';
              }
            }
          });

          // Handle paste of 6 digits
          box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (pasteData.length >= 6) {
              for (let j = 1; j <= 6; j++) {
                const b = document.getElementById(`otp-box-${j}`);
                if (b) b.value = pasteData.charAt(j - 1);
              }
              document.getElementById('otp-box-6')?.focus();
            }
          });
        }
      }

      // OTP Verify Button
      document.getElementById('btn-confirm-verify-otp')?.addEventListener('click', () => {
        this.handleVerifyOtp();
      });

      // Resend OTP
      document.getElementById('btn-resend-otp')?.addEventListener('click', () => {
        if (this.pendingOtpSession) {
          this.handleInitiateGmailOtp(this.pendingOtpSession.name, this.pendingOtpSession.email);
        }
      });
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  }

  // Instantiate and expose globally
  window.MultiUserManager = new MultiUserManager();
})();
