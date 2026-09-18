/**
 * Land Rates Controller
 * Exposes endpoints for unified government circle rates and market listings
 */

const landRateService = require('../services/landRateAggregationService');
const logger = require('../utils/logger');

/**
 * GET /api/land-rates
 * Query unified land rates with filtering and pagination
 */
async function getLandRates(req, res) {
  try {
    const {
      state,
      district,
      taluk,
      village_zone,
      rate_type,
      source_name,
      sort,
      limit = 50,
      offset = 0
    } = req.query;

    const result = landRateService.getRates({
      state,
      district,
      taluk,
      village_zone,
      rate_type,
      source_name,
      sort,
      limit,
      offset
    });

    return res.status(200).json({
      status: 'success',
      data: result.records,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        filters: { state, district, taluk, rate_type, source_name }
      }
    });
  } catch (err) {
    logger.error('Error fetching land rates', { error: err.message });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve land rates',
      error: err.message
    });
  }
}

/**
 * GET /api/land-rates/compare
 * Compare Government Circle Rate vs Market Asking Rate side-by-side
 */
async function getLandRateComparison(req, res) {
  try {
    const { state, district, taluk } = req.query;

    if (!state) {
      return res.status(400).json({
        status: 'error',
        message: 'Query parameter "state" is required for comparison'
      });
    }

    const comparison = landRateService.getComparison(state, district, taluk);

    return res.status(200).json({
      status: 'success',
      data: comparison
    });
  } catch (err) {
    logger.error('Error in land rate comparison', { error: err.message });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate land rate comparison',
      error: err.message
    });
  }
}

/**
 * GET /api/land-rates/stats
 * Overview analytics across states
 */
async function getLandRateStats(req, res) {
  try {
    const stats = landRateService.getStats();

    return res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    logger.error('Error fetching land rate stats', { error: err.message });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve land rate statistics',
      error: err.message
    });
  }
}

/**
 * POST /api/land-rates/sync
 * Manually trigger scraping & aggregation pipeline
 */
async function syncLandRates(req, res) {
  try {
    const summary = await landRateService.runFullAggregation();

    return res.status(200).json({
      status: 'success',
      message: 'Land rate aggregation completed successfully',
      data: summary
    });
  } catch (err) {
    logger.error('Error triggering land rate sync', { error: err.message });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to run land rate synchronization',
      error: err.message
    });
  }
}

module.exports = {
  getLandRates,
  getLandRateComparison,
  getLandRateStats,
  syncLandRates
};
