/**
 * Sahay AI Assistant Controller
 * Provides conversational API for farmers to query loan eligibility, documents, and subsidies.
 */

const { processAssistantQuery } = require('../services/assistantService');
const logger = require('../utils/logger');

async function handleAssistantChat(req, res) {
  try {
    const { message, language = 'en', farmerProfile = {} } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid "message" string is required.'
      });
    }

    const cleanMessage = message.trim();
    const cleanLang = (language === 'hi' || language === 'en') ? language : 'en';

    const result = await processAssistantQuery(cleanMessage, {
      language: cleanLang,
      farmerProfile: farmerProfile && typeof farmerProfile === 'object' ? farmerProfile : {}
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    logger.error('Error handling Sahay AI assistant chat:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process assistant query. Please try again.'
    });
  }
}

module.exports = {
  handleAssistantChat
};
