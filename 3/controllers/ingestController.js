/**
 * Ingestion Controller
 * Provides administrative trigger for manual or webhook-based data refreshes.
 */

const { refreshData } = require('../services/ingestionService');
const { reloadSchemesCache } = require('./recommendController');

async function triggerIngestion(req, res, next) {
  try {
    const result = await refreshData();
    // Reload in-memory recommendation cache
    reloadSchemesCache();

    res.json({
      success: true,
      message: 'Agricultural schemes database refreshed and verified successfully.',
      details: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  triggerIngestion
};
