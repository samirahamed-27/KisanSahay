/**
 * Swagger UI & OpenAPI Specification Routes
 */

const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

// Serve raw OpenAPI JSON specification
router.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve interactive Swagger UI
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'KisanSahay API Documentation',
  customCss: '.swagger-ui .topbar { background-color: #15803d; } .swagger-ui .btn.execute { background-color: #15803d; color: #fff; }',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

module.exports = router;
