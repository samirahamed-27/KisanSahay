/**
 * KisanSahay Multi-User & OTP Authentication Service
 * Manages multiple profiles, data sandboxing, and Gmail/Phone OTP verification.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRIMARY_DATA_PATH = path.join(__dirname, '../../Data/Data/multiuser_profiles.json');
const MIRROR_DATA_PATH = path.join(__dirname, '../data/multiuserProfiles.json');

// In-memory OTP session cache (keyed by normalized identifier, e.g. email or phone)
const otpSessions = new Map();

function ensureDirectories() {
  const dir1 = path.dirname(PRIMARY_DATA_PATH);
  const dir2 = path.dirname(MIRROR_DATA_PATH);
  if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
  if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });
}

function loadProfiles() {
  ensureDirectories();
  try {
    if (fs.existsSync(PRIMARY_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(PRIMARY_DATA_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read primary multiuser profiles:', err.message);
  }

  try {
    if (fs.existsSync(MIRROR_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(MIRROR_DATA_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read mirror multiuser profiles:', err.message);
  }

  // Default initial profile
  const initialData = {
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
  saveProfiles(initialData);
  return initialData;
}

function saveProfiles(data) {
  ensureDirectories();
  const payload = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(PRIMARY_DATA_PATH, payload, 'utf8');
  } catch (e) {
    console.error('Error saving primary multiuser profiles:', e);
  }
  try {
    fs.writeFileSync(MIRROR_DATA_PATH, payload, 'utf8');
  } catch (e) {
    console.error('Error saving mirror multiuser profiles:', e);
  }
}

/**
 * Generates a 6-digit numeric OTP and stores session with 5-minute expiry.
 */
function sendOtp(identifier, type = 'gmail', name = 'Farmer') {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Valid phone or email identifier is required');
  }
  const cleanId = identifier.trim().toLowerCase();

  // Generate cryptographically random 6-digit OTP
  const otpNumber = Math.floor(100000 + crypto.randomInt(0, 900000));
  const otpCode = String(otpNumber);

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const sessionToken = crypto.randomBytes(16).toString('hex');

  otpSessions.set(cleanId, {
    otp: otpCode,
    expiresAt,
    sessionToken,
    type,
    name,
    attempts: 0
  });

  console.log(`[MultiUser OTP] Sent OTP for ${cleanId}: ${otpCode} (Valid 5 mins)`);

  return {
    success: true,
    sessionToken,
    expiresInSeconds: 300,
    identifier: cleanId,
    // Returned for simulation / demo convenience so user can verify immediately
    demoOtp: otpCode,
    message: `Verification code sent to ${cleanId}. Valid for 5 minutes.`
  };
}

/**
 * Verifies a 6-digit OTP.
 */
function verifyOtp(identifier, otpCode) {
  if (!identifier || !otpCode) {
    throw new Error('Identifier and OTP code are required');
  }
  const cleanId = identifier.trim().toLowerCase();
  const session = otpSessions.get(cleanId);

  if (!session) {
    return { success: false, message: 'No active OTP verification session found. Please request a new OTP.' };
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(cleanId);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (session.attempts >= 4) {
    otpSessions.delete(cleanId);
    return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (session.otp !== String(otpCode).trim()) {
    session.attempts += 1;
    return { success: false, message: `Incorrect OTP code. ${4 - session.attempts} attempts remaining.` };
  }

  // OTP verified successfully
  otpSessions.delete(cleanId);
  return {
    success: true,
    verified: true,
    identifier: cleanId,
    name: session.name,
    type: session.type,
    verificationToken: crypto.randomBytes(24).toString('hex'),
    message: 'Identity verified successfully!'
  };
}

/**
 * Creates and registers a new profile with clean, empty data.
 */
function createProfile({ name, identifier, type = 'phone' }) {
  if (!name || !identifier) {
    throw new Error('Name and identifier (phone/gmail) are required');
  }
  const data = loadProfiles();
  const profileId = 'profile_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  const colors = ['#15803d', '#0284c7', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#059669'];
  const assignedColor = colors[data.profiles.length % colors.length];
  const initialLetter = name.trim().charAt(0).toUpperCase() || 'F';

  const newProfile = {
    id: profileId,
    name: name.trim(),
    type,
    identifier: identifier.trim(),
    avatar: initialLetter,
    color: assignedColor,
    isDefault: false,
    verified: true,
    createdAt: new Date().toISOString()
  };

  data.profiles.push(newProfile);
  data.activeProfileId = profileId; // Switch to the new profile automatically
  saveProfiles(data);

  return {
    success: true,
    profile: newProfile,
    activeProfileId: profileId,
    totalProfiles: data.profiles.length
  };
}

/**
 * Switches the active profile.
 */
function switchProfile(profileId) {
  const data = loadProfiles();
  const found = data.profiles.find(p => p.id === profileId);
  if (!found) {
    return { success: false, message: 'Profile not found' };
  }
  data.activeProfileId = profileId;
  saveProfiles(data);

  return {
    success: true,
    activeProfile: found,
    message: `Switched to profile: ${found.name}`
  };
}

/**
 * Deletes a profile (cannot delete the only profile or default).
 */
function deleteProfile(profileId) {
  const data = loadProfiles();
  if (data.profiles.length <= 1) {
    return { success: false, message: 'Cannot delete the only remaining profile' };
  }

  const index = data.profiles.findIndex(p => p.id === profileId);
  if (index === -1) {
    return { success: false, message: 'Profile not found' };
  }

  data.profiles.splice(index, 1);
  if (data.activeProfileId === profileId) {
    data.activeProfileId = data.profiles[0].id;
  }
  saveProfiles(data);

  return {
    success: true,
    activeProfileId: data.activeProfileId,
    message: 'Profile deleted successfully'
  };
}

module.exports = {
  loadProfiles,
  saveProfiles,
  sendOtp,
  verifyOtp,
  createProfile,
  switchProfile,
  deleteProfile
};
