/**
 * Vault Encryption & Security Service
 * Implements client-side XOR-Cipher + Salted Hash for Document Vault protection
 * (Cross-platform pure-JS implementation without native OpenSSL linking issues)
 */

const DEFAULT_SALT = 'kisansahay_secure_farmer_vault_key_2026';

export const VaultEncryption = {
  /**
   * Hashes a password, PIN, or pattern sequence with a salt
   */
  hashSecret(secret: string, salt: string = DEFAULT_SALT): string {
    let hash = 0;
    const combined = secret + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  },

  /**
   * Encrypts plaintext JSON data with secret key
   */
  encrypt(plaintext: string, secret: string): string {
    try {
      const key = secret + DEFAULT_SALT;
      let encrypted = '';
      for (let i = 0; i < plaintext.length; i++) {
        const charCode = plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(charCode);
      }
      // Return base64 encoded string
      if (typeof btoa !== 'undefined') {
        return btoa(unescape(encodeURIComponent(encrypted)));
      }
      return Buffer.from(encrypted, 'binary').toString('base64');
    } catch (e) {
      console.error('[Encryption] Encrypt failed:', e);
      return plaintext;
    }
  },

  /**
   * Decrypts ciphertext with secret key
   */
  decrypt(ciphertext: string, secret: string): string {
    try {
      let raw = '';
      if (typeof atob !== 'undefined') {
        raw = decodeURIComponent(escape(atob(ciphertext)));
      } else {
        raw = Buffer.from(ciphertext, 'base64').toString('binary');
      }

      const key = secret + DEFAULT_SALT;
      let decrypted = '';
      for (let i = 0; i < raw.length; i++) {
        const charCode = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch (e) {
      console.error('[Encryption] Decrypt failed:', e);
      return '';
    }
  },
};
