/**
 * Centralized Error Handling Middleware
 */

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    statusCode,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred while processing your agricultural finance request.',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
