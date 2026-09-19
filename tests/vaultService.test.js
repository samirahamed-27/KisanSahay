const test = require('node:test');
const assert = require('node:assert/strict');
const {
  saveUserVault,
  unlockUserVault,
  resetUserVaultPassword,
  getVaultStatus
} = require('../src/services/vaultService');

test('Document Vault - Word password encryption and unlock', () => {
  const userId = 'test-farmer-word';
  const docs = {
    aadhaarNumber: 'XXXX-XXXX-4829',
    landRecordId: 'KHASRA-241/8',
    bankAccount: 'SBI-09823411',
    cropCertificate: 'Wheat-Kharif-2026'
  };

  const saveRes = saveUserVault(userId, docs, 'KisanSecret2026', 'word');
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.passwordType, 'word');

  const status = getVaultStatus(userId);
  assert.strictEqual(status.hasVault, true);
  assert.strictEqual(status.passwordType, 'word');

  // Correct unlock
  const unlockRes = unlockUserVault(userId, 'KisanSecret2026');
  assert.strictEqual(unlockRes.success, true);
  assert.strictEqual(unlockRes.documents.aadhaarNumber, 'XXXX-XXXX-4829');
  assert.strictEqual(unlockRes.documents.landRecordId, 'KHASRA-241/8');

  // Failed unlock with wrong password
  const failRes = unlockUserVault(userId, 'WrongPass123');
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.documents, undefined);
});

test('Document Vault - Number PIN encryption and unlock', () => {
  const userId = 'test-farmer-pin';
  const docs = {
    aadhaarNumber: 'XXXX-XXXX-9912',
    khasraNumber: '112/A'
  };

  const saveRes = saveUserVault(userId, docs, '5892', 'number');
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.passwordType, 'number');

  const unlockRes = unlockUserVault(userId, '5892');
  assert.strictEqual(unlockRes.success, true);
  assert.strictEqual(unlockRes.documents.khasraNumber, '112/A');

  const failRes = unlockUserVault(userId, '0000');
  assert.strictEqual(failRes.success, false);
});

test('Document Vault - 3x3 Pattern Lock encryption and unlock', () => {
  const userId = 'test-farmer-pattern';
  const docs = {
    aadhaarNumber: 'XXXX-XXXX-7788',
    panCard: 'ABCDE1234F'
  };

  const patternPath = '0-1-2-5-8'; // e.g. L-shape or diagonal pattern
  const saveRes = saveUserVault(userId, docs, patternPath, 'pattern');
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.passwordType, 'pattern');

  const unlockRes = unlockUserVault(userId, patternPath);
  assert.strictEqual(unlockRes.success, true);
  assert.strictEqual(unlockRes.documents.panCard, 'ABCDE1234F');

  const failRes = unlockUserVault(userId, '0-1-2-3');
  assert.strictEqual(failRes.success, false);
});

test('Document Vault - Strict exclusivity: Vault must open ONLY by saved password and not by anyone else', () => {
  const userId = 'farmer-strict-exclusive-test';
  const secretDocuments = {
    aadhaarNumber: '7891-2345-6789',
    khasraNumber: 'Khasra-889',
    privateToken: 'SECURE_VAULT_TOKEN_9999'
  };

  const userCustomPassword = 'MySecretFarmerPass@2026';
  const saveRes = saveUserVault(userId, secretDocuments, userCustomPassword, 'word');
  assert.strictEqual(saveRes.success, true);

  // 1. Must succeed with exact password
  const exactUnlock = unlockUserVault(userId, userCustomPassword);
  assert.strictEqual(exactUnlock.success, true);
  assert.strictEqual(exactUnlock.documents.privateToken, 'SECURE_VAULT_TOKEN_9999');

  // 2. Must FAIL with any other password, default password, empty, or variation
  const unauthorizedAttempts = [
    'Kisan@2025',             // old default
    'mysecretfarmerpass@2026', // wrong case
    'MySecretFarmerPass',      // missing symbol
    '123456',                  // common pin
    'password',                // generic
    ' ',                       // whitespace
    'MySecretFarmerPass@2027', // adjacent year
    'admin',
    'root'
  ];

  for (const attempt of unauthorizedAttempts) {
    const res = unlockUserVault(userId, attempt);
    assert.strictEqual(res.success, false, `Unauthorized password "${attempt}" must be rejected`);
    assert.strictEqual(res.documents, undefined, `Documents must NOT be exposed for "${attempt}"`);
  }
});

test('Document Vault - Reset password resets verifier and unlocks strictly with new password', () => {
  const userId = 'farmer-reset-test';
  const initialDocs = {
    aadhaarNumber: 'XXXX-XXXX-9900',
    khasra: 'KHASRA-8888'
  };

  // 1. Initial vault setup with old word password
  saveUserVault(userId, initialDocs, 'OldSecretPassword@1', 'word');

  const oldUnlock = unlockUserVault(userId, 'OldSecretPassword@1');
  assert.strictEqual(oldUnlock.success, true);

  // 2. Reset password to numeric PIN (e.g. '889922')
  const resetRes = resetUserVaultPassword(userId, '889922', 'number', {
    currentPassword: 'OldSecretPassword@1'
  });
  assert.strictEqual(resetRes.success, true);
  assert.strictEqual(resetRes.passwordType, 'number');

  // 3. Old password must now FAIL
  const failOld = unlockUserVault(userId, 'OldSecretPassword@1');
  assert.strictEqual(failOld.success, false);

  // 4. New PIN must SUCCEED and preserve documents
  const unlockNew = unlockUserVault(userId, '889922');
  assert.strictEqual(unlockNew.success, true);
  assert.strictEqual(unlockNew.documents.aadhaarNumber, 'XXXX-XXXX-9900');
});

