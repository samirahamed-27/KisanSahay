/**
 * Seed script for Land Rate Aggregation System
 * Executes all government circle rate scrapers (Maharashtra IGR, Karnataka Kaveri, Telangana CARD, UP IGRS)
 * and market asking rate scrapers (99acres, MagicBricks) and persists records to disk.
 */

const landRateAggregationService = require('../src/services/landRateAggregationService');
const landRatesRepo = require('../src/database/landRatesRepo');
const logger = require('../src/utils/logger');

async function seed() {
  console.log('--- Seeding Land Rates Database ---');
  const result = await landRateAggregationService.runFullAggregation();
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log(`Total records in repo: ${landRatesRepo.count()}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
