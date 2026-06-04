'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const config = require('../config/config');

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format: [TIMESTAMP] LEVEL: message (+ optional stack trace)
const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `[${ts}] ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: config.logger.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console output (colored for readability in dev)
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    // File: all logs
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
    // File: errors only
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

module.exports = logger;
