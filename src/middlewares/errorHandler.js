'use strict';

const logger = require('../utils/logger');

/**
 * Global Express error handler middleware.
 * Catches any error passed via next(err) and returns a standard JSON error.
 * IMPORTANT: Must be the LAST middleware registered in app.js.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  logger.error(`[ErrorHandler] ${err.message}`, err);

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
};

module.exports = { errorHandler };
