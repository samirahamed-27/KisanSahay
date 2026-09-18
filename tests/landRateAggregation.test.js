/**
 * Test Suite: Land Rate Aggregation System
 * Verifies Unit Conversion, Scrapers, Schemas, Labels, and Repository Analytics
 */

const test = require('node:test');
const assert = require('node:assert');

const {
  convertToRatePerAcre,
  parseIndianCurrency,
  extractRateFromListingText,
  getUnitAcreFactor
} = require('../src/services/unitConverter');

const landRatesRepo = require('../src/database/landRatesRepo');
const { scrapeIgrMaharashtra } = require('../src/scrapers/igrMaharashtraCollector');
const { scrapeKaveriKarnataka } = require('../src/scrapers/kaveriKarnatakaCollector');
const { scrapeTelanganaRegistration } = require('../src/scrapers/telanganaRegistrationCollector');
const { scrapeIgrsUp } = require('../src/scrapers/igrsUpCollector');
const {
  scrape99acresListings,
  scrapeMagicBricksListings,
  scrapeAllMarketListings
} = require('../src/scrapers/marketListingsCollector');

const { getLocationContext } = require('../src/services/locationContext');

test('Unit Converter - Area Factor Normalization', () => {
  // Guntha: 1 Acre = 40 Gunthas -> 1 Guntha = 0.025 Acre
  assert.strictEqual(getUnitAcreFactor('guntha'), 0.025);
  assert.strictEqual(getUnitAcreFactor('gunta'), 0.025);

  // Bigha regional variations
  assert.strictEqual(getUnitAcreFactor('bigha', 'Uttar Pradesh'), 0.625);
  assert.strictEqual(getUnitAcreFactor('bigha', 'Madhya Pradesh'), 0.5);
  assert.strictEqual(getUnitAcreFactor('bigha', 'Bihar'), 0.62);

  // Cent: 1 Acre = 100 Cents
  assert.strictEqual(getUnitAcreFactor('cent'), 0.01);

  // Hectare: 1 Hectare = 2.47105 Acres
  assert.strictEqual(getUnitAcreFactor('hectare'), 2.47105);
});

test('Unit Converter - Rate Per Acre Calculations', () => {
  // Rate in Guntha: ₹75,000 / Guntha -> 75,000 / 0.025 = ₹3,000,000 / Acre
  const gunthaAcreRate = convertToRatePerAcre(75000, 'guntha');
  assert.strictEqual(gunthaAcreRate, 3000000);

  // Rate in UP Bigha: ₹10,00,000 / Bigha -> 10,00,000 / 0.625 = ₹1,600,000 / Acre
  const upBighaRate = convertToRatePerAcre(1000000, 'bigha', 'Uttar Pradesh');
  assert.strictEqual(upBighaRate, 1600000);

  // Rate in MP Bigha: ₹8,00,000 / Bigha -> 8,00,000 / 0.5 = ₹1,600,000 / Acre
  const mpBighaRate = convertToRatePerAcre(800000, 'bigha', 'Madhya Pradesh');
  assert.strictEqual(mpBighaRate, 1600000);

  // Rate in Cent: ₹25,000 / Cent -> 25,000 / 0.01 = ₹2,500,000 / Acre
  const centRate = convertToRatePerAcre(25000, 'cent');
  assert.strictEqual(centRate, 2500000);
});

test('Unit Converter - Indian Currency and Listing Text Parsing', () => {
  assert.strictEqual(parseIndianCurrency('₹ 45 Lakh'), 4500000);
  assert.strictEqual(parseIndianCurrency('1.2 Cr'), 12000000);
  assert.strictEqual(parseIndianCurrency('75,000'), 75000);

  // Listing headline extraction
  const extractedGuntha = extractRateFromListingText('10 Guntha Farmland at ₹1.1 Lakh per Guntha');
  assert.strictEqual(extractedGuntha.rawUnit, 'guntha');
  assert.strictEqual(extractedGuntha.parsedAmount, 110000);
  assert.strictEqual(extractedGuntha.ratePerAcre, 4400000);

  const extractedAcre = extractRateFromListingText('Prime Farmland at ₹55 Lakh / Acre');
  assert.strictEqual(extractedAcre.rawUnit, 'acre');
  assert.strictEqual(extractedAcre.parsedAmount, 5500000);
  assert.strictEqual(extractedAcre.ratePerAcre, 5500000);
});

test('Government Circle Rates - Maharashtra IGR Collector', async () => {
  const records = await scrapeIgrMaharashtra();
  assert(records.length >= 40, `Expected at least 40 records, got ${records.length}`);

  for (const r of records) {
    assert.strictEqual(r.state, 'Maharashtra');
    assert(r.district, 'District must be present');
    assert(r.taluk, 'Taluk must be present');
    assert(r.village_zone, 'Village zone must be present');
    assert.strictEqual(r.rate_type, 'circle_rate');
    assert.strictEqual(r.source_name, 'IGR Maharashtra');
    assert.strictEqual(r.effective_date, '2025-04-01');
    assert(r.rate_per_acre > 100000, `Rate per acre (${r.rate_per_acre}) must be reasonable`);
    assert(r.raw_json && r.raw_json.portal === 'igrmaharashtra.gov.in');
  }
});

