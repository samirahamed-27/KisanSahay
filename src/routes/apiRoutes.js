/**
 * API Routes for KisanSahay
 */

const express = require('express');
const router = express.Router();

const { getRecommendations } = require('../controllers/recommendController');
const { getAllSchemes, getSchemeById } = require('../controllers/schemesController');
const { getLocationIntelligence, getSoilFertility, getCrops } = require('../controllers/contextController');
const { saveVault, unlockVault, getVaultInfo } = require('../controllers/vaultController');
const { triggerIngestion } = require('../controllers/ingestController');
const {
  getLandRates,
  getLandRateComparison,
  getLandRateStats,
  syncLandRates
} = require('../controllers/landRatesController');

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

// 5. Land Rate Aggregation System (Government Circle Rates & Market Asking Rates)
router.get('/land-rates', apiLimiter, getLandRates);
router.get('/land-rates/compare', apiLimiter, getLandRateComparison);
router.get('/land-rates/stats', apiLimiter, getLandRateStats);
router.post('/land-rates/sync', apiLimiter, syncLandRates);

// 6. Farmer Document Vault (Password protected: Word, PIN, Pattern)
router.post('/vault/save', apiLimiter, saveVault);
router.post('/vault/unlock', apiLimiter, unlockVault);
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

module.exports = router;



