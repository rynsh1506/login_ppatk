'use strict';

require('dotenv').config();

const app = require('./src/app');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

const PORT = config.app.port;

const server = app.listen(PORT, () => {
  logger.info(`========================================`);
  logger.info(`  PPATK Token Scraper API`);
  logger.info(`  Environment : ${config.app.env}`);
  logger.info(`  Server      : http://localhost:${PORT}`);
  logger.info(`  Token API   : http://localhost:${PORT}/api/v1/token`);
  logger.info(`  Search API  : http://localhost:${PORT}/api/v1/search`);
  logger.info(`  Health      : http://localhost:${PORT}/health`);
  logger.info(`========================================`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.warn(`[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('[Server] HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections (prevent silent crashes)
process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled Promise Rejection:', reason);
});

// Catch uncaught exceptions (log before crashing)
process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});
