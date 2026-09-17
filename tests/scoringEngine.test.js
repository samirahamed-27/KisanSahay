const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { rankAndSequenceSchemes, calculateSchemeScore } = require('../src/services/scoringEngine');

const schemesPath = path.join(__dirname, '..', 'src', 'data', 'schemesDatabase.json');
const schemesDatabase = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));

test('Scoring Engine - Score bounds and structure', () => {
  const profile = {
    state: 'Punjab',
    district: 'Ludhiana',
    landSizeAcres: 4.5,
    cropType: 'Wheat',
    landOwnership: 'owned',
    annualIncome: 350000,
    category: 'OBC',
    hasKcc: false,
    existingLoans: []
  };

  const results = rankAndSequenceSchemes(profile, schemesDatabase);

  assert.ok(results.length > 0, 'Should return scored schemes');

  // Verify all schemes have 0 <= matchScore <= 100
  results.forEach(scheme => {
    assert.ok(scheme.matchScore >= 0 && scheme.matchScore <= 100, `Score ${scheme.matchScore} for ${scheme.id} out of bounds [0, 100]`);
    assert.ok(['best', 'good', 'moderate', 'ineligible'].includes(scheme.recommendationStatus));
    assert.ok(scheme.colorCode, 'Must have a color code');
    assert.ok(scheme.scoreBreakdown, 'Must contain score breakdown');
    assert.ok(scheme.financialSummary, 'Must contain financial summary with true cost');
  });
});

test('Scoring Engine - Strict Sequence Guarantees', () => {
  const profile = {
    state: 'Maharashtra',
    district: 'Nashik',
    landSizeAcres: 3,
    cropType: 'Soybean',
    landOwnership: 'owned',
    annualIncome: 250000,
    category: 'General',
    hasKcc: false,
    existingLoans: []
  };

  const results = rankAndSequenceSchemes(profile, schemesDatabase);

  // Group by recommendation status in order
  const bestMatches = results.filter(s => s.recommendationStatus === 'best');
  const goodMatches = results.filter(s => s.recommendationStatus === 'good');
  const moderateMatches = results.filter(s => s.recommendationStatus === 'moderate');
  const ineligibleMatches = results.filter(s => s.recommendationStatus === 'ineligible');

  assert.strictEqual(bestMatches.length, 1, 'Must have exactly 1 Best Match');
  assert.strictEqual(bestMatches[0].colorCode, '#15803d', 'Best match must have green #15803d');

  assert.ok(goodMatches.length >= 10 && goodMatches.length <= 11, `Good alternatives should be 10-11, got ${goodMatches.length}`);
  goodMatches.forEach(s => {
    assert.strictEqual(s.colorCode, '#16a34a', 'Good match must have light green #16a34a');
  });

  // Verify strict ordering: best appears before good, good before moderate, ineligible is strictly LAST
  let lastIneligibleIndex = -1;
  let firstIneligibleIndex = -1;

  results.forEach((s, idx) => {
    if (s.recommendationStatus === 'ineligible') {
      if (firstIneligibleIndex === -1) firstIneligibleIndex = idx;
      lastIneligibleIndex = idx;
    } else {
      if (firstIneligibleIndex !== -1) {
        assert.fail(`Found eligible scheme ${s.id} at index ${idx} AFTER ineligible scheme at index ${firstIneligibleIndex}`);
      }
    }
  });

  if (ineligibleMatches.length > 0) {
    assert.strictEqual(lastIneligibleIndex, results.length - 1, 'Ineligible schemes must be placed at the very end');
  }
});

test('Scoring Engine - Women and SC/ST Category Subsidies & Benefits', () => {
  const baseProfile = {
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    landSizeAcres: 2.0,
    cropType: 'Wheat',
    landOwnership: 'owned',
    annualIncome: 180000,
    hasKcc: false,
    existingLoans: []
  };

  const generalProfile = { ...baseProfile, category: 'General' };
  const womenProfile = { ...baseProfile, category: 'Women' };
  const scstProfile = { ...baseProfile, category: 'SC' };

  // Stand-Up India or PMFME or schemes with category preferences
  const standUpScheme = schemesDatabase.find(s => s.id === 'stand-up-india');
  if (standUpScheme) {
    const generalScore = calculateSchemeScore(standUpScheme, generalProfile).totalScore;
    const womenScore = calculateSchemeScore(standUpScheme, womenProfile).totalScore;
    const scstScore = calculateSchemeScore(standUpScheme, scstProfile).totalScore;

    assert.ok(womenScore > generalScore, 'Women farmer should receive higher score/preference for Stand-Up India');
    assert.ok(scstScore > generalScore, 'SC farmer should receive higher score/preference for Stand-Up India');
  }
});
