/**
 * Automated Unit Test Suite for Multi-User Sandboxing, OTP Auth, and 15 Scheme Categories
 */

const test = require('node:test');
const assert = require('node:assert');
const multiuserService = require('../src/services/multiuserService');

test('Multi-User Engine — Initial State & Default Profile', () => {
  const data = multiuserService.loadProfiles();
  assert.ok(data, 'Should return multiuser data');
  assert.ok(Array.isArray(data.profiles), 'Profiles should be an array');
  assert.ok(data.profiles.length >= 1, 'Should have at least 1 default profile');

  const defaultProfile = data.profiles[0];
  assert.ok(defaultProfile.id, 'Profile should have an ID');
  assert.ok(defaultProfile.name, 'Profile should have a name');
  assert.ok(defaultProfile.identifier, 'Profile should have an identifier (phone or email)');
});

test('Multi-User Engine — 6-Digit OTP Generation & Expiry', () => {
  const email = 'farmer.test.' + Date.now() + '@gmail.com';
  const sendResult = multiuserService.sendOtp(email, 'gmail', 'Ramesh Kumar');

  assert.strictEqual(sendResult.success, true, 'OTP send should succeed');
  assert.strictEqual(sendResult.identifier, email.toLowerCase(), 'Identifier should be normalized');
  assert.ok(sendResult.sessionToken, 'Should return sessionToken');
  assert.strictEqual(sendResult.expiresInSeconds, 300, 'OTP should be valid for 5 minutes (300s)');
  assert.match(sendResult.demoOtp, /^\d{6}$/, 'Generated OTP must be exactly 6 digits');

  // Test incorrect OTP code
  const wrongAttempt = multiuserService.verifyOtp(email, '000000');
  assert.strictEqual(wrongAttempt.success, false, 'Incorrect OTP should fail');
  assert.match(wrongAttempt.message, /Incorrect OTP/i, 'Error message should indicate incorrect code');

  // Test correct OTP code
  const correctAttempt = multiuserService.verifyOtp(email, sendResult.demoOtp);
  assert.strictEqual(correctAttempt.success, true, 'Correct OTP should verify successfully');
  assert.strictEqual(correctAttempt.verified, true, 'Should be marked verified');
  assert.ok(correctAttempt.verificationToken, 'Should receive verification token');
});

test('Multi-User Engine — Profile Creation via Phone & Gmail', () => {
  // 1. Create Phone Profile
  const phoneRes = multiuserService.createProfile({
    name: 'Suresh Patel',
    identifier: '+91 98765 11223',
    type: 'phone'
  });
  assert.strictEqual(phoneRes.success, true);
  assert.strictEqual(phoneRes.profile.name, 'Suresh Patel');
  assert.strictEqual(phoneRes.profile.type, 'phone');
  assert.strictEqual(phoneRes.profile.avatar, 'S');

  // 2. Create Gmail Profile
  const gmailRes = multiuserService.createProfile({
    name: 'Anjali Verma',
    identifier: 'anjali.farmer@gmail.com',
    type: 'gmail'
  });
  assert.strictEqual(gmailRes.success, true);
  assert.strictEqual(gmailRes.profile.name, 'Anjali Verma');
  assert.strictEqual(gmailRes.profile.type, 'gmail');
  assert.strictEqual(gmailRes.profile.avatar, 'A');

  // 3. Switch Profile
  const switchRes = multiuserService.switchProfile(phoneRes.profile.id);
  assert.strictEqual(switchRes.success, true);
  assert.strictEqual(switchRes.activeProfile.id, phoneRes.profile.id);

  // Switch back to default
  const defaultProfile = multiuserService.loadProfiles().profiles[0];
  multiuserService.switchProfile(defaultProfile.id);
});

test('National 15 Categories — Schema, Metadata & Flagship Schemes', () => {
  // Load categories_data.js in mock browser environment
  const fs = require('fs');
  const path = require('path');
  const catCode = fs.readFileSync(path.join(__dirname, '../public/categories_data.js'), 'utf8');

  const mockWindow = {};
  const fn = new Function('window', catCode);
  fn(mockWindow);

  assert.ok(Array.isArray(mockWindow.NATIONAL_CATEGORIES), 'Should export NATIONAL_CATEGORIES');
  assert.strictEqual(mockWindow.NATIONAL_CATEGORIES.length, 15, 'Must contain exactly 15 national categories matching Image 5');

  const expectedCategoryIds = [
    'agriculture', 'banking', 'business', 'education', 'health',
    'housing', 'justice', 'science', 'skills', 'social',
    'sports', 'transport', 'tourism', 'utility', 'women_child'
  ];

  expectedCategoryIds.forEach(id => {
    const found = mockWindow.NATIONAL_CATEGORIES.find(c => c.id === id);
    assert.ok(found, `Category ${id} must exist in NATIONAL_CATEGORIES`);
    assert.ok(found.name, `Category ${id} must have a name`);
    assert.ok(found.count > 0, `Category ${id} must have live count > 0`);
    assert.ok(found.accentColor, `Category ${id} must have an accent color`);
    assert.ok(found.iconSvg, `Category ${id} must have an icon SVG`);
  });

  // Verify Flagship Category Schemes
  assert.ok(Array.isArray(mockWindow.FLAGSHIP_CATEGORY_SCHEMES), 'Should export FLAGSHIP_CATEGORY_SCHEMES');
  assert.ok(mockWindow.FLAGSHIP_CATEGORY_SCHEMES.length >= 8, 'Should have multiple flagship schemes');

  const coffeeScheme = mockWindow.FLAGSHIP_CATEGORY_SCHEMES.find(s => s.id === 'cat-agri-coffee');
  assert.ok(coffeeScheme, 'Coffee Development Programme scheme (Image 3) must exist');
  assert.strictEqual(coffeeScheme.categoryId, 'agriculture');
  assert.ok(coffeeScheme.tags.includes('Agriculture'), 'Tags must include Agriculture');

  const mdaScheme = mockWindow.FLAGSHIP_CATEGORY_SCHEMES.find(s => s.id === 'cat-biz-mda');
  assert.ok(mdaScheme, 'Market Development Assistance scheme (Image 4) must exist');
  assert.strictEqual(mdaScheme.categoryId, 'business');

  // Verify Illustrated Vector Banners (Images 3 & 4)
  assert.ok(mockWindow.CATEGORY_HERO_BANNERS.agriculture, 'Must have Agriculture illustrated vector banner');
  assert.ok(mockWindow.CATEGORY_HERO_BANNERS.business, 'Must have Business & Entrepreneurship illustrated vector banner');
  assert.ok(mockWindow.CATEGORY_HERO_BANNERS.default, 'Must have default vector banner fallback');

  const agriBannerHtml = mockWindow.getCategoryBannerHtml('agriculture');
  assert.match(agriBannerHtml, /category-hero-art-wrapper/);
  assert.match(agriBannerHtml, /svg/i);
});
