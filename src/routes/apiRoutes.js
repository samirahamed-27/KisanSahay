/**
 * API Routes for KisanSahay
 */

const express = require('express');
const router = express.Router();

const { getRecommendations } = require('../controllers/recommendController');
const { getAllSchemes, getSchemeById } = require('../controllers/schemesController');
const { getLocationIntelligence, getSoilFertility, getCrops } = require('../controllers/contextController');
const { saveVault, unlockVault, resetVault, getVaultInfo } = require('../controllers/vaultController');
const { triggerIngestion } = require('../controllers/ingestController');

const { handleAssistantChat } = require('../controllers/assistantController');
const { getReviewQueue, processReviewAction } = require('../controllers/reviewController');
const {
  sendOtp,
  verifyOtp,
  getProfiles,
  createProfile,
  switchProfile,
  deleteProfile
} = require('../controllers/multiuserController');

const { validateRecommendationInput } = require('../middleware/validator');
const { apiLimiter, recommendLimiter } = require('../middleware/rateLimiter');

// 1. Recommendation Endpoint (Multi-Factor Scoring & Ranked Sequencing)
router.post('/recommend', recommendLimiter, validateRecommendationInput, getRecommendations);

// 2. Schemes Catalog & Review Gate Endpoints
router.get('/schemes', apiLimiter, getAllSchemes);
router.get('/schemes/review-queue', apiLimiter, getReviewQueue);
router.post('/schemes/review-action', apiLimiter, processReviewAction);
router.get('/schemes/:id', apiLimiter, getSchemeById);

// 3. Crops Catalog Endpoint (63 Curated Crops with scales & soil guidelines)
router.get('/crops', apiLimiter, getCrops);

// 4. Location Intelligence & Dynamic Soil Fertility (300 km resolution)
router.get('/context/location', apiLimiter, getLocationIntelligence);
router.get('/soil-fertility', apiLimiter, getSoilFertility);

// 6. Farmer Document Vault (Password protected: Word, PIN, Pattern)
router.post('/vault/save', apiLimiter, saveVault);
router.post('/vault/unlock', apiLimiter, unlockVault);
router.post('/vault/reset', apiLimiter, resetVault);
router.get('/vault/status', apiLimiter, getVaultInfo);

// 7. Sahay AI Assistant (RAG Chatbot grounded in verified government data)
router.post('/assistant/chat', apiLimiter, handleAssistantChat);

// 8. Multi-User Authentication & Profile Sandboxing
router.post('/auth/send-otp', apiLimiter, sendOtp);
router.post('/auth/verify-otp', apiLimiter, verifyOtp);
router.get('/users/profiles', apiLimiter, getProfiles);
router.post('/users/profiles', apiLimiter, createProfile);
router.post('/users/switch-profile', apiLimiter, switchProfile);
router.delete('/users/profiles/:id', apiLimiter, deleteProfile);

// 9. Ingestion / Refresh Endpoint
router.post('/ingest/refresh', apiLimiter, triggerIngestion);

// 10. Notification Bar & Push Notifications (Daily EMI Reminders & New Schemes)
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  saveSubscription
} = require('../controllers/notificationController');

router.get('/notifications', apiLimiter, getNotifications);
router.post('/notifications/:id/read', apiLimiter, markNotificationAsRead);
router.post('/notifications/read-all', apiLimiter, markAllNotificationsAsRead);
router.post('/notifications/push-subscription', apiLimiter, saveSubscription);

// 11. Natural Neural Text-To-Speech (TTS) Synthesis
const { handleSynthesize } = require('../controllers/ttsController');
router.post('/tts/synthesize', apiLimiter, handleSynthesize);

module.exports = router;



