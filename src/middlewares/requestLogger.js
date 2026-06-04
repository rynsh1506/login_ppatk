'use strict';

const logger = require('../utils/logger');

/**
 * Middleware: Logs every incoming HTTP request.
 * Log format: METHOD /path - IP
 */
const requestLogger = (req, _res, next) => {
  logger.info(`[HTTP] ${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
};

module.exports = { requestLogger };
