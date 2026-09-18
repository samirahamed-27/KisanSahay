/**
 * Land Rate Aggregation & Synchronization Service
 * Unifies government circle rates (authoritative stamp duty ready reckoner / guidance values)
 * and supplementary market asking rates (99acres, MagicBricks).
 */

const logger = require('../utils/logger');
const landRatesRepo = require('../database/landRatesRepo');

// Government Collectors
const { scrapeIgrMaharashtra } = require('../scrapers/igrMaharashtraCollector');
const { scrapeKaveriKarnataka } = require('../scrapers/kaveriKarnatakaCollector');
const { scrapeTelanganaRegistration } = require('../scrapers/telanganaRegistrationCollector');
const { scrapeIgrsUp } = require('../scrapers/igrsUpCollector');

// Market Collectors
const { scrapeAllMarketListings } = require('../scrapers/marketListingsCollector');

class LandRateAggregationService {
  constructor() {
    this.schedulerInterval = null;
    this.lastSyncTime = null;
    this.isSyncing = false;
  }

  /**
   * Runs complete aggregation across all government and market portals
   */
  async runFullAggregation(options = {}) {
    if (this.isSyncing) {
      logger.warn('Land rate aggregation is already running. Skipping concurrent trigger.');
      return { status: 'already_running' };
    }

    this.isSyncing = true;
    logger.info('Starting comprehensive land rate aggregation pipeline...');

    try {
      // 1. Fetch Government Circle Rates
      const [mhRecords, kaRecords, tsRecords, upRecords] = await Promise.all([
        scrapeIgrMaharashtra(options),
        scrapeKaveriKarnataka(options),
        scrapeTelanganaRegistration(options),
        scrapeIgrsUp(options)
      ]);

      const totalGovRecords = [...mhRecords, ...kaRecords, ...tsRecords, ...upRecords];

      // 2. Fetch Market Asking Rate Listings (99acres, MagicBricks)
      const marketRecords = await scrapeAllMarketListings(options);

      // 3. Ingest into repository with deduplication
      const allNewRecords = [...totalGovRecords, ...marketRecords];
      const insertedCount = landRatesRepo.insertBatch(allNewRecords);

      this.lastSyncTime = new Date().toISOString();
      this.isSyncing = false;

      const summary = {
        status: 'success',
        syncedAt: this.lastSyncTime,
        collected: {
          governmentCircleRates: {
            total: totalGovRecords.length,
            maharashtra: mhRecords.length,
            karnataka: kaRecords.length,
            telangana: tsRecords.length,
            uttarPradesh: upRecords.length
          },
          marketRateListings: {
            total: marketRecords.length
          },
          totalCollected: allNewRecords.length
        },
        newlyInserted: insertedCount,
        totalDatabaseRecords: landRatesRepo.count()
      };

      logger.info('Land rate aggregation completed successfully', summary);
      return summary;
    } catch (err) {
      this.isSyncing = false;
      logger.error('Error during land rate aggregation', { error: err.message });
      throw err;
    }
  }

  /**
   * Initializes monthly periodic synchronization
   * Circle rates revise annually on April 1, with monthly market listing reconciliation
   */
  startMonthlyScheduler() {
    if (this.schedulerInterval) return;

    // Run initial population if repo is empty
    if (landRatesRepo.count() === 0) {
      this.runFullAggregation().catch(err => {
        logger.error('Initial land rate aggregation seed failed', { error: err.message });
      });
    }

    // Periodic check interval: checks every 6 hours (well within Node.js 32-bit MAX_INT timer limit)
    // Runs refresh when 30 days have elapsed or on April 1 fiscal year circle rate revision
    const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    this.lastSyncTimestamp = Date.now();

    this.schedulerInterval = setInterval(() => {
      const now = Date.now();
      if ((now - this.lastSyncTimestamp) >= THIRTY_DAYS_MS) {
        logger.info('Executing scheduled monthly land rate refresh...');
        this.lastSyncTimestamp = now;
        this.runFullAggregation().catch(err => {
          logger.error('Scheduled land rate aggregation failed', { error: err.message });
        });
      }
    }, CHECK_INTERVAL_MS);

    logger.info('Monthly land rate scraper scheduler initialized');
  }


  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Query records with filters
   */
  getRates(query) {
    return landRatesRepo.findRates(query);
  }

  /**
   * Get side-by-side comparison for a region
   */
  getComparison(state, district, taluk) {
    return landRatesRepo.getComparisonStats({ state, district, taluk });
  }

  /**
   * Get cross-state statistics
   */
  getStats() {
    return landRatesRepo.getStatsOverview();
  }
}

const landRateAggregationService = new LandRateAggregationService();
module.exports = landRateAggregationService;
