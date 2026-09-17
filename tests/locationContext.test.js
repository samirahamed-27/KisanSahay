const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getLocationContext,
  getSoilProfile,
  getLandValuation,
  getCropSoilSuitability
} = require('../src/services/locationContext');

test('Location Context - Direct district & state lookup', () => {
  const context = getLocationContext({
    state: 'Punjab',
    district: 'Ludhiana',
    cropType: 'Wheat'
  });

  assert.strictEqual(context.location.state, 'Punjab');
  assert.strictEqual(context.location.district, 'Ludhiana');
  assert.ok(context.soilProfile.soilType.includes('Alluvial'), `Expected soil to contain Alluvial, got ${context.soilProfile.soilType}`);
  assert.ok(context.landValuation.marketValuePerAcre > 0);
  assert.ok(context.landValuation.pricePerSqFt > 0);
  assert.strictEqual(context.cropSuitability.suitabilityRating, 'Highly Suitable');
});

test('Location Context - GPS coordinate fallback lookup', () => {
  // Lat 30.9, Long 75.85 roughly Ludhiana, Punjab
  const context = getLocationContext({
    latitude: 30.9,
    longitude: 75.85,
    cropType: 'Wheat'
  });

  assert.strictEqual(context.location.state, 'Punjab');
  assert.strictEqual(context.location.district, 'Ludhiana');
  assert.ok(context.soilProfile);
  assert.ok(context.landValuation);
});

test('Location Context - Crop soil suitability score', () => {
  const suitability = getCropSoilSuitability('Cotton', 'Black Cotton Soil (Regur)');
  assert.strictEqual(suitability.isSuitable, true);
  assert.strictEqual(suitability.suitabilityRating, 'Highly Suitable');
  assert.strictEqual(suitability.scoreBonus, 15);
});
