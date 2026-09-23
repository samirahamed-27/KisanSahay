/**
 * Translation Controller for KisanSahay
 *
 * REST Endpoints:
 * - POST /api/translate
 * - GET  /api/translate/languages
 * - GET  /api/translate/cache-stats
 * - POST /api/translate/cache-clear
 */

const { translationService, SUPPORTED_LANGUAGES } = require('../services/translationService');
const { translationCache } = require('../services/translationCache');

/**
 * Translate a batch of static strings or dynamic texts
 */
async function handleTranslate(req, res, next) {
  try {
    const { strings, texts, from = 'en', to, isDynamic = false } = req.body;

    const payloadStrings = strings || texts;

    if (!payloadStrings || (typeof payloadStrings !== 'object' && !Array.isArray(payloadStrings))) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Must provide "strings" as an object { key: text } or array of strings.'
      });
    }

    if (!to || typeof to !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TARGET_LANGUAGE',
        message: 'Must provide target language code "to" (e.g. "hi", "pa", "mr", "ta").'
      });
    }

    const result = await translationService.translateBatch({
      strings: payloadStrings,
      from,
      to,
      isDynamic: Boolean(isDynamic)
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Return supported languages list and active provider info
 */
function handleGetLanguages(req, res) {
  return res.json({
    success: true,
    baseLanguage: 'en',
    supportedLanguages: SUPPORTED_LANGUAGES,
    count: Object.keys(SUPPORTED_LANGUAGES).length,
    activeProvider: translationService.getActiveProvider()
  });
}

/**
 * Return cache performance metrics and capacity
 */
function handleGetCacheStats(req, res) {
  return res.json({
    success: true,
    cache: translationCache.getStats()
  });
}

/**
 * Clear cache entries
 */
function handleClearCache(req, res) {
  translationCache.clear();
  return res.json({
    success: true,
    message: 'Translation cache cleared successfully',
    cache: translationCache.getStats()
  });
}

module.exports = {
  handleTranslate,
  handleGetLanguages,
  handleGetCacheStats,
  handleClearCache
};
