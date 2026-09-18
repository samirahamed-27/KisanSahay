/**
 * Secure Farmer Document Vault Service
 * Supports Word, Number PIN, and Pattern Lock encryption for sensitive agricultural documents.
 * Employs AES-256-GCM authenticated encryption with PBKDF2 key derivation.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VAULT_FILE_PRIMARY = path.join(__dirname, '..', '..', 'Data', 'Data', 'user_documents_vault.json');
const VAULT_FILE_BACKUP = path.join(__dirname, '..', 'data', 'userDocumentsVault.json');

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Derives a 32-byte encryption key from user's chosen password and salt
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256');
}

/**
 * Reads the vault store from disk
 */
function readVaultStore() {
  try {
    if (fs.existsSync(VAULT_FILE_PRIMARY)) {
      return JSON.parse(fs.readFileSync(VAULT_FILE_PRIMARY, 'utf8'));
    }
    if (fs.existsSync(VAULT_FILE_BACKUP)) {
      return JSON.parse(fs.readFileSync(VAULT_FILE_BACKUP, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading vault file:', err);
  }
  return {};
}

/**
 * Saves the vault store to disk
 */
function writeVaultStore(data) {
  try {
    ensureDirectoryExists(VAULT_FILE_PRIMARY);
    fs.writeFileSync(VAULT_FILE_PRIMARY, JSON.stringify(data, null, 2));

    ensureDirectoryExists(VAULT_FILE_BACKUP);
    fs.writeFileSync(VAULT_FILE_BACKUP, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing vault file:', err);
    return false;
  }
}

/**
 * Encrypts and saves farmer documents into the vault
 * @param {string} userId - Identifier (e.g. 'default-farmer' or phone/Aadhaar)
 * @param {Object} documents - Document data object
 * @param {string} password - User created password (word, number PIN, or pattern string)
 * @param {string} passwordType - 'word' | 'number' | 'pattern'
 */
function saveUserVault(userId = 'default-farmer', documents = {}, password, passwordType = 'word') {
  if (!password || String(password).trim().length === 0) {
    throw new Error('A valid password, PIN, or pattern is required to secure your documents.');
  }

  const cleanPass = String(password).trim();
  const validTypes = ['word', 'number', 'pattern'];
  const pType = validTypes.includes(passwordType) ? passwordType : 'word';

  // Specific validation per password type
  if (pType === 'number' && !/^\d{4,8}$/.test(cleanPass)) {
    throw new Error('Number password must be a 4 to 8 digit numeric PIN.');
  }
  if (pType === 'pattern' && cleanPass.length < 3) {
    throw new Error('Pattern password must connect at least 3 nodes on the 3x3 grid.');
  }
  if (pType === 'word' && cleanPass.length < 3) {
    throw new Error('Word password must be at least 3 characters long.');
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const key = deriveKey(cleanPass, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const jsonString = JSON.stringify({
    ...documents,
    securedAt: new Date().toISOString(),
    isVerified: true
  });

  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Compute a secure verifier hash to validate password without trial decryption
  const verifierHash = crypto.pbkdf2Sync(cleanPass, salt, 50000, 16, 'sha256').toString('hex');

  const store = readVaultStore();
  store[userId] = {
    userId,
    passwordType: pType,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag,
    encryptedData: encrypted,
    verifierHash,
    documentCount: Object.keys(documents).length,
    updatedAt: new Date().toISOString()
  };

  writeVaultStore(store);

  return {
    success: true,
    message: `Documents safely encrypted in Vault using ${pType.toUpperCase()} password.`,
    passwordType: pType,
    documentCount: Object.keys(documents).length,
    updatedAt: store[userId].updatedAt
  };
}

/**
 * Validates password and unlocks/decrypts farmer documents
 * @param {string} userId
 * @param {string} password
 */
function unlockUserVault(userId = 'default-farmer', password) {
  const store = readVaultStore();
  const userVault = store[userId];

  if (!userVault) {
    return {
      success: false,
      message: 'No document vault found for this account. Please upload documents to create a vault.'
    };
  }

  const cleanPass = String(password || '').trim();
  const salt = Buffer.from(userVault.salt, 'hex');

  // Verify hash
  const testHash = crypto.pbkdf2Sync(cleanPass, salt, 50000, 16, 'sha256').toString('hex');
  if (testHash !== userVault.verifierHash) {
    return {
      success: false,
      message: `Incorrect ${userVault.passwordType.toUpperCase()} password. Access denied.`
    };
  }

  try {
    const key = deriveKey(cleanPass, salt);
    const iv = Buffer.from(userVault.iv, 'hex');
    const authTag = Buffer.from(userVault.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(userVault.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const documents = JSON.parse(decrypted);

    return {
      success: true,
      message: 'Document Vault successfully unlocked.',
      passwordType: userVault.passwordType,
      documents
    };
  } catch (err) {
    return {
      success: false,
      message: 'Failed to decrypt vault: corrupted data or invalid password.'
    };
  }
}

/**
 * Returns whether a vault exists and its password type without revealing private data
 */
function getVaultStatus(userId = 'default-farmer') {
  const store = readVaultStore();
  const userVault = store[userId];

  if (!userVault) {
    return {
      hasVault: false,
      message: 'Vault not initialized'
    };
  }

  return {
    hasVault: true,
    passwordType: userVault.passwordType,
    documentCount: userVault.documentCount,
    updatedAt: userVault.updatedAt
  };
}

module.exports = {
  saveUserVault,
  unlockUserVault,
  getVaultStatus,
  deriveKey
};
