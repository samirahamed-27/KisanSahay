const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getSoilFertilityProfile,
  calculateHaversineDistance
} = require('../src/services/soilFertilityEngine');

test('Soil Fertility Engine - Haversine distance accuracy', () => {
  // Ludhiana (30.9010, 75.8573) to Bathinda (30.2110, 74.9455) is approx ~115 km
  const dist = calculateHaversineDistance(30.9010, 75.8573, 30.2110, 74.9455);
  assert.ok(dist >= 100 && dist <= 130, `Expected ~115km, got ${dist}`);
});

test('Soil Fertility Engine - Dynamic shift every ~300 km across India', () => {
  // 1. Punjab Central (Ludhiana) - Neutral Alluvial Loam
  const punjabSoil = getSoilFertilityProfile({ latitude: 30.9010, longitude: 75.8573 });
  assert.ok(punjabSoil.soilType.includes('Alluvial'));
  assert.strictEqual(punjabSoil.referenceStation, 'Ludhiana');
  assert.ok(punjabSoil.pH >= 7.0 && punjabSoil.pH <= 7.6);

  // 2. Shift ~350 km South-East to Western UP (Meerut: 28.9845, 77.7064)
  const upSoil = getSoilFertilityProfile({ latitude: 28.9845, longitude: 77.7064 });
  assert.strictEqual(upSoil.referenceStation, 'Meerut');
  assert.notStrictEqual(upSoil.zoneId, punjabSoil.zoneId);

  // 3. Shift ~700 km South to Deccan Plateau (Nashik: 19.9975, 73.7898)
  const deccanSoil = getSoilFertilityProfile({ latitude: 19.9975, longitude: 73.7898 });
  assert.ok(deccanSoil.soilType.includes('Black'));
  assert.strictEqual(deccanSoil.referenceStation, 'Nashik');
  assert.ok(deccanSoil.potassiumKgHa.value > 400, 'Deccan black soils must have very high potassium');

  // 4. Shift ~800 km South to Kerala Laterite (Palakkad: 10.7867, 76.6548)
  const keralaSoil = getSoilFertilityProfile({ latitude: 10.7867, longitude: 76.6548 });
  assert.ok(keralaSoil.soilType.includes('Laterite'));
  assert.strictEqual(keralaSoil.referenceStation, 'Palakkad');
  assert.ok(keralaSoil.pH < 6.0, 'Kerala laterite soils must be acidic');
  assert.ok(keralaSoil.phosphorusKgHa.value < 10, 'Acidic laterite soils must have low available phosphorus');
});

test('Soil Fertility Engine - District and state resolution fallback', () => {
  const profile = getSoilFertilityProfile({ district: 'Varanasi', state: 'Uttar Pradesh' });
  assert.ok(profile);
  assert.strictEqual(profile.referenceStation, 'Varanasi');
  assert.ok(profile.recommendedCrops.includes('Paddy'));
});
