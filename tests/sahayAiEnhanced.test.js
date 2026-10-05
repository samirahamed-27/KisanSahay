const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { processAssistantQuery, generateGroundedAnswer } = require('../backend/src/services/assistantService');
const knowledgeBase = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/src/data/sahayKnowledgeBase.json'), 'utf8'));

test('Sahay AI Enhanced — 50 FAQ Knowledge Base Completeness across 9 Categories', () => {
  assert.strictEqual(knowledgeBase.length, 50, 'Knowledge base must contain exactly 50 curated agricultural FAQs');

  const categories = new Set(knowledgeBase.map(k => k.category));
  const expectedCategories = [
    'kcc',
    'pm_kisan',
    'crop_insurance',
    'land_soil_irrigation',
    'equipment_mechanization',
    'warehousing_marketing',
    'loan_application',
    'debt_risk_safety',
    'general_navigation'
  ];

  for (const cat of expectedCategories) {
    assert.ok(categories.has(cat), `Category "${cat}" must be present in knowledge base`);
  }

  // Check structure of each item
  for (const item of knowledgeBase) {
    assert.ok(item.id, 'Item must have an id');
    assert.ok(item.question_en, 'Item must have question_en');
    assert.ok(item.question_hi, 'Item must have question_hi');
    assert.ok(item.answer_en, 'Item must have answer_en');
    assert.ok(item.answer_hi, 'Item must have answer_hi');
    assert.ok(Array.isArray(item.keywords) && item.keywords.length > 0, 'Item must have keywords');
    assert.ok(Array.isArray(item.citations) && item.citations.length > 0, 'Item must have citations');
    assert.ok(item.citations[0].url, 'Item citation must have a URL');
    assert.strictEqual(item.suggestedChips.length, 3, 'Item must provide exactly 3 suggestedChips');
  }
});

test('Sahay AI Enhanced — Specific Category Accuracy', async () => {
  // 1. KCC Interest rate
  const kccRate = await processAssistantQuery('What is the interest rate on a KCC loan?');
  assert.ok(kccRate.reply.includes('4%') || kccRate.reply.includes('4.0%'), 'Should specify 4% effective interest rate');
  assert.ok(kccRate.citations.length > 0, 'Should cite official rates');

  // 2. Collateral free threshold
  const collateral = await processAssistantQuery('Is collateral required for a KCC loan?');
  assert.ok(collateral.reply.includes('2 lakh'), 'Should specify ₹2 lakh collateral-free threshold');

  // 3. PM-KISAN missed payment
  const pmKisan = await processAssistantQuery("My PM-KISAN payment didn't come — what do I do?");
  assert.ok(pmKisan.reply.includes('e-KYC') || pmKisan.reply.includes('land record'), 'Should advise e-KYC and land verification');

  // 4. Equipment subsidy
  const tractor = await processAssistantQuery('Is there a subsidy for buying a tractor?');
  assert.ok(tractor.reply.toLowerCase().includes('subsidy') || tractor.reply.includes('SMAM'), 'Should address tractor mechanization subsidy');

  // 5. Debt Safety & Scam detection
  const scam = await processAssistantQuery('How do I know if a loan offer is a scam?');
  assert.ok(scam.reply.includes('processing fees') || scam.reply.includes('cash'), 'Should highlight upfront processing fee warning');

  // 6. Helpline & Grievance
  const helpline = await processAssistantQuery('Who do I contact if I have a dispute or grievance about a scheme?');
  assert.ok(helpline.reply.includes('1800-180-1551') || helpline.reply.includes('Kisan Call Centre'), 'Should provide Kisan Call Centre helpline');
});

test('Sahay AI Enhanced — Stored User Document Vault & Farm Profile Memory', async () => {
  const farmerProfileWithDocs = {
    state: 'Haryana',
    district: 'Karnal',
    landSizeAcres: 4.5,
    cropType: 'Basmati Rice',
    documents: {
      aadhaar: 'aadhaar_doc_123.enc',
      landRecord: 'khasra_7_12.enc',
      bankPassbook: 'passbook.enc'
    }
  };

  // Query asking about saved documents
  const docsAnswer = await processAssistantQuery('What documents do I have in my vault?', {
    farmerProfile: farmerProfileWithDocs
  });

  assert.ok(docsAnswer.reply.includes('Aadhaar Card'), 'Should detect stored Aadhaar Card');
  assert.ok(docsAnswer.reply.includes('7/12 Land Record'), 'Should detect stored 7/12 Land Record');
  assert.ok(docsAnswer.reply.includes('Bank Passbook'), 'Should detect stored Bank Passbook');

  // Query asking about stored profile
  const profileAnswer = await processAssistantQuery('What is my stored profile details?', {
    farmerProfile: farmerProfileWithDocs
  });

  assert.ok(profileAnswer.reply.includes('Haryana'), 'Should cite user state Haryana');
  assert.ok(profileAnswer.reply.includes('4.5'), 'Should cite user landholding 4.5 acres');
  assert.ok(profileAnswer.reply.includes('Basmati Rice') || profileAnswer.reply.includes('Rice'), 'Should cite crop type');
});

test('Sahay AI Enhanced — Dynamic Attribute Extraction from User Chat Input', async () => {
  const result = await processAssistantQuery('I have 5.5 acres of sugarcane in Uttar Pradesh, what subsidies can I get?');
  
  assert.ok(result.extractedProfile, 'Should extract profile from conversational text');
  assert.strictEqual(result.extractedProfile.landSizeAcres, 5.5, 'Should parse 5.5 acres');
  assert.strictEqual(result.extractedProfile.state, 'Uttar Pradesh', 'Should parse Uttar Pradesh');
  assert.strictEqual(result.extractedProfile.cropType, 'Sugarcane', 'Should parse Sugarcane');
});
