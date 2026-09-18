const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { scoreScheme, calculateFilterFacets, rankSchemes } = require('../src/services/scoringEngine');
const { retrieveRelevantSchemes, generateGroundedAnswer, processAssistantQuery } = require('../src/services/assistantService');
const { assessDebtCapacity, evaluateSchemeSafety } = require('../src/services/debtSafetyEngine');

const schemesPath = path.join(__dirname, '..', 'src', 'data', 'schemesDatabase.json');
const schemesDatabase = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));

test('Explainable Criteria Breakdown & 95% Hard Cap Rule', () => {
  const scheme = schemesDatabase.find(s => s.id === 'miss') || schemesDatabase[0];
  
  // Profile that meets all criteria
  const farmerProfile = {
    landOwnership: 'owner',
    landSizeAcres: 3.5,
    category: 'general',
    cropType: 'wheat, paddy',
    annualIncome: 200000,
    state: 'Punjab',
    hasAadhaar: true,
    hasKcc: true
  };

  const locationContext = { resolvedLocation: { state: 'Punjab' } };
  const debtCapacity = assessDebtCapacity(farmerProfile);

  const scoreResult = scoreScheme(scheme, farmerProfile, locationContext, debtCapacity);

  assert.ok(scoreResult.score >= 10 && scoreResult.score <= 99, 'Score should be between 10 and 99');
  assert.ok(Array.isArray(scoreResult.criteria_breakdown), 'Must contain criteria_breakdown');
  assert.strictEqual(scoreResult.criteria_breakdown.length, 6, 'Must contain 6 key criteria breakdown items');

  const criteriaKeys = scoreResult.criteria_breakdown.map(c => c.criterion);
  assert.ok(criteriaKeys.includes('land_size'));
  assert.ok(criteriaKeys.includes('state_region'));
  assert.ok(criteriaKeys.includes('income_limit'));
  assert.ok(criteriaKeys.includes('category'));
  assert.ok(criteriaKeys.includes('ownership'));
  assert.ok(criteriaKeys.includes('debt_safety'));

  // Test Hard Cap Rule: If income exceeds cap or state is invalid, score CANNOT exceed 95%
  const highIncomeProfile = {
    ...farmerProfile,
    annualIncome: 3000000 // Exceeds typical limits
  };
  const highIncomeResult = scoreScheme(scheme, highIncomeProfile, locationContext, debtCapacity);
  assert.ok(highIncomeResult.score <= 95, `Match score must never exceed 95% if criteria are unmet (was: ${highIncomeResult.score})`);

  // Ineligible scheme cap: must be <= 48%
  const ineligibleResult = scoreScheme(scheme, { ...farmerProfile, hasAadhaar: false }, locationContext, debtCapacity);
  if (!ineligibleResult.eligible) {
    assert.ok(ineligibleResult.score <= 48, `Ineligible scheme score must be capped at 48% (was: ${ineligibleResult.score})`);
  }
});

test('Dynamic Filter Facet Calculation', () => {
  const farmerProfile = {
    state: 'Punjab',
    cropType: 'wheat',
    landSizeAcres: 3.0,
    annualIncome: 200000
  };

  const facets = calculateFilterFacets(schemesDatabase, farmerProfile);

  assert.ok(facets, 'Facets object must be computed');
  assert.ok(facets.categories, 'Should have category facet counts');
  assert.ok(facets.categories.general > 0, 'General category count should be > 0');
  assert.ok(facets.categories.women > 0, 'Women category count should be > 0');

  assert.ok(facets.incomeBrackets, 'Should have income facet counts');
  assert.ok(facets.loanStatus, 'Should have loan status facet counts');
  assert.ok(facets.occupations, 'Should have occupation facet counts');
  assert.ok(facets.collateral, 'Should have collateral facet counts');
  assert.ok(facets.irrigation, 'Should have irrigation facet counts');
  assert.ok(facets.crops, 'Should have crop facet counts');
});

test('Sahay AI Assistant — Grounded Retrieval & Citations', async () => {
  // Query 1: KCC eligibility
  const kccRetrieved = retrieveRelevantSchemes('Am I eligible for KCC?', { state: 'Punjab', landSizeAcres: 3 }, 3);
  assert.ok(kccRetrieved.length > 0, 'Should retrieve KCC related schemes');

  const answer = generateGroundedAnswer('Am I eligible for KCC?', kccRetrieved, { state: 'Punjab' }, 'en');
  assert.ok(answer.reply.includes('Kisan Credit Card') || answer.reply.includes('KCC'), 'Answer should directly address KCC');
  assert.ok(answer.reply.includes('4.0%') || answer.reply.includes('4%'), 'Should cite subsidized prompt repayment rate');
  assert.ok(Array.isArray(answer.citations), 'Should contain citations array');
  assert.ok(answer.citations.length > 0, 'Must have at least one verified source citation');
  assert.ok(answer.citations[0].url, 'Citation must contain official URL');
  assert.ok(Array.isArray(answer.suggestedChips), 'Must provide follow-up chips');
  assert.strictEqual(answer.suggestedChips.length, 3, 'Must provide exactly 3 suggested chips');
});

test('Sahay AI Assistant — Hindi Language Grounding', async () => {
  const answerHi = await processAssistantQuery('फसल ऋण के लिए कौन-से दस्तावेज चाहिए?', { language: 'hi' });
  
  assert.strictEqual(answerHi.language, 'hi', 'Language should be Hindi');
  assert.ok(answerHi.reply.includes('दस्तावेज') || answerHi.reply.includes('Aadhaar') || answerHi.reply.includes('कार्ड'), 'Reply should be in Hindi');
  assert.ok(answerHi.citations.length > 0, 'Must provide citations in Hindi mode too');
});

test('Human Review Gate — Staged Scheme Queue & Verification', () => {
  const stagedFilePath = path.join(__dirname, '..', 'src', 'data', 'stagedSchemes.json');
  assert.ok(fs.existsSync(stagedFilePath), 'stagedSchemes.json must exist');

  const stagedRecords = JSON.parse(fs.readFileSync(stagedFilePath, 'utf8'));
  assert.ok(Array.isArray(stagedRecords), 'Staged records must be an array');
  assert.ok(stagedRecords.length > 0, 'Should contain at least one staged scheme for demonstration');

  const sample = stagedRecords[0];
  assert.ok(sample.id, 'Staged item must have an id');
  assert.ok(['staged', 'approved', 'rejected'].includes(sample.status), 'Status must be valid');
  assert.ok(sample.sourceUrl, 'Must include verified source URL');
  assert.ok(sample.sourceAuthority, 'Must include source authority');
});
