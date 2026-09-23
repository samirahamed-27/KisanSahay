/**
 * TTS Controller
 */

const ttsService = require('../services/ttsService');

async function handleSynthesize(req, res, next) {
  try {
    const { text, language = 'en', speed = 'normal' } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Field "text" is required for synthesis' });
    }

    const result = await ttsService.synthesizeSpeech({
      text: String(text),
      language: String(language),
      speed: String(speed)
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleSynthesize
};
