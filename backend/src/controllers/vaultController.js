/**
 * Controller for Farmer Document Vault (Word, PIN, Pattern Lock)
 */

const { saveUserVault, unlockUserVault, resetUserVaultPassword, getVaultStatus } = require('../services/vaultService');

function saveVault(req, res, next) {
  try {
    const { userId = 'default-farmer', documents = {}, password, passwordType = 'word' } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password, PIN, or Pattern is required to encrypt your document vault.'
      });
    }

    const result = saveUserVault(userId, documents, password, passwordType);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function unlockVault(req, res, next) {
  try {
    const { userId = 'default-farmer', password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to unlock your vault.'
      });
    }

    const result = unlockUserVault(userId, password);
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function resetVault(req, res, next) {
  try {
    const { userId = 'default-farmer', newPassword, newPasswordType = 'word', currentPassword, documents } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password, PIN, or Pattern is required to reset your vault.'
      });
    }

    const result = resetUserVaultPassword(userId, newPassword, newPasswordType, { currentPassword, documents });
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function getVaultInfo(req, res, next) {
  try {
    const userId = req.query.userId || 'default-farmer';
    const status = getVaultStatus(userId);
    res.status(200).json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  saveVault,
  unlockVault,
  resetVault,
  getVaultInfo
};
