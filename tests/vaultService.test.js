const test = require('node:test');
const assert = require('node:assert/strict');
const {
  saveUserVault,
  unlockUserVault,
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
