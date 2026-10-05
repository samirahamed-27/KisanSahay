const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const cropsData = require('../backend/src/data/cropsData.json');
const schemesDatabase = require('../backend/src/data/schemesDatabase.json');
const soilAgriData = require('../backend/src/data/soilAgriData.json');
const landPricesData = require('../backend/src/data/landPricesData.json');
const cropTrendsData = require('../backend/src/data/cropTrendsData.json');
const { getLocationContext } = require('../backend/src/services/locationContext');
const { rankSchemes } = require('../backend/src/services/scoringEngine');

test('Crops Catalog - 50+ Curated Crop Types across Seasons and Categories', () => {
  assert.ok(Array.isArray(cropsData), 'cropsData must be an array');
  assert.ok(cropsData.length >= 50, `Expected at least 50 crops, found ${cropsData.length}`);
  
  // Verify mandatory attributes on every crop
  cropsData.forEach(crop => {
    assert.ok(crop.id, `Crop missing id: ${JSON.stringify(crop)}`);
    assert.ok(crop.name, `Crop missing name: ${crop.id}`);
    assert.ok(crop.hindiName, `Crop missing hindiName: ${crop.id}`);
    assert.ok(crop.category, `Crop missing category: ${crop.id}`);
    assert.ok(crop.season, `Crop missing season: ${crop.id}`);
    assert.ok(crop.waterRequirement, `Crop missing waterRequirement: ${crop.id}`);
    assert.ok(crop.scaleOfFinancePerAcre, `Crop missing scale of finance: ${crop.id}`);
  });

  // Verify specialized regional crops exist
  const names = cropsData.map(c => c.name.toLowerCase());
  assert.ok(names.some(n => n.includes('makhana')), 'Makhana (Fox nut) must exist');
  assert.ok(names.some(n => n.includes('soybean')), 'Soybean must exist');
  assert.ok(names.some(n => n.includes('sugarcane')), 'Sugarcane must exist');
  assert.ok(names.some(n => n.includes('mentha') || n.includes('mint')), 'Mentha must exist');
  assert.ok(names.some(n => n.includes('litchi')), 'Litchi must exist');
  assert.ok(names.some(n => n.includes('potato')), 'Potato must exist');
  assert.ok(names.some(n => n.includes('mustard')), 'Mustard must exist');
});

test('Schemes Database - 500+ Small Loan & Regional Funding Schemes', () => {
  assert.ok(Array.isArray(schemesDatabase), 'schemesDatabase must be an array');
  assert.ok(schemesDatabase.length >= 500, `Expected at least 500 schemes, found ${schemesDatabase.length}`);

  const upSchemes = schemesDatabase.filter(s => s.state === 'Uttar Pradesh' || (s.eligibilityCriteria?.statesApplicable?.includes('Uttar Pradesh')));
  const mpSchemes = schemesDatabase.filter(s => s.state === 'Madhya Pradesh' || (s.eligibilityCriteria?.statesApplicable?.includes('Madhya Pradesh')));
  const biharSchemes = schemesDatabase.filter(s => s.state === 'Bihar' || (s.eligibilityCriteria?.statesApplicable?.includes('Bihar')));

  assert.ok(upSchemes.length >= 150, `Expected >= 150 UP schemes, found ${upSchemes.length}`);
  assert.ok(mpSchemes.length >= 150, `Expected >= 150 MP schemes, found ${mpSchemes.length}`);
  assert.ok(biharSchemes.length >= 150, `Expected >= 150 Bihar schemes, found ${biharSchemes.length}`);
});

test('Data Synchronization - Mirror Files Consistency', () => {
  const dataDataSchemes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'Data', 'Data', 'schemes.json'), 'utf8'));
  assert.equal(schemesDatabase.length, dataDataSchemes.length, 'Data/Data/schemes.json must match src/data/schemesDatabase.json');

  const publicSchemesFile = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'schemes_data.js'), 'utf8');
  assert.ok(publicSchemesFile.includes('window.KISAN_SCHEMES_DATA = ['), 'frontend/schemes_data.js must export window.KISAN_SCHEMES_DATA');
});

test('Territorial Coverage - UP, MP, and Bihar Soil Profiles & Land Circle Rates', () => {
  assert.ok(soilAgriData['Uttar Pradesh']?.districts['Muzaffarnagar'], 'UP Muzaffarnagar soil must exist');
  assert.ok(soilAgriData['Uttar Pradesh']?.districts['Agra'], 'UP Agra soil must exist');
  assert.ok(soilAgriData['Madhya Pradesh']?.districts['Indore'], 'MP Indore soil must exist');
  assert.ok(soilAgriData['Madhya Pradesh']?.districts['Hoshangabad'], 'MP Hoshangabad soil must exist');
  assert.ok(soilAgriData['Bihar']?.districts['Patna'], 'Bihar Patna soil must exist');
  assert.ok(soilAgriData['Bihar']?.districts['Darbhanga'], 'Bihar Darbhanga soil must exist');

  assert.ok(landPricesData['Bihar']?.districts['Patna']?.circleRatePerAcre > 0, 'Bihar land circle rates must exist');
  assert.ok(cropTrendsData['Bihar']?.kharif?.length > 0, 'Bihar seasonal crop trends must exist');
});

test('Scoring Engine - Multi-Factor Recommendation for Regional Farmers', () => {
  // Bihar Farmer
  const biharProfile = {
    state: 'Bihar',
    district: 'Darbhanga',
    landSizeAcres: 3.0,
    cropType: 'Makhana',
    ownershipStatus: 'owner',
    category: 'general',
    annualIncome: 200000,
    currentOutstandingDebt: 15000
  };
  const biharContext = getLocationContext(biharProfile);
  const biharResults = rankSchemes(schemesDatabase, biharProfile, biharContext);
  assert.ok(biharResults.recommendations && biharResults.recommendations.length > 0, 'Must produce recommendations for Bihar farmer');
  assert.ok(biharResults.recommendations[0].score >= 80, 'Top scheme must have high match score');

  // MP Farmer
  const mpProfile = {
    state: 'Madhya Pradesh',
    district: 'Indore',
    landSizeAcres: 4.5,
    cropType: 'Soybean',
    ownershipStatus: 'owner',
    category: 'obc',
    annualIncome: 250000,
    currentOutstandingDebt: 30000
  };
  const mpContext = getLocationContext(mpProfile);
  const mpResults = rankSchemes(schemesDatabase, mpProfile, mpContext);
  assert.ok(mpResults.recommendations && mpResults.recommendations.length > 0, 'Must produce recommendations for MP farmer');
  assert.ok(mpResults.recommendations[0].score >= 80, 'Top scheme must have high match score');

  // UP Farmer
  const upProfile = {
    state: 'Uttar Pradesh',
    district: 'Meerut',
    landSizeAcres: 5.0,
    cropType: 'Sugarcane',
    ownershipStatus: 'owner',
    category: 'general',
    annualIncome: 300000,
    currentOutstandingDebt: 40000
  };
  const upContext = getLocationContext(upProfile);
  const upResults = rankSchemes(schemesDatabase, upProfile, upContext);
  assert.ok(upResults.recommendations && upResults.recommendations.length > 0, 'Must produce recommendations for UP farmer');
  assert.ok(upResults.recommendations[0].score >= 80, 'Top scheme must have high match score');
});
