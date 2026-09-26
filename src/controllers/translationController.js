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
 * Accepts a JSON object of {key: text} pairs plus a target language code,
 * and returns {key: translatedText} in the same shape.
 * Handles 50+ fields in a single call. If translation fails, returns original English text.
 */
async function handleTranslate(req, res) {
  let payloadStrings = req.body.strings || req.body.texts || req.body.data || req.body.fields || req.body.payload || req.body.items || req.body.content || null;
  const isWrapped = Boolean(payloadStrings);

  // Extract target language code from query or body
  const targetLang = (
    req.query.target_lang ||
    req.query.targetLang ||
    req.query.target_language ||
    req.query.to ||
    req.query.target ||
    req.query.lang ||
    req.query.language ||
    req.body.to ||
    req.body.target_lang ||
    req.body.targetLang ||
    req.body.target_language ||
    req.body.targetLanguage ||
    req.body.target ||
    req.body.lang ||
    req.body.language ||
    'en'
  ).toString().toLowerCase().trim();

  // If no container property, extract all non-reserved keys from top-level body
  if (!payloadStrings && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const reserved = new Set([
      'target_lang', 'targetlang', 'target_language', 'targetlanguage',
      'target', 'to', 'lang', 'language', 'target_code', 'code',
      'from', 'source', 'source_lang', 'sourcelang', 'isdynamic', 'is_dynamic'
    ]);
    payloadStrings = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (!reserved.has(k.toLowerCase())) {
        payloadStrings[k] = v;
      }
    }
  }

  payloadStrings = payloadStrings || {};

  // If target language is english or empty, immediately return original English text
  if (!targetLang || targetLang === 'en' || targetLang === 'english') {
    if (isWrapped && req.body.isDynamic !== undefined) {
      return res.json({ success: true, translations: payloadStrings, from: 'en', to: 'en' });
    }
    return res.json(payloadStrings);
  }

  try {
    const result = await translationService.translateBatch({
      strings: payloadStrings,
      from: req.body.from || 'en',
      to: targetLang,
      isDynamic: Boolean(req.body.isDynamic)
    });

    if (isWrapped && req.body.isDynamic !== undefined) {
      return res.json(result);
    }

    // Return {key: translatedText} in the same shape
    return res.json(result.translations || payloadStrings);
  } catch (err) {
    // If translation fails, return original English text for those keys instead of throwing an error
    console.warn(`[TranslationController] Translation failed: ${err.message}. Returning original English text.`);
    if (isWrapped && req.body.isDynamic !== undefined) {
      return res.json({ success: true, translations: payloadStrings, from: 'en', to: targetLang });
    }
    return res.json(payloadStrings);
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
