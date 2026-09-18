/**
 * API Routes for KisanSahay
 */

const express = require('express');
const router = express.Router();

const { getRecommendations } = require('../controllers/recommendController');
const { getAllSchemes, getSchemeById } = require('../controllers/schemesController');
const { getLocationIntelligence, getSoilFertility } = require('../controllers/contextController');
const { saveVault, unlockVault, getVaultInfo } = require('../controllers/vaultController');
const { triggerIngestion } = require('../controllers/ingestController');

const { validateRecommendationInput } = require('../middleware/validator');
const { apiLimiter, recommendLimiter } = require('../middleware/rateLimiter');

// 1. Recommendation Endpoint (Multi-Factor Scoring & Ranked Sequencing)
router.post('/recommend', recommendLimiter, validateRecommendationInput, getRecommendations);

// 2. Schemes Catalog Endpoints
router.get('/schemes', apiLimiter, getAllSchemes);
router.get('/schemes/:id', apiLimiter, getSchemeById);

// 3. Location Intelligence & Dynamic Soil Fertility (300 km resolution)
router.get('/context/location', apiLimiter, getLocationIntelligence);
router.get('/soil-fertility', apiLimiter, getSoilFertility);

// 4. Farmer Document Vault (Password protected: Word, PIN, Pattern)
router.post('/vault/save', apiLimiter, saveVault);
router.post('/vault/unlock', apiLimiter, unlockVault);
router.get('/vault/status', apiLimiter, getVaultInfo);

// 5. Ingestion / Refresh Endpoint
router.post('/ingest/refresh', apiLimiter, triggerIngestion);

module.exports = router;
