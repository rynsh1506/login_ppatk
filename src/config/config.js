'use strict';

require('dotenv').config();

const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  captcha: {
    provider: process.env.CAPTCHA_PROVIDER || '2captcha',
    apiKey: process.env.CAPTCHA_API_KEY || '',
  },
  scraper: {
    targetUrl: process.env.TARGET_URL || 'https://pelaporan.ppatk.go.id',
    headless: true,
    maxRetries: 3,
    retryDelayMs: 2000,
    timeoutMs: 60000,
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;
