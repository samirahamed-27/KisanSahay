/**
 * KisanSahay Multi-User & OTP Authentication Controller
 */

const multiuserService = require('../services/multiuserService');

exports.sendOtp = async (req, res) => {
  try {
    const { identifier, type, name } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required' });
    }
    const result = multiuserService.sendOtp(identifier, type || 'gmail', name || 'Farmer');
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { identifier, otpCode } = req.body;
    if (!identifier || !otpCode) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP code are required' });
    }
    const result = multiuserService.verifyOtp(identifier, otpCode);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProfiles = async (req, res) => {
  try {
    const data = multiuserService.loadProfiles();
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const { name, identifier, type } = req.body;
    if (!name || !identifier) {
      return res.status(400).json({ success: false, message: 'Name and identifier are required' });
    }
    const result = multiuserService.createProfile({ name, identifier, type });
    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.switchProfile = async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ success: false, message: 'profileId is required' });
    }
    const result = multiuserService.switchProfile(profileId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = multiuserService.deleteProfile(id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
