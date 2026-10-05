/**
 * Rate Limiting Middleware for KisanSahay API
 */

const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
    statusCode: 429
  }
});

const recommendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60, // 60 evaluation requests per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Recommendation rate limit reached. Please wait a few moments before trying another calculation.',
    statusCode: 429
  }
});

module.exports = {
  apiLimiter,
  recommendLimiter
};