test('Government Circle Rates - Karnataka Kaveri Collector', async () => {
  const records = await scrapeKaveriKarnataka();
  assert(records.length >= 25, `Expected at least 25 records, got ${records.length}`);

  for (const r of records) {
    assert.strictEqual(r.state, 'Karnataka');
    assert(r.district, 'District must be present');
    assert(r.taluk, 'Taluk must be present');
    assert.strictEqual(r.rate_type, 'circle_rate');
    assert.strictEqual(r.source_name, 'Kaveri Karnataka');
    assert.strictEqual(r.effective_date, '2025-04-01');
    assert(r.rate_per_acre > 100000);
    assert(r.raw_json && r.raw_json.portal === 'kaverionline.karnataka.gov.in');
  }
});

test('Government Circle Rates - Hooks for Telangana & UP', async () => {
  const tsRecords = await scrapeTelanganaRegistration();
  assert(tsRecords.length >= 20);
  for (const r of tsRecords) {
    assert.strictEqual(r.state, 'Telangana');
    assert.strictEqual(r.rate_type, 'circle_rate');
    assert.strictEqual(r.source_name, 'Telangana Registration (CARD)');
    assert.strictEqual(r.effective_date, '2025-04-01');
  }

  const upRecords = await scrapeIgrsUp();
  assert(upRecords.length >= 25);
  for (const r of upRecords) {
    assert.strictEqual(r.state, 'Uttar Pradesh');
    assert.strictEqual(r.rate_type, 'circle_rate');
    assert.strictEqual(r.source_name, 'IGRS Uttar Pradesh');
    assert.strictEqual(r.effective_date, '2025-04-01');
  }
});

test('Market Asking Rates - 99acres & MagicBricks Supplementary Listings', async () => {
  const a99 = await scrape99acresListings();
  assert(a99.length >= 10);
  for (const r of a99) {
    assert.strictEqual(r.rate_type, 'market_rate_listing');
    assert.strictEqual(r.source_name, '99acres');
    assert.strictEqual(r.effective_date, null, 'Market listings should not have official fiscal effective dates');
    assert(r.raw_json && r.raw_json.listingClassification.includes('Market Rate (Listing)'));
  }

  const mb = await scrapeMagicBricksListings();
  assert(mb.length >= 10);
  for (const r of mb) {
    assert.strictEqual(r.rate_type, 'market_rate_listing');
    assert.strictEqual(r.source_name, 'MagicBricks');
    assert(r.rate_per_acre > 0);
  }
});

test('Land Rates Repository - Schema Compliance & Queries', () => {
  assert(landRatesRepo.count() >= 100, `Repo must contain seeded records, found ${landRatesRepo.count()}`);

  const mhResult = landRatesRepo.findRates({ state: 'Maharashtra', limit: 10 });
  assert(mhResult.records.length > 0);
  assert(mhResult.total > mhResult.records.length);

  // Check strict schema properties
  const sample = mhResult.records[0];
  assert('id' in sample);
  assert('state' in sample);
  assert('district' in sample);
  assert('taluk' in sample);
  assert('village_zone' in sample);
  assert('rate_per_acre' in sample);
  assert('rate_type' in sample);
  assert('source_url' in sample);
  assert('source_name' in sample);
  assert('effective_date' in sample);
  assert('scraped_at' in sample);
  assert('raw_json' in sample);
  assert(typeof sample.rate_per_acre === 'number');
});

test('Land Rates Comparison - Side-by-Side Circle vs Market Rate Spread', () => {
  // Pune comparison
  const puneComp = landRatesRepo.getComparisonStats({ state: 'Maharashtra', district: 'Pune' });
  assert(puneComp.circleRate, 'Must have circle rate statistics for Pune');
  assert(puneComp.marketRate, 'Must have market listing statistics for Pune');

  assert(puneComp.circleRate.avgRatePerAcre > 0);
  assert(puneComp.marketRate.avgRatePerAcre > 0);
  assert(puneComp.comparison.premiumPercent !== null);
  assert(puneComp.comparison.spreadPerAcre !== null);
  assert(puneComp.comparison.stampDutyGuidance.includes('Minimum stamp duty'));

  // Bengaluru Rural comparison
  const blrComp = landRatesRepo.getComparisonStats({ state: 'Karnataka', district: 'Bengaluru Rural' });
  assert(blrComp.circleRate);
  assert(blrComp.marketRate);
  assert(blrComp.comparison.premiumPercent > 0, 'Market asking price in Bengaluru Rural is above guidance value');
});

test('Cross-State Statistics Overview', () => {
  const stats = landRatesRepo.getStatsOverview();
  assert(stats.totalRecords >= 150);
  assert(stats.statesCovered >= 4);
  assert(stats.circleRatesTotal > 0);
  assert(stats.marketRatesTotal > 0);
  assert(stats.stateSummaries.length >= 4);

  const mh = stats.stateSummaries.find(s => s.state === 'Maharashtra');
  assert(mh);
  assert(mh.circleRateCount > 0);
  assert(mh.marketRateCount > 0);
  assert(mh.avgCircleRatePerAcre > 0);
  assert(mh.avgMarketRatePerAcre > 0);
});

test('Location Context - Live Land Rate Enrichment', () => {
  const ctx = getLocationContext({ state: 'Maharashtra', district: 'Pune' });
  assert(ctx.landValuation);
  assert(ctx.landValuation.circleRatePerAcre > 0);
  assert(ctx.landValuation.circleRateSource.includes('IGR Maharashtra'));
  assert(ctx.landValuation.effectiveDate === '2025-04-01');
  assert(ctx.landValuation.marketValuePerAcre > 0);
});
