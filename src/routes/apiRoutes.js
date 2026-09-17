/**
 * API Routes for KisanSahay
 */

const express = require('express');
const router = express.Router();

const { getRecommendations } = require('../controllers/recommendController');
const { getAllSchemes, getSchemeById } = require('../controllers/schemesController');
const { getLocationIntelligence } = require('../controllers/contextController');
const { triggerIngestion } = require('../controllers/ingestController');

const { validateRecommendationInput } = require('../middleware/validator');
const { apiLimiter, recommendLimiter } = require('../middleware/rateLimiter');

// 1. Recommendation Endpoint (Multi-Factor Scoring & Ranked Sequencing)
router.post('/recommend', recommendLimiter, validateRecommendationInput, getRecommendations);

// 2. Schemes Catalog Endpoints
router.get('/schemes', apiLimiter, getAllSchemes);
router.get('/schemes/:id', apiLimiter, getSchemeById);

// 3. Location Intelligence Endpoint (Soil, Land Price, Crop Trends)
router.get('/context/location', apiLimiter, getLocationIntelligence);

// 4. Ingestion / Refresh Endpoint
router.post('/ingest/refresh', apiLimiter, triggerIngestion);

module.exports = router;
